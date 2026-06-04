---
name: surgepix-generate-presentation
description: Generate a PowerPoint (PPTX) presentation using the SurgePix API, returning a download URL. Use when the user says "generate ppt", "生成PPT", "做一个演示文稿", "make slides", "create a presentation", or wants slides from a topic or outline.
---

# SurgePix Generate Presentation

Generate a presentation (PPTX) from a topic prompt and/or outline documents, and get a download URL.

## When to use

- User says "生成PPT", "做个演示文稿", "generate ppt", "make slides", "create a presentation"
- User provides a topic, key points, or an outline document (local file or URL)

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

At least one of `--prompt` or `--outline` is required.

- **Local outline file** → script uploads automatically, then calls API
- **Outline URL** → script uses it directly

### Step 2: Run generate-presentation

```bash
node "<skills-dir>/surgepix-generate-presentation/scripts/generate_presentation.mjs" \
  [--prompt "<text>"] [--outline "<path-or-url>" ...] \
  [--n <5-30>] [--aspect-ratio <16:9>] [--style <name>] \
  [--language <zh|en|ja>] [--session-id <id>]
```

| Flag | Description |
|------|-------------|
| `--prompt <text>` | 演示文稿主题、目的和核心要点 |
| `--outline <path-or-url>` | 大纲文档（本地路径自动上传，可重复传多个） |
| `--n <5-30>` | 幻灯片数量，默认 10 |
| `--aspect-ratio <ratio>` | 画面比例，默认 16:9（如 16:9、4:3） |
| `--style <name>` | 版式预设：modern / corporate / creative / minimal / tech |
| `--language <code>` | 输出语言：zh / en / ja |
| `--session-id <id>` | 会话 ID，迭代调整时传入上次返回的 sessionId |

脚本固定使用异步模式（内部 `noWait=true`），提交后自动轮询任务状态直到完成。

### Step 3: Parse output

**Success** (stdout):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"https://...presentation.pptx"}
```

**Failure** (stderr):

```json
{"ok":false,"error":"..."}
```

### Step 4: Present result

- Show the `download` URL (PPTX file)
- Save `sessionId` if the user wants to iterate on the same presentation

## Rules

- ALWAYS run check_env before first use in a session
- Provide at least `--prompt` or `--outline`
- `--n` must be an integer between 5 and 30
- NEVER pass local outline paths to the API — script handles upload internally
- NEVER invent download URLs
- NEVER echo auth tokens
