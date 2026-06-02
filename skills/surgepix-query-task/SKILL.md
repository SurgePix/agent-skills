---
name: surgepix-query-task
description: Query or poll SurgePix async task status and get task results (download URL). Use when the user says "check task", "poll task", "query task status", "任务进度", "查任务", has a taskId from remove-background or other async API, or needs to wait for a task to finish.
---

# SurgePix Query Task

Query task progress via `GET /tasks/{taskId}` and optionally poll until completion.

## When to use

- User has a `taskId` from an async SurgePix API (e.g. remove-background)
- User says "check task status", "poll task", "查任务进度", "任务完成了吗"
- After submitting an async task, need to wait for `download` URL

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` configured (see Step 0)

## Workflow

### Step 0: Check environment (required)

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

- **Exit 0** → proceed
- **Exit 1** → follow **surgepix-setup** skill first

### Step 1: Get taskId

The user should provide a task ID returned by an async API, e.g.:

```json
{"taskId":"task_a1b2c3d4e5f6","progress":"processing"}
```

If the user just submitted remove-background in async mode, use the `taskId` from that response.

### Step 2: Query or poll

**Single query** (check current status once):

```bash
node "<skills-dir>/surgepix-query-task/scripts/query_task.mjs" "<taskId>"
```

**Poll until done** (wait for succeeded/failed):

```bash
node "<skills-dir>/surgepix-query-task/scripts/query_task.mjs" "<taskId>" --poll
```

| Flag | Description |
|------|-------------|
| `--poll` | Poll until `progress` is `succeeded` or `failed` |
| `--interval <sec>` | Poll interval, default 2 |
| `--timeout <sec>` | Poll timeout, default 300 |

### Step 3: Parse output

**Success** (stdout):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"https://...result.png","taskResult":{"download":"https://..."}}
```

**Still processing** (single query):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"processing","download":null,"taskResult":null}
```

→ Run again with `--poll` or wait and re-query.

**Failure** (stderr):

```json
{"ok":false,"error":"Task not found: task_xxx"}
```

### Step 4: Present result

| progress | Meaning | Action |
|----------|---------|--------|
| `processing` | Still running | Poll again or use `--poll` |
| `succeeded` | Done | Show `download` URL |
| `failed` | Failed | Tell user, no download available |

## Typical flow with remove-background

```
1. remove-background (async) → returns taskId
2. query_task.mjs <taskId> --poll → returns download URL
```

## Rules

- ALWAYS run check_env before first use
- NEVER invent taskId — only use IDs from API responses
- NEVER invent download URLs — only use `download` from script output
- Task status is retained for 24 hours; expired tasks return 404
