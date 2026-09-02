/**
 * Shared SurgePix environment loader.
 *
 * Portable across Claude Code, Codex, Cursor, Gemini CLI, OpenClaw, etc.
 * Primary config: .env (works everywhere)
 * Optional fallbacks: platform-specific settings files
 *
 * SURGEPIX_BASE_URL must be set by the user/agent in .env or the shell.
 * This module does not hardcode or auto-write a default API host.
 *
 * 发现顺序：process.cwd() 上溯 ∪ 本文件（scripts/）目录上溯；
 * 非空的 process.env 优先；空字符串视为未设置，可被 .env 填补。
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_FOLDER = "files";

/** process.env 中空串视为未设置，允许 .env 写入 */
function isEnvUnset(key) {
  const cur = process.env[key];
  return cur === undefined || cur === "";
}

/** @param {Record<string, string>} vars */
function applyEnvVars(vars) {
  for (const [key, value] of Object.entries(vars)) {
    if (value != null && value !== "" && isEnvUnset(key)) {
      process.env[key] = String(value);
    }
  }
}

/** @param {string} content */
export function parseDotEnv(content) {
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
  if (!existsSync(filePath)) return false;
  applyEnvVars(parseDotEnv(readFileSync(filePath, "utf8")));
  return true;
}

/** @param {string} filePath */
function loadJsonEnvFile(filePath) {
  if (!existsSync(filePath)) return false;
  try {
    const data = JSON.parse(readFileSync(filePath, "utf8"));
    if (data.env && typeof data.env === "object") {
      applyEnvVars(data.env);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * 从 startDir 向上查找 .env 与 .claude/settings.local.json
 * @param {string} startDir
 * @param {string[]} sources
 * @param {Set<string>} visitedDirs 已 walk 过的目录（跨起点去重）
 * @param {Set<string>} seenFiles 已记录的来源路径
 */
function walkLoadFrom(startDir, sources, visitedDirs, seenFiles) {
  let dir = startDir;
  while (dir && !visitedDirs.has(dir)) {
    visitedDirs.add(dir);
    const envPath = path.join(dir, ".env");
    if (loadDotEnvFile(envPath) && !seenFiles.has(envPath)) {
      sources.push(envPath);
      seenFiles.add(envPath);
    }
    const settingsPath = path.join(dir, ".claude", "settings.local.json");
    if (loadJsonEnvFile(settingsPath) && !seenFiles.has(settingsPath)) {
      sources.push(settingsPath);
      seenFiles.add(settingsPath);
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

/**
 * Discover and load env from multiple sources (non-empty shell env takes priority).
 * @returns {string[]} list of sources that were found
 */
export function discoverAndLoadEnv() {
  /** @type {string[]} */
  const sources = [];
  const visitedDirs = new Set();
  const seenFiles = new Set();

  // 1) 从 cwd 向上
  walkLoadFrom(process.cwd(), sources, visitedDirs, seenFiles);

  // 2) 从本 env.mjs 所在 scripts 目录向上（绝对路径调用时仍能找到项目 .env）
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  walkLoadFrom(scriptDir, sources, visitedDirs, seenFiles);

  const homeClaude = path.join(homedir(), ".claude", "settings.local.json");
  if (loadJsonEnvFile(homeClaude) && !seenFiles.has(homeClaude)) {
    sources.push(homeClaude);
    seenFiles.add(homeClaude);
  }

  if (process.env.SURGEPIX_API_KEY || process.env.SURGEPIX_BASE_URL) {
    sources.push("process.env");
  }

  return sources;
}

/** @returns {{ baseUrl: string, folder: string, apiKey: string }} */
export function loadConfig() {
  discoverAndLoadEnv();
  const baseUrl = (
    process.env.SURGEPIX_BASE_URL ??
    process.env.SURGEPIX_API_BASE ??
    ""
  )
    .trim()
    .replace(/\/$/, "");
  return {
    baseUrl,
    folder: process.env.SURGEPIX_UPLOAD_FOLDER ?? DEFAULT_FOLDER,
    apiKey: (
      process.env.SURGEPIX_API_KEY ??
      process.env.SURGEPIX_AUTH_TOKEN ??
      ""
    ).trim(),
  };
}

/**
 * Check if SurgePix is configured (API key + base URL both required).
 * @returns {{ configured: boolean, sources: string[], baseUrl: string, missing: string[] }}
 */
export function getConfigStatus() {
  const sources = discoverAndLoadEnv();
  const config = loadConfig();
  /** @type {string[]} */
  const missing = [];
  if (!config.apiKey) missing.push("SURGEPIX_API_KEY");
  if (!config.baseUrl) missing.push("SURGEPIX_BASE_URL");
  const configured = missing.length === 0;

  return { configured, sources, baseUrl: config.baseUrl, missing };
}

/**
 * Write .env file (portable config for all agents).
 * Caller must supply baseUrl — no hardcoded default.
 * @param {string} dir - directory to write .env in
 * @param {{ apiKey: string, baseUrl: string, folder?: string }} opts
 * @returns {string} path written
 */
export function writeEnvFile(dir, { apiKey, baseUrl, folder }) {
  if (!baseUrl) {
    throw new Error("writeEnvFile requires baseUrl (set SURGEPIX_BASE_URL explicitly)");
  }
  const envPath = path.join(dir, ".env");
  const lines = [
    `SURGEPIX_API_KEY=${apiKey}`,
    `SURGEPIX_BASE_URL=${baseUrl}`,
  ];
  if (folder) {
    lines.push(`SURGEPIX_UPLOAD_FOLDER=${folder}`);
  }
  writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
  return envPath;
}
