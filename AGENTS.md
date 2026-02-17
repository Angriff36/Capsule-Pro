# AGENTS.md — Operational Guide

## Build & Run

- Monorepo with pnpm (ONLY — no npm, no yarn)
- Primary folders: `apps/`, `packages/`, `specs/`
- Do NOT run full monorepo builds unless required
- Autonomous execution — do not ask for permission

## Validation

Run these after implementing to get immediate feedback:

- Tests (targeted): `pnpm --filter @capsule/app test [specific-test]`
- Typecheck: `pnpm tsc --noEmit`
- Lint: `pnpm biome check`
- Build: `pnpm turbo build --filter=@capsule/app`

## Manifest Commands

- Routes from IR: `pnpm manifest:routes:ir -- --format summary`
- Lint routes: `pnpm manifest:lint-routes`
- After .manifest edits: `pnpm manifest:build`

## Operational Notes

- IR is authority — filesystem is not source of truth for routes
- All mutations compile to Manifest domain commands
- Generated code is projection — never edit generated files
- Exactly one commit per iteration, conventional commit format

### Codebase Patterns

- Command Board UI: `apps/app/app/(authenticated)/command-board/`
- Command Board API: `apps/api/app/api/command-board/`
- AI API: `apps/api/app/api/ai/`
- Shared packages: `packages/ai/`, `packages/database/`
- Specs: `specs/command-board/`
