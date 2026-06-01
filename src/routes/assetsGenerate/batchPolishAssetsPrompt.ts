import express from "express";
import u from "@/utils";
import pLimit from "p-limit";
import * as zod from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();
interface OutlineItem {
  description: string;
  name: string;
}

interface OutlineData {
  chapterRange: number[];
  characters?: OutlineItem[];
  props?: OutlineItem[];
  scenes?: OutlineItem[];
}

interface NovelChapter {
  id: number;
  reel: string;
  chapter: string;
  chapterData: string;
  projectId: number;
}

type ItemType = "characters" | "props" | "scenes";

//润色提示词
export default router.post(
  "/",
  validateFields({
    items: zod.array(
      zod.object({
        assetsId: zod.number(),
        type: zod.string(),
        name: zod.string(),
        describe: zod.string(),
      }),
    ),
    projectId: zod.number(),
    concurrentCount: zod.number().int().min(1).optional(),
    otherTextPrompt: zod.string(),
  }),
  async (req, res) => {
    const { projectId, items, concurrentCount, otherTextPrompt } = req.body;
    //获取风格
    const project = await u.db("o_project").where("id", projectId).select("artStyle", "type", "intro").first();
    //如果没有找到对应的项目，返回错误
    if (!project) return res.status(500).send(success({ message: "Proyek kosong" }));

    // 预加载公共数据
    const assetsIds = items.map((item: { assetsId: number }) => item.assetsId);
    //查询所有资产，用于判断每个资产是否是衍生资产
    const assetsDataList = await u.db("o_assets").whereIn("id", assetsIds).select("id", "assetsId");
    if (!assetsDataList || assetsDataList.length === 0) return res.status(500).send(error("Aset tidak ditemukan"));
    const assetsDataMap = new Map(assetsDataList.map((a: any) => [a.id, a]));
    // 所有前置检测通过后，再批量更新状态为生成中
    await u.db("o_assets").whereIn("id", assetsIds).update({ promptState: "生成中" });

    const getTypeConfig = (
      isDerivative: boolean,
    ): Record<string, { promptKey: string; itemType: ItemType; label: string; nameLabel: string; visualManual: string }> => ({
      role: {
        promptKey: "role-polish",
        itemType: "characters",
        label: "Tampilan Empat Sudut Karakter",
        nameLabel: "Karakter",
        visualManual: isDerivative ? "art_character_derivative" : "art_character",
      },
      scene: {
        promptKey: "scene-polish",
        itemType: "scenes",
        label: "Gambar Adegan",
        nameLabel: "Adegan",
        visualManual: isDerivative ? "art_scene_derivative" : "art_scene",
      },
      tool: {
        promptKey: "tool-polish",
        itemType: "props",
        label: "Gambar Properti",
        nameLabel: "Properti",
        visualManual: isDerivative ? "art_prop_derivative" : "art_prop",
      },
    });

    // 后台异步并发生成，不阻塞响应
    const limit = pLimit(concurrentCount ?? 1);
    const tasks = items.map((item: { assetsId: number; type: string; name: string; describe: string }) =>
      limit(async () => {
        const assetData = assetsDataMap.get(item.assetsId);
        if (!assetData) return;
        const typeConfig = getTypeConfig(!!assetData.assetsId);
        const config = typeConfig[item.type];
        if (!config) return;
        //获取到视觉手册
        const visualManual = await u.getArtPrompt(project.artStyle as string, "art_skills", config.visualManual);
        if (!visualManual) {
          await u.db("o_assets").where("id", item.assetsId).update({ promptState: "Pembuatan gagal", promptErrorReason: "Buku panduan visual belum didefinisikan" });
          return;
        }
        const systemPrompt = visualManual;
        try {
          const { _output } = (await u.Ai.Text("universalAi").invoke({
            system: systemPrompt + "\n" + otherTextPrompt,
            messages: [
              {
                role: "user",
                content: `
                    **Parameter Dasar:**
      **Pengaturan ${config.nameLabel}:**
      - Nama ${config.nameLabel}:${item.name},
      - Deskripsi ${config.nameLabel}:${item.describe},`,
              },
            ],
          })) as any;

          if (!_output) {
            await u.db("o_assets").where("id", item.assetsId).update({ promptState: "Pembuatan gagal" });
            return;
          }

          await u.db("o_assets").where("id", item.assetsId).update({ prompt: _output, promptState: "已完成" });
        } catch (e: any) {
          await u
            .db("o_assets")
            .where("id", item.assetsId)
            .update({ promptState: "Gagal", promptErrorReason: u.error(e).message });
        }
      }),
    );

    // 后台执行，不等待结果
    Promise.all(tasks).catch((err: any) => {
      res.status(500).send(error(err));
    });

    return res.status(200).send(success({ total: items.length }));
  },
);
