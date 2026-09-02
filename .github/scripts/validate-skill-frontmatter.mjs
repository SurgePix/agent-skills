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

const EXPECTED_SKILL_COUNT = 15;
