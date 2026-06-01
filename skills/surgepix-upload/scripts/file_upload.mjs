#!/usr/bin/env node
/**
 * SurgePix chunked file upload CLI.
 *
 * Flow: chat-init → (existing file? return url) → chunk × N → chat-complete
 *
 * Usage:
 *   node file_upload.mjs <file-path>
 *
 * Env (auto-loaded if not already set):
 *   - .env in cwd or parent directories
 *   - .claude/settings.local.json (project, walking up)
 *   - ~/.claude/settings.local.json
 *
 * Keys:
 *   SURGEPIX_API_KEY    (required) Bearer token
 *   SURGEPIX_BASE_URL      (optional) default https://api-test.surgepix.ai/api
 *   SURGEPIX_UPLOAD_FOLDER (optional) default files
 */

import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { open, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_BASE_URL = "https://api-test.surgepix.ai/api";
const DEFAULT_FOLDER = "files";

/** @type {{ baseUrl: string, folder: string, apiKey: string }} */
let config = {
  baseUrl: DEFAULT_BASE_URL,
  folder: DEFAULT_FOLDER,
  apiKey: "",
};

function fail(message) {
  const payload = { ok: false, error: message };
  console.error(JSON.stringify(payload));
  process.exit(1);
}

function succeed(result) {
  console.log(JSON.stringify({ ok: true, ...result }));
}

function applyEnvVars(vars) {
  for (const [key, value] of Object.entries(vars)) {
    if (value != null && value !== "" && process.env[key] === undefined) {
      process.env[key] = String(value);
    }
  }
}

/** @param {string} content */
function parseDotEnv(content) {
  /** @type {Record<string, string>} */
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice(7).trim()
      : trimmed;
    const eq = normalized.indexOf("=");
    if (eq <= 0) continue;
    const key = normalized.slice(0, eq).trim();
    let value = normalized.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

/** @param {string} filePath */
function loadDotEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  applyEnvVars(parseDotEnv(readFileSync(filePath, "utf8")));
}

/** @param {string} filePath */
function loadClaudeSettingsFile(filePath) {
  if (!existsSync(filePath)) return;
  try {
    const data = JSON.parse(readFileSync(filePath, "utf8"));
    if (data.env && typeof data.env === "object") {
      applyEnvVars(data.env);
    }
  } catch {
    // ignore invalid settings files
  }
}

function discoverAndLoadEnv() {
  let dir = process.cwd();
  const visited = new Set();

  while (dir && !visited.has(dir)) {
    visited.add(dir);
    loadDotEnvFile(path.join(dir, ".env"));
    loadClaudeSettingsFile(path.join(dir, ".claude", "settings.local.json"));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  loadClaudeSettingsFile(path.join(homedir(), ".claude", "settings.local.json"));
}

function loadConfig() {
  discoverAndLoadEnv();
  config = {
    baseUrl: process.env.SURGEPIX_BASE_URL ?? DEFAULT_BASE_URL,
    folder: process.env.SURGEPIX_UPLOAD_FOLDER ?? DEFAULT_FOLDER,
    apiKey: process.env.SURGEPIX_API_KEY ?? "",
  };
}

const DEFAULT_USER_AGENT =
  process.env.SURGEPIX_USER_AGENT ??
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function buildHeaders() {
  const headers = {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (config.apiKey) {
    headers.authorization = `${config.apiKey}`;
  }
  return headers;
}

async function checkResponse(resp, step) {
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${step} HTTP ${resp.status}: ${text}`);
  }
  const body = await resp.json();
  if (body.code !== 0) {
    throw new Error(`${step} failed: ${JSON.stringify(body)}`);
  }
  return body.data;
}

function calculateMd5(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("md5");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

function isExistingFile(data) {
  return Boolean(data.url) && !data.uploadId;
}

function formatResult(data, existing = false) {
  return {
    url: data.url,
    filename: data.filename ?? data.fileName ?? null,
    size: data.size ?? null,
    contentType: data.contentType ?? null,
    existing,
  };
}

async function initUpload(filePath, fileMd5) {
  const fileName = path.basename(filePath);
  const params = new URLSearchParams({
    fileName,
    fileMd5,
    folder: config.folder,
  });

  const resp = await fetch(`${config.baseUrl}/upload/chat-init?${params}`, {
    method: "POST",
    headers: buildHeaders(),
  });
  const data = await checkResponse(resp, "chat-init");
  if (isExistingFile(data)) {
    console.error(
      `[Upload] existing file url=${data.url} filename=${fileName}`,
    );
  } else {
    console.error(
      `[Upload] init ok uploadId=${data.uploadId} filename=${fileName}`,
    );
  }
  return data;
}

async function uploadChunk(uploadId, partNumber, chunk) {
  const formData = new FormData();
  formData.append("uploadId", uploadId);
  formData.append("partNumber", String(partNumber));
  formData.append(
    "file",
    new Blob([chunk], { type: "application/octet-stream" }),
    `part-${partNumber}`,
  );

  const resp = await fetch(`${config.baseUrl}/upload/chunk`, {
    method: "POST",
    headers: buildHeaders(),
    body: formData,
    signal: AbortSignal.timeout(300_000),
  });
  const data = await checkResponse(resp, `chunk#${partNumber}`);
  console.error(
    `[Upload] chunk ok partNumber=${data.partNumber} etag=${data.etag ?? data.eTag}`,
  );
  return data;
}

async function completeUpload(uploadId, partEtags) {
  const params = new URLSearchParams({ uploadId });
  const resp = await fetch(`${config.baseUrl}/upload/chat-complete?${params}`, {
    method: "POST",
    headers: {
      ...buildHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(partEtags),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await checkResponse(resp, "chat-complete");
  console.error(
    `[Upload] complete ok url=${data.url} size=${data.size}`,
  );
  return data;
}

async function uploadFile(filePath) {
  const fileStat = await stat(filePath).catch(() => {
    throw new Error(`file not found: ${filePath}`);
  });
  if (!fileStat.isFile()) {
    throw new Error(`not a file: ${filePath}`);
  }

  const fileSize = fileStat.size;
  const totalParts = Math.max(1, Math.ceil(fileSize / CHUNK_SIZE));
  const fileMd5 = await calculateMd5(filePath);

  console.error(
    `[Upload] start file=${filePath} size=${fileSize} md5=${fileMd5} parts=${totalParts}`,
  );

  const t0 = performance.now();
  const partEtags = [];

  const initData = await initUpload(filePath, fileMd5);
  if (isExistingFile(initData)) {
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    console.error(`[Upload] done (existing) elapsed=${elapsed}s`);
    return formatResult(initData, true);
  }

  const uploadId = /** @type {string} */ (initData.uploadId);
  const handle = await open(filePath, "r");

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      const buffer = Buffer.alloc(CHUNK_SIZE);
      const { bytesRead } = await handle.read(buffer, 0, CHUNK_SIZE, null);
      if (bytesRead === 0) {
        break;
      }
      const chunk = buffer.subarray(0, bytesRead);
      partEtags.push(await uploadChunk(uploadId, partNumber, chunk));
    }
  } finally {
    await handle.close();
  }

  const result = await completeUpload(uploadId, partEtags);
  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
  console.error(`[Upload] done elapsed=${elapsed}s url=${result.url}`);
  return formatResult(result, false);
}

async function main() {
  loadConfig();

  const filePath = process.argv[2];

  if (!filePath || filePath === "-h" || filePath === "--help") {
    console.error("Usage: node file_upload.mjs <file-path>");
    console.error("");
    console.error("Env is auto-loaded from (first match wins, shell env takes priority):");
    console.error("  - .env in cwd or parent dirs");
    console.error("  - .claude/settings.local.json (project, walking up)");
    console.error("  - ~/.claude/settings.local.json");
    process.exit(filePath ? 0 : 1);
  }

  if (!config.apiKey) {
    fail(
      "SURGEPIX_API_KEY not found. Set it in .env or .claude/settings.local.json (env block)",
    );
  }

  const resolved = path.resolve(filePath);

  try {
    const result = await uploadFile(resolved);
    succeed(result);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}

export {
  uploadFile,
  calculateMd5,
  initUpload,
  uploadChunk,
  completeUpload,
  isExistingFile,
  loadConfig,
  discoverAndLoadEnv,
};
