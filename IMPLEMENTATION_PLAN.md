# Capsule-Pro Implementation Plan — Live Queue

> **Last updated:** 2026-04-28 (batch 11 closed — OverrideAudit, PayrollApprovalHistory, PayrollPeriod, PayrollRun stores landed; MenuDish already had inline store — test coverage added; batch 12 now current).
> **Convention:** this file is the **live queue only**. Completed pass write-ups are archived, not appended here. See the **Archive Map** at the bottom for where to look up history.

---

## Current Task — BROKEN_PRISMA_READ Batch 12 (TBD)

Batch 11 closed. The audit temp file (`.manifest-persistence-audit-temp.json`) is no longer available — a fresh audit is needed to determine the remaining BROKEN_PRISMA_READ entities. Run a scan comparing `ENTITIES_WITH_SPECIFIC_STORES` entries against manifest entities that still fall back to `PrismaJsonStore` to identify the next batch.

Candidates from the manifest IR that may still need stores: PrepComment, PricingTier, ProposalLineItem, PurchaseOrderItem, PurchaseRequisition, ScheduleShift, ShipmentItem, TimeEntry, TimecardEditRequest, TrainingAssignment, TrainingModule, VarianceReport, VendorCatalog, VendorContract — verify against Prisma schema before batching.

### Required verification

Run all three before marking any batch done:

```sh
pnpm --filter @repo/manifest-adapters typecheck
pnpm --filter @repo/manifest-adapters test
pnpm --filter api typecheck
```

---

## Remaining BROKEN_PRISMA_READ Batches

