# SurgePix Agent Skills — AI-Powered Image Processing for Agents

SurgePix is an AI image processing platform that lets you remove backgrounds, upload files, and automate image workflows — all from your AI agent or CLI.

This repository contains the official SurgePix Agent Skills for AI coding environments and agentic platforms. Works with Claude Code, Codex CLI, Cursor, Gemini CLI, OpenClaw, and any agent supporting the [SKILL.md](https://agentskills.io) standard.

## What Is SurgePix?

SurgePix provides an AI image processing API and a set of developer-facing agent skills that let autonomous agents and human developers process images programmatically.

Core capabilities:

- Remove image backgrounds → transparent PNG output
- Upload local files to cloud storage → public HTTPS URL
- Async task management with polling or synchronous wait
- Session-based iteration — refine results across multiple calls

## SurgePix Agent Skills

The SurgePix Agent Skills give AI agents (Claude, Codex, Cursor, Gemini, OpenClaw, and similar agentic systems) structured access to SurgePix's image processing API as reusable, composable skills.

### What the Skills Do

| Skill | Triggers | Description |
|-------|----------|-------------|
| `surgepix-setup` | "setup surgepix", first use | Check & configure environment |
| `surgepix-upload` | "upload", "get URL", "上传文件" | Upload local file → public HTTPS URL |
| `surgepix-remove-background` | "remove background", "抠图", "去背景" | Remove background → transparent PNG |
| `surgepix-generate-poster` | "generate poster", "生成海报" | Generate event poster → PNG |
| `surgepix-generate-presentation` | "generate ppt", "生成PPT" | Generate presentation → PPTX |
| `surgepix-generate-xhs` | "小红书套图", "小红书笔记图", "竖版轮播" (NOT generic「配图」) | Xiaohongshu **vertical** carousel → PNG/ZIP |
| `surgepix-generate-illustrations` | "文章配图", "公众号配图", "博客插图" (NOT 小红书/竖版) | **16:9 horizontal** article illustrations → PNG/ZIP |
| `surgepix-image-translate` | "translate image", "图片翻译", "翻译图片" | Translate on-image text → image or ZIP |
| `surgepix-query-task` | "check task", "poll task", "查任务" | Query/poll async task status |

> **xhs vs illustrations:** If the user only says「配图」, ask whether they need 小红书竖版套图 or 公众号/博客横版插图 before picking a skill.

> Most task-producing skills expose a `--nowait` flag. With `--nowait false` (default) the script returns the final `download` URL in one call (image-translate waits on the API; others poll internally). With `--nowait true` the API returns a `taskId` immediately, which you resolve via the `surgepix-query-task` skill.

### Install

Use `npx skills` to install (recommended):
```bash
npx skills add SurgePix/agent-skills
```

Or clone manually:

```bash
git clone https://github.com/SurgePix/agent-skills.git
cd agent-skills
```

The SurgePix Agent Skills are available on:

- **Claude Code** — `cp -r surgepix-* ~/.claude/skills/` (or project-level `.claude/skills/`)
- **Codex CLI** — `cp -r surgepix-* .agents/skills/`
- **Cursor** — `cp -r surgepix-* .cursor/skills/`
- **Gemini CLI** — `cp -r surgepix-* ~/.gemini/skills/`
- **OpenClaw** — `cp -r surgepix-* ~/.openclaw/skills/`


### Setup

**Requirement:** Set the `SURGEPIX_API_KEY` environment variable. Get your key at [surgepix.ai](https://surgepix.ai).

```bash
# 1. Configure (copy example, fill in your key)
cp .env.example .env
# edit .env → set SURGEPIX_API_KEY

# 2. Verify
node surgepix-setup/scripts/check_env.mjs
```

Optional fallbacks (scripts auto-detect): `.claude/settings.local.json`, shell `export`.

### Usage Examples

Remove background from an image:

```bash
node surgepix-remove-background/scripts/remove_background.mjs /path/to/image.png
```

Remove background (async — return taskId immediately, resolve later via query-task):

```bash
node surgepix-remove-background/scripts/remove_background.mjs /path/to/image.png --nowait true
```

Upload a file and get a public URL:

```bash
node surgepix-upload/scripts/file_upload.mjs /path/to/file.png
```

Check task status:

```bash
node surgepix-query-task/scripts/query_task.mjs task_abc123
```

## Usage Flow

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

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SURGEPIX_API_KEY` | Yes | — | Bearer token |
| `SURGEPIX_BASE_URL` | No | `https://api.surgepix.ai/api` | API base URL |
| `SURGEPIX_UPLOAD_FOLDER` | No | `files` | Upload folder |

## Why Use SurgePix for AI Agents?

| Feature | Detail |
|---------|--------|
| Output format | Transparent `.png` (background removal) |
| Input types | Local file path or remote URL |
| Supported formats | JPEG, PNG, WebP, GIF |
| Async task handling | ✅ Always async submit; script-side polling (`--nowait false`) or return `taskId` (`--nowait true`) |
| Session support | ✅ Group iterations under one session |
| NSFW detection | ✅ Automatic content safety check on upload |
| Agent Skill support | ✅ Claude Code, Codex, Cursor, Gemini, OpenClaw |
| REST API | ✅ Full API reference available |

## Common Use Cases

**E-commerce:** Batch remove backgrounds from product photos for clean catalog listings.

**Design workflows:** Let an AI agent extract subjects from images, produce transparent PNGs, and compose them into new layouts — no manual editing required.

**Content creation:** Remove backgrounds for social media graphics, thumbnails, and marketing assets on demand.

**Agentic pipelines:** Chain upload → remove-background → download in a single automated workflow, triggered by natural language.

## API & Documentation

- SurgePix API docs: [surgepix.ai/blog/developer-guides/api-keys-reference](https://surgepix.ai/blog/developer-guides/api-keys-reference)
- Agent Skills repository: [github.com/SurgePix/agent-skills](https://github.com/SurgePix/agent-skills)
- Get an API key: [surgepix.ai](https://surgepix.ai)
- Website: [surgepix.ai](https://surgepix.ai)

## Frequently Asked Questions

**What AI agents does SurgePix work with?**
Claude Code, Codex CLI, Cursor, Gemini CLI, OpenClaw, and any agent that supports the SKILL.md standard.

**How long does background removal take?**
Typically 5–15 seconds. By default (`--nowait false`) the skill handles async polling internally so you don't have to wait manually. Pass `--nowait true` to return immediately with a `taskId` and resolve it later via the `surgepix-query-task` skill.

**What file format does SurgePix output?**
Transparent `.png` files for background removal results.

**Can I iterate on a result?**
Yes. Pass the `sessionId` from your first response into subsequent calls to group iterations in a single session history.

**What happens if my image contains sensitive content?**
Uploaded images go through automatic NSFW detection. Sensitive content will be rejected with an `error.file.sensitive_content` error.

## Requirements

- Node.js >= 18
- Network access to SurgePix API

## License

MIT

---

SurgePix — AI image processing for developers, agents, and teams. [surgepix.ai](https://surgepix.ai)
