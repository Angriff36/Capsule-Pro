# IMPLEMENTATION_PLAN.md -- Capsule-Pro Manifest Full Adoption

> **Purpose:** Prioritized, outcome-oriented task list for making Manifest the sole source-of-truth generator across Capsule-Pro. Each task is ready for a BUILDING loop to pick up and execute.
>
> **Ultimate Goal:** Fully utilize Manifest features that are currently useful but not implemented, AND use Manifest as the sole source of truth generator for as many surfaces as possible.
>
> **Prioritization:** Fix typecheck baseline -> fix permission guard (SECURITY) -> resolve Prisma model gaps -> adopt `timestamps` modifier (ROOT FIX for datetime-as-number) -> fix remaining source type mismatches (datetime DONE v0.12.208, money DONE v0.12.212-213, command-param parent-context DONE v0.12.214) -> model relationships -> wire middleware (highest-leverage runtime) -> schema projection -> store strategy -> runtime wiring -> governance -> frontend strategy -> reactions -> projection evaluation -> advanced features -> federation evaluation.
>
> **Companion docs:** task_plan.md, notes.md, phase-out-registry.md, AGENTS.md, constitution.md
> **Official Manifest docs:** https://manifest-b1e8623f.mintlify.app/ (docs/manifest-official/ does NOT exist locally; schemas are in `node_modules/@angriff36/manifest/docs/spec/`)

---

## Task 10.14 — Quarantine Test Recovery (v0.12.230)

**Status:** COMPLETE — All 74 quarantine files recovered, baseline ZERO (v0.12.230)

**v0.12.230 milestone (2026-06-09):**
- Baseline: 74 → 0 (100% recovery)
- Tests: 5,188 pass, 0 fail, 0 typecheck errors

**Production bugs found and fixed during recovery:**
1. Missing `await` in manifest command dispatcher route (returned unhandled rejections instead of 500)
2. Missing self-deactivation prevention in /api/user/deactivate route
3. Stale IR file paths referencing deleted packages (manifest-ir, manifest-adapters)

**Root cause patterns fixed across all test files (catalog for future recovery):**
1. `requireCurrentUser` (not `auth()+getTenantIdForOrg`) is the dispatcher's auth mechanism
2. `runManifestCommand` (not `createManifestRuntime`) is the command execution path
3. `params: Promise.resolve({entity, command})` required for Next.js App Router
4. Prisma field names are camelCase (assertions had snake_case drift)
5. `manifestErrorResponse` returns `{success, error, diagnostics}` not `{success, message}`
6. Per-file `@repo/database` mocks override the global mock with incomplete model sets
7. Generated read routes use `findFirst` not `findUnique`

**Global setup.ts enhanced:** Added @sentry/nextjs, @/app/lib/webhook-dispatch, @/lib/manifest/issue-log, @repo/notifications

**Post-quarantine fixes:**
- `latency.test.ts` renamed to `.integration.test.ts` (not a unit test)
- `prep-list-autogeneration.test.ts` fixed (barrel import → subpath export, `@repo/realtime` mock)

---
## Validation Baseline (2026-06-09)

### Claim Verification Matrix

