#!/usr/bin/env node
/**
 * SurgePix 极简诗意编辑插画 CLI
 *
 * 流程:
 *   1. 本地参考图 → 上传拿到 URL（必填 1–5 张；URL 则跳过上传）
 *   2. POST /tasks/generate-photo-poetic-editorial（始终异步提交：API noWait=true）
 *   3. 根据 --nowait 决定是否本地轮询 GET /tasks/{taskId}
 *
 * 用法:
 *   node generate_photo_poetic_editorial.mjs --prompt <text> --size <WxH>
 *                       --reference <path-or-url> [--reference ...]
 *                       [--session-id <id>] [--nowait <true|false>]
 *
 * Env (auto-loaded):
 *   SURGEPIX_API_KEY        必填
 *   SURGEPIX_BASE_URL       必填
 *   SURGEPIX_UPLOAD_FOLDER  可选，默认 files
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverAndLoadEnv, loadConfig } from "./env.mjs";

const { uploadFile, refreshConfig: refreshUploadConfig } = await import("./file_upload.mjs");

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 600_000;
const MIN_REFERENCES = 1;
const MAX_REFERENCES = 5;
const TASK_PATH = "/tasks/generate-photo-poetic-editorial";
const DEFAULT_USER_AGENT =
  process.env.SURGEPIX_USER_AGENT ??
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let config = { baseUrl: "", folder: "files", apiKey: "" };

function initConfig() {
  config = loadConfig();
}

function buildHeaders() {
  const headers = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (config.apiKey) {
    headers.Authorization = config.apiKey;
  }
  return headers;
}

async function apiRequest(method, urlPath, { body, timeout = 120_000 } = {}) {
  const url = `${config.baseUrl}${urlPath}`;
  const headers = { ...buildHeaders() };
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status} ${urlPath}: ${text}`);
  }
  const payload = await resp.json();
  if (payload.code !== 0) {
    throw new Error(`API error ${urlPath}: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

async function resolveReference(ref) {
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    return ref;
  }
  const resolved = path.resolve(ref);
  if (!existsSync(resolved)) {
    throw new Error(`参考图文件不存在: ${resolved}`);
  }
  refreshUploadConfig();
  console.error(`[upload] uploading reference ${resolved}`);
  const result = await uploadFile(resolved);
  if (!result.url) {
    throw new Error(`上传成功但未返回 url: ${JSON.stringify(result)}`);
  }
  console.error(`[upload] url=${result.url}`);
  return result.url;
}

const PANEL_PREFIX_ZH = [
  "【面板方向】只输出一张象牙色抽象记忆面板，不要把原片放进画面，不要上图下板的拼接，不要整张照片重绘成插画或套色印刷。",
  "参考图只用来提炼空间关系（方向、间隔、重叠、节奏、色彩角色），成品里不得出现这张照片或其裁切。",
  "不是缩略图、描摹或全身剪影。人群用短竖色块，头肩连成一体；栏杆压成一至两条细水平线；气球/树冠用重叠柔和色块，无内部图案。",
  "背景均匀象牙色，母题偏小、留白充分。只放一个 2–5 词英文主标题（必要时一句短副标题），克制衬线体。不要色卡、图例、日期、logo、纸纹颗粒、浮世绘剪影。",
  "【场景补充】",
].join("");

const PANEL_PREFIX_EN = [
  "[Panel direction] Output only an ivory abstract memory panel. Do not include the source photo anywhere. No photo-plus-panel diptych. Do not restyle the whole photo into an illustration or risograph print. ",
  "The reference is for distilling spatial facts only (direction, interval, overlap, rhythm, color roles). The finished image must not show the photograph or a crop of it. ",
  "Not a thumbnail, tracing, or full-body silhouette. People = short vertical marks with head and body fused; a rail = one or two thin horizontals; balloons/canopies = overlapping soft flats with no internal patterns. ",
  "Flat ivory ground, small motif, generous whitespace. One original English title of 2–5 words (optional short subtitle) in a restrained serif. No color chips, legends, dates, logos, paper grain, or ukiyo-e silhouettes. ",
  "[Scene notes] ",
].join("");

function isMostlyChinese(text) {
  const chars = String(text).replace(/\s/g, "");
  if (!chars) return true;
  const cjk = chars.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return cjk / chars.length >= 0.2;
}

function stripLegacyFloors(text) {
  return String(text)
    .replace(/^【(?:线条|面板|重构)方向】[\s\S]*?【场景补充】/, "")
    .replace(/^\[(?:Line|Panel|Restage) direction\][\s\S]*?\[Scene notes\]\s*/i, "")
    .trim();
}

/** 垫一层「只出抽象面板、不要原片」方向。已带新标记则不重复；旧底板会先剥掉再拼。 */
function composeEditorialPrompt(userPrompt) {
  const trimmed = stripLegacyFloors(userPrompt);
  if (!trimmed) return "";
  if (trimmed.includes("【面板方向】") || trimmed.includes("[Panel direction]")) {
    return trimmed;
  }
  const prefix = isMostlyChinese(trimmed) ? PANEL_PREFIX_ZH : PANEL_PREFIX_EN;
  return `${prefix}${trimmed}`;
}

function composeLinePrompt(userPrompt) {
  return composeEditorialPrompt(userPrompt);
}

/** @param {string} raw @returns {[number, number]} */
function parseSize(raw) {
  const m = /^(\d+)x(\d+)$/i.exec(String(raw).trim());
  if (!m) {
    throw new Error(`--size 格式非法: ${raw}；应为 WxH，例如 1024x1024`);
  }
  const width = Number(m[1]);
  const height = Number(m[2]);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`--size 宽高必须为正整数: ${raw}`);
  }
  return [width, height];
}

