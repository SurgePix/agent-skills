# SurgePix Agent Skills

Cross-platform AI agent skills for SurgePix image processing. Works with Claude Code, Codex CLI, Cursor, Gemini CLI, OpenClaw, and any agent supporting the [SKILL.md](https://agentskills.io) standard.

## Skills

| Skill | Triggers | Description |
|-------|----------|-------------|
| `surgepix-setup` | "setup surgepix", first use | Check & configure environment |
| `surgepix-upload` | "upload", "get URL" | Local file → public URL |
| `surgepix-remove-background` | "remove background" | Remove background → transparent PNG |
| `surgepix-query-task` | "check task", "poll task", "查任务" | Query/poll async task status |

**Install all skills together.** Setup must run before other skills.

## Quick Start

```bash
git clone https://github.com/SurgePix/agent-skills.git
cd agent-skills

# 1. Configure (copy example, fill in your key)
cp .env.example .env
# edit .env → set SURGEPIX_API_KEY

# 2. Verify
node surgepix-setup/scripts/check_env.mjs

# 3. Install skills to your agent (see below)
```

## Configure (portable)

All scripts load config from **`.env`** — works on every agent, no platform-specific setup required.

```bash
cp .env.example .env
# edit .env:
#   SURGEPIX_API_KEY=your-token-here
#   SURGEPIX_BASE_URL=https://api.surgepix.ai/api
```

Verify:

```bash
node surgepix-setup/scripts/check_env.mjs
# → {"ok":true,"configured":true,...}  exit 0
```

Optional fallbacks (scripts auto-detect): `.claude/settings.local.json`, shell `export`.

## Install skills

Copy all three skill folders to your agent's skills directory:

### Claude Code

```bash
cp -r surgepix-* ~/.claude/skills/
# or project-level:
cp -r surgepix-* .claude/skills/
```

### Codex CLI

```bash
cp -r surgepix-* .agents/skills/
```

### OpenClaw

```bash
cp -r surgepix-* ~/.openclaw/skills/
```

### Cursor

```bash
cp -r surgepix-* .cursor/skills/
```

### Gemini CLI / OpenClaw

```bash
cp -r surgepix-* ~/.gemini/skills/   # or ~/.openclaw/skills/
```

## Usage flow

```
User request (upload / remove-background)
        │
        ▼
  check_env.mjs ── configured? ── yes ──► run skill script
        │
        no
        ▼
  surgepix-setup ── write .env ──► check_env.mjs ──► run skill script
```

## Structure

```
surgepix-setup/
surgepix-upload/
surgepix-remove-background/
surgepix-query-task/
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SURGEPIX_API_KEY` | Yes | — | Bearer token |
| `SURGEPIX_BASE_URL` | No | `https://api.surgepix.ai/api` | API base URL |
| `SURGEPIX_UPLOAD_FOLDER` | No | `files` | Upload folder |

## Manual Test

```bash
node surgepix-setup/scripts/check_env.mjs
node surgepix-upload/scripts/file_upload.mjs /path/to/file.png
node surgepix-remove-background/scripts/remove_background.mjs /path/to/image.png
node surgepix-query-task/scripts/query_task.mjs task_abc123 --poll
```

## Requirements

- Node.js >= 18
- Network access to SurgePix API

## License

MIT
