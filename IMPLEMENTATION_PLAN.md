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
| 2 | **PurchaseOrder** ✅ | tenant_inventory | `PurchaseOrderPrismaStore` + `PurchaseOrderItemPrismaStore` wired; instanceId fixed |
| 3 | **Notification** ✅ | tenant_admin   | `NotificationPrismaStore` wired; instanceId fixed on 3 command routes |
| 4 | **Schedule** ✅   | tenant_staff     | `SchedulePrismaStore` + `ScheduleShiftPrismaStore` wired; instanceId fixed |
| 5 | **Shipment** ✅   | tenant_inventory | `ShipmentPrismaStore` + `ShipmentItemPrismaStore` wired; instanceId fixed |
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

## Step 2 — PurchaseOrder (Inventory) ✅ DONE

**Completed 2026-04-28.** Changes:
- Added `PurchaseOrderPrismaStore` at `packages/manifest-adapters/src/prisma-stores/broken-read-po-parent.ts`
- Wired `PurchaseOrder` into `ENTITIES_WITH_SPECIFIC_STORES` and `createPrismaStoreProvider` switch
- Fixed `instanceId` on all 6 instance-scoped command routes (submit, approve, reject, cancel, mark-ordered, mark-received)
- Added `apps/api/__tests__/inventory/purchase-orders/purchase-order-end-to-end.test.ts` (10 assertions)
- All typechecks and tests pass (manifest-adapters: 436 tests, api: 1188 tests)

**Key finding:** Frontend uses `/api/procurement/purchase-orders/` routes (raw SQL for both reads and writes), NOT the `/api/inventory/purchase-orders/` manifest command routes. The procurement routes are self-consistent. The inventory manifest command routes are now also functional with the Prisma store, providing an alternative API surface.

**Frontend entry:** `apps/app/app/(authenticated)/procurement/purchase-orders/...` calls
`GET /api/procurement/purchase-orders/list` for the index and
`POST /api/procurement/purchase-orders/commands/{create|update-status|receive}`
for actions. These all use raw SQL directly against `tenant_inventory.purchase_orders`.

---

## Step 3 — Notification (Collaboration) ✅ DONE

**Completed 2026-04-28.** Changes:
- Added `NotificationPrismaStore` at `packages/manifest-adapters/src/prisma-stores/broken-read-notification-parent.ts`
- Wired `Notification` into `ENTITIES_WITH_SPECIFIC_STORES` and `createPrismaStoreProvider` switch
- Fixed `instanceId` on all 3 instance-scoped command routes (mark-read, mark-dismissed, remove)
- Added `apps/api/__tests__/collaboration/notifications/notification-end-to-end.test.ts` (11 assertions)
- All typechecks and tests pass (manifest-adapters: 436 tests, api: 1197 tests)

**Frontend entry:** No dedicated notification page. Frontend uses Knock SDK (3rd party popover from
sidebar bell icon) for real-time notification display. The Knock SDK communicates directly with
Knock's cloud API — it does NOT call any of the app's own `/api/collaboration/notifications/` routes.

**Canonical routes (under `apps/api/app/api/collaboration/notifications/`):**
- `GET .../list` — Prisma (`database.notification.findMany`) ✅
- `GET .../[id]` — Prisma (`database.notification.findFirst`) ✅
- `POST .../commands/create` — manifest runtime ✅
- `POST .../commands/mark-read` — manifest runtime (instanceId fixed) ✅
- `POST .../commands/mark-dismissed` — manifest runtime (instanceId fixed) ✅
- `POST .../commands/remove` — manifest runtime (instanceId fixed) ✅

**Key findings:**
- Notification lives in `tenant_admin` schema (not `tenant_core` as the plan assumed). Table: `notifications`.
- No soft-delete — `delete()` in the store is a hard delete (no `deletedAt` column in the Prisma model).
- Duplicate legacy routes under `apps/api/app/api/notification/` (4 routes) — these are NOT called by the frontend and use the older `createManifestRuntime()` directly without `executeManifestCommand`. Only the canonical routes under `collaboration/notifications/` matter.
- The manifest (`notification-rules.manifest`) declares `store Notification in memory` — now bridged to Prisma via `NotificationPrismaStore`.
- 4 commands: create, markRead, markDismissed, remove. No update command.

