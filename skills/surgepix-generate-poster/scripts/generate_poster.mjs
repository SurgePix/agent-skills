#!/usr/bin/env node
/**
 * SurgePix 生成海报 CLI
 *
 * 流程:
 *   1. 本地参考图 → 上传拿到 URL（可选，直接传 URL 则跳过）
 *   2. POST /tasks/generate-poster   (始终异步提交：API noWait=true，立即返回 taskId)
 *   3. 根据 --nowait 决定行为:
 *      - --nowait false（默认，同步）：脚本内部轮询 GET /tasks/{taskId} 直到 succeeded / failed
 *      - --nowait true（异步）：脚本立即返回 taskId 等任务信息，由 Agent 后续用 query-task 技能查询
 *
 * 用法:
 *   node generate_poster.mjs --event-name <text> --date <text> --venue <text>
 *                            [--prompt <text>] [--description <text>] [--style <name>]
 *                            [--size <1080x1920>] [--reference <path-or-url> ...]
 *                            [--session-id <id>] [--nowait <true|false>]
 *
 * Env (auto-loaded):
 *   SURGEPIX_API_KEY        必填
 *   SURGEPIX_BASE_URL       可选，默认 https://api.surgepix.ai/api
 *   SURGEPIX_UPLOAD_FOLDER  可选，默认 files
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadConfig } from "../../surgepix-setup/scripts/env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadScript = path.resolve(__dirname, "../../surgepix-upload/scripts/file_upload.mjs");
const uploadModule = await import(pathToFileURL(uploadScript).href);
const { uploadFile, refreshConfig: refreshUploadConfig } = uploadModule;

// ============================================================
// 常量
// ============================================================

const DEFAULT_BASE_URL = "https://api-test.surgepix.ai/api";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 600_000;
const DEFAULT_USER_AGENT =
  process.env.SURGEPIX_USER_AGENT ??
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ============================================================
// 配置
// ============================================================

let config = { baseUrl: DEFAULT_BASE_URL, folder: "files", apiKey: "" };

function initConfig() {
  loadConfig();
  config = {
    baseUrl: process.env.SURGEPIX_BASE_URL ?? DEFAULT_BASE_URL,
    folder: process.env.SURGEPIX_UPLOAD_FOLDER ?? "files",
    apiKey: process.env.SURGEPIX_API_KEY ?? "",
  };
}

// ============================================================
// HTTP 基础
// ============================================================

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

// ============================================================
// 上传本地参考图
// ============================================================

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

// ============================================================
// 生成海报 API
// ============================================================

async function generatePoster(options) {
  const {
    eventName,
    date,
    venue,
    prompt,
    description,
    style,
    size,
    referenceImages,
    sessionId,
  } = options;
  // noWait 写死 true，Agent 无需也无法传递该参数
  const body = { noWait: true, eventName, date, venue };
  if (prompt != null) body.prompt = prompt;
  if (description != null) body.description = description;
  if (style != null) body.style = style;
  if (size != null) body.size = size;
  if (referenceImages != null && referenceImages.length > 0) {
    body.referenceImages = referenceImages;
  }
  if (sessionId != null) body.sessionId = sessionId;
  console.error(`[generate-poster] eventName=${eventName}`);
  return apiRequest("POST", "/tasks/generate-poster", { body });
}

// ============================================================
// 轮询任务状态
// ============================================================

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

// ============================================================
// 输出结果
// ============================================================

function printResult(data) {
  const output = {
    ok: true,
    taskId: data.taskId,
    sessionId: data.sessionId,
    progress: data.progress,
    download: data.taskResult?.download ?? null,
  };
  console.log(JSON.stringify(output));
}

// --nowait true：任务已异步提交，立即返回任务信息并引导 Agent 用 query-task 查询
function printAsyncResult(data) {
  const taskId = data.taskId;
  const output = {
    ok: true,
    async: true,
    taskId,
    sessionId: data.sessionId ?? null,
    progress: data.progress ?? "processing",
    download: data.taskResult?.download ?? null,
    hint: `任务已异步提交，尚未完成。请稍后用 surgepix-query-task 技能查询任务状态（单次查询，未完成则稍后再查），例如：node <skills-dir>/surgepix-query-task/scripts/query_task.mjs ${taskId}`,
  };
  console.log(JSON.stringify(output));
}

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
}

// ============================================================
// CLI 入口
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    eventName: null,
    date: null,
    venue: null,
    prompt: null,
    description: null,
    style: null,
    size: null,
    referenceImages: [],
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
    } else if (arg === "--event-name" && i + 1 < args.length) {
      parsed.eventName = args[++i];
    } else if (arg === "--date" && i + 1 < args.length) {
      parsed.date = args[++i];
    } else if (arg === "--venue" && i + 1 < args.length) {
      parsed.venue = args[++i];
    } else if (arg === "--prompt" && i + 1 < args.length) {
      parsed.prompt = args[++i];
    } else if (arg === "--description" && i + 1 < args.length) {
      parsed.description = args[++i];
    } else if (arg === "--style" && i + 1 < args.length) {
      parsed.style = args[++i];
    } else if (arg === "--size" && i + 1 < args.length) {
      parsed.size = args[++i];
    } else if (arg === "--reference" && i + 1 < args.length) {
      parsed.referenceImages.push(args[++i]);
    } else if (arg === "--session-id" && i + 1 < args.length) {
      parsed.sessionId = Number(args[++i]);
    } else if (arg === "-h" || arg === "--help") {
      console.error("Usage: node generate_poster.mjs --event-name <text> --date <text> --venue <text> \\");
      console.error("         [--prompt <text>] [--description <text>] [--style <name>] [--size <1080x1920>] \\");
      console.error("         [--reference <path-or-url> ...] [--session-id <id>] [--nowait <true|false>]");
      console.error("");
      console.error("  --event-name <text>      海报主标题（必填）");
      console.error("  --date <text>            活动日期时间（必填），如 2026-06-15 19:00");
      console.error("  --venue <text>           海报上展示的地点（必填）");
      console.error("  --prompt <text>          创作方向（配色/排版等），不会印在海报上");
      console.error("  --description <text>     印在海报上的宣传语，最多 100 字符");
      console.error("  --style <name>           版式预设 modern/vintage/minimalist/bold");
      console.error("  --size <WxH>             输出尺寸，默认 1080x1920");
      console.error("  --reference <path-or-url> 参考图（本地路径自动上传，可重复传多个）");
      console.error("  --session-id <id>        会话 ID，迭代调整时传入");
      console.error("  --nowait <true|false>    false(默认)=同步，脚本内部轮询直到完成；true=异步，立即返回 taskId");
      process.exit(0);
    }
  }
  return parsed;
}

function validateDescription(description) {
  if (description == null) return;
  if (description.length > 100) {
    fail(`--description 最多 100 个字符，收到: ${description.length}`);
  }
}

async function main() {
  initConfig();

  if (!config.apiKey) {
    fail("SURGEPIX_API_KEY not found. Set it in .env or .claude/settings.local.json");
  }

  const {
    eventName,
    date,
    venue,
    prompt,
    description,
    style,
    size,
    referenceImages,
    sessionId,
    nowait,
  } = parseArgs();

  if (!eventName || !date || !venue) {
    fail("缺少必填参数: --event-name、--date、--venue 都必须提供");
  }
  validateDescription(description);

  try {
    const resolvedReferences = [];
    for (const ref of referenceImages) {
      resolvedReferences.push(await resolveReference(ref));
    }

    const data = await generatePoster({
      eventName,
      date,
      venue,
      prompt,
      description,
      style,
      size,
      referenceImages: resolvedReferences,
      sessionId,
    });

    const taskId = data.taskId;
    if (!taskId) {
      fail(`未返回 taskId: ${JSON.stringify(data)}`);
    }

    if (nowait) {
      // 异步模式：立即返回任务信息，交由 Agent 用 query-task 技能后续查询
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

export { generatePoster, pollUntilDone, resolveReference };
