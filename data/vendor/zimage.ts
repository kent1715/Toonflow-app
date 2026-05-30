/**
 * Toonflow AI供应商模板 - Z-Image Turbo 本地生图
 * @version 2.2
 *
 * 说明：
 * 1) 连接本地 Z-Image Turbo Gradio 服务
 * 2) 默认地址 http://127.0.0.1:9000
 * 3) 通过 Gradio API 调用生图（先尝试 v2，fallback v1）
 * 4) 仅支持图片生成，不支持文本/视频/TTS
 *
 * v2.2 changes:
 * - parseGradioSSE: multi-line data concatenation per SSE spec
 * - parseGradioSSE: fallback to raw JSON parse for non-SSE responses
 * - pollGradioResult: Array.isArray(resultData) in object branch
 * - pollGradioResult: "save result image" detection in object branch
 * - pollGradioResult: Array.isArray(parsed) → completed immediately
 * - extractImagePathFromText: JSON backslash unescape
 * - resolveImageResult: log string path extraction before base64 fallback
 * - resolveImageResult: array iterates ALL items, not raw[0]
 * - Gradio v2 flat named payload preserved (NOT { data: params })
 */

// ============================================================
// 类型定义
// ============================================================

type VideoMode =
  | "singleImage"
  | "startEndRequired"
  | "endFrameOptional"
  | "startFrameOptional"
  | "text"
  | (`videoReference:${number}` | `imageReference:${number}` | `audioReference:${number}`)[];

interface TextModel {
  name: string;
  modelName: string;
  type: "text";
  think: boolean;
}

interface ImageModel {
  name: string;
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
  associationSkills?: string;
}

interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: VideoMode[];
  associationSkills?: string;
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}

interface TTSModel {
  name: string;
  modelName: string;
  type: "tts";
  voices: { title: string; voice: string }[];
}

interface VendorConfig {
  id: string;
  version: string;
  name: string;
  author: string;
  description?: string;
  icon?: string;
  inputs: { key: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder?: string }[];
  inputValues: Record<string, string>;
  models: (TextModel | ImageModel | VideoModel | TTSModel)[];
}

type ReferenceList =
  | { type: "image"; sourceType: "base64"; base64: string }
  | { type: "audio"; sourceType: "base64"; base64: string }
  | { type: "video"; sourceType: "base64"; base64: string };

interface ImageConfig {
  prompt: string;
  referenceList?: Extract<ReferenceList, { type: "image" }>[];
  size: "1K" | "2K" | "4K";
  aspectRatio: `${number}:${number}`;
}

interface VideoConfig {
  duration: number;
  resolution: string;
  aspectRatio: "16:9" | "9:16";
  prompt: string;
  referenceList?: ReferenceList[];
  audio?: boolean;
  mode: VideoMode[];
}

interface TTSConfig {
  text: string;
  voice: string;
  speechRate: number;
  pitchRate: number;
  volume: number;
  referenceList?: Extract<ReferenceList, { type: "audio" }>[];
}

// ============================================================
// 全局声明
// ============================================================

declare const axios: any;
declare const logger: (msg: string) => void;
declare const urlToBase64: (url: string) => Promise<string>;
declare const require: any;
declare const pollTask: (fn: () => Promise<{ completed: boolean; data?: string; error?: string }>, interval?: number, timeout?: number) => Promise<{ completed: boolean; data?: string; error?: string }>;
declare const exports: {
  vendor: VendorConfig;
  textRequest: (m: TextModel, t: boolean, tl: 0 | 1 | 2 | 3) => any;
  imageRequest: (c: ImageConfig, m: ImageModel) => Promise<string>;
  videoRequest: (c: VideoConfig, m: VideoModel) => Promise<string>;
  ttsRequest: (c: TTSConfig, m: TTSModel) => Promise<string>;
  checkForUpdates?: () => Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }>;
  updateVendor?: () => Promise<string>;
};

// ============================================================
// 供应商配置
// ============================================================

