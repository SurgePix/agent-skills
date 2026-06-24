---
name: surgepix-setup
description: Check and configure SurgePix environment before first use. Use when the user first invokes any SurgePix skill, says "setup surgepix", or when SURGEPIX_API_KEY is missing and a SurgePix operation fails.
---

# SurgePix Setup

Pre-flight check and guided setup. **Run this before any other SurgePix skill.**

All SurgePix skills share one portable config: a `.env` file. Scripts auto-load it regardless of which agent you use (Claude Code, Codex, Cursor, Gemini CLI, OpenClaw, etc.).

## When to use

- **Automatically** before upload or remove-background if env is not configured
- User says "setup surgepix", "configure surgepix"
- Any SurgePix script fails with "API_KEY not found"

## Workflow

### Step 1: Check environment

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

**Configured** (exit 0):

```json
{"ok":true,"configured":true,"sources":["/path/to/.env"],"baseUrl":"https://...","apiKeyPreview":"sk-abc...xyz"}
```

→ Tell user env is ready, proceed with the original task.

**Not configured** (exit 1):

```json
{"ok":true,"configured":false,"hint":"Create .env with SURGEPIX_API_KEY=..."}
```

→ Continue to Step 2.

### Step 2: Guide user to get API Key

> SurgePix API Key is not configured.
>
> **How to get one:**
> 1. Sign in to [SurgePix Console](https://surgepix.ai)
> 2. Go to Account Settings → API Keys
> 3. Create a new key and copy the Bearer Token

Ask: "Please provide your API Key and I'll configure it."

### Step 3: Write `.env` (portable, works on all agents)

After user provides the key, write `.env` in the project root:

```bash
cat > .env << 'EOF'
SURGEPIX_API_KEY=<user-provided-key>
SURGEPIX_UPLOAD_FOLDER=files
EOF
```

`SURGEPIX_API_KEY` is the **only required config**. Do **not** hardcode the API base URL here — `check_env.mjs` (Step 4) writes `SURGEPIX_BASE_URL` into `.env` automatically if it is missing, and every other skill simply reads it from the environment.

### Step 4: Verify (also initializes `SURGEPIX_BASE_URL`)

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

This step also ensures `SURGEPIX_BASE_URL` exists in your local `.env` (writing the environment default the first time). Must exit 0. Then proceed with the user's original task.

### Step 5: Protect secrets

```bash
grep -q "^\.env$" .gitignore 2>/dev/null || echo ".env" >> .gitignore
```

## Config priority (scripts handle this automatically)

1. Shell env (`export SURGEPIX_API_KEY=...`) — highest priority
2. `.env` in cwd or parent directories — **recommended, portable**
3. `.claude/settings.local.json` — Claude Code optional fallback
4. `~/.claude/settings.local.json` — Claude Code global fallback

## Rules

- NEVER echo the full API key after configuration
- NEVER commit `.env` to git
- Always use `.env` as primary config (not platform-specific files)
- After setup, immediately proceed with the user's original task
