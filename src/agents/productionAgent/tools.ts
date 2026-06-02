import { tool, jsonSchema, Tool } from "ai";
import { z } from "zod";
import _ from "lodash";
import ResTool from "@/socket/resTool";
import u from "@/utils";

const deriveAssetSchema = z.object({
  id: z.number().describe("ID aset turunan, kosongkan jika baru"),
  assetsId: z.number().describe("ID aset induk"),
  prompt: z.string().describe("Prompt pembuatan"),
  name: z.string().describe("Nama aset turunan"),
  desc: z.string().describe("Deskripsi aset turunan"),
  src: z.string().nullable().describe("Path sumber aset turunan"),
  state: z.enum(["未生成", "生成中", "已完成", "生成失败"]).describe("Status pembuatan aset turunan"),
  type: z.enum(["role", "tool", "scene", "clip"]).describe("Tipe aset turunan"),
});
export const assetItemSchema = z.object({
  id: z.number().describe("ID unik aset"),
  name: z.string().describe("Nama aset"),
  type: z.enum(["role", "tool", "scene", "clip"]).describe("Tipe aset"),
  prompt: z.string().describe("Prompt pembuatan"),
  desc: z.string().describe("Deskripsi aset"),
  derive: z.array(deriveAssetSchema).describe("Daftar aset turunan"),
});
const storyboardSchema = z.object({
  id: z.number().describe("ID storyboard, harus ID asli"),
  duration: z.number().describe("Durasi (detik)"),
  prompt: z.string().describe("Prompt pembuatan"),
  associateAssetsIds: z.array(z.number()).describe("Daftar ID aset terkait"),
  src: z.string().nullable().describe("Path sumber storyboard"),
  index: z.number().nullable().optional().describe("Field pengurutan storyboard"),
});
const workbenchDataSchema = z.object({
  name: z.string().describe("Nama proyek"),
  duration: z.string().describe("Durasi video"),
  resolution: z.string().describe("Resolusi"),
  fps: z.string().describe("FPS"),
  cover: z.string().optional().describe("Path gambar sampul"),
  gradient: z.string().optional().describe("Konfigurasi gradien"),
});
const posterItemSchema = z.object({
  id: z.number().describe("ID poster"),
  image: z.string().describe("Path gambar poster"),
});
export const flowDataSchema = z.object({
  script: z.string().describe("Konten naskah"),
  scriptPlan: z.string().describe("Rencana syuting"),
  assets: z.array(assetItemSchema).describe("Aset turunan"),
  storyboardTable: z.string().describe("Tabel storyboard"),
  storyboard: z.array(storyboardSchema).describe("Panel storyboard"),
});

export type FlowData = z.infer<typeof flowDataSchema>;

const keySchema = z.enum(Object.keys(flowDataSchema.shape) as [keyof FlowData, ...Array<keyof FlowData>]);
const flowDataKeyLabels = Object.fromEntries(
  Object.entries(flowDataSchema.shape).map(([key, schema]) => [key, (schema as z.ZodTypeAny).description ?? key]),
) as Record<keyof FlowData, string>;

interface ToolConfig {
  resTool: ResTool;
  toolsNames?: string[];
  msg: ReturnType<ResTool["newMessage"]>;
}

