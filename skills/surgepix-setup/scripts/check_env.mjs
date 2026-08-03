#!/usr/bin/env node
/**
 * Check if SurgePix environment is configured.
 *
 * Usage:
 *   node check_env.mjs
 *
 * Output (stdout, JSON):
 *   {"ok":true,"configured":true,"sources":[".env"],"baseUrl":"..."}
 *   {"ok":true,"configured":false,"sources":[],"missing":["SURGEPIX_API_KEY","SURGEPIX_BASE_URL"],"hint":"..."}
 *
 * Exit code: 0 if configured, 1 if not
 */

import { getConfigStatus } from "./env.mjs";

const status = getConfigStatus();

if (status.configured) {
  console.log(
    JSON.stringify({
      ok: true,
      configured: true,
      sources: status.sources,
      baseUrl: status.baseUrl,
    }),
  );
  process.exit(0);
}

console.log(
  JSON.stringify({
    ok: true,
    configured: false,
    sources: status.sources,
    missing: status.missing,
    hint:
      "Create a project-root .env with SURGEPIX_API_KEY and SURGEPIX_BASE_URL (see surgepix-setup skill). Do not paste secrets into chat.",
  }),
);
process.exit(1);
