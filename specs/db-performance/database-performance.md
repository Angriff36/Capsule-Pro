# Database performance — Neon + Prisma configuration correctness

## Job statement

Developers and users experience multi-second latency on ordinary pages and API calls. The job is to make database access fast by bringing our Neon + Prisma setup into line with the official Neon and Prisma documentation, and by fixing proven hot-path inefficiencies — not by rearchitecting.

## Current setup (verified facts, 2026-07-12)

- Neon Postgres, `ep-square-dust-ahkgd519.c-3.us-east-1.aws.neon.tech`, database `neondb`, 13 schemas (multi-schema Prisma setup).
- Prisma 7.8.0; generated client output at `packages/database/generated`; schema split across `packages/database/prisma/schema/manifest.prisma` (generated — NEVER hand-edit) and `infra.prisma` (hand-owned).
- Migration CLI uses the **direct** (non-pooler) endpoint via `packages/database/.env` per Neon guidance; `SHADOW_DATABASE_URL` in `.env.local`.
- App runtime: Next.js dev servers (`apps/app`, `apps/api`); the API boots on an embedded IR and dispatches Manifest commands; reads go through Prisma.
- `pnpm db:check` is a strict drift gate and must stay clean.

## Acceptance criteria (behavioral — WHAT, not HOW)

- [ ] Every deviation between our runtime connection configuration and the official Neon + Prisma guidance is either fixed or documented with a reason (pooled vs direct endpoints for runtime vs migrations, `connection_limit`/`pool_timeout` fit for serverless/dev, driver adapter guidance, `pgbouncer` flag correctness).
- [ ] Prisma client instantiation follows the documented singleton pattern everywhere (no per-request client construction anywhere in `apps/`).
- [ ] The top slow query paths in the app's list/detail routes are identified with evidence (timings or query plans), and each is either fixed (index, query shape, N+1 removal) or documented as inherent.
- [ ] Any index added is justified by a measured hot path and lands via a proper migration.
- [ ] A before/after latency comparison exists for at least three representative routes, proving improvement or explaining why latency is not database-bound (e.g. Next.js dev compilation dominates).
- [ ] `pnpm db:check` clean and `pnpm manifest:ci` green at every commit.

## Constraints

- NEVER hand-edit `packages/database/prisma/schema/manifest.prisma` or any generated artifact; model-shape changes go through `manifest/source/**.manifest` + `pnpm manifest:build`.
- NEVER commit secrets; connection strings live in gitignored `.env` files only.
- Do not modify `manifest/source/**` business rules for this work — this spec is about database configuration and query performance, not domain logic.
- The dev database is disposable (basically empty); migrations may be applied with `pnpm db:deploy` after reviewing the SQL.

## Out of scope

- Next.js compile-time performance (webpack/turbopack) — measure it to *attribute* latency correctly, but fixing it is a separate effort.
- The Manifest native-source rewrite (separate plan, `manifest/NATIVE-REWRITE-PLAN.md`).
- Swapping databases, ORMs, or hosting.

## Reference documentation (compare against these, fetch current versions)

- https://neon.com/docs/guides/prisma (endpoints, pooling, pgbouncer flag)
- https://neon.com/docs/connect/connection-pooling
- https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections (connection pool sizing, serverless guidance)
- https://www.prisma.io/docs/orm/overview/databases/neon (driver adapter guidance)
