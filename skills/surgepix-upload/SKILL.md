---
name: surgepix-upload
description: Upload local files to SurgePix cloud storage and return a public HTTPS URL. Use when the user says "upload", "get a URL", "上传文件", "传到CDN", needs a remote-accessible URL for an API call, or wants to convert a local file path into a public link.
---

# SurgePix Upload

Upload a local file to SurgePix storage and get back a public CDN URL.

## When to use

- User says "upload this file", "get a URL for this image", "上传", "传到线上"
- Before calling any web API that needs a remote URL instead of a local path

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` configured (see Step 0)

## Workflow

### Step 0: Check environment (required)

Before running upload, verify config:

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

- **Exit 0** → proceed to Step 1
- **Exit 1** → follow **surgepix-setup** skill to configure `.env`, then retry

Do NOT check `$SURGEPIX_API_KEY` in shell — the script loads `.env` automatically.

### Step 1: Identify the file

- Get the absolute path to the local file
- Confirm the file exists

### Step 2: Run upload

```bash
node "<skills-dir>/surgepix-upload/scripts/file_upload.mjs" "<absolute-file-path>"
```

### Step 3: Parse output

**Success** (stdout):

```json
{"ok":true,"url":"https://...","filename":"photo.png","size":12345,"contentType":"image/png","existing":false}
```

**Failure** (stderr, non-zero exit):

```json
{"ok":false,"error":"..."}
```

If error is "API_KEY not found" → run surgepix-setup first.

### Step 4: Use the URL

- Show the `url` to the user
- Pass it to any API that needs a remote file URL

## Rules

- ALWAYS run check_env before first use in a session
- NEVER pass local paths to web APIs — upload first, use the returned URL
- NEVER invent or guess a URL
- NEVER echo auth tokens
