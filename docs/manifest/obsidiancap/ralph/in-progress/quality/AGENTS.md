# AGENTS.md — Quality Sweep Loop

## Build & Run

- Ralph loop runs from `ralph/in-progress/quality/`. Monorepo root is `../../../` (3 levels up).
- Use **pnpm only** (no npm/yarn). All commands run from monorepo root unless noted.
- Do NOT start the dev server unless explicitly asked.

## Validation Commands (run from monorepo root)

```bash
# Biome — primary gate for this loop
pnpm biome check --reporter=summary         # show error/warning counts by rule
pnpm biome check --write                    # auto-fix safe fixes (imports, formatting)
pnpm biome check --write --unsafe           # auto-fix including semantic changes — review diff!

# TypeScript
pnpm tsc --noEmit                           # type check entire monorepo

# Tests (targeted)
pnpm --filter @capsule/api test             # API tests
pnpm --filter @capsule/app test             # App tests
pnpm --filter @capsule/api test command-board  # Command Board tests only

# Build (only if needed)
pnpm turbo build --filter=@capsule/app
```

## Key Source Locations

- API routes: `apps/api/app/api/**/*.ts`
- Frontend: `apps/app/app/**/*.ts`, `apps/app/app/**/*.tsx`
- Command Board UI: `apps/app/app/(authenticated)/command-board/`
- Command Board API: `apps/api/app/api/command-board/`
- Chat/agent tools: `apps/app/app/api/command-board/chat/`
- Shared packages: `packages/ai/`, `packages/database/`, `packages/manifest-adapters/`, `packages/manifest-ir/`
- Tests — API: `apps/api/__tests__/`
- Tests — App: `apps/app/__tests__/`
- Tests — Command Board: `apps/api/__tests__/command-board/`, `apps/app/__tests__/api/command-board/`

## Codebase Rules (from parent AGENTS.md)

- No explicit `any` — use proper types, `unknown` + type guard, or Zod-parsed types
- No raw errors thrown to API users — always return typed JSON error responses
- Prisma/Neon for database — no raw string SQL concatenation
- Ultracite/Biome for lint — no ESLint
- pnpm only — no npm/yarn
- Conventional commits: `fix(quality): <why-focused message>`

## Biome Auto-Fix Workflow

```bash
# Step 1: Safe auto-fix (imports, formatting, simple style)
pnpm biome check --write

# Step 2: Check what remains
pnpm biome check --reporter=summary

# Step 3: Unsafe auto-fix (only after reviewing diff)
pnpm biome check --write --unsafe
git diff --stat  # review what changed

# Step 4: Verify no regressions
pnpm tsc --noEmit
pnpm --filter @capsule/api test
```

## Sentry Instrumentation Pattern

```typescript
// Already set up in the project — use existing Sentry SDK
import * as Sentry from '@sentry/nextjs';

// In API route catch blocks:
Sentry.captureException(error, {
  tags: { component: 'command-board', route: '/api/command-board/boards' },
  extra: { boardId, userId },
});

// In React error boundaries:
Sentry.captureException(error, {
  tags: { component: 'board-shell' },
});
```

## Command Board Test Database

- Test DB is a Neon branch — check `.env.test` or `.env.local` for `DATABASE_URL`
- Seed helpers: look in `apps/api/__tests__/helpers/` or `packages/database/src/seed/`
- Real-data tests go in: `apps/api/__tests__/command-board/real-data/`

## Operational Notes

- Keep this file (`AGENTS.md`) operational only — progress and findings go in `IMPLEMENTATION_PLAN.md`
- After learning a new command or pattern, add it here briefly
- `pnpm biome check --reporter=summary` takes ~1s — use it liberally to confirm progress
- When fixing `noExplicitAny`: prefer `unknown` + type narrowing over casting. If the type is truly dynamic (e.g. Prisma raw result), use a typed interface.
- For `noNonNullAssertion` (`!`): only keep `!` where the type system genuinely can't infer non-null (e.g. after DOM query). Add `// biome-ignore lint/style/noNonNullAssertion: <reason>`.
