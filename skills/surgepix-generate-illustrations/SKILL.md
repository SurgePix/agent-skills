---
name: surgepix-generate-illustrations
description: >-
  Generate 16:9 horizontal article illustrations (1536×864, hand-drawn style) via SurgePix for blogs, WeChat Official Account articles, and tweets. Use when the user wants 文章配图, 公众号配图, 博客插图, 推文配图, or horizontal editorial illustrations. Language: match user's conversation language for on-image text (English prompt → English labels; 中文 → 中文). Output rule: API returns only ONE download URL — single image = image URL; multiple images = ZIP URL (resultType zip). When ZIP, show ONLY that download link; NEVER fabricate per-image URLs. Do NOT use for 小红书/RED/竖版套图 — use surgepix-generate-xhs. If the user only says 配图 without platform, ask first.
---

# SurgePix Generate Illustrations

Generate **16:9 horizontal** article illustrations (hand-drawn style, fixed 1536×864) from a topic or per-shot specifications, and get a download URL.

## Language consistency

Match the **user's conversation language** for on-image handwritten labels and all text parameters — unless the user explicitly requests another language.

| User writes in | Action |
|----------------|--------|
| English | Write `--topic`, shot `theme` / `labels` / `coreIdea` in English; add to topic: `All on-image handwritten labels and text must be in English` |
| 中文 | Write text parameters in Chinese; add: `所有图片上的手写标注和文字必须使用中文` |
| 日本語 | Write text parameters in Japanese; add: `画像内の手書きラベルと文字はすべて日本語` |

- This skill has **no `--language` flag** — language is controlled entirely via `--topic`, `--shots`, and shot `labels`.
- **Do not default to Chinese labels** when the user prompts in English.
- Reply to the user in the same language they used in their request.

## Skill router (read first)

| Use this skill | Use **surgepix-generate-xhs** instead |
|----------------|---------------------------------------|
| 公众号 / 博客 / 推文 / 文章 | 小红书 / RED / 笔记 / 套图 |
| 16:9 horizontal editorial illustrations | Vertical carousel (cover + content pages) |
| Hand-drawn style with handwritten annotations | Social post image set (modern/vintage/bold presets) |

**Do NOT use this skill when:**
- User wants 小红书套图, 小红书笔记图, 竖版轮播, or RED post images
- User explicitly mentions 小红书, RED, 笔记, or vertical social carousel

**Ambiguous input:** If the user only says「配图」「做几张图」without platform or aspect ratio, ask:
> 是要 **小红书竖版套图**（笔记轮播），还是 **公众号/博客横版插图**（16:9）？

## When to use

- User says "文章配图", "博客插图", "公众号配图", "推文配图", "generate illustrations", "make article images"
- User wants **horizontal (16:9)** illustrations for blog posts, WeChat Official Account articles, tweets, or other editorial content
- User provides a topic/article summary or detailed per-shot specifications
- User says「生成配图」**and** context indicates 公众号/博客/文章/横版 (not 小红书/笔记/竖版)

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` configured (see Step 0)

---

## What the Skill Does

| Action                    | Description                                                              |
|---------------------------|--------------------------------------------------------------------------|
| Generate illustrations    | Create 16:9 horizontal illustrations from topic or per-shot specs        |
| Upload reference image    | Upload a style reference image to calibrate the illustration style       |
| Check task status         | Poll a generation task by `taskId` to check progress                     |
| Download result           | Retrieve the download URL (single image URL or ZIP for multiple)         |
> The script **always submits the task asynchronously** (the API returns a `taskId` immediately). The `--nowait` flag controls what the script does next:
> - `--nowait false` (default) — the script polls internally until the task is `succeeded`/`failed` and returns the final `download` URL in one call.
> - `--nowait true` — the script returns the `taskId` immediately without waiting; resolve it later with the **surgepix-query-task** skill.

---

## Setup

**Requirement:** Set the `SURGEPIX_API_KEY` environment variable.
Get your API Key at your platform's API management page.

```bash
export SURGEPIX_API_KEY=your-api-key-here
```

This skill uses the script at `<skills-dir>/surgepix-generate-illustrations/scripts/generate_illustrations.mjs`.

---

## Usage Examples

**Auto-generate by topic (simplest mode):**
```bash
node "<skills-dir>/surgepix-generate-illustrations/scripts/generate_illustrations.mjs" \
  --topic "内容生产闭环：从选题、写作到分发与复盘" \
  --count 4
# Output (JSON):
#   {"ok":true,"taskId":"task_abc123","sessionId":123,"progress":"succeeded","download":"https://...illustrations.zip","imageCount":4,"resultType":"zip","note":"API 仅返回 ZIP 下载地址，不含单张图片 URL；禁止编造单张链接"}
#   ← Save sessionId for retries
```

**Per-shot detailed specifications (inline JSON):**
```bash
node "<skills-dir>/surgepix-generate-illustrations/scripts/generate_illustrations.mjs" \
  --shots '[{"theme":"内容生产闭环","structureType":"Workflow","coreIdea":"用传送带表现选题→写作→分发→复盘","composition":"小黑站在传送带旁推纸条","elements":["传送带","纸条","四个槽口"],"labels":["选题","写作","分发","复盘"]},{"theme":"算法推荐与人工干预","structureType":"before-after","coreIdea":"对比纯算法推流与人工校准后两种状态"}]'
