# Phase-Out Registry — Code to Delete Once Manifest Automation Lands

> **Rule:** Nothing here is deleted until its IR-driven replacement is **proven** (generated,
> typechecked, tested, and drift-checked in CI). One retirement per PR. Prove the replacement,
> flip the consumer, delete the old, run the full suite. Track status in the table.

Legend: **Status** = `BLOCKED` (waiting on a phase) · `READY` (replacement proven, safe to delete) · `DONE` (removed).

---

## A. Hand-rolled Prisma stores → IR-driven store generation/provider (Phase 4)
Replaced by: native `@angriff36/manifest/stores/prisma-generic` (GenericPrismaStore, shipped 3.1.3) + `RuntimeOptions.storeProvider`.

> **RECONCILIATION 2026-07-04 (PR #78 / 3.1.3):** The "keep `manifest-runtime-factory.ts`" framing
> below is SUPERSEDED. Native GenericPrismaStore + companion-emitted `createManifestRuntime` now
> ship. The deletion directive says: delete the factory as runtime owner; move the 4 bespoke stores'
> business logic into `.manifest` source or a thin Capsule options module; keep at most a thin binding
> module. See canonical `manifest.runtime-native-ownership` Q001/Q002 (NEEDS-RYAN).

| Path | LOC (approx) | Replaced by | Status |
|---|---|---|---|
| `manifest/runtime/src/prisma-stores/generic-prisma-store.ts` | 323 | package `GenericPrismaStore` | **DONE** (2026-06-10) |
| `manifest/runtime/src/prisma-stores/` (remainder: **4 files**) | ~350 | package generic + bespoke exceptions | **PARTIAL** — bespoke stores remain |
| `manifest/runtime/src/prisma-store.ts` (`createPrismaStoreProvider` switch) | ~990 | registry `createGenericPrismaStore` + 6 bespoke cases | **PARTIAL** — switch for exceptions only |
| `manifest/runtime/src/manifest-runtime-factory.ts` | **2,050** | native companion-emitted `createManifestRuntime` + thin Capsule options module | **DELETION TARGET** — needs `emitCompanions:true` flip (Ryan decision, `canonical/manifest/runtime-native-ownership`) |
| `prisma-stores/broken-read-batch*` naming | — | `inventory-transfer-prisma-store.ts` | **DONE** (renamed 2026-06-10) |

**Remaining bespoke stores (intentional):** PrepTask, KitchenTask, PrepTaskPlanWorkflow, Station, InventoryTransfer, Event (`event-prisma-store.ts`).

**Do NOT delete `prisma-stores/shared.ts` blindly** — still used by bespoke stores. Package `coercion.ts` covers generic path.

**Generated root consolidation (2026-06-10):** Runtime Prisma metadata now lives at `manifest/generated/runtime/` (tracked). `manifest/runtime/src/generated` is a junction to that path. Orphan Prisma client copy under `manifest/generated/models/` removed via `cleanup-generated-orphans.mjs` (wired into `manifest:build`).

**Structural debt progress (2026-06-10):**
| Issue | Status |
|---|---|
| Two `generated/` roots | **PARTIAL** — single canonical tree; junction preserves TS imports |
| `index.ts` god file | **DONE** — thin barrel (~220 LOC); `kitchen/` modules |
| Flat `source/` | **DONE** — 94 files → domain subdirs; `module-graph.json` |
| `kitchen.ir.json` monolith | **DONE** — merged file is canonical; per-source IR shards REMOVED 2026-06-24 (write-only, zero consumers — `compile.mjs` no longer emits them) |
| Three schemas | **DOCUMENTED** — `ir/README.md` roles table; candidate banner |
| Root planning sprawl | **PARTIAL** — root `PROMPT_*.md` → `docs/planning/root-snapshots/` |
| `manifest/generated/models/` naming | **DONE** — orphan tree deleted |
| Runtime `dist/` / `node_modules/` | **DONE** — `manifest/runtime/.gitignore` |

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
| Hand-written Zod input schemas for manifest entities | `projections/zod` | **NO-GO for now (eval 2026-06-15).** Generator works (`generate-zod-schemas.mjs`, surface `zod.entity`, 210 files) but its output dir `manifest/generated/schemas/` is **gitignored by design** (`.gitignore:610 manifest/generated/*`) and has **0 consumers** — no committed surface to gate or retire against. Determinism blocker (per-file `// Generated at:` + barrel timestamp) **fixed this increment** (producer-side strip, mirrors OpenAPI; back-to-back runs byte-identical) so it is gate-ready IF de-gitignored + consumed. No hand-written zod schemas exist to retire. Revisit only if input validation is actually wired to the projection. |
| Hand-written React Query hooks for manifest entities | `projections/react-query` | **DRIFT-GATED (2026-06-15).** `pnpm manifest:react-query:check` (`check-react-query-drift.mjs`, mirror of `check-openapi-drift.mjs`) is wired into `manifest:ci` after `manifest:openapi:check`; output `apps/app/app/lib/manifest-hooks.generated.ts` is tracked + deterministic (byte-identical across runs). The prior wiring blocker — the uncommitted half-applied `@angriff36/manifest 2.5.1→2.7.0` bump (never installed; lockfile/node_modules still 2.5.1) — was reverted to 2.5.1. The committed file was ~13.3k lines stale and was refreshed in the same commit (210 entities / 1413 hook exports). No hand-written react-query hooks exist to retire; the gate protects the generated surface from rot (satisfies exit-criterion #3 for this projection). Consumed today only by the `manifest-hooks-pilot.ts` re-export. |
| Hand-written/partial OpenAPI specs for manifest routes | `projections/openapi` | **DONE (2026-06-15)** — `projections/openapi` is wired (`pnpm manifest:openapi` → committed `manifest/api-docs/openapi.json`, served at `/api-docs`, consumed by MCP). No hand-written OpenAPI spec existed to retire; the generated spec is now CI drift-gated (`pnpm manifest:openapi:check` in `manifest:ci`), satisfying exit-criterion #3 for this projection. |
| `ENTITY_DOMAIN_MAP` duplication | single shared source (`manifest/scripts/entity-domain-map.mjs`) | DONE (2026-06-15) |

**ENTITY_DOMAIN_MAP consolidation status (corrected):** the "3 files" claim is stale.
- `manifest/scripts/generate.mjs` — **now imports** the canonical map from `entity-domain-map.mjs`. DONE.
- `manifest/scripts/generate-all-routes.mjs` — no longer contains the map; it was refactored into a validation-only script (no `ENTITY_DOMAIN_MAP`). Nothing to consolidate.
- `manifest/scripts/generate-route-manifest.ts` — **DONE.** Now imports the canonical map (`generate-route-manifest.ts:6` → `import { ENTITY_DOMAIN_MAP } from "./entity-domain-map.mjs"`); the old embedded copy and its `Event: "manifest/Event"` quirk are gone (run via `tsx` per `manifest:routes:ir`, so the `.mjs` import resolves transparently). Verified 2026-06-15.
- `packages/mcp-server/src/lib/entity-domain-map.ts` — **DONE** (consolidated 2026-06-07, commit `5af26f3ce`). Now an 8-line ESM re-export (`entity-domain-map.ts:9` → `export { ENTITY_DOMAIN_MAP } from "../../../../manifest/scripts/entity-domain-map.mjs"`), with types from the sibling `manifest/scripts/entity-domain-map.d.mts`. The prior 14-line `require()` CJS hack was removed. Verified 2026-06-15.
Resolution: all four call sites now resolve `ENTITY_DOMAIN_MAP` from the single canonical `manifest/scripts/entity-domain-map.mjs`; no embedded copies and no `manifest/Event` quirk remain. The `ENTITY_DOMAIN_MAP` duplication is fully retired.

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

### Migrated (1 route, 2026-06-06) — Task 8.3 batch 14 inventory item [id]
| Route | Entity | Notes |
|---|---|---|
| `app/api/inventory/items/[id]/route.ts` | InventoryItem | PUT update → Manifest (COALESCE→read-merge-write; snake_case→camelCase mapping; recipe cost recalculation retained as post-command side effect); DELETE softDelete → Manifest (7-table dependency pre-validation retained); GET unchanged (Prisma read). `$executeRaw` writes fully removed. |

### Migrated (1 route, 2026-06-14) — direct-write governance cleanup (Known Blocker #22, v0.12.285)
| Route | Entity | Notes |
|---|---|---|
| `app/api/crm/scoring/route.ts` | CrmScoringRule | POST create → Manifest (`runManifestCommand("CrmScoringRule","create")`); was a direct `database.crmScoringRule.create` bypass (constitution §9). snake_case→camelCase param mapping + coercion preserved; input validation (required fields + condition/field enums) retained pre-dispatch; GET `$queryRaw` read unchanged (§10). Live frontend create already used the dispatcher (`crmScoringRuleCreate`), so no consumer contract changed. Conformance test: `apps/api/__tests__/crm/scoring-post-governed.test.ts` (4). Drops governed direct-write violations 7→6. |

### Resolved (1 route, 2026-06-15) — direct-write governance cleanup (Known Blocker #22, v0.12.310)
| Route | Entity | Notes |
|---|---|---|
| `apps/api/app/api/administrative/chat/threads/[threadId]/messages/route.ts` | AdminChatThread | **DELETED a redundant `database.adminChatThread.update({lastMessageAt})` bypass** (constitution §9), NOT a re-route — the manual thread-activity bump was already covered by the live governed reaction `AdminChatMessageSent → AdminChatThread.recordLastMessage` (resolves `payload.threadId` → `recordLastMessage()` mutates `lastMessageAt = now()`), which fires during the `runManifestCommand("AdminChatMessage","create")` dispatch earlier in the same handler. So the direct write was both a §9 governed-entity bypass AND a double-write. No IR/source/artifact change (the reaction + command already existed). `message.createdAt` stays used (SSE publish + response). Regression protection: the existing reaction conformance test (`manifest/runtime/src/__tests__/admin-chat-message-thread-activity-reaction.test.ts`, 4 tests, proves the propagation against the real IR via `RuntimeEngine.runCommand`) + the direct-write baseline gate (`manifest:audit-direct-writes:baseline`, now 8→7 triples). Governed direct-write violations drop 6→5 files. api typecheck green. |

### Resolved (1 action, 2026-06-21) — direct-write governance cleanup (Known Blocker #22)
| File | Entity | Notes |
|---|---|---|
| `apps/app/app/(authenticated)/crm/proposals/templates/actions.ts` | ProposalTemplate | **Migrated the single-default invariant off a direct `database.proposalTemplate.updateMany({isDefault:false})` batch write** (constitution §9) — present at TWO call sites (create-with-default, update-with-default). Both now call a new private helper `demoteDefaultProposalTemplates(actor, excludeId?)` that READS the current default rows (allowed §10) and dispatches governed `runManifestCommand("ProposalTemplate","update", …)` per sibling with `isDefault:false`, re-passing each sibling's own field values so the full-mutate `update` command clobbers nothing else. **Lazy/conformant choice:** reused the existing `update` command rather than authoring a new `clearDefault` command — ZERO IR change (no recompile/embed/openapi/react-query/schema regen). Regression lock: `apps/app/__tests__/crm/proposal-template-default-governed.test.ts` (4 tests; the `@repo/database` mock exposes NO `updateMany`, so a reverted bypass throws). Direct-write baseline hand-drained 7→6 triples (`manifest/governance/baselines/direct-writes.json`; the generator script `manifest/scripts/audit-direct-writes*.mjs` is absent on this branch — present only in a stray worktree, not wired into `manifest:ci`, so the gate is currently unenforced here). app typecheck clean for this file (remaining app typecheck errors are pre-existing in unrelated `lib/battle-boards/parsers/tpp-parser.ts` + `proxy.ts`, part of the uncommitted concurrent-loop tree). **Remaining direct-write triples (6):** PaymentRefundAttempt.create, TrainingCompletion.upsert, InventoryForecast.create/update, ReorderSuggestion.create, EventImport.create — each needs IR surgery, a new command, or a classification decision. |

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

> **RECONCILIATION 2026-07-04:** The two "keep" rows above (dispatcher template, manifest-runtime-factory.ts)
> are SUPERSEDED by §G — both are deletion targets once native companions/dispatcher are enabled.

## G. Native companion / dispatcher / runtime ownership flip (PR #78 / `@angriff36/manifest@3.1.3`)
> New section. Source: PR #78 (open, branch `feat/manifest-3.0-native`) + the 2026-07-04 deletion directive.
> Decision owner: Ryan — tracked at `canonical/manifest/runtime-native-ownership/`.

Manifest 3.1.3 ships first-class: native GenericPrismaStore, companion modules (`createManifestRuntime`,
`manifest-response`, database, auth/tenant helpers), native Next.js dispatcher (incl. `externalExecutor`
mode), and full `RuntimeOptions` (middleware, storeProvider, idempotencyStore, auditSink, outboxStore,
approvalStore, eventBus, customBuiltins, requireTenantContext, encryptionProvider, threaded transaction
handle). Capsule currently runs all of these as hand-rolled code with config flags `:false`.

| Path | LOC (approx) | Replaced by | Status |
|---|---|---|---|
| `manifest/runtime/src/manifest-runtime-factory.ts` | 2,050 | native companion `createManifestRuntime` + thin Capsule options module | **DELETION TARGET** — flip `emitCompanions:true` (Ryan) |
| `apps/api/lib/manifest-runtime.ts` | 212 | native companion | **DELETION TARGET** |
| `apps/api/lib/manifest/execute-command.ts` | 384 | native dispatcher (`externalExecutor` mode) | **DELETION TARGET** — flip `dispatcher.enabled:true` (Ryan) |
| `apps/api/lib/manifest/execute-saga.ts` | — | native saga runtime | **DELETION TARGET** (evaluate) |
| `apps/api/lib/manifest-response.ts` | 200 | native `manifest-response` companion | **DELETION TARGET** — Q003 (response contract audit) |
| `manifest/runtime/src/middleware/`, `async-reactions/`, `event-bus.ts`, outbox glue | — | native RuntimeOptions middleware / eventBus / outboxStore / reactions / fan-out / schedules / webhooks | **DELETION TARGET** — migrate business-specific pieces to options module first |
| `manifest.config.yaml` flags | — | `emitCompanions:true`, `dispatcher.enabled:true`, `concreteCommandRoutes.enabled:true` | **FLIP TARGET** (one-line trigger for the campaign) |

**What remains after the flip (intentionally small):**
- A thin Capsule options/binding module: Prisma client, auth-derived context, Sentry/log adapter, feature flags, custom builtins, genuinely business-specific middleware.
- An external executor ONLY if the Capsule response contract is intentionally different from native `manifest-response` (Q003).
- Domain-specific adapters Manifest can't infer from IR/config (e.g. the 4 bespoke stores' business logic until authored into `.manifest` source).

**Do not delete until:** (a) Ryan signs off via `canonical/manifest/runtime-native-ownership` Q001;
(b) the 4 bespoke stores' logic is migrated (Q002); (c) response contract audited (Q003).

---

## Exit criteria (all must be true before declaring the initiative done)
1. `pnpm manifest:generate` produces schema + routes (+ stores) with **zero** broken `database.*` accessors.
2. `pnpm --filter api typecheck` and `next build` are green with no generated-surface drift.
3. CI drift gate: re-running generation produces no diff against committed artifacts. **(Schema projection: SATISFIED 2026-06-10 — `pnpm manifest:schema:check` regenerates `prisma-options.generated.json` + `generated-schema.prisma` and fails on drift; wired into `manifest:ci`. Routes already drift-gated since Phase 1. Live `schema.prisma` replacement is Phase 2b, not yet gated.)**
4. Sections A–C above are `DONE`; D evaluated and resolved.
5. No file outside `node_modules` hand-edits a `// Generated from Manifest IR - DO NOT EDIT` file.
