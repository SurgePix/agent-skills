---
name: surgepix-generate-photo-poetic-editorial
description: >-
  Restyle 1–5 reference photos into minimalist poetic editorial illustrations via SurgePix (server-locked style). Prefer this over surgepix-image-edit when the user says 极简诗意风格, 极简线条, 诗意风格, 改成极简诗意, 帮我把这张图改成极简诗意风格, 极简诗意编辑插画, 极简抽象插画, 视觉记忆面板, 极简档案海报, 摄影诗意编辑, or "poetic editorial". Language: write --prompt in the user's conversation language. Output rule: show ONLY the download URL from script stdout verbatim in a code block; NEVER fabricate or retype URLs. Local reference paths are uploaded first — API accepts URLs only. Do NOT use for general image edit (surgepix-image-edit), cinematic restaging (surgepix-generate-restaged-cinematic), or topic-based article illustrations (surgepix-generate-illustrations). If the user only says 把照片做成插画 without naming 诗意/超现实, ask first. 「极简诗意风格」is an explicit style — call this skill, do not ask and do not use image-edit.
---

# SurgePix Generate Photo Poetic Editorial

Turn **1–5 reference photos** into a **minimalist poetic editorial** illustration — a small geometric line poster on large beige negative space, not a risograph silhouette print. Style is locked by the server; `--prompt` supplies the **scene-specific line reduction**. The script prepends a fixed line-poster floor. Local reference paths are uploaded automatically (backend accepts HTTPS URLs only).

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

`--prompt` is the **line reduction into a geometric editorial poster**, not a vintage print of the photo.

When the user only says「改成极简诗意」/「极简线条」and gives a photo, **look at the photo** and write which shapes remain. Do **not** pass that sentence through unchanged.

**Required recipe (all of these):**

1. Large **beige / cream canvas**. The graphic is small and centered (or floating), with lots of negative space.
2. Objects become **flat geometry**: balloons = unpatterned solid circles; building = faint windowless blocks; people = tiny dots/blobs.
3. **Line work = one clean horizontal** for a bridge/rail (sparse notches OK). That single line is the 线条感.
4. Optional: a row of 3–4 **color chips** + two lines of tiny serif caption.
5. Strictly flat. No grain.

**Forbidden (this is 图2 — wrong):**

- Risograph / ukiyo-e / screen-print grain, cream-matted landscape
- Full navy silhouettes, photographer pose, dense vertical railing
- Character/striped balloons, building window grid, sky filling the frame

**Worked example** — photo: balloon cluster on a bridge, people, a building:

```
大面积米色留白，图形偏小居中。气球是几个叠在一起的纯色圆，不要笑脸和条纹。桥只画一条细横线，人是线上几个小色点。楼是浅淡无窗矩形。右上放一排小色卡，左下两行小衬线标题。平涂，不要纸纹，不要全身剪影，不要套色印刷。
```

If the user already describes the reduction, use their wording and still cover the recipe slots they omitted. Do **not** try to override the locked poetic style (no “换成超现实/水彩”). The script prepends a line-poster floor — do not duplicate `【线条方向】` / `[Line direction]`.

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
  --prompt "米色大留白；气球纯色圆无图案；一条细横线加人是小色点；楼是浅淡无窗块；小色卡加小衬线标题；不要剪影印刷" \
  --size 1024x1024
# {"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"<DOWNLOAD_URL>"}
# `<DOWNLOAD_URL>` 仅为文档占位；真实 HTTPS 下载地址以脚本 stdout 为准。
```

**Remote URL reference:**
```bash
node "<skills-dir>/surgepix-generate-photo-poetic-editorial/scripts/generate_photo_poetic_editorial.mjs" \
  --reference <IMAGE_URL> \
  --prompt "Large beige negative space; balloons as unpatterned solid circles; one thin rail line with dot people; faint windowless blocks; color chips and tiny serif caption; no silhouette print" \
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
- **Required:** scene-specific line reduction → `--prompt` (match user language; follow **How to write `--prompt`**). **Do not** pass only「极简诗意」. **Do not** try to override the locked poetic style.
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
| `--prompt` | Yes | — | Scene-specific geometric line poster (circles + one rail line + dot people + beige negative space). Script prepends a line-poster floor. Cannot override server-locked poetic style |
| `--size` | Yes | — | Target size as `WxH` (e.g. `1024x1024`) → API `[width, height]`. Suggest `1024x1024` if user omitted it |
| `--reference` | Yes (1–5) | — | Reference image path or URL (repeatable; local path auto-uploaded) |
| `--session-id` | No | auto | Reuse session on iteration |
| `--nowait` | No | `false` | `true` = return `taskId` only |

---

## Notes

- Backend accepts **URL-only** references; **never** pass local paths in the API body — the script uploads them.
- Calls `POST /tasks/generate-photo-poetic-editorial` (backend task API), not `/skills/*`.
- `--prompt` is the scene-specific line reduction. The poetic look is locked server-side; the script prepends a line-poster floor so a thin slogan does not collapse into a risograph silhouette print.
- `--reference` count must be 1–5; extra images are rejected, not truncated.
- Result is a **single PNG** (not a ZIP).
- Download links may expire; tell the user to save promptly.
- On missing env → **surgepix-setup**, do not collect secrets in chat.
