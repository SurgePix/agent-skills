---
name: surgepix-generate-xhs
description: Generate Xiaohongshu (RED) vertical carousel image sets (cover + content pages) via SurgePix. Vertical social format for 小红书/RED/笔记 — NOT 16:9 article illustrations. Use when the user explicitly wants 小红书套图, 小红书笔记图, 竖版轮播, RED post images, or mentions 小红书/RED/笔记. Do NOT use for 公众号/博客/推文/文章配图 or horizontal illustrations — use surgepix-generate-illustrations. If the user only says 配图 without platform, ask first.
---

# SurgePix Generate Xiaohongshu Images

Generate Xiaohongshu (小红书) **vertical** carousel image sets (cover + content pages) from per-page copy descriptions plus optional reference images, and get a download URL.

## Skill router (read first)

| Use this skill | Use **surgepix-generate-illustrations** instead |
|----------------|--------------------------------------------------|
| 小红书 / RED / 笔记 / 套图 / 竖版轮播 | 公众号 / 博客 / 推文 / 文章 |
| Vertical carousel (cover + pages) | 16:9 horizontal article illustrations (1536×864) |
| Social post image set, up to 16 images | Editorial hand-drawn illustrations, up to 9 images |

**Do NOT use this skill when:**
- User wants 公众号配图, 博客插图, 推文配图, or 横版/16:9 文章插图
- User did not mention 小红书/RED/笔记/竖版, and the content is for a blog or WeChat article

**Ambiguous input:** If the user only says「配图」「做几张图」without platform or aspect ratio, ask:
> 是要 **小红书竖版套图**（笔记轮播），还是 **公众号/博客横版插图**（16:9）？

## When to use

- User says "生成小红书套图", "做小红书图", "小红书笔记图", "generate xiaohongshu images", "make RED post images"
- User explicitly mentions 小红书, RED, 笔记, 竖版轮播, or vertical carousel for social posts
- User provides per-page copy and wants cover + content images in Xiaohongshu style

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` configured (see Step 0)

---

## What the Skill Does

| Action                  | Description                                                                  |
|-------------------------|------------------------------------------------------------------------------|
| Generate XHS images     | Create vertical image set (cover + content pages) from per-page copy         |
| Upload reference image  | Upload a brand logo or visual reference image to apply to the design         |
| Check task status       | Poll a generation task by `taskId` to check progress                         |
| Download result         | Retrieve the download URL (single image URL or ZIP for multiple)             |
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

This skill uses the script at `<skills-dir>/surgepix-generate-xhs/scripts/generate_xhs.mjs`.

---

## API: `prompt` is `list(string)`

The API field `prompt` is a **string array**, not a single string. Each item describes one image in the set:

| Index | Image role |
|-------|------------|
| `prompt[0]` | Cover (第 1 张封面图) |
| `prompt[1]` | Content page 1 (第 2 张内容图) |
| `prompt[N-1]` | Content page N-1 |

**Length rule:** `prompt.length` must equal `count`.
- `count=1` → 1 prompt (cover only)
- `count=4` → 4 prompts (1 cover + 3 content pages)

**CLI shortcut:** pass a single `--prompt` with `--count > 1` — the script repeats that text to fill the list (same as the API example).

---

## Usage Examples

**Single cover image:**
```bash
node "<skills-dir>/surgepix-generate-xhs/scripts/generate_xhs.mjs" \
  --prompt "春季护肤 5 个误区，很多人第一条就踩坑" \
  --count 1 \
  --style modern \
  --language zh
# API body: {"prompt":["春季护肤 5 个误区，很多人第一条就踩坑"], "count":1, ...}
# Output (JSON):
#   {"ok":true,"taskId":"task_abc123","sessionId":123,"progress":"succeeded","download":"https://..."}
#   ← Save sessionId for retries
```

**Full image set — same topic on all pages (auto-repeat):**
```bash
node "<skills-dir>/surgepix-generate-xhs/scripts/generate_xhs.mjs" \
  --prompt "零基础学 Python：7 天入门路线" \
  --count 4 \
  --style bold \
  --language zh \
  --reference ./brand-ref.png