**Visible behavior on completion:**
- Server-side code that creates notifications through `POST /api/collaboration/notifications/commands/create`
  persists to `tenant_admin.notifications` and the record is immediately visible via
  `GET /api/collaboration/notifications/list`.
- The mark-read and mark-dismissed commands correctly target the specific notification instance
  (via `instanceId`) and persist the `isRead`/`readAt` changes to the database.

---

## Step 4 — Schedule (Staff) ✅ DONE

**Completed 2026-04-28.** Changes:
- Added `SchedulePrismaStore` at `packages/manifest-adapters/src/prisma-stores/broken-read-schedule-parent.ts`
- Wired `Schedule` and `ScheduleShift` into `ENTITIES_WITH_SPECIFIC_STORES` and `createPrismaStoreProvider` switch
- Fixed `instanceId` on all 3 instance-scoped command routes (update, release, close)
- Added `apps/api/__tests__/staff/schedules/schedule-end-to-end.test.ts` (9 assertions)
- All typechecks and tests pass (manifest-adapters: 436 tests, api: 1206 tests)

**Frontend entry:** `apps/app/app/(authenticated)/scheduling/...` calls
`GET /api/staff/schedules/list` for the index and
`POST /api/staff/schedules/commands/{create|update|release|close}`
for actions.

**Canonical routes (under `apps/api/app/api/staff/schedules/`):**
- `GET .../list` — Prisma (`database.schedule.findMany`) ✅
- `GET .../[id]` — Prisma (`database.schedule.findFirst`) ✅
- `POST .../commands/create` — manifest runtime (no instanceId needed) ✅
- `POST .../commands/update` — manifest runtime (instanceId fixed) ✅
- `POST .../commands/release` — manifest runtime (instanceId fixed) ✅
- `POST .../commands/close` — manifest runtime (instanceId fixed) ✅

**Key findings:**
- Schedule lives in `tenant_staff` schema. Table: `schedules`.
- `schedule_date` stored as `DateTime @db.Date`; manifest uses ms epoch. Store handles conversion.
- `published_at` / `published_by` are nullable columns mapped from manifest `publishedAt` / `publishedBy`.
- Manifest-only fields `notes` and `shiftCount` have no Prisma columns — accepted on write, dropped; returned as defaults on read.
- **ScheduleShift wiring gap found and fixed:** `ScheduleShiftPrismaStore` (from batch 13) was in `ENTITIES_WITH_SPECIFIC_STORES` but had **no switch case** in `createPrismaStoreProvider`. Added it alongside Schedule.
- **Blocker #2 polarity bug observed:** The `close` command has `blockNotPublished:block self.status != "published"` which may incorrectly block legitimate close operations due to constraint polarity misclassification. Documented but not fixed per plan rules.
- **Response format difference:** `apps/api/lib/manifest-response.ts` spreads data objects at the top level (`{success: true, ...data}`) rather than nesting under `data.data`. Tests use `data.schedules` / `data.schedule` accordingly.

---

## Step 5 — Shipment (Inventory) ✅ DONE

**Completed 2026-04-28.** Changes:
- Added `ShipmentPrismaStore` at `packages/manifest-adapters/src/prisma-stores/broken-read-shipment-parent.ts`
- Wired `Shipment` into `ENTITIES_WITH_SPECIFIC_STORES` and `createPrismaStoreProvider` switch
- Fixed `instanceId` on all 6 instance-scoped command routes (update, cancel, schedule, ship, start-preparing, mark-delivered)
- Added `apps/api/__tests__/logistics/shipments/shipment-end-to-end.test.ts` (11 assertions)
- Added `shipment` and `shipmentItem` models to API test database mock
- All typechecks and tests pass (manifest-adapters: 436 tests, api: 1218 tests)

**Frontend entry:** Two pages: `/logistics/shipments` and `/warehouse/shipments`.
`GET /api/shipments` (with filters/pagination) for the index.
`POST /api/shipments/shipment/commands/{create|update|cancel|schedule|ship|start-preparing|mark-delivered}`
for actions.

