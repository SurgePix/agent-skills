---
name: surgepix-generate-presentation
description: Generate a PowerPoint (PPTX) presentation using the SurgePix API, returning a download URL. Use when the user says "generate ppt", "生成PPT", "做一个演示文稿", "make slides", "create a presentation", or wants slides from a topic or outline.
---

# SurgePix Generate Presentation

Generate a presentation (PPTX) from a topic prompt and/or outline documents, and get a download URL.

## When to use

- User says "生成PPT", "做个演示文稿", "generate ppt", "make slides", "create a presentation"
- User provides a topic, key points, or an outline document (local file or URL)

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` configured (see Step 0)

---

## What the Skill Does

| Action                    | Description                                                          |
|---------------------------|----------------------------------------------------------------------|
| Generate PPT              | Create a complete .pptx from text prompt, style, and other requirements |
| Upload reference document | Upload a visual reference image or outline file to apply to PPT design  |
| Check task status         | Poll a generation task by `taskId` to check progress                 |
| Download result           | Retrieve the .pptx download URL directly from the task result        |

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

This skill uses the script at `<skills-dir>/surgepix-generate-presentation/scripts/generate_presentation.mjs`.

---

## Usage Examples

**First run — prompt only, `--style` as a quick preset:**
```bash
node "<skills-dir>/surgepix-generate-presentation/scripts/generate_presentation.mjs" \
  --prompt "Q3 2026 marketing results review with data highlights, problem analysis, and next quarter suggestions" \
  --n 10 \
  --style corporate \
  --language zh
# Output (JSON):
#   {"ok":true,"taskId":"task_abc123","sessionId":123,"progress":"succeeded","download":"https://..."}
#   ← Save sessionId for retries
```

**With an outline file — detailed prompt, no `--style` needed:**
```bash
node "<skills-dir>/surgepix-generate-presentation/scripts/generate_presentation.mjs" \
  --prompt "Generate annual strategy PPT based on this outline, dark business style, highlight data charts" \
  --outline ./outline.txt \
  --n 15
```

**Not satisfied — iterate with adjusted prompt and same session ID:**
```bash
node "<skills-dir>/surgepix-generate-presentation/scripts/generate_presentation.mjs" \
  --prompt "Q3 2026 marketing results review with data highlights, problem analysis, and suggestions — change to light and minimal style, blue/white palette" \
  --n 10 \
  --language zh \
  --session-id 123                ← Pass the sessionId from previous output (number type)
# Both results appear in the same session on the platform frontend.
```

**Multiple outline files:**
```bash
node "<skills-dir>/surgepix-generate-presentation/scripts/generate_presentation.mjs" \
  --prompt "年度战略规划摘要" \
  --outline ./part1.docx --outline ./part2.pdf --outline ./appendix.md \
  --n 20
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

`--n` is required, and at least one of `--prompt` or `--outline` must also be provided.
   - **Prompt** (optional): text describing the presentation topic, purpose, and key points.
   - **Outline** (optional): local file path or document URL. Script uploads automatically.
     Supported formats: `doc`, `docx`, `pdf`, `txt`, `md`, `html`, `pptx` — max **50MB**.
   - **Slide count** (**required**, range `5–30`): use `--n` (integer)
   - **Aspect ratio** (optional, default `16:9`): `16:9` (widescreen) / `4:3` (standard)
   - **Style** (optional): layout and typography preset. Choose from: `modern` / `corporate` / `creative` / `minimal` / `tech`. Use as a quick shorthand for visual direction; omit if `--prompt` already describes the style. See **Preset Styles** section below for detailed descriptions.
   - **Language** (optional, default: auto-detect from user's input language): `zh` / `en` / `ja`
   - **Session ID** (optional): if the user is iterating on a previous result, ask them to provide the `sessionId` (number type) printed by the last run. If this is a fresh request, omit it — the platform auto-creates a new session.

- **Local outline file** → script uploads automatically, then calls API
- **Outline URL** → script uses it directly

### Step 2: Run generate-presentation

```bash
node "<skills-dir>/surgepix-generate-presentation/scripts/generate_presentation.mjs" \
  --n <5-30> [--prompt "<text>"] [--outline "<path-or-url>" ...] \
  [--aspect-ratio <16:9>] [--style <name>] \
  [--language <zh|en|ja>] [--session-id <id>] [--nowait <true|false>]
```

| Flag | Description |
|------|-------------|
| `--n <5-30>` | Number of slides, integer in `5–30` (**required**) |
| `--prompt <text>` | Text describing the presentation topic, purpose, and key points |
| `--outline <path-or-url>` | Outline document (local path auto-uploaded; repeatable for multiple files) |
| `--aspect-ratio <ratio>` | Aspect ratio, default 16:9 (e.g. `16:9`, `4:3`) |
| `--style <name>` | Layout preset: `modern` / `corporate` / `creative` / `minimal` / `tech` |
| `--language <code>` | Output language: `zh` / `en` / `ja` |
| `--session-id <id>` | Session ID; pass the `sessionId` (number type) from a previous run to iterate |
| `--nowait <true\|false>` | Wait mode, default `false` (see below) |

The request is always submitted asynchronously. `--nowait false` (default) makes the script poll internally until the task completes and returns the final `download`; `--nowait true` makes the script return the `taskId` immediately, to be resolved later via the **surgepix-query-task** skill.

### Step 3: Parse output

**Sync success** (`--nowait false`, stdout):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"https://...presentation.pptx"}
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
   - **On failure:** Report the `error` field. Common causes:
     - Missing required parameter — `--n` not provided, or neither `--prompt` nor `--outline` provided
     - Unsupported outline format — file format not supported
     - Outline file too large — exceeds 50MB
     - `--n` out of range (must be 5–30) or invalid `--language` code
     - Generation failed — internal error; retry or simplify the prompt
   - The result is automatically attached to the session (auto-created or reused). The user can open the platform frontend to see all iterations in one place.
   - If the user is not satisfied and wants to iterate, instruct them to pass `--session-id <sessionId>` (number type) in the next run — both versions appear in the same session history on the frontend.