# API body: {"prompt":["零基础学 Python：7 天入门路线", ...×4], "count":4, ...}
# Output: cover + 3 content images packaged as a ZIP
```

**Full image set — per-page copy (recommended for richer content):**
```bash
node "<skills-dir>/surgepix-generate-xhs/scripts/generate_xhs.mjs" \
  --prompt "零基础学 Python：7 天入门路线 | 封面：7天从零到能写脚本" \
  --prompt "Day 1-2：环境搭建 + 变量与类型，附推荐资源" \
  --prompt "Day 3-4：循环、函数、列表字典，3 个小练习" \
  --prompt "Day 5-7：小项目实战 + 下一步学习路线" \
  --count 4 \
  --style bold \
  --language zh
```

**Not satisfied — iterate with same session ID:**
```bash
node "<skills-dir>/surgepix-generate-xhs/scripts/generate_xhs.mjs" \
  --prompt "零基础学 Python：7 天入门路线，改为简约风格，配色用浅蓝白" \
  --count 4 \
  --style minimalist \
  --language zh \
  --session-id 123                ← Pass the sessionId from previous output (number type)
# Both versions appear in the same session on the platform frontend.
```

**With reference images (URL or local):**
```bash
node "<skills-dir>/surgepix-generate-xhs/scripts/generate_xhs.mjs" \
  --prompt "咖啡店探店 | 藏在巷子里的宝藏小店" \
  --count 6 \
  --reference ./shop-photo1.jpg --reference https://example.com/mood.png \
  --language zh
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

At least one `--prompt` is required. Repeat `--prompt` for each page when `count > 1` and pages need different copy.

| Input | Required | Notes |
|-------|----------|-------|
| **Prompt list** | Yes | API `prompt: list(string)`. CLI: repeatable `--prompt`. Index 0 = cover; 1..N-1 = content pages. Length must equal `count`. |
| **Count** | No | Default = number of `--prompt` values (or `1` if only one prompt). Range `1–16`. `1` = cover only; `N>1` = 1 cover + `(N-1)` content images. |
| **Style** | No | `modern` / `vintage` / `minimalist` / `bold`. Default `modern`. See **Preset Styles**. |
| **Language** | No | Text on images: `zh` / `en` / `jp`. |
| **Reference image** | No | Local path or URL; script uploads automatically. Repeatable. Formats: JPEG, JPG, PNG, WEBP — max **20MB** each. |
| **Session ID** | No | For iteration, pass `sessionId` (number) from the last run. Omit on first run — platform auto-creates a session. |

**Agent guidance for multi-page sets:**
1. Ask how many images the user wants (`count`).
2. If the user only gives a general topic, use one `--prompt` + `--count` (auto-repeat).
3. If the user provides an outline or per-page points, craft one `--prompt` per page (cover first, then content pages).
4. Ensure `--prompt` count matches `--count` before running (unless using the single-prompt auto-repeat shortcut).

- **Local reference image** → script uploads automatically, then calls API
- **Reference image URL** → script uses it directly

### Step 2: Run generate-xhs

```bash
node "<skills-dir>/surgepix-generate-xhs/scripts/generate_xhs.mjs" \
  --prompt "<text>" [--prompt "<text>" ...] \
  [--count <1-16>] [--style <name>] [--language <zh|en|jp>] \
  [--reference "<path-or-url>" ...] [--session-id <id>] \
  [--nowait <true|false>]
```

| Flag | Description |
|------|-------------|
| `--prompt <text>` | Per-page topic / copy (required, repeatable). Maps to API `prompt: list(string)`. |
| `--count <1-16>` | Total images; default = `--prompt` count. Must equal number of prompts (unless only 1 prompt, then auto-repeat). |
| `--style <name>` | Visual style: `modern` / `vintage` / `minimalist` / `bold` |
| `--language <code>` | Text language on images: `zh` / `en` / `jp` |
| `--reference <path-or-url>` | Reference image (local path auto-uploaded; repeatable for multiple files) |
| `--session-id <id>` | Session ID; pass the `sessionId` (number type) from a previous run to iterate |
| `--nowait <true\|false>` | Wait mode, default `false` (see below) |

The request is always submitted asynchronously. `--nowait false` (default) makes the script poll internally until the task completes and returns the final `download`; `--nowait true` makes the script return the `taskId` immediately, to be resolved later via the **surgepix-query-task** skill.

### Step 3: Parse output