Audit source: `.manifest-persistence-audit-temp.json`. BROKEN_RAW_SQL is tracked separately (Blocker #3) and is **not** part of these batches.

| Batch | Status      | Entities |
|-------|-------------|----------|
| 03    | Done        | BudgetLineItem, BulkOrderRule, CateringOrder, ChartOfAccount, Client |
| 04    | Done        | ClientContact, ClientInteraction, ClientPreference, CommandBoard, CommandBoardCard |
| 05    | Done        | CommandBoardConnection, CommandBoardGroup, CommandBoardLayout, ContractSignature, CycleCountRecord |
| 06    | Done        | CycleCountSession, Dish, EmailTemplate, EmailWorkflow, EmployeeAvailability |
| 07    | Done        | EmployeeCertification, EmployeeDeduction, Event, EventBudget, EventContract |
| 08    | Done        | EventDish, EventGuest, EventImportWorkflow, EventProfitability, EventReport |
| 09    | Done        | EventStaff (→EventStaffAssignment), EventSummary, Ingredient, InventoryItem, InventorySupplier |
| 10    | Done        | InventoryTransaction, KitchenTask, LaborBudget, Lead, Menu |
| 11    | Done        | MenuDish, OverrideAudit, PayrollApprovalHistory, PayrollPeriod, PayrollRun |

Re-group by Prisma shape if a batch hits awkward FKs. Update the table when batch 10 closes.

---

## Known Blockers (out of scope for mechanical batches)

These block end-to-end verification for some entities. Do **not** try to fix them inside a BROKEN_PRISMA_READ batch.

1. **Generator — `instanceId` on instance-scoped commands.** Generated HTTP command handlers that mutate an existing row must pass `instanceId` into `runtime.runCommand(...)`. Today archive / acknowledge–style routes call `runCommand` with only `entityName`, so `mutate` / `updateInstance` no-op at the store even after a dedicated Prisma store exists. Reference pattern: `kitchen-tasks/commands/claim`. Owners: manifest generator + route template.

2. **Runtime — manifest constraint polarity for `:block` / `block*` entity constraints.** IR entities carry constraints such as `blockVoteIfFinalized` and `blockFinalizeNoData` (expressions describe a **bad** state; severity `block`). `RuntimeEngine.evaluateConstraint` classifies negative constraints only when `constraint.name.startsWith("severity")`; names like `blockVoteIfFinalized` are treated as positive (`passed = !!result`). Result: legitimate creates/updates are blocked. Fix path: compiler naming convention, runtime polarity detection on `block*`, or manifest rewrite.

3. **BROKEN_RAW_SQL separation.** Notification, Proposal, PurchaseOrder, Schedule, Shipment, User — these still rely on raw SQL hints in the audit. Track and repair separately from BROKEN_PRISMA_READ batches; they need raw-SQL → manifest-store work, not just Prisma store wiring.

4. **`@angriff36/manifest` publish/version coordination.** `apps/api` pins the npm package, but Vitest aliases the workspace runtime (`apps/api/vitest.config.ts`). Tests can pass while deployed bundles still run the previously-published runtime. Any runtime/generator change that the API depends on must be paired with: bump `@angriff36/manifest`, rebuild, republish, and update the pin (or point the app at the workspace package).

---

## Recently Resolved (do not redo)

Full write-ups are in the archive. Highlights:

- **BROKEN_PRISMA_READ Batch 11 (2026-04-28)** — `OverrideAuditPrismaStore` (in `broken-read-batch11-override-audit.ts`) — append-only audit table in `tenant_kitchen`, `@@unique([tenantId, id])` (not `@@id`), no `deletedAt`/`updatedAt` — hard-delete semantics. + `PayrollApprovalHistoryPrismaStore` (in `broken-read-batch11-payroll.ts`) — maps to `ApprovalHistory` Prisma model with polymorphic `entityType: "payroll_run"` filter, no `deletedAt`. + `PayrollPeriodPrismaStore` — snake_case fields (`tenant_id`, `period_start`, `period_end`, `deleted_at` without `@map`), composite key `tenant_id_id`, soft-delete via `deleted_at`. + `PayrollRunPrismaStore` — snake_case fields, composite key `tenant_id_id`, Decimal fields (`total_gross`, `total_deductions`, `total_net`) via `toDecimalRequired()`, soft-delete. MenuDish already had working inline store — test coverage added. Persistence test at `packages/manifest-adapters/__tests__/prisma-store-broken-read-batch11.test.ts` (25 tests). All three validations green: `pnpm --filter @repo/manifest-adapters typecheck`, `pnpm --filter @repo/manifest-adapters test` (377 tests across 20 files), `pnpm --filter api typecheck`.
- **BROKEN_PRISMA_READ Batch 09 (2026-04-28)** — `EventStaffAssignmentPrismaStore`, `EventSummaryPrismaStore` (in `broken-read-batch09-event-staff-summary.ts`) — `EventStaffAssignment` (manifest entity "EventStaff") with nullable DateTime fields (`startTime`, `endTime`), camelCase Prisma fields. `EventSummary` with nullable Json fields (`highlights`, `issues`, `financialPerformance`, `clientFeedback`, `insights`), nullable `overallSummary`, `generationDurationMs`. + `IngredientPrismaStore` (in `broken-read-batch09-ingredient.ts`) — replaced old inline store. Nullable `Decimal` (`densityGPerMl`), `String[]` (`allergens`), `Boolean` (`isActive`). + `InventoryItemPrismaStore`, `InventorySupplierPrismaStore` (in `broken-read-batch09-inventory.ts`) — replaced old inline `InventoryItemPrismaStore`. Mixed camelCase/snake_case Prisma field names. `InventoryItem` with required `Decimal` fields via `toDecimalRequired` (`unitCost`, `quantityOnHand`, `parLevel`, `reorder_level`), `String[]` (`tags`), `fsa_*` fields. `InventorySupplier` with required `Json` (`connectorCredentials`), `String[]` (`tags`), mixed naming (`supplier_number`, `contact_person`, `payment_terms` as snake_case Prisma fields). Persistence test at `packages/manifest-adapters/__tests__/prisma-store-broken-read-batch09.test.ts` (22 tests). All three validations green: `pnpm --filter @repo/manifest-adapters typecheck`, `pnpm --filter @repo/manifest-adapters test` (331 tests across 18 files), `pnpm --filter api typecheck`.

---

## Open Followups (parked, not in current batch)

These are real but deliberately deferred until the BROKEN_PRISMA_READ batches finish, or until their owning blocker is resolved.

- **E1, E3, E5** — runtime/generator items tied to Blockers #1 and #2.
- **E3-2** — generator emit `instanceId` on instance-scoped HTTP routes (depends on #1).
- **A2-1** — adapter audit follow-up captured in `docs/audits/pass-15-input-validation.md`.
- **D3-1 / D3-2** — DB performance follow-ups (`docs/audits/pass-13-db-performance.md`).
- **Manifest republish** — `@angriff36/manifest` version bump + rebuild + repin (Blocker #4).
- **Quarantined manifests** — re-evaluate after generator + polarity fixes land.

---

## Archive Map

History and audits live in two folders. **Append new completed work to these files; do not re-append it here.**

### `docs/implementation-history/`

| File | What it contains |
|------|------------------|
| `passes-38-63.md` | Full text of the 38th–63rd pass logs (manifest repair, generator notes, blocker progress, dedicated Prisma stores). |
| `executive-summary-2026-04-24.md` | Snapshot summary + re-verification deltas captured on 2026-04-24. |
| `blockers-history.md` | Historical Tier-0 / Tier-1 manifest blockers and their resolution. |
| `categories-1-5.md` | Original categories 1–5 issue inventory and triage. |
| `schema-and-techdebt.md` | Schema drift, manifest coverage, recommended order, and tech-debt notes. |

### `docs/audits/`

| File | What it contains |
|------|------------------|
| `pass-04-package-health.md` | Package health audit. |
| `pass-05-e2e-tests.md` | End-to-end test audit. |
| `passes-06-09-raw-sql.md` | Raw SQL audit passes 6–9. |
| `pass-09-frontend-health.md` | Frontend health audit. |
| `pass-10-mobile-website.md` | Mobile + website audit. |
| `pass-11-auth-middleware.md` | Auth + middleware audit (cron auth hardening lives here). |
| `pass-12-test-quality.md` | Test quality audit. |
| `pass-13-db-performance.md` | DB performance audit (D3-1 / D3-2 followups). |
| `pass-14-error-handling.md` | Error handling audit. |
| `pass-15-input-validation.md` | Input validation audit (A2-1 followup). |

### Other repo docs (not part of this cleanup)

- `AGENTS.md` — durable rules for agents (Manifest Persistence Repair Rules, etc.).
- `CLAUDE.md` — Claude Code entry point; imports `AGENTS.md`.
- `PROMPT_build.md` / `PROMPT_plan.md` — Ralph loop prompts for build vs plan modes.
- `README.md` — repo overview.

---

## Update Discipline

When you finish a pass:

1. Move the detailed write-up into the appropriate archive file (`docs/implementation-history/...` or `docs/audits/...`).
2. Update only the **Recently Resolved**, **Remaining BROKEN_PRISMA_READ Batches** table, and **Known Blockers** sections in this file.
3. Replace **Current Task** with the next batch (or next live task).
4. Keep this file ≤ ~300 lines. If it grows past that, more content needs to move to the archive.
5. Never delete archive content — append to it.