export default (toolCpnfig: ToolConfig) => {
  const { resTool, toolsNames, msg } = toolCpnfig;
  const { socket } = resTool;
  const tools: Record<string, Tool> = {
    get_flowData: tool({
      description: "Mengambil data ruang kerja",
      inputSchema: jsonSchema<{ key: keyof FlowData }>(
        z
          .object({
            key: keySchema.describe("Kunci data"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ key }) => {
        const thinking = msg.thinking(`Mengambil data ruang kerja ${flowDataKeyLabels[key]}...`);
        console.log("[tools] get_flowData", key);
        const flowData: FlowData = await new Promise((resolve) => socket.emit("getFlowData", { key }, (res: any) => resolve(res)));
        thinking.appendText(`Berhasil mengambil ${flowDataKeyLabels[key]}:\n` + JSON.stringify(flowData[key], null, 2));
        thinking.updateTitle(`Pengambilan ${flowDataKeyLabels[key]} selesai`);
        thinking.complete();
        return flowData[key];
      },
    }),
    add_deriveAsset: tool({
      description: "Menambah atau memperbarui aset turunan",
      inputSchema: jsonSchema<{ assetsId: number; id: number | null; name: string; desc: string }>(
        z
          .object({
            assetsId: z.number().describe("ID aset induk"),
            id: z.number().nullable().describe("ID aset turunan, kosongkan jika baru"),
            name: z.string().describe("Nama aset turunan"),
            desc: z.string().describe("Deskripsi aset turunan"),
          })
          .toJSONSchema(),
      ),
      execute: async (raw) => {
        // Toleransi kesalahan: LLM kadang mengirim string "null" atau string kosong, normalisasi ke null
        const idRaw = raw.id as unknown;
        const normalizedId = idRaw === "null" || idRaw === "" || idRaw === undefined ? null : (idRaw as number | null);
        const deriveAsset = { ...raw, id: normalizedId };

        const thinking = msg.thinking("Mengoperasikan aset...");
        const { projectId, scriptId } = resTool.data;
        const startTime = Date.now();
        const parentAssets = await u.db("o_assets").where("id", deriveAsset.assetsId).select("id", "type").first();
        if (!parentAssets) return "Aset induk tidak ditemukan";

        const data = {
          id: deriveAsset.id ?? undefined,
          assetsId: deriveAsset.assetsId,
          projectId,
          name: deriveAsset.name,
          type: parentAssets.type,
          describe: deriveAsset.desc,
          startTime,
        };
        if (deriveAsset.id) {
          await u.db("o_assets").where("id", deriveAsset.id).update(data);
          thinking.appendText(`Aset turunan diperbarui, ID: ${deriveAsset.id}\n`);
        } else {
          const [insertedId] = await u.db("o_assets").insert(data);
          data.id = insertedId;
          await u.db("o_scriptAssets").insert({ scriptId, assetId: insertedId });
          thinking.appendText(`Aset turunan ditambahkan, ID: ${insertedId}\n`);
        }
        const res = await new Promise((resolve) => socket.emit("addDeriveAsset", data, (res: any) => resolve(res)));
        thinking.updateTitle("Operasi aset selesai");
        thinking.complete();
        return res ?? "Operasi berhasil";
      },
    }),
    del_deriveAsset: tool({
      description: "Menghapus aset turunan",
      inputSchema: jsonSchema<{ assetsId: number; id: number }>(
        z
          .object({
            assetsId: z.number().describe("ID aset induk"),
            id: z.number().describe("ID aset turunan"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ assetsId, id }) => {
        const thinking = msg.thinking("Mengoperasikan aset...");
        const { scriptId } = resTool.data;
        await u.db("o_assets").where("id", id).del();
        await u.db("o_scriptAssets").where({ scriptId, assetId: id }).del();
        thinking.appendText(`Aset turunan dihapus, ID: ${id}\n`);
        const res = await new Promise((resolve) => socket.emit("delDeriveAsset", { assetsId, id }, (res: any) => resolve(res)));
        thinking.updateTitle("Operasi aset selesai");
        thinking.complete();
        return res ?? "Berhasil dihapus";
      },
    }),
    generate_deriveAsset: tool({
      description: "Membuat gambar aset turunan",
      inputSchema: jsonSchema<{ ids: number[] }>(
        z
          .object({
            ids: z.array(z.number()).describe("ID aset turunan yang akan dibuat"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ ids }) => {
        const thinking = msg.thinking("Membuat aset turunan...");
        new Promise((resolve) => socket.emit("generateDeriveAsset", { ids }, (res: any) => resolve(res)))
          .then((res) => {
            thinking.appendText(`Aset turunan berhasil dibuat, ID: ${JSON.stringify(res, null, 2)}\n`);
            thinking.updateTitle("Pembuatan aset turunan dimulai");
            thinking.complete();
          })
          .catch((e) => {
            thinking.appendText("Pembuatan aset turunan gagal:\n" + u.error(e).message);
            thinking.updateTitle("Pembuatan aset turunan gagal");
            thinking.complete();
          });

        return "Memulai pembuatan aset turunan";
      },
    }),
    generate_storyboard: tool({
      description: "Membuat gambar storyboard",
      inputSchema: jsonSchema<{ ids: number[] }>(
        z
          .object({
            ids: z.array(z.number()).describe("ID storyboard asli yang diperlukan, mendukung pembuatan batch"),
          })
          .toJSONSchema(),
      ),
      execute: async ({ ids }) => {
        const thinking = msg.thinking("Membuat storyboard...");
        new Promise((resolve) => socket.emit("generateStoryboard", { ids }, (res: any) => resolve(res)))
          .then((res) => {
            thinking.appendText("Data storyboard yang dibuat:\n" + JSON.stringify(res, null, 2));
            thinking.updateTitle("Pembuatan storyboard selesai");
            thinking.complete();
          })
          .catch((e) => {
            thinking.appendText("Pembuatan storyboard gagal:\n" + u.error(e).message);
            thinking.updateTitle("Pembuatan storyboard gagal");
            thinking.complete();
          });

        return "Memulai pembuatan storyboard";
      },
    }),
  };

  return toolsNames ? Object.fromEntries(Object.entries(tools).filter(([n]) => toolsNames.includes(n))) : tools;
};
