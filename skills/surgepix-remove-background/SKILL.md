---
name: surgepix-remove-background
description: Use SurgePix API to remove image background, returning a transparent PNG download URL. Use when the user says "remove background", "去背景", "抠图", "make transparent", "extract subject", or wants to isolate the subject from an image.
---

# Remove Background — AI-Powered Background Removal

Remove the background from an image and return a transparent PNG using the platform API. Use when the user asks to remove background, cut out a subject, make an image transparent, or create a PNG with no background.

---

## What the Skill Does

| Action                   | Description                                                             |
|--------------------------|-------------------------------------------------------------------------|
| Remove background        | Pass a local file or URL; script uploads and processes in one step      |
| Check task status        | Poll a generation task by `taskId` to check progress                   |
| Batch remove backgrounds | Process multiple images sequentially and return all download links      |
| Download result          | Retrieve the PNG download URL from the completed task                   |

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

This skill uses the script at `<skills-dir>/surgepix-remove-background/scripts/remove_background.mjs`.

---

## Usage Examples

**First run — pass a local file, script uploads automatically:**
```bash
node "<skills-dir>/surgepix-remove-background/scripts/remove_background.mjs" \
  ./photo.jpg
# Script uploads the image automatically — no separate step needed.
# Output (JSON):
#   {"ok":true,"taskId":"task_abc123","sessionId":123,"progress":"succeeded","download":"https://..."}
#   ← Save sessionId for retries
```

**Not satisfied — retry with same session ID:**
```bash
node "<skills-dir>/surgepix-remove-background/scripts/remove_background.mjs" \
  ./photo.jpg \
  --session-id 123                ← Pass the sessionId from previous output (number type)
```

**Submit task and get taskId only (do not wait for completion):**
```bash
node "<skills-dir>/surgepix-remove-background/scripts/remove_background.mjs" \
  ./photo.jpg --nowait true
# Returns JSON immediately:
#   {"ok":true,"async":true,"taskId":"task_abc123","sessionId":123,"progress":"processing","download":null,"hint":"..."}

# Then use the surgepix-query-task skill to poll the taskId until progress becomes succeeded
```

**Batch: remove backgrounds from multiple images:**
```bash
node "<skills-dir>/surgepix-remove-background/scripts/remove_background.mjs" ./img1.jpg
node "<skills-dir>/surgepix-remove-background/scripts/remove_background.mjs" ./img2.jpg
node "<skills-dir>/surgepix-remove-background/scripts/remove_background.mjs" ./img3.jpg
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

- **Local file** → script uploads automatically, then calls API
- **URL** → script uses it directly

### Step 2: Collect inputs
   - The user must provide an image. Accept either:
     - **Local file path** (e.g. `./photo.jpg`)
     - **URL** pointing to an image
   - **Session ID** (optional): if the user is retrying the same image,
     ask them to provide the `sessionId` printed by the last run. If this is
     a fresh image, omit it — the platform will auto-create a new session.
   - Validate the file before submitting:
     - Supported formats: `JPEG`, `JPG`, `PNG`, `WEBP`
     - Maximum size: 20MB
     - If unsupported format or oversized, inform the user and ask for a different file.

### Step 3: Submit the removal task
   ```bash
   node "<skills-dir>/surgepix-remove-background/scripts/remove_background.mjs" \
     "<file path or URL>" \
     [--session-id <sessionId>] \
     [--nowait <true|false>]
   ```
   - The image parameter is a **positional argument** (required). Pass the file path or URL directly — no `--file` prefix needed. The script uploads the image automatically, then calls the platform API and receives a `taskId`.
   - The request is always submitted asynchronously. By default (`--nowait false`), the script polls `GET /tasks/{taskId}` every 2 seconds until status is
     `succeeded` or `failed`.
   - Pass `--nowait true` to skip polling and return the `taskId` immediately; resolve it later with the **surgepix-query-task** skill.
   - Output is always `.png` to preserve transparency information.

### Step 4: Parse output

**Sync success** (`--nowait false`, stdout):

```json
{"ok":true,"taskId":"task_abc123","sessionId":123,"progress":"succeeded","download":"https://...result.png"}
```

**Async submitted** (`--nowait true`, stdout) — resolve later with the **surgepix-query-task** skill:

```json
{"ok":true,"async":true,"taskId":"task_abc123","sessionId":123,"progress":"processing","download":null,"hint":"..."}
```

**Failure** (stderr):

```json
{"ok":false,"error":"..."}
```

### Step 5: Handle the result
   - **On success:** Show the download URL. **Always show `sessionId`** (note: it is a number type, e.g. `123`) so the user can pass it in a retry if needed.
   - **Edge quality issues:** If the user reports rough edges (common with hair, fur, or complex backgrounds), inform them that a higher-contrast or higher-resolution source image may improve results, and offer to retry with the same `sessionId`.
   - **On failure:** Report the error message from the `error` field. Common causes:
     - `unsupported_image_format` — file format not supported
     - `image_too_large` — file exceeds 20MB

### Step 6: Session sync and iteration
   - The result is automatically attached to the session (auto-created or reused). The user can open the platform frontend to see all iterations in one place.
   - If the user wants to retry, instruct them to pass `--session-id 123` (number type) — both attempts appear in the same session history.

### Step 7: Batch processing
   - If the user provides multiple images, repeat Steps 3–6 for each one.
   - After all are complete, present all download links together.

---

## Parameters

### remove-background

| Parameter                | Required | Default       | Description                                                                  |
|--------------------------|----------|---------------|------------------------------------------------------------------------------|
| `<file path or URL>`     | Yes      | —             | **Positional argument.** Local file path or image URL; script uploads automatically before processing |
| `--session-id <id>`      | No       | auto-created  | Omit on first run (platform creates a new session and returns it in stdout); provide on subsequent runs to group iterations in the same session |
| `--nowait <true\|false>` | No       | `false`       | `false` = synchronous: script polls internally and returns the final `download`. `true` = asynchronous: returns `taskId` immediately; resolve later via the **surgepix-query-task** skill |

---

## Notes

- Output is always `.png` — do not rename to `.jpg` as transparency will be lost.
- Supported input formats: `JPEG`, `JPG`, `PNG`, `WEBP`. Max file size: **20MB**.
- The download link in the result is valid for **24 hours**; download before it expires.
- **Always display the `sessionId` from the output** (note: it is a number type, e.g. `123`). If the user wants to retry (e.g. due to edge quality issues), they pass `--session-id 123` in the next run — both attempts appear in the same session on the frontend.
- If `--session-id` is omitted, the platform auto-creates a new session for the run.
- The image parameter is a **positional argument** — pass the path or URL directly, no `--file` prefix. The script auto-detects whether it is a local file or a remote URL.
- **Must** run `check_env.mjs` before first use in each session.
- **Never** pass local paths to the API — script handles upload internally.
- **Never** invent download URLs — only use the `download` value from the output.
- **Never** expose auth tokens in logs or output.