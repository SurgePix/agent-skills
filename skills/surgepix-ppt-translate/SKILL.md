---
name: surgepix-ppt-translate
description: >-
  Translate a PowerPoint file (PPT/PPTX only) to a target language via SurgePix API and return a download URL. Use when the user says "translate ppt", "翻译PPT", "PPT翻译", "pptx translate", or wants a deck localized. Language: always pass --language as the target (ja / Japanese / 日语 / en / zh, etc.). Do NOT use for pdf/docx — unsupported. Output rule: show ONLY the download URL; NEVER fabricate links.
---

# SurgePix PPT / PPTX Translate

Translate a **`.ppt` / `.pptx`** deck to a target language and return the translated file download URL. **PDF and DOCX are not supported.**

## Language consistency

`--language` is the **target language for the translated deck**, not the agent's reply language. Free-text values are accepted (e.g. `ja`, `Japanese`, `日语`).

| Priority | Rule |
|----------|------|
| 1 | User names a target ("翻译成日文", "to English") → pass that as `--language` |
| 2 | Ambiguous → ask which target language |
| 3 | Never silently pick an unrelated default |

- Reply to the user in the same language they used in their request.

## When to use

- User says "翻译PPT", "PPT翻译", "translate ppt", "translate pptx", "把幻灯片翻成英文"
- User has a local `.ppt`/`.pptx` or a URL to one

## Prerequisites

- Node.js >= 18
- `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` configured (see Step 0)

---

## What the Skill Does

| Action | Description |
|--------|-------------|
| Translate PPT | Upload local file if needed, then call translate API |
| Reject non-PPT | Fail early on pdf/docx (and other extensions) |
| Async / sync | Default poll for result; `--nowait true` returns `taskId` |
| Download | Return `download` URL of the translated pptx |

> Multi-page decks can take a long time — prefer `--nowait true` and **surgepix-query-task** for large files.

---

## Setup

**Requirement:** Set `SURGEPIX_API_KEY` and `SURGEPIX_BASE_URL` via **surgepix-setup**. Do **not** ask the user to paste the API key into chat.

Script: `<skills-dir>/surgepix-ppt-translate/scripts/ppt_translate.mjs`.

---

## Usage Examples

**Local file → Japanese (sync):**
```bash
node "<skills-dir>/surgepix-ppt-translate/scripts/ppt_translate.mjs" \
  ./deck.pptx \
  --language Japanese
```

**URL + async (recommended for long decks):**
```bash
node "<skills-dir>/surgepix-ppt-translate/scripts/ppt_translate.mjs" \
  --path "https://example.com/files/deck.pptx" \
  --language zh \
  --nowait true
# Then query with surgepix-query-task
```

---

## Workflow

### Step 0: Check environment

```bash
node "<skills-dir>/surgepix-setup/scripts/check_env.mjs"
```

### Step 1: Collect inputs

- Source: local `.ppt`/`.pptx` or HTTPS URL
- Target language: required (`--language`)
- If user offers pdf/docx → refuse and ask for ppt/pptx

### Step 2: Run

```bash
node "<skills-dir>/surgepix-ppt-translate/scripts/ppt_translate.mjs" \
  "<path-or-url>" \
  --language "<target>" \
  [--session-id <id>] \
  [--nowait <true|false>]
```

### Step 3: Present result

- Show only API `download` / `taskId`
- Never invent URLs; never expose tokens

---

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `<path-or-url>` / `--path` | Yes | — | Local ppt/pptx or URL |
| `--language` | Yes | — | Target language free text |
| `--session-id` | No | auto | Session for iteration |
| `--nowait` | No | `false` | `true` = async `taskId` |

---

## Notes

- **Only** `.ppt` / `.pptx`. Not pdf/docx.
- Local files are uploaded by the script — never pass raw local paths to the API.
- Missing env → **surgepix-setup**.
