# Autonomous 8h run — App quality burn-down (2026-06-13)

Goal: improve the app while the user is at work. Safe, verifiable, reversible work only —
small atomic commits, each gated by typecheck (api/app/runtime) + targeted tests. No DB
deploys, no branch merges, no high-blast-radius refactors unattended.

Baseline at start (measured, not assumed):
- app typecheck: **5 errors** (allergen-warning-banner.examples.tsx — pre-existing on main). api/runtime: green.
- biome: **2,815 errors + 2,189 warnings** → after tooling-dir exclude **2,784 + 2,185**.
- Active workstream (notes §51): ultracite/biome burn-down (11,987 → 2,784 errors).

Honesty rule (lessons.md #8): every error-count drop is classified **(A) real code fix** or
**(B) tool/scope change**. B is never reported as A. The biome exclude below is **(B)**.

Ping-pong rule (notes §51): after any blanket lint fix, run `pnpm manifest:generate` and
`git checkout` every modified `// Generated from Manifest IR - DO NOT EDIT` file before
committing. Commit producer bytes only — never hand-edit generated routes.

---

## Stage 0 — Baseline repair & scope  [in progress]
- [x] (B) Exclude `.aboardai/`, `.superpowers/`, `__previewjs__/` from biome (user request) — 2,815→2,784
- [x] (A) Fix `allergen-warning-banner.examples.tsx` — add nullable `escalatedAt`/`escalatedTo` to 5 fixtures
- [ ] Confirm api + app + runtime typecheck all green; commit baseline repair

## Stage 1 — Correctness-class lint (real bugs)  [highest value]
Each rule: `biome --write --unsafe --only=<rule>` OR manual, then typecheck + tests + commit.
- [ ] useParseIntRadix (20) — `parseInt(x)` → add radix (silent base bugs)
- [ ] noGlobalIsNan (11) — `isNaN` → `Number.isNaN` (coercion bug)
- [ ] noAssignInExpressions (18) — un-nest assignments
- [ ] noImplicitAnyLet (15) + noEvolvingTypes (27) — close type holes
- [ ] noArrayIndexKey (119) — stable React keys where a real id exists (skip where none)

## Stage 2 — Performance + accessibility (user-facing)
- [ ] noImgElement (8) + useImageSize (8) — `<img>` → `next/image` w/ dimensions
- [ ] noNamespaceImport (92) — `import * as` → named imports
- [ ] a11y: useButtonType (29), noSvgWithoutTitle (16), useKeyWithClickEvents (13),
      noLabelWithoutControl (155), useHtmlLang (1), useAriaPropsSupportedByRole (1)

## Stage 3 — Type safety
- [ ] noExplicitAny (313: 35 err + 278 warn) — real types where locally inferable; skip deep-inference sites

## Stage 4 — Mechanical readability (bulk, low risk)
- [ ] organizeImports (337), noSubstr (33→slice), useForOf (33), useOptionalChain (19),
      noVoid (27), noDelete (3), useLiteralKeys (12), noUseless{CatchBinding,Constructor,SwitchCase,Fragments}
- [ ] noNestedTernary (348) — extract to named helpers / if-else

## Stage 5 — useTopLevelRegex (1,393, largest bucket)  [careful]
- [ ] Hoist ONLY non-global, non-sticky regex literals (script-identified). /g and /y change
      `lastIndex` semantics when hoisted (notes §51) — leave those for per-site human review.

## Stage 6 — Latent functional bugs (TDD, only if time + clearly bounded)
Candidates from notes/memory (failing test first, then fix):
- [ ] AdminTaskActivity has no writer (notes §52)
- [ ] EventPlanningDraft.proposalId never written (notes §52)
- [ ] Reactions that reference non-input payload fields silently no-op (memory: reactions-payload-model)

---

## Review

### Lint baseline + batches (verified)
- Stage 0: tooling-dir biome exclude (B) + allergen typecheck baseline repair (A). Commits 1a8bd4856, 815507fc3.
- Batch 1: 1 real bug (search dead `||` fallback, db16064b4) + 43 safe mechanical autofixes (320669361). noDelete reverted (risky).
- Batch 2: 20 correctness fixes — isNaN→Number.isNaN, parseInt radix, iterable-callback (c4a99d1bf).
- True fixable surface = ~3,305 hand-written (1,662 are generated DO-NOT-EDIT routes I can't touch). Classifier: tools/classify-lint.mjs.
- Every batch gated: typecheck 29/29, tests app 341 / api 5281 / runtime 172. Zero generated routes touched (no ping-pong).

### Kanban v2 + Call Planner MERGE (user-requested, 2026-06-13)
- ✅ Merged `port/kanban-call-planner` → main (merge `3dcb462f0`). Backup: `backup/main-pre-kanban-merge-20260613`.
- ✅ Conflicts resolved: notes.md (kept §51 addendum + §52); allergen-banner duplicate `escalatedAt/escalatedTo` (both sides added — kept branch placement).
- ✅ Fixed branch's STALE runtime store metadata (8 new entities were missing) — regenerated, idempotent (ea9eec5e3).
- ✅ Verified GREEN: manifest:ci (no drift, 0 new violations), typecheck 29/29, tests app 341 / api 5281 / runtime 172.
- ✅ Migration `20260612195000_port_kanban_call_planner` confirmed purely additive (11 CREATE TABLE + indexes + 1 nullable col; zero destructive).
- ⛔ **`pnpm db:deploy` BLOCKED by safety classifier — NEEDS EXPLICIT USER SIGN-OFF.** Migration is committed but NOT applied to the dev DB.
      **Until deployed, the kanban/call-planner pages will 500 (tables don't exist).**
      To apply: run `! pnpm db:deploy` in the session, or authorize me to. Then `pnpm db:check` should show zero drift.
- Note: 2 governed bypasses (ExtractedDetail, ProposalAction) are now in bypasses.json baseline — merging = accepting them.

---

# (prior run) Port: Kanban v2 + Call Planner — MERGED to main 2026-06-13 (see Review above)
Migration deploy pending user sign-off. Full detail: manifest/notes.md §52.

---

# Task (2026-06-13): Fix hardcoded Station computeds (Stage 6 — latent functional bug)

_Source: IMPLEMENTATION_PLAN.md P2 — "Fix hardcoded computeds: Station.capacityRemaining / availablePercentage"._

## Problem (the why)
`manifest/source/kitchen/station-rules.manifest:33-34` declares two computeds as literal `0`:
`capacityRemaining: int = 0` and `availablePercentage: int = 0`. Because `capacityRemaining`
is always `0`, the `warnNearCapacity` constraint (`self.capacityRemaining == 1`, station-rules :40
+ the `assignTask` variant :75) **can never fire** — dead guard logic. Any dashboard reading
`availablePercentage` sees a constant 0% utilization. Verified in compiled IR: both are
`{ kind: "literal", value: { number: 0 } }`.

## Fix
- `capacityRemaining: int = self.capacitySimultaneousTasks - self.currentTaskCount`
- `availablePercentage: number = percent(self.capacityRemaining, self.capacitySimultaneousTasks)`
  - `percent(part, whole)` (`manifest/runtime/src/manifest-builtins.ts:65`) = `(part/whole)*100`,
    returns `0` when `whole <= 0`. Returns `number` → type widened `int`→`number` to match the
    20+ other `percent` computeds (e.g. `Equipment.usagePercentage`).
  - Safe: neither is a Prisma column (only `capacity_simultaneous_tasks`/`current_task_count`
    are stored), and no app-layer code consumes either computed (only the constraint does).

## Checklist
- [x] Verify bug in source + IR; verify `percent` semantics; verify no schema/consumer impact
- [x] Edit `manifest/source/kitchen/station-rules.manifest`
- [x] Recompile IR (`pnpm manifest:compile`) — expressions now `binary` / `call`
- [x] Add conformance test (IR non-literal lock + production-engine runtime proof)
- [x] Run new test (5/5) + existing api stations (20/20) + runtime typecheck (clean)
- [x] manifest:ci gates: validate ✓, validate-ai 100/100 ✓, doctor ✓, check ✓, schema:check (no drift) ✓, audit:strict ✓
- [ ] Commit (hold push pending confirmation)

## Review
**Scope grew on a verified discovery.** The plan framed this as a pure computed fix
(literal `0` → derived). Investigation against the **real** `ManifestRuntimeEngine` +
storeProvider + `createCustomBuiltins` path revealed the deeper truth: the runtime does
**not resolve computed properties inside constraint expressions**. So fixing the computed
alone left `warnNearCapacity` (refs `self.capacityRemaining`) still dead — AND exposed that
`blockFull` (refs `self.isAtCapacity`) never enforced capacity at all (a cap-3 station
accepted a 5th task).

**Shipped (one entity, `station-rules.manifest`):**
1. Derived computeds: `capacityRemaining = capacitySimultaneousTasks - currentTaskCount`,
   `availablePercentage = percent(capacityRemaining, capacitySimultaneousTasks)` (int→number).
2. Inlined stored-prop expressions into the 3 computed-referencing constraints
   (`warnNearCapacity` ×2, `blockFull`) so they actually evaluate. Removed an unresolvable
   compound-arithmetic `details.remaining` (details only resolve simple member access).
3. Conformance test proves (production engine) the warn fires at one-slot-remaining and the
   block enforces capacity — both previously dead.

**Verification:** new test 5/5; api stations 20/20; runtime typecheck clean; full manifest:ci
gate set green; no schema/route drift (computeds/constraints aren't schema). No app code calls
`Station.assignTask`, so enabling `blockFull` has no current caller blast radius.

**Documented systemic finding** in IMPLEMENTATION_PLAN.md: computeds-in-constraints don't
resolve → any entity with a constraint/guard referencing a computed has a dead rule; needs a
repo-wide audit (Station is the first fix).

**Commit staged with explicit manifest paths** (not `-A`) to avoid bundling the 3 pre-existing
unrelated app-file edits in the working tree. Push HELD pending user confirmation (push = Tier 3).

---

# Task (2026-06-14): Wire inventory movements into the governed InventoryTransaction ledger (P0)

_Source: IMPLEMENTATION_PLAN.md P0 — "InventoryConsumed/Wasted/Restocked/Adjusted →
InventoryTransaction.create" (flagged "the entire governed stock ledger is empty")._

## Problem (the why)
Every `InventoryItem` mutate emits its event (`InventoryConsumed`/`InventoryWasted`/
`InventoryRestocked`/`InventoryAdjusted`) but **nothing creates the `InventoryTransaction` ledger
row**. The governed stock ledger is empty — only populated by direct-Prisma writes in 3 routes
(purchase-orders complete, stock-levels adjust, cycle-count finalize). The `event-listeners.ts`
`onInventory*` stubs exist but are never registered in the factory.

## Decision (mechanism) — ONE after-emit middleware, not 4 reactions / 4 middleware / listener stubs
- Reactions can't supply `unitCost` for consume/waste/adjust (item's OWN field, not a command param)
  nor compute the ledger sign cleanly → would write valuation-incorrect rows.
- Listener stubs sit outside the Manifest lifecycle → constitution prefers governed dispatch.
- One middleware + a per-event spec table is simpler than 4 near-identical files (Rule 2/5).

### Event → ledger mapping (transactionType MUST be in the entity's validTransactionType enum)
| Event | command | transactionType | ledger quantity | unitCost source |
|---|---|---|---|---|
| InventoryConsumed | consume | `issue` | `-quantity` | load item.unitCost |
| InventoryWasted | waste | `waste` | `-quantity` | load item.unitCost |
| InventoryRestocked | restock | `receipt` | `+quantity` | `payload.costPerUnit` |
| InventoryAdjusted | adjust | `adjustment` | `+quantity` (param is already a signed delta) | load item.unitCost |
Signed deltas match the existing direct-Prisma producers (receipt +, adjustment signed).

## Checklist
- [x] Create `manifest/runtime/src/middleware/inventory-movement-transaction-middleware.ts`
- [x] Export from `middleware/index.ts`; register in `manifest-runtime-factory.ts` (after-emit)
- [x] Conformance test (real IR engine; row per movement w/ correct type/signed qty/unitCost; IR lock no reaction)
- [x] runtime test (207 pass) + runtime+api typecheck green
- [x] Update IMPLEMENTATION_PLAN.md
- [ ] commit, push, tag

## Review
**Shipped one middleware, purely runtime (no IR/source/schema change).** Records an
`InventoryTransaction` ledger row for every governed `InventoryItem` movement —
closing the P0 "the entire governed stock ledger is empty" gap.

**Rule-7 refinement of the plan.** The plan said "Mechanism: reaction (or listener
registration)." Both are wrong on the evidence: a reaction cannot value the row
(`unitCost` is the item's OWN field for consume/waste/adjust, not a command param,
and event fields aren't auto-populated from `self.*`) nor sign the delta; the
`event-listeners.ts` stubs sit outside the Manifest lifecycle (constitution prefers
governed dispatch). One middleware with a per-event spec table beats 4 near-identical
files.

**Key correctness findings (test-locked):**
1. `transactionType` is gated by the entity block `validTransactionType` → the map uses
   the ENUM members, not command names: consume→`issue`, waste→`waste`, restock→`receipt`,
   adjust→`adjustment`. (The direct-Prisma producers' `"purchase"` would fail this gate.)
2. Signed deltas: consume/waste `−qty`, restock/adjust `+qty` (adjust's param is already signed).
3. `restock` carries `costPerUnit` in its payload → valued from it; others load `item.unitCost`.
4. Movement events carry no tenantId/itemId field → resolve itemId from `subject.id`, tenant from ctx.
5. Create id in body, not `instanceId`. Idempotency key per-row (every movement is a real entry).

**Verification:** new test 5/5; full runtime suite 207 pass; runtime + api typecheck exit 0.
No IR/source/generated change → `manifest:audit-reaction-payloads`, schema-drift, and
route-drift gates are unaffected by construction.

**Note for the sibling P1 inventory items** (InventoryStock↔InventoryItem sync,
PurchaseOrderReceived 1:N, Transfer received): the `event-listeners.ts` `onInventory*`
stubs remain unwired and are NOT the path — governed-dispatch middleware is.

---

# Task (2026-06-14): Fix Collections→Invoice payment (P0 last open financial no-op)

_Source: IMPLEMENTATION_PLAN.md P0 — "Fix Collections→Invoice payment"._

## Problem (the why)
`on CollectionPaymentRecorded run Invoice.applyPayment` silently no-op'd: `CollectionCase.recordPayment`
is a MUTATE, so `resolve payload.result.invoiceId` read the last mutate's scalar (`lastActivityAt`),
not the case. So collections recorded a recovery but the invoice's amountPaid/amountDue/status never
moved. `invoiceId` is the CollectionCase's OWN field (not a `recordPayment` param, not auto-populated
into the event) → unreachable by ANY reaction.

## Decision (mechanism) — MIDDLEWARE (direct sibling of the payment apply/refund legs)
- `amount`/`paymentId` ARE recordPayment params (ride the payload); `invoiceId` is the case's own field
  → must load the CollectionCase from the store. Reaction structurally cannot.
- No double-apply: collection payment ≠ Payment.process, so PaymentProcessed apply leg never fires here;
  the route only calls recordPayment.

## Checklist
- [x] Investigate path (Explore subagent) — confirmed invoiceId is entity-field, not param
- [x] Create `collection-payment-recorded-invoice-apply-middleware.ts`; export from barrel; register in factory
- [x] Remove dead reaction from `reactions.manifest`; recompile IR (210 entities)
- [x] Conformance test (4 tests: IR lock, credit + PaymentApplied bubble, DRAFT skip, over-pay skip)
- [x] runtime suite 215 pass; runtime + api typecheck exit 0; `manifest:audit-reaction-payloads` EXIT=0 (0 new)
- [ ] commit (hold push pending confirmation — push = Tier 3)

## Review
**Shipped one middleware + reaction removal** (producer source + recompiled IR). Closes the last open
financial-correctness P0 no-op: collection-case payments now credit the linked invoice through governed
`Invoice.applyPayment`. Guard-safe (skips DRAFT/PAID/overpay). Idempotency keys on the case's
post-payment `outstandingAmount` (monotonic → unique per payment, stable on retry). Verified against the
real compiled IR through the runtime engine — fails loudly if the propagation regresses. No IR reaction
added, so schema-drift/route-drift gates unaffected. Push HELD (Tier 3).
