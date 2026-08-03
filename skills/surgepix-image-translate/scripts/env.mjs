/**
 * Shared SurgePix environment loader.
 *
 * Portable across Claude Code, Codex, Cursor, Gemini CLI, OpenClaw, etc.
 * Primary config: .env (works everywhere)
 * Optional fallbacks: platform-specific settings files
 *
 * SURGEPIX_BASE_URL must be set by the user/agent in .env or the shell.
 * This module does not hardcode or auto-write a default API host.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

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
