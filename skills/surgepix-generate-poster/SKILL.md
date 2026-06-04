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

- **Local reference image** → script uploads automatically, then calls API
- **Reference image URL** → script uses it directly

### Step 2: Run generate-poster

```bash
node "<skills-dir>/surgepix-generate-poster/scripts/generate_poster.mjs" \
  --event-name "<text>" --date "<text>" --venue "<text>" \
  [--prompt "<text>"] [--description "<text>"] [--style <name>] \
  [--size <1080x1920>] [--reference "<path-or-url>" ...] [--session-id <id>]
```

| Flag | Description |
|------|-------------|
| `--event-name <text>` | 海报主标题（必填） |
| `--date <text>` | 活动日期时间（必填），如 2026-06-15 19:00 |
| `--venue <text>` | 海报上展示的地点（必填） |
| `--prompt <text>` | 创作方向（配色、排版等），**不会**印在海报上 |
| `--description <text>` | 印在海报上的宣传语，最多 100 个字符 |
| `--style <name>` | 版式预设：modern / vintage / minimalist / bold |
| `--size <WxH>` | 输出尺寸，默认 1080x1920 |
| `--reference <path-or-url>` | 参考图（本地路径自动上传，可重复传多个） |
| `--session-id <id>` | 会话 ID，迭代调整时传入上次返回的 sessionId |

脚本固定使用异步模式（内部 `noWait=true`），提交后自动轮询任务状态直到完成。`noWait` 由脚本内部写死，Agent 无需也无法传递该参数。

### Step 3: Parse output

**Success** (stdout):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"https://...poster.png"}
```

**Failure** (stderr):

```json
{"ok":false,"error":"..."}
```

### Step 4: Present result

- Show the `download` URL (PNG file)
- Save `sessionId` if the user wants to iterate on the same poster

## Rules

- ALWAYS run check_env before first use in a session
- `--event-name`, `--date`, `--venue` are all required
- `--description` must be at most 100 characters
- NEVER pass local reference image paths to the API — script handles upload internally
- NEVER pass `noWait` — it is hardcoded to `true` inside the script
- NEVER invent download URLs
- NEVER echo auth tokens
