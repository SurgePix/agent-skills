## v1.3.2: Fix skill install YAML parse errors and harden setup credentials

### Fixes
- Fix YAML frontmatter in 6 skills so `npx skills add SurgePix/agent-skills` discovers and installs all 9 skills
  - Affected: generate-illustrations, generate-poster, generate-presentation, generate-xhs, image-translate, query-task
  - Root cause: unquoted `description` scalars contained `: ` (e.g. `Language:`, `Output rule:`)
  - Fix: use folded block scalars (`description: >-`)

### Security
- Harden `surgepix-setup` to clear Snyk W007 (insecure credential handling)
  - Do not ask users to paste API keys into chat
  - Do not write user-provided keys into `.env` via agent/tool input
  - Guide users to configure `SURGEPIX_API_KEY` themselves, then verify with `check_env.mjs`
  - Remove `apiKeyPreview` from `check_env.mjs` output

### CI
- Add frontmatter validation script and GitHub Actions workflow to prevent regressions
