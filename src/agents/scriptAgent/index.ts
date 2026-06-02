import { Socket } from "socket.io";
import { tool, jsonSchema } from "ai";
import { z } from "zod";
import u from "@/utils";
import Memory from "@/utils/agent/memory";
import useTools from "@/agents/scriptAgent/tools";
import ResTool from "@/socket/resTool";
import * as fs from "fs";
import path from "path";

export interface AgentContext {
  socket: Socket;
  isolationKey: string;
  text: string;
  userMessageTime?: number;
  abortSignal?: AbortSignal;
  resTool: ResTool;
  msg: ReturnType<ResTool["newMessage"]>;
  thinkConfig: {
    think: boolean;
    thinlLevel: 0 | 1 | 2 | 3;
  };
}

function buildMemPrompt(mem: Awaited<ReturnType<Memory["get"]>>): string {
  let memoryContext = "";
  if (mem.rag.length) {
    memoryContext += `[Memori Terkait]\n${mem.rag.map((r) => r.content).join("\n")}`;
  }
  if (mem.summaries.length) {
    if (memoryContext) memoryContext += "\n\n";
    memoryContext += `[Ringkasan Historis]\n${mem.summaries.map((s, i) => `${i + 1}. ${s.content}`).join("\n")}`;
  }
  if (mem.shortTerm.length) {
    if (memoryContext) memoryContext += "\n\n";
    memoryContext += `[Dialog Terkini]\n${mem.shortTerm.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
  }
  return `## Memori\nBerikut adalah memori Anda tentang pengguna, dapat dijadikan referensi tetapi jangan disebutkan secara aktif:\n${memoryContext}`;
}

export async function runDecisionAI(ctx: AgentContext) {
  const { isolationKey, text, userMessageTime, abortSignal, resTool } = ctx;
  const memory = new Memory("scriptAgent", isolationKey);
  await memory.add("user", text, { createTime: userMessageTime });

  const skill = path.join(u.getPath("skills"), "script_agent_decision.md");
  const prompt = await fs.promises.readFile(skill, "utf-8");

  const mem = buildMemPrompt(await memory.get(text));

  const projectData = await u.db("o_project").where("id", resTool.data.projectId).first();

  const novelData = await u.db("o_novel").where("projectId", resTool.data.projectId).select("chapterIndex");

  const projectInfo = [
    "## Informasi Proyek",
    `Nama novel: ${projectData?.name ?? "Tidak diketahui"}`,
    `Jenis novel: ${projectData?.type ?? "Tidak diketahui"}`,
    `Sinopsis novel: ${projectData?.intro ?? "Tidak ada"}`,
    `Buku panduan visual adaptasi|Gaya seni: ${projectData?.artStyle ?? "Tidak ada"}`,
    `Rasio video adaptasi: ${projectData?.videoRatio ?? "16:9"}`,
    `Jumlah bab: ${novelData.length} bab`,
  ].join("\n");

  const { fullStream } = await u.Ai.Text("scriptAgent:decisionAgent", ctx.thinkConfig.think, ctx.thinkConfig.thinlLevel).stream({
    messages: [
      { role: "system", content: prompt },
      { role: "assistant", content: projectInfo + "\n" + mem },
      { role: "user", content: text },
    ],
    abortSignal,
    tools: {
      ...memory.getTools(),
      ...useTools({ resTool: ctx.resTool, msg: ctx.msg }),
      ...createSubAgent(ctx),
    },
    onFinish: async (completion) => {
      await memory.add("assistant:decision", removeAllXmlTags(completion.text));
    },
  });

  let currentMsg = ctx.msg;
  await consumeFullStream(fullStream, currentMsg, () => {
    if (ctx.msg === currentMsg) return currentMsg;
    currentMsg.complete();
    currentMsg = ctx.msg;
    return currentMsg;
  });
}

function createSubAgent(parentCtx: AgentContext) {
  const { resTool, abortSignal } = parentCtx;
  const memory = new Memory("scriptAgent", parentCtx.isolationKey);

  async function runAgent({
    key,
    prompt,
    system,
    name,
    memoryKey,
    tools: extraTools,
    messages,
  }: {
    key: `${string}:${string}`;
    prompt: string;
    system: string;
    name: string;
    memoryKey: string;
    tools?: Record<string, any>;
    messages?: { role: "user" | "assistant" | "system"; content: string }[];
  }) {
    parentCtx.msg.complete();
    const subMsg = resTool.newMessage("assistant", name);

    const { fullStream } = await u.Ai.Text(key, parentCtx.thinkConfig.think, parentCtx.thinkConfig.thinlLevel).stream({
      system,
      messages: messages ?? [{ role: "user", content: prompt }],
      abortSignal,
      tools: { ...extraTools, ...useTools({ resTool, msg: subMsg }) },
    });

    const fullResponse = await consumeFullStream(fullStream, subMsg);

    if (fullResponse.trim()) {
      // Debug logging: check XML tag presence
      const xmlTagPatterns = ["storySkeleton", "adaptationStrategy", "scriptItem"];
      for (const tag of xmlTagPatterns) {
        const openRe = new RegExp(`<${tag}[\\s>]`);
        const closeRe = new RegExp(`</${tag}>`);
        if (openRe.test(fullResponse)) {
          const hasClose = closeRe.test(fullResponse);
          console.log(`[scriptAgent:debug] XML tag <${tag}> detected in ${key} — open: true, close: ${hasClose}`);
        }
      }

      await memory.add(memoryKey, removeAllXmlTags(fullResponse), {
        name,
        createTime: new Date(subMsg.datetime).getTime(),
      });
    } else {
      console.warn(`[scriptAgent:debug] Empty response from ${key}`);
    }

    parentCtx.msg = resTool.newMessage("assistant", "Perencana Video");
    return fullResponse;
  }

  const promptInput = z
    .object({
      prompt: z.string().describe("Deskripsi singkat tugas untuk subAgent, maksimal 100 karakter"),
    })
    .toJSONSchema();

  const run_sub_agent_storySkeleton = tool({
    description: "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait kerangka cerita",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "script_execution_skeleton.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");

      const formatPrompt = [
        "",
        "## ATURAN FORMAT OUTPUT (WAJIB DIPATUHI)",
        "Output Anda HARUS berupa XML murni. Ketentuan:",
        "1. SELURUH output harus dibungkus dalam tag: <storySkeleton>...</storySkeleton>",
        "2. DILARANG menulis teks pembuka seperti 'Berikut kerangka cerita:' atau 'Ini adalah hasil:'",
        "3. DILARANG menggunakan markdown (```xml, **, ##, dll) di luar tag XML",
        "4. DILARANG menulis penjelasan, komentar, atau ringkasan di luar tag XML",
        "5. Tag <storySkeleton> harus menjadi baris pertama output, dan </storySkeleton> harus menjadi baris terakhir",
        "6. Konten di dalam tag boleh menggunakan Markdown untuk format internal",
        "7. Setelah tag penutup </storySkeleton>, kembalikan SATU kalimat konfirmasi singkat",
        "",
        "Format yang BENAR:",
        "<storySkeleton>",
        "# Nama Karya - Kerangka Cerita",
        "...(konten kerangka cerita dalam Markdown)...",
        "</storySkeleton>",
        "Kerangka cerita telah disimpan, silakan periksa di workbench sebelah kanan.",
        "",
        "Format yang SALAH (DILARANG):",
        '"Berikut kerangka cerita:\n<storySkeleton>..." ← ada teks pembuka'",
        '"```xml\n<storySkeleton>..." ← ada blok kode markdown'",
        '"<storySkeleton>... penjelasan di luar tag ..." ← ada teks di luar tag'",
      ].join("\n");

      return runAgent({
        key: "scriptAgent:storySkeletonAgent",
        prompt,
        system: systemPrompt + formatPrompt,
        name: "Penulis Naskah",
        memoryKey: "assistant:execution:storySkeleton",
        messages: [{ role: "user", content: prompt + formatPrompt }],
      });
    },
  });

  const run_sub_agent_adaptationStrategy = tool({
    description: "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait strategi adaptasi",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "script_execution_adaptation.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");

      const formatPrompt = [
        "",
        "## ATURAN FORMAT OUTPUT (WAJIB DIPATUHI)",
        "Output Anda HARUS berupa XML murni. Ketentuan:",
        "1. SELURUH output harus dibungkus dalam tag: <adaptationStrategy>...</adaptationStrategy>",
        "2. DILARANG menulis teks pembuka seperti 'Berikut strategi adaptasi:' atau 'Ini adalah hasil:'",
        "3. DILARANG menggunakan markdown (```xml, **, ##, dll) di luar tag XML",
        "4. DILARANG menulis penjelasan, komentar, atau ringkasan di luar tag XML",
        "5. Tag <adaptationStrategy> harus menjadi baris pertama output, dan </adaptationStrategy> harus menjadi baris terakhir",
        "6. Konten di dalam tag boleh menggunakan Markdown untuk format internal",
        "7. Setelah tag penutup </adaptationStrategy>, kembalikan SATU kalimat konfirmasi singkat",
        "",
        "Format yang BENAR:",
        "<adaptationStrategy>",
        "# Nama Karya - Catatan Keputusan Kunci",
        "...(konten strategi adaptasi dalam Markdown)...",
        "</adaptationStrategy>",
        "Strategi adaptasi telah disimpan, silakan periksa di workbench sebelah kanan.",
        "",
        "Format yang SALAH (DILARANG):",
        '"Berikut strategi adaptasi:\n<adaptationStrategy>..." ← ada teks pembuka'",
        '"```xml\n<adaptationStrategy>..." ← ada blok kode markdown'",
        '"<adaptationStrategy>... penjelasan di luar tag ..." ← ada teks di luar tag'",
      ].join("\n");

      return runAgent({
        key: "scriptAgent:adaptationStrategyAgent",
        prompt,
        system: systemPrompt + formatPrompt,
        name: "Penulis Naskah",
        memoryKey: "assistant:execution:adaptationStrategy",
        messages: [{ role: "user", content: prompt + formatPrompt }],
      });
    },
  });

  const run_sub_agent_script = tool({
    description: "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait naskah",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "script_execution_script.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");

      const scriptList = await u.db("o_script").where("projectId", resTool.data.projectId).select("id", "name");
      const scriptPrompt = ["## Naskah tersedia (ID:Nama)", scriptList.map((s: any) => `${s.id}:${(s.name || "").replace(/[,:]/g, "")}`).join(","), ""].join(
        "\n",
      );

      const novelData = await u.db("o_novel").where("projectId", resTool.data.projectId).select("chapterIndex");

      const formatPrompt = [
        "",
        "## ATURAN FORMAT OUTPUT (WAJIB DIPATUHI)",
        "Output Anda HARUS berupa XML murni. Ketentuan:",
        "1. SELURUH output harus dibungkus dalam tag: <scriptItem name=\"nama naskah\">...</scriptItem>",
        "2. DILARANG menulis teks pembuka seperti 'Berikut naskah:' atau 'Ini adalah naskah:'",
        "3. DILARANG menggunakan markdown (```xml, **, ##, dll) di luar tag XML",
        "4. DILARANG menulis penjelasan, komentar, atau ringkasan di luar tag <scriptItem>",
        "5. Tag <scriptItem> harus menjadi baris pertama output, dan </scriptItem> harus menjadi baris terakhir dari setiap naskah",
        "6. Satu episode = satu tag <scriptItem>. Jika menulis beberapa episode, gunakan beberapa tag <scriptItem> berturut-turut",
        "7. Nilai atribut name harus = judul baris pertama file header (tanpa tanda #)",
        "8. Jangan tambahkan tag XML lain di luar <scriptItem>",
        "9. Setelah tag penutup </scriptItem> terakhir, kembalikan SATU kalimat konfirmasi singkat",
        "",
        "Format yang BENAR:",
        '<scriptItem name="Nama Karya EP01：Judul Episode">',
        "# Nama Karya EP01：Judul Episode",
        "...(konten naskah lengkap)...",
        "</scriptItem>",
        "Naskah episode X telah ditulis, silakan periksa di workbench.",
        "",
        "Format yang SALAH (DILARANG):",
        '"Berikut naskah episode 1:\n<scriptItem>..." ← ada teks pembuka'",
        '"```xml\n<scriptItem>..." ← ada blok kode markdown'",
        '"<scriptItem>... penjelasan di luar tag ..." ← ada teks di luar tag'",
        '"<script>...</script>" ← tag yang salah, harus <scriptItem>',
      ].join("\n");

      return runAgent({
        key: "scriptAgent:scriptAgent",
        prompt,
        system: systemPrompt + formatPrompt,
        messages: [
          { role: "assistant", content: scriptPrompt + `Jumlah bab: ${novelData.length} bab` },
          { role: "user", content: prompt + formatPrompt },
        ],
        name: "Penulis Naskah",
        memoryKey: "assistant:execution:script",
      });
    },
  });

  const run_supervision_agent = tool({
    description: "Menjalankan subAgent pengawas untuk mengeksekusi tugas independen, mengembalikan hasil setelah selesai",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "script_agent_supervision.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");

      return runAgent({
        key: "scriptAgent:supervisionAgent",
        prompt,
        system: systemPrompt,
        name: "Penyunting",
        memoryKey: "assistant:supervision",
      });
    },
  });

  return {
    run_sub_agent_storySkeleton,
    run_sub_agent_adaptationStrategy,
    run_sub_agent_script,
    run_supervision_agent,
  };
}

