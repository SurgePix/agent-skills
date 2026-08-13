---
name: surgepix-setup
description: Check and configure SurgePix environment before first use. Use when the user first invokes any SurgePix skill, says "setup surgepix", or when SURGEPIX_API_KEY / SURGEPIX_BASE_URL is missing and a SurgePix operation fails.
---

# SurgePix Setup

Pre-flight check and guided setup. **Run this before any other SurgePix skill.**

All SurgePix skills share one portable config: a `.env` file. Scripts auto-load it regardless of which agent you use (Claude Code, Codex, Cursor, Gemini CLI, OpenClaw, etc.).

## Language consistency

Reply to the user in the **same language they used** in their request. All other SurgePix skills follow the same rule for both agent replies and generated on-image text.

## When to use

- **Automatically** before any SurgePix skill if env is not configured
- User says "setup surgepix", "configure surgepix"
- Any SurgePix script fails with missing `SURGEPIX_API_KEY` or `SURGEPIX_BASE_URL`

## Workflow

### Step 1: Check environment

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

**Configured** (exit 0):

```json
{"ok":true,"configured":true,"sources":["/path/to/.env"],"baseUrl":"<SURGEPIX_BASE_URL>"}
```

→ Tell user env is ready, proceed with the original task.

**Not configured** (exit 1):

```json
{"ok":true,"configured":false,"missing":["SURGEPIX_API_KEY","SURGEPIX_BASE_URL"],"hint":"<HINT>"}
```

→ Continue to Step 2.

### Step 2: Guide user to configure themselves

> SurgePix is not configured.
>
> **How to get an API Key:**
> 1. Sign in to [SurgePix Console](https://surgepix.ai)
> 2. Go to Account Settings → API Keys
> 3. Create a new key and copy the Bearer Token
>
> **How to configure (do this yourself — do not paste secrets into chat):**
> Create a `.env` file in the project root with:
>
> ```
> SURGEPIX_API_KEY=<your-token>
> SURGEPIX_BASE_URL=https://api.surgepix.ai/api
> ```
>
> For local/test environments, set `SURGEPIX_BASE_URL` to the test API host instead.
> Or export the same variables in your shell.
>
> Tell the agent when you are done so it can re-check.

**NEVER** ask the user to paste their API key into the chat.
**NEVER** accept an API key from the user and write it into `.env` (or any file) yourself.
**NEVER** interpolate a user-provided key into shell commands, heredocs, or tool arguments.
**NEVER** invent or hardcode `SURGEPIX_BASE_URL` in scripts — the user/agent must set it in `.env` or the shell.

### Step 3: Verify after user configures

After the user confirms configuration, re-run:

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

Must exit 0. Then proceed with the user's original task.

If still not configured, show `missing` from the JSON and remind them of Step 2 — do not collect secrets via chat.

Both `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` are **required**. Scripts do not invent a default base URL.

### Step 4: Protect secrets

```bash
grep -q "^\.env$" .gitignore 2>/dev/null || echo ".env" >> .gitignore
```

## Config priority (scripts handle this automatically)

1. Shell env (`export SURGEPIX_API_KEY=...` / `SURGEPIX_BASE_URL=...`) — highest priority
2. `.env` in cwd or parent directories — **recommended, portable**
3. `.claude/settings.local.json` — Claude Code optional fallback
4. `~/.claude/settings.local.json` — Claude Code global fallback

## Rules

- NEVER ask for, accept, echo, or write the API key from chat/tool input
- NEVER commit `.env` to git
- Always use `.env` as primary config (not platform-specific files)
- Verify both `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` via `check_env.mjs`
- After setup, immediately proceed with the user's original task
