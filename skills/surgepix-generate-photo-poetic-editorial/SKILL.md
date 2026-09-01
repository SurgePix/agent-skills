---
name: surgepix-generate-photo-poetic-editorial
description: >-
  Restyle 1–5 reference photos into minimalist poetic editorial illustrations via SurgePix (server-locked style). Prefer this over surgepix-image-edit when the user says 极简诗意风格, 极简线条, 诗意风格, 改成极简诗意, 帮我把这张图改成极简诗意风格, 极简诗意编辑插画, 极简抽象插画, 视觉记忆面板, 极简档案海报, 摄影诗意编辑, or "poetic editorial". Language: write --prompt in the user's conversation language. Output rule: show ONLY the download URL from script stdout verbatim in a code block; NEVER fabricate or retype URLs. Local reference paths are uploaded first — API accepts URLs only. Do NOT use for general image edit (surgepix-image-edit), cinematic restaging (surgepix-generate-restaged-cinematic), or topic-based article illustrations (surgepix-generate-illustrations). If the user only says 把照片做成插画 without naming 诗意/超现实, ask first. 「极简诗意风格」is an explicit style — call this skill, do not ask and do not use image-edit.
---

# SurgePix Generate Photo Poetic Editorial

Turn **1–5 reference photos** into **only the ivory abstract memory panel** (small motif, poetic English title). The photo is a reference, not part of the output — no photo-on-top diptych, no full-frame restyle, no risograph print. Style is locked by the server; `--prompt` supplies **scene-specific spatial facts**. The script prepends a panel-only floor. Local reference paths are uploaded automatically (backend accepts HTTPS URLs only).

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

`--prompt` lists **spatial facts from this photo**. The output is **only the ivory abstract panel**.

**Do not put the source photo in the picture.** No upper-photo / lower-panel split.

When the user only says「改成极简诗意」/「极简线条」/「视觉记忆面板」, still run this skill. Write 3–6 facts from the photo; do **not** pass only that slogan.

**Required recipe:**

1. Say explicitly: panel only; the photograph must not appear.
2. Distill **relationships** (direction, interval, overlap, rhythm, color roles), not a miniature of the scene.
3. People = short vertical marks (head fused to body). Rail / horizon = one or two thin horizontals. Organic clusters (balloons, canopy) = overlapping soft flats, no inner patterns.
4. Ivory ground, small motif, lots of whitespace. One original English title of 2–5 words (optional short subtitle) in a restrained serif.
5. No color chips, legends, dates, logos, paper grain, ukiyo-e, or full-body silhouettes.

**Forbidden:** photo-plus-panel diptych; restyling the whole photo; risograph landscape.

**Worked example** — photo: balloon cluster on a bridge, people, a building:

```
只要象牙色抽象面板，不要原片。提炼：左侧气球团=重叠柔和色块；栏杆=一条细水平线；人群=短竖色块节奏；右侧楼=简化体量。2–5词英文衬线标题。不要拼接照片，不要套色印刷，不要色卡。
```

If the user already describes the panel, keep their wording and fill omitted slots. Do **not** try to override the locked poetic style (no “换成超现实/水彩”). The script prepends a panel-only floor — do not duplicate `【面板方向】` / `[Panel direction]`.

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
  --prompt "只要象牙色面板不要原片；气球团、细栏杆线、短竖人群、简化楼体；2-5词英文标题" \
  --size 1024x1024
# {"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"<DOWNLOAD_URL>"}
# `<DOWNLOAD_URL>` 仅为文档占位；真实 HTTPS 下载地址以脚本 stdout 为准。
```

**Remote URL reference:**
```bash
node "<skills-dir>/surgepix-generate-photo-poetic-editorial/scripts/generate_photo_poetic_editorial.mjs" \
  --reference <IMAGE_URL> \
  --prompt "Ivory panel only, no source photo; balloon cluster, one thin rail, short vertical people, simplified building mass; 2-5 word English serif title" \
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
- **Required:** scene-specific spatial facts for the panel → `--prompt` (match user language; follow **How to write `--prompt`**). **Do not** pass only「极简诗意」. **Do not** try to override the locked poetic style.
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
| `--prompt` | Yes | — | Spatial facts for the ivory panel only (source photo must not appear). Script prepends a panel-only floor. Cannot override server-locked poetic style |
| `--size` | Yes | — | Target size as `WxH` (e.g. `1024x1024`) → API `[width, height]`. Suggest `1024x1024` if user omitted it |
| `--reference` | Yes (1–5) | — | Reference image path or URL (repeatable; local path auto-uploaded) |
| `--session-id` | No | auto | Reuse session on iteration |
| `--nowait` | No | `false` | `true` = return `taskId` only |

---

## Notes

- Backend accepts **URL-only** references; **never** pass local paths in the API body — the script uploads them.
- Calls `POST /tasks/generate-photo-poetic-editorial` (backend task API), not `/skills/*`.
- `--prompt` lists spatial facts for the ivory panel. The poetic look is locked server-side; the script prepends a panel-only floor so the source photo is not composited into the result.
- `--reference` count must be 1–5; extra images are rejected, not truncated.
- Result is a **single PNG** (not a ZIP).
- Download links may expire; tell the user to save promptly.
- On missing env → **surgepix-setup**, do not collect secrets in chat.
