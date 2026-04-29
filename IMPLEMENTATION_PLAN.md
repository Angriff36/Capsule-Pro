# Capsule-Pro Implementation Plan — Live Queue

> **Last updated:** 2026-04-28 (BROKEN_RAW_SQL parent workflows complete; all 8 steps done). **Convention:** this file is the **live queue only**. Completed pass write-ups are archived, not appended here. See the **Archive Map** at the bottom for where to look up history.

---

## Current Task — Fix BROKEN_RAW_SQL parent workflows

**STATUS: COMPLETE.** All 8 in-scope parent entities have been fixed. The write/read split that caused user actions to vanish on refresh is resolved for every entity listed below. Detailed write-ups are archived in `docs/implementation-history/passes-38-63.md` (Passes 64–71 section).

In-scope parents (all done):

| # | Entity | Tenant schema | Status | Store file | Command routes fixed | Test file | Assertions |
| - | ----------------- | ---------------- | ------ | --------- | -------------------- | --------- | ---------- |
| 1 | **Proposal** | tenant_crm | DONE | `broken-read-proposal-parent.ts` | 6 (update, send, accept, reject, withdraw, mark-viewed) | `crm/proposals/proposal-end-to-end.test.ts` | 11 |
| 2 | **PurchaseOrder** | tenant_inventory | DONE | `broken-read-po-parent.ts` | 6 (submit, approve, reject, cancel, mark-ordered, mark-received) | `inventory/purchase-orders/purchase-order-end-to-end.test.ts` | 10 |
| 3 | **Notification** | tenant_admin | DONE | `broken-read-notification-parent.ts` | 3 (mark-read, mark-dismissed, remove) | `collaboration/notifications/notification-end-to-end.test.ts` | 11 |
| 4 | **Schedule** | tenant_staff | DONE | `broken-read-schedule-parent.ts` | 3 (update, release, close) | `staff/schedules/schedule-end-to-end.test.ts` | 9 |
| 5 | **Shipment** | tenant_inventory | DONE | `broken-read-shipment-parent.ts` | 6 (update, cancel, schedule, ship, start-preparing, mark-delivered) | `logistics/shipments/shipment-end-to-end.test.ts` | 11 |
| 6 | **User** | tenant_staff | DONE | `broken-read-user-parent.ts` | 4 (update, deactivate, terminate, update-role) | `staff/users/user-end-to-end.test.ts` | 15 |
| 7 | **PurchaseRequisition** | tenant_inventory | DONE | `broken-read-requisition-parent.ts` | 7 (update, submit, approve-manager, approve-finance, reject, convert-to-po, cancel) | `procurement/requisitions/requisition-end-to-end.test.ts` | 17 |
| 8 | **VendorContract** | tenant_inventory | DONE | switch case added (store from batch 13) | 10 (create, update, submit, approve, reject, activate, terminate, renew, update-compliance, record-sla-breach) | `procurement/vendor-contracts/vendor-contract-end-to-end.test.ts` | 19 |

### Required pattern (for future similar work)

