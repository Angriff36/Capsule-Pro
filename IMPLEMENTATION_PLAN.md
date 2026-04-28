# Capsule-Pro Implementation Plan — Live Queue

> **Last updated:** 2026-04-28 (BROKEN_PRISMA_READ backlog closed; pivot to
> BROKEN_RAW_SQL parent workflows). **Convention:** this file is the **live
> queue only**. Completed pass write-ups are archived, not appended here. See
> the **Archive Map** at the bottom for where to look up history.

---

## Current Task — Fix BROKEN_RAW_SQL parent workflows

The Prisma-store backlog (batches 03–13) is complete, but the **app is still
broken end-to-end**. Parent entities still split write path (manifest in-memory
/ raw SQL) from read path (Prisma list/detail), so user actions appear to
succeed and then vanish on refresh.

In-scope parents (no new BROKEN_PRISMA_READ batches — those are done):

| # | Entity            | Tenant schema    | Status of children                               |
| - | ----------------- | ---------------- | ------------------------------------------------ |
| 1 | **Proposal** ✅   | tenant_crm       | `ProposalPrismaStore` + `ProposalLineItemPrismaStore` wired; instanceId fixed  |
| 2 | **PurchaseOrder** | tenant_inventory | `PurchaseOrderItemPrismaStore` exists (batch 13) |
| 3 | Notification      | tenant_core      | n/a                                              |
| 4 | Schedule          | tenant_staff     | `ScheduleShiftPrismaStore` exists (batch 13)     |
| 5 | Shipment          | tenant_inventory | `ShipmentItemPrismaStore` exists (batch 13)      |
| 6 | User              | tenant_core      | n/a (high blast radius — auth/session)           |

**Start with Proposal**, then PurchaseOrder. ProposalLineItem /
PurchaseOrderItem stores already exist, so the parent fix is the missing piece
that prevents real end-to-end behavior.

### Required pattern (do every step for each parent)

For each entity in this list, do **all** of:

1. **Trace the live route.** Open the page the user actually visits in
   `apps/app/`, capture the `fetch(...)` URL, and read every API route that URL
   touches (list, detail, create, update, delete, status transitions). Don't
   trust the camelCase duplicates under `/api/{entity}/` — the canonical paths
   are kebab-case under domain folders (`/api/crm/...`, `/api/inventory/...`).
2. **Classify each route's storage path.** Mark each as raw SQL
   (`$queryRaw`/`$executeRaw`), Prisma model (`database.<entity>.findMany`),
   Manifest store (`runtime.runCommand`), or mixed.
3. **Align write and read.** Pick **one** persistence target per entity and make
   every route hit it:
   - If the entity has a Prisma model and read APIs already use Prisma, add a
     parent `<Entity>PrismaStore` (mirror `ProposalLineItemPrismaStore` /
     `PurchaseOrderItemPrismaStore`), wire it into
     `ENTITIES_WITH_SPECIFIC_STORES` and `createPrismaStoreProvider`, and let
     `runtime.runCommand` flow through it.
   - If a route currently bypasses the manifest with raw SQL, replace it with a
     manifest command **only when** the manifest+store pair are real. Otherwise,
     port it to the same Prisma model the read APIs use. Do not introduce a new
     in-memory or JSON store.
4. **Prove it through the same route the frontend uses.** Add an API-level
   integration test (preferred) or an E2E product-flow test that calls
   `POST /api/<canonical>/commands/<verb>` and then reads through
   `GET /api/<canonical>/list` (or the detail route) and asserts the new/changed
   row is present. Unit tests on the store alone are **not** sufficient.
5. **Hit Blocker #1 immediately if you see it.** Any existing-row mutation route
   that calls `runtime.runCommand({ entityName, ... })` without `instanceId` is
   broken at the runtime — `mutate` / `updateInstance` will no-op even with the
   new store. If you encounter this on an in-scope route, fix it in **this**
   phase (route, template, or generator), and add a regression test that drives
   it through the HTTP route.
