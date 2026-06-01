---
name: surgepix-remove-background
description: Remove image background using SurgePix API, returning a transparent PNG download URL. Use when the user says "remove background", "去背景", "抠图", "make transparent", "extract subject", or wants to isolate the subject from an image.
---

# SurgePix Remove Background

Remove background from an image (local file or URL) and get a transparent PNG.

## When to use

- User says "去背景", "remove background", "抠图", "make it transparent"
- User wants to isolate the subject from an image

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` configured (see Step 0)

## Workflow

### Step 0: Check environment (required)

Before running, verify config:

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

- **Exit 0** → proceed to Step 1
- **Exit 1** → follow **surgepix-setup** skill to configure `.env`, then retry

### Step 1: Identify the input

- **Local file** → script uploads automatically, then calls API
- **URL** → script uses it directly

### Step 2: Run remove-background

```bash
node "<skills-dir>/surgepix-remove-background/scripts/remove_background.mjs" "<image-path-or-url>" [--sync] [--session-id <id>]
```

| Flag | Description |
|------|-------------|
| `--sync` | Wait for result in one call (good for small images) |
| `--session-id <id>` | Session ID for iterative adjustments |

### Step 3: Parse output

**Success** (stdout):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"https://...result.png"}
```

**Failure** (stderr):

```json
{"ok":false,"error":"..."}
```

### Step 4: Present result

- Show the `download` URL (transparent PNG)
- Save `sessionId` if user wants to iterate

## Rules

- ALWAYS run check_env before first use in a session
- NEVER pass local paths to the API — script handles upload internally
- NEVER invent download URLs
- NEVER echo auth tokens
