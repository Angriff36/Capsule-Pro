# AGENTS.md — Convoy (Ralph Wiggum Loop)

This file defines **operational context** for Ralph Wiggum loops. It is read on
every iteration.

It is NOT an architecture document. It is NOT a design proposal. It is NOT a
planning scratchpad.

If something is not needed every iteration, it does not belong here.

---

## Project Type

- Monorepo
- Package manager: pnpm (ONLY)
- Primary folders:
  - apps/
  - packages/
  - specs/

---

## Allowed Agent Behavior

Ralph Wiggum:

- Executes ONE small task per iteration
- Uses IMPLEMENTATION_PLAN.md as task source of truth
- Stops after one commit or one documented blocker

Ralph must NOT:

- Expand scope
- Fix unrelated issues
- Refactor for cleanliness
- Invent missing requirements
- Read large architecture or historical docs unless explicitly told

---

## Build & Validation Conventions

- Use pnpm only (no npm, no yarn)
- Prefer the smallest possible validation:
  - Targeted tests
  - Targeted typecheck
- Do NOT run full monorepo builds unless required to validate the task

---

## Files to Ignore by Default

Do not read unless explicitly required by the current task:

- docs/inventory/**
- Archived plans
- Historical architecture findings
- Generated folders (.next, dist, build output)
- pnpm store directories

---

## Commit Rules

- Exactly one commit per iteration
- Conventional Commit format
- No tags
- No version bumps unless required by the task

---

## When Blocked

If blocked:

- Document the blocker in IMPLEMENTATION_PLAN.md
- STOP
- Do not attempt alternate tasks

This is intentional.
