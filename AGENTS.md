# AGENTS.md - Ralph Operational Guide

## Repo Specifics

- **Turborepo monorepo** managed with pnpm (NEVER npm/yarn)
- **Stack**: Prisma + Neon Postgres, Clerk auth, Ably realtime
- **Multi-tenant**: Shared DB with `tenantId` column (NOT per-tenant databases)
- **Priority order**: Kitchen tasks → Events → Scheduling → CRM → Inventory
- **ALL MODULES INTERCONNECTED**: Events in CRM must appear in kitchen mobile app
- **Not production-ready**: Investigate issues, don't assume systems work correctly

## Build & Run

```bash
pnpm dev         # All apps in parallel
pnpm dev:apps    # web (port 2222) + app (port 2221)
pnpm build       # Production build
```

## Validation (Backpressure)

Run after implementing functionality. If ANY fail, STOP and update IMPLEMENTATION_PLAN.md:

```bash
pnpm install              # Install dependencies
pnpm check                # Typecheck + lint
pnpm test                 # All tests
pnpm build                # Production build
```

## Database

```bash
pnpm prisma:format        # Format schema
pnpm prisma:generate      # Generate Prisma client
pnpm migrate              # Format + generate + push (use carefully)
```

**CRITICAL**: Database mutations require explicit human approval. Never auto-migrate.

## Operational Rules

- If validation fails: STOP, document in IMPLEMENTATION_PLAN.md, exit without commit
- No stubs/mocks for Ably integrations - implement real or log failure
- Complete implementations only - no placeholders
- Keep this file operational only - status/progress goes in IMPLEMENTATION_PLAN.md
