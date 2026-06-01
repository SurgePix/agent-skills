# SurgePix Agent Skills

Cross-platform AI agent skills for SurgePix image processing. Works with Claude Code, Codex CLI, Cursor, Gemini CLI, OpenClaw, and any agent supporting the [SKILL.md](https://agentskills.io) standard.

## Skills

| Skill | Triggers | Description |
|-------|----------|-------------|
| `surgepix-upload` | "upload", "get URL", "上传文件" | Local file → public URL |
| `surgepix-remove-background` | "remove background", "去背景", "抠图" | Remove image background → transparent PNG |

## Install

Clone the repo, then copy skill folders to your agent's skills directory:

```bash
git clone https://github.com/SurgePix/agent-skills.git
cd agent-skills
```

### Claude Code

```bash
cp -r surgepix-upload ~/.claude/skills/
cp -r surgepix-remove-background ~/.claude/skills/
```

Or project-level:

```bash
cp -r surgepix-upload .claude/skills/
cp -r surgepix-remove-background .claude/skills/
```

### OpenAI Codex CLI

```bash
cp -r surgepix-upload .agents/skills/
cp -r surgepix-remove-background .agents/skills/
```

### Cursor

```bash
cp -r surgepix-upload .cursor/skills/
cp -r surgepix-remove-background .cursor/skills/
```

### Gemini CLI

```bash
cp -r surgepix-upload ~/.gemini/skills/
cp -r surgepix-remove-background ~/.gemini/skills/
```

### OpenClaw

```bash
cp -r surgepix-upload ~/.openclaw/skills/
cp -r surgepix-remove-background ~/.openclaw/skills/
```

## Configure

Copy the example config and fill in your token:

```bash
cp settings.local.example.json ~/.claude/settings.local.json
# Then edit and replace "your-bearer-token-here" with your actual token
```

Or set via `.env` (works with all platforms):

```
SURGEPIX_API_KEY=your-token-here
SURGEPIX_BASE_URL=https://api-test.surgepix.ai/api
```

The scripts auto-discover config from `.env` and `settings.local.json`, walking up from cwd.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SURGEPIX_API_KEY` | Yes | — | Bearer token |
| `SURGEPIX_BASE_URL` | No | `https://api-test.surgepix.ai/api` | API base URL |
| `SURGEPIX_UPLOAD_FOLDER` | No | `files` | Upload folder on server |
| `SURGEPIX_USER_AGENT` | No | Chrome UA | Custom User-Agent header |

## Structure

```
agent-skills/
├── README.md
├── settings.local.example.json
├── surgepix-upload/
│   ├── SKILL.md
│   └── scripts/
│       └── file_upload.mjs
└── surgepix-remove-background/
    ├── SKILL.md
    └── scripts/
        └── remove_background.mjs
```

## Manual Test

```bash
# Upload a file
node surgepix-upload/scripts/file_upload.mjs /path/to/file.png

# Remove background (async, polls until done)
node surgepix-remove-background/scripts/remove_background.mjs /path/to/image.png

# Remove background (sync, waits for result)
node surgepix-remove-background/scripts/remove_background.mjs "https://..." --sync
```

## Requirements

- Node.js >= 18
- Network access to SurgePix API

## License

MIT
