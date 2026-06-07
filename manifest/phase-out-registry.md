# Phase-Out Registry — Code to Delete Once Manifest Automation Lands

> **Rule:** Nothing here is deleted until its IR-driven replacement is **proven** (generated,
> typechecked, tested, and drift-checked in CI). One retirement per PR. Prove the replacement,
> flip the consumer, delete the old, run the full suite. Track status in the table.

Legend: **Status** = `BLOCKED` (waiting on a phase) · `READY` (replacement proven, safe to delete) · `DONE` (removed).

---

## A. Hand-rolled Prisma stores → IR-driven store generation/provider (Phase 4)
Replaced by: a generic IR-driven store provider OR a generated store projection (see prompt).
(~95 `*PrismaStore` classes total across the dir + provider file.)

| Path | LOC | Replaced by | Status |
|---|---|---|---|
| `manifest/runtime/src/prisma-stores/` (entire dir, **43 files**) | 12,207 | generated/generic stores | BLOCKED (Phase 4) |
| `manifest/runtime/src/prisma-store.ts` (`createPrismaStoreProvider` switch) | 3,075 | IR-driven provider (lookup, not switch) | BLOCKED (Phase 4) |
| `prisma-stores/broken-read-batch*` naming convention | — | n/a (artifact of manual migration) | BLOCKED |

**Do NOT delete `prisma-stores/shared.ts` blindly** — its coercion helpers (`toDecimalInput`,
`asJsonInput`, `asNullableDate`) may still be needed by the generic provider. Migrate, then delete.

## B. Hand-authored Prisma schema → `PrismaProjection` + mapping config (Phases 2–3)
| Path | What changes | Status |
|---|---|---|
| `packages/database/prisma/schema.prisma` | **NOT deleted** — becomes a generated artifact (model blocks from IR). Keep generator + datasource header; models become regenerated + drift-checked. | BLOCKED (Phase 2) |
| Manual model-editing workflow | Replaced by: edit `.manifest` source → recompile IR → regenerate schema → `db:dev --create-only`. | BLOCKED (Phase 3) |