6. **Stop on Blocker #2 polarity bugs.** If a legitimate create/update is
   rejected by a `block*` constraint, do **not** rewrite the manifest to disable
   the constraint. Open a focused runtime/compiler sub-task with a failing test
   that proves the polarity bug, and pause the parent entity until the polarity
   fix lands.

### Out of scope for this task

- New BROKEN_PRISMA_READ store batches (backlog is done).
- Bypass-route cleanup that doesn't touch the in-scope parents.
- Manifest authoring for quarantined domains
  (`packages/manifest-adapters/manifests-disabled/`).
- Rewriting routes that the frontend doesn't actually call (camelCase orphans
  under `/api/{entity}/`).

### Required verification per entity

```sh
pnpm --filter @repo/manifest-adapters typecheck
pnpm --filter @repo/manifest-adapters test
pnpm --filter api typecheck
pnpm --filter api test                # at least the new HTTP route test
# plus, for create/edit/delete UI work:
pnpm exec playwright test e2e/workflows/<relevant>.workflow.spec.ts --project=chromium --workers=1
```

A parent entity is **not** done unless: the new HTTP-route test passes,
`pnpm --filter api typecheck` is clean, and the visible behavior listed below
works against a fresh database.

---

## Step 1 — Proposal (CRM) ✅ DONE

**Completed 2026-04-28.** Changes:
- Added `ProposalPrismaStore` at `packages/manifest-adapters/src/prisma-stores/broken-read-proposal-parent.ts`
- Wired `Proposal`, `ProposalLineItem`, `PurchaseOrderItem` into `createPrismaStoreProvider` switch + `ENTITIES_WITH_SPECIFIC_STORES`
- Fixed `instanceId` on all 6 instance-scoped command routes (update, send, accept, reject, withdraw, mark-viewed)
- Fixed `instanceId` in `executeManifestCommand` helper for all non-create commands
- Added `apps/api/__tests__/crm/proposals/proposal-end-to-end.test.ts` (11 assertions)
- All typechecks and tests pass (manifest-adapters: 436 tests, api: 1178 tests)

**Frontend entry:** `apps/app/app/(authenticated)/crm/proposals/...` calls
`GET /api/crm/proposals/list` for the index and
`POST /api/crm/proposals/commands/{create|update|send|accept|reject|withdraw|mark-viewed}`
for actions.

**Current split (verified 2026-04-28):**

- `apps/api/app/api/crm/proposals/list/route.ts` —
  `database.proposal.findMany(...)` (Prisma)
- `apps/api/app/api/crm/proposals/[id]/route.ts` — Prisma read
- `apps/api/app/api/crm/proposals/commands/create/route.ts` —
  `runtime.runCommand("create", ...)` against manifest store
- Status-transition commands — `runtime.runCommand(<verb>, ...)`, several
  **likely missing `instanceId`** (Blocker #1 candidates)
- Manifest declares `store ... in memory`
  (`packages/manifest-adapters/manifests/proposal-rules.manifest`)
- `manifest-adapters/src/prisma-stores/` has **no** `ProposalPrismaStore`;
  `ENTITIES_WITH_SPECIFIC_STORES` does **not** list `Proposal`

**Concrete steps:**

1. Read `proposal-rules.manifest` and the existing `ProposalLineItemPrismaStore`
   (`broken-read-batch13-order-proposal.ts`) to confirm field shape (camelCase,
   soft-delete via `deletedAt`, composite key `tenantId_id`).
2. Add `ProposalPrismaStore` next to the line-item store. Mirror the closest
   precedent (e.g., `ContractSignaturePrismaStore` if Decimal-heavy, or
   `EventPrismaStore` for status-transition entities). Cover
   create/update/findById/list/softDelete; respect `tenantId` scoping.
3. Add `Proposal` to `ENTITIES_WITH_SPECIFIC_STORES` and the switch in
   `createPrismaStoreProvider`.
4. Audit each command route under `apps/api/app/api/crm/proposals/commands/`.
   For every status-transition command (`accept`, `reject`, `send`, `withdraw`,
   `mark-viewed`, `update`), confirm the route passes `instanceId` to
   `runtime.runCommand`. Fix any that don't (Rule 7 of the task brief — fix in
   this phase).
