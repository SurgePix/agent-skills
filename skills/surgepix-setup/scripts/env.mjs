/**
 * Shared SurgePix environment loader.
 *
 * Portable across Claude Code, Codex, Cursor, Gemini CLI, OpenClaw, etc.
 * Primary config: .env (works everywhere)
 * Optional fallbacks: platform-specific settings files
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export const DEFAULT_BASE_URL = "https://api.surgepix.ai/api";
export const DEFAULT_FOLDER = "files";

/** @param {Record<string, string>} vars */
function applyEnvVars(vars) {
  for (const [key, value] of Object.entries(vars)) {
    if (value != null && value !== "" && process.env[key] === undefined) {
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
 * Discover and load env from multiple sources (shell env takes priority).
 * @returns {string[]} list of sources that were found
 */
export function discoverAndLoadEnv() {
  /** @type {string[]} */
  const sources = [];

  let dir = process.cwd();
  const visited = new Set();

  while (dir && !visited.has(dir)) {
    visited.add(dir);
    if (loadDotEnvFile(path.join(dir, ".env"))) {
      sources.push(path.join(dir, ".env"));
    }
    if (loadJsonEnvFile(path.join(dir, ".claude", "settings.local.json"))) {
      sources.push(path.join(dir, ".claude/settings.local.json"));
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const homeClaude = path.join(homedir(), ".claude", "settings.local.json");
  if (loadJsonEnvFile(homeClaude)) {
    sources.push(homeClaude);
  }

  if (process.env.SURGEPIX_API_KEY) {
    sources.push("process.env");
  }

  return sources;
}

/** @returns {{ baseUrl: string, folder: string, apiKey: string }} */
export function loadConfig() {
  discoverAndLoadEnv();
  return {
    baseUrl: (
      process.env.SURGEPIX_BASE_URL ??
      process.env.SURGEPIX_API_BASE ??
      DEFAULT_BASE_URL
    ).replace(/\/$/, ""),
    folder: process.env.SURGEPIX_UPLOAD_FOLDER ?? DEFAULT_FOLDER,
    apiKey: (
      process.env.SURGEPIX_API_KEY ??
      process.env.SURGEPIX_AUTH_TOKEN ??
      ""
    ).trim(),
  };
}

/**
 * Check if SurgePix is configured.
 * @returns {{ configured: boolean, sources: string[], baseUrl: string, apiKeyPreview: string | null }}
 */
export function getConfigStatus() {
  const sources = discoverAndLoadEnv();
  const config = loadConfig();
  const configured = config.apiKey.length > 0;
  const apiKeyPreview = configured
    ? `${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}`
    : null;

  return { configured, sources, baseUrl: config.baseUrl, apiKeyPreview };
}

/**
 * Init-only helper: ensure SURGEPIX_BASE_URL exists in the user's local env.
 *
 * Called during setup/init. If the variable is already set (shell env or an
 * existing .env line), it is left untouched. Otherwise the branch default
 * (DEFAULT_BASE_URL) is written into .env so every other skill can simply read
 * SURGEPIX_BASE_URL from the environment afterwards. The base URL literal lives
 * here (the init module) only — skills never hardcode it.
 *
 * @param {string} dir - directory whose .env should hold the variable
 * @returns {{ baseUrl: string, written: boolean, envPath: string }}
 */
export function ensureBaseUrl(dir = process.cwd()) {
  discoverAndLoadEnv();

  const existing = (
    process.env.SURGEPIX_BASE_URL ??
    process.env.SURGEPIX_API_BASE ??
    ""
  ).trim();
  const envPath = path.join(dir, ".env");

  if (existing) {
    return { baseUrl: existing.replace(/\/$/, ""), written: false, envPath };
  }

  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const hasLine = /^\s*(export\s+)?SURGEPIX_BASE_URL\s*=/m.test(content);
  if (!hasLine) {
    if (content && !content.endsWith("\n")) content += "\n";
    content += `SURGEPIX_BASE_URL=${DEFAULT_BASE_URL}\n`;
    writeFileSync(envPath, content, "utf8");
  }
  process.env.SURGEPIX_BASE_URL = DEFAULT_BASE_URL;
  return { baseUrl: DEFAULT_BASE_URL, written: !hasLine, envPath };
}

/**
 * Write .env file (portable config for all agents).
 * @param {string} dir - directory to write .env in
 * @param {{ apiKey: string, baseUrl?: string, folder?: string }} opts
 * @returns {string} path written
 */
export function writeEnvFile(dir, { apiKey, baseUrl, folder }) {
  const envPath = path.join(dir, ".env");
  const lines = [
    `SURGEPIX_API_KEY=${apiKey}`,
    `SURGEPIX_BASE_URL=${baseUrl ?? DEFAULT_BASE_URL}`,
  ];
  if (folder) {
    lines.push(`SURGEPIX_UPLOAD_FOLDER=${folder}`);
  }
  writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
  return envPath;
}