# Generates 2 illustrations with precise control
```

**Per-shot from file (recommended for complex specs):**
```bash
node "<skills-dir>/surgepix-generate-illustrations/scripts/generate_illustrations.mjs" \
  --shots-file ./illustration-specs.json \
  --reference ./style-ref.png
```

**Iterate with same session ID:**
```bash
node "<skills-dir>/surgepix-generate-illustrations/scripts/generate_illustrations.mjs" \
  --topic "内容生产闭环：从选题、写作到分发与复盘" \
  --count 4 \
  --session-id 123                ← Pass the sessionId from previous output (number type)
# Both versions appear in the same session on the platform frontend.
```

---

## Workflow

### Step 0: Check environment (required)

Before running, verify config:

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

- **Exit 0** → proceed to Step 1
- **Exit 1** → follow **surgepix-setup** skill to configure `.env`, then retry

### Step 1: Gather inputs

At least one of `--topic` or `--shots`/`--shots-file` must be provided.
   - **Topic** (conditionally required): article topic or body text summary. Required when `--shots` is not provided.
   - **Shots** (optional): per-shot illustration specifications as a JSON array (inline via `--shots` or from file via `--shots-file`). When provided, takes priority over `--topic`/`--count` and generates images in array order.
   - **Count** (optional, default `4`, range `1–9`): number of images to auto-generate from `--topic`. Only effective when `--shots` is not provided.
   - **Reference image** (optional): local file path or image URL for style calibration; script uploads automatically. Repeatable for multiple images. Supported formats: `JPEG`, `JPG`, `PNG`, `WEBP` — max **20MB** each.
   - **Session ID** (optional): if the user is iterating on a previous result, ask them to provide the `sessionId` (number type) printed by the last run.

#### Shot Specification Object (for `--shots` array elements):

| Field | Required | Description |
|-------|----------|-------------|
| `theme` | Yes | This image's theme |
| `structureType` | No | Structure type, e.g. `Workflow` / `before-after` / `concept metaphor` |
| `coreIdea` | No | Core message this image should convey |
| `composition` | No | Specific scene description |
| `elements` | No | Suggested visual elements (string array) |
| `labels` | No | Suggested handwritten annotation labels (string array; **use the user's language**) |

### Step 2: Run generate-illustrations

```bash
node "<skills-dir>/surgepix-generate-illustrations/scripts/generate_illustrations.mjs" \
  [--topic "<text>"] [--shots '<json>'] [--shots-file "<path>"] \
  [--count <1-9>] [--reference "<path-or-url>" ...] \
  [--session-id <id>] [--nowait <true|false>]
```

| Flag | Description |
|------|-------------|
| `--topic <text>` | Article topic or body summary (required when shots not provided) |
| `--shots <json>` | Per-shot specs as inline JSON array |
| `--shots-file <path>` | Per-shot specs from a JSON file |
| `--count <1-9>` | Auto-generate count from topic, default `4` |
| `--reference <path-or-url>` | Style reference image (local path auto-uploaded; repeatable) |
| `--session-id <id>` | Session ID; pass the `sessionId` (number type) from a previous run to iterate |
| `--nowait <true\|false>` | Wait mode, default `false` (see below) |

The request is always submitted asynchronously. `--nowait false` (default) makes the script poll internally until the task completes and returns the final `download`; `--nowait true` makes the script return the `taskId` immediately, to be resolved later via the **surgepix-query-task** skill.

### Step 3: Parse output

**Sync success** (`--nowait false`, stdout):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"https://...illustrations.zip","imageCount":4,"resultType":"zip","note":"API 仅返回 ZIP 下载地址，不含单张图片 URL；禁止编造单张链接"}
```

> **CRITICAL — 禁止编造单张图片链接**
> - API 的 `taskResult` **只有** `download` 一个字段，没有单张图片 URL 列表。
> - `resultType: "zip"`（或 `imageCount > 1`）时：**只展示 `download` ZIP 链接**，告知用户下载 ZIP 后解压获取各张图。
> - **绝对禁止**根据 `imageCount`、主题或 shots 推测并编造 `image1.png`、`image2.png` 等单张链接。
> - `resultType: "image"`（`imageCount === 1`）时：`download` 才是单张图片 URL，也只展示这一个链接。

**Async submitted** (`--nowait true`, stdout) — resolve later with the **surgepix-query-task** skill:

```json
{"ok":true,"async":true,"taskId":"task_xxx","sessionId":123,"progress":"processing","download":null,"hint":"..."}
```

**Failure** (stderr):

```json
{"ok":false,"error":"..."}
```

### Step 4: Present result