5. Add `apps/api/__tests__/crm/proposals/proposal-end-to-end.test.ts`:
   - POST to `/api/crm/proposals/commands/create` → expect 200.
   - GET `/api/crm/proposals/list` → assert created row present.
   - POST to `/api/crm/proposals/commands/send` with `instanceId` → expect 200.
   - GET `/api/crm/proposals/[id]` → assert status changed.
   - Soft-delete (if exposed) → assert row no longer in `list` but recoverable
     via include-deleted query if supported.
6. Run the verification block. Land as a single conventional commit per discrete
   fix.

**Visible behavior on completion:**

- A user can open the Proposals page, click **New Proposal**, fill the form,
  save, and see the proposal in the index immediately and after a hard refresh.
- The user can change status (Send / Accept / Reject / Withdraw) and the UI
  shows the new status after refresh; the audit row is persisted to Postgres,
  not lost on server restart.

---

## Step 2 — PurchaseOrder (Inventory)

**Frontend entry:** `apps/app/app/(authenticated)/inventory/purchase-orders/...`
(and procurement screens) call `GET /api/inventory/purchase-orders` plus
`POST /api/inventory/purchase-orders/commands/{create|submit|approve|reject|cancel|mark-ordered|mark-received}`.
Item-level edits hit
`PATCH /api/inventory/purchase-orders/[id]/items/[itemId]/{quantity|quality}`.

**Current split (verified 2026-04-28):**

- List/detail — Prisma (`database.purchaseOrder.findMany / findUnique`)
- Commands — manifest runtime
- Item-level PATCH — direct handlers (need to verify whether they hit Prisma or
  raw SQL — handle in step 1 of this phase)
- `PurchaseOrderItemPrismaStore` exists; **no** `PurchaseOrderPrismaStore`;
  `ENTITIES_WITH_SPECIFIC_STORES` lacks `PurchaseOrder`

**Concrete steps:**

1. Same shape as Proposal: build `PurchaseOrderPrismaStore` (tenant_inventory,
   camelCase, Decimal totals, soft-delete via `deletedAt`), wire into
   `ENTITIES_WITH_SPECIFIC_STORES` + provider.
2. Audit each command route's `runCommand` call for `instanceId` on
   instance-scoped verbs (`approve`, `cancel`, `submit`, `mark-ordered`,
   `mark-received`, `reject`). Fix any missing.
3. Decide a single owner for the item-level PATCH routes
   (`/items/[itemId]/quantity`, `/items/[itemId]/quality`). Either route them
   through a manifest command on `PurchaseOrderItem` (preferred — matches the
   new store) or update them to use Prisma directly — but pick one and remove
   the other code path.
4. Add
   `apps/api/__tests__/inventory/purchase-orders/purchase-order-end-to-end.test.ts`:
   - Create PO via command → assert visible in `/list`.
   - Submit → approve → mark-ordered → mark-received transitions, each through
     the HTTP command route, asserting the read API reflects each status.
   - Item quantity PATCH → assert the change is visible in detail.
5. Run verification block. Single commit per logical change.

**Visible behavior on completion:**

- A user can create a Purchase Order, walk it through Submit → Approve → Ordered
  → Received, and the inventory totals + PO status update consistently across
  list, detail, and after refresh. Item-level quantity/quality edits persist.

---

## Tracked but not started (in priority order)

These four are part of the same task; do not start them until Proposal **and**
PurchaseOrder are landed and verified.

3. **Notification** (tenant_core). Trace `apps/app/...notifications` UI → API.
   Likely raw SQL today; choose Prisma route, add `NotificationPrismaStore` if
   commands flow through manifest, add HTTP test that creates → lists →
   marks-read.
