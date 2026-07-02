#!/usr/bin/env node
/**
 * SurgePix 图片翻译 CLI
 *
 * 流程:
 *   1. 本地图片 → 上传拿到 URL（直接传 URL 则跳过）
 *   2. POST /tasks/image-translate
 *   3. 根据 --nowait 决定行为:
 *      - --nowait false（默认，同步）：API noWait=false，服务端等待完成后返回 download
 *      - --nowait true（异步）：API noWait=true，立即返回 taskId，由 Agent 用 query-task 查询
 *
 * 用法:
 *   node image_translate.mjs <image-path-or-url> [<image2> ...]
 *     [--language <code>] [--session-id <id>] [--nowait <true|false>]
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

const DEFAULT_BASE_URL = "https://api.surgepix.ai/api";
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

async function apiRequest(method, urlPath, { body, timeout = 300_000 } = {}) {
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
// 上传本地文件
// ============================================================

async function uploadLocalFile(imagePath) {
  const resolved = path.resolve(imagePath);
  if (!existsSync(resolved)) {
    throw new Error(`文件不存在: ${resolved}`);
  }
  refreshUploadConfig();
  console.error(`[upload] uploading ${resolved}`);
  const result = await uploadFile(resolved);
  if (!result.url) {
    throw new Error(`上传成功但未返回 url: ${JSON.stringify(result)}`);
  }
  console.error(`[upload] url=${result.url}`);
  return result.url;
}

async function resolveImageUrl(input) {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }
  return uploadLocalFile(input);
}

// ============================================================
// 图片翻译 API
// ============================================================

async function translateImages(imageUrls, { language = "en", sessionId, noWait = false } = {}) {
  const body = { imageUrls, language, noWait };
  if (sessionId != null) {
    body.sessionId = sessionId;
  }
  console.error(
    `[image-translate] count=${imageUrls.length} language=${language} noWait=${noWait}`
  );
  return apiRequest("POST", "/tasks/image-translate", { body });
}

// ============================================================
// 轮询任务状态（同步模式下若仍 processing 则兜底轮询）
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

function printResult(data, { imageCount = 1 } = {}) {
  const output = {
    ok: true,
    taskId: data.taskId,
    sessionId: data.sessionId,
    progress: data.progress,
    download: data.taskResult?.download ?? null,
    imageCount,
    resultType: imageCount > 1 ? "zip" : "image",
  };
  console.log(JSON.stringify(output));
}

function printAsyncResult(data, { imageCount = 1 } = {}) {
  const taskId = data.taskId;
  const output = {
    ok: true,
    async: true,
    taskId,
    sessionId: data.sessionId ?? null,
    progress: data.progress ?? "processing",
    download: data.taskResult?.download ?? null,
    imageCount,
    resultType: imageCount > 1 ? "zip" : "image",
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
    images: [],
    language: "en",
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
    } else if (arg === "--language" && i + 1 < args.length) {
      parsed.language = args[++i];
    } else if (arg === "--session-id" && i + 1 < args.length) {
      parsed.sessionId = Number(args[++i]);
    } else if (arg === "-h" || arg === "--help") {
      console.error(
        "Usage: node image_translate.mjs <image-path-or-url> [<image2> ...] [--language <code>] [--session-id <id>] [--nowait <true|false>]"
      );
      console.error("");
      console.error("  <image-path-or-url>   本地图片路径或 URL，可传多个");
      console.error("  --language <code>     目标语言，如 en、zh、ja，默认 en");
      console.error("  --session-id <id>     会话 ID，迭代时传入");
      console.error(
        "  --nowait <true|false> false(默认)=同步，API 等待完成后返回 download；true=异步，立即返回 taskId"
      );
      process.exit(0);
    } else if (!arg.startsWith("--")) {
      parsed.images.push(arg);
    }
  }
  return parsed;
}

async function main() {
  initConfig();

  if (!config.apiKey) {
    fail("SURGEPIX_API_KEY not found. Set it in .env or .claude/settings.local.json");
  }

  const { images, language, sessionId, nowait } = parseArgs();
  if (images.length === 0) {
    fail("缺少参数: 请至少提供一张图片路径或 URL");
  }

  try {
    const imageUrls = [];
    for (const input of images) {
      imageUrls.push(await resolveImageUrl(input));
    }

    const data = await translateImages(imageUrls, {
      language,
      sessionId,
      noWait: nowait,
    });

    const taskId = data.taskId;
    if (!taskId) {
      fail(`未返回 taskId: ${JSON.stringify(data)}`);
    }

    const meta = { imageCount: imageUrls.length };

    if (nowait) {
      console.error(`[nowait] 任务已提交，taskId=${taskId}，跳过等待`);
      printAsyncResult(data, meta);
      return;
    }

    if (data.progress === "succeeded" || data.progress === "failed") {
      printResult(data, meta);
      if (data.progress !== "succeeded") process.exit(1);
      return;
    }

    console.error(`[sync] 响应仍为 processing，开始轮询 taskId=${taskId}`);
    const final = await pollUntilDone(String(taskId));
    printResult(final, meta);
    if (final.progress !== "succeeded") process.exit(1);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}

export { translateImages, pollUntilDone, resolveImageUrl };