> **CRITICAL — 禁止编造单张图片链接（幻觉高发区）**
> - 脚本输出 `resultType: "zip"` 或 `imageCount > 1` 时，API **只返回一个 ZIP 的 `download` 链接**，没有单张图片 URL。
> - **只向用户展示 `download` 这一个 ZIP 链接**，说明「共 N 张图，请下载 ZIP 解压查看」。
> - **绝对禁止**编造类似「第 1 张：https://.../img1.png」「第 2 张：https://.../img2.png」的链接——这些 URL 不存在。
> - 若用户需要单张直链，只能重新以 `--count 1` 或 `--shots` 只含 1 条重新生成。

- **On success:** Show **only** the `download` URL from script output. **Always show `sessionId`** (note: it is a number type, e.g. `123`) so the user can pass it in a retry if needed.
  - `resultType: "image"` (`imageCount === 1`): `download` is a single image URL
  - `resultType: "zip"` (`imageCount > 1`): `download` is a ZIP file — **do not list per-image URLs**
   - **On failure:** Report the `error` field. Common causes:
     - Missing required parameter — neither `--topic` nor `--shots`/`--shots-file` provided
     - `--count` out of range (must be 1–9)
     - `--shots` JSON parse error
     - Reference image format not supported or exceeds 20MB
     - Generation failed — internal error; retry or simplify the topic
   - The result is automatically attached to the session (auto-created or reused). The user can open the platform frontend to see all iterations in one place.
   - If the user is not satisfied and wants to iterate, instruct them to pass `--session-id <sessionId>` (number type) in the next run — both versions appear in the same session history on the frontend.

---

## Parameters

| Parameter                | Required | Default      | Description                                                                  |
|--------------------------|----------|--------------|------------------------------------------------------------------------------|
| `--topic <text>`         | Cond.    | —            | Article topic or body summary. Required when `--shots` is not provided       |
| `--shots <json>`         | No       | —            | Per-shot specs as inline JSON array. Overrides `--topic`/`--count`           |
| `--shots-file <path>`    | No       | —            | Per-shot specs from a JSON file. Alternative to inline `--shots`             |
| `--count <1-9>`          | No       | `4`          | Auto-generate count from topic; only effective without `--shots`             |
| `--reference <path-or-url>` | No    | —            | Style reference image (local path auto-uploaded; repeatable). Supported formats: `JPEG`, `JPG`, `PNG`, `WEBP` — max **20MB** each |
| `--session-id <id>`      | No       | auto-created | Omit on first run; provide on subsequent runs to group iterations. Note: `sessionId` is a number type, not string |
| `--nowait <true\|false>` | No       | `false`      | `false` = synchronous: script polls internally and returns the final `download`. `true` = asynchronous: returns `taskId` immediately; resolve later via the **surgepix-query-task** skill |

---

## Output Format

All generated illustrations are:
- **Aspect ratio:** 16:9 horizontal
- **Resolution:** 1536×864 pixels
- **Style:** Hand-drawn illustration style with handwritten annotations in the **user's language**

---

## Rules

- This skill is for **16:9 horizontal article/editorial illustrations only** — never use it for 小红书/RED vertical套图 (use **surgepix-generate-xhs**)
- If the user only says「配图」without 小红书/公众号/博客/横版/竖版, ask which platform and aspect ratio before running
- ALWAYS run `check_env.mjs` before first use in a session
- At least one of `--topic` or `--shots`/`--shots-file` must be provided
- `--count` must be 1–9 when provided; only effective in topic mode (no `--shots`)
- When `--shots` is provided, it takes priority over `--topic` and `--count`; images are generated in array order
- The request is always submitted asynchronously; `--nowait` only controls whether the script polls locally (`false`, default) or returns the `taskId` immediately (`true`) — do not treat it as the API `noWait` field
- In async mode (`--nowait true`), guide the user/Agent to resolve the `taskId` via the **surgepix-query-task** skill
- If the user wants to iterate, they pass `--session-id 123` in the next run — both versions appear in the same session on the frontend.
- If `--session-id` is omitted, the platform auto-creates a new session for the run.
- NEVER pass local reference image paths to the API — script handles upload internally
- NEVER invent download URLs — only use the `download` value from the output
- **NEVER invent per-image URLs when `resultType` is `zip`** — the API does not return individual image links; only the ZIP `download` exists. Do not fabricate `img1.png`, `img2.png`, or numbered image URLs.
- When `resultType: "zip"`, present only the ZIP `download` link and tell the user to unzip for individual images
- NEVER echo auth tokens in logs or output
- The download URL is valid for **24 hours**; download before it expires.
- Reference image supported formats: `JPEG`, `JPG`, `PNG`, `WEBP` — max **20MB** each.
- When multiple images are generated, the download is a ZIP containing all illustrations in order.
- For complex per-shot specifications, prefer `--shots-file` over inline `--shots` to avoid shell escaping issues.
- Each shot's `theme` field is required; other fields (`structureType`, `coreIdea`, `composition`, `elements`, `labels`) are optional but recommended for precise control.
- **Language:** Write `--topic` and shot fields in the user's language; never default on-image text to Chinese when the user writes in English.
