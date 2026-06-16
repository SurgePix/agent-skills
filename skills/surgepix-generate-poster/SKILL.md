---
name: surgepix-generate-poster
description: Generate an event poster (PNG) using the SurgePix API, returning a download URL. Use when the user says "generate poster", "生成海报", "做个海报", "make a poster", "create a poster", or wants a poster from event info (name, date, venue).
---

# SurgePix Generate Poster

Generate an event poster (PNG) from event info (name, date, venue) plus optional styling and reference images, and get a download URL.

## When to use

- User says "生成海报", "做个海报", "generate poster", "make a poster", "create a poster"
- User provides an event name, date, and venue, optionally with styling hints or reference images

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` configured (see Step 0)

---

## What the Skill Does

| Action                  | Description                                                                  |
|-------------------------|------------------------------------------------------------------------------|
| Generate event poster   | Create a poster image from event name, date, venue, and brief                |
| Upload reference image  | Upload a brand logo or visual reference image to apply to the poster design  |
| Check task status       | Poll a generation task by `taskId` to check progress                         |
| Download result         | Retrieve the PNG download URL directly from the task result                  |
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

This skill uses the script at `<skills-dir>/surgepix-generate-poster/scripts/generate_poster.mjs`.

---

## Usage Examples

**First run — using `--prompt` for creative direction (no `--style` needed):**
```bash
node "<skills-dir>/surgepix-generate-poster/scripts/generate_poster.mjs" \
  --event-name "2026 Design Summit" \
  --date "2026-06-15 19:00" \
  --venue "Shanghai · Expo Center" \
  --description "Top designers explore the future of creativity" \
  --prompt "Dark background, neon blue and purple gradient, centered large title, futuristic tech style" \
  --size 1080x1920
# Output (JSON):
#   {"ok":true,"taskId":"task_abc123","sessionId":123,"progress":"succeeded","download":"https://..."}
#   ← Save sessionId for retries
```

**Not satisfied — adjust prompt direction with same session ID:**
```bash
node "<skills-dir>/surgepix-generate-poster/scripts/generate_poster.mjs" \
  --event-name "2026 Design Summit" \
  --date "2026-06-15 19:00" \
  --venue "Shanghai · Expo Center" \
  --description "Top designers explore the future of creativity" \
  --prompt "Change to white background, gold accents, premium minimalism, larger bolder title font" \
  --size 1080x1920 \
  --session-id 123                ← Pass the sessionId from previous output (number type)
# Both versions appear in the same session on the platform frontend.
```

**Generate with a brand reference image (uploaded automatically):**
```bash
node "<skills-dir>/surgepix-generate-poster/scripts/generate_poster.mjs" \
  --event-name "Brand Launch" \
  --date "2026-07-01 14:00" \
  --venue "Beijing · National Convention Center" \
  --style bold \
  --reference ./logo.png
# Script uploads the image automatically — no separate step needed.
```

**Multiple reference images:**
```bash
node "<skills-dir>/surgepix-generate-poster/scripts/generate_poster.mjs" \
  --event-name "Summer Music Festival" \
  --date "2026-08-10 20:00" \
  --venue "Shenzhen · Seaside Plaza" \
  --reference ./logo.png --reference ./mood.jpg --reference https://example.com/banner.png \
  --size 1080x1920
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

`--event-name`, `--date`, and `--venue` are required.
   - **Event name** (required): main title displayed on the poster
   - **Date and time** (required): e.g. `2026-06-15 19:00`
   - **Venue** (required): location name or address shown on the poster
   - **Prompt** (optional): free-form creative direction — describe desired color scheme, typography, layout, imagery, or atmosphere. This instructs the AI and does **not** appear as text on the poster.
   - **Description** (optional): tagline or intro text printed on the poster, max 100 characters
   - **Style** (optional): layout and typography preset. Choose from: `modern` / `vintage` / `minimalist` / `bold`. Use as a quick shorthand for visual direction; omit if `--prompt` already describes the style. See **Preset Styles** section below for detailed descriptions.
   - **Size** (optional, default `1080x1920`): custom dimensions in `WxH` format, e.g. `1080x1920`, `1080x1080`, `1920x1080`
   - **Reference image** (optional): local file path or image URL; script uploads automatically. Repeatable for multiple images. Supported formats: `JPEG`, `JPG`, `PNG`, `WEBP` — max **20MB** each.
   - **Session ID** (optional): if the user is iterating on a previous result, ask them to provide the `sessionId` (number type) printed by the last run. If this is a fresh request, omit it — the platform auto-creates a new session.

- **Local reference image** → script uploads automatically, then calls API
- **Reference image URL** → script uses it directly

### Step 2: Run generate-poster

```bash
node "<skills-dir>/surgepix-generate-poster/scripts/generate_poster.mjs" \
  --event-name "<text>" --date "<text>" --venue "<text>" \
  [--prompt "<text>"] [--description "<text>"] [--style <name>] \
  [--size <1080x1920>] [--reference "<path-or-url>" ...] [--session-id <id>] \
  [--nowait <true|false>]
```

| Flag | Description |
|------|-------------|
| `--event-name <text>` | Main title on the poster (required) |
| `--date <text>` | Event date and time, e.g. `2026-06-15 19:00` (required) |
| `--venue <text>` | Location text shown on the poster (required) |
| `--prompt <text>` | Creative direction (color, typography, layout) — not printed on poster |
| `--description <text>` | Tagline printed on the poster, max 100 characters |
| `--style <name>` | Layout preset: `modern` / `vintage` / `minimalist` / `bold` |
| `--size <WxH>` | Output dimensions, default `1080x1920` |
| `--reference <path-or-url>` | Reference image (local path auto-uploaded; repeatable for multiple files) |
| `--session-id <id>` | Session ID; pass the `sessionId` (number type) from a previous run to iterate |
| `--nowait <true\|false>` | Wait mode, default `false` (see below) |