---

## Parameters

| Parameter                | Required | Default      | Description                                                                  |
|--------------------------|----------|--------------|------------------------------------------------------------------------------|
| `--prompt <text>`        | No       | —            | Text describing the topic, purpose, and key points of the presentation       |
| `--outline <path-or-url>` | No      | —            | Outline document (local path auto-uploaded; repeatable for multiple files)   |
| `--n <5-30>`             | Yes      | —            | Number of slides, integer in range 5–30                                      |
| `--aspect-ratio <ratio>` | No       | `16:9`       | Slide aspect ratio: `16:9` (widescreen, 1920×1080 px) / `4:3` (standard, 1024×768 px) |
| `--style <name>`         | No       | —            | Layout preset: `modern` / `corporate` / `creative` / `minimal` / `tech`. See **Preset Styles** section for details. Use as a quick shorthand; omit when `--prompt` already covers the visual direction |
| `--language <code>`      | No       | auto-detect  | Output language: `zh` / `en` / `ja`                                          |
| `--session-id <id>`      | No       | auto-created | Omit on first run (platform creates a new session and returns it in stdout); provide on subsequent runs to group iterations in the same session. Note: `sessionId` is a number type, not string |
| `--nowait <true\|false>` | No       | `false`      | `false` = synchronous: script polls internally and returns the final `download`. `true` = asynchronous: returns `taskId` immediately; resolve later via the **surgepix-query-task** skill |

---

## Preset Styles

| Style | Parameter | Description | Use Cases |
|-------|-----------|-------------|-----------|
| Modern | `modern` | Modular grids, generous whitespace, geometric elements, minimal decoration | Executive presentations, product launches |
| Corporate | `corporate` | Structured modules, dashboard-inspired, card-based information, KPI focus | Annual summaries, financial reports, strategy |
| Creative | `creative` | Organic collages, layered composition, handwritten notes, Polaroid-style frames | Creative team showcases, brand storytelling |
| Minimal | `minimal` | Editorial layouts, elegant balance, blurred backgrounds, refined typography | Premium brands, design portfolios |
| Tech | `tech` | Modular interface grids, dark UI, glowing dividers, futuristic feel | Tech products, data-driven content |
| Academic | `academic` | Editorial grids, chapter hierarchy, structured layouts, content-focused | Academic reports, research results, lectures |
| Fashion | `fashion` | Flexible editorial, image-driven storytelling, magazine-inspired, artistic | Fashion brands, product catalogs, lifestyle |
| Illustration | `illustration` | Illustration-centered, geometric decorations, rounded containers, playful | Educational content, kids products, brand stories |

---

## Rules

- ALWAYS run `check_env.mjs` before first use in a session
- Provide at least `--prompt` or `--outline`
- `--n` is **required** and must be an integer between 5 and 30 — never run the command without it
- The request is always submitted asynchronously; `--nowait` only controls whether the script polls locally (`false`, default) or returns the `taskId` immediately (`true`) — do not treat it as the API `noWait` field
- In async mode (`--nowait true`), guide the user/Agent to resolve the `taskId` via the **surgepix-query-task** skill
- If the user wants to iterate, they pass `--session-id 123` in the next run — both versions appear in the same session on the frontend.
- If `--session-id` is omitted, the platform auto-creates a new session for the run.
- The `.pptx` download URL is valid for **24 hours**; download before it expires.
- Supported outline formats: `doc`, `docx`, `pdf`, `txt`, `md`, `html`, `pptx` — max **50MB**.
- NEVER pass local outline paths to the API — script handles upload internally
- NEVER invent download URLs — only use the `download` value from the output
- NEVER echo auth tokens in logs or output