4. **Schedule** (tenant_staff). `ScheduleShiftPrismaStore` already exists; the
   parent likely needs the same treatment as Proposal. Confirm read/write split
   before starting.
5. **Shipment** (tenant_inventory). `ShipmentItemPrismaStore` exists. Same
   parent treatment.
6. **User** (tenant_core). High blast radius — touches auth/session. Trace
   tenant-isolation paths first; do not refactor until earlier entities are
   green and you have a written rollback plan.

When you start one of these, lift it into its own numbered step section above,
identical in shape to Steps 1 and 2.

---

## Known Blockers (reuse, do not duplicate)

These are the structural blockers this phase will hit. Don't rediscover them —
link to them.

1. **Generator — `instanceId` on instance-scoped commands.** Generated HTTP
   command handlers that mutate an existing row must pass `instanceId` into
   `runtime.runCommand(...)`. Today archive / acknowledge–style routes call
   `runCommand` with only `entityName`, so `mutate` / `updateInstance` no-op at
   the store even after a dedicated Prisma store exists. Reference pattern:
   `kitchen-tasks/commands/claim`. **In-phase rule:** if you see this on a
   Proposal / PurchaseOrder / Schedule / Shipment / Notification / User route,
   fix it here, with a regression test.
2. **Runtime — manifest constraint polarity for `:block` / `block*` entity
   constraints.** IR entities carry constraints such as `blockVoteIfFinalized`
   and `blockFinalizeNoData` (expressions describe a **bad** state; severity
   `block`). `RuntimeEngine.evaluateConstraint` classifies negative constraints
   only when `constraint.name.startsWith("severity")`; names like
   `blockVoteIfFinalized` are treated as positive (`passed = !!result`). Result:
   legitimate creates/updates are blocked. **In-phase rule:** if a valid write
   is rejected, file a focused sub-task with a failing test that proves the
   polarity bug; pause the entity until the polarity fix lands. Do not edit
   manifests to silence the constraint.
3. **`@angriff36/manifest` publish/version coordination.** `apps/api` pins the
   npm package, but Vitest aliases the workspace runtime
   (`apps/api/vitest.config.ts`). Tests can pass while deployed bundles still
   run the previously-published runtime. Any runtime/generator change that the
   API depends on must be paired with: bump `@angriff36/manifest`, rebuild,
   republish, and update the pin (or point the app at the workspace package).
4. **Bypass / camelCase duplicate routes.** Many entities have stale camelCase
   route directories (`/api/proposal/`, `/api/purchaseorder/`) that the frontend
   does not call. Don't fix them in this phase — but don't add tests against
   them either. Always trace from the frontend.

---

## Recently Resolved (do not redo)

Full write-ups live in the archive. Highlights:

- **Proposal parent workflow (completed 2026-04-28).** `ProposalPrismaStore` bridges manifest command writes to Prisma `tenant_crm.proposals`. All 6 status-transition command routes now pass `instanceId` to `runCommand`. `executeManifestCommand` helper also passes `instanceId` for non-create commands (fixes Blocker #1 for all entities using this helper). Batch 13 stores (`ProposalLineItemPrismaStore`, `PurchaseOrderItemPrismaStore`) wired into `createPrismaStoreProvider` switch — they were in `ENTITIES_WITH_SPECIFIC_STORES` but had no switch case.
- **BROKEN_PRISMA_READ Batches 03–13 (closed 2026-04-28).** Twelve mechanical
  batches landed dedicated Prisma stores for AlertsConfig and 50+ other
  entities, including ProposalLineItem, PurchaseOrderItem, ScheduleShift,
  ShipmentItem (batch 13). All BROKEN_PRISMA_READ candidates with a Prisma model
  now have stores. PurchaseRequisition is the only skip — no Prisma model (see
  Known Gotchas). Detailed batch logs:
  `docs/implementation-history/passes-38-63.md`.
- The line-item / shift / shipment-item stores from batch 13 are pre-requisites
  for the current phase — that's why this phase is unblocked.

---

## Open Followups (parked, not in current task)

- **E1, E3, E5** — runtime/generator items tied to Blockers #1 and #2 (will
  partly land as side-effects of the in-phase rules).
