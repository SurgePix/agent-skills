#!/usr/bin/env node
/**
 * SurgePix 剧本分镜头（故事板）生成 CLI
 *
 * 流程:
 *   1. 本地参考图 → 上传拿到 URL（可选；直接传 URL 则跳过）
 *   2. POST /tasks/generate-storyboard（始终异步提交：API noWait=true）
 *   3. 根据 --nowait 决定是否本地轮询 GET /tasks/{taskId}
 *
 * 用法:
 *   node generate_storyboard.mjs --script <text>
 *                          [--count <1-12>] [--aspect-ratio <ratio>]
 *                          [--reference <path-or-url> ...]
 *                          [--session-id <id>] [--nowait <true|false>]
 *
 * Env (auto-loaded):
 *   SURGEPIX_API_KEY        必填
 *   SURGEPIX_BASE_URL       必填
 *   SURGEPIX_UPLOAD_FOLDER  可选，默认 files
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./env.mjs";

const { uploadFile, refreshConfig: refreshUploadConfig } = await import("./file_upload.mjs");

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 600_000;
const MAX_REFERENCES = 10;
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

async function generateStoryboard(options) {
  const { script, count, aspectRatio, reference, sessionId } = options;
  const body = {
    noWait: true,
    source: "skill",
    script,
  };
  if (count != null) body.count = count;
  if (aspectRatio != null) body.aspectRatio = aspectRatio;
  if (reference != null && reference.length > 0) body.reference = reference;
  if (sessionId != null) body.sessionId = sessionId;
  console.error(`[generate-storyboard] count=${count ?? 4} aspectRatio=${aspectRatio ?? "4:3"}`);
  return apiRequest("POST", "/tasks/generate-storyboard", { body });
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
  console.error("Usage: node generate_storyboard.mjs --script <text> \\");
  console.error("         [--count <1-12>] [--aspect-ratio <ratio>] \\");
  console.error("         [--reference <path-or-url> ...] \\");
  console.error("         [--session-id <id>] [--nowait <true|false>]");
  console.error("");
  console.error("  --script <text>           分镜剧本（必填）");
  console.error("  --count <1-12>            分镜数，默认 4");
  console.error("  --aspect-ratio <ratio>    图片比例，默认 4:3");
  console.error("  --reference <path-or-url> 参考图（本地路径自动上传，可重复，最多 10）");
  console.error("  --session-id <id>         会话 ID，迭代调整时传入");
  console.error("  --nowait <true|false>     false(默认)=同步轮询；true=异步返回 taskId");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    script: null,
    count: null,
    aspectRatio: null,
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
    } else if (arg === "--script" && i + 1 < args.length) {
      parsed.script = args[++i];
    } else if (arg === "--count" && i + 1 < args.length) {
      parsed.count = Number(args[++i]);
    } else if (arg === "--aspect-ratio" && i + 1 < args.length) {
      parsed.aspectRatio = args[++i];
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
  const { script, count, aspectRatio, reference, sessionId, nowait } = parseArgs();

  initConfig();

  if (!config.apiKey) {
    fail("SURGEPIX_API_KEY not found. Set it in .env or run surgepix-setup skill.");
  }
  if (!config.baseUrl) {
    fail("SURGEPIX_BASE_URL not found. Set it in .env or the shell (see surgepix-setup skill).");
  }

  if (!script) {
    fail("缺少必填参数: --script");
  }
  if (count != null && (!Number.isInteger(count) || count < 1 || count > 12)) {
    fail(`--count 非法: ${count}；合法范围为整数 1–12`);
  }
  if (reference.length > MAX_REFERENCES) {
    fail(`--reference 最多 ${MAX_REFERENCES} 张，当前 ${reference.length}`);
  }

  try {
    const resolvedRefs = [];
    for (const ref of reference) {
      resolvedRefs.push(await resolveReference(ref));
    }

    const data = await generateStoryboard({
      script,
      count,
      aspectRatio,
      reference: resolvedRefs,
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

export { generateStoryboard, pollUntilDone, resolveReference };
