# AI Repro Harness + Actionable Fixes

This folder captures known-good repros and a shared checklist for improving AI
agent outcomes in this repo. Keep it small, practical, and updated whenever we
learn a new recurring mistake or limitation.

## Actionable Fixes (Do These)

### 1) Use AI on _known_ problems first

- Maintain a small folder of solved issues (1–3) as reproducible benchmarks.
- Each repro must include:
  - failing state (commit hash or branch)
  - exact error message
  - minimal reproduction steps
  - expected fix

### 2) Stop large-context dumps

- Never paste full repo or large files into prompts.
- Provide only:
  - exact error text
  - precise file(s)
  - reproduction steps
- Let the agent search from there.

### 3) Keep AGENTS/CLAUDE MD tiny + corrective

- Add only “gotchas we saw” (one-liners).
- If a mistake repeats, add one line to the agent doc.
- Avoid generic templates or verbose docs.

### 4) Fix broken environment/tooling now

- Ensure root-level commands work without special `cd` hacks:
  - `pnpm check` works from repo root
  - lint/typecheck doesn’t fail due to config path issues
- Treat tooling errors as first-class bugs.

### 5) Eliminate “ghost errors”

- Remove or fix known, pre-existing lint/typecheck errors.
- If an error is expected, document it in the agent doc.

### 6) Avoid MCP/skill bloat

- Default to zero MCP servers unless a specific gap exists.
- If you add one, document:
  - why it exists
  - what specific recurring issue it solves
- Remove unused MCPs after a week.

### 7) Use Plan Mode to reset bad prompts

- If output is bad, restart the prompt—don’t append instructions.
- Fix either the plan or the agent doc, not just the response.

### 8) Require exact errors + verification

- Always provide exact error text + context (logged-in/out, browser, etc.).
- If UI-related, use Playwright or browser tooling to verify.

## Templates

- `repro-template.md`: Use this for each known-fix repro.
