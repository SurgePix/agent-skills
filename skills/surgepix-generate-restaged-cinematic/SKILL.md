---
name: surgepix-generate-restaged-cinematic
description: >-
  Restyle 1–5 reference photos into controlled surreal cinematic stage illustrations via SurgePix (server-locked style). Prefer this over surgepix-image-edit when the user says 超现实主义风格, 超现实主义, surrealism, 改成超现实, 帮我把这张图改成超现实主义风格, 超现实重构电影化插图, 受控超现实舞台, 前卫电影感, 抽象几何色场, 大型色块构成, or "restaged cinematic". Language: write --prompt in the user's conversation language. Output rule: show ONLY the download URL from script stdout verbatim in a code block; NEVER fabricate or retype URLs. Local reference paths are uploaded first — API accepts URLs only. Do NOT use for general image edit (surgepix-image-edit), poetic editorial (surgepix-generate-photo-poetic-editorial), or topic-based article illustrations (surgepix-generate-illustrations). If the user only says 把照片做成插画 without naming 超现实/诗意, ask first. 「超现实主义风格」is an explicit style — call this skill, do not ask and do not use image-edit.
---

# SurgePix Generate Restaged Cinematic

Turn **1–5 reference photos** into a **controlled surreal cinematic stage** illustration — conceptual restaging, not a simplified photo. Style is locked by the server; `--prompt` supplies the **scene-specific artistic restage**. The script prepends a fixed artistic floor. Local reference paths are uploaded automatically (backend accepts HTTPS URLs only).

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
| 超现实主义风格 / 超现实主义 / surrealism / 改成超现实 / 超现实重构 / 电影化舞台 / 前卫电影感 / 抽象几何 / 大型色场 | **surgepix-generate-photo-poetic-editorial** for 极简诗意 / 视觉记忆面板 |
| Reference photos restyled into locked cinematic / surreal look | **surgepix-image-edit** for general 改图/重绘 **without** 超现实 or 极简诗意 |
| Photo → illustration | **surgepix-generate-illustrations** for 公众号/博客 topic 配图 (no required photo) |

**Explicit style — do not ask:** 「帮我把这张图改成超现实主义风格」→ use **this skill immediately** (not image-edit).

**Ambiguous input:** If the user only says「把这张照片做成插画」**without** 超现实 / 诗意 / 电影化, ask:
> 是要 **极简诗意编辑**、**超现实电影化重构**，还是 **通用改图**？

## When to use

- User says "超现实主义风格", "超现实主义", "surrealism", "改成超现实", "帮我把这张图改成超现实主义风格", "超现实重构电影化插图", "受控超现实舞台", "前卫电影感", "抽象几何", "大型色场", "restaged cinematic"
- User provides 1–5 photos and wants them restaged as a cinematic / surreal / color-field composition

## How to write `--prompt`

`--prompt` is the **scene restage**, not a style slogan and not “keep the photo, flatten the background”.

When the user only says「改成超现实主义风格」and gives a photo, **look at the photo** and write a concrete restage. Do **not** pass that sentence through unchanged.

**Required recipe (all of these):**

1. Keep the subject’s recognizable identity and signature colors (face/hat, a red car, etc.).
2. Rewrite one everyday prop or action as a **visual metaphor** (labor tool → giant paint roller painting the ground the same color as the wall).
3. Rebuild the set as **large saturated geometric color fields**: a solid wall + one high-contrast slit / portal / block. Strip realistic architecture and street clutter.
4. Add **at least one surreal device**: oversized silhouette, scale shift, glowing doorway, object-as-paint-tool.
5. Specify hard theatrical light, clean ground, primary-color contrast, graphic / stage composition.

**Forbidden (this is the usual failure):**

- 「把背景改成纯色墙，人和车原样保留」
- 「主体改成侧身站在巨大色块前」
- Passing only「超现实主义风格」/ “make it surreal”

**Worked example** — street photo: man in a hat pulling a cart of buckets, red sedan, blue building:

