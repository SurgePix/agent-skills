---
name: surgepix-query-task
description: Query or poll SurgePix async task status and get task results (download URL). Use when the user says "check task", "poll task", "query task status", "任务进度", "查任务", has a taskId from remove-background or other async API, or needs to wait for a task to finish.
---

# SurgePix Query Task

Query task progress via `GET /tasks/{taskId}` once and print the current status. This skill does **not** poll — it returns the task's current state in a single call; re-run it later to check again.

## When to use

- User has a `taskId` from an async SurgePix API (e.g. remove-background / generate-poster / generate-presentation 在 `--nowait true` 时返回的 `taskId`)
- User says "check task status", "poll task", "查任务进度", "任务完成了吗"
- After submitting an async task, need to check whether the `download` URL is ready
- 上游技能以 `--nowait true`（异步）方式运行，返回 `{"async":true,"taskId":...}` 后，用本技能在合适时机查询该任务（单次查询；未完成则稍后再查）

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

If the user just submitted remove-background / generate-poster / generate-presentation 以 `--nowait true`（异步）模式运行，use the `taskId` from that response（响应中 `async:true`）。

### Step 2: Query (single call, no polling)

Check the current status once and print the result:

```bash
node "<skills-dir>/surgepix-query-task/scripts/query_task.mjs" "<taskId>"
```

| Argument | Description |
|----------|-------------|
| `<taskId>` | Task ID from an async API (e.g. `task_abc123`) |

> This skill performs a **single query** and prints the current status — it does not poll/wait. If the task is still `processing`, simply run the command again later to check.

### Step 3: Parse output

**Success** (stdout):

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"succeeded","download":"https://...result.png","taskResult":{"download":"https://..."}}
```

**Still processing**:

```json
{"ok":true,"taskId":"task_xxx","sessionId":123,"progress":"processing","download":null,"taskResult":null}
```

→ Wait a bit and run the same command again to re-check.

**Failure** (stderr):

```json
{"ok":false,"error":"Task not found: task_xxx"}
```

### Step 4: Present result

| progress | Meaning | Action |
|----------|---------|--------|
| `processing` | Still running | Re-run the query later to check again |
| `succeeded` | Done | Show `download` URL |
| `failed` | Failed | Tell user, no download available |

## Typical flow with async skills

适用于 remove-background / generate-poster / generate-presentation 以 `--nowait true` 运行：

```
1. <skill> --nowait true → returns {"async":true,"taskId":...}
2. query_task.mjs <taskId> → prints current status (download URL once succeeded)
3. 若仍为 processing，稍后重复第 2 步再查，直到 succeeded / failed
```

> 若上游技能以 `--nowait false`（默认，同步）运行，脚本内部已轮询并直接返回 `download`，无需再调用本技能。

## Rules

- ALWAYS run check_env before first use
- NEVER invent taskId — only use IDs from API responses
- NEVER invent download URLs — only use `download` from script output
- Task status is retained for 24 hours; expired tasks return 404