const vendor: VendorConfig = {
  id: "zimage",
  version: "2.2",
  author: "Local AI",
  name: "Z-Image Turbo 本地生图",
  description:
    "连接本地 Z-Image Turbo Gradio 服务，无需联网，无需付费 API。\n\n1. 启动 Z-Image Turbo 服务（默认端口 9000）\n2. 默认地址 http://127.0.0.1:9000\n3. 通过 Gradio API 调用生图\n4. 支持自定义 width/height/steps/cfg/seed 等参数",
  inputs: [
    { key: "baseUrl", label: "服务地址", type: "url", required: true, placeholder: "http://127.0.0.1:9000" },
    { key: "apiName", label: "API名称", type: "text", required: true, placeholder: "run_and_return" },
    { key: "width", label: "宽度", type: "text", required: false, placeholder: "512" },
    { key: "height", label: "高度", type: "text", required: false, placeholder: "896" },
    { key: "steps", label: "Steps", type: "text", required: false, placeholder: "8" },
    { key: "cfg", label: "CFG", type: "text", required: false, placeholder: "1" },
    { key: "seed", label: "Seed", type: "text", required: false, placeholder: "0" },
    { key: "vaePath", label: "VAE路径", type: "text", required: false, placeholder: "" },
    { key: "llmPath", label: "LLM路径", type: "text", required: false, placeholder: "" },
    { key: "loras", label: "LoRA", type: "text", required: false, placeholder: "" },
    { key: "loraStrength", label: "LoRA强度", type: "text", required: false, placeholder: "1" },
  ],
  inputValues: {
    baseUrl: "http://127.0.0.1:9000",
    apiName: "run_and_return",
    width: "",
    height: "",
    steps: "8",
    cfg: "1",
    seed: "0",
    vaePath: "",
    llmPath: "",
    loras: "",
    loraStrength: "1",
  },
  models: [
    {
      name: "Z-Image Turbo",
      modelName: "z-image-turbo",
      type: "image",
      mode: ["text"],
      associationSkills: "Local image generation via Z-Image Turbo",
    },
  ],
};

// ============================================================
// 辅助函数
// ============================================================

/** Unescape JSON-encoded backslashes in extracted paths (\\ → \) */
const unescapePath = (path: string): string => {
  if (!path) return path;
  // Replace double backslashes with single (JSON escape)
  // But only if they look like path separators, not regex escapes
  let result = path;
  // Handle \\\\  → \\  (JSON double-escaped)
  // Handle \\n   → \n  (JSON escaped newline in path — shouldn't exist but just in case)
  // We want: D:\\Folder\\file.png → D:\Folder\file.png
  if (result.includes("\\\\")) {
    result = result.replace(/\\\\/g, "\\");
  }
  return result;
};

/** Extract image file path from log text strings like:
 *  "save result image 0 to 'D:\Z-Image-Turbo-Windows\outputs\out_xxx.png' (success)"
 *  Also handles JSON-escaped variants with double backslashes.
 */
