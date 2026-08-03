## v1.4.0: Self-contained skills, required BASE_URL, and CLI help fix

### Highlights

- **Single-skill installs work** — each operational skill vendors `env.mjs` (and `file_upload.mjs` when needed). Installing one skill via `npx skills add --skill <name>` no longer fails with missing sibling imports.
- **`SURGEPIX_BASE_URL` is required** — scripts no longer hardcode or auto-write a default API host. Missing base URL fails with a clear hint for the user/agent.
- **Setup without `.env.example`** — after `npx skills add`, create a project-root `.env` yourself (the installer does not ship `.env.example`). Clone workflow can still use repo-root `.env.example`.
- **`--help` without credentials** — CLIs print usage and exit 0 before checking API key / base URL.

### Breaking / behavior changes

- `SURGEPIX_BASE_URL` must be set in `.env` or the shell (example production value: `https://api.surgepix.ai/api`).
- `check_env.mjs` no longer creates or rewrites `.env` to inject a default base URL.
- Both `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` are required for `configured: true`.

### Setup example

```bash
# project root .env
SURGEPIX_API_KEY=<your-token>
SURGEPIX_BASE_URL=https://api.surgepix.ai/api

node <skills-dir>/surgepix-setup/scripts/check_env.mjs
```

### Install

```bash
npx skills add SurgePix/agent-skills
# or a single skill:
npx skills add SurgePix/agent-skills --skill surgepix-generate-poster -y --copy
```

### Commits since v1.3.2

- `47a0472` feat: add SURGEPIX_BASE_URL requirement and update documentation
- `5e65978` fix: update default base URL for SurgePix API to production endpoint
