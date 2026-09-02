---
name: surgepix-generate-storyboard
description: >-
  Generate a single storyboard image with multiple shots from a shot script via SurgePix. Use when the user says "分镜头", "故事板", "分镜剧本", "storyboard", "shot list", or wants a multi-panel storyboard from a script. Language: write --script in the user's conversation language. Output rule: show ONLY the download URL from script stdout verbatim in a code block; NEVER fabricate or retype URLs.
---

# SurgePix Generate Storyboard

Generate **one** storyboard image containing multiple shots from a shot script, with optional reference images (local paths auto-uploaded to URLs).

## Language consistency

Match the **user's conversation language** for `--script` — unless the user explicitly requests another language.

| User writes in | Write `--script` in |
|----------------|---------------------|
| English | English |
| 中文 | 中文 |
| 日本語 | 日本語 |

- Reply to the user in the same language they used in their request.

## When to use

- User says "分镜头", "故事板", "分镜剧本", "storyboard", "shot list", "分镜图"
- User provides a multi-shot script and wants a single multi-panel storyboard image

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` configured (see **surgepix-setup**)

---

## What the Skill Does

| Action | Description |
|--------|-------------|
| Generate storyboard | Create one multi-shot storyboard PNG from a script |
| Upload references | Local `--reference` paths are uploaded automatically (API accepts URLs only) |
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

Script path: `<skills-dir>/surgepix-generate-storyboard/scripts/generate_storyboard.mjs`.

---

## Usage Examples

**Script only (sync):**
```bash
node "<skills-dir>/surgepix-generate-storyboard/scripts/generate_storyboard.mjs" \
  --script "第一个镜头：主角站在黄昏海边；第二个镜头：海面上出现帆船；第三个镜头：主角微笑；第四个镜头：帆船驶向远方" \
  --count 4 \
  --aspect-ratio 4:3
# {"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"<DOWNLOAD_URL>"}
# `<DOWNLOAD_URL>` 仅为文档占位；真实 HTTPS 下载地址以脚本 stdout 为准。
```

**With local reference:**
```bash
node "<skills-dir>/surgepix-generate-storyboard/scripts/generate_storyboard.mjs" \
  --script "Shot 1: wide establishing; Shot 2: close-up" \
  --reference ./style-ref.png \
  --count 2
```

**Async:**
```bash
node "<skills-dir>/surgepix-generate-storyboard/scripts/generate_storyboard.mjs" \
  --script "..." \
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

- **Required:** shot script → `--script`
- **Optional:** `--count` (1–12, default 4), `--aspect-ratio` (default `4:3`)
- **Optional:** `--reference` (repeatable, max 10; local path or URL), `--session-id`, `--nowait`

### Step 2: Run

```bash
node "<skills-dir>/surgepix-generate-storyboard/scripts/generate_storyboard.mjs" \
  --script "<text>" \
  [--count <1-12>] \
  [--aspect-ratio <ratio>] \
  [--reference <path-or-url> ...] \
  [--session-id <id>] \
  [--nowait <true|false>]
```

### Step 3: Present result

- Success: paste **only** the `download` value from script stdout **verbatim** inside a fenced code block (or raw URL line). Do **not** retype the hostname; do **not** “fix” or shorten the URL.
- Always show `sessionId` (number) for retries.
- Async: show `taskId` + hint to use **surgepix-query-task**
- Never invent image URLs; never echo API keys

---

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--script` | Yes | — | Shot script text |
| `--count` | No | `4` | Number of shots (1–12) |
| `--aspect-ratio` | No | `4:3` | Image aspect ratio |
| `--reference` | No | — | Reference image path or URL (repeatable, max 10) |
| `--session-id` | No | auto | Reuse session on iteration |
| `--nowait` | No | `false` | `true` = return `taskId` only |

---

## Notes

- Backend accepts **URL-only** references; the script uploads local files first.
- Calls `POST /tasks/generate-storyboard` (backend task API), not `/skills/*`.
- Download links may expire; tell the user to save promptly.
- On missing env → **surgepix-setup**, do not collect secrets in chat.
