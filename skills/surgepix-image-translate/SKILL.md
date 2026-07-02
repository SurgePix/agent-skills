---
name: surgepix-image-translate
description: Translate text on images to a target language using SurgePix API, keeping the background unchanged. Use when the user says "translate image", "图片翻译", "翻译图片", "translate text on image", "把图片翻译成英文/中文", or wants to localize image text.
---

# Image Translate — Translate Text on Images

Translate text on one or more images to a target language while preserving the background, using the platform API. Use when the user asks to translate image text, localize a poster/screenshot, or convert on-image copy to another language.

---

## What the Skill Does

| Action              | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| Translate image     | Pass local file(s) or URL(s); script uploads and translates in one step   |
| Batch translate     | Pass multiple images in one call; result is a ZIP download URL             |
| Check task status   | When run with `--nowait true`, poll by `taskId` via **surgepix-query-task** |
| Download result     | Single image → image URL; multiple images → ZIP URL                        |

> By default (`--nowait false`), the API waits for completion and returns the final `download` URL in one call. With `--nowait true`, the API returns a `taskId` immediately; resolve it later with the **surgepix-query-task** skill.

---

## Setup

**Requirement:** Set the `SURGEPIX_API_KEY` environment variable.
Get your API Key at your platform's API management page.

```bash
export SURGEPIX_API_KEY=your-api-key-here
```

This skill uses the script at `<skills-dir>/surgepix-image-translate/scripts/image_translate.mjs`.

---

## Usage Examples

**First run — translate a local image to English (default):**
```bash
node "<skills-dir>/surgepix-image-translate/scripts/image_translate.mjs" \
  ./poster.png
# Output (JSON):
#   {"ok":true,"taskId":"task_abc123","sessionId":123,"progress":"succeeded","download":"https://...","imageCount":1,"resultType":"image"}
#   ← Save sessionId for retries
```

**Translate to Chinese:**
```bash
node "<skills-dir>/surgepix-image-translate/scripts/image_translate.mjs" \
  ./poster.png \
  --language zh
```

**Retry / iterate with same session:**
```bash
node "<skills-dir>/surgepix-image-translate/scripts/image_translate.mjs" \
  ./poster.png \
  --language en \
  --session-id 123
```

**Multiple images (returns ZIP):**
```bash
node "<skills-dir>/surgepix-image-translate/scripts/image_translate.mjs" \
  ./page1.png ./page2.png \
  --language en
# download → ZIP URL; resultType=zip
```

**Async submit (return taskId only):**
```bash
node "<skills-dir>/surgepix-image-translate/scripts/image_translate.mjs" \
  ./poster.png \
  --language ja \
  --nowait true
# Returns JSON immediately:
#   {"ok":true,"async":true,"taskId":"task_abc123",...,"hint":"..."}

# Then use surgepix-query-task to check status
```

---

## Workflow

### Step 0: Check environment (required)

Before first use, run the environment check:

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

- **Exit 0** → proceed to Step 1
- **Exit 1** → follow the **surgepix-setup** skill to configure `.env`, then retry

### Step 1: Identify the input

- **Local file(s)** → script uploads automatically, then calls API
- **URL(s)** → script uses them directly
- Ask the user for the **target language** if not specified (default: `en`). Common codes: `en`, `zh`, `ja`.

### Step 2: Collect inputs

- The user must provide at least one image. Accept either:
  - **Local file path(s)** (e.g. `./poster.png`)
  - **URL(s)** pointing to images
- **Language** (optional): target language code, default `en`.
- **Session ID** (optional): if the user is retrying, use the `sessionId` from the last run. Omit on first run — the platform auto-creates a new session.
- Validate each file before submitting:
  - Supported formats: `JPEG`, `JPG`, `PNG`, `WEBP`
  - Maximum size: 20MB per file
  - If unsupported or oversized, inform the user and ask for a different file.

### Step 3: Submit the translation task

```bash
node "<skills-dir>/surgepix-image-translate/scripts/image_translate.mjs" \
  "<file path or URL>" [<image2> ...] \
  [--language <code>] \
  [--session-id <sessionId>] \
  [--nowait <true|false>]
```

- Image parameters are **positional arguments** (at least one required). Pass file paths or URLs directly — no `--file` prefix. The script uploads local files automatically.
- Default (`--nowait false`): API waits for completion and returns the final `download` URL.
- Pass `--nowait true` to return the `taskId` immediately; resolve later with **surgepix-query-task**.

### Step 4: Parse output

**Sync success** (`--nowait false`, stdout):

```json
{"ok":true,"taskId":"task_abc123","sessionId":123,"progress":"succeeded","download":"https://...","imageCount":1,"resultType":"image"}
```

**Async submitted** (`--nowait true`, stdout):

```json
{"ok":true,"async":true,"taskId":"task_abc123","sessionId":123,"progress":"processing","download":null,"imageCount":1,"resultType":"image","hint":"..."}
```

**Failure** (stderr):

```json
{"ok":false,"error":"..."}
```

### Step 5: Handle the result

- **On success:** Show the `download` URL.
  - `resultType: "image"` — single translated image
  - `resultType: "zip"` — multiple images packaged as ZIP
- **Always show `sessionId`** (number type, e.g. `123`) so the user can retry in the same session.
- **On failure:** Report the `error` field. Common causes:
  - `unsupported_image_format` — file format not supported
  - `image_too_large` — file exceeds 20MB

### Step 6: Session sync and iteration

- Results are attached to the session (auto-created or reused). The user can view all iterations on the platform frontend.
- To retry, pass `--session-id 123` — both attempts appear in the same session history.

---

## Parameters

### image-translate

| Parameter                | Required | Default      | Description                                                                 |
|--------------------------|----------|--------------|-----------------------------------------------------------------------------|
| `<file path or URL>`     | Yes      | —            | **Positional argument(s).** One or more local paths or image URLs           |
| `--language <code>`      | No       | `en`         | Target language, e.g. `en`, `zh`, `ja`                                      |
| `--session-id <id>`      | No       | auto-created | Omit on first run; provide on retries to group iterations in one session    |
| `--nowait <true\|false>` | No       | `false`      | `false` = sync: API waits and returns final `download`. `true` = async: returns `taskId`; resolve via **surgepix-query-task** |

---

## Notes

- Single image → `download` is an image URL; multiple images → `download` is a ZIP URL.
- Supported input formats: `JPEG`, `JPG`, `PNG`, `WEBP`. Max file size: **20MB** per image.
- The download link is valid for **24 hours**; download before it expires.
- **Always display the `sessionId`** from output (number type). Pass `--session-id 123` on retry to keep iterations in one session.
- Image parameters are **positional arguments** — pass paths or URLs directly, no `--file` prefix.
- **Must** run `check_env.mjs` before first use in each session.
- **Never** pass local paths to the API — the script handles upload internally.
- **Never** invent download URLs — only use the `download` value from output.
- **Never** expose auth tokens in logs or output.
