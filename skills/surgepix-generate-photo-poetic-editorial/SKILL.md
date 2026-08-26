---
name: surgepix-generate-photo-poetic-editorial
description: >-
  Restyle 1–5 reference photos into minimalist poetic editorial illustrations via SurgePix (server-locked style). Use when the user wants 极简诗意编辑插画, 极简抽象插画, 视觉记忆面板, 极简档案海报, 摄影诗意编辑, or "poetic editorial". Language: write --prompt in the user's conversation language. Output rule: show ONLY the download URL from script stdout verbatim in a code block; NEVER fabricate or retype URLs. Local reference paths are uploaded first — API accepts URLs only. Do NOT use for general image edit (surgepix-image-edit), cinematic restaging (surgepix-generate-restaged-cinematic), or topic-based article illustrations (surgepix-generate-illustrations). If the user only says 把照片做成插画 without style, ask first.
---

# SurgePix Generate Photo Poetic Editorial

Turn **1–5 reference photos** into a **minimalist poetic editorial** illustration. Style is locked by the server; `--prompt` only adds content, composition, or on-image text. Local reference paths are uploaded automatically (backend accepts HTTPS URLs only).

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
| 极简诗意 / 极简抽象 / 视觉记忆面板 / 摄影诗意编辑 | **surgepix-generate-restaged-cinematic** for 超现实 / 电影化舞台 / 色场 |
| Reference photos must be restyled into locked poetic editorial | **surgepix-image-edit** for general 改图/重绘 without a locked style |
| Photo → illustration | **surgepix-generate-illustrations** for 公众号/博客 topic 配图 (no required photo) |

**Ambiguous input:** If the user only says「把这张照片做成插画」without style, ask:
> 是要 **极简诗意编辑**、**超现实电影化重构**，还是 **通用改图**？

## When to use

- User says "极简诗意编辑插画", "极简抽象", "视觉记忆面板", "极简档案海报", "摄影诗意编辑", "poetic editorial"
- User provides 1–5 photos and wants them restyled into a quiet, minimal editorial illustration

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` configured (see **surgepix-setup**)

---

## What the Skill Does

| Action | Description |
|--------|-------------|
| Generate poetic editorial | Restyle reference photos with a **server-locked** poetic style |
| Upload references | Local `--reference` paths are uploaded automatically (API accepts URLs only) |
| Check task status | With `--nowait true`, resolve via **surgepix-query-task** |
| Download result | Return the `download` URL (single PNG) |

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

Script path: `<skills-dir>/surgepix-generate-photo-poetic-editorial/scripts/generate_photo_poetic_editorial.mjs`.

---

## Usage Examples

**Local reference (sync):**
```bash
node "<skills-dir>/surgepix-generate-photo-poetic-editorial/scripts/generate_photo_poetic_editorial.mjs" \
  --reference ./photo.png \
  --prompt "保留两人的站位，把季节改成冬天" \
  --size 1024x1024
# {"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"<DOWNLOAD_URL>"}
# `<DOWNLOAD_URL>` 仅为文档占位；真实 HTTPS 下载地址以脚本 stdout 为准。
```

**Remote URL reference:**
```bash
node "<skills-dir>/surgepix-generate-photo-poetic-editorial/scripts/generate_photo_poetic_editorial.mjs" \
  --reference <IMAGE_URL> \
  --prompt "Keep the two figures, change the season to winter" \
  --size 1024x1024
```

**Async:**
```bash
node "<skills-dir>/surgepix-generate-photo-poetic-editorial/scripts/generate_photo_poetic_editorial.mjs" \
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

- **Required:** 1–5 `--reference` (local path or URL; repeatable). More than 5 is rejected client-side (no silent truncate).
- **Required:** content/composition supplement → `--prompt` (match user language). **Do not** try to override the locked poetic style in the prompt.
- **Required:** output size → `--size WxH` (maps to API `[width, height]`). If the user omitted size, use **`1024x1024`**.
- **Optional:** `--session-id`, `--nowait`

### Step 2: Run

```bash
node "<skills-dir>/surgepix-generate-photo-poetic-editorial/scripts/generate_photo_poetic_editorial.mjs" \
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
- Final pixel size may differ slightly after server snap; present the image as returned

---

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--prompt` | Yes | — | Content / composition only; cannot override server-locked poetic style |
| `--size` | Yes | — | Target size as `WxH` (e.g. `1024x1024`) → API `[width, height]`. Suggest `1024x1024` if user omitted it |
| `--reference` | Yes (1–5) | — | Reference image path or URL (repeatable; local path auto-uploaded) |
| `--session-id` | No | auto | Reuse session on iteration |
| `--nowait` | No | `false` | `true` = return `taskId` only |

---

## Notes

- Backend accepts **URL-only** references; **never** pass local paths in the API body — the script uploads them.
- Calls `POST /tasks/generate-photo-poetic-editorial` (backend task API), not `/skills/*`.
- `--prompt` is a content/composition supplement. The poetic editorial look is locked server-side.
- `--reference` count must be 1–5; extra images are rejected, not truncated.
- Result is a **single PNG** (not a ZIP).
- Download links may expire; tell the user to save promptly.
- On missing env → **surgepix-setup**, do not collect secrets in chat.
