---
name: surgepix-remove-background
description: Remove image background using SurgePix API, returning a transparent PNG download URL. Use when the user says "remove background", "去背景", "抠图", "make transparent", "extract subject", or wants to isolate the subject from an image.
---

# SurgePix Remove Background

Remove background from an image (local file or URL) and get a transparent PNG.

## When to use

- User says "去背景", "remove background", "抠图", "make it transparent"
- User wants to isolate the subject from an image
- User needs a transparent PNG version of a photo

## Prerequisites

- Node.js >= 18
- Network access to SurgePix API
- `SURGEPIX_API_KEY` configured (see Setup below)

## Setup

Add to your project's env config (`.env`, `.claude/settings.local.json`, or shell export):

```
SURGEPIX_API_KEY=your-bearer-token-here
SURGEPIX_BASE_URL=https://api-test.surgepix.ai/api   # optional
```

The script auto-discovers config from `.env` and `settings.local.json` walking up from cwd.

## Workflow

### Step 1: Identify the input

- **Local file** → script uploads it automatically, then calls API
- **URL** → script uses it directly (skip upload)

### Step 2: Run remove-background

```bash
node "<skill-scripts-dir>/scripts/remove_background.mjs" "<image-path-or-url>" [--sync] [--session-id <id>]
```

| Flag | Description |
|------|-------------|
| `--sync` | Synchronous mode — wait for result in one call (good for small images) |
| `--session-id <id>` | Session ID for iterative adjustments |

**Default (async):** submit task → poll until done → output result.

### Step 3: Parse output

**Success** (stdout, JSON):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"https://...result.png"}
```

**Failure** (stderr, non-zero exit):

```json
{"ok":false,"error":"..."}
```

### Step 4: Present result

- Show the `download` URL — this is the transparent PNG
- Save `sessionId` if user wants to iterate
- If `progress` is `failed`, the image may not be supported

## Error handling

| Error | Action |
|-------|--------|
| Token not found | Configure `SURGEPIX_API_KEY` in env |
| File not found | Check the absolute path |
| HTTP 401/403 | Token expired or invalid |
| Poll timeout | Image too large, try `--sync` or retry later |
| progress=failed | Image may not be supported, try another |

## Rules

- NEVER pass local paths to the API — the script handles upload internally
- NEVER invent download URLs — only use `download` from script output
- NEVER echo auth tokens
- Always use absolute file paths for local images
