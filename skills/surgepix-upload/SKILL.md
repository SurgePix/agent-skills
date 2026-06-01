---
name: surgepix-upload
description: Upload local files to SurgePix cloud storage and return a public HTTPS URL. Use when the user says "upload", "get a URL", "上传文件", "传到CDN", needs a remote-accessible URL for an API call, or wants to convert a local file path into a public link.
---

# SurgePix Upload

Upload a local file (image, PDF, video, etc.) to SurgePix storage and get back a public CDN URL.

## When to use

- User says "upload this file", "get a URL for this image", "上传", "传到线上"
- Before calling any web API that needs a remote URL instead of a local path
- User gives a local path and wants backend processing

## Prerequisites

- Node.js >= 18
- Network access to SurgePix API
- `SURGEPIX_API_KEY` configured (see Setup below)

## Setup

Add to your project's env config (`.env`, `.claude/settings.local.json`, or shell export):

```
SURGEPIX_API_KEY=your-bearer-token-here
SURGEPIX_BASE_URL=https://api-test.surgepix.ai/api   # optional
SURGEPIX_UPLOAD_FOLDER=files                          # optional
```

The script auto-discovers config from `.env` and `settings.local.json` walking up from cwd.

## Workflow

### Step 1: Identify the file

- Get the absolute path to the local file
- Confirm the file exists

### Step 2: Run upload

```bash
node "<skill-scripts-dir>/file_upload.mjs" "<absolute-file-path>"
```

### Step 3: Parse output

**Success** (stdout, JSON):

```json
{"ok":true,"url":"https://...","filename":"photo.png","size":12345,"contentType":"image/png","existing":false}
```

**Failure** (stderr, non-zero exit):

```json
{"ok":false,"error":"..."}
```

### Step 4: Use the URL

- Show the `url` to the user
- Pass it to any API that needs a remote file URL
- `"existing": true` means the file was already on server (MD5 dedup, instant)

## Error handling

| Error | Action |
|-------|--------|
| Token not found | Configure `SURGEPIX_API_KEY` in env |
| File not found | Check the absolute path |
| HTTP 401/403 | Token expired or invalid |
| Network error | Check connectivity |

## Rules

- NEVER pass local paths to web APIs — upload first, use the returned URL
- NEVER invent or guess a URL — only use `url` from script output
- NEVER echo auth tokens
- Always use absolute file paths
