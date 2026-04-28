# Capsule-Pro Implementation Plan — Live Queue

> **Last updated:** 2026-04-28 (batch 03 closed — BudgetLineItem, BulkOrderRule, CateringOrder, ChartOfAccount, Client stores landed; batch 04 now current).
> **Convention:** this file is the **live queue only**. Completed pass write-ups are archived, not appended here. See the **Archive Map** at the bottom for where to look up history.

---

## Current Task — BROKEN_PRISMA_READ Batch 04

Implement batch 04 only:

- ClientContact
- ClientInteraction
- ClientPreference
- CommandBoard
- CommandBoardCard

Use the AlertsConfig / batch01 / batch02 / batch03 repair pattern (see `AGENTS.md` → **Manifest Persistence Repair Rules**, the existing stores in `packages/manifest-adapters/src/prisma-stores/`, and the persistence test at `packages/manifest-adapters/__tests__/prisma-store-broken-read-batch03.test.ts`).

**Order of work:** complete **ClientContact** first as the representative entity. If its store + wiring + persistence test pass, continue with the rest of batch 04 in alphabetical order.

### Required verification

Run all three before marking the batch done:

```sh
pnpm --filter @repo/manifest-adapters typecheck
pnpm --filter @repo/manifest-adapters test
pnpm --filter api typecheck
```

The persistence test (one file per batch in `packages/manifest-adapters/__tests__/`) must contain one `it(...)` per entity and exercise tenant scoping + `create → getAll/getById` round-trips against mocked Prisma model accessors.

### Hard rules (do not break)

- Do **not** modify Manifest runtime, generator, IR compiler, or constraint polarity in this batch. Those are tracked separately under **Known Blockers**.
- Do **not** touch BYPASS routes. They are intentionally out of the manifest pipeline.
- Do **not** change `executeManifestCommand` semantics or how `instanceId` is threaded — that is a generator-level fix (Blocker #1).

### Allowed changes (per entity)

1. Add a dedicated `PrismaStore` in `packages/manifest-adapters/src/prisma-stores/broken-read-batch04-*.ts` (group entities by Prisma shape; one shared file plus per-shape files is fine). Reuse the helpers from `prisma-stores/shared.ts` (`toDecimalInput`, `toDecimalRequired`, `asJsonInput`, `asString`, `asNullableString`, `asNullableNumber`, `asNullableDate`, `asStringArray`, `asBool`, `reportOp`).
2. Add the entity name to `ENTITIES_WITH_SPECIFIC_STORES`.
3. Add the `case` for the entity in `createPrismaStoreProvider` in `prisma-store.ts`.
4. Add a targeted persistence test in `packages/manifest-adapters/__tests__/prisma-store-broken-read-batch04.test.ts` with `vi.hoisted` mocks per Prisma model accessor (mirror `prisma-store-broken-read-batch03.test.ts`).
5. Use `toDecimalInput()` for nullable `Decimal` columns and `toDecimalRequired()` for non-null ones — never `new Prisma.Decimal(...)` directly. The mocked `@repo/database` does not expose a real `Prisma.Decimal` constructor.

### SEMANTIC_BLOCKER handling

If an entity in this batch:

- lacks a usable `create` command, **or**
- depends on an instance-scoped command whose generated route omits `instanceId` (Blocker #1), **or**
- triggers `block*` constraint polarity issues (Blocker #2), **or**
- otherwise needs a runtime / generator / manifest semantic change to verify end-to-end,

mark it **SEMANTIC_BLOCKER**, leave the Prisma store wired for when the runtime fix lands, document the blocker line under **Known Blockers**, and continue with the next entity. Do not attempt to "work around" a semantic blocker by editing the runtime in this batch.

---

## Remaining BROKEN_PRISMA_READ Batches

Audit source: `.manifest-persistence-audit-temp.json`. BROKEN_RAW_SQL is tracked separately (Blocker #3) and is **not** part of these batches.

| Batch | Status      | Entities |
|-------|-------------|----------|
| 03    | Done        | BudgetLineItem, BulkOrderRule, CateringOrder, ChartOfAccount, Client |
| 04    | **CURRENT** | ClientContact, ClientInteraction, ClientPreference, CommandBoard, CommandBoardCard |
| 05    | Queued      | CommandBoardConnection, CommandBoardGroup, CommandBoardLayout, ContractSignature, CycleCountRecord |
| 06    | Queued      | CycleCountSession, Dish, EmailTemplate, EmailWorkflow, EmployeeAvailability |
| 07    | Queued      | EmployeeCertification, EmployeeDeduction, Event, EventBudget, EventContract |
| 08    | Queued      | EventDish, EventGuest, EventImportWorkflow, EventProfitability, EventReport |
| 09    | Queued      | EventStaff, EventSummary, Ingredient, InventoryItem, InventorySupplier |
| 10    | Queued      | InventoryTransaction, KitchenTask, LaborBudget, Lead, Menu |
| 11    | Queued      | MenuDish, OverrideAudit, PayrollApprovalHistory, PayrollPeriod, PayrollRun |

Re-group by Prisma shape if a batch hits awkward FKs. Update the table when batch 04 closes.

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

- **BROKEN_PRISMA_READ Batch 03 (2026-04-28)** — `BudgetLineItemPrismaStore`, `BulkOrderRulePrismaStore`, `CateringOrderPrismaStore` (in `broken-read-batch03-budget-bulk-catering.ts`) + `ChartOfAccountPrismaStore`, `ClientPrismaStore` (in `broken-read-batch03-chart-client.ts`). Wired into `ENTITIES_WITH_SPECIFIC_STORES` and `createPrismaStoreProvider`. Persistence test at `packages/manifest-adapters/__tests__/prisma-store-broken-read-batch03.test.ts` (10 tests, covers tenant scoping, snake/camelCase aliases, AccountType enum coercion, hard vs. soft delete).
- **BROKEN_PRISMA_READ Batches 01 + 02 (2026-04-28, repaired in same session)** — earlier "Recently Resolved" claim referenced files that didn't exist on disk; this session actually authored `broken-read-batch01-prepmethod-container.ts`, `broken-read-batch01-waste-workflow.ts`, `broken-read-batch02-admin.ts`, `broken-read-batch02-api-battle-budget.ts`, plus the shared helper module `prisma-stores/shared.ts` (`toDecimalInput`, `toDecimalRequired`, `asJsonInput`, coercers, Sentry-reporting `reportOp`). Six previously-broken imports in `prisma-store.ts` now resolve; `pnpm --filter @repo/manifest-adapters test` is green at 239 tests across 12 files.
- **Side-fix: kitchen recipe slug rename leftovers** — commit `c7ba29493` renamed the recipe route directory from `[recipeId]` to `[id]` but left dangling `id` references in `app/api/kitchen/recipes/[id]/steps/route.ts`, `versions/route.ts`, and a stale import path in `__tests__/kitchen/recipes/recipe-ingredients-query.test.ts`. Fixed in passing so `pnpm --filter api typecheck` is clean.
- **AlertsConfig** — original dedicated Prisma store template that all batches now follow. (`docs/implementation-history/passes-38-63.md`)
- **Tier-0 / Tier-1 Manifest blockers** — seven previously-tracked blockers closed across passes 38–63. (`docs/implementation-history/blockers-history.md`)
- **Manifest input validation** — runtime now validates command input schemas (C1-1, C1-2). (`docs/implementation-history/passes-38-63.md`)
- **Cron auth + pagination clamps** — production hardening from earlier audit passes. (`docs/audits/pass-04-package-health.md`, `docs/audits/pass-11-auth-middleware.md`)

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
