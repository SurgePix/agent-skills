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
| `surgepix-generate-logo` | "generate logo", "生成logo", "品牌logo" | Brand logo → PNG (transparent by default) |
| `surgepix-generate-storyboard` | "分镜头", "故事板", "storyboard", "分镜剧本" | Multi-shot storyboard → single PNG |
| `surgepix-image-edit` | "图片编辑", "改图", "重绘" (NOT 超现实主义风格 / 极简诗意风格) | General edit from references + prompt → PNG |
| `surgepix-generate-photo-poetic-editorial` | "极简诗意风格", "极简线条", "视觉记忆面板", "改成极简诗意", "poetic editorial" | Photo reference → **ivory abstract panel only** (no source photo in the output) PNG |
| `surgepix-generate-restaged-cinematic` | "超现实主义风格", "改成超现实", "surrealism", "超现实重构电影化插图" | Photo → locked **conceptual cinematic restage** (not flattened photo) PNG |
| `surgepix-generate-xhs` | "小红书套图", "小红书笔记图", "竖版轮播" (NOT generic「配图」) | Xiaohongshu **vertical** carousel → PNG/ZIP |
| `surgepix-generate-illustrations` | "文章配图", "公众号配图", "博客插图" (NOT 小红书/竖版) | **16:9 horizontal** article illustrations → PNG/ZIP |
| `surgepix-image-translate` | "translate image", "图片翻译", "翻译图片" | Translate on-image text → image or ZIP |
| `surgepix-ppt-translate` | "translate ppt", "翻译PPT", "PPT翻译" | Translate PPT/PPTX → translated file URL |
| `surgepix-query-task` | "check task", "poll task", "查任务" | Query/poll async task status |

> **xhs vs illustrations:** If the user only says「配图」, ask whether they need 小红书竖版套图 or 公众号/博客横版插图 before picking a skill.
>
> **Photo → illustration:** 「帮我把这张图改成超现实主义风格」→ `surgepix-generate-restaged-cinematic` (conceptual restage: metaphor + color-field set + surreal device — **not** flatten the backdrop). 「改成极简诗意风格」/「极简线条」/「视觉记忆面板」→ `surgepix-generate-photo-poetic-editorial` (**ivory abstract panel only** — **not** a photo-plus-panel diptych, **not** a full-frame restyle). If the user only says「把这张照片做成插画」without style, ask.

## Language consistency

**Match the user's conversation language** for agent replies and for all on-image / on-slide text — unless the user explicitly requests another language.

| User writes in | Skills with `--language` | Skills without `--language` |
|----------------|--------------------------|------------------------------|
| English | Pass `--language en` (xhs: `en`; presentation: `en`) | Write text params in English; add language hint to `--topic` / `--prompt` |
| 中文 | Pass `--language zh` | Write text params in Chinese |
| 日本語 | Pass `--language jp` / `ja` | Write text params in Japanese |

- **Do not default to Chinese on-image text** when the user prompts in English.
- Applies to: `generate-illustrations`, `generate-xhs`, `generate-poster`, `generate-presentation`, `generate-logo` / `generate-storyboard` / `image-edit` / `generate-photo-poetic-editorial` / `generate-restaged-cinematic` (prompt/script text), `image-translate`, `ppt-translate` (`--language` = target).

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

### skills.sh 安全扫描说明

安装 CLI 可能展示 Gen / Socket / Snyk 三列摘要，详情见 [skills.sh/SurgePix/agent-skills](https://skills.sh/SurgePix/agent-skills)：

| 列 | 含义 |
|----|------|
| **Gen** | 生成式扫描总评（本仓库一般为 Safe） |
| **Socket** | 行为/供应链启发式；对 `file_upload.mjs` 的「可上传本地文件到可配置 base URL」常标为 Anomaly |
| **Snyk** | Skill 指令与数据流风险；曾误报文档占位下载 URL 为 **E005 Critical** |

文档示例已改用无 scheme 占位符（如 `<DOWNLOAD_URL>`），避免 E005 误报。以下告警属**预期能力模型**，不是漏洞，本仓库不会为消分而删除：

- **Snyk W011**：生成/处理类 skill 会把用户 prompt 或图片 URL 交给 SurgePix API
- **Socket 上传告警**：上传与本地参考图是产品必要能力

第三方审计可能滞后于 Git 提交；推送后请重新 `npx skills add` 并打开上述详情页核对。

### Setup

**Requirement:** Set `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL`. Get your key at [surgepix.ai](https://surgepix.ai).

```bash
# 1. Configure (clone workflow — .env.example is repo-root only)
cp .env.example .env
# edit .env → set SURGEPIX_API_KEY and SURGEPIX_BASE_URL
# production example: SURGEPIX_BASE_URL=https://api.surgepix.ai/api

# After `npx skills add`, create project-root .env manually with the same two keys
# (the installer does not copy .env.example).

# 2. Verify
node skills/surgepix-setup/scripts/check_env.mjs
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

Generate a brand logo:

```bash
node skills/surgepix-generate-logo/scripts/generate_logo.mjs \
  --brand-name "NovaByte" \
  --prompt "Minimal geometric monogram"
```

Generate a storyboard from a shot script:

```bash
node skills/surgepix-generate-storyboard/scripts/generate_storyboard.mjs \
  --script "Shot 1: wide beach; Shot 2: close-up smile" \
  --count 2
```

Edit an image from a reference and instruction:

```bash
node skills/surgepix-image-edit/scripts/image_edit.mjs \
  --reference ./photo.png \
  --prompt "Replace the sky with a sunset" \
  --size 1024x1024
```

Restyle a photo into a poetic editorial illustration:

```bash
node skills/surgepix-generate-photo-poetic-editorial/scripts/generate_photo_poetic_editorial.mjs \
  --reference ./photo.png \
  --prompt "Keep the two figures, change the season to winter" \
  --size 1024x1024
```

Restyle a photo into a cinematic stage illustration:

```bash
node skills/surgepix-generate-restaged-cinematic/scripts/generate_restaged_cinematic.mjs \
  --reference ./photo.png \
  --prompt "Restage the subject beside a huge color field" \
  --size 1536x1024
```

Translate a PPTX deck:

```bash
node skills/surgepix-ppt-translate/scripts/ppt_translate.mjs \
  ./deck.pptx \
  --language Japanese
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
  surgepix-setup ── guide user to configure .env ──► check_env.mjs ──► run skill script
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SURGEPIX_API_KEY` | Yes | — | Bearer token |
| `SURGEPIX_BASE_URL` | Yes | — | API base URL (e.g. `https://api.surgepix.ai/api`) |
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
