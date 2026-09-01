---
name: surgepix-generate-photo-poetic-editorial
description: >-
  Restyle 1–5 reference photos into minimalist poetic editorial illustrations via SurgePix (server-locked style). Prefer this over surgepix-image-edit when the user says 极简诗意风格, 极简线条, 诗意风格, 改成极简诗意, 帮我把这张图改成极简诗意风格, 极简诗意编辑插画, 极简抽象插画, 视觉记忆面板, 极简档案海报, 摄影诗意编辑, or "poetic editorial". Language: write --prompt in the user's conversation language. Output rule: show ONLY the download URL from script stdout verbatim in a code block; NEVER fabricate or retype URLs. Local reference paths are uploaded first — API accepts URLs only. Do NOT use for general image edit (surgepix-image-edit), cinematic restaging (surgepix-generate-restaged-cinematic), or topic-based article illustrations (surgepix-generate-illustrations). If the user only says 把照片做成插画 without naming 诗意/超现实, ask first. 「极简诗意风格」is an explicit style — call this skill, do not ask and do not use image-edit.
---

# SurgePix Generate Photo Poetic Editorial

Turn **1–5 reference photos** into a **minimalist poetic editorial** illustration — vintage risograph / ukiyo-e print with silhouettes and linear structure, not a blob-logo poster. Style is locked by the server; `--prompt` supplies the **scene-specific print restage**. The script prepends a fixed print-line floor. Local reference paths are uploaded automatically (backend accepts HTTPS URLs only).

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
| 极简诗意风格 / 极简线条 / 诗意风格 / 改成极简诗意 / 极简诗意 / 极简抽象 / 视觉记忆面板 / 摄影诗意编辑 | **surgepix-generate-restaged-cinematic** for 超现实主义风格 / 电影化舞台 / 色场 |
| Reference photos restyled into locked poetic editorial | **surgepix-image-edit** for general 改图/重绘 **without** 诗意 or 超现实 |
| Photo → illustration | **surgepix-generate-illustrations** for 公众号/博客 topic 配图 (no required photo) |

**Explicit style — do not ask:** 「帮我把这张图改成极简诗意风格」→ use **this skill immediately** (not image-edit).

**Ambiguous input:** If the user only says「把这张照片做成插画」**without** 诗意 / 超现实 / 电影化, ask:
> 是要 **极简诗意编辑**、**超现实电影化重构**，还是 **通用改图**？

## When to use

- User says "极简诗意风格", "极简线条", "诗意风格", "改成极简诗意", "帮我把这张图改成极简诗意风格", "极简诗意编辑插画", "极简抽象", "视觉记忆面板", "极简档案海报", "摄影诗意编辑", "poetic editorial"
- User provides 1–5 photos and wants them restyled into a quiet, minimal editorial illustration

## How to write `--prompt`

`--prompt` names **what stays as silhouette and line**, not “collapse everything into dots on cream paper”.

When the user only says「改成极简诗意」/「极简线条」and gives a photo, **look at the photo** and write the print restage. Do **not** pass that sentence through unchanged.

**Required recipe (all of these):**

1. People = **full dark silhouettes** with readable poses (holding balloons, raising a camera). Never tiny blobs.
2. **Line structure:** a railing or similar element spans the frame as a strong horizontal plus rhythmic vertical bars.
3. **Print look:** risograph / screen-print / ukiyo-e — grain, ink overlap, cream paper margin, muted limited palette. Large pale sky; scene sits in the lower third.
4. Keep the balloon cluster (simple graphic marks OK) and a simplified building (window grid OK).
5. No color-chip swatches, no English poster titles, no watercolor wash, no centered mini-icon.

**Forbidden (this is the usual failure — the blob poster):**

- People as ink dots under one thin line
- Faint windowless rectangles + four color chips + 「A Bright Interlude」
- “Balloons as solid circles, people as tiny blobs, large beige negative space, no grain”

**Worked example** — photo: balloon vendor on a bridge, people in silhouette, a building, teal sky:

```
做成套色印刷海报：深蓝剪影人物沿栏杆排开，保留举气球和举相机的姿势。栏杆是贯穿画面的水平线加有节奏的竖栏。气球保持一团并可有简单图案。右侧楼简化成带窗格的色块。浅灰蓝天空、奶油卡纸留边、纸纹颗粒。不要色卡，不要英文标题，不要把人收成色点。
```

If the user already describes the restage, use their wording and still cover the recipe slots they omitted. Do **not** try to override the locked poetic style (no “换成超现实/水彩”). The script prepends a print-line floor — do not duplicate `【线条方向】` / `[Line direction]`.

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
  --prompt "深蓝剪影沿栏杆排开，保留举气球和举相机；栏杆是横线加竖栏；气球成团；楼带简化窗格；套色印刷纸纹，不要色卡和色点人" \
  --size 1024x1024
# {"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"<DOWNLOAD_URL>"}
# `<DOWNLOAD_URL>` 仅为文档占位；真实 HTTPS 下载地址以脚本 stdout 为准。
```

**Remote URL reference:**
```bash
node "<skills-dir>/surgepix-generate-photo-poetic-editorial/scripts/generate_photo_poetic_editorial.mjs" \
  --reference <IMAGE_URL> \
  --prompt "Navy silhouettes along the rail, keep balloon-vendor and photographer poses; railing as horizontal plus vertical bars; balloon cluster; building with a simple window grid; risograph grain; no color chips or dot people" \
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
- **Required:** scene-specific print restage → `--prompt` (match user language; follow **How to write `--prompt`**). **Do not** pass only「极简诗意」. **Do not** try to override the locked poetic style.
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
| `--prompt` | Yes | — | Scene-specific print restage (silhouettes + railing line structure + risograph grain). Script prepends a print-line floor. Cannot override server-locked poetic style |
| `--size` | Yes | — | Target size as `WxH` (e.g. `1024x1024`) → API `[width, height]`. Suggest `1024x1024` if user omitted it |
| `--reference` | Yes (1–5) | — | Reference image path or URL (repeatable; local path auto-uploaded) |
| `--session-id` | No | auto | Reuse session on iteration |
| `--nowait` | No | `false` | `true` = return `taskId` only |

---

## Notes

- Backend accepts **URL-only** references; **never** pass local paths in the API body — the script uploads them.
- Calls `POST /tasks/generate-photo-poetic-editorial` (backend task API), not `/skills/*`.
- `--prompt` is the scene-specific print restage. The poetic look is locked server-side; the script prepends a print-line floor so a thin slogan does not collapse into a blob-logo poster with color chips.
- `--reference` count must be 1–5; extra images are rejected, not truncated.
- Result is a **single PNG** (not a ZIP).
- Download links may expire; tell the user to save promptly.
- On missing env → **surgepix-setup**, do not collect secrets in chat.