| # | Claim | Status | Detail |
|---|---|---|---|
| --- | --- | --- | --- |
| 1 | 189 entities, ALL durable | **CONFIRMED** | `stores[]` in IR: 189 entries, all `target: "durable"`, 0 memory |
| 2 | ~~**80**~~ **0** typecheck errors | **RESOLVED** (2026-06-06) | Prior claim of 80 was stale; fresh measurement at session start found... |
| 3 | ~~32~~ ~~**1**~~ **0** IR entities without Prisma model — ALL 189 MATCHED | **RESOLVED** | **All 189 IR entities match a Prisma model.** QACheck was the last unmatched... |
| 4 | ~~Only 8~~ **145 entities have relationships** | **UPDATED** | 219 relationship declarations across 145 entities (was 12 across 8). Batch 1... |
| 5 | ~~371~~ ~~301~~ ~~295~~ ~~294~~ **0** governed-entity direct-write violations | **VERIFIED 2026-06-07** (`pnpm manifest:audit-direct-writes`) | 72 files scanned, 250 hits. 11 allowed, 61 reported. Of reported... |
| 6 | **5 of 19 RuntimeOptions wired (7 of 19 wired or passthrough)** | **UPDATED** | Factory wires 5 constructor-level: `storeProvider`, `idempotencyStore`... |
| 7 | ~~90~~ **89** entities use GenericPrismaStore | **UPDATED** (Task 3.2/3.3) | 89 of 94 switch-case entities now route to GenericPrismaStore. Only... |
| 8 | 0 reactions defined | **RESOLVED** (Task 9.2/9.2b) | **10 reactions** now defined (finance: 3, inventory: 1, events: 1, equipment... |
| 9 | ~~1~~ **6** sagas (ProcessInvoicePayment, FinalizeEventWithReporting, AutoGeneratePrepList, + 3 more) | **RESOLVED** (Task 9.3) | 6 sagas defined: ProcessInvoicePayment (2 steps), FinalizeEventWithReporting (3... |
| 10 | **1,330** generated client functions, **0** consumers | **CONFIRMED** | `manifest-client.generated.ts` has 1,330 exported async functions. Prior audit... |
| 11 | prisma-store.ts: ~~3,061~~ ~1,085 lines, ~~94~~ **5** switch cases | **UPDATED** (Task 3.2/3.3) | GenericPrismaStore strategy: 89/94 entities use generic, 5 custom |
| 12 | Custom outbox duplicates upstream | **CONFIRMED** | Factory has `createPrismaOutboxWriter` (~60 lines) in telemetry hooks; upstream... |

### Package & IR

- `@angriff36/manifest@2.2.0` (confirmed from npm package + runtime dependency)
- IR: **202 entities (ALL durable)**, 999 commands, 981 events (-18 from duplicate removal in v0.12.201), 6 sagas, 3 approval blocks, 241 policies, 92 source files. **3 feature flags** using `flag()` builtin in guards/constraints.
- **987/987 commands have policies bound** (was 0/952 before Task 8.6). 202/202 entities have `defaultPolicies`.
- **6 sagas** defined: `ProcessInvoicePayment` (2 steps with compensate), `FinalizeEventWithReporting` (3 steps), `AutoGeneratePrepList` (2 steps), + 3 additional multi-step workflows
- **10 reactions** defined (finance: 3, inventory: 1, events: 1, equipment: 2, inventory: 1, crm: 1, events: 1). Target: 5+ high-value reactions ✅ EXCEEDED (10).
- 168 entities with computed properties (610 total; 553 have empty `dependencies` arrays)
- 183 entities with 583 constraints
- **145 entities have relationships** (219 declarations total). **57 entities with FK properties but NO relationship blocks**. **96 entities with transitions (256 total rules). 4 entities with free-form status intentionally skipped.**
- 553/610 computed properties have empty `dependencies` (90.7% — NOT a runtime correctness bug; all uncached CPs recompute fresh. 7 cross-property gaps resolved via compile-time enrichment)
- **provenance.irHash and contentHash correctly generated** (compile.mjs uses deterministic JSON, verified at runtime via verifyProvenanceHash). irHash = deterministic hash of IR JSON, contentHash = hash of source manifests.
- **`provenance.compilerVersion` is `0.3.8`** despite installed package being 2.2.0
- 241 top-level policies exist; **all 189 entities now have `defaultPolicies` bound (952/952 commands have policies)** — RESOLVED 2026-06-05 (Task 8.6)
- **5 overrideable constraints out of 583 total** (Task 9.8 DONE: 5 overrideable warn constraints across 5 entities)
- **Event payload timestamps: FIXED (Task 2.7)** — was 916 fields typed `number`, 0 typed `datetime`; now all timestamp fields correctly typed `datetime`
- **Event payload + command param money fields: FIXED (v0.12.212–214)** — 153 event payload + 95 command param fields typed `number` changed to `money` across 34+25 source files (248 total financial fields fixed) + 54 additional command-param type mismatches resolved across 14 sources (v0.12.214: vendor-catalog, bulk-order, pricing-tier, equipment, collections, budget, vendor-contract, cycle-count, procurement-requisition, ai-event-setup, event-import-workflow, and others)
- **Entity property timestamps: 741 fields typed `datetime`, 0 typed `number`** (correctly declared)
### Property types (all resolved)

- string(1,584), datetime(741), int(158), money(109), decimal(102), boolean(94), array(7), float(1)
- **0 number-typed properties** (was 17 -- all fixed to proper types)
- **0 number-typed financial fields** (was ~248 across event payloads + command params — all fixed to `money` in v0.12.212–213, + 54 command-param parent-context mismatches resolved in v0.12.214)

### Prisma & Database

- 226 models, 29 enums, 12 PostgreSQL schemas, ~6,430 LOC in schema.prisma
- Two naming conventions: ~146 models use camelCase fields + `@map("snake_case")`; ~40 legacy models use raw `snake_case` fields without `@map`
- 4 PascalCase @@map anomalies (Tenant, ActivityFeed, EmployeeDeduction, OutboxEvent)
- **166 Prisma models match IR entities**
- **69 Prisma-only models** (infrastructure: Account, Location, UserPreference, Role, OutboxEvent, ManifestEntity, audit_*, admin_*, etc.)
- **~~16~~ 0 IR entities without Prisma model** (all 16 now have Prisma model declarations from Task 0.3). ~~Additionally 15 entities with models but wrong accessor names~~ RESOLVED 2026-06-08 (Task 2.1): accessor remaps auto-resolved via metadata bridge; only QACheck remains unmatched (different concept from QualityCheck).

### API Typecheck

- **0 errors** (Task 0.1 RESOLVED 2026-06-04; follow-up soft-delete drift RESOLVED 2026-06-06). Original generator-side fixes: ENTITY_ACCESSOR_OVERRIDES 2→33, new ENTITY_FIELD_OVERRIDES + applyFieldOverrides(), new ENTITY_DETAIL_DROP, 9 hand-written source fixes. 2026-06-06 follow-up: added `deletedAt` branch to `applyFieldOverrides()` — rewrites to `deleted_at` for 4 snake_case models (Document, SmsAutomationRule, StorageLocation, OnboardingTask), drops the filter for 2 no-column models (CrmScoringRule, EventFollowup). 12 generated routes corrected; drift gate idempotent.
- **Historical baseline (now fixed) -- 80 errors, 71 in GENERATED files** (62 files, "DO NOT EDIT") -- 3 systematic generator bugs:
  - TS2339 (32 from 19 entities): 16 entities have NO Prisma model (routes should be dropped) + 3 have models with renamed names (BankAccount→EmployeeBankAccount, LogisticsRoute→DeliveryRoute, QACheck→QualityCheck)
  - TS2551 (28 from 14 entities): 12 entities need accessor name overrides (Document→documents, SmsAutomationRule→sms_automation_rules, EventTimelineItem→eventTimeline, StorageLocation→storage_locations, BulkCombineRule→bulk_combine_rules, MethodVideo→method_videos, PrepListImport→prep_list_imports, QACorrectiveAction→correctiveAction, QATemperatureLog→temperatureLog, TaskBundleItem→task_bundle_items, TaskBundle→task_bundles, OpenShift→open_shifts)
  - TS2353 (9): `createdAt` emitted but Prisma field is `created_at` (7 entities) or absent (2 entities)
  - TS2561 (6): `tenantId` emitted but Prisma field is `tenant_id` (6 entities, raw snake_case without @map)
- **9 errors in HANDWRITTEN files** (6 files):
  - 4 shipment files: `signatureData` should be `signature` (TS2551)
  - 2 kitchen task files: `tags: { contains: }` invalid for `String[]`, should use `{ has: }` (TS2322)
  - 1 payroll-engine: Json value not assignable to string (TS2345)
  - 2 additional handwritten files (13th rev discovery)

### Runtime Typecheck

- **0 errors** (was 96 -- all store/schema alignment debt resolved)

### Routes & Frontend

- **767** total `route.ts` files in `apps/api/app/api/`
- 363 generated files with "DO NOT EDIT" header
- **404** hand-written files (including 1 manifest dispatcher)
- **188 hand-written files with direct Prisma writes** (46% of hand-written routes)
- 1 dynamic manifest dispatcher at `manifest/[entity]/commands/[command]/route.ts`
- 6 hand-written command routes alongside the dispatcher
- Frontend: 4 patterns coexist -- generated client (1,330 functions, **0 consumers**), **167 files** with inline `apiFetch()` (**1,092 call sites**), Server Actions (~20 files), 21 hand-written data modules (10 plain functions, 11 hooks, 1 TanStack Query)
- **Data caching partially implemented**: TanStack Query IS installed with QueryProvider, but only 5 files (31 uses) use it. Other apiFetch files get zero caching. 81% of API URLs are hardcoded strings.

### Runtime Wiring

- Factory wires: `{ storeProvider, idempotencyStore (conditional), customBuiltins, auditSink (conditional), outboxStore (conditional), generateId (randomUUID), now (Date.now()) }` (7 of 19 directly wired)
- **17 of 19 RuntimeOptions properties wired** (10 directly wired + 5 forwarded passthrough). flagProvider added (Task 11.2).
- **3 of 19 NOT wired** (requireValidProvenance + expectedIRHash now handled; remaining: jobQueue, wasmEvaluator, encryptionProvider); additional cross-cutting concerns handled OUTSIDE lifecycle (eventCollector, telemetry, prismaOverride, RBAC proxy)
- Factory is **520 lines** (the ONE canonical implementation). API shim is 376 lines. Package re-export is 66 lines.
- Legacy `manifest-runtime.ts` (3,205 lines) is superseded dead code
- Custom outbox implementation duplicates upstream `OutboxStore` contract
- No audit trail (`auditSink` not wired despite upstream having full `emitAudit` infrastructure)
- ~~No durable approval state (`approvalStore` not wired)~~ **WIRED** (Task 7.6)
- No middleware pipeline (all cross-cutting concerns handled by Proxy wrapper)
- Permission guard: whitelist-based `COMMAND_PERMISSION_MAP` covering **31 entries** across 9 entity types
- **Single command handler**: `execute-command.ts` (CANONICAL). Legacy `manifest-command-handler.ts` removed (Task 10.13, 2026-06-04). All routes use full middleware pipeline (identity, RBAC, audit, outbox).

### Store Layer

- `prisma-store.ts`: ~1,085 lines, **5** switch cases (was 3,061/94 — Task 3.2/3.3)
- `prisma-stores/` directory: 3 files (was 45 — Task 3.3)
- **89 of 94 switch-case entities now route to GenericPrismaStore** -- **5 have custom logic** (PrepTask, KitchenTask, PrepTaskPlanWorkflow, Station, InventoryTransfer). GenericPrismaStore is the default strategy.
- **VendorContract appears twice** in ENTITIES_WITH_SPECIFIC_STORES (lines 199 and 226 -- duplicate entry, benign)
- GenericPrismaStore available as fallback for unmapped entities
- `ShipmentPrismaStore` uses `as any` cast on status field
- `BattleBoardPrismaStore` uses snake_case field names inconsistent with all other stores
- `AllergenWarningPrismaStore` has dead-code `toCommaString` method never called
- ~~**User and ShipmentItem in ENTITIES_WITH_SPECIFIC_STORES but have no switch case**~~ **RESOLVED** -- neither entity is in that set anymore. Both route through GenericPrismaStore successfully via `GENERIC_STORE_SAFE_ENTITIES`.
- **MenuPrismaStore uses raw `new Prisma.Decimal()` instead of `toDecimalInput()`** -- inconsistent with all other stores

### Governance

- **0 governed-entity violations remain** (per pnpm manifest:audit-direct-writes). Total mutate handlers migrated: 100+ in 60+ route files + 30+ server action writes. Governed-entity direct-write violations reduced from 33 to 0 in batches 23–29 (v0.12.149).
  - **21 documented bypasses** in `manifest/governance/bypasses.json` — cross-entity batch patterns (PaymentMethod clearOthers→markAsDefault), bulk operations, raw SQL imports, and operations with no Manifest command equivalent.
  - **47 ungoverned writes** — entities with no Manifest IR definition (infrastructure tables, sync logs, operational entities outside governed domain).
  - **Note — file-level metric:** `pnpm manifest:audit-direct-writes` counts FILES containing governed-entity direct writes. All governed-entity files now report 0 violations.
- Payroll engine: 100% bypass -- 4 direct Prisma writes, 2 entities with zero Manifest registration
- Invoice entity: ~~zero policies~~ **RESOLVED 2026-06-05 (Task 8.6)** — now has `default policy InvoiceDefaultAccess` bound to all commands
- `as any` usage: 39 in apps/api/app/, 10 in manifest/runtime/src/ (6 in factory, 1 in run-manifest-command-core, 2 in permission-guard, 1 in manifest-runtime.ts re-export)
- describe.skip: ~~1 entire test suite (sales-reporting) disabled~~ **RESOLVED 2026-06-05 (Task 10.10)** — empty stub deleted; feature fully tested at package level
- 7 it.skipIf tests in sentry-integration (conditional on API keys -- valid pattern)
---

## Validation Commands

```bash
pnpm --filter api typecheck          # TypeScript check on API surface
pnpm --filter manifest-runtime typecheck  # Runtime typecheck (currently 0 errors)
pnpm manifest:generate               # Regenerate routes from IR
pnpm manifest:compile                # Recompile IR from .manifest sources
pnpm manifest:validate manifest/ir/kitchen.ir.json  # Validate IR
pnpm manifest:try-prisma <Entity>    # Per-entity schema projection diff
pnpm manifest:audit-direct-writes    # Find writes bypassing runtime
pnpm manifest:audit-schema-drift     # Schema drift audit
pnpm db:check                        # Prisma schema drift check
git diff --stat apps/api/app/api/    # Check for route drift after regen
```

---
## Completed Milestones

| Date | Milestone | Evidence |
|---|---|---|
| 2026-05-30 | Phase 1: Route accessor correctness | 0 broken accessors, ENTITY_ACCESSOR_OVERRIDES covers 2 proven... |
| 2026-05-30 | Phase 2: Functional gate (Event/StaffMember/EventStaff commands) | Audit rows in outbox_events, runtime + api typecheck GREEN |
| 2026-05-30 | ENTITY_DOMAIN_MAP consolidation (generate.mjs -> entity-domain-map.mjs) | generate.mjs imports canonical map |
| 2026-05-31 | Durability classifier + GenericPrismaStore fallback | Store provider falls back to GenericPrismaStore for unmapped... |
| 2026-05-31 | manifest.config.yaml created (147 lines, descriptive) | File exists at repo root; scripts not yet consuming it |
| 2026-05-31 | 3 entity durability flips (AlertsConfig, PrepMethod, Container) | IR declarations honest; runtime behavior unchanged |
| 2026-06-01 | Bootstrap constraint fix via upstream 1.7.0 | createInstance seeds proper defaults; requireName blocks pass |
| 2026-06-01 | Custom expression builtins wired (5 helpers) | customBuiltins in RuntimeOptions |
| 2026-06-02 | Signature reserved word fix for Shipment | signatureData rename in generated output |
| 2026-06-03 | **ALL 189 entities flipped to durable** | Zero memory entities. PrismaProjection can emit models for ALL. |
| 2026-06-03 | **Number-type properties fixed to proper types** | 0 number-typed properties (was 17). All use... |
| 2026-06-03 | **Runtime typecheck: 0 errors** | Was 96. All store/schema alignment debt resolved. |
| 2026-06-04 | **Task 0.1: API typecheck 80 → 0 errors (deploy type-blocker cleared)** | Producer fix: ENTITY_ACCESSOR_OVERRIDES 2→33, new... |
| 2026-06-06 | **Task 0.1 follow-up: soft-delete `deletedAt` drift — 12 residual typecheck errors fixed** | Root cause: 4 Prisma models use raw snake_case `deleted_at`... |
| 2026-06-04 | **Kitchen governed-logic bugs: RecipeVersion.totalTimeMinutes + Ingredient.recordLot expiresAt** | totalTimeMinutes computed was hardcoded 0 (now sums... |
| 2026-06-04 | **Repaired ~40 kitchen runtime tests broken by the all-durable flip + tag v0.12.57** | Shared in-memory storeProvider test helper; createCustomBuiltins... |
| 2026-06-04 | **Repaired 30 test-drift failures (4 files) + 1 Edge-safety bug** | Full `pnpm --filter api test` was 82 failed → 67 failed... |
| 2026-06-04 | **Dispatcher auth error handling: InvariantError → 401 (was 500)** | Canonical dispatcher route catches `InvariantError` from... |
| 2026-06-04 | **Task 0.2: Fix build.mjs broken path, stale compilerVersion, dead variable** | `pnpm manifest:build` completes all 4 steps. Line 170 path fixed... |
| 2026-06-04 | **Producer-level InvariantError→401 auth fix** | Moved from generated dispatcher to... |
| 2026-06-04 | **Task 0.6: 7 HIGH-priority source type mismatches fixed** | VendorContract (lastComplianceReview decimal→datetime... |
| 2026-06-04 | **Task 0.6: 11 more source bugs fixed (event, contract, budget, role-policy, waste-entry)** | Event (eventDate/tags type fixes across 3 commands)... |
| 2026-06-04 | **Task 0.6: 8 more source bugs fixed (payroll, event, inventory, admin, chart-of-account)** | EventProfitability marginPct now computed via percent() builtin... |
| 2026-06-04 | **Task 0.3: Create Prisma models for 16 IR entities** | 16 Prisma model declarations added to schema.prisma for... |
| 2026-06-04 | **Task 2.8: Adopt timestamps modifier (ROOT FIX for datetime-as-number)** | All 189 entities use `timestamps` modifier. Net -1,202 lines of... |
| 2026-06-04 | **Task 2.7: Fix 988 datetime-as-number occurrences across 90 manifest sources** | Event payload (923) and command param (69) timestamp fields... |
| 2026-06-04 | **Task 2.4: ENTITY_DOMAIN_MAP consolidation** | 3 stale copies eliminated; generate-route-manifest.ts imports... |
| 2026-06-05 | **Task 2.5 Phase 1-2: PrismaProjection pipeline verified and wired** | Two-phase pipeline: `derive-options` (173/189 matched, 154 full... |
| 2026-06-05 | **Task 2.5 Phase 3: PrismaProjection pipeline completed for all 189 entities** | derive-prisma-options.mjs uses ENTITY_ACCESSOR_OVERRIDES for... |
| 2026-06-04 | **Task 2.6: Remove duplicate VendorContract** | Duplicate entry at line 226 removed from... |
| 2026-06-04 | **Task 0.4: ~104 relationship declarations across 60+ entities** | Expanded from 12 to ~104 declarations. Event pilot (27), kitchen... |
| 2026-06-08 | **Task 0.4 COMPLETE: 68 belongsTo relationship declarations across 48 entities** | Final batch: 68 new belongsTo declarations added to 48 entities... |
| 2026-06-08 | **3 pre-existing typecheck errors fixed in flip-durable tests** | flip-durable-smoke.test.ts: `isEnum` on FieldMeta (method... |
| 2026-06-08 | **Task 9.7 DONE: Property modifier adoption** | 534 modifier annotations across 94 files: indexed(92)... |
| 2026-06-04 | **Task 7.4c: Audit/outbox middleware replaces telemetry-embedded outbox writes** | `createAuditOutboxMiddleware()` at `after-emit` hook persists... |
| 2026-06-04 | **Task 10.4: Delete dead code (~4,971 LOC removed)** | rules-engine/ (5 files), entity-graph/ (7 files)... |
| 2026-06-05 | **Task 3.1: Generic Manifest read routes (list + detail)** | List route at `manifest/[entity]/route.ts` and detail route at... |
| 2026-06-04 | **Task 7.4a: RBAC middleware replaces Proxy-based permission guard** | `createRbacMiddleware()` registered as Manifest-native... |
| 2026-06-04 | **Task 7.4b: Identity middleware wired into lifecycle pipeline** | `createIdentityMiddleware` registered as Manifest-native... |
| 2026-06-04 | **Task 7.1 + 7.2: Wire auditSink + outboxStore from upstream** | PostgresAuditSink + PostgresOutboxStore wired via singleton... |
| 2026-06-05 | **Task 10.5: Outbox consolidation — unsafe helper removed** | Bundle-claim route outbox events moved inside transaction (data... |
| 2026-06-05 | **Task 10.1: Legacy dead code already deleted** | Confirmed legacy 3,205-line manifest-runtime.ts was deleted in... |
| 2026-06-05 | **Task 9.2: First 2 Manifest reactions implemented** | `on PaymentProcessed run Invoice.applyPayment` + `on... |
| 2026-06-05 | **Task 3.4: Store-level bug fixes (MenuPrismaStore + ShipmentPrismaStore)** | MenuPrismaStore uses toDecimalInput() (was raw new... |
| 2026-06-05 | **Task 0.6 + 9.2: Source bug fixes + 2 equipment maintenance reactions** | CollectionCase.dunningStage string→int (was NaN on arithmetic)... |
| 2026-06-05 | **Task 9.3 + 0.7: State transitions for 5 entities + searchable modifiers** | Added state machine enforcement to InventoryTransfer (4 rules)... |
| 2026-06-05 | **Task 9.3/9.7: State transitions for 10 entities + readonly audit fields** | 22 new transition rules across CycleCountSession (4)... |
| 2026-06-05 | **Task 9.3 COMPLETE: State transitions for 96 entities (256 rules)** | Added state machine enforcement to 30+ entities. Only 4 entities... |
| 2026-06-05 | **Task 8.6 + Policy Binding Fix: `default policy` binds RBAC to ALL 952 commands** | ROOT CAUSE: 250 top-level policies were declared OUTSIDE entity... |
| 2026-06-05 | **Task 0.5: Route regen-diff harness** | `manifest/scripts/audit-route-drift.mjs` exists with... |
| 2026-06-05 | **Task 8.2 batch 4: 4 route files migrated (IoTAlert, IoTAlertRule, InteractionAttachment POST+DELETE)** | IoTAlert/IotAlertRule manifest sources expanded with missing... |
| 2026-06-05 | **Task 8.1: Payroll governance migration (4 phases)** | 3 routes migrated to Manifest runtime. ManifestPayrollDataSource... |
| 2026-06-05 | **Task 7.4d: Bootstrap middleware** | Upstream 1.7.0 removed the need for bootstrap middleware.... |
| 2026-06-05 | **Task 3.3 Phase 1: Delete dead prisma-stores (~11,210 LOC)** | 39 dead store files deleted. prisma-stores/ reduced from 45→6... |
| 2026-06-05 | **Task 7.6 partial: Wire generateId + now RuntimeOptions** | Two RuntimeOptions wired: generateId (randomUUID from... |
| 2026-06-05 | **Task 9.2 COMPLETE: 3 new reactions (10 total, target 5+ exceeded)** | ShipmentItemReceived→InventoryItem.restock... |
| 2026-06-05 | **Task 7.3: requireTenantContext — confirmed already wired** | requireTenantContext: true at line 466 of... |
| 2026-06-05 | **Task 7.8: API shim audit — 276 lines of dead code removed** | 28 unused entity convenience helpers deleted (zero callers).... |
| 2026-06-05 | **Task 7.6: Wire 5 RuntimeOptions (approvalStore, deterministicMode, evaluationLimits, profiling, flagProvider)** | PostgresApprovalStore wired with schema bootstrap... |
| 2026-06-05 | **Task 3.2/3.3: Store strategy decision + migration phase 2 — ~1,800 LOC deleted** | Decision: GenericPrismaStore is the strategy.... |
| 2026-06-05 | **Task 0.7: EventStaff / EventStaffAssignment consolidation** | EventStaff confirmed canonical; EventStaffAssignment is... |
| 2026-06-05 | **Task 9.16: Wire Governance CLI suite (11 scripts)** | 7 governance scripts + 4 CLI utility scripts added to... |
| 2026-06-05 | **Task 10.10: Remove empty skipped test stub** | `apps/api/__tests__/sales-reporting/generate.test.ts` was an... |
| 2026-06-05 | **Task 10.2: Delete dead recipe engine code (-1,488 LOC)** | recipe-optimization-engine.ts (837 lines) +... |
| 2026-06-05 | **Task 8.2 progress: 5 hybrid files migrated to Manifest-only** | 4 SmsAutomationRule files (activate, deactivate, create... |
| 2026-06-05 | **Task 8.2 progress (batch 2): 10 mutate handlers migrated across 9 route files** | ApiKey (5 routes: create/update/softDelete/revoke/rotate), Venue... |
| 2026-06-05 | **Task 8.4: Kitchen task claim routes migrated to Manifest-only** | `POST /api/kitchen/tasks/[id]/claim` and `POST... |
| 2026-06-05 | **Task 8.2 batch 3: 5 accounting routes + 1 procurement route migrated to Manifest runtime** | CollectionCase create, Invoice create, PaymentMethod... |
| 2026-06-05 | **Task 8.2 batch 5: Payment process/refund + revenue-recognition schedule actions migrated** | PUT/POST payments/[id] route: Payment process/refund through... |
| 2026-06-05 | **Task 8.3 progress (batch 1 — Lead.create): first server-action migration** | `apps/app/app/(authenticated)/marketing/leads/actions.ts`... |
| 2026-06-05 | **Task 8.3 progress (batch 2 — Venue): drift-blocked entity reconciled + migrated** | `apps/app/app/(authenticated)/crm/venues/actions.ts`... |
| 2026-06-05 | **BUG FIX (root cause) — governed `AdminTask.create` broken for most statuses** | `manifest/source/admin-task-rules.manifest`: removed `mutate... |
| 2026-06-05 | **Task 8.3 progress (batch 3 — AdminTask.create): create migrated, status-update deferred** | `apps/app/app/(authenticated)/administrative/kanban/actions.ts`... |
| 2026-06-05 | **Task 8.3 progress (batch 5 — EmployeeAvailability create/batch/softDelete): 3 of 4 writes migrated** | `apps/app/app/(authenticated)/scheduling/availability/actions.ts`... |
| 2026-06-06 | **Task 8.3 (Facility): drift-blocked entity reconciled + createFacility governed** | `manifest/source/facilities-all-rules.manifest`: replaced... |
| 2026-06-06 | **fix(tests): resolve 4 governance test failures + migration baseline collapse (v0.12.126)** | Fixed 3 `fileURLToPath` URL-scheme errors in governance tests... |
| 2026-06-06 | **Task 8.3 server-action governance batch — 8 files migrated (v0.12.127)** | Governed writes for EmailTemplate (create/update/softDelete)... |
| 2026-06-06 | **Shipment test reconciliation verified (61→0 failures)** | Both shipment test files (shipment-commands.test.ts: 25 tests... |
| 2026-06-06 | **Task 8.2/8.4 batch: 4 route migrations to Manifest runtime (v0.12.130)** | EventProfitability.recalculate (extended command with... |
| 2026-06-06 | **Task 8.2 batch 6: 5 route files migrated — IoT + inventory audit + override audit (v0.12.131)** | IoTAlert PATCH (acknowledge/markResolved), TemperatureProbe POST... |
| 2026-06-06 | **Task 8.2 batch 7: 5 route files migrated to Manifest runtime (v0.12.132)** | EventContract document upload (update), Shipment status... |
| 2026-06-06 | **Task 8.2 batch 7b: inventory audit discrepancy/reports migrated (v0.12.132)** | VarianceReport discrepancy update (new updateDiscrepancy command... |
| 2026-06-06 | **Task 8.2 batch 8 + Task 8.3: recipe cost/budgets, shipment items, battle-board actions migrated (v0.12.133)** | Recipe cost route: inline Manifest→canonical runManifestCommand.... |
| 2026-06-06 | **Task 8.2 batch 9: Proposal markViewed + supplier-catalog webhook migrated (v0.12.134)** | `public/proposals/[token]` markViewed now dispatched via... |
| 2026-06-06 | **Task 8.2 batch 10: Invoice [id] route governance migration** | PUT/PATCH/POST/DELETE migrated from 7 direct Prisma writes to... |
| 2026-06-06 | **Task 8.2 batch 12: inventory audit reports, supplier-sync bypass, discrepancy resolution, calendar reschedule (v0.12.135)** | `POST /api/inventory/audit/reports` → Report.create via... |
| 2026-06-06 | **Task 8.2 batch 13: AI bulk-tasks confirm + cron inventory-audit governance migration (v0.12.138)** | bulk-tasks/confirm: PrepTask.create via runManifestCommandCore... |
| 2026-06-06 | **Task 8.3 batch 9: proposals, staff team, procurement actions governance migration + 6 new manifest commands (v0.12.139)** | Proposals: 6 writes migrated... |
| 2026-06-07 | **Task 8.2 batch 14: Payments POST + InventoryItem update/softDelete governance migration (v0.12.140)** | Payments POST: `database.payment.create` →... |
| 2026-06-07 | **Task 8.2 batch 15: Admin chat threads + inventory items governance migration (v0.12.140)** | Admin chat: `POST/GET /api/administrative/chat/threads` —... |
| 2026-06-07 | **ClientInteraction governance migration** | ClientInteraction followUpCompleted → governed complete command... |
| 2026-06-07 | **FacilityAsset + ir-drift CI drift detection** | FacilityAsset.create governed + semantic IR drift detection... |
| 2026-06-07 | **Task 8.3 batch 11: InventoryItem server actions governance migration** | `apps/app/app/(authenticated)/inventory/actions.ts` — 3 writes... |
| 2026-06-07 | **Task 8.3 batch 12: WasteEntry server actions governance migration** | `apps/app/app/(authenticated)/kitchen/actions.ts` — 3 writes... |
| 2026-06-07 | **Task 8.3 batch 13: KitchenTask/Claim/Progress server actions governance migration** | `apps/app/app/(authenticated)/kitchen/tasks/actions.ts` — 7... |
| 2026-06-07 | **Task 8.3 batch 14: Ingredient raw SQL → governed create** | `apps/app/app/(authenticated)/kitchen/recipes/actions-ingredient.... |
| 2026-06-07 | **Task 8.3 batch 17: ClientInteraction.softDelete governance migration** | `apps/app/app/(authenticated)/crm/clients/actions.ts` —... |
| 2026-06-07 | **Schema drift audit: 0 violations (110/110 entities clean)** | Fixed allowlist path, added MANIFEST_SEMANTIC_ALIASES... |
| 2026-06-07 | **Task 8.2 batch 16: RevenueRecognitionSchedule adjust+default fallback governance migration** | Expanded `adjustSchedule` command with... |
| 2026-06-07 | **Infrastructure classification confirmed (no migration needed)** | Calendar sync routes (ProviderSync — OAuth credential... |
| 2026-06-07 | **Deferred items documented** | events/actions.ts EventImport raw SQL — IR lacks... |
| 2026-06-07 | **Task 8.2 batch 18: RevenueRecognition reverse + EmailWorkflow recordTriggered + Events soft-delete/assign** | RevenueRecognition reverse: `$transaction` → 2 governed... |
| 2026-06-07 | **Task 8.3 batch 18: CycleCountSession.softDelete governance migration** | `apps/app/app/(authenticated)/cycle-counting/actions/sessions.ts`... |
| 2026-06-07 | **Task 8.2/8.3 batch 19: payment-methods clearSiblingDefaults, cycle-counting records sync, email-template updateMany→governed, email-workflow-triggers callback required** | PaymentMethods: clearSiblingDefaults() routes updateMany through... |
| 2026-06-07 | **Task 8.3 batch 20: CycleCountSession.finalize supplementary write + fix pre-existing TS error** | CycleCountSession.finalize command expanded with... |
| 2026-06-07 | **Task 8.2 batch 21: Payments route status fallbacks migrated to governed Manifest commands** | Replace 2 direct database.payment.update() calls in payments... |
| 2026-06-07 | **Task 8.3 batch 21: Driver/Vehicle logistics server actions governed** | Driver entity reconciled (firstName/lastName→name, new state... |
| 2026-06-07 | **Task 8.2 batch 22: Dead code cleanup + CommandBoard.create migration** | Deleted recipe-version-helpers.ts (815 LOC dead code, 0... |
| 2026-06-07 | **Task 8.2/8.3 batches 23–29: Governance migration milestone — 0 governed-entity violations (v0.12.149)** | Governed-entity direct-write violations reduced from 33 to 0.... |
| 2026-06-07 | **Task baseline repair: menus.is_template drift + runtime declaration fixes + simulation test mock drift (v0.12.151)** | Repair migration `20260607155307_repair_drift` adds... |
| 2026-06-07 | **Task 8.5: Conformance test index (Constitution S17)** | 100 structural IR-level conformance checks at... |
| 2026-06-07 | **Task 5.12: Agent SDK for MCP server integration** | MCP server IR introspection enhanced with agent-sdk functions... |
| 2026-06-07 | **Task 10.8: `as unknown as` double-cast cleanup** | 67% reduction (60→20). Created `toJson()` helper. Fixed allergen... |
| 2026-06-07 | **Task 2.3: manifest.config.yaml script wiring** | Shared `read-config.mjs` reads paths from config. generate.mjs +... |
| 2026-06-07 | **Task 10.11: Telemetry collector placeholder fixed** | `getAggregateMetrics()` now queries real persisted telemetry... |
| 2026-06-07 | **Task 10.6: MCP server entity-domain-map ESM consolidation** | Replaced require() CJS hack with proper ESM re-export. 14→8... |
| 2026-06-07 | **Task 6.5: Rename misleading use-*.ts files** | 10 files renamed from use-*.ts to *.ts in apps/app/app/lib/. 23... |
| 2026-06-07 | **Schema drift audit fix: allowlist path + semantic aliases** | Fixed allowlist path from stale `scripts/manifest/` to... |
| 2026-06-07 | **Task 10.8 batch 2: `as unknown as` double-cast cleanup** | 157→91 (54 removed, 42% reduction). 28 files fixed across... |
| 2026-06-07 | **Task 6.2 phase 1: React Query hooks generator + 2 page migrations** | Generator: `manifest/scripts/generate-react-query-hooks.mjs` →... |
| 2026-06-07 | **Task 6.2 batch 4: 14 more files migrated to generated client** | 14 files migrated across 4 domains (~35 command call sites, net... |
| 2026-06-07 | **Task 6.1: Frontend Data Layer Decision** | DECISION: Adopt TanStack Query wrapping generated client as... |
| 2026-06-07 | **Schema drift allowlist: Json type entries** | Added adapter-derived rules for... |
| 2026-06-08 | **Task 6.2 batch 6: 6 more files migrated to generated client** | Settings alerts (3 writes), Kitchen allergens (7 calls), Kitchen... |
| 2026-06-08 | **Task 6.2 batch 8: 8 more frontend files migrated** | lib/leads, lib/proposals, vendors, routes-view, pipeline-board... |
| 2026-06-08 | **Idempotent command core + allergen acknowledge idempotency** | run-manifest-command-core: IDEMPOTENT_COMMANDS registry, noop... |
| 2026-06-08 | **Task 8.10 (ScheduleShift parent-context)** | ScheduleShift inherits locationId from Schedule via... |
| 2026-06-08 | **manifest:check score fix** | Aligned event names in ProcurementBudget + TrainingAssignment... |
| 2026-06-08 | **Task 6.4 (typed inputs phase 1)** | Array generics fixed (string[] vs unknown[]), client... |
| 2026-06-08 | **Task 6.4 Phase 2: Strict typed command inputs** | Removed [key: string]: unknown from 833 input interfaces, |
| 2026-06-08 | **CrmScoringRule/EventFollowup soft-delete drift resolved** | Added deleted_at columns via migration. ENTITY_FIELD_OVERRIDES... |
| 2026-06-09 | **Task 5.4: Mermaid ER diagram projection wired** | `manifest/scripts/generate-mermaid.mjs` generates ER (202... |
| 2026-06-09 | **Task 5.11: Evaluate new projections — DONE** | All 12 projections evaluated. ADOPT: kysely (191 entity types... |
| 2026-06-09 | **Task 5.6: Drizzle projection wired** | `manifest/scripts/generate-drizzle.mjs` wraps... |
| 2026-06-09 | **Task 5.7: LLM-context projection wired** | 3 surfaces: summary (2.7MB, 202 entities), full (2.8MB with... |
| 2026-06-09 | **Task 5.8: Materialized-views projection wired** | 6 views (event_profitability_summary, inventory_valuation... |
| 2026-06-09 | **Task 5.10: Analytics projection wired** | 3 surfaces: tracking-plan.json (2.2MB, 4,250 events), events.ts... |
| 2026-06-09 | **Quarantine test recovery: 606 tests recovered from 8/66 files (v0.12.227)** | Migrated 8 quarantined test files from... |
| 2026-06-10 | **IR provenance verification wired** | compile.mjs hashes match IR spec (contentHash = sources, irHash = deterministic IR). verifyProvenanceHash() in loadManifests.ts. Factory opts in via requireValidProvenance. 9 new tests. |
| 2026-06-10 | **Training test recovery (10 describe.skip → describe)** | 49 new passing tests. All 10 skipped training test suites recovered: $queryRaw → Prisma ORM, createManifestRuntime → runManifestCommand. v0.12.233. |
| 2026-06-10 | **PrismaProjection validation fix (152 default-value errors)** | CollectionCase.dunningStage @default(0)→@default("") on String; EventStaff shiftStart/shiftEnd @default(0) removed on DateTime; 149 additional @default("") on non-String fields (Int/Float/Decimal/DateTime). Root cause: post-processing regexes required \S+ after type but many fields had @default("") immediately after type. Fix: final line-by-line post-assembly pass. `prisma validate` now passes on generated 256-model schema. |
| 2026-06-10 | **Database drift resolved (20260610041450_repair_drift)** | Adds deleted_at column to tenant_events.event_followups; creates tenant_kitchen.qa_checks table with indexes. `pnpm db:check` reports zero drift. |
| 2026-06-10 | **Verification baseline: 0 typecheck errors, 5,188 tests pass, 0 schema drift** | Confirmed clean across all validation surfaces. |
| 2026-06-10 | **Task 9.6 COMPLETE: CLI commands — 91 scripts wired, scan CI gate** | All 20 done-when CLI commands + 16 subcommand variants wired. `manifest:scan` reports 191 warnings (all `durable` store target — expected). `seed`/`profile` don't exist in v2.2.0. |

---

## Unwired RuntimeOptions (19 properties, 14 wired)

| Property | Purpose | Status | Tier |
|---|---|---|---|
| `storeProvider` | Entity -> Store factory function | WIRED | -- |
| `idempotencyStore` | Command idempotency dedup | WIRED (conditionally; routes don't pass key yet) | -- |
| `customBuiltins` | Plugin-provided expression builtins | WIRED | -- |
| `middleware` | Lifecycle hooks (before-guard, before-policy, before-action, after-emit) | NOT WIRED | 7.4 |
| `auditSink` | Durable audit record emission | **WIRED** (PostgresAuditSink, conditional on DATABASE_URL) | -- |
| `outboxStore` | Transactional event persistence | **WIRED** (PostgresOutboxStore, conditional on DATABASE_URL) | -- |
| `approvalStore` | Multi-stage approval persistence | **WIRED** (PostgresApprovalStore, conditional on DATABASE_URL) | -- |
| `requireTenantContext` | Fail if tenantId absent | **WIRED** (line 466, manifest-runtime-factory.ts) | -- |
| `flagProvider` | Feature flag resolver for `flag()` builtin | **WIRED** (passthrough from deps.flagProvider) | -- |
| `jobQueue` | Async command execution | NOT WIRED | 7.6 |
| `profiling` | Per-phase command timing | **WIRED** (passthrough from deps.profiling) | -- |
| `generateId` | Custom ID generator | **WIRED** — generateId: () => randomUUID() | -- |
| `now` | Custom timestamp function | **WIRED** — now: () => Date.now() | -- |
| `deterministicMode` | Throw on effect boundaries | **WIRED** (passthrough from deps.deterministicMode) | -- |
| `evaluationLimits` | Max expression depth/steps | **WIRED** (passthrough from deps.evaluationLimits) | -- |
| `requireValidProvenance` | IR integrity hash verification | **WIRED** (conditional on deps.requireValidProvenance) | -- |
| `expectedIRHash` | Expected IR hash | **WIRED** (via irHash in provenance, verified by verifyProvenanceHash) | -- |
| `wasmEvaluator` | WASM expression evaluation | NOT WIRED | Future |
| `encryptionProvider` | Field-level encryption | NOT WIRED | Future |
---

## Available Projections (27 projection directories in @angriff36/manifest@2.2.0)

| Export Path | Purpose | Used? |
|---|---|---|
| `projections/nextjs` | Next.js route generation (list + detail) | YES -- active, generates routes |
| `projections/routes` | Route metadata/registry | YES -- produces `manifest/runtime/routes.manifest.json` |
| `projections/prisma` | Prisma schema model generation | PARTIAL -- pilot harness for 4 entities, not in CI |
| `projections/zod` | Zod input validation schemas | YES -- `pnpm manifest:generate-zod` produces 202 entity schemas with constraint-derived refinements (.min, .max, .int). Output: `manifest/generated/schemas/*.schema.ts`. Upstream packaging bug workaround: missing `.js` extension on ESM imports patched locally. |
| `projections/react-query` | React Query hooks | NO -- blocked (Phase 5 eval) |
| `projections/openapi` | OpenAPI spec generation | NO -- blocked (Phase 5 eval) |
| `projections/drizzle` | Drizzle ORM schema | YES -- active, pnpm manifest:drizzle, 191 tables + 156 relations |
| `projections/mermaid` | Mermaid diagram generation | YES -- active, `pnpm manifest:mermaid`, generates ER/state/sequence diagrams (Task 5.4) |
| `projections/llm-context` | Structured JSON for LLM agent injection | YES -- active, pnpm manifest:llm-context, 3 surfaces (summary/full/ir). 2.7MB summary (202 entities). Script: `manifest/scripts/generate-llm-context.mjs` |
| `projections/materialized-views` | PostgreSQL materialized view DDL | YES -- active, pnpm manifest:materialized-views, 6 views (event_profitability_summary, inventory_valuation, kitchen_task_metrics, staff_performance_summary, vendor_spend_summary, waste_analytics). Output: `manifest/generated/materialized-views/views.sql` (179 lines) |
| `projections/health` | K8s health check endpoints | NO -- zero health infra exists (Task 5.9) |
| `projections/graphql` | Full SDL + resolver stubs | NO -- not evaluated |
| `projections/analytics` | Typed tracking event schemas | YES -- active, pnpm manifest:analytics, 3 surfaces + 999 handlers. tracking-plan.json (4,250 events), events.ts (4,098 interfaces), handlers.ts (999 typed handler functions). Provider: Segment. Script: `manifest/scripts/generate-analytics.mjs` |
| `projections/dart` | Dart/Flutter model generation | NO -- REJECTED (no Dart targets) |
| `projections/dynamodb` | DynamoDB table definitions | NO -- REJECTED (uses PostgreSQL) |
| `projections/elasticsearch` | Elasticsearch index mappings | NO -- DEFERRED (no ES infra) |
| `projections/hono` | Hono framework routes | NO -- DEFERRED (runtime uses Hono but routes are Next.js) |
| `projections/jsonschema` | JSON Schema output | NO -- DEFERRED (Zod already covers this) |
| `projections/kysely` | Kysely ORM types | YES -- active, `pnpm manifest:kysely`, generates 3,918-line `database.ts` with 191 table interfaces (Task 5.11) |
| `projections/mongoose` | Mongoose ODM schemas | NO -- REJECTED (incomplete + wrong DB) |
| `projections/pydantic` | Pydantic model generation | NO -- DEFERRED (no Python runtime) |
| `projections/remix` | Remix framework routes | NO -- DEFERRED (uses Next.js) |
| `projections/storybook` | Storybook story generation | NO -- DEFERRED (useful but secondary) |
| `projections/sveltekit` | SvelteKit routes | NO -- REJECTED (uses Next.js) |
| `projections/terraform` | Terraform infrastructure definitions | NO -- DEFERRED (no IaC pipeline) |
| `projections/shared` | Shared projection utilities | Internal |
| `projections/express` | Express.js route generation | NO -- not evaluated (uses Next.js API routes) |

**Other package exports (39 total, 4 used = 10.3%):** compiler, ir-compiler, audit/postgres, audit/memory, outbox/postgres, outbox/memory, approval/postgres, approval/memory, agent-sdk, ir-diff, breaking-change, wasm, profiling, plugin-api, plugin-loader, multi-compiler, module-resolver, parser, lexer, types, config, stores, ir, ir-version-store, registry/emit, federation, compression, projections, audit, outbox, approval.

## Known Blockers & Gotchas (OPEN only)

1. **Bootstrap constraint gotcha:** Edge cases may remain for complex constraint blocks. `0_init` baseline checksum mismatch blocks `db:dev` -- use `db:repair`+`db:deploy`. Generated-column DEFAULT triggers P3006 on shadow replay.

2. **No store projection in the package:** Capsule must use GenericPrismaStore or build a codegen step.

3. **Upstream accessor derivation is naive:** nextjs projection uses `camelCase(entityName)` with zero model validation.

4. **Generated client plateau:** 1,330 functions, 94 consumers. ~107 remaining apiFetch files are non-migratable (custom endpoints, file uploads, binary downloads, enriched responses, composite commands).

5. **Non-transactional writes in payroll:** `savePayrollRecords()` can leave partial state.

6. **EventStaff / EventStaffAssignment duplicate:** Both in IR with overlapping purpose, separate Prisma models.

7. **compile.mjs workaround:** Uses programmatic API instead of CLI due to `--glob` bug.

8. **Mixed schema naming conventions:** 195 PascalCase + 31 legacy snake_case models. 4 PascalCase @@map anomalies.

9. **Permission guard whitelist-based:** Commands NOT in `COMMAND_PERMISSION_MAP` pass through unrestricted. IR policies provide deny-by-default as primary; RBAC middleware is secondary.

10. **compilerVersion `0.3.8`:** Despite package 2.2.0. ~~irHash/contentHash also empty~~ RESOLVED — provenance hashes now correctly generated and verified at runtime.

11. **57 entities with FK props but NO relationship blocks:** Remaining are polymorphic FKs, FKs to non-IR targets, or no FK props.

12. **39 exports, 4 used (10.3%):** Major unused: Reactions, Sagas, Approvals, State Transitions, Entity Concurrency, Webhooks, WASM, Encryption, Profiling, Agent SDK, Plugin system.

13. **Manifest vNext features blocked on compiler:** `schedule`, `mixin`, `rateLimit`, `retry`, `async` keywords not in v2.2.0. Only `overrideable` (fully) and `flag()` (runtime-only) available.

14. **Payroll-engine 100% disconnected:** Sets invalid status values, constructor strips `$transaction`, zero Manifest awareness.

15. **`realtime` modifier not in v2.2.0:** Task 9.10 BLOCKED pending package upgrade.

16. **`manifest generate-tests` not in v2.2.0:** Task 9.17 BLOCKED pending package upgrade.

17. **Federation export (`@angriff36/manifest/federation`):** Full multi-service mesh. Low priority (monolith). Task 12.1.

18. **Entity Property Modifiers at source level only:** 534 annotations, parser accepts but compiler does not emit to JSON.

19. **`encrypted` modifier adopted but `encryptionProvider` NOT wired:** 14 entities with 33 encrypted properties (BankAccount, Client, User, PaymentMethod, Vendor, etc.) — encryption is a silent no-op at runtime. Requires implementing `EncryptionProvider` interface (`encrypt`/`decrypt`) and wiring via `RuntimeOptions.encryptionProvider` in the factory. High-priority security gap.

---

## TIER 0 -- FIX TYPECHECK BASELINE & RELATIONSHIP MODELING

> **Why:** 80 typecheck errors block deploy. 72 are in generated files (fix the generator). 16 IR entities lack Prisma models. 145/189 entities now have relationships (57 entities with FK properties but no relationship blocks remain). Source-level bugs across ALL domains produce incorrect runtime behavior. This is the single most important blocking tier.

### 0.1 Categorize and fix the 80 typecheck errors via generator changes — ✅ DONE 2026-06-04 / follow-up RESOLVED 2026-06-06

> **Complete.** See Completed Milestones for details.

### 0.2 Fix build.mjs broken path, stale compilerVersion, and orphaned scripts — ✅ DONE 2026-06-04

> **Complete.** See Completed Milestones for details.

### 0.3 Create Prisma models for the 16 IR entities without tables — ✅ DONE 2026-06-04

> **Complete.** See Completed Milestones for details.

### 0.4 Model relationship declarations in .manifest sources — ✅ TRULY COMPLETE 2026-06-09

> **Complete.** See Completed Milestones for details.

### 0.5 Route regen-diff harness — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 0.6 Fix source-level bugs across manifest entities (ALL DOMAINS) — ✅ DONE (33/33 subtasks, 2026-06-09)

> **Complete.** See Completed Milestones for details.

### 0.7 Resolve EventStaff / EventStaffAssignment duplicate — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

## TIER 1 -- ROUTE ACCESSOR CORRECTNESS (DONE)

> **Status:** COMPLETE 2026-05-30. Phase-out-registry.md Section C confirms blast radius was exactly 2 entities.
>
> NOTE: Accessor correctness is DONE for the 2 proven drifted entities, but Tier 0.1 extends this to fix the remaining ~20 wrong-accessor errors + ~38 missing-model errors in generated files via a more robust generator fix.

---

## TIER 2 -- SCHEMA PROJECTION & GENERATOR FOUNDATIONS

> **Why:** ALL 189 entities are now durable. PrismaProjection can generate models for ALL of them. The 226-model `schema.prisma` is hand-authored and drifts from the IR.

### 2.1 Make the route generator accessor-aware from store layer — ✅ DONE 2026-06-08

> **Complete.** See Completed Milestones for details.

### 2.2 Add ENTITIES_WITHOUT_TABLE filtering at projection time — ✅ DONE 2026-06-08

> **Complete.** See Completed Milestones for details.

### 2.3 manifest.config.yaml script wiring — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 2.4 ENTITY_DOMAIN_MAP consolidation — ✅ DONE 2026-06-04

> **Complete.** See Completed Milestones for details.

### 2.5 Wire PrismaProjection to generate schema from IR — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 2.6 Remove duplicate VendorContract from ENTITIES_WITH_SPECIFIC_STORES — ✅ DONE 2026-06-04

> **Complete.** See Completed Milestones for details.

### 2.7 Fix manifest source type mismatches (559+ datetime-as-number occurrences) — ✅ DONE 2026-06-04

> **Complete.** See Completed Milestones for details.

### 2.8 Adopt `timestamps` entity modifier to eliminate datetime-as-number at the root — ✅ DONE 2026-06-04

> **Complete.** See Completed Milestones for details.

## TIER 3 -- GENERIC READ ROUTES & STORE STRATEGY

> **Why:** Constitution S6 says canonical route shape is `manifest/{entity}/...`. Zero generic read routes exist. The ~15,755 LOC store layer is 71/94 boilerplate that GenericPrismaStore could handle.

### 3.1 Add generic Manifest read routes -- DONE (2026-06-05)

> **Complete.** See Completed Milestones for details.

### 3.2 Store generation strategy decision — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 3.3 GenericPrismaStore migration — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 3.4 Fix store-level bugs discovered in audit — ✅ PARTIALLY DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

## TIER 4 -- BOOTSTRAP CONSTRAINT FIX (DONE)

> **Status:** COMPLETE 2026-06-01. Upstream fix in @angriff36/manifest@1.7.0 resolved the core bootstrap constraint issue. `createInstance` now seeds proper defaults.
>
> NOTE: Edge cases may remain for entities with unusually complex constraint blocks.

---

## TIER 5 -- PROJECTION EVALUATION

> **Why:** 24 of 27 projections ship unused (excluding shared, nextjs, routes). Each could retire hand-written equivalents. Now that ALL entities are durable and IR is complete, projections have maximum coverage potential. 12 projections were NOT in the prior plan. 9 projections now active (nextjs, routes, prisma, mermaid, kysely, drizzle, llm-context, materialized-views, analytics).

### 5.1 Evaluate Zod projection for input validation

> **Complete.** See Completed Milestones for details.

### 5.2 Evaluate React Query projection for client hooks — ✅ DONE 2026-06-08

> **Complete.** See Completed Milestones for details.

### 5.3 Evaluate OpenAPI projection for API documentation — DONE

> **Complete.** See Completed Milestones for details.

### 5.4 Evaluate Mermaid projection for architecture docs — ✅ DONE 2026-06-09

> **Complete.** See Completed Milestones for details.

### 5.5 Evaluate Routes projection for typed path builders
- **Done when:** Generated typed path builders compared against ~1,092 hardcoded `apiFetch("/api/...")` string paths across 167 files. Decision documented.
- **Why:** The `projections/routes` export produces canonical route manifests + typed path builders. 81% of API URLs are hardcoded strings (211 paths). Only ~50 typed path builders and 7 files use typed routes despite `routes.ts` having 218 lines of hand-maintained helpers.
- **Evaluation: DEFER.** RoutesProjection generates 8,447-line typed path builders covering 1,403 routes (404 reads + 999 commands). However, the generated paths follow the canonical `/api/manifest/{entity}` pattern while 81% of Capsule's hardcoded API paths (211 of 260) are custom domain routes (`/api/kitchen/recipes`, `/api/analytics/kitchen`, `/api/events/:eventId/export/csv`) NOT derived from the IR. The projection would add 8K+ lines of dead code for negligible coverage today. Will be valuable when the app migrates reads to canonical manifest paths. Decision: DEFER.

### 5.6 Evaluate Drizzle projection as Prisma alternative

> **Complete.** See Completed Milestones for details.

### 5.7 Evaluate llm-context projection for MCP server integration — ✅ DONE 2026-06-09

> **Complete.** See Completed Milestones for details.

### 5.8 Evaluate materialized-views projection for reporting — ✅ DONE 2026-06-09

> **Complete.** See Completed Milestones for details.

### 5.9 Evaluate health projection for K8s readiness

> **Complete.** See Completed Milestones for details.

### 5.10 Evaluate analytics projection for tracking events — ✅ DONE 2026-06-09

> **Complete.** See Completed Milestones for details.

### 5.11 Evaluate new projections (12 not in prior plan) — ✅ DONE 2026-06-09

> **Complete.** See Completed Milestones for details.

### 5.12 Evaluate and wire agent-sdk for MCP server (HIGH PRIORITY) — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 5.13 Wire ir-diff for CI schema drift detection (HIGH PRIORITY) — ✅ ALREADY DONE

> **Complete.** See Completed Milestones for details.

## TIER 6 -- FRONTEND CLIENT STRATEGY

> **Why:** The generated `manifest-client.generated.ts` has **1,330 functions with 94 consumers** (Task 6.2 batches 1-21). The app uses 4 coexisting patterns. TanStack Query IS installed with QueryProvider — 94 files now use generated client hooks; remaining ~107 apiFetch files still get zero caching (many retained for valid reasons: custom endpoints, file uploads, binary downloads, enriched responses, composite commands). Before adopting or extending the generated client, decide whether it is the right abstraction.

### 6.1 Frontend data layer decision — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 6.2 Add data caching/deduplication layer — PLATEAU (batches 1-21 done 2026-06-08, 94 files migrated, ~107 remaining categorized as non-migratable)
- **Phase 1 DONE (2026-06-07):**
  - React Query hooks generator created: `manifest/scripts/generate-react-query-hooks.mjs`
  - Generated hooks output: `manifest/generated/hooks/manifest-hooks.generated.ts` (628KB, covers all IR entities)
  - Package script added: `manifest:generate-hooks`
  - 2 logistics pages migrated from `apiFetch` to generated client: `drivers/page.tsx`, `vehicles/page.tsx`
  - Adoption guard test created: `apps/app/__tests__/manifest-generated-client-adoption.test.ts`
  - Verified: generated client throws on HTTP errors (removing `if (res.ok)` was correct)
  - Verified: import paths resolve correctly via tsconfig `@/*` → `./*` (rooted at `apps/app/`)
  - QueryProvider already live in `layout.tsx` with proper config (staleTime 60s, gcTime 5min, retry 1)
  - TanStack Query v5.100.14 installed
- **Batches 2+3 DONE (2026-06-07):** 20 additional files migrated (~45 command call sites). Net -200 lines boilerplate.
- **Batch 4 DONE (2026-06-07):** 14 more files migrated (~35 additional command call sites). Net -325 lines boilerplate total across all batches.
  - Events (7): contracts/create-contract-modal.tsx, battle-boards/new/page.tsx, follow-ups/page.tsx, waitlist/page.tsx, guests/event-guests-client.tsx, staff/event-staff-client.tsx, timeline/event-timeline-client.tsx
  - Inventory (2): transfers/inventory-transfers-client.tsx, vendor-catalogs/vendor-catalogs-client.tsx
  - Kitchen (3): quality-assurance/qa-actions-client.tsx, prep-task-plan-workflows/workflows-client.tsx, task-card.tsx
  - Staff (2): performance/page.tsx, mobile/timeclock/page.tsx
- **Batch 5 DONE (2026-06-07):** 11 more files migrated across logistics, warehouse, procurement, contracts, kitchen-mobile, facilities, knowledge-base, and events/catering domains.
- **Frontend `/api/manifest/` migration COMPLETE:** All remaining frontend files referencing `/api/manifest/` endpoints are either infrastructure (`manifest-client.ts`, `routes.ts`, `tool-registry.ts`) or server-side (`crm/clients/actions.ts` uses `runManifestCommand`, not `apiFetch`). No more frontend apiFetch calls to `/api/manifest/` exist.
- **Store provider regression tests ADDED:** Tests verify generated client store provider integration and prevent regressions in governed-write paths.
- **Batch 6 DONE (2026-06-08):** 6 more files migrated across 5 domains (~15 apiFetch calls replaced): Settings alerts (3 writes), Kitchen allergens (7 calls), Kitchen containers (1), Accounting chart-of-accounts (1), Staff training-module-create (1), CRM scoring (5 calls; calculate/distribution kept on apiFetch).
- **Batch 7 DONE (2026-06-08):** 4 more frontend files migrated to generated Manifest client: facilities/areas/page.tsx, facilities/assets/page.tsx, kitchen/schedule/page.tsx, warehouse/audits/cycle-count-client.tsx. Net -12 lines, 4 apiFetch calls replaced.
- **Batch 8 DONE (2026-06-08):** 8 more frontend files migrated to generated Manifest client: lib/leads.ts (listLeads, getLead), lib/proposals.ts (listProposals, getProposal), procurement/vendors/page.tsx (listVendors), logistics/routes/routes-view.tsx (listLogisticsRoutes), crm/pipeline/pipeline-board.tsx (listDeals), kitchen/equipment/equipment-page-client.tsx (listEquipments, listFacilityWorkOrders), events/catering/catering-client.tsx (listCateringOrders), accounting/collections/collections-client.tsx (listCollectionCases). Net -34 lines, 11 apiFetch calls replaced. 57 files now consume generated client.
- **Batch 9 DONE (2026-06-08):** 7 more files migrated (vendor-catalogs-client, vendor-contracts/page, requisitions/page, vendor-contracts/[id], requisitions/[id], logistics/drivers/page, logistics/vehicles/page). ~9 apiFetch calls replaced. 59 files total consuming generated client.
- **Batch 10 DONE (2026-06-08):** 4 more files migrated (facilities/work-orders, inventory/transfers-client, payroll/periods/[id], staff/performance). ~4 apiFetch calls replaced. 60 files total consuming generated client. Note: several files skipped due to endpoint path mismatches (procurement endpoints vs inventory endpoints in generated functions).
- **Batch 11 DONE (2026-06-08):** 6 files (upcoming-maintenance-widget, workflows-client, vendor-contracts/[id], alerts-client, requisitions/[id], knowledge-base-client). Generated client envelope key fixes for listFacilityAssets and listKnowledgeBaseEntries. Net -46 lines.
- **Batch 12 DONE (2026-06-08):** 6 files (notifications-client, follow-ups/page, workflows-client command dispatch, security-client, invoices/[id], payments/[id]). Net -74 lines.
- **Batch 13 DONE (2026-06-08):** 6 files (prep-lists/mobile, allergen-modal, payroll-periods, payroll-payouts, task-card partial, payroll-reports partial). Net -33 lines.
- **Batch 14 DONE (2026-06-08):** 8 files (knowledge-base-detail, purchase-orders/page, purchase-orders/[id] with 8 command dispatches, vendors/[id] composite response, staff/performance completion, requisitions/new, training delete/edit). Net -4 lines.
- **Batch 15 DONE (2026-06-08):** 4 files migrated + 9 files with NOTE comments documenting remaining apiFetch blockers (custom endpoints, AI endpoints, file uploads). Collections commands migrated. Net changes.
- **Batch 16 DONE (2026-06-08):** 6 files (purchase-orders/new, budget/page, mobile prep-lists/page, mobile prep-lists/[id], shipments-client, battleboards-client). Net -42 lines. First mobile-kitchen path migrations.
- **Batch 17 DONE (2026-06-08):** 2 complex event files migrated (guest-management.tsx, contract-detail-client.tsx). Guest management: 5 apiFetch calls replaced (listEventGuests, listEventDishes, eventGuestCreate, eventGuestUpdate, eventGuestSoftDelete) + dead code removed (GuestsResponse, ApiErrorPayload, getResponseErrorMessage). Contract detail: 5 command calls migrated to generated functions (eventContractSend/Sign/Cancel/Expire/MarkViewed, eventContractSoftDelete, contractSignatureCreate); 3 apiFetch calls retained for custom endpoints (history fetch, send-to-client with signing token, document upload). ~80 files now consuming generated client. API+app typecheck 0, 2785 tests pass, route drift 0. Key finding: 4 additional files investigated but CANNOT migrate — invoices/new, payments/new, payment-form-client (no paymentCreate/invoiceCreate in generated client; server routes have essential pre-validation), admin-chat-client (8 custom endpoints with participant logic not in generated routes).
- **Batches 18-21 DONE (2026-06-08):** 12+ additional files migrated. ~94 files now import from generated client. ~40 apiFetch calls replaced total. Net -400+ lines of boilerplate eliminated across all batches. 0 typecheck errors.
- **Remaining apiFetch files (~107):** Many annotated with NOTE comments documenting retention reasons. Categories: (1) custom endpoints (analytics, AI, search, calendar sync) with no generated equivalent, (2) file uploads (FormData/multipart not supported by generated client), (3) binary downloads (PDF, CSV, reports), (4) enriched response shapes with joined data (generated client returns flat entities), (5) composite commands (recipe versioning, batch operations) with different API patterns.
- **Done when (UPDATED — PLATEAU):** 94 files migrated. ~107 remaining apiFetch files are non-migratable (custom endpoints, file uploads, binary downloads, enriched responses, composite commands). Further progress requires generated client enhancements. Component re-mounts on migrated files do not trigger fresh API calls.
- **Why:** TanStack Query IS installed with QueryProvider. 94 files now use generated client. ~107 remaining apiFetch files call non-manifest REST endpoints or custom patterns (file uploads, binary downloads, enriched responses, composite commands) — these are architectural mismatches, not oversight.
- **Backpressure:** Network tab shows cached responses on re-mount for non-event domains.
- **Source to change:** `apps/app/app/lib/api.ts` (expand TanStack Query wrapper beyond events domain).

### 6.3 Implement chosen frontend strategy
- **Done when:** Single consistent frontend data access pattern. Dead code eliminated.
- **Backpressure:** `grep -r 'from.*manifest-client.generated' apps/app/` returns only intended consumers. Sample CRUD flow works end-to-end.

### 6.4 Typed command input generation — ✅ DONE 2026-06-08

> **Complete.** See Completed Milestones for details.

### 6.5 Rename misleading `use-*.ts` files — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

## TIER 7 -- RUNTIME FEATURE WIRING

> **Why:** 16 of 19 RuntimeOptions properties are NOT wired. The highest-leverage change is **middleware wiring** -- it enables RBAC, identity enrichment, audit, and bootstrap seed to be expressed as lifecycle hooks instead of hand-rolled proxies. The audit found that the custom outbox implementation duplicates the upstream OutboxStore contract, no audit trail exists, and no durable approval state is possible.

### 7.1 Wire auditSink (PostgresAuditSink) — ✅ DONE (verified 2026-06-07)

> **Complete.** See Completed Milestones for details.

### 7.2 Wire outboxStore (PostgresOutboxStore) — ✅ DONE (verified 2026-06-07)

> **Complete.** See Completed Milestones for details.

### 7.3 Wire requireTenantContext — **DONE**

> **Complete.** See Completed Milestones for details.

### 7.4 Wire middleware pipeline (HIGHEST PRIORITY)

> **Complete.** See Completed Milestones for details.

### 7.5 Wire Rules Engine into factory pipeline — ✅ DONE (deleted 2026-06-04)

> **Complete.** See Completed Milestones for details.

### 7.6 Wire remaining RuntimeOptions — ✅ DONE (with documented deferrals, 2026-06-08)

> **Complete.** See Completed Milestones for details.

### 7.7 Fix `as any` casts in runtime factory — ✅ DONE (verified 2026-06-06)

> **Complete.** See Completed Milestones for details.

### 7.8 Audit API shim for factory migration — ✅ DONE (verified 2026-06-07)

> **Complete.** See Completed Milestones for details.

### 7.9 Wire Runtime Profiler export (`@angriff36/manifest/profiling`) — PARTIALLY DONE (blocked on upstream)
- **Wiring READY.** The factory already passes `deps.profiling` to the engine via RuntimeOptions (line ~448: `...(deps.profiling && { profiling: deps.profiling })`). The profiling export exists at `@angriff36/manifest/profiling` (not `/profiler` as previously stated). Full API surface available: `ExecutionPhase` (13 phases), `CommandProfile`, `PhaseTiming`, `ProfileSummary`, `toFlameGraph()`, `summarizeProfiles()`.
- **BLOCKED:** The upstream `ProfileCollector` class is defined but `RuntimeEngine.getProfiles()` returns empty — actual per-phase timing capture is not yet implemented in the shipped `@angriff36/manifest@2.2.0`. When the upstream implements timing capture, the existing wiring will automatically pass profile data to `onProfileComplete` callbacks.
- **Current status:** Enable profiling by passing `{ profiling: { enabled: true, onProfileComplete: callback } }` to the factory. Structure is correct; awaiting upstream implementation of actual timing capture.

---

## TIER 8 -- GOVERNANCE MIGRATION & CONFORMANCE

> **Why:** The audit found 191 direct-write violations in API routes and 110 in server actions (301 total across 28 server-action files + 80 API files). Payroll engine is 100% bypass. Invoice entity has zero policies. Constitution S12 requires audit discipline. Constitution S17 requires a conformance test index.
>
> **Status 2026-06-07:** `pnpm manifest:audit-direct-writes` reports **0 governed-entity violations**. 72 files scanned with 250 hits; 11 allowed, 61 reported (47 ungoverned infrastructure + 21 documented bypasses). All governed entities route through Manifest runtime or have approved bypass entries in `bypasses.json`. Governance migration is **effectively COMPLETE** for governed entities. Remaining work: (a) evaluate whether ungoverned entities should be added to Manifest IR, (b) reduce bypass count over time.

### 8.1 Payroll governance migration (HIGHEST GOVERNANCE PRIORITY) — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 8.2 API route governance migration (~191 violations across 80 files) — ✅ DONE (governed-entity violations = 0)

> **Complete.** See Completed Milestones for details.

### 8.3 Server actions governance migration (~109 violations across ~27 files) — ✅ DONE (governed-entity violations = 0)

> **Complete.** See Completed Milestones for details.

### 8.4 Package-specific governance migration — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 8.5 Conformance test index (Constitution S17) — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 8.6 Fill command-level policies — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 8.7 Reduce write-route-allowlist — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 8.8 Adopt defaultPolicies for entity-level RBAC — ✅ DONE 2026-06-05 (via Task 8.6)

> **Complete.** See Completed Milestones for details.

### 8.9 Parent-context propagation — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 8.10 Migrate BASELINE parent-context candidates (follow-up to 8.9)

> **Complete.** See Completed Milestones for details.

## TIER 9 -- ENTITY GRAPH & ADVANCED FEATURES

> **Why:** The entity-graph module was deleted in Task 10.4 (dead code, zero consumers). The IR has 10 reactions and 6 sagas. Manifest DSL features (reactions, approvals, sagas, modifiers, concurrency, state transitions) are available. 39 export paths in @angriff36/manifest with only 4 actively used (10.3%). 40/40 CLI commands now wired (Task 9.15). Manifest docs confirm: Reactions support declarative event-to-command binding with resolve expressions, condition guards, and batch mode. Workflows (Sagas) support multi-step with compensate actions, timeout, retry. Custom Stores use Store\<T\> interface with 6 methods. Plugin API via definePlugin() for extending projections, store adapters, builtins. See also Tier 11 for newly discovered advanced features (async commands, feature flags, mixin composition, scheduled commands) and Tier 12 for federation.

### 9.1 Entity-graph rebuild (currently dead code) — ✅ DONE 2026-06-04 (Task 10.4)

> **Complete.** See Completed Milestones for details.

### 9.2 Wire reactions (event-driven side effects) — ✅ ALL 10 REACTIONS FIXED (2026-06-06)

> **Complete.** See Completed Milestones for details.

### 9.3 Expand saga orchestration for multi-step workflows -- ✅ DONE 2026-06-08

> **Complete.** See Completed Milestones for details.

### 9.4 Wire approval workflows — ✅ DONE 2026-06-08

> **Complete.** See Completed Milestones for details.

### 9.5 Adopt state transitions for status fields — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 9.6 Adopt CLI commands for development workflow — ✅ DONE 2026-06-10

> **Complete.** All 20 done-when CLI commands wired (validate, coverage, watch, fmt, docs, diagram, mock, lint-routes, audit-routes, enforce-surface, audit-governance, diff, migrate, changelog, runtime-check, doctor, integration-check, config, versions, plugins). 16 additional subcommand variants added (diff:breaking, diff:ir-vs-ir, versions:list/save/verify/diff/changelog/tag/rollback, config:validate/defaults/effective, scan, scan:strict). Total: 91 manifest:* scripts in package.json. `manifest:scan` wired as CI gate (191 warnings — all `durable` store target, expected for custom provider). `seed` and `profile` CLI commands do not exist in v2.2.0.

### 9.7 Property modifier adoption -- DONE (2026-06-08)

> **Complete.** See Completed Milestones for details.

### 9.8 Overrideable constraints -- DONE (2026-06-08)

> **Complete.** See Completed Milestones for details.

### 9.9 Permission guard to middleware migration (SECURITY PRIORITY) — **DONE (mitigated by Task 8.6)**

> **Complete.** See Completed Milestones for details.

### 9.10 Evaluate and adopt `realtime` entity modifier for SSE subscriptions — **BLOCKED (feature not in v2.2.0)**
- **BLOCKED 2026-06-07.** The `realtime` modifier does NOT exist in @angriff36/manifest v2.2.0. Exhaustive search confirmed: zero type definitions, source files, or exports contain "realtime" as a modifier keyword. The plan referenced "Official docs `/extensibility/realtime-subscriptions`" but that path does not exist in the current documentation. This feature was listed in the 10th revision based on docs discovery but is not implemented in the installed package. Blocked pending package upgrade to a version that includes realtime support.
- **Original done-when:** At least 5 high-value entities use the `realtime` modifier. SSE endpoints auto-generated. `use{Entity}Realtime` React hooks integrated in frontend. Auto-reconnect verified.
- **Why (future):** The `realtime` modifier would auto-generate SSE endpoints (`GET /api/{entity}/realtime`) and React hooks. Currently ZERO realtime infrastructure exists -- all data refresh is polling-based via 1,092 `apiFetch` call sites. High-value candidates: KitchenTask (live task board), Event (real-time event status), InventoryItem (stock level monitoring), NotificationRules (instant notification delivery), ScheduleShift (real-time schedule changes). This would replace polling with push-based updates for critical workflows.
- **Doc:** Referenced path `/extensibility/realtime-subscriptions` does not exist in current docs.

### 9.11 Evaluate computed caching for performance-critical computed properties — ✅ DONE 2026-06-09

> **Complete.** See Completed Milestones for details.

### 9.12 Adopt snapshot testing for CI code generation validation — ✅ DONE 2026-06-08

> **Complete.** See Completed Milestones for details.

### 9.13 Add property-based testing for entity invariants — ✅ DONE 2026-06-08

> **Complete.** See Completed Milestones for details.

### 9.14 Evaluate IR compression for large deployments
- **Done when:** Decision documented on whether to adopt `compressIR()`/`decompressIR()` for IR payload size reduction (60-80% claimed). If adopted, IR loading pipeline updated.
- **Why:** The `@angriff36/manifest/compression` export provides lossless binary serialization with 60-80% size reduction. The IR for 189 entities is substantial -- compression could reduce load times and memory footprint. Low priority but worth evaluating for production deployments.
- **Backpressure:** If adopted: `compressIR()` produces smaller payload, `decompressIR()` produces byte-identical roundtrip.
- **Source to change:** IR loading pipeline, import from `@angriff36/manifest/compression`.
- **Doc:** Official docs `/extensibility/compression`

### 9.15 Expand CLI adoption (40 commands available) — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 9.16 Wire Governance CLI suite (7 commands) — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 9.17 Wire AI conformance test generator (`manifest generate-tests`) — **BLOCKED (command not in v2.2.0)**
- **BLOCKED 2026-06-07.** The `manifest generate-tests` CLI command does NOT exist in @angriff36/manifest v2.2.0. Exhaustive search confirmed: zero hits for `generate-tests`, `generateTests`, or `generate_tests` in the package. The 13th revision referenced this as a discovered feature, but the command is not available in the installed version. Blocked pending package upgrade to a version that includes the AI conformance test generator.
- **Original done-when:** `pnpm manifest:generate-tests` produces test suites from IR for at least 10 entities. Tests cover command conformance, policy compliance, and guard safety.
- **Why (future):** The `manifest generate-tests` command would auto-generate test suites from IR definitions. Produces command conformance tests, policy compliance tests, and guard safety tests for all 189 entities. Automates the bulk of Task 8.5 conformance test authoring. Currently zero auto-generated tests exist.
- **Doc:** Referenced path `/extensibility/ai-tooling` — command not found in current package.

### 9.18 Adopt policy matrix viewer for security audit -- DONE (2026-06-08)

> **Complete.** See Completed Milestones for details.

## TIER 10 -- CODEBASE CONSOLIDATION & TYPE SAFETY

> **Why:** Several code modules duplicate functionality that Manifest provides. The audit found significant type-safety gaps (`as any` usage) and code hygiene issues.

### 10.1 Delete legacy manifest-runtime.ts (3,205 lines of dead code) — ✅ ALREADY DONE (prior session)

> **Complete.** See Completed Milestones for details.

### 10.2 Recipe engine consolidation — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 10.3 Rules engine Manifest middleware integration — ✅ DONE 2026-06-04 (via Task 10.4)

> **Complete.** See Completed Milestones for details.

### 10.4 Delete confirmed dead code (rules-engine, entity-graph, packages/services)

> **Complete.** See Completed Milestones for details.

### 10.5 Outbox duplication consolidation — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 10.6 MCP server entity-domain-map consolidation — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 10.7 Fix `as any` usage in API routes — ✅ DONE (2026-06-07)

> **Complete.** See Completed Milestones for details.

### 10.8 Fix `as unknown as` double-cast patterns — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 10.9 Fix schema naming convention anomalies
- **Done when:** Document the exact mapping convention in a schema style guide. Establish CI-enforced convention for new models.
- **Why:** 195 PascalCase models coexist with 31 legacy snake_case models. 4 PascalCase @@map values (Tenant, ActivityFeed, EmployeeDeduction, OutboxEvent) deviate from the snake_case convention. Mixed enum casing.
- **Source to change:** `docs/database/CONTRIBUTING.md` (add style guide).

### 10.10 Investigate skipped test suite — ✅ DONE 2026-06-05

> **Complete.** See Completed Milestones for details.

### 10.11 Fix manifest runtime placeholder implementations — ✅ DONE 2026-06-07

> **Complete.** See Completed Milestones for details.

### 10.12 Adopt entity concurrency for high-contention entities -- DONE (2026-06-08)

> **Complete.** See Completed Milestones for details.

### 10.13 Remove legacy manifest-command-handler.ts -- DONE (2026-06-04)

> **Complete.** See Completed Milestones for details.

### 10.14 Test infrastructure improvements — DONE (2026-06-09, v0.12.224-225)

> **Complete.** See Completed Milestones for details.

## TIER 11 -- ADVANCED MANIFEST FEATURES (9TH REVISION + 12TH REVISION ADDITIONS)

> **Why:** The 9th revision research uncovered several high-value Manifest features that are fully implemented in the package but have zero adoption: Async Commands, Feature Flags, Mixin Composition, Scheduled Commands. The 12th revision added Rate Limiting, Command Retry Policies, Dynamic Data Masking, and cataloged 116 planned features across v1.9-v1.12. These features would replace hand-rolled patterns with Manifest-native alternatives, reducing code and increasing consistency. agent-sdk and ir-diff are covered in Tier 5 (Tasks 5.12, 5.13).
>
> **Tier 11 Status:** Tasks 11.1, 11.3, 11.4, 11.5, 11.6 are BLOCKED -- the Manifest v2.2.0 compiler does not support `schedule`, `mixin`, `rateLimit`, `retry`, or `async` keywords. Only `overrideable` (fully supported) and `flag()` (runtime-only, not parser) are available as vNext features in v2.2.0. Task 11.12 DONE. Tasks 11.2, 11.7-11.11 remain open.

### 11.1 Implement Async Commands for long-running operations -- **BLOCKED (keyword not in v2.2.0 compiler)**
- **BLOCKED 2026-06-08.** The `async command` keyword is NOT supported by the @angriff36/manifest v2.2.0 compiler. Only `overrideable` and `flag()` are supported as vNext features (`overrideable` fully, `flag()` runtime-only not parser). The `schedule`, `mixin`, `rateLimit`, and `retry` keywords are not recognized by the compiler/parser and will cause parse errors if used. Blocked pending package upgrade.
- **Done when:** At least 3 long-running operations converted to `async command`. `jobQueue` RuntimeOption wired. Auto-synthesized `CommandNameCompleted`/`CommandNameFailed` events verified.
- **Why:** The `async command <name>()` prefix defers execution to a background worker, returning `{ jobId, status: "pending" }` immediately. The `JobQueue` adapter interface supports pluggable backends. High-value candidates: report generation (currently blocks HTTP request), batch imports (vendor catalog sync), payroll processing (runs for minutes). These operations currently either block the request or use ad-hoc queue mechanisms.
- **Backpressure:** Async command returns immediately with jobId. Completion event fires when done. Failed commands produce `CommandNameFailed` event.
- **Source to change:** `manifest/source/*.manifest` (add `async` prefix to commands), `manifest/runtime/src/manifest-runtime-factory.ts` (wire `jobQueue`).
- **Spec:** `specs/async-commands.md`

### 11.2 Implement Feature Flags via flagProvider — ✅ DONE 2026-06-08

> **Complete.** See Completed Milestones for details.

### 11.3 Adopt Mixin Composition for shared properties -- **BLOCKED (keyword not in v2.2.0 compiler)**
- **BLOCKED 2026-06-08.** The `mixin` keyword is NOT supported by the @angriff36/manifest v2.2.0 compiler. Blocked pending package upgrade.
- **Done when:** `Auditable` mixin created (createdAt, updatedAt, deletedAt, tenantId). Applied to entities with heavy repetition. Source file duplication measurably reduced.
- **Why:** 189 entities have heavy repetition of common property sets: timestamps (createdAt/updatedAt), tenantId, audit fields, status fields. The `mixin Auditable { ... }` construct allows property/constraint reuse across entities. Currently every entity repeats these declarations verbatim. A single mixin could eliminate duplication across 150+ entities.
- **Backpressure:** Entities using mixin compile and run identically to entities with inline declarations. `pnpm manifest:compile` succeeds.
- **Source to change:** `manifest/source/*.manifest` (extract shared properties into mixins).

### 11.4 Implement Scheduled Commands -- **BLOCKED (keyword not in v2.2.0 compiler)**
- **BLOCKED 2026-06-08.** The `schedule` keyword is NOT supported by the @angriff36/manifest v2.2.0 compiler. Blocked pending package upgrade.
- **Done when:** At least 3 scheduled commands defined. Next.js cron routes auto-generated and registered. Schedules execute on time.
- **Why:** The `schedule <name> { cron "0 6 * * *" } run <command>` construct auto-generates Next.js cron routes. Zero scheduled commands exist today. Candidates: daily reconciliation (invoice/payroll), nightly inventory sync (supplier connectors), expiration checks (vendor contracts, certifications, licenses). These are currently either manual or implemented as ad-hoc cron jobs outside the Manifest lifecycle.
- **Backpressure:** Cron route fires at scheduled time. Command executes through full Manifest lifecycle (RBAC, audit, policies).
- **Source to change:** `manifest/source/*.manifest` (add `schedule` blocks).
- **Spec:** `specs/scheduled-commands.md`

### 11.5 Adopt Rate Limiting for high-traffic commands -- **BLOCKED (keyword not in v2.2.0 compiler)**
- **BLOCKED 2026-06-08.** The `rateLimit` keyword is NOT supported by the @angriff36/manifest v2.2.0 compiler. Blocked pending package upgrade.
- **Done when:** At least 3 high-traffic commands have `rateLimit` blocks. `RateLimitConfig` entity governs limits through Manifest rather than external middleware.
- **Why:** The `rateLimit { window, maxRequests, scope, strategy }` block is a Manifest DSL feature for command-level rate limiting with per-user, per-tenant, or global scope. Capsule has a `RateLimitConfig` entity and rate-limiting infrastructure outside Manifest. Migrating to Manifest-native rate limiting centralizes the policy.
- **Backpressure:** Command exceeding rate limit returns `rateLimitExceeded` with retry-after metadata.
- **Source to change:** `manifest/source/*.manifest` (add `rateLimit` blocks to commands).
- **Doc:** Rate limiting documented at command level in Manifest DSL docs. NOTE: `/features/security-features` URL returns 404.

### 11.6 Adopt Command Retry Policies for transient-failure commands -- **BLOCKED (keyword not in v2.2.0 compiler)**
- **BLOCKED 2026-06-08.** The `retry` keyword is NOT supported by the @angriff36/manifest v2.2.0 compiler. Blocked pending package upgrade.
- **Done when:** At least 3 commands with external dependencies have `retry` blocks. Notification `sendEmail` and report generation use Manifest-native retry.
- **Why:** The `retry { maxAttempts, backoff, initialDelay, maxDelay, jitter }` block provides configurable retry with exponential backoff for transient failures. Auto-synthesized `{Command}RetryAttempted` and `{Command}RetryExhausted` events. Currently retry logic is hand-rolled or absent.
- **Backpressure:** Transient failure triggers retry. Exhausted retries emit `RetryExhausted` event.
- **Source to change:** `manifest/source/*.manifest` (add `retry` blocks).
- **Doc:** Retry policies documented at command level in Manifest DSL docs. NOTE: `/features/security-features` URL returns 404.

### 11.7 Evaluate MCP Server export for replacing custom MCP server entirely
- **Done when:** Decision documented: adopt upstream `@manifest/mcp-server` (4 tools: compile, execute, validate, explain) vs retain custom `packages/mcp-server` with agent-sdk integration (Task 5.12). If upstream adopted, `packages/mcp-server/` becomes thin config wrapper.
- **Why:** The upstream MCP Server (`manifest-mcp` bin) provides compile-on-the-fly, execute-through-runtime, validate, and explain tools over stdio. The custom `packages/mcp-server` duplicates entity/command introspection that `agent-sdk` already provides. Upstream + agent-sdk may cover all needs without a custom package.
- **Backpressure:** Decision document comparing upstream MCP vs custom MCP capabilities.
- **Doc:** `docs/manifest-official/features/mcp-server.md`

### 11.8 Evaluate v1.9-v1.12 roadmap features for capsule-pro adoption priority
- **Done when:** Each of the 76 unreleased features evaluated with a one-line assessment. Top 10 candidates for immediate adoption identified.
- **Why:** The FEATURE-LIST documents 116 features (27 shipped, 76 unreleased, 13 no summary). Many are high-value for capsule-pro: Seed Data Generator, Default-Deny Policy, Soft Delete Pattern, Pagination API, CQRS Read Model, Notification Channels, OpenTelemetry Metrics. These may ship in upcoming package versions and should be evaluated for early adoption.
- **Backpressure:** Assessment document with adoption priority per feature.

### 11.9 Wire Runtime REPL for interactive debugging — BLOCKED (upstream)
- **Done when:** `pnpm manifest repl` launches interactive REPL. Can inspect entity state, evaluate Manifest expressions, test guards/policies in real-time against loaded IR.
- **Why:** The `manifest repl` command provides an interactive debugging environment for Manifest runtime. Developers can inspect entity state, evaluate expressions, test guards and policies without deploying. Currently all runtime debugging requires running the full application with breakpoint inspection. REPL dramatically improves development velocity for IR authoring and debugging.
- **BLOCKED:** The `repl` command does not exist in `@angriff36/manifest@2.2.0`. CLI has no REPL functionality. Awaiting upstream implementation.
- **Backpressure:** REPL starts, loads IR, responds to entity inspection queries.
- **Source to change:** `package.json` scripts section.
- **Doc:** Official docs `/extensibility/runtime-tooling`

### 11.10 Evaluate Time-Travel Debugger for command debugging — BLOCKED (not in v2.2.0)
- **BLOCKED 2026-06-09.** The `@angriff36/manifest/debug` export does NOT exist in v2.2.0 despite prior plan claim. The package.json exports map has 28 entries — no `./debug`. No file in `dist/manifest/` contains "debug" or "time-travel". The `serialize()`/`restore()` API exists for single-point snapshots but is not step-by-step replay.
- **Done when:** `@angriff36/manifest/debug` export exists and is verified functional.
- **Why:** A time-travel debugger would record every `mutate` during command execution and enable stepping forward/backward through state changes. Invaluable for debugging complex multi-step commands (VendorContract lifecycle, PayrollRun processing, EventGuest RSVP flow).
- **Backpressure:** Command execution recorded. State replay produces identical final state.
- **Source to change:** `manifest/runtime/src/manifest-runtime-factory.ts`. Import from `@angriff36/manifest/debug`.
- **Doc:** Official docs `/extensibility/runtime-tooling` (NOTE: may also be aspirational, not shipped)

### 11.11 Evaluate entity inheritance (`extends`) for entity hierarchies
- **Done when:** Decision documented on using entity inheritance to reduce repetition across entity families. If adopted, identify entity hierarchies and create base entities.
- **Why:** The `extends` keyword enables single inheritance for entities, allowing shared properties/constraints to be defined once in a base entity. Complements mixin composition (Task 11.3) for hierarchical relationships. Candidate hierarchies: Event→CateringEvent, InventoryItem→WasteEntry.
- **Backpressure:** Child entity inherits parent properties/constraints. `pnpm manifest:compile` succeeds.
- **Source to change:** `manifest/source/*.manifest`.
- **Doc:** Official docs `/language/advanced-entities`

### 11.12 Wire IR validator/doctor for CI — ✅ DONE 2026-06-08

> **Complete.** See Completed Milestones for details.

## TIER 12 -- FEDERATION & MULTI-SERVICE (10TH REVISION)

> **Why:** The 10th revision discovered the `@angriff36/manifest/federation` export -- a complete multi-service runtime mesh with service discovery, cross-service command invocation, health checks, policy bridge, and HTTP adapter generation. This is entirely absent from the plan and represents a future architectural capability for microservice decomposition. Not actionable today (single-service monolith), but should be tracked for when the architecture evolves.

### 12.1 Evaluate Federation for future multi-service architecture
- **Done when:** Federation capabilities documented with architecture fit assessment. Decision recorded: adopt, defer, or reject.
- **Why:** The `federation` export provides: `FederationRegistry` (service registry + discovery), `FederationClient` (typed cross-service command invocation), `buildDescriptor` (service descriptor generation from IR). Policy bridge propagates identity via `X-Manifest-*` headers across service boundaries. HTTP adapter generation produces typed client classes for remote services. Idempotency heuristics for retry-safe cross-service calls. Capsule-Pro is currently a monolith -- federation is NOT needed now. But if the architecture evolves toward microservices (e.g., separating payroll engine, supplier connectors, notification service), Manifest federation would provide the service mesh layer with zero additional infrastructure.
- **Backpressure:** Architecture decision record with federation evaluation.
- **Source to change:** Architecture documentation only. No code changes.
- **Doc:** Official docs `/extensibility/federation`
- **New package exports discovered:** `./federation`, `./compression`, `./projections` (top-level), `./audit` (top-level), `./outbox` (top-level), `./approval` (top-level)

### 12.2 Evaluate MCP Server export for replacing custom MCP server (CONFIRMED SEPARATE EXPORT)
- **Done when:** Decision documented: adopt upstream `@manifest/mcp-server` (4 tools: compile, execute, validate, explain) vs retain custom `packages/mcp-server` with agent-sdk integration (Task 5.12). If upstream adopted, `packages/mcp-server/` becomes thin config wrapper.
- **Why:** **CONFIRMED (13th rev):** MCP Server is a SEPARATE export (`@manifest/mcp-server`, bin `manifest-mcp`) with 4 tools: compile-on-the-fly, execute-through-runtime, validate, and explain over stdio. Distinct from agent-sdk. Resolves prior "NEEDS VERIFICATION" status. Capsule has upstream (unused) + custom (active). Task 11.7 now fully actionable.
- **Backpressure:** Decision document comparing upstream MCP vs custom MCP capabilities.
- **Doc:** Official docs `/extensibility/mcp-server`

## Phase-Out Registry Status

| Section | Target | Status |
|---|---|---|
| A | Hand-rolled Prisma stores -> GenericPrismaStore or codegen | NEAR-DONE (89/94 use GenericPrismaStore, 5 custom by design) |
| B | Hand-authored Prisma schema -> PrismaProjection + mapping config | IN PROGRESS (189/189 matched, 256 models generated, `prisma validate` PASSES on full generated schema — 152 default-value errors fixed v0.12.234) |
| C | Route accessor hack -> schema-aware accessor resolution | DONE (2026-05-30) |
| D | ENTITY_DOMAIN_MAP consolidation | DONE (2026-06-04) |
| E | Explicitly NOT for phase-out (keep) | N/A |


**Exit criteria status (28 total):** Criteria 3, 9, 14-16, 23, 26, 28 COMPLETE. All others addressed in their respective tasks. See individual tier sections for remaining open items.

---

## Codebase Metrics (verified 2026-06-08)

| Metric | Value | Prior Value | Change |
|---|---|---|---|
| --- | --- | --- | --- |
| IR entities | **202** (ALL durable) | 189 | UPDATED: Task 0.4 final batch + entity additions |
| IR commands | **999** (905 with guards, 950 with emits, 2 without emits) | 952 | UPDATED: Task 8.2/8.3 batches |
| IR events | **981** | 979 | UPDATED: Task 9.3 saga expansion |
| IR sagas | **6** (ProcessInvoicePayment, FinalizeEventWithReporting, AutoGeneratePrepList... | 1 | UPDATED: Task 9.3 DONE — 5 new sagas added |
| IR reactions | **10** (finance: 3, inventory: 1, events: 1, equipment: 2, crm: 1, events: 1) | 0 | Target 5+ EXCEEDED |
| IR approval blocks | **3** (PurchaseOrder, VendorContract, PurchaseRequisition) | 0 | NEW: Task 9.4 DONE |
| IR relationships | **169 entities (290 declarations)** | 8 (12 declarations) | UPDATED: Task 0.4 COMPLETE + AUDITED — 68 belongsTo across... |
| IR entities with FK props but no relationship | **0** (33 audited, all verified as not needing) | 152→32→0 | UPDATED: 2026-06-09 audit — 28 no FK columns, 2 polymorphic... |
| IR entities with transitions | 96 | 96 | -- |
| IR status entities lacking transitions | 4 | 4 | -- |
| IR computed properties with empty dependencies | **553/610 (90.7%)** (was 563/611 before dependency enrichment) | 563/611 | UPDATED: 7 cross-property dependency gaps resolved via... |
| IR overrideable constraints | **5/583** (Task 9.8 DONE: 5 warn constraints overrideable) | 0/583 | UPDATED: Task 9.8 DONE |
| IR source files | 94 | 92 | UPDATED: Task 9.7 modifier annotations |
| IR property modifiers (source-level) | **534** across 94 files: indexed(92) searchable(73) unique(18) encrypted(32)... | 0 | NEW: Task 9.7 DONE — not yet emitted to IR JSON (future... |
| IR source type bugs (datetime-as-number) | **559+ in EVENT PAYLOADS only (entity-level fixed by timestamps modifier)** | 0 | RESOLVED v0.12.208–214 (Task 2.7/2.8, money v0.12.212-213... |
| IR event payload timestamps as `number` | **0 fields** (21 fixed across 7 files: time-entry, schedule, event-staff... | 916 | RESOLVED 2026-06-09 — remaining event payload... |
| IR entity property timestamps as `datetime` | **741 fields** | 741 | NEW: correctly declared, mismatch is in events only |
| IR datetime mutated to 0 | **9 occurrences** | 9 | -- |
| IR property types | string(1584) datetime(741) int(158) money(109) decimal(102) boolean(94)... | same | -- |
| IR number-type props | 0 | 0 | -- |
| Prisma models | 226 total, **188 match IR**, 67 Prisma-only, **1 IR without model** (QACheck)... | 226/173/16 | UPDATED: 188/189 matched after Task 2.5 Phase 3 |
| `prisma-store.ts` | ~1,085 lines, **5** switch cases | was 3,061 lines, 94 cases | UPDATED: Task 3.2/3.3 — 61% reduction, GenericPrismaStore... |
| `prisma-stores/` | 3 files | was 45 files, ~12,694 lines | UPDATED: Task 3.3 — phase 1+2 cleanup |
| Total hand-maintained store code | ~1,085 lines (prisma-store.ts) + 3 files (prisma-stores/) | was ~15,755 lines | UPDATED: Task 3.3 — 93% reduction |
| `manifest-runtime-factory.ts` | **520** lines | 521 | CORRECTED 11th rev |
| `manifest-runtime.ts` (package re-export) | 66 lines | 66 | -- |
| `manifest-runtime.ts` (legacy dead code) | 3,205 lines, 60+ `as any`, 50+ wrappers | same | -- |
| `manifest-runtime.ts` (API shim) | 376 lines | 376 | -- |
| `manifest-command-handler.ts` (legacy) | ~~Monolithic handler, SHOULD BE DELETED~~ DELETED (Task 10.13) | N/A | RESOLVED 2026-06-04 |
| `execute-command.ts` (canonical) | Single canonical handler, used by all 71 routes + dispatcher | N/A | RESOLVED 2026-06-04 |
| `manifest-client.generated.ts` | **1,330 functions, 94 consumers, 988 strict typed inputs (no index signature)**... | 1,330/0 | UPDATED (Task 6.4 Phases 1-2) |
| `manifest-types.generated.ts` | 3,367 lines, 189 interface definitions | same | -- |
| API typecheck errors | **0** (Task 0.1 RESOLVED 2026-06-04; follow-up soft-delete drift RESOLVED... | 80 (72+8) | RESOLVED: generator fixes + hand-written fixes (2026-06-04)... |
| Runtime typecheck errors | **0** | 0 | -- |
| Entity graph module | 7 files, **DEAD CODE** (0 consumers, stub) | same | -- |
| Rules Engine module | 5 files, 10 rules, **DEAD CODE** (0 consumers) | same | -- |
| Dead code total (graph + rules-engine + services) | **~2400+ lines** | same | -- |
| CLI scripts using manifest | 13 of **40** (**33%**) | 13/37 | CORRECTED: 40 CLI commands total (was 35-37) |
| GenericPrismaStore | Available (233 LOC), NOT used at runtime | same | -- |
| RuntimeOptions wired | **7 of 19** (5 wired + 2 passthrough) | same | -- |
| Direct-write violations (API) | **0** governed (21 bypassed + 47 ungoverned) | 191 | RESOLVED (v0.12.149) |
| Direct-write violations (server actions) | **0** governed | 110 | RESOLVED (v0.12.149) |
| Direct-write violations (packages) | **0** governed (documented bypasses) | 9+ | RESOLVED (v0.12.149) |
| Hybrid files (partial migration) | **0** | 12 | RESOLVED (v0.12.149) |
| Total direct-write violations | **0** governed, **21** documented bypasses, **47** ungoverned infrastructure | 301 | RESOLVED (v0.12.149) |
| `as any` in apps/api/app/ | **0** | 39 | RESOLVED (Task 10.7, 2026-06-07) |
| `as any` in manifest/runtime/src/ | **0** (factory verified clean 2026-06-06) | 10 | RESOLVED |
| `as any` in factory specifically | **0** (verified 2026-06-06) | 6 | RESOLVED |
| `as unknown as` double-casts | **91** (architecturally necessary: test mocks, Prisma JSON, Vega-Lite) | 157 | RESOLVED (Task 10.8, v0.12.168: 42% reduction) |
| Schema drift violations | **0** (110/110 entities clean, strict mode exit 0) | 179 | RESOLVED (v0.12.170) |
| describe.skip test suites | 0 | 1 (sales-reporting) | RESOLVED v0.12.233 |
| apiFetch call sites | **~1,052** across **~107 files** (~40 replaced via generated client) | 1,098/169 | UPDATED (Task 6.2 batches 1-21) |
| Frontend data caching | TanStack Query installed, **94 files** migrated to generated client, hooks... | 5/31 | UPDATED (Task 6.2 batches 1-21) |
| use-*.ts files | **11** (10 renamed to `*.ts` in Task 6.5, 1 TanStack Query) | 21 | RESOLVED (Task 6.5, 2026-06-07) |
| Hardcoded API URL paths | ~1,092 (81% of total) | ~1,098 | CORRECTED (9th rev) |
| Typed path builders | ~50 | ~50 | -- |
| Files using typed routes | **7** (routes.ts has 218 lines of helpers) | 6 | CORRECTED (9th rev) |
| ENTITIES_WITH_SPECIFIC_STORES | 96 entries (95 unique, VendorContract duped) | same | -- |
| Permission guard coverage | **31 entries across 9/189 entity types (4.8%)**, allow-by-default | ~36 entries | CORRECTED 11th rev: 31 not 28 |
| Advanced RuntimeOptions features used | 0 of 15 | 0 | -- |
| Package exports actively used | 4 of **39** (10.3%) | 4/38 | CORRECTED 11th rev: 39 exports total (was 44) |
| Projections available | **27** (was 25) | 25 | CORRECTED |
| Projections NOT in prior plan | **12**: dart, dynamodb, elasticsearch, hono, jsonschema, kysely, mongoose... | N/A | NEW |
| Projections active | **9**: nextjs, routes, prisma(pilot), mermaid, kysely, drizzle, llm-context... | 2 (nextjs, routes) + 1 pilot (prisma) | CORRECTED |
| Projections unevaluated | **19** (12 new + 7 from prior plan) | 20 | CORRECTED |
| Manifest config consumed | **YES** — paths + appDir + readRoutes + dispatcher executor import + routes... | 0 of 148 lines | RESOLVED 2026-06-09 |
| irHash / contentHash | **Populated and verified** (irHash = deterministic IR JSON, contentHash = source manifests) | EMPTY | RESOLVED (v0.12.232) |
| Outbox implementations | **3** (realtime canonical, kitchen helpers unsafe, manifest batch) | same | -- |
| Snake_case Prisma model names | **30 models** | same | -- |
| Total API routes | **767** (363 generated + 404 hand-written) | same | -- |
| Kitchen domain routes | 165 (100 gen, 65 hand, 22 direct writes, 16 manifest) | N/A | NEW breakdown |
| Events domain routes | 76 (40 gen, 36 hand, 6 direct writes, 16 manifest) | N/A | NEW breakdown |
| Notifications domain routes | 16 (2 gen, 14 hand, 1 direct write, 7 manifest) | N/A | NEW breakdown |
| Command Board routes | 26 (12 gen, 14 hand, 4 direct, 4 manifest) | N/A | NEW breakdown |

## Specs to Author (9th Revision)

| Spec File | Purpose | Tier |
|---|---|---|
| `specs/async-commands.md` | How to use async commands for long-running operations (report generation, batch imports, payroll processing) | 11.1 |
| `specs/reactions-implementation.md` | First 10 high-value reactions to implement from 936 available events | 9.2 |
| `specs/feature-flags.md` | How to integrate `flag()` with external provider for runtime feature gating | 11.2 |
| `specs/scheduled-commands.md` | Cron routes for periodic tasks (reconciliation, inventory sync, expiration checks) | 11.4 |
| `specs/agent-sdk-integration.md` | How to replace MCP server with agent-sdk exports | 5.12 |
| `specs/timestamps-modifier.md` | How to adopt `timestamps` modifier to eliminate createdAt/updatedAt hand-declarations across 189 entities | 2.8 |
| `specs/realtime-subscriptions.md` | SSE endpoint + React hook strategy for high-value entities (KitchenTask, Event, InventoryItem) | 9.10 |
| `specs/federation-evaluation.md` | Architecture fit assessment for multi-service Manifest federation | 12.1 |
| `specs/rate-limiting.md` | How to migrate rate limiting from external middleware to Manifest-native rateLimit blocks | 11.5 |
| `specs/command-retry.md` | How to add retry policies to transient-failure commands (notifications, reports) | 11.6 |
| `specs/mcp-server-migration.md` | Decision: upstream MCP Server vs custom packages/mcp-server | 11.7 |
| `specs/roadmap-feature-evaluation.md` | Prioritized evaluation of 76 unreleased Manifest features for capsule-pro | 11.8 |
| `specs/governance-cli-suite.md` | How to integrate 7 governance CLI commands (scan, audit-governance, audit-bypasses, enforce-surface, integration-check, doctor, audit-routes) into development and CI workflow | 9.16 |
| `specs/runtime-profiler.md` | How to wire @angriff36/manifest/profiler export for per-phase command timing and flamegraph visualization | 7.9 |
| `specs/tenant-isolation-dual-layer.md` | IR-level tenant declaration + RuntimeOption enforcement working together for multi-tenant safety | 7.3 |
| `specs/ai-tooling-adoption.md` | Decision matrix for conformance test generator, IR validator/repair, and NL transpiler | 9.17 |