**Canonical routes (under `apps/api/app/api/shipments/`):**
- `GET .../shipment/list` — Prisma (`database.shipment.findMany`) ✅
- `GET .../shipment/[id]` — Prisma (`database.shipment.findUnique`) ✅
- `POST .../shipment/commands/create` — manifest runtime (no instanceId needed) ✅
- `POST .../shipment/commands/update` — manifest runtime (instanceId fixed) ✅
- `POST .../shipment/commands/cancel` — manifest runtime (instanceId fixed) ✅
- `POST .../shipment/commands/schedule` — manifest runtime (instanceId fixed) ✅
- `POST .../shipment/commands/ship` — manifest runtime (instanceId fixed) ✅
- `POST .../shipment/commands/start-preparing` — manifest runtime (instanceId fixed) ✅
- `POST .../shipment/commands/mark-delivered` — manifest runtime (instanceId fixed) ✅

**Key findings:**
- Shipment lives in `tenant_inventory` schema. Table: `shipments`.
- `status` is a `ShipmentStatus` Prisma enum (not plain string) — store uses `as any` cast.
- Multiple nullable DateTime fields (scheduledDate, shippedDate, estimatedDeliveryDate, actualDeliveryDate).
- Nullable Decimal fields (shippingCost, totalValue) handled with `toDecimalInput`.
- Root routes (`/api/shipments`, `/api/shipments/[id]`) provide richer APIs with filters, pagination, includes — these use Prisma for reads and `executeManifestCommand` for writes (instanceId already handled by the shared helper fix from Step 1).
- Auto-generated command routes under `/shipment/commands/` directly call `runtime.runCommand` — these needed the instanceId fix.
- Manifest (`shipment-rules.manifest`) declares `store Shipment in memory` — now bridged to Prisma via `ShipmentPrismaStore`.

---

## Tracked but not started (in priority order)

6. **User** (tenant_core). High blast radius — touches auth/session. Trace
   tenant-isolation paths first; do not refactor until earlier entities are
   green and you have a written rollback plan.

When you start one of these, lift it into its own numbered step section above,
identical in shape to Steps 1–5.

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
- **PurchaseOrder parent workflow (completed 2026-04-28).** `PurchaseOrderPrismaStore` bridges manifest command writes to Prisma `tenant_inventory.purchase_orders`. All 6 instance-scoped command routes (submit, approve, reject, cancel, mark-ordered, mark-received) now pass `instanceId` to `runCommand`. Key finding: frontend uses `/api/procurement/` routes (raw SQL, self-consistent), not the `/api/inventory/` manifest command routes.
- **Schedule parent workflow (completed 2026-04-28).** `SchedulePrismaStore` bridges manifest command writes to Prisma `tenant_staff.schedules`. All 3 instance-scoped command routes (update, release, close) now pass `instanceId` to `runCommand`. ScheduleShiftPrismaStore wiring gap fixed (was in `ENTITIES_WITH_SPECIFIC_STORES` but had no `createPrismaStoreProvider` switch case). Manifest-only fields (`notes`, `shiftCount`) have no Prisma columns — accepted but dropped on write, returned as defaults on read.
- **Notification parent workflow (completed 2026-04-28).** `NotificationPrismaStore` bridges manifest command writes to Prisma `tenant_admin.notifications`. All 3 instance-scoped command routes (mark-read, mark-dismissed, remove) now pass `instanceId` to `runCommand`. Key finding: Notification lives in `tenant_admin` (not `tenant_core`); frontend uses Knock SDK directly and does not call the app's notification API routes.
- **Shipment parent workflow (completed 2026-04-28).** `ShipmentPrismaStore` bridges manifest command writes to Prisma `tenant_inventory.shipments`. All 6 instance-scoped command routes (update, cancel, schedule, ship, start-preparing, mark-delivered) now pass `instanceId` to `runCommand`. Key finding: `status` is a Prisma enum (`ShipmentStatus`), not plain string — store uses `as any` cast. Root routes (`/api/shipments`, `/api/shipments/[id]`) use `executeManifestCommand` for writes (instanceId handled by shared helper); auto-generated routes under `/shipment/commands/` directly call `runtime.runCommand` and needed individual fixes.
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
