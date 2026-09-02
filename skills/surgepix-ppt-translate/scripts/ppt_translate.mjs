#!/usr/bin/env node
/**
 * SurgePix PPT/PPTX 翻译 CLI
 *
 * 流程:
 *   1. 本地 ppt/pptx → 上传拿到 URL（直接传 URL 则跳过）
 *   2. POST /tasks/ppt-translate（始终异步提交：API noWait=true）
 *   3. 根据 --nowait 决定是否本地轮询
 *
 * 用法:
 *   node ppt_translate.mjs <path-or-url> --language <text>
 *                          [--session-id <id>] [--nowait <true|false>]
 *   node ppt_translate.mjs --path <path-or-url> --language <text> ...
 *
 * Env:
 *   SURGEPIX_API_KEY / SURGEPIX_BASE_URL 必填
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./env.mjs";

const { uploadFile, refreshConfig: refreshUploadConfig } = await import("./file_upload.mjs");

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 900_000;
const PPT_EXT = new Set([".ppt", ".pptx"]);
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

function assertPptExtension(filePathOrUrl, { allowMissingExtOnUrl = false } = {}) {
  const lower = filePathOrUrl.split("?")[0].toLowerCase();
  const ext = path.extname(lower);
  if (!ext) {
    if (allowMissingExtOnUrl && /^https?:\/\//i.test(filePathOrUrl)) {
      console.error(
        "[warn] URL 无文件扩展名，无法在客户端校验是否为 ppt/pptx；若后端拒绝请改用带扩展名的地址",
      );
      return;
    }
    fail("无法识别扩展名：仅支持 .ppt / .pptx（不支持 pdf/docx）");
  }
  if (!PPT_EXT.has(ext)) {
    fail(`不支持的文件类型 ${ext}：仅支持 .ppt / .pptx（不支持 pdf/docx）`);
  }
}

async function resolveSourcePath(input) {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    assertPptExtension(input, { allowMissingExtOnUrl: true });
    return input;
  }
  const resolved = path.resolve(input);
  if (!existsSync(resolved)) {
    throw new Error(`源文件不存在: ${resolved}`);
  }
  assertPptExtension(resolved);
  refreshUploadConfig();
  console.error(`[upload] uploading ${resolved}`);
  const result = await uploadFile(resolved);
  if (!result.url) {
    throw new Error(`上传成功但未返回 url: ${JSON.stringify(result)}`);
  }
  console.error(`[upload] url=${result.url}`);
  return result.url;
}

async function translatePpt({ path: fileUrl, language, sessionId }) {
  const body = {
    noWait: true,
    source: "skill",
    path: fileUrl,
    language,
  };
  if (sessionId != null) body.sessionId = sessionId;
  console.error(`[ppt-translate] language=${language}`);
  return apiRequest("POST", "/tasks/ppt-translate", { body });
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
      hint: `任务已异步提交，尚未完成。多页翻译可能较久，请用 surgepix-query-task 查询，例如：node <skills-dir>/surgepix-query-task/scripts/query_task.mjs ${taskId}`,
    }),
  );
}

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    path: null,
    language: null,
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
    } else if ((arg === "--path" || arg === "--file") && i + 1 < args.length) {
      parsed.path = args[++i];
    } else if (arg === "--language" && i + 1 < args.length) {
      parsed.language = args[++i];
    } else if (arg === "--session-id" && i + 1 < args.length) {
      parsed.sessionId = Number(args[++i]);
    } else if (arg === "-h" || arg === "--help") {
      console.error("Usage: node ppt_translate.mjs <path-or-url> --language <text> \\");
      console.error("         [--session-id <id>] [--nowait <true|false>]");
      console.error("   or: node ppt_translate.mjs --path <path-or-url> --language <text> ...");
      console.error("");
      console.error("  <path-or-url> / --path   源 ppt/pptx 本地路径或 URL（必填）");
      console.error("  --language <text>        目标语言（必填），如 ja / Japanese / 日语");
      console.error("  --session-id <id>        会话 ID");
      console.error("  --nowait <true|false>    false(默认)=同步轮询；true=异步返回 taskId");
      console.error("");
      console.error("  仅支持 .ppt / .pptx；不支持 pdf / docx。多页建议 --nowait true。");
      process.exit(0);
    } else if (!arg.startsWith("--") && parsed.path == null) {
      parsed.path = arg;
    }
  }
  return parsed;
}

async function main() {
  const { path: source, language, sessionId, nowait } = parseArgs();

  initConfig();

  if (!config.apiKey) {
    fail("SURGEPIX_API_KEY not found. Set it in .env or run surgepix-setup skill.");
  }
  if (!config.baseUrl) {
    fail("SURGEPIX_BASE_URL not found. Set it in .env or the shell (see surgepix-setup skill).");
  }

  if (!source) {
    fail("缺少源文件: 请提供 ppt/pptx 本地路径或 URL（位置参数或 --path）");
  }
  if (!language) {
    fail("缺少必填参数: --language（目标语言，如 ja / Japanese / 日语）");
  }

  try {
    const fileUrl = await resolveSourcePath(source);
    const data = await translatePpt({
      path: fileUrl,
      language,
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

export { translatePpt, pollUntilDone, resolveSourcePath };