**Sync success** (`--nowait false`, stdout):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"https://...images.zip"}
```

**Async submitted** (`--nowait true`, stdout) — resolve later with the **surgepix-query-task** skill:

```json
{"ok":true,"async":true,"taskId":"task_xxx","sessionId":123,"progress":"processing","download":null,"hint":"..."}
```

**Failure** (stderr):

```json
{"ok":false,"error":"..."}
```

### Step 4: Present result
   - **On success:** Show the download URL. **Always show `sessionId`** (note: it is a number type, e.g. `123`) so the user can pass it in a retry if needed.
     - If `count=1`: download URL is a single image
     - If `count>1`: download URL is a ZIP file containing all images
   - **On failure:** Report the `error` field. Common causes:
     - Missing required parameter — no `--prompt` provided
     - `--prompt` count does not match `--count` (and not using single-prompt auto-repeat)
     - `--count` out of range (must be 1–16)
     - Reference image format not supported or exceeds 20MB
     - Generation failed — internal error; retry or simplify the prompts
   - The result is automatically attached to the session (auto-created or reused). The user can open the platform frontend to see all iterations in one place.
   - If the user is not satisfied and wants to iterate, instruct them to pass `--session-id <sessionId>` (number type) in the next run — both versions appear in the same session history on the frontend.

---

## Parameters

| Parameter              | Required | Default      | Description                                                                  |
|------------------------|----------|--------------|------------------------------------------------------------------------------|
| `--prompt <text>`      | Yes      | —            | Per-page copy; repeatable. API field `prompt` is `list(string)`. Index 0 = cover. |
| `--count <1-16>`       | No       | prompt count | Total images. `1` = cover only; `N>1` = 1 cover + (N-1) content images. Must equal `--prompt` count unless only 1 prompt (auto-repeat). |
| `--style <name>`       | No       | `modern`     | Visual style: `modern` / `vintage` / `minimalist` / `bold`. See **Preset Styles** |
| `--language <code>`    | No       | —            | Language for text on images: `zh` / `en` / `jp`                              |
| `--reference <path-or-url>` | No  | —            | Reference image (local path auto-uploaded; repeatable for multiple files). Supported formats: `JPEG`, `JPG`, `PNG`, `WEBP` — max **20MB** each |
| `--session-id <id>`    | No       | auto-created | Omit on first run (platform creates a new session and returns it in stdout); provide on subsequent runs to group iterations in the same session. Note: `sessionId` is a number type, not string |
| `--nowait <true\|false>` | No     | `false`      | `false` = synchronous: script polls internally and returns the final `download`. `true` = asynchronous: returns `taskId` immediately; resolve later via the **surgepix-query-task** skill |

---

## Preset Styles

| Style | Parameter | Description | Use Cases |
|-------|-----------|-------------|-----------|
| Modern | `modern` | Clean layout, generous whitespace, modular grid, trendy color palette | Lifestyle, beauty, fashion posts |
| Vintage | `vintage` | Retro textures, film grain, muted warm tones, nostalgic typography | Travel journals, food diaries, retro-themed content |
| Minimalist | `minimalist` | Maximum whitespace, simple geometry, single accent color, refined typography | Knowledge sharing, tech tutorials, book reviews |
| Bold | `bold` | Oversized text, high contrast, dynamic composition, vibrant colors | Eye-catching covers, promotional content, trending topics |

---

## Rules

- This skill is for **小红书/RED vertical套图 only** — never use it for 公众号/博客/推文横版配图 (use **surgepix-generate-illustrations**)
- If the user only says「配图」without 小红书/公众号/博客/横版/竖版, ask which platform and aspect ratio before running
- ALWAYS run `check_env.mjs` before first use in a session
- At least one `--prompt` is required — never run the command without it
- API `prompt` is `list(string)`; script sends an array. `--prompt` count must equal `--count`, except when only 1 `--prompt` is given and `count > 1` (script auto-repeats)
- `--count` must be 1–16 when provided; `1` means cover only, `N>1` means 1 cover + (N-1) content images
- The request is always submitted asynchronously; `--nowait` only controls whether the script polls locally (`false`, default) or returns the `taskId` immediately (`true`) — do not treat it as the API `noWait` field
- In async mode (`--nowait true`), guide the user/Agent to resolve the `taskId` via the **surgepix-query-task** skill
- If the user wants to iterate, they pass `--session-id 123` in the next run — both versions appear in the same session on the frontend.
- If `--session-id` is omitted, the platform auto-creates a new session for the run.
- NEVER pass local reference image paths to the API — script handles upload internally
- NEVER invent download URLs — only use the `download` value from the output
- NEVER echo auth tokens in logs or output
- The download URL is valid for **24 hours**; download before it expires.
- Reference image supported formats: `JPEG`, `JPG`, `PNG`, `WEBP` — max **20MB** each.
- When `count > 1`, the download is a ZIP containing all images (cover first, then content images in order).