const extractImagePathFromText = (text: string): string | null => {
  if (!text) return null;

  const patterns = [
    // Pattern 1: save result image N to 'path' (success)  — with single quotes
    /save result image \d+ to '([^']+\.(?:png|jpg|jpeg|webp))'/i,
    // Pattern 2: save result image N to "path" (success)  — with double quotes
    /save result image \d+ to "([^"]+\.(?:png|jpg|jpeg|webp))"/i,
    // Pattern 3: Windows absolute path (with single backslash)
    /([A-Za-z]:[\/\\][^\r\n"'<>]*?\.(?:png|jpg|jpeg|webp))/i,
    // Pattern 4: Linux absolute path
    /(\/[^\r\n"'<>]*?\.(?:png|jpg|jpeg|webp))/i,
    // Pattern 5: Windows path with double backslashes (JSON-escaped)
    /([A-Za-z]:\\\\[^\r\n"'<>]*?\.(?:png|jpg|jpeg|webp))/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const rawPath = match[1];
      // Unescape JSON-encoded backslashes
      const unescaped = unescapePath(rawPath);
      logger(`[zimage] extractImagePathFromText: raw="${rawPath}" → unescaped="${unescaped}"`);
      return unescaped;
    }
  }

  return null;
};



/** Convert local Z-Image outputs path to static HTTP URL.
 * Requires running:
 *   cd D:\Z-Image-Turbo-Windows\outputs
 *   python -m http.server 9010 --bind 127.0.0.1
 */
const convertLocalOutputPathToHttpUrl = (filePath: string): string | null => {
  if (!filePath) return null;

  const normalized = filePath.replace(/\\/g, "/");
  const marker = "/outputs/";
  const idx = normalized.toLowerCase().lastIndexOf(marker);

  if (idx === -1) return null;

  const fileName = normalized.substring(idx + marker.length);
  if (!fileName) return null;

  return `http://127.0.0.1:9010/${encodeURIComponent(fileName)}`;
};

/** Try Gradio file-serving endpoints for local generated image paths. */
const tryGradioFileUrls = async (filePath: string, baseUrl: string): Promise<string> => {
  const root = baseUrl.replace(/\/+$/, "");
  const normalized = filePath.replace(/\\/g, "/");

  const candidates = [
    `${root}/gradio_api/file=${encodeURIComponent(filePath)}`,
    `${root}/file=${encodeURIComponent(filePath)}`,
    `${root}/gradio_api/file=${encodeURIComponent(normalized)}`,
    `${root}/file=${encodeURIComponent(normalized)}`,
  ];

  let lastError: any = null;

  for (const url of candidates) {
    try {
      logger(`[zimage] 尝试 Gradio encoded file URL → ${url.substring(0, 200)}`);
      return await urlToBase64(url);
    } catch (e: any) {
      lastError = e;
      logger(`[zimage] Gradio file URL 失败: ${e?.message || e}`);
    }
  }

  throw lastError || new Error(`[zimage] 所有 Gradio file URL 均失败: ${filePath}`);
};

/** 解析图片结果，统一返回 data:image/xxx;base64,... 格式 */
const resolveImageResult = async (raw: any, baseUrl: string): Promise<string> => {
  // 1) 字符串类型
  if (typeof raw === "string") {
    const s = raw.trim();

    // 已有 data URI header
    if (s.startsWith("data:image/")) {
      logger(`[zimage] 结果类型: base64带header (长度=${s.length})`);
      return s;
    }

    // 纯 base64（无 header）
    if (/^[A-Za-z0-9+/=]+$/.test(s) && s.length > 100) {
      logger(`[zimage] 结果类型: 纯base64 (长度=${s.length})`);
      return `data:image/png;base64,${s}`;
    }

    // 绝对 URL
    if (s.startsWith("http://") || s.startsWith("https://")) {
      logger(`[zimage] 结果类型: 绝对URL → ${s.substring(0, 80)}`);
      return await urlToBase64(s);
    }

    // Gradio 相对路径 /gradio_api/file=... 或 /file=...
    if (s.startsWith("/gradio_api/") || s.startsWith("/file=")) {
      const fullUrl = baseUrl.replace(/\/+$/, "") + s;
      logger(`[zimage] 结果类型: 相对URL → ${fullUrl.substring(0, 80)}`);
      return await urlToBase64(fullUrl);
    }

    // Local file path (Windows or Linux absolute path)
    if (/^[A-Za-z]:[\\\/]/.test(s) || s.startsWith("/home/") || s.startsWith("/tmp/") || s.startsWith("/data/")) {
      logger(`[zimage] 结果类型: 本地文件路径 → ${s}`);

      // Prefer static output HTTP server for Z-Image outputs folder.
      const outputHttpUrl = convertLocalOutputPathToHttpUrl(s);
      if (outputHttpUrl) {
        logger(`[zimage] 本地输出路径转换为HTTP URL → ${outputHttpUrl}`);
        return await urlToBase64(outputHttpUrl);
      }

      // Toonflow vendor VM may not expose require("fs"), so prefer Gradio file-serving URLs.
      try {
        return await tryGradioFileUrls(s, baseUrl);
      } catch (fileUrlErr: any) {
        logger(`[zimage] Gradio file URL 全部失败: ${fileUrlErr?.message || fileUrlErr}`);
      }

      // Optional local fs fallback only if require is available.
      try {
        if (typeof require !== "undefined") {
          const fs = require("fs");
          const fileBuffer = fs.readFileSync(s);
          const b64 = fileBuffer.toString("base64");
          logger(`[zimage] 本地文件读取成功, 大小=${fileBuffer.length}`);
          return `data:image/png;base64,${b64}`;
        }
      } catch (readErr: any) {
        logger(`[zimage] 本地文件读取失败: ${readErr.message}`);
      }

      throw new Error(`[zimage] 无法读取本地图片文件: ${s}`);
    }

    // Extract image path from log text (e.g. "save result image 0 to 'D:\\...\\out.png'")
    const extractedPath = extractImagePathFromText(s);
    if (extractedPath) {
      logger(`[zimage] 从日志字符串中提取图片路径: ${extractedPath}`);
      return await resolveImageResult(extractedPath, baseUrl);
    }

    // 尝试作为纯 base64
    logger(`[zimage] 结果类型: 未知字符串，尝试base64解码 (长度=${s.length})`);
    return `data:image/png;base64,${s}`;
  }

  // 2) 数组类型（Gradio v2 may return [FileData] or [log strings] or mixed array）
  if (Array.isArray(raw)) {
    logger(`[zimage] 结果类型: 数组 (长度=${raw.length}), 遍历所有item`);

    // First pass: look for FileData objects or extract path from log strings
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      logger(`[zimage] 数组 item[${i}]: type=${typeof item}, preview=${JSON.stringify(item).substring(0, 200)}`);

      if (typeof item === "string") {
        // Try extracting image path from log strings
        const extractedPath = extractImagePathFromText(item);
        if (extractedPath) {
          logger(`[zimage] 从数组item[${i}]日志中提取图片路径: ${extractedPath}`);
          return await resolveImageResult(extractedPath, baseUrl);
        }

        // Try as URL, base64, or file path
        try {
          const result = await resolveImageResult(item, baseUrl);
          if (result.startsWith("data:image/")) {
            logger(`[zimage] 数组item[${i}]解析成功`);
            return result;
          }
        } catch {
          // try next item
        }
      }

      if (item && typeof item === "object") {
        // Gradio FileData: { url, path, mime_type, meta, ... }
        if (item.url) {
          logger(`[zimage] 数组item[${i}]有url字段: ${item.url}`);
          return await resolveImageResult(item.url, baseUrl);
        }
        if (item.path) {
          logger(`[zimage] 数组item[${i}]有path字段: ${item.path}`);
          return await resolveImageResult(item.path, baseUrl);
        }
        if (item.image) {
          logger(`[zimage] 数组item[${i}]有image字段`);
          return await resolveImageResult(item.image, baseUrl);
        }
        if (item.data) {
          logger(`[zimage] 数组item[${i}]有data字段`);
          return await resolveImageResult(item.data, baseUrl);
        }
        // Nested: item has string representation with path
        const itemStr = JSON.stringify(item);
        const extractedFromObj = extractImagePathFromText(itemStr);
        if (extractedFromObj) {
          logger(`[zimage] 从数组item[${i}]对象JSON中提取图片路径: ${extractedFromObj}`);
          return await resolveImageResult(extractedFromObj, baseUrl);
        }
      }
    }

    // Second pass: try each remaining string item as base64/URL
    for (const item of raw) {
      if (typeof item === "string") {
        try {
          const result = await resolveImageResult(item, baseUrl);
          if (result.startsWith("data:image/")) return result;
        } catch {
          // try next
        }
      }
    }
  }

  // 3) FileData 对象类型 { url, path, mime_type, meta, ... }
  if (raw && typeof raw === "object") {
    // Gradio FileData: has url field (may be relative path like /gradio_api/file=...)
    if (raw.url) {
      return await resolveImageResult(raw.url, baseUrl);
    }
    // Gradio FileData: has path field (local filesystem path)
    if (raw.path) {
      return await resolveImageResult(raw.path, baseUrl);
    }
    if (raw.image) {
      return await resolveImageResult(raw.image, baseUrl);
    }
    // Nested data field
    if (raw.data) {
      return await resolveImageResult(raw.data, baseUrl);
    }
    // mime_type + direct base64
    if (raw.mime_type && typeof raw.data === "string") {
      return await resolveImageResult(raw.data, baseUrl);
    }
    // Try extracting from object's string representation
    const objStr = JSON.stringify(raw);
    const extractedFromObj = extractImagePathFromText(objStr);
    if (extractedFromObj) {
      logger(`[zimage] 从对象JSON中提取图片路径: ${extractedFromObj}`);
      return await resolveImageResult(extractedFromObj, baseUrl);
    }
  }

  throw new Error(`[zimage] 无法解析图片结果，类型: ${typeof raw}, 值: ${JSON.stringify(raw).substring(0, 200)}`);
};

/** 解析 Gradio SSE 流，提取最终数据
 *  Handles:
 *  - Single-line data: "data: {json}"
 *  - Multi-line data: multiple "data:" lines concatenated per SSE spec
 *  - Fallback: try parsing entire text as JSON (for non-SSE responses)
 */
const parseGradioSSE = (sseText: string): any => {
  const lines = sseText.split("\n");
  let currentEvent: string | null = null;
  let dataBuffer: string[] = [];      // Buffer for multi-line data
  let lastData: any = null;
  let lastCompleteData: any = null;

  const flushDataBuffer = () => {
    if (dataBuffer.length === 0) return;

    // SSE spec: multiple data lines are joined by \n
    const joinedData = dataBuffer.join("\n");
    dataBuffer = [];

    try {
      const parsed = JSON.parse(joinedData);
      logger(`[zimage] parseGradioSSE: parsed data for event=${currentEvent}, type=${Array.isArray(parsed) ? "array" : typeof parsed}`);

      // If this data follows a 'complete' or 'process_completed' event, prioritize it
      if (currentEvent === "complete" || currentEvent === "process_completed") {
        lastCompleteData = parsed;
      }

      lastData = parsed;
    } catch (e: any) {
      logger(`[zimage] parseGradioSSE: JSON parse failed for data="${joinedData.substring(0, 200)}", error=${e.message}`);
      // If it's an array-like string, try fixing common issues
      try {
        // Maybe the data is a single value, not JSON
        if (joinedData.startsWith('"') && joinedData.endsWith('"')) {
          const unquoted = JSON.parse(joinedData);
          if (currentEvent === "complete" || currentEvent === "process_completed") {
            lastCompleteData = unquoted;
          }
          lastData = unquoted;
        }
      } catch {
        // Give up on this data block
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Empty line = end of event block → flush data buffer
    if (line.trim() === "") {
      flushDataBuffer();
      currentEvent = null;
      continue;
    }

    // Track event type
    if (line.startsWith("event:")) {
      flushDataBuffer(); // Flush any previous data
      currentEvent = line.substring(6).trim();
      logger(`[zimage] parseGradioSSE: event=${currentEvent}`);
      continue;
    }

    // Accumulate data lines (SSE spec: multiple data lines are joined by \n)
    if (line.startsWith("data:")) {
      const dataContent = line.substring(5).startsWith(" ") ? line.substring(6) : line.substring(5);
      dataBuffer.push(dataContent);
      continue;
    }

    // Other lines (comments, etc.) — ignore
  }

  // Flush any remaining data
  flushDataBuffer();

  // Prefer data from complete event
  if (lastCompleteData !== null) {
    logger(`[zimage] parseGradioSSE: returning lastCompleteData (type=${Array.isArray(lastCompleteData) ? "array" : typeof lastCompleteData})`);
    return lastCompleteData;
  }

  // Fallback: try parsing the entire text as JSON (for non-SSE responses)
  if (lastData === null) {
    try {
      const directParsed = JSON.parse(sseText);
      logger(`[zimage] parseGradioSSE: fallback direct JSON parse succeeded (type=${Array.isArray(directParsed) ? "array" : typeof directParsed})`);
      return directParsed;
    } catch {
      // Not JSON either
    }
  }

  logger(`[zimage] parseGradioSSE: returning lastData=${lastData !== null ? "present" : "null"}`);
  return lastData;
};

// ============================================================
// 适配器函数
// ============================================================

const textRequest = (_model: TextModel, _think: boolean, _thinkLevel: 0 | 1 | 2 | 3) => {
  throw new Error("Z-Image Turbo 仅支持图片生成，不支持文本对话");
};

const imageRequest = async (config: ImageConfig, _model: ImageModel): Promise<string> => {
  const baseUrl = vendor.inputValues.baseUrl.replace(/\/+$/, "");
  const apiName = vendor.inputValues.apiName || "run_and_return";

  logger(`[zimage] apiName: ${apiName}`);

  // width/height: 如果 user mengisi, gunakan nilai user
  // jika kosong, hitung dari aspectRatio
  let width: number;
  let height: number;

  const userWidth = parseInt(vendor.inputValues.width);
  const userHeight = parseInt(vendor.inputValues.height);

  if (userWidth > 0 && userHeight > 0) {
    width = userWidth;
    height = userHeight;
  } else if (config.aspectRatio === "16:9") {
    width = 896;
    height = 512;
  } else if (config.aspectRatio === "1:1") {
    width = 768;
    height = 768;
  } else {
    // default 9:16
    width = 512;
    height = 896;
  }

  const steps = parseInt(vendor.inputValues.steps) || 8;
  const cfg = parseFloat(vendor.inputValues.cfg) || 1;
  const seed = parseInt(vendor.inputValues.seed) || 0;
  const vaePath = vendor.inputValues.vaePath || "";
  const llmPath = vendor.inputValues.llmPath || "";
  const loras = vendor.inputValues.loras || "";
  const loraStrength = parseFloat(vendor.inputValues.loraStrength) || 1;

  const prompt = config.prompt;

  // ===== 尝试1: Gradio v2 API (flat named payload) =====
  try {
    const gradioNamedPayload = {
      p: prompt,
      w: Number(width),
      h: Number(height),
      st: Number(steps),
      sd: Number(seed),
      cfg: Number(cfg),
      vae: vaePath,
      llm: llmPath,
      l_list: loras ? loras.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      l_str: Number(loraStrength),
    };
    const v2Endpoint = `${baseUrl}/gradio_api/call/v2/${apiName}`;

    logger(`[zimage] submit endpoint used: POST ${v2Endpoint}`);
    logger(`[zimage] v2 payload keys: ${Object.keys(gradioNamedPayload).join(",")}`);
    logger(`[zimage] v2 payload preview: ${JSON.stringify(gradioNamedPayload).slice(0, 500)}`);
    const submitResp = await axios.post(v2Endpoint, gradioNamedPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 300000,
    });

    logger(`[zimage] v2 submit status: ${submitResp.status}`);
    const eventId = submitResp.data?.event_id;

    if (eventId) {
      logger(`[zimage] event_id: ${eventId}`);
      const imageBase64 = await pollGradioResult(baseUrl, `/gradio_api/call/v2/${apiName}`, eventId);
      if (imageBase64) return imageBase64;
    }

    // No event_id, try sync response
    logger(`[zimage] v2 无 event_id，尝试同步响应解析`);
    const syncResult = submitResp.data?.data || submitResp.data;
    if (syncResult) {
      const imageBase64 = await resolveImageResult(syncResult, baseUrl);
      if (imageBase64.startsWith("data:image/")) {
        logger(`[zimage] v2 同步生图成功! 图片长度: ${imageBase64.length}`);
        return imageBase64;
      }
    }
  } catch (e: any) {
    logger(`[zimage] v2 API 失败: ${e.message}`);
    logger(`[zimage] v2 error status: ${e.response?.status}`);
    logger(`[zimage] v2 error data: ${String(JSON.stringify(e.response?.data ?? "")).slice(0, 1000)}`);
  }

  // ===== 尝试2: Gradio v1 API (fallback) =====
  try {
    const v1Payload = {
      data: [
        prompt,
        Number(width),
        Number(height),
        Number(steps),
        Number(seed),
        Number(cfg),
        vaePath,
        llmPath,
        loras ? loras.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        Number(loraStrength),
      ],
    };
    const v1Endpoint = `${baseUrl}/gradio_api/call/${apiName}`;

    logger(`[zimage] submit endpoint used: POST ${v1Endpoint} (fallback)`);
    logger(`[zimage] v1 payload count: ${v1Payload.data.length}`);
    const submitResp = await axios.post(v1Endpoint, v1Payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 300000,
    });

    logger(`[zimage] v1 submit status: ${submitResp.status}`);
    const eventId = submitResp.data?.event_id;

    if (eventId) {
      logger(`[zimage] event_id: ${eventId}`);
      const imageBase64 = await pollGradioResult(baseUrl, `/gradio_api/call/${apiName}`, eventId);
      if (imageBase64) return imageBase64;
    }

    // No event_id, try sync response
    logger(`[zimage] v1 无 event_id，尝试同步响应解析`);
    const syncResult = submitResp.data?.data || submitResp.data;
    if (syncResult) {
      const imageBase64 = await resolveImageResult(syncResult, baseUrl);
      if (imageBase64.startsWith("data:image/")) {
        logger(`[zimage] v1 同步生图成功! 图片长度: ${imageBase64.length}`);
        return imageBase64;
      }
    }
  } catch (e: any) {
    logger(`[zimage] v1 API 失败: ${e.message}`);
  }

  // ===== 尝试3: /generate 端点 (fallback) =====
  try {
    logger(`[zimage] submit endpoint used: POST ${baseUrl}/generate (fallback)`);
    const fallbackPayload = { prompt, width, height, steps, seed, cfg };
    const resp = await axios.post(`${baseUrl}/generate`, fallbackPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 120000,
    });

    logger(`[zimage] /generate response status: ${resp.status}`);
    const result = resp.data?.image || resp.data?.data || resp.data?.url || resp.data;
    const imageBase64 = await resolveImageResult(result, baseUrl);
    if (imageBase64.startsWith("data:image/")) {
      logger(`[zimage] /generate 生图成功!`);
      return imageBase64;
    }
  } catch (e: any) {
    logger(`[zimage] /generate 失败: ${e.message}`);
  }

  // ===== 尝试4: /v1/images/generations 端点 (fallback) =====
  try {
    logger(`[zimage] submit endpoint used: POST ${baseUrl}/v1/images/generations (fallback)`);
    const oaiPayload = {
      model: "z-image-turbo",
      prompt,
      size: `${width}x${height}`,
      n: 1,
      response_format: "b64_json",
    };
    const resp = await axios.post(`${baseUrl}/v1/images/generations`, oaiPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 120000,
    });

    logger(`[zimage] /v1/images/generations response status: ${resp.status}`);
    const b64 = resp.data?.data?.[0]?.b64_json;
    if (b64) {
      logger(`[zimage] /v1/images/generations 生图成功!`);
      return `data:image/png;base64,${b64}`;
    }
    const url = resp.data?.data?.[0]?.url;
    if (url) {
      return await urlToBase64(url);
    }
  } catch (e: any) {
    logger(`[zimage] /v1/images/generations 失败: ${e.message}`);
  }

  throw new Error("[zimage] 所有端点均失败：v2 API、v1 API、/generate、/v1/images/generations");
};

