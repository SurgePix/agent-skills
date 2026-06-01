#!/usr/bin/env node
/**
 * SurgePix 去背景 CLI
 *
 * 流程:
 *   1. 本地图片 → 上传拿到 fileUrl（可选，直接传 URL 则跳过）
 *   2. POST /tasks/remove-background
 *   3. 轮询 GET /tasks/{taskId} 直到 succeeded / failed
 *
 * 用法:
 *   node remove_background.mjs <image-path-or-url> [--sync] [--session-id <id>]
 *
 * Env (auto-loaded):
 *   SURGEPIX_API_KEY        必填
 *   SURGEPIX_BASE_URL       可选，默认 https://api-test.surgepix.ai/api
 *   SURGEPIX_UPLOAD_FOLDER  可选，默认 files
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 复用 upload 脚本的能力
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadScript = path.resolve(__dirname, "../../surgepix-upload/scripts/file_upload.mjs");
const { uploadFile, loadConfig, discoverAndLoadEnv } = await import(uploadScript);

// ============================================================
// 常量
// ============================================================

const DEFAULT_BASE_URL = "https://api-test.surgepix.ai/api";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 300_000;
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
// 上传本地文件
// ============================================================

async function uploadLocalFile(imagePath) {
  const resolved = path.resolve(imagePath);
  if (!existsSync(resolved)) {
    throw new Error(`文件不存在: ${resolved}`);
  }
  console.error(`[upload] uploading ${resolved}`);
  const result = await uploadFile(resolved);
  if (!result.url) {
    throw new Error(`上传成功但未返回 url: ${JSON.stringify(result)}`);
  }
  console.error(`[upload] url=${result.url}`);
  return result.url;
}

// ============================================================
// 去背景 API
// ============================================================

async function removeBackground(fileUrl, { sessionId, noWait = false } = {}) {
  const body = { fileUrl, noWait };
  if (sessionId != null) {
    body.sessionId = sessionId;
  }
  console.error(`[remove-background] fileUrl=${fileUrl} noWait=${noWait}`);
  return apiRequest("POST", "/tasks/remove-background", { body });
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

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
}

// ============================================================
// CLI 入口
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { input: null, sync: false, sessionId: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--sync") {
      parsed.sync = true;
    } else if (args[i] === "--session-id" && i + 1 < args.length) {
      parsed.sessionId = Number(args[++i]);
    } else if (args[i] === "-h" || args[i] === "--help") {
      console.error("Usage: node remove_background.mjs <image-path-or-url> [--sync] [--session-id <id>]");
      console.error("");
      console.error("  <image-path-or-url>  本地图片路径 或 已上传的 URL");
      console.error("  --sync               同步模式，等待结果直接返回");
      console.error("  --session-id <id>    会话 ID，迭代时传入");
      process.exit(0);
    } else if (!parsed.input) {
      parsed.input = args[i];
    }
  }
  return parsed;
}

async function main() {
  initConfig();

  if (!config.apiKey) {
    fail("SURGEPIX_API_KEY not found. Set it in .env or .claude/settings.local.json");
  }

  const { input, sync, sessionId } = parseArgs();
  if (!input) {
    fail("缺少参数: 请提供图片路径或 URL");
  }

  try {
    let fileUrl;
    if (input.startsWith("http://") || input.startsWith("https://")) {
      fileUrl = input;
    } else {
      fileUrl = await uploadLocalFile(input);
    }

    const data = await removeBackground(fileUrl, { sessionId, noWait: sync });

    if (sync) {
      printResult(data);
      if (data.progress !== "succeeded") process.exit(1);
      return;
    }

    const taskId = data.taskId;
    if (!taskId) {
      fail(`异步模式未返回 taskId: ${JSON.stringify(data)}`);
    }

    console.error(`[async] 开始轮询 taskId=${taskId}`);
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

export { removeBackground, pollUntilDone, uploadLocalFile };
