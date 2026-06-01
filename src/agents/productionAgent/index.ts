import { Socket } from "socket.io";
import { z } from "zod";
import { tool, jsonSchema } from "ai";
import u from "@/utils";
import Memory from "@/utils/agent/memory";
import { createSkillTools, parseFrontmatter, scanSkills, useSkill } from "@/utils/agent/skillsTools";
import useTools from "@/agents/productionAgent/tools";
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
  messages?: { role: "user" | "assistant" | "system"; content: string }[];
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
  const { isolationKey, text, abortSignal } = ctx;
  const memory = new Memory("productionAgent", isolationKey);
  await memory.add("user", text);

  const skill = path.join(u.getPath("skills"), "production_agent_decision.md");
  const prompt = await fs.promises.readFile(skill, "utf-8");

  const projectInfo = await u.db("o_project").where("id", ctx.resTool.data.projectId).first();
  if (!projectInfo) throw new Error(`Proyek tidak ditemukan, ID: ${ctx.resTool.data.projectId}`);
  const [_, imageModelName] = projectInfo.imageModel!.split(/:(.+)/);
  const [id, videoModelName] = projectInfo.videoModel!.split(/:(.+)/);
  const models = await u.vendor.getModelList(id);
  if (!models.length) throw new Error(`Model yang digunakan proyek tidak ditemukan, ID: ${projectInfo.videoModel}`);
  let videoMode = "";
  try {
    videoMode = JSON.parse(projectInfo.mode ?? "");
  } catch (e) {
    videoMode = projectInfo.mode ?? "";
  }
  const isRef = Array.isArray(videoMode) ? true : false;
  // const findData = models.find((i: any) => i.modelName == videoModelName);
  // const isRef = findData.mode.every((i: any) => Array.isArray(i));

  const modelInfo = `Model yang digunakan proyek:\nModel gambar: ${imageModelName}\nModel video: ${videoModelName}\nMulti-referensi: ${isRef ? "Ya" : "Tidak"}`;

  const mem = buildMemPrompt(await memory.get(text));

  const { fullStream } = await u.Ai.Text("productionAgent:decisionAgent", ctx.thinkConfig.think, ctx.thinkConfig.thinlLevel).stream({
    messages: [
      { role: "system", content: prompt },
      { role: "assistant", content: mem + "\n" + modelInfo },
      { role: "user", content: text },
    ],
    abortSignal,
    tools: {
      ...memory.getTools(),
      ...useTools({ resTool: ctx.resTool, msg: ctx.msg }),
      ...(await createSubAgent(ctx)),
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

async function createSubAgent(parentCtx: AgentContext) {
  const { resTool, abortSignal } = parentCtx;
  const memory = new Memory("productionAgent", parentCtx.isolationKey);
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
      await memory.add(memoryKey, removeAllXmlTags(fullResponse), {
        name,
        createTime: new Date(subMsg.datetime).getTime(),
      });
    }

    parentCtx.msg = resTool.newMessage("assistant", "Perencana Video");
    return fullResponse;
  }

  const promptInput = z
    .object({
      prompt: z.string().describe("Deskripsi singkat tugas untuk subAgent, maksimal 100 karakter"),
    })
    .toJSONSchema();

  const projectInfo = await u.db("o_project").where("id", resTool.data.projectId).first();
  if (!projectInfo) throw new Error(`Proyek tidak ditemukan, ID: ${resTool.data.projectId}`);
  const artSkills = await createArtSkills(projectInfo?.artStyle!, projectInfo?.directorManual!);

  const [_, imageModelName] = projectInfo.imageModel!.split(/:(.+)/);
  const [id, videoModelName] = projectInfo.videoModel!.split(/:(.+)/);
  const models = await u.vendor.getModelList(id);
  if (!models.length) throw new Error(`Model yang digunakan proyek tidak ditemukan, ID: ${projectInfo.videoModel}`);
  // const findData = models.find((i: any) => i.modelName == videoModelName);
  //
  let videoMode = "";
  try {
    videoMode = JSON.parse(projectInfo.mode ?? "");
  } catch (e) {
    videoMode = projectInfo.mode ?? "";
  }
  const isRef = Array.isArray(videoMode) ? true : false;

  const modelInfo = `Model yang digunakan proyek:\nModel gambar: ${imageModelName}\nModel video: ${videoModelName}\nMulti-referensi: ${isRef ? "Ya" : "Tidak"}`;

  // const run_sub_agent_execution = tool({
  //   description: "执行层子Agent，负责衍生资产、",
  //   inputSchema: promptInput,
  //   execute: async ({ prompt }) => {
  //     const skill = path.join(u.getPath("skills"), "production_agent_execution.md");
  //     const systemPrompt = await fs.promises.readFile(skill, "utf-8");
  //     const addPrompt =
  //       "\n" +
  //       [
  //         "Anda harus menggunakan format XML berikut untuk menulis ke ruang kerja:\n```",
  //         "拍摄计划：<scriptPlan>内容</scriptPlan>",
  //         "分镜表：<storyboardTable>内容</storyboardTable>",
  //         "分镜面板：<storyboardItem videoDesc='视频描述' prompt=提示词内容 track='分组' duration='视频推荐时间' associateAssetsIds='[该分镜所需的资产ID列表]'></storyboardItem>",
  //         "```",
  //       ].join("\n");

  //     return runAgent({
  //       prompt,
  //       system: systemPrompt + addPrompt,
  //       name: "Sutradara Eksekusi",
  //       memoryKey: "assistant:execution",
  //       messages: [
  //         { role: "assistant", content: artSkills.prompt + `\n${modelInfo}` },
  //         { role: "user", content: prompt + addPrompt },
  //       ],
  //       tools: { ...artSkills.tools },
  //     });
  //   },
  // });

  //衍生资产分析与信息写入
  const run_sub_agent_derive_assets = tool({
    description: "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait analisis aset turunan dan penulisan informasi",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "production_execution_derive_assets.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");
      return runAgent({
        key: "productionAgent:deriveAssetsAgent",
        prompt,
        system: systemPrompt,
        name: "Sutradara Eksekusi",
        memoryKey: "assistant:execution",
        messages: [
          { role: "assistant", content: artSkills.prompt + `\n${modelInfo}` },
          { role: "user", content: prompt },
        ],
        tools: { activate_skill: artSkills.tools.activate_skill },
      });
    },
  });

  //衍生资产图片生成
  const run_sub_agent_generate_assets = tool({
    description: "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait pembuatan gambar aset turunan",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "production_execution_generate_assets.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");
      return runAgent({
        key: "productionAgent:generateAssetsAgent",
        prompt,
        system: systemPrompt,
        name: "Sutradara Eksekusi",
        memoryKey: "assistant:execution",
        messages: [
          { role: "assistant", content: artSkills.prompt + `\n${modelInfo}` },
          { role: "user", content: prompt },
        ],
        tools: { activate_skill: artSkills.tools.activate_skill },
      });
    },
  });

  //拍摄计划
  const run_sub_agent_director_plan = tool({
    description: "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait perencanaan sutradara",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "production_execution_director_plan.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");

      const addPrompt = "\nAnda harus menggunakan format XML berikut untuk menulis ke ruang kerja:\n```\n<scriptPlan>内容</scriptPlan>\n```";

      return runAgent({
        key: "productionAgent:directorPlanAgent",
        prompt,
        system: systemPrompt + addPrompt,
        name: "Sutradara Eksekusi",
        memoryKey: "assistant:execution",
        messages: [
          { role: "assistant", content: artSkills.prompt + `\n${modelInfo}` },
          { role: "user", content: prompt + addPrompt },
        ],
        tools: { activate_skill: artSkills.tools.activate_skill },
      });
    },
  });

  //分镜图生成
  const run_sub_agent_storyboard_gen = tool({
    description: "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait pembuatan gambar storyboard",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "production_execution_storyboard_gen.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");
      return runAgent({
        key: "productionAgent:storyboardGenAgent",
        prompt,
        system: systemPrompt,
        name: "Sutradara Eksekusi",
        memoryKey: "assistant:execution",
        messages: [
          { role: "assistant", content: artSkills.prompt + `\n${modelInfo}` },
          { role: "user", content: prompt },
        ],
        tools: { activate_skill: artSkills.tools.activate_skill },
      });
    },
  });

  // const mainSkills: { path: string; name: string; description: string }[] = [];
  // for (const skill of mainSkill) {
  //   const skillPath = path.join(rootDir, skill + ".md");
  //   if (!fs.existsSync(skillPath)) throw new Error(`主技能文件不存在: ${skillPath}`);
  //   if (!isPathInside(skillPath, normalizedRootDir)) throw new Error(`技能名称无效：检测到路径穿越。${skillPath}`);
  //   const content = await fs.promises.readFile(skillPath, "utf-8");
  //   const parsed = parseFrontmatter(content);
  //   mainSkills.push({ path: skillPath, ...parsed });
  // }

  const productionSkills = await useProductionSkills(projectInfo?.artStyle!, projectInfo?.directorManual!);

  //分镜面板写入
  const run_sub_agent_storyboard_panel = tool({
    description: "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait penulisan panel storyboard",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "production_execution_storyboard_panel.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");

      const addPrompt =
        "\nAnda harus menggunakan format XML berikut untuk menulis ke ruang kerja:\n```\n<storyboardItem videoDesc='视频描述' prompt=提示词内容 track='分组' shouldGenerateImage='true/false' duration='视频推荐时间' associateAssetsIds='[该分镜所需的资产ID列表]'></storyboardItem>\n```";

      return runAgent({
        key: "productionAgent:storyboardPanelAgent",
        prompt,
        system: systemPrompt + addPrompt,
        name: "Sutradara Eksekusi",
        memoryKey: "assistant:execution",
        messages: [
          { role: "assistant", content: productionSkills.prompt + `\n${modelInfo}` },
          { role: "user", content: prompt + addPrompt },
        ],
        tools: { activate_skill: productionSkills.tools.activate_skill },
      });
    },
  });

  //分镜表写入
  const run_sub_agent_storyboard_table = tool({
    description: "Menjalankan subAgent eksekusi untuk menyelesaikan tugas terkait pembuatan tabel storyboard",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "production_execution_storyboard_table.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");

      const addPrompt = "\nAnda harus menggunakan format XML berikut untuk menulis ke ruang kerja:\n```\n<storyboardTable>内容</storyboardTable>\n```";

      return runAgent({
        key: "productionAgent:storyboardTableAgent",
        prompt,
        system: systemPrompt + addPrompt,
        name: "Sutradara Eksekusi",
        memoryKey: "assistant:execution",
        messages: [
          { role: "assistant", content: productionSkills.prompt + `\n${modelInfo}` },
          { role: "user", content: prompt + addPrompt },
        ],
        tools: { activate_skill: productionSkills.tools.activate_skill },
      });
    },
  });

  const run_sub_agent_supervision = tool({
    description: "Menjalankan subAgent pengawas untuk mengeksekusi tugas independen, mengembalikan hasil setelah selesai",
    inputSchema: jsonSchema<{ prompt: string }>(promptInput),
    execute: async ({ prompt }) => {
      const skill = path.join(u.getPath("skills"), "production_agent_supervision.md");
      const systemPrompt = await fs.promises.readFile(skill, "utf-8");
      return runAgent({
        key: "productionAgent:supervisionAgent",
        prompt,
        system: systemPrompt,
        name: "Pengawas",
        memoryKey: "assistant:supervision",
      });
    },
  });

  return {
    run_sub_agent_derive_assets,
    run_sub_agent_generate_assets,
    run_sub_agent_director_plan,
    run_sub_agent_storyboard_gen,
    run_sub_agent_storyboard_panel,
    run_sub_agent_storyboard_table,
    run_sub_agent_supervision,
  };
}

