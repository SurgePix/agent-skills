#!/usr/bin/env node
/**
 * Validate YAML frontmatter in every skills/<name>/SKILL.md.
 *
 * Catches the skills CLI failure mode where a plain (unquoted) scalar
 * contains ": " and YAML treats it as a nested mapping.
 *
 * Usage:
 *   node scripts/validate-skill-frontmatter.mjs
 *
 * Exit 0 on success; non-zero on any parse/validation failure.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_SKILL_COUNT = 9;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILLS_DIR = join(ROOT, "skills");

/**
 * Minimal frontmatter parser covering the subset used by SurgePix skills:
 * - `key: plain value`
 * - `key: >-` / `>` / `|` / `|-` folded/literal blocks with indented lines
 *
 * Rejects plain scalars that contain ": " (unquoted), which break strict YAML.
 *
 * @param {string} fm
 * @returns {Record<string, string>}
 */
function parseFrontmatter(fm) {
  const result = /** @type {Record<string, string>} */ ({});
  const lines = fm.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) {
      throw new Error(`invalid frontmatter line: ${JSON.stringify(line)}`);
    }

    const key = m[1];
    const rest = m[2];

    if (rest === ">" || rest === ">-" || rest === "|" || rest === "|-") {
      const block = [];
      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        if (next === "" || next.startsWith(" ") || next.startsWith("\t")) {
          block.push(next.replace(/^\t/, "  ").replace(/^  /, ""));
          i += 1;
          continue;
        }
        break;
      }
      // Folded style collapses newlines to spaces (good enough for description checks).
      result[key] = block.join(" ").replace(/\s+/g, " ").trim();
      continue;
    }

    const quoted =
      (rest.startsWith('"') && rest.endsWith('"')) ||
      (rest.startsWith("'") && rest.endsWith("'"));

    if (!quoted && /:\s/.test(rest)) {
      throw new Error(
        `${key}: plain scalar contains ": " — quote the value or use a folded block (>-)`,
      );
    }

    result[key] = quoted ? rest.slice(1, -1) : rest;
    i += 1;
  }

  return result;
}

/**
 * @param {string} text
 * @returns {string}
 */
function extractFrontmatter(text) {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) {
    throw new Error("missing opening --- frontmatter fence");
  }
  const end = text.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error("missing closing --- frontmatter fence");
  }
  return text.slice(4, end).replace(/^\r/, "");
}

function main() {
  const entries = readdirSync(SKILLS_DIR).filter((name) => {
    try {
      return statSync(join(SKILLS_DIR, name)).isDirectory();
    } catch {
      return false;
    }
  });

  const skillDirs = entries
    .filter((name) => {
      try {
        return statSync(join(SKILLS_DIR, name, "SKILL.md")).isFile();
      } catch {
        return false;
      }
    })
    .sort();

  const errors = [];

  for (const dir of skillDirs) {
    const path = join(SKILLS_DIR, dir, "SKILL.md");
    try {
      const text = readFileSync(path, "utf8");
      const fm = extractFrontmatter(text);
      const data = parseFrontmatter(fm);

      if (!data.name) {
        throw new Error("missing required field: name");
      }
      if (!data.description) {
        throw new Error("missing required field: description");
      }
      if (data.name !== dir) {
        throw new Error(
          `name "${data.name}" does not match directory "${dir}"`,
        );
      }
      if (!String(data.description).trim()) {
        throw new Error("description is empty");
      }

      console.log(`OK  ${dir}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`FAIL ${dir}: ${msg}`);
      errors.push(`${dir}: ${msg}`);
    }
  }

  if (skillDirs.length !== EXPECTED_SKILL_COUNT) {
    const msg = `expected ${EXPECTED_SKILL_COUNT} skills with SKILL.md, found ${skillDirs.length}`;
    console.error(`FAIL count: ${msg}`);
    errors.push(msg);
  }

  if (errors.length) {
    console.error(`\n${errors.length} validation error(s)`);
    process.exit(1);
  }

  console.log(`\n${skillDirs.length} skills validated`);
}

main();
