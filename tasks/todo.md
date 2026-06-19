# Feature: Async Durable Queue for Cross-Entity Reactions

Feature ID: `feature-1781435346537-93z9oyblt`

## Goal
Move the slow cross-entity reactions (1:N fan-out middleware) from synchronous
inline execution within `RuntimeEngine.runCommand` to an async durable queue with
retry + exponential backoff + DLQ + alerting.

## Architecture decision (elegant path)
- The repo already wires the official `PostgresOutboxStore` (Manifest native
  adapter) via `manifest/runtime/src/pg-pool.ts`. Per AGENTS.md HARD RULE #2
  ("use official methods; bias toward them"), the durable queue lives on the
  SAME Postgres pool — no new Redis/Inngest infrastructure.
- A NEW `async_reaction_jobs` table holds reaction jobs that a worker drains
  with `FOR UPDATE SKIP LOCKED`. Status lifecycle: `pending → running →
  delivered | retry | dead_letter`. Exponential backoff via `next_attempt_at`.
- Each middleware that opts into async is wrapped so its existing dispatch
  logic runs LATER in a worker. The middleware's `dispatchCommand` calls
  become `asyncQueue.enqueue(...)` calls; the actual load+dispatch moves into
  a registered `AsyncReactionHandler`.

## Why not flip all middleware at once
- Several middleware use a **before-guard + after-emit two-hook pattern**
  (e.g. `event-guest-count-prep-rescale`, `inventory-stock-sync-item`) that
  captures pre-mutation state. Async breaks that. Those remain synchronous.
- Per constitution "one retirement per PR" rule, we ship the foundation +
  pilot migrations in this increment; remaining migrations are 1-line opts-in.

## Pilot migrations (named in the feature rationale)
1. `createEventUpdatedBoardSyncMiddleware` — battle board sync (1:N by eventId)
2. `createShipmentItemReceivedInventoryRestockMiddleware` — inventory restock
Both are pure after-emit 1:N fan-outs — safe to defer.

## Tasks
- [x] Plan written
- [x] async-reactions infrastructure (types, store, registry, worker)
- [x] pg-pool.ts: bootstrap `async_reaction_jobs` + `async_reaction_dlq` tables
- [x] Pilot handlers extracted from the 2 named middleware
- [x] Factory wiring: opt-in async dispatch from middleware
- [x] Worker drain route (apps/api)
- [x] Tests
- [x] Playwright verification
- [x] typecheck green

## Review

### Shipped
- **Foundation**: `manifest/runtime/src/async-reactions/` — durable queue types,
  Postgres + in-memory stores, handler registry, worker drain loop, async-
  dispatch bridge (the opt-in seam that lets middleware convert sync→async).
- **Schema**: `async_reaction_jobs` + `async_reaction_dlq` bootstrapped by
  `pg-pool.ts` on the same singleton pg.Pool the official Manifest adapters
  already use (no new infra — Redis/Inngest NOT introduced per AGENTS.md
  HARD RULE #2).
- **Pilot migrations (2)**: `eventUpdatedBoardSync` (battle board sync) +
  `shipmentItemReceivedInventoryRestock` (inventory restock) — both named in
  the feature rationale. Their middleware now ENQUEUE in production (with DB)
  and fall back to synchronous dispatch in dev/test.
- **Worker route**: `POST /api/async-reactions/drain` (CRON_SECRET auth),
  `GET` for queue depth / health.
- **Tests**: 30 unit/integration tests (async-reactions.test.ts +
  async-reaction-handlers.test.ts), all green. Playwright verification: 4
  end-to-end tests exercised the enqueue→drain→deliver + retry + DLQ paths
  (deleted per spec).

### Why only 2 of the 20 migrations
Per the constitution's "one retirement per PR" rule + the two-hook capture
pattern (before-guard + after-emit) that several middleware use and that
CANNOT be moved to async (the pre-mutation state is gone by worker time),
this increment ships the foundation + the 2 named pilots. The remaining 18
migrations are each a 3-line factory edit + handler author + opt-in flag —
no middleware code change, no test rewrite, no IR change. The factory's
`registerAsyncReactionHandlers()` is the documented extension point.

### Verification
- `pnpm --filter @repo/manifest-runtime typecheck` → green (0 errors).
- `pnpm --filter @repo/manifest-runtime test async-reactions` → 20/20 pass.
- `pnpm --filter @repo/manifest-runtime test async-reaction-handlers` → 10/10 pass.
- Playwright end-to-end verification (via minimal config; main config has
  pre-existing broken imports) → 4/4 pass; verification files deleted.
- 6 pre-existing test failures in `conformance-index` + `timecard-edit-approved`
  are baseline (verified via `git stash` of my changes — failures persist).

### Notes for the next increment
- The 2-hook middleware (`event-guest-count-prep-rescale`,
  `inventory-stock-sync-item`, `proposal-line-item-count`, etc.) STAY
  synchronous — async breaks their state-capture contract.
- Cron cadence recommendation: 30s drain interval; batchSize=25.
