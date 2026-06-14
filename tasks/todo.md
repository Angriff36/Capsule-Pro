# Task: EventDishCreated/QuantityUpdated → PrepList sync (IMPLEMENTATION_PLAN P1 Event lifecycle)

## Problem (the why)
The event prep list is derived ONCE, at seed time, from the event's dishes
(`prep-list-seed-middleware` on the `EventConfirmed run PrepList.create` shell).
`EventDishCreated` (a dish added AFTER the event is confirmed/seeded) and
`EventDishQuantityUpdated` (a serving-count change) had NO consumer — so a dish
added to a confirmed event never appeared in the kitchen's prep list, and
re-portioning a dish never re-scaled its ingredient demand. Silent
missing-mise-en-place / food-quantity defect.

## Approach (decision)
A **middleware** (not a reaction) on `EventDishCreated` + `EventDishQuantityUpdated`:
- Why middleware: (1) 1:N fan-out (one dish change → many PrepLists → many items);
  (2) the new rows are DERIVED across a cross-store walk the DSL can't express;
  (3) `updateQuantity` carries no `eventId` (the dish's own field) → load the dish.
- **RE-DERIVE + RECONCILE** (not per-dish incremental): the seed aggregates
  ingredients across all dishes by inventory-item id, so a naive single-dish add
  double-counts. Re-derive the FULL demand from the current dishes via the shared
  `deriveSeedLines` (exported from the seed middleware), then reconcile per draft
  list: missing ingredient → create; changed qty → updateQuantity; same → no-op.
- **Preserve guest-count rescale:** target = `derivedScaled × batchMultiplier`.
- **Scope:** draft lists only (finalized are locked; unseeded event = no-op).
- **Defer `EventDishRemoved`:** needs a new `PrepListItem.remove` command
  (source/IR change) — spun out as its own IMPLEMENTATION_PLAN follow-up.

## Steps
- [x] Export `deriveSeedLines` / `assignStation` / `SeedLine` / `DerivationStores`
      from `prep-list-seed-middleware.ts` (single source of truth — no copy).
- [x] `manifest/runtime/src/middleware/event-dish-prep-sync-middleware.ts`
      (after-emit; EventDishCreated + EventDishQuantityUpdated; load EventDish →
      eventId/tenantId; re-derive + reconcile draft lists; bm-aware target).
- [x] Barrel export in `middleware/index.ts`.
- [x] Import + register in `manifest-runtime-factory.ts` (after the guest-count leg).
- [x] Conformance test `event-dish-prep-sync-middleware.test.ts` (5 tests).
- [x] Verify: new test 5/5; runtime suite 287 pass; runtime typecheck exit 0;
      api typecheck exit 0. No IR change → reaction-payload + schema:check gates
      unaffected.
- [x] Update IMPLEMENTATION_PLAN.md (mark add/rescale DONE; spin out the
      `EventDishRemoved` leg as a new open item with the command prerequisite).
- [ ] Commit explicit paths (NEVER `git add -A` — tree carries unrelated
      preview.js/UI workstream changes), push, tag.

## Review
- **Files:** new `event-dish-prep-sync-middleware.ts` + its test; edited
  `prep-list-seed-middleware.ts` (4 `export` keywords), `middleware/index.ts`
  (barrel), `manifest-runtime-factory.ts` (import + registration).
- **No IR/source/schema change** — pure runtime middleware reusing the existing
  derivation; audit-reaction-payloads + schema:check gates are unaffected.
- **Engine-semantics notes captured** in the middleware doc-comment + the plan:
  the re-derive-from-authoritative-state design sidesteps the old-value problem
  the guest-count leg needed a two-hook capture for, and the
  `× batchMultiplier` reconcile target is what keeps a prior guest rescale intact.
- **Deferred leg documented, not silent:** `EventDishRemoved` is a tracked
  IMPLEMENTATION_PLAN item (needs `PrepListItem.remove`).