- **E3-2** — generator emit `instanceId` on instance-scoped HTTP routes (depends
  on Blocker #1; expect to make material progress on this in Steps 1 and 2).
- **A2-1** — adapter audit follow-up captured in
  `docs/audits/pass-15-input-validation.md`.
- **D3-1 / D3-2** — DB performance follow-ups
  (`docs/audits/pass-13-db-performance.md`).
- **Manifest republish** — `@angriff36/manifest` version bump + rebuild + repin
  (Blocker #3).
- **Quarantined manifests** — re-evaluate after generator + polarity fixes land.
- **Procurement requisitions / vendor-contracts 500s** — see Known Gotchas in
  `AGENTS.md`; needs Prisma model + manifest re-integration before the route can
  return real data.

---

## Archive Map

History and audits live in two folders. **Append new completed work to these
files; do not re-append it here.**

### `docs/implementation-history/`

| File                              | What it contains                                                                                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `passes-38-63.md`                 | Full text of the 38th–63rd pass logs (manifest repair, generator notes, blocker progress, dedicated Prisma stores, BROKEN_PRISMA_READ batches 03–13). |
| `executive-summary-2026-04-24.md` | Snapshot summary + re-verification deltas captured on 2026-04-24.                                                                                     |
| `blockers-history.md`             | Historical Tier-0 / Tier-1 manifest blockers and their resolution.                                                                                    |
| `categories-1-5.md`               | Original categories 1–5 issue inventory and triage.                                                                                                   |
| `schema-and-techdebt.md`          | Schema drift, manifest coverage, recommended order, and tech-debt notes.                                                                              |

### `docs/audits/`

| File                          | What it contains                                          |
| ----------------------------- | --------------------------------------------------------- |
| `pass-04-package-health.md`   | Package health audit.                                     |
| `pass-05-e2e-tests.md`        | End-to-end test audit.                                    |
| `passes-06-09-raw-sql.md`     | Raw SQL audit passes 6–9.                                 |
| `pass-09-frontend-health.md`  | Frontend health audit.                                    |
| `pass-10-mobile-website.md`   | Mobile + website audit.                                   |
| `pass-11-auth-middleware.md`  | Auth + middleware audit (cron auth hardening lives here). |
| `pass-12-test-quality.md`     | Test quality audit.                                       |
| `pass-13-db-performance.md`   | DB performance audit (D3-1 / D3-2 followups).             |
| `pass-14-error-handling.md`   | Error handling audit.                                     |
| `pass-15-input-validation.md` | Input validation audit (A2-1 followup).                   |

### Other repo docs (not part of this cleanup)

- `AGENTS.md` — durable rules for agents (Manifest Persistence Repair Rules,
  etc.).
- `CLAUDE.md` — Claude Code entry point; imports `AGENTS.md`.
- `PROMPT_build.md` / `PROMPT_plan.md` — Ralph loop prompts for build vs plan
  modes.
- `README.md` — repo overview.

---

## Update Discipline

When you finish work on an in-scope parent:

1. Move the detailed write-up into `docs/implementation-history/passes-38-63.md`
   (or the next pass file). Include: route map before/after, store changes,
   instanceId fixes, polarity sub-tasks if any, and the HTTP-test name.
2. Update only **Recently Resolved**, the in-scope table at the top, and **Known
   Blockers** (only if a blocker resolved or a new one surfaced).
3. Replace **Step 1** with the next entity from the tracked list, in the same
   shape.
4. Keep this file ≤ ~800 lines. If it grows, more content needs to move to the
   archive.
5. Never delete archive content — append to it.
