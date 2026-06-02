#!/usr/bin/env node
/**
 * SurgePix query task CLI
 *
 * GET /tasks/{taskId} — query status or poll until done
 *
 * Usage:
 *   node query_task.mjs <taskId>              # single query
 *   node query_task.mjs <taskId> --poll       # poll until succeeded/failed
 *   node query_task.mjs <taskId> --poll --interval 3 --timeout 600
 */

import { fileURLToPath } from "node:url";
import { loadConfig } from "../../surgepix-setup/scripts/env.mjs";

// ============================================================
// Constants
// ============================================================

const DEFAULT_POLL_INTERVAL_SEC = 2;
const DEFAULT_POLL_TIMEOUT_SEC = 300;
const DEFAULT_USER_AGENT =
  process.env.SURGEPIX_USER_AGENT ??
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ============================================================
// HTTP
// ============================================================

function buildHeaders(apiKey) {
  const headers = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (apiKey) {
    headers.Authorization = apiKey;
  }
  return headers;
}

async function getTask(config, taskId) {
  const url = `${config.baseUrl}/tasks/${taskId}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: buildHeaders(config.apiKey),
    signal: AbortSignal.timeout(120_000),
  });

  const payload = await resp.json();

  if (payload.code === 404) {
    throw new Error(`Task not found: ${taskId}`);
  }
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${JSON.stringify(payload)}`);
  }
  if (payload.code !== 0) {
    throw new Error(`API error: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

// ============================================================
// Poll
// ============================================================

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollUntilDone(config, taskId, { intervalSec, timeoutSec }) {
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    const data = await getTask(config, taskId);
    const progress = data.progress;
    console.error(`[poll] taskId=${taskId} progress=${progress}`);
    if (progress === "succeeded" || progress === "failed") {
      return data;
    }
    await sleep(intervalSec * 1000);
  }
  throw new Error(`Poll timeout (${timeoutSec}s): taskId=${taskId}`);
}

// ============================================================
// Output
// ============================================================

function formatResult(data) {
  return {
    ok: true,
    taskId: data.taskId,
    sessionId: data.sessionId,
    progress: data.progress,
    download: data.taskResult?.download ?? null,
    taskResult: data.taskResult ?? null,
  };
}

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exit(1);
}

// ============================================================
// CLI
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    taskId: null,
    poll: false,
    intervalSec: DEFAULT_POLL_INTERVAL_SEC,
    timeoutSec: DEFAULT_POLL_TIMEOUT_SEC,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--poll") {
      parsed.poll = true;
    } else if (args[i] === "--interval" && i + 1 < args.length) {
      parsed.intervalSec = Number(args[++i]);
    } else if (args[i] === "--timeout" && i + 1 < args.length) {
      parsed.timeoutSec = Number(args[++i]);
    } else if (args[i] === "-h" || args[i] === "--help") {
      console.error("Usage: node query_task.mjs <taskId> [--poll] [--interval <sec>] [--timeout <sec>]");
      console.error("");
      console.error("  <taskId>            Task ID from async API (e.g. task_abc123)");
      console.error("  --poll              Poll until progress is succeeded or failed");
      console.error("  --interval <sec>    Poll interval (default 2)");
      console.error("  --timeout <sec>     Poll timeout (default 300)");
      process.exit(0);
    } else if (!parsed.taskId) {
      parsed.taskId = args[i];
    }
  }
  return parsed;
}

async function main() {
  const config = loadConfig();
  if (!config.apiKey) {
    fail("SURGEPIX_API_KEY not found. Create .env or run surgepix-setup skill.");
  }

  const { taskId, poll, intervalSec, timeoutSec } = parseArgs();
  if (!taskId) {
    fail("Missing taskId. Usage: node query_task.mjs <taskId> [--poll]");
  }

  try {
    const data = poll
      ? await pollUntilDone(config, taskId, { intervalSec, timeoutSec })
      : await getTask(config, taskId);

    console.log(JSON.stringify(formatResult(data)));
    if (poll && data.progress !== "succeeded") {
      process.exit(1);
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}

export { getTask, pollUntilDone, formatResult };