```
保留戴帽男子与红色轿车的身份。把拉货改写成他拖着巨型蓝色滚筒刷，地面被涂成与墙同色的宽色带。背景改成整面饱和群青几何墙，墙上开一条高瘦发光的红色门缝，红车停在门缝前。右侧投下比人巨大的戴帽剪影。戏剧硬光、原色对比、概念舞台。不要写实街道，不要只把背景涂平。
```

If the user already describes the restage, use their wording and still cover the recipe slots they omitted. Do **not** try to override the locked cinematic style (no “换成水彩/像素风”). The script prepends an artistic floor — do not duplicate `【重构方向】` / `[Restage direction]`.

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` configured (see **surgepix-setup**)

---

## What the Skill Does

| Action | Description |
|--------|-------------|
| Generate cinematic restage | Restyle reference photos with a **server-locked** cinematic stage style |
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

Script path: `<skills-dir>/surgepix-generate-restaged-cinematic/scripts/generate_restaged_cinematic.mjs`.

---

## Usage Examples

**Local reference (sync):**
```bash
node "<skills-dir>/surgepix-generate-restaged-cinematic/scripts/generate_restaged_cinematic.mjs" \
  --reference ./photo.png \
  --prompt "保留戴帽男子与红车；拉货改成巨型滚筒刷涂地面；群青几何墙开一条发光红门缝；巨大剪影；不要只把背景涂平" \
  --size 1536x1024
# {"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"<DOWNLOAD_URL>"}
# `<DOWNLOAD_URL>` 仅为文档占位；真实 HTTPS 下载地址以脚本 stdout 为准。
```

**Remote URL reference:**
```bash
node "<skills-dir>/surgepix-generate-restaged-cinematic/scripts/generate_restaged_cinematic.mjs" \
  --reference <IMAGE_URL> \
  --prompt "Keep the hatted man and red car; rewrite the cart as a giant roller painting the ground; ultramarine wall with a glowing red slit; oversized silhouette; do not flatten the backdrop" \
  --size 1536x1024
```

**Async:**
```bash
node "<skills-dir>/surgepix-generate-restaged-cinematic/scripts/generate_restaged_cinematic.mjs" \
  --reference ./photo.png \
  --prompt "..." \
  --size 1536x1024 \
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
- **Required:** scene-specific artistic restage → `--prompt` (match user language; follow **How to write `--prompt`**). **Do not** pass only「超现实主义风格」. **Do not** try to override the locked cinematic style.
- **Required:** output size → `--size WxH` (maps to API `[width, height]`). If the user omitted size, use **`1536x1024`**.
- **Optional:** `--session-id`, `--nowait`

### Step 2: Run

```bash
node "<skills-dir>/surgepix-generate-restaged-cinematic/scripts/generate_restaged_cinematic.mjs" \
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
| `--prompt` | Yes | — | Scene-specific conceptual restage (identity + metaphor + color-field set + one surreal device). Script prepends an artistic floor. Cannot override server-locked cinematic style |
| `--size` | Yes | — | Target size as `WxH` (e.g. `1536x1024`) → API `[width, height]`. Suggest `1536x1024` if user omitted it |
| `--reference` | Yes (1–5) | — | Reference image path or URL (repeatable; local path auto-uploaded) |
| `--session-id` | No | auto | Reuse session on iteration |
| `--nowait` | No | `false` | `true` = return `taskId` only |

---

## Notes

- Backend accepts **URL-only** references; **never** pass local paths in the API body — the script uploads them.
- Calls `POST /tasks/generate-restaged-cinematic` (backend task API), not `/skills/*`.
- `--prompt` is the scene-specific conceptual restage. The cinematic look is locked server-side; the script still prepends an artistic floor so a thin user slogan does not collapse into “flat wall + original poses”.
- `--reference` count must be 1–5; extra images are rejected, not truncated.
- Result is a **single PNG** (not a ZIP).
- Download links may expire; tell the user to save promptly.
- On missing env → **surgepix-setup**, do not collect secrets in chat.
