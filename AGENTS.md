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

---

## Cursor Cloud specific instructions

### Environment

- Node.js 22.x (pinned in `.nvmrc` as `22.18.0`, engine `>=22 <23`)
- pnpm 10.24.0 (via `packageManager` field — corepack or global install)
- Turborepo 2.8.3 for task orchestration

### Dev Servers

| App | Port | Command | Notes |
|-----|------|---------|-------|
| app | 2221 | `pnpm --filter app dev` | Requires Clerk keys to go past sign-in |
| web | 2222 | `pnpm --filter web dev` | Requires BaseHub CMS token |
| api | 2223 | `pnpm --filter api dev` | Requires DB + Clerk + Stripe |
| docs | 2224 | `pnpm --filter docs dev` | No external deps — starts cleanly |
| email | 2225 | `pnpm --filter email dev` | React Email preview |
| storybook | 6006 | `pnpm --filter storybook dev` | Component library |

Run all: `pnpm dev` (Turborepo parallel). Run core subset: `pnpm dev:apps` (api + app).

### Key Commands

See `package.json` root scripts. Summary of most-used:
- **Lint**: `pnpm lint` (biome via ultracite)
- **Test**: `pnpm test` (vitest via turbo, runs across all packages)
- **Typecheck**: `pnpm check` (turbo typecheck)
- **Prisma generate**: `pnpm prisma:check`
- **DB migrate (dev)**: `pnpm migrate`

### Gotchas

- The `predev` script runs `pnpm db:check` which requires `DATABASE_URL`. If no real DB is available, dev may fail at startup for apps that import from `@repo/database`. The `docs` app has no DB dependency and starts cleanly.
- Prisma client is generated during `pnpm install` via the `packages/database` postinstall hook. If generation fails, run `pnpm prisma:check` manually.
- The ultracite patch (`patches/ultracite.patch`) may warn during install — this is cosmetic and does not break functionality.
- Pre-existing lint errors (~1000+) and some test failures related to `@repo/manifest-adapters/prisma-idempotency-store` import exist in the codebase.
- `.env.local` files must be created from `.env.example` in `apps/app`, `apps/api`, `apps/web`, and root. The `packages/database` uses `.env` (not `.env.local`).
- The husky `pre-push` hook is disabled (exits 0). The `pre-commit` hook runs biome formatting on staged files.
- **Clerk auth in Cloud VMs**: Direct sign-in via password triggers email verification ("new device" policy). To bypass, use Clerk Backend API sign-in tokens: create a token via `POST https://api.clerk.com/v1/sign_in_tokens` with the user ID, then navigate to `http://localhost:2221/sign-in?__clerk_ticket=<token>`. The token must be used immediately (short TTL). A Clerk testing token (`POST /v1/testing_tokens`) can bypass CAPTCHA but not email verification on its own.
