---
name: surgepix-generate-logo
description: >-
  Generate a brand logo (PNG, transparent by default) via SurgePix API and return a download URL. Use when the user says "generate logo", "生成logo", "做个标志", "品牌logo", "transparent logo", or wants a logo from a brand/product name. Language: write --prompt in the user's conversation language. Output rule: show ONLY the download URL from the API; NEVER fabricate image links.
---

# SurgePix Generate Logo

Generate **one** brand logo image from a brand/product name, optional design notes and reference images. Default output is transparent background.

## Language consistency

Match the **user's conversation language** for `--prompt` design notes — unless the user explicitly requests another language.

| User writes in | Write `--prompt` in |
|----------------|---------------------|
| English | English |
| 中文 | 中文 |
| 日本語 | 日本語 |

- Reply to the user in the same language they used in their request.

## When to use

- User says "生成logo", "做个标志", "generate logo", "brand logo", "透明底 logo"
- User provides a brand/product name and optional style notes or reference images

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` configured (see Step 0)

---

## What the Skill Does

| Action | Description |
|--------|-------------|
| Generate logo | Create one logo PNG from brand name (+ optional prompt/size/reference) |
| Upload references | Local reference paths are uploaded automatically |
| Check task status | With `--nowait true`, resolve via **surgepix-query-task** |
| Download result | Return the `download` URL from task result |

> The script **always submits asynchronously** to the API (`noWait=true`). CLI `--nowait` controls local behavior:
> - `--nowait false` (default) — poll until `succeeded`/`failed` and return `download`
> - `--nowait true` — return `taskId` immediately; use **surgepix-query-task** later

---

## Setup

**Requirement:** Set `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` (see **surgepix-setup**). Do **not** ask the user to paste the API key into chat.

```bash
# project-root .env
SURGEPIX_API_KEY=your-token
SURGEPIX_BASE_URL=https://api.surgepix.ai/api
```

Script path: `<skills-dir>/surgepix-generate-logo/scripts/generate_logo.mjs`.

---

## Usage Examples

**Brand name only (sync):**
```bash
node "<skills-dir>/surgepix-generate-logo/scripts/generate_logo.mjs" \
  --brand-name "NovaByte" \
  --prompt "Minimal geometric monogram, primary #2563EB"
# {"ok":true,"taskId":"...","sessionId":123,"progress":"succeeded","download":"https://example.com/files/result"}
```

**With local reference and opaque background:**
```bash
node "<skills-dir>/surgepix-generate-logo/scripts/generate_logo.mjs" \
  --brand-name "NovaByte" \
  --reference ./moodboard.png \
  --transparent false \
  --size 1024x1024
```

**Async:**
```bash
node "<skills-dir>/surgepix-generate-logo/scripts/generate_logo.mjs" \
  --brand-name "NovaByte" \
  --nowait true
# Then: node "<skills-dir>/surgepix-query-task/scripts/query_task.mjs" <taskId>
```

---

## Workflow

### Step 0: Check environment

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

- Exit 0 → continue
- Exit 1 → follow **surgepix-setup** (user writes `.env` themselves)

### Step 1: Collect inputs

- **Required:** brand/product name → `--brand-name`
- **Optional:** design notes → `--prompt` (match user language)
- **Optional:** size — only `1024x1024` / `1024x1536` / `1536x1024`
- **Optional:** `--reference` (repeatable), `--transparent` (default true), `--session-id`, `--nowait`

### Step 2: Run

```bash
node "<skills-dir>/surgepix-generate-logo/scripts/generate_logo.mjs" \
  --brand-name "<name>" \
  [--prompt "<text>"] \
  [--size <1024x1024|1024x1536|1536x1024>] \
  [--reference <path-or-url> ...] \
  [--transparent <true|false>] \
  [--session-id <id>] \
  [--nowait <true|false>]
```

### Step 3: Present result

- Success: show **only** `download` (and `sessionId` for retries)
- Async: show `taskId` + hint to use **surgepix-query-task**
- Never invent image URLs; never echo API keys

---

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--brand-name` | Yes | — | Brand or product name |
| `--prompt` | No | — | Extra design requirements |
| `--size` | No | API default `1024x1024` | `1024x1024` / `1024x1536` / `1536x1024` |
| `--reference` | No | — | Reference image path or URL (repeatable) |
| `--transparent` | No | `true` | Transparent background |
| `--session-id` | No | auto | Reuse session on iteration |
| `--nowait` | No | `false` | `true` = return `taskId` only |

---

## Notes

- Default transparent background; pass `--transparent false` for opaque.
- Download links may expire; tell the user to save promptly.
- **Never** pass local paths to the API — the script uploads references.
- On missing env → **surgepix-setup**, do not collect secrets in chat.