The request is always submitted asynchronously. `--nowait false` (default) makes the script poll internally until the task completes and returns the final `download`; `--nowait true` makes the script return the `taskId` immediately, to be resolved later via the **surgepix-query-task** skill.

### Step 3: Parse output

**Sync success** (`--nowait false`, stdout):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"https://...poster.png"}
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
     - Missing required parameter — `--event-name`, `--date`, or `--venue` not provided
     - `--description` exceeds 100 characters
     - Reference image format not supported or exceeds 20MB
     - Invalid `--size` value
     - Generation failed — internal error; retry or simplify the prompt
   - The result is automatically attached to the session (auto-created or reused). The user can open the platform frontend to see all iterations in one place.
   - If the user is not satisfied and wants to iterate, instruct them to pass `--session-id <sessionId>` (number type) in the next run — both versions appear in the same session history on the frontend.

---

## Parameters

| Parameter              | Required | Default      | Description                                                                  |
|------------------------|----------|--------------|------------------------------------------------------------------------------|
| `--event-name <text>`  | Yes      | —            | Main title on the poster                                                     |
| `--date <text>`        | Yes      | —            | Event date and time, e.g. `2026-06-15 19:00`                                |
| `--venue <text>`       | Yes      | —            | Location text shown on the poster                                            |
| `--prompt <text>`      | No       | —            | Creative direction: color scheme, typography, layout. Instructs the AI — does **not** appear as text on the poster |
| `--description <text>` | No       | —            | Tagline printed on the poster, max 100 characters                            |
| `--style <name>`       | No       | —            | Layout preset: `modern` / `vintage` / `minimalist` / `bold`. See **Preset Styles** section for details. Use as a quick shorthand; omit when `--prompt` already covers the visual direction |
| `--size <WxH>`         | No       | `1080x1920`  | Custom dimensions in `WxH` format, e.g. `1080x1920`, `1080x1080`, `1920x1080` |
| `--reference <path-or-url>` | No  | —            | Reference image (local path auto-uploaded; repeatable for multiple files). Supported formats: `JPEG`, `JPG`, `PNG`, `WEBP` — max **20MB** each |
| `--session-id <id>`    | No       | auto-created | Omit on first run (platform creates a new session and returns it in stdout); provide on subsequent runs to group iterations in the same session. Note: `sessionId` is a number type, not string |
| `--nowait <true\|false>` | No     | `false`      | `false` = synchronous: script polls internally and returns the final `download`. `true` = asynchronous: returns `taskId` immediately; resolve later via the **surgepix-query-task** skill |

---

## Preset Styles

| Style | Parameter | Description | Use Cases |
|-------|-----------|-------------|-----------|
| Modern | `modern` | Grid-based, generous whitespace, strong focal hierarchy, modular alignment | Business events, product launches |
| Vintage | `vintage` | Collage-style, organic layout, layered graphics, retro print alignment | Creative events, theme-based campaigns |
| Minimalist | `minimalist` | Swiss grid, maximum whitespace, minimal elements, precise alignment, typography-centered | Art exhibitions, design events |
| Bold | `bold` | Oversized typography, dynamic text layering, experimental alignment, high impact | E-commerce promos, special events, music festivals |
| Creative | `creative` | Freeform composition, cinematic balance, floating objects, atmospheric negative space | Art exhibitions, concept launches |
| 3D | `3d` | Floating 3D objects, layered digital interface, glossy elements, Y2K typography | Tech product launches, gaming events |
| Hand-drawn | `hand-drawn` | Illustration-led, organic strokes, warm textures, playful hand-lettered typography | Product promotions, community events |
| Business Promo | `business-promo` | Product-centered composition, large promotional headline, dynamic balance, layered badges, clear CTA | E-commerce marketing, limited-time campaigns |

---

## Rules

- ALWAYS run `check_env.mjs` before first use in a session
- `--event-name`, `--date`, `--venue` are all required — never run the command if any is missing
- `--description` must be at most 100 characters
- The request is always submitted asynchronously; `--nowait` only controls whether the script polls locally (`false`, default) or returns the `taskId` immediately (`true`) — do not treat it as the API `noWait` field
- In async mode (`--nowait true`), guide the user/Agent to resolve the `taskId` via the **surgepix-query-task** skill
- NEVER pass local reference image paths to the API — script handles upload internally
- NEVER invent download URLs — only use the `download` value from the output
- NEVER echo auth tokens in logs or output
- If the user wants to iterate, they pass `--session-id 123` in the next run — both versions appear in the same session on the frontend.
- If `--session-id` is omitted, the platform auto-creates a new session for the run.
- If the user provides a brand color, pass it via `--prompt`, e.g. `--prompt "Brand color #FF5A00, tech style, dark background"`. Do not put creative direction in `--description` — that field is reserved for text printed on the poster.
- The poster download URL is valid for **24 hours**; download before it expires.
- To generate multilingual versions of the same poster, run the command separately for each language, adjusting `--event-name`, `--venue`, and `--description` accordingly.
- Reference image supported formats: `JPEG`, `JPG`, `PNG`, `WEBP` — max **20MB** each.