# Task: InventoryTransfer received → per-location InventoryStock movement (P1)

**Source of truth:** IMPLEMENTATION_PLAN.md P1 (Kitchen/Inventory) — "InventoryTransfer
received → stock movement (both levels)". All P0 done; 2.5.0 compile blocker resolved.

## Problem (the why)
`InventoryTransfer` tracks status (draft→…→received) but NOTHING ever moves physical
`InventoryStock` rows when a transfer is received. Verified: no middleware/reaction
consumes `TransferReceived` or `TransferShipped`. So stock that physically moved between
locations is never reflected — per-location balances go permanently stale.

## Mechanism: middleware (NOT reaction). No IR change, no schema, no migration.
On `TransferReceived` (entity InventoryTransfer, command `receive`):
- Load transfer (fromLocationId/toLocationId/tenantId) via `_subject.id`.
- Load `InventoryTransferItem` rows (getAll + filter tenantId+transferId).
- Build `InventoryStock` lookup (getAll + filter tenantId) keyed (itemId, locationId).
- Per item: dispatch `InventoryStock.adjust(delta=-qty)` on source, then `(+qty)` on dest.
  - dest row missing → `InventoryStock.create(qty=0, unitId=sourceStock.unitId)` THEN
    adjust(+qty). create-at-0-then-adjust keeps the aggregate net-zero (create is NOT
    mirrored by the stock-sync middleware; only adjust is).
  - source row missing OR source adjust fails (insufficient-stock block) → loud
    diagnostic, skip the item's dest leg. Never half-book.
- Aggregate `InventoryItem` nets to ZERO automatically: the existing stock-sync middleware
  mirrors each `InventoryStockAdjusted` (−qty + +qty = 0). Correct — a transfer redistributes
  on-hand across locations, it does not change the total.

## Steps
- [ ] Write `inventory-transfer-received-stock-movement-middleware.ts`
- [ ] Barrel export (`middleware/index.ts`) + factory import + registration
- [ ] Conformance test (real IR + engine; net-zero aggregate; missing-dest bootstrap; insufficient-source skip; IR has no such reaction)
- [ ] `pnpm --filter @repo/manifest-runtime typecheck` + runtime suite green
- [ ] Update IMPLEMENTATION_PLAN.md, commit surgically (explicit paths)

## Deferred / notes (tracked, not silent)
- `partialReceive` (TransferPartiallyReceived) carries a `receivedItems` JSON subset + keeps
  the transfer in_transit → different semantics, separate increment.
- Chained ledger rows are `adjustment`-typed (we dispatch InventoryStock.adjust, not a direct
  "transfer"-typed InventoryTransaction). Faithful but verbose; future leg could refine.
- Surgical staging only — concurrent-loop shared-tree hazard; commit with explicit pathspecs.

## Review (DONE 2026-06-14)
- **Files (runtime only — NO IR/schema/migration):**
  - new `manifest/runtime/src/middleware/inventory-transfer-received-stock-movement-middleware.ts`
  - new `manifest/runtime/src/__tests__/inventory-transfer-received-stock-movement-middleware.test.ts`
  - `manifest/runtime/src/middleware/index.ts` (barrel export)
  - `manifest/runtime/src/manifest-runtime-factory.ts` (import + register after stock-sync)
  - `IMPLEMENTATION_PLAN.md` (leg marked `[~]` — stock-movement DONE; discrepancy + partialReceive remain)
- **Verified:** new test 4/4; runtime suite **361 pass / 67 files** (was 357); runtime typecheck exit 0.
- **Key design decisions (refinements over the plan):**
  - Middleware adjusts ONLY per-location `InventoryStock`; the aggregate `InventoryItem` total is
    mirrored automatically by the existing stock-sync middleware → source(−)+dest(+) net-zero
    (correct: a transfer redistributes, doesn't change the total). Rule-7 refinement of the plan's
    "adjust both" wording.
  - Destination bootstrap = create-at-0-THEN-adjust(+qty) so the credit IS mirrored (a direct
    create(qty) emits InventoryStockCreated, which stock-sync does NOT mirror → would break net-zero).
    unitId (int) copied from the source row.
  - Source-first ordering + block-guard respect → never half-book; missing source / insufficient
    stock → loud diagnostic, dest skipped.
- **Surgical staging** — only this increment's paths; left pre-existing `CLAUDE.md` edit and
  `graphify-out/` deletions (not mine) untouched.
- **Deferred (tracked, not silent):** TransferDiscrepancyFlagged→VarianceReport.create; partialReceive
  (different payload/semantics); transfer-typed ledger rows (currently adjustment-typed via chaining).