async function createArtSkills(artName: string, storyName: string) {
  const artWorkerPath = u.getPath(["skills", "art_skills", artName, "driector_skills"]);
  const storyWorkerPath = u.getPath(["skills", "story_skills", storyName, "driector_skills"]);
  const skillList = [...(await scanSkills(artWorkerPath + "/*.md")), ...(await scanSkills(storyWorkerPath + "/*.md"))];
  const mainSkills: { path: string; name: string; description: string }[] = [];
  for (const skillPath of skillList) {
    if (!fs.existsSync(skillPath)) throw new Error(`主技能文件不存在: ${skillPath}`);
    const content = await fs.promises.readFile(skillPath, "utf-8");
    const parsed = parseFrontmatter(content);
    mainSkills.push({ path: skillPath, ...parsed });
  }
  const res = {
    prompt: `## Skills
Skill berikut menyediakan instruksi khusus untuk tugas profesional.
Ketika tugas cocok dengan deskripsi suatu skill, panggil alat activate_skill dan masukkan nama skill untuk memuat instruksi lengkap.
${buildSkillPrompt(mainSkills)}`,
    tools: createSkillTools(mainSkills, { mainSkill: mainSkills, secondarySkills: [], tertiarySkills: [] }),
  };
  return res;
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

export function buildSkillPrompt(skills: { name: string; description: string }[]): string {
  const skillEntries = skills
    .map((s) => `  <skill>\n    <name>${s.name}</name>\n    <description>${s.description}</description>\n  </skill>`)
    .join("\n");
  return `
<available_skills>
${skillEntries}
</available_skills>`;
}

async function useProductionSkills(artName: string, storyName: string) {
  const artWorkerPath = u.getPath(["skills", "art_skills", artName, "driector_skills"]);
  const storyWorkerPath = u.getPath(["skills", "story_skills", storyName, "driector_skills"]);
  const productionPath = u.getPath(["skills", "production_skills"]);
  const skillList = [
    ...(await scanSkills(artWorkerPath + "/*.md")),
    ...(await scanSkills(storyWorkerPath + "/*.md")),
    ...(await scanSkills(productionPath + "/*.md")),
  ];
  const mainSkills: { path: string; name: string; description: string }[] = [];
  for (const skillPath of skillList) {
    if (!fs.existsSync(skillPath)) throw new Error(`主技能文件不存在: ${skillPath}`);
    const content = await fs.promises.readFile(skillPath, "utf-8");
    const parsed = parseFrontmatter(content);
    mainSkills.push({ path: skillPath, ...parsed });
  }
  const res = {
    prompt: `## Skills
Skill berikut menyediakan instruksi khusus untuk tugas profesional.
Ketika tugas cocok dengan deskripsi suatu skill, panggil alat activate_skill dan masukkan nama skill untuk memuat instruksi lengkap.
${buildSkillPrompt(mainSkills)}`,
    tools: createSkillTools(mainSkills, { mainSkill: mainSkills, secondarySkills: [], tertiarySkills: [] }),
  };
  return res;
}
