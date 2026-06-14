# Task: Event update sync → CateringOrder venue snapshot (IMPLEMENTATION_PLAN P1, Event lifecycle)

The explicit next-PR continuation of the just-shipped `EventUpdated→BattleBoard` middleware
(plan: "Split out of the BattleBoard leg above to keep one source/IR change per PR").

## Goal
When an event's location changes (`EventLocationUpdated`), re-sync the venue snapshot on every
ACTIVE catering order linked to that event — so a catering order's delivery venue never drifts
from the event it serves.

## Key design decisions (verified against source)
- **Sync only `venueName` + `venueAddress`.** The Event entity owns ONLY these two venue fields
  (+ `locationId`/`venueId`, which CateringOrder lacks). `venueCity/State/Zip/ContactName/
  ContactPhone` are caller-supplied on the order (catering-order-rules.manifest:75 documents this)
  — the Event has no such fields, so syncing them would blank them. Honors the plan's intent
  without inventing data. (Rule 7: surface the conflict, don't average.)
- **Fan out only to ACTIVE orders** (orderStatus ∈ draft/confirmed/in_progress). delivered/
  completed/cancelled orders are physical history — re-syncing a delivered order's venue would
  rewrite where it was actually delivered. (Diverges from the board precedent, which has no
  terminal record; documented inline.)
- **Middleware, not a reaction:** orders are 1:N by eventId; a single-target reaction can't reach
  the set. Mirrors `event-updated-board-sync-middleware.ts`.
- **Trigger ONLY on `EventLocationUpdated`** (the dedicated venue-change path, `Event.updateLocation`).
- **New command `CateringOrder.syncVenue(venueName, venueAddress)`** mirrors `BattleBoard.syncFromEvent`.

## Checklist
- [ ] Add `command syncVenue` + `event CateringOrderVenueSynced` to catering-order-rules.manifest
- [ ] `pnpm manifest:compile` (regenerate IR)
- [ ] Create `manifest/runtime/src/middleware/event-location-catering-sync-middleware.ts`
- [ ] Export from middleware barrel `index.ts`
- [ ] Register in `manifest-runtime-factory.ts` (after board-sync, before cancel cascade)
- [ ] Conformance test `event-location-catering-sync-middleware.test.ts`
- [ ] Gates: runtime test, runtime+api typecheck, manifest:validate / validate-ai / schema:check /
      audit-reaction-payloads
- [ ] Update IMPLEMENTATION_PLAN.md (mark item DONE), tasks/todo.md Review
- [ ] Commit (hold push — Tier 3)

## Review
**Shipped one new command + one sibling middleware.** `EventLocationUpdated` now re-syncs the
venue on every ACTIVE catering order linked to the event, via the new governed
`CateringOrder.syncVenue` command and `event-location-catering-sync-middleware.ts` (a deliberate
sibling of the BattleBoard sync, split per PR as the plan directed). Retires nothing — this is
net-new propagation that previously had no path (catering orders' delivery venue silently drifted
from their event after a relocation).

**Two evidence-driven deviations from the plan's literal text (Rule 7, surfaced not averaged):**
1. The plan's "+city/state/zip/contact" is **impossible to honor** — the Event entity owns only
   `venueName`/`venueAddress`; the broken-out fields are caller-supplied on the order (the source
   documents this). Syncing them would blank caller-owned data, so `syncVenue` syncs exactly the
   two fields the Event authoritatively owns. The test asserts city/state/zip/contact are PRESERVED.
2. Fan out to **ACTIVE orders only** — a delivered/completed/cancelled order is physical history;
   re-syncing its venue would falsify where it was actually delivered. (The board precedent syncs
   all boards because a board has no terminal record.)

**Verification (all green):** runtime suite 265 pass (4 new); runtime + api typecheck exit 0;
`manifest:validate` ✓; `validate-ai` 100/100; `schema:check` no drift (command/event don't touch
Prisma columns); `audit-reaction-payloads` 0 errors / 0 warnings (baseline 0).

**IR churn note:** `manifest:compile` bumps `irHash`/`compiledAt` on all shards (contentHash
unchanged on the ~101 unrelated ones); committing the full `manifest/ir/` output matches prior IR
commits in this initiative (b56bd78e6, 09e3c0e0d, 94d3f92e1). No `manifest/generated/`,
route, client, or schema change.

**Push HELD (Tier 3).** Sibling still open: `EventGuestCountUpdated → PrepList/inventory/budget`
and `EventDishCreated/QuantityUpdated/Removed → PrepList & inventory` remain the next Event-lifecycle
middleware items (no migration). `EventCreated → Calendar`/demand/forecasting stay deferred (new
entities → live-DB migration).