## C. Route accessor hack → schema-aware accessor resolution (Phase 1)
| Path | What changes | Status |
|---|---|---|
| Naive `camelCase` accessor in generated routes | Producer (`generate.mjs`) resolves accessor via `resolveAccessor()` from the canonical `manifest/scripts/entity-domain-map.mjs` (`ENTITY_ACCESSOR_OVERRIDES`); rewrites drifted `database.<naive>`, drops routes for table-less entities. | DONE (2026-05-30) |
| `apps/api/app/api/events/import-workflows/{list,[id]}/route.ts` | **REMAP, not delete.** Stale claim corrected: `EventImportWorkflow` **does** have a table — `model EventImport @@map("event_imports")` (schema.prisma:1437), confirmed by store header `broken-read-batch08-event-guest-import.ts`. Producer now rewrites `database.eventImportWorkflow → database.eventImport`. | DONE (2026-05-30) |
| `apps/api/app/api/events/staff/{list,[id]}/route.ts` | REMAP `database.eventStaff → database.eventStaffAssignment` (`model EventStaffAssignment @@map("event_staff_assignments")`, schema.prisma:1394; store header `broken-read-batch09-event-staff-summary.ts`). | DONE (2026-05-30) |
| `apps/api/app/api/audit/logs/route.ts` | **DELETED.** Hand-written (no DO-NOT-EDIT marker), GET-only, referenced non-existent `database.tenantAuditLog`. No audit model in schema carries its selected columns (`operationType`/`immutableHash`/`aiConfidence`/`performedAt`); rewriting would invent semantics (constitution §10). Not referenced by any app code (the dev-console audit page uses `OverrideAudit`). Was gitignored by the broad `logs` rule (.gitignore:129), now tightened to `/logs/`. | DONE (2026-05-30) |
| Broken generated routes for "the other ~22 table-less/misnamed entities" | **Re-scoped.** Empirical scan (ENTITY_DOMAIN_MAP's 89 entities vs the 224 real Prisma model accessors) found the blast radius is exactly **2** entities — `EventStaff` + `EventImportWorkflow` — both handled above. notes.md §1's "~25" counted IR entities the producer never emits routes for (they hit "No domain mapping … skipping"), not actual broken generated routes. No further accessor fixes needed for Phase 1. | DONE (2026-05-30) |

## D. Adjacent hand-written code potentially retired by unused projections (Phase 5, evaluate)
Only delete after confirming the projection output covers the real usage.
| Candidate area | Could be replaced by projection | Status |
|---|---|---|
| Hand-written Zod input schemas for manifest entities | `projections/zod` | BLOCKED (Phase 5 eval) |
| Hand-written React Query hooks for manifest entities | `projections/react-query` | BLOCKED (Phase 5 eval) |
| Hand-written/partial OpenAPI specs for manifest routes | `projections/openapi` | BLOCKED (Phase 5 eval) |
| `ENTITY_DOMAIN_MAP` duplication | single shared source (`manifest/scripts/entity-domain-map.mjs`) | PARTIAL (2026-05-30) |

**ENTITY_DOMAIN_MAP consolidation status (corrected):** the "3 files" claim is stale.
- `manifest/scripts/generate.mjs` — **now imports** the canonical map from `entity-domain-map.mjs`. DONE.
- `manifest/scripts/generate-all-routes.mjs` — no longer contains the map; it was refactored into a validation-only script (no `ENTITY_DOMAIN_MAP`). Nothing to consolidate.
- `manifest/scripts/generate-route-manifest.ts` — still has its own copy (note: it has a pre-existing quirk `Event: "manifest/Event"` that differs from the others — needs reconciliation, not a blind copy). Run by `manifest:routes:ir`. **STILL TO DO.**
- `packages/mcp-server/src/lib/entity-domain-map.ts` — a 4th copy (TS, in a different workspace package). **STILL TO DO.**
Deferred deliberately: those two are separate scripts/packages with their own typing + the `manifest/Event` quirk; folding them in is out of scope for the deploy-unblock PR (one concern per PR). Tracked here.

## E. Legacy `executeManifestCommand` → canonical `runManifestCommand` migration

Legacy handler: `apps/api/lib/manifest-command-handler.ts` (289 LOC).
Canonical handler: `apps/api/lib/manifest/execute-command.ts` → `runManifestCommand` from `@repo/manifest-runtime/run-manifest-command-core`.

**Migration pattern:** import swap + caller resolves user/body (the canonical handler does not do it internally).

### Migrated (7 routes, 2026-06-04)
| Route | Entity | Notes |
|---|---|---|
| `app/api/lead/route.ts` | Lead | transformBody inlined; ctx.userId not used |
| `app/api/payroll/approvals/route.ts` | PayrollApprovalHistory | ctx.userId→user.id (performedBy) |
| `app/api/payroll/deductions/route.ts` | EmployeeDeduction | transformBody inlined |
| `app/api/payroll/periods/route.ts` | PayrollPeriod | transformBody inlined |
| `app/api/rolepolicy/grant/route.ts` | RolePolicy | ctx.userId→user.id (grantedBy) |
| `app/api/rolepolicy/revoke/route.ts` | RolePolicy | ctx.userId→user.id (revokedBy) |
| `app/api/rolepolicy/update/route.ts` | RolePolicy | transformBody inlined |

### Migrated (2 routes, 2026-06-05) — Task 8.2
| Route | Entity | Notes |
|---|---|---|
| `app/api/accounting/payment-methods/route.ts` | PaymentMethod | POST create → Manifest; GET unchanged (Prisma read) |
| `app/api/accounting/payment-methods/[id]/route.ts` | PaymentMethod | PUT update, PATCH actions (markAsDefault/verify/flagForFraud/markExpired/remove), DELETE remove → Manifest; GET unchanged (Prisma read) |

### Migrated (2 routes, 2026-06-06) — Task 8.2 batch 10
| Route | Entity | Notes |
|---|---|---|
| `app/api/accounting/invoices/route.ts` | Invoice | POST create → Manifest (batch 9); GET unchanged (Prisma read) |
| `app/api/accounting/invoices/[id]/route.ts` | Invoice | PUT update, PATCH actions (applyPayment/markAsPaid/markOverdue/sendReminder), POST send, DELETE voidInvoice → Manifest; GET unchanged (Prisma read). Manifest update command added. Transitions SENT→PARTIALLY_PAID/PAID, VIEWED→PARTIALLY_PAID/PAID added. |

### Migrated (1 route, 2026-06-06) — Task 8.3 payments POST
| Route | Entity | Notes |
|---|---|---|
| `app/api/accounting/payments/route.ts` | Payment | POST create → Manifest; explicit Invoice.applyPayment removed (PaymentProcessed reaction handles it); GET unchanged (Prisma read); ACCEPTED_NOT_APPLIED fallback retained as minimal Prisma bypass |

### COMPLETED: Legacy manifest-command-handler.ts removal (2026-06-04)
- File: `apps/api/lib/manifest-command-handler.ts` (289 lines) — **DELETED**
- All 71 route consumers migrated to canonical `runManifestCommand` from `@/lib/manifest/execute-command`
- All 11 test file mocks updated
- Webhook dispatch preserved via fire-and-forget in canonical handler
- Zero remaining imports of deleted file
- Status: **DONE**

## F. Explicitly NOT for phase-out (keep)
- The singular command dispatcher `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` (canonical write path, constitution §6).
- `manifest/runtime/src/manifest-runtime-factory.ts` (rewire to new provider; do not delete).
- `manifest/scripts/audit-schema-drift.mjs` (upgrade to compare generated vs committed).
- The `@angriff36/manifest` package and `manifest/runtime/` workspace package.

---

## Exit criteria (all must be true before declaring the initiative done)
1. `pnpm manifest:generate` produces schema + routes (+ stores) with **zero** broken `database.*` accessors.
2. `pnpm --filter api typecheck` and `next build` are green with no generated-surface drift.
3. CI drift gate: re-running generation produces no diff against committed artifacts.
4. Sections A–C above are `DONE`; D evaluated and resolved.
5. No file outside `node_modules` hand-edits a `// Generated from Manifest IR - DO NOT EDIT` file.
