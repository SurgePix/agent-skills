#!/usr/bin/env node
/**
 * Check if SurgePix environment is configured.
 *
 * Usage:
 *   node check_env.mjs
 *
 * Output (stdout, JSON):
 *   {"ok":true,"configured":true,"sources":[".env"],"baseUrl":"...","apiKeyPreview":"sk-abc...xyz"}
 *   {"ok":true,"configured":false,"sources":[],"hint":"Create .env with SURGEPIX_API_KEY=..."}
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
      apiKeyPreview: status.apiKeyPreview,
    }),
  );
  process.exit(0);
}

console.log(
  JSON.stringify({
    ok: true,
    configured: false,
    sources: status.sources,
    hint: "Create .env with SURGEPIX_API_KEY=your-token (see surgepix-setup skill)",
  }),
);
process.exit(1);
