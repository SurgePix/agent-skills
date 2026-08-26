---
name: surgepix-image-edit
description: >-
  Edit images from reference image(s) and a natural-language prompt via SurgePix. Do NOT use when the user wants 超现实主义风格 / 超现实主义 / surrealism / 改成超现实 (use surgepix-generate-restaged-cinematic) or 极简诗意风格 / 诗意风格 / 改成极简诗意 (use surgepix-generate-photo-poetic-editorial). Use when the user says "图片编辑", "改图", "重绘", "image edit", "edit this image", "把图里的…改成…", or wants general image editing from references — but "改成" plus 超现实/诗意 is a locked-style restyle, not this skill. Language: write --prompt in the user's conversation language. Output rule: show ONLY the download URL from script stdout verbatim in a code block; NEVER fabricate or retype URLs. Local reference paths are uploaded first — API accepts URLs only.
---

# SurgePix Image Edit

Edit / redraw / adjust images from **at least one** reference image plus a natural-language edit instruction. Local reference paths are uploaded automatically (backend accepts HTTPS URLs only).

## Language consistency

Match the **user's conversation language** for `--prompt` — unless the user explicitly requests another language.

| User writes in | Write `--prompt` in |
|----------------|---------------------|
| English | English |
| 中文 | 中文 |
| 日本語 | 日本語 |

- Reply to the user in the same language they used in their request.

## Skill router (read first)

| Use this skill | Use something else |
|----------------|-------------------|
| General 改图 / 重绘 / 局部调整 **without** a locked style | **surgepix-generate-restaged-cinematic** for 超现实主义风格 / surrealism / 改成超现实 |
| "把图里的天空改成黄昏" and similar object-level edits | **surgepix-generate-photo-poetic-editorial** for 极简诗意风格 / 改成极简诗意 |

**Do NOT use this skill** when the user says「帮我把这张图改成超现实主义风格」or「改成极简诗意风格」— those are locked-style restyles.

## When to use

- User says "图片编辑", "改图", "重绘", "局部调整", "image edit", "edit this image"
- User provides one or more reference images and an edit instruction **that is not** 超现实 / 极简诗意 locked style

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` configured (see **surgepix-setup**)

---

## What the Skill Does

| Action | Description |
|--------|-------------|
| Edit image | Apply natural-language edits based on reference image(s) |
| Upload references | Local `--reference` paths are uploaded automatically (API accepts URLs only) |
| Check task status | With `--nowait true`, resolve via **surgepix-query-task** |
| Download result | Return the `download` URL from task result |

> The script **always submits asynchronously** to the API (`noWait=true`). CLI `--nowait` controls local behavior:
> - `--nowait false` (default) — poll until `succeeded`/`failed` and return `download`
> - `--nowait true` — return `taskId` immediately; use **surgepix-query-task** later

---

## Setup

**Requirement:** Set `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` (see **surgepix-setup**). Do **not** ask the user to paste the API key into chat.

```bash
# project-root .env
SURGEPIX_API_KEY=your-token
SURGEPIX_BASE_URL=https://api.surgepix.ai/api
```

Script path: `<skills-dir>/surgepix-image-edit/scripts/image_edit.mjs`.

---

## Usage Examples

**Local reference (sync):**
```bash
node "<skills-dir>/surgepix-image-edit/scripts/image_edit.mjs" \
  --reference ./photo.png \
  --prompt "把天空换成黄昏色调，并加一只飞鸟" \
  --size 1024x1024
# {"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"<DOWNLOAD_URL>"}
# `<DOWNLOAD_URL>` 仅为文档占位；真实 HTTPS 下载地址以脚本 stdout 为准。
```

**Remote URL reference:**
```bash
node "<skills-dir>/surgepix-image-edit/scripts/image_edit.mjs" \
  --reference <IMAGE_URL> \
  --prompt "Make the subject wear a red jacket" \
  --size 1024x1024
```

**Async:**
```bash
node "<skills-dir>/surgepix-image-edit/scripts/image_edit.mjs" \
  --reference ./photo.png \
  --prompt "..." \
  --size 1024x1024 \
  --nowait true
# Then: node "<skills-dir>/surgepix-query-task/scripts/query_task.mjs" <taskId>
```

---

## Workflow

### Step 0: Check environment

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

- Exit 0 → continue
- Exit 1 → follow **surgepix-setup** (user writes `.env` themselves)

### Step 1: Collect inputs

- **Required:** at least one `--reference` (local path or URL)
- **Required:** edit instruction → `--prompt` (match user language)
- **Required:** output size → `--size WxH` (maps to API `[width, height]`)
- **Optional:** `--session-id`, `--nowait`

### Step 2: Run

```bash
node "<skills-dir>/surgepix-image-edit/scripts/image_edit.mjs" \
  --prompt "<text>" \
  --size <WxH> \
  --reference <path-or-url> [--reference ...] \
  [--session-id <id>] \
  [--nowait <true|false>]
```

### Step 3: Present result

- Success: paste **only** the `download` value from script stdout **verbatim** inside a fenced code block (or raw URL line). Do **not** retype the hostname; do **not** “fix” or shorten the URL.
- Always show `sessionId` (number) for retries.
- Async: show `taskId` + hint to use **surgepix-query-task**
- Never invent image URLs; never echo API keys

---

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--prompt` | Yes | — | Natural-language edit instruction |
| `--size` | Yes | — | Target size as `WxH` (e.g. `1024x1024`) → API `[width, height]` |
| `--reference` | Yes (≥1) | — | Reference image path or URL (repeatable; local path auto-uploaded) |
| `--session-id` | No | auto | Reuse session on iteration |
| `--nowait` | No | `false` | `true` = return `taskId` only |

---

## Notes

- Backend accepts **URL-only** references; **never** pass local paths in the API body — the script uploads them.
- Calls `POST /tasks/image-edit` (backend task API), not `/skills/*`.
- Download links may expire; tell the user to save promptly.
- On missing env → **surgepix-setup**, do not collect secrets in chat.