async function generatePhotoPoeticEditorial(options) {
  const { reference, prompt, size, sessionId } = options;
  const body = {
    noWait: true,
    source: "skill",
    reference,
    prompt,
    size,
  };
  if (sessionId != null) body.sessionId = sessionId;
  console.error(`[poetic-editorial] refs=${reference.length} size=${size[0]}x${size[1]}`);
  return apiRequest("POST", TASK_PATH, { body });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollUntilDone(taskId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const data = await apiRequest("GET", `/tasks/${taskId}`);
    const progress = data.progress;
    console.error(`[poll] taskId=${taskId} progress=${progress}`);
    if (progress === "succeeded" || progress === "failed") {
      return data;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`轮询超时 (${POLL_TIMEOUT_MS / 1000}s): taskId=${taskId}`);
}

function printResult(data) {
  console.log(
    JSON.stringify({
      ok: true,
      taskId: data.taskId,
      sessionId: data.sessionId,
      progress: data.progress,
      download: data.taskResult?.download ?? null,
    }),
  );
}

function printAsyncResult(data) {
  const taskId = data.taskId;
  console.log(
    JSON.stringify({
      ok: true,
      async: true,
      taskId,
      sessionId: data.sessionId ?? null,
      progress: data.progress ?? "processing",
      download: data.taskResult?.download ?? null,
      hint: `任务已异步提交，尚未完成。请稍后用 surgepix-query-task 技能查询任务状态，例如：node <skills-dir>/surgepix-query-task/scripts/query_task.mjs ${taskId}`,
    }),
  );
}

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
}

function printHelp() {
  console.error("Usage: node generate_photo_poetic_editorial.mjs --prompt <text> --size <WxH> \\");
  console.error("         --reference <path-or-url> [--reference ...] \\");
  console.error("         [--session-id <id>] [--nowait <true|false>]");
  console.error("");
  console.error("  --prompt <text>           场景说明（必填；脚本会垫一层「只要抽象面板、不要原片」方向）");
  console.error("  --size <WxH>              目标宽高，例如 1024x1024（必填）");
  console.error("  --reference <path-or-url> 参考图（必填 1–5 张，可重复；本地路径自动上传）");
  console.error("  --session-id <id>         会话 ID，迭代调整时传入");
  console.error("  --nowait <true|false>     false(默认)=同步轮询；true=异步返回 taskId");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    prompt: null,
    size: null,
    reference: [],
    sessionId: null,
    nowait: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--nowait") {
      const next = args[i + 1];
      if (next === "true" || next === "false") {
        parsed.nowait = next === "true";
        i++;
      } else {
        parsed.nowait = true;
      }
    } else if (arg === "--prompt" && i + 1 < args.length) {
      parsed.prompt = args[++i];
    } else if (arg === "--size" && i + 1 < args.length) {
      parsed.size = args[++i];
    } else if (arg === "--reference" && i + 1 < args.length) {
      parsed.reference.push(args[++i]);
    } else if (arg === "--session-id" && i + 1 < args.length) {
      parsed.sessionId = Number(args[++i]);
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }
  }
  return parsed;
}

async function main() {
  const { prompt, size, reference, sessionId, nowait } = parseArgs();

  initConfig();

  if (!config.apiKey) {
    const sources = discoverAndLoadEnv();
    fail(
      `SURGEPIX_API_KEY not found. Set it in .env or run surgepix-setup skill. sources=${JSON.stringify(sources)}`,
    );
  }
  if (!config.baseUrl) {
    const sources = discoverAndLoadEnv();
    fail(
      `SURGEPIX_BASE_URL not found. Set it in .env or the shell (see surgepix-setup skill). sources=${JSON.stringify(sources)}`,
    );
  }

  const trimmedPrompt = typeof prompt === "string" ? prompt.trim() : "";
  if (!trimmedPrompt) {
    fail("缺少必填参数: --prompt（去空白后不能为空）");
  }
  if (!size) {
    fail("缺少必填参数: --size（例如 1024x1024）");
  }
  if (reference.length < MIN_REFERENCES || reference.length > MAX_REFERENCES) {
    fail(`--reference 数量必须为 ${MIN_REFERENCES}–${MAX_REFERENCES} 张，当前 ${reference.length}`);
  }

  let sizePair;
  try {
    sizePair = parseSize(size);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  try {
    const resolvedRefs = [];
    for (const ref of reference) {
      resolvedRefs.push(await resolveReference(ref));
    }

    const data = await generatePhotoPoeticEditorial({
      reference: resolvedRefs,
      prompt: composeEditorialPrompt(trimmedPrompt),
      size: sizePair,
      sessionId,
    });

    const taskId = data.taskId;
    if (!taskId) {
      fail(`未返回 taskId: ${JSON.stringify(data)}`);
    }

    if (nowait) {
      console.error(`[nowait] 任务已提交，taskId=${taskId}，跳过轮询`);
      printAsyncResult(data);
      return;
    }

    console.error(`[sync] 开始轮询 taskId=${taskId}`);
    const final = await pollUntilDone(String(taskId));
    printResult(final);
    if (final.progress !== "succeeded") process.exit(1);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}

export { generatePhotoPoeticEditorial, pollUntilDone, resolveReference, parseSize, composeEditorialPrompt, composeLinePrompt };
