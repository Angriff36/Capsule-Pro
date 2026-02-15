# AGENTS.md — Convoy (Ralph Wiggum Loop)

This file defines **operational context** for Ralph Wiggum loops. It is read on
every iteration.

It is NOT an architecture document. It is NOT a design proposal. It is NOT a
planning scratchpad.

---

## Project Type

- Monorepo
- Package manager: pnpm (ONLY)
- Primary folders:
  - apps/
  - packages/
  - specs/

---

## Build & Validation Conventions

- Use pnpm only (no npm, no yarn)
- Prefer the smallest possible validation:
  - Targeted tests
  - Targeted typecheck
- Do NOT run full monorepo builds unless required to validate the task
- ALWAYS ADD FULL ERROR LOGGING THIS IS RIDICULOUS

---

## Files to Ignore by Default

Do not read unless explicitly required by the current task:

- docs/inventory/\*\*
- Archived plans
- Historical architecture findings

---

## Execution Mode

- **Autonomous execution**: Do NOT ask for approval before bash/write/edit/task operations. Just do it.
- Skip approval gates — the user trusts the agent to execute directly.
- Still report errors and stop on failures (don't auto-fix blindly), but don't ask permission to start work.

---

## Commit Rules

- Exactly one commit per iteration
- Conventional Commit format