1. **Trace the live route** from frontend to canonical API paths.
2. **Classify each route** as raw SQL, Prisma, Manifest store, or mixed.
3. **Add a parent `<Entity>PrismaStore**, wire into `ENTITIES_WITH_SPECIFIC_STORES` and `createPrismaStoreProvider` switch.
4. **Fix `instanceId`** on all instance-scoped command routes (Blocker #1).
5. **Add an HTTP-route integration test** proving command write -> read-path visibility.

### Out of scope for this task

- New BROKEN_PRISMA_READ store batches (backlog is done).
- Bypass-route cleanup that doesn't touch the in-scope parents.
- Manifest authoring for quarantined domains (`packages/manifest-adapters/manifests-disabled/`).
- Rewriting routes that the frontend doesn't actually call (camelCase orphans under `/api/{entity}/`).

### Required verification per entity

```sh
pnpm --filter @repo/manifest-adapters typecheck
pnpm --filter @repo/manifest-adapters test
pnpm --filter api typecheck
pnpm --filter api test                # at least the new HTTP route test
```

---

## Tracked but not started

All in-scope parent entities are complete (Steps 1–8). No further entities are queued. Future work items live in **Open Followups** below.

---

## Known Blockers (reuse, do not duplicate)

These are the structural blockers this phase will hit. Don't rediscover them — link to them.

1. **Generator — `instanceId` on instance-scoped commands.** Generated HTTP command handlers that mutate an existing row must pass `instanceId` into `runtime.runCommand(...)`. **Partially resolved:** all 8 in-scope parent routes were fixed manually; the generator still does not emit `instanceId` automatically for new routes.
2. **Runtime — manifest constraint polarity for `:block` / `block*` entity constraints.** IR entities carry constraints such as `blockVoteIfFinalized` (expressions describe a **bad** state; severity `block`). `RuntimeEngine.evaluateConstraint` classifies negative constraints only when `constraint.name.startsWith("severity")`; names like `blockVoteIfFinalized` are treated as positive. Result: legitimate creates/updates are blocked. **RESOLVED 2026-04-28:** `evaluateConstraint` now also checks `constraint.name.startsWith('block')` for negative-type detection. 39 production block* constraints now correctly fire when bad-state conditions are met. Conformance fixture renamed to avoid false detection. **In-phase rule:** if a valid write is rejected, file a focused sub-task with a failing test; pause the entity until the polarity fix lands.
3. **`@angriff36/manifest` publish/version coordination.** `apps/api` pins the npm package, but Vitest aliases the workspace runtime. Tests can pass while deployed bundles still run the previously-published runtime.
4. **Bypass / camelCase duplicate routes.** Many entities have stale camelCase route directories that the frontend does not call. Don't fix them in this phase.

---

## Recently Resolved (do not redo)

Full write-ups live in the archive. Bullet summaries:

- **BROKEN_RAW_SQL parent workflows (2026-04-28):** All 8 parent entities (Proposal, PurchaseOrder, Notification, Schedule, Shipment, User, PurchaseRequisition, VendorContract) now have PrismaStore bridges, fixed `instanceId` on all command routes, and passing HTTP integration tests. 103 total assertions across 8 test files. Archive: `docs/implementation-history/passes-38-63.md` (Passes 64–71 section).
- **BROKEN_PRISMA_READ Batches 03–13 (closed 2026-04-28):** Twelve mechanical batches landed dedicated Prisma stores for AlertsConfig and 50+ other entities. All BROKEN_PRISMA_READ candidates with a Prisma model now have stores. Archive: `docs/implementation-history/passes-38-63.md`.
- **Payroll bank-accounts (confirmed resolved 2026-04-28):** all 6 routes use Prisma ORM, EmployeeBankAccount model exists, RLS enabled. Prior raw-SQL claim was stale.

---

## Open Followups (parked, not in current task)

- **E1, E3, E5** — runtime/generator items tied to Blockers #1 and #2.
- **E3-2** — generator emit `instanceId` on instance-scoped HTTP routes (depends on Blocker #1; partially addressed by manual fixes in Passes 64–71).
- **A2-1** — adapter audit follow-up captured in `docs/audits/pass-15-input-validation.md`.
- **D3-1 / D3-2** — DB performance follow-ups (`docs/audits/pass-13-db-performance.md`).
- **Manifest republish** — `@angriff36/manifest` version bump + rebuild + repin (Blocker #3).
- **Quarantined manifests** — re-evaluate after generator + polarity fixes land. Blocker #2 (constraint polarity) is now resolved, unblocking manifest re-integration evaluation.
- ~~**Procurement requisitions / vendor-contracts 500s**~~ — **RESOLVED** in Passes 70–71. Both PurchaseRequisition and VendorContract have Prisma stores wired, manifests are active (not disabled), and instanceId is fixed on all command routes. The stale claims in AGENTS.md Known Gotchas should be updated accordingly.
- **AGENTS.md stale corrections** — Known Gotchas entries for PurchaseRequisition ("no Prisma model", "manifests in manifests-disabled/") are now stale. Update to reflect completion.

---

## Archive Map

History and audits live in two folders. **Append new completed work to these files; do not re-append it here.**

### `docs/implementation-history/`

| File | What it contains |
| ---- | ---------------- |
| `passes-38-63.md` | Full text of pass logs 38–71: manifest repair, generator notes, blocker progress, dedicated Prisma stores, BROKEN_PRISMA_READ batches 03–13, and BROKEN_RAW_SQL parent workflows (Passes 64–71). |
| `executive-summary-2026-04-24.md` | Snapshot summary + re-verification deltas captured on 2026-04-24. |
| `blockers-history.md` | Historical Tier-0 / Tier-1 manifest blockers and their resolution. |
| `categories-1-5.md` | Original categories 1–5 issue inventory and triage. |
| `schema-and-techdebt.md` | Schema drift, manifest coverage, recommended order, and tech-debt notes. |

### `docs/audits/`

| File | What it contains |
| ---- | ---------------- |
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

When you finish work on an in-scope parent:

1. Move the detailed write-up into `docs/implementation-history/passes-38-63.md` (or the next pass file). Include: route map before/after, store changes, instanceId fixes, polarity sub-tasks if any, and the HTTP-test name.
2. Update only **Recently Resolved**, the in-scope table at the top, and **Known Blockers** (only if a blocker resolved or a new one surfaced).
3. Keep this file <= 300 lines. If it grows, more content needs to move to the archive.
4. Never delete archive content — append to it.