async function consumeFullStream(
  fullStream: AsyncIterable<any>,
  initialMsg: ReturnType<ResTool["newMessage"]>,
  syncMsg?: () => ReturnType<ResTool["newMessage"]>,
): Promise<string> {
  let msg = initialMsg;
  let text = msg.text();
  let thinking: ReturnType<typeof msg.thinking> | null = null;
  let thinkTime = 0;
  let fullResponse = "";

  try {
    for await (const chunk of fullStream) {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 1));
      if (syncMsg) {
        const newMsg = syncMsg();
        if (newMsg !== msg) {
          msg = newMsg;
          text = msg.text();
        }
      }
      if (chunk.type === "reasoning-start") {
        thinkTime = Date.now();
        thinking = msg.thinking("Berpikir...");
      } else if (chunk.type === "reasoning-delta") {
        thinking?.append(chunk.text);
      } else if (chunk.type === "reasoning-end") {
        thinkTime = Date.now() - thinkTime;
        thinking?.updateTitle(`Pemikiran selesai（${(thinkTime / 1000).toFixed(1)} detik）`);
        thinking?.complete();
        thinking = null;
      } else if (chunk.type === "text-delta") {
        text.append(chunk.text);
        fullResponse += chunk.text;
      } else if (chunk.type === "error") {
        throw chunk.error;
      }
    }
    text.complete();
    msg.complete();
  } catch (err: any) {
    thinking?.complete();
    const errMsg = err?.message ?? String(err);
    text.append(errMsg);
    text.error();
    msg.error();
    throw err;
  }

  return fullResponse;
}

function removeAllXmlTags(text: string): string {
  text = text.replace(/<([a-zA-Z][\w-]*)(\s+[^>]*)?>([\s\S]*?)<\/\1>/g, "");
  text = text.replace(/<([a-zA-Z][\w-]*)(\s+[^>]*)?\/>/g, "");
  text = text.replace(/<\/?[a-zA-Z][\w-]*(\s+[^>]*)?>/g, "");
  return text.trim();
}