/** Poll Gradio SSE result with robust completion detection */
const pollGradioResult = async (baseUrl: string, apiPath: string, eventId: string): Promise<string | null> => {
  const pollUrl = `${baseUrl}${apiPath}/${eventId}`;
  logger(`[zimage] 开始轮询: GET ${pollUrl}`);

  const pollResult = await pollTask(async () => {
    try {
      const resultResp = await axios.get(pollUrl, {
        timeout: 300000,
      });

      const resultData = resultResp.data;

      // Log preview
      const preview = typeof resultData === "string" ? resultData.substring(0, 500) : JSON.stringify(resultData).substring(0, 500);
      logger(`[zimage] poll preview first 500 chars: ${preview}`);

      // ===== SSE 文本格式 =====
      if (typeof resultData === "string") {
        // Step 1: Direct extraction from raw SSE text before parsing
        const directExtractedPath = extractImagePathFromText(resultData);
        if (directExtractedPath) {
          logger(`[zimage] 从SSE原始文本中提取图片路径: ${directExtractedPath}`);
          return { completed: true, data: JSON.stringify(directExtractedPath) };
        }

        // Step 2: Parse SSE structured events
        const parsed = parseGradioSSE(resultData);

        if (parsed) {
          const msg = parsed.msg || "";

          // 仍在生成中
          if (msg === "process_generating" || msg === "estimation" || msg === "heartbeat") {
            return { completed: false };
          }

          // Gradio v2 complete may send array of log strings directly
          // MUST check Array.isArray BEFORE msg checks (arrays don't have .msg)
          if (Array.isArray(parsed)) {
            logger(`[zimage] pollGradioResult: parsed is array (length=${parsed.length}), marking completed`);
            return { completed: true, data: JSON.stringify(parsed) };
          }

          // 生成完成
          if (msg === "process_completed" || msg === "complete") {
            const output = parsed.output?.data || parsed.data;
            if (output) {
              return { completed: true, data: JSON.stringify(output) };
            }
            // msg says complete but no data — still mark complete, let resolveImageResult handle it
            return { completed: true, data: JSON.stringify(parsed) };
          }

          // 有 output.data 或 data 字段 → 视为最终结果
          if (parsed.output?.data) {
            return { completed: true, data: JSON.stringify(parsed.output.data) };
          }
          if (parsed.data) {
            return { completed: true, data: JSON.stringify(parsed.data) };
          }

          // 无法判断 → 继续轮询
          return { completed: false };
        }

        // Step 3: SSE contains 'save result image' but couldn't parse JSON → still extract path
        if (resultData.includes("save result image")) {
          const ssePath = extractImagePathFromText(resultData);
          if (ssePath) {
            logger(`[zimage] 从SSE未解析文本中提取图片路径: ${ssePath}`);
            return { completed: true, data: JSON.stringify(ssePath) };
          }
          // Has "save result image" but couldn't extract path — still mark completed
          // The resolveImageResult will try to handle the raw text
          logger(`[zimage] SSE包含"save result image"但无法提取路径，标记completed让resolve处理`);
          return { completed: true, data: JSON.stringify(resultData) };
        }

        // SSE 文本无法解析 → 继续轮询
        return { completed: false };
      }

      // ===== JSON 格式响应 (axios auto-parsed) =====

      // Array response (Gradio v2 may return array of log strings directly)
      if (Array.isArray(resultData)) {
        logger(`[zimage] pollGradioResult: resultData is array (length=${resultData.length}), marking completed`);
        // Check if any item contains "save result image" path
        for (const item of resultData) {
          if (typeof item === "string") {
            const extractedPath = extractImagePathFromText(item);
            if (extractedPath) {
              logger(`[zimage] 从数组响应item中提取图片路径: ${extractedPath}`);
              return { completed: true, data: JSON.stringify(extractedPath) };
            }
          }
        }
        return { completed: true, data: JSON.stringify(resultData) };
      }

      // Object response with msg field
      if (resultData?.msg === "process_completed" || resultData?.msg === "complete") {
        const output = resultData?.output?.data || resultData?.data;
        if (output) {
          return { completed: true, data: JSON.stringify(output) };
        }
        return { completed: false };
      }
      if (resultData?.msg === "process_generating" || resultData?.msg === "estimation" || resultData?.msg === "heartbeat") {
        return { completed: false };
      }

      // 有 data 字段直接返回
      if (resultData?.data) {
        return { completed: true, data: JSON.stringify(resultData.data) };
      }

      // Object contains "save result image" in stringified form
      const resultStr = JSON.stringify(resultData);
      if (resultStr.includes("save result image")) {
        const extractedPath = extractImagePathFromText(resultStr);
        if (extractedPath) {
          logger(`[zimage] 从对象响应JSON中提取图片路径: ${extractedPath}`);
          return { completed: true, data: JSON.stringify(extractedPath) };
        }
        // Has the pattern but couldn't extract — return raw for resolveImageResult
        logger(`[zimage] 对象响应包含"save result image"但无法提取路径，标记completed让resolve处理`);
        return { completed: true, data: JSON.stringify(resultData) };
      }

      // 其他未知响应 → 继续轮询
      return { completed: false };
    } catch (e: any) {
      logger(`[zimage] 轮询出错: ${e.message}`);
      return { completed: false };
    }
  }, 3000, 300000);

  if (pollResult.error) {
    throw new Error(`[zimage] Gradio 轮询失败: ${pollResult.error}`);
  }

  const rawResult = JSON.parse(pollResult.data!);
  logger(`[zimage] result raw data type: ${Array.isArray(rawResult) ? "array" : typeof rawResult}`);
  logger(`[zimage] result preview: ${JSON.stringify(rawResult).substring(0, 300)}`);
  logger(`[zimage] 轮询完成，解析图片结果`);
  const imageBase64 = await resolveImageResult(rawResult, baseUrl);

  if (!imageBase64.startsWith("data:image/")) {
    throw new Error("[zimage] 图片结果格式错误，未获取到有效的 base64 图片");
  }

  logger(`[zimage] 生图成功! 图片长度: ${imageBase64.length}`);
  return imageBase64;
};

const videoRequest = async (_config: VideoConfig, _model: VideoModel): Promise<string> => {
  return "";
};

const ttsRequest = async (_config: TTSConfig, _model: TTSModel): Promise<string> => {
  return "";
};

const checkForUpdates = async (): Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }> => {
  return { hasUpdate: false, latestVersion: "2.2", notice: "" };
};

const updateVendor = async (): Promise<string> => {
  return "";
};

// ============================================================
// 导出
// ============================================================

exports.vendor = vendor;
exports.textRequest = textRequest;
exports.imageRequest = imageRequest;
exports.videoRequest = videoRequest;
exports.ttsRequest = ttsRequest;
exports.checkForUpdates = checkForUpdates;
exports.updateVendor = updateVendor;

export {};
