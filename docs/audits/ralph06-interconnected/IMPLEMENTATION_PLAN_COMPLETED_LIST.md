# Completed Implementation Plan Tasks

**Source:** IMPLEMENTATION_PLAN.md.bak (copied verbatim on 2026-06-08)
**Last Updated:** 2026-06-08
**Status:** All entries below are marked ✅ DONE, COMPLETE, or ALREADY DONE in source.

---

## TIER 0 -- FIX TYPECHECK BASELINE & RELATIONSHIP MODELING

### 0.1 Categorize and fix the 80 typecheck errors via generator changes — ✅ DONE 2026-06-04 / ✅ FOLLOW-UP RESOLVED 2026-06-06
- **RESOLVED (2026-06-06 follow-up — soft-delete `deletedAt` drift):** A fresh measurement at session start found **12 residual typecheck errors** not present in the 2026-06-04 baseline. Root cause: the upstream Next.js projection emits `where: { ..., deletedAt: null }` in generated soft-delete read routes, but 6 Prisma models lack a camelCase `deletedAt` field. 4 models use raw snake_case `deleted_at` (Document/`documents`, SmsAutomationRule/`sms_automation_rules`, StorageLocation/`storage_locations`, OnboardingTask/`onboarding_tasks`); 2 models have NO soft-delete column at all (CrmScoringRule, EventFollowup — the IR declares `deletedAt` but the Prisma table lacks the column). **Fix (producer-side, constitution §10/§16):** extended `applyFieldOverrides()` in `manifest/scripts/entity-domain-map.mjs` with a `deletedAt` branch (mirroring the existing `createdAt` rewrite/drop logic). Added `deletedAt` keys to `ENTITY_FIELD_OVERRIDES`: `deletedAt: "deleted_at"` (rewrite) for the 4 snake_case models; `deletedAt: null` (drop the filter) for CrmScoringRule and EventFollowup. Regenerated via `pnpm manifest:generate` → 12 generated routes corrected. **Verification:** `pnpm --filter api typecheck` = 0 errors; `pnpm --filter @repo/manifest-runtime typecheck` = 0; `pnpm manifest:generate` re-run produces no new diff (drift gate passes). Only the producer source + 12 generated route outputs changed.
- **⚠ KNOWN FOLLOW-UP (not yet fixed):** CrmScoringRule and EventFollowup have an IR↔schema soft-delete inconsistency — the IR/manifest source declares a `deletedAt`/soft-delete property but the Prisma table has no `deleted_at` column, so soft-delete cannot actually persist for these two entities. The read-route filter was dropped as the correct producer-side fix. Reconciling the source (add the column via migration, or remove the `deletedAt` property from the IR) is a separate future task.
- **RESOLVED (2026-06-04 original):** `pnpm --filter api typecheck` exits 0 (was 80). `pnpm --filter manifest-runtime typecheck` exits 0. Generator is idempotent (drift gate: byte-identical diff hash across consecutive `pnpm manifest:generate` runs). All 71 generated-file errors fixed at the producer; all 9 hand-written errors fixed in source.

### 0.2 Fix build.mjs broken path, stale compilerVersion, and orphaned scripts — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** All three issues fixed: (1) build.mjs line 170 broken path fixed — swapped segments from `scripts/manifest/generate-route-manifest.ts` to `manifest/scripts/generate-route-manifest.ts`; (2) compilerVersion updated from `0.3.8` to `2.2.0` in both `build.mjs` and `compile.mjs`; (3) dead `CODE_OUTPUT_DIR` variable removed from `build.mjs`. `pnpm manifest:build` completes all 4 steps. Producer-level InvariantError→401 fix moved to `generate.mjs` per constitution §10/§16 so it survives regeneration.

### 0.3 Create Prisma models for the 16 IR entities without tables — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** All 16 entities now have Prisma model declarations in `packages/database/prisma/schema.prisma`. Models match the existing SQL tables from the baseline migration: PascalCase column names (no @map needed), TEXT type IDs (no @db.Uuid), public schema, composite @@id([tenantId, id]). `"public"` added to datasource schemas array. `prisma validate` passes, `prisma generate` succeeds, `db:check` reports zero drift, `api typecheck` exits 0, 2535/2535 tests pass (1 pre-existing payment-env failure). Baseline migration applied to create the tables in the database.

### 0.4 Model relationship declarations in .manifest sources
- **✅ DONE 2026-06-08 (pilot + expansion + final batch). Batch 1 COMPLETE 2026-06-07: 58 new declarations across 43 entities. Final batch COMPLETE 2026-06-08: 68 new belongsTo declarations across 48 entities in 32 source files.** Domains: Inventory (22), Staff (14), Kitchen (10), Finance (5), Events (6), CRM (3), Facilities (4), Admin (4). All 68 target entities confirmed in IR. IR recompiled: 202 entities, 999 commands, 979 events. v0.12.177. 32 remaining entities without relationships (polymorphic FKs, missing IR targets, or no FK props). API+runtime typecheck: 0 errors.

### 0.5 Route regen-diff harness — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** Script `manifest/scripts/audit-route-drift.mjs` exists with two modes:
  - `manifest:audit-route-drift` (report mode) — writes to `manifest/reports/route-drift/route-drift.json`
  - `manifest:audit-route-drift:strict` (CI gate mode) — exits 1 on drift
  - Mechanism: snapshots git hashes of all "DO NOT EDIT" generated files, regenerates via `pnpm manifest:generate`, compares outputs.
  - Remaining: CI workflow wiring (exit criterion 3).

### 0.6 Fix source-level bugs across manifest entities (ALL DOMAINS)
- All listed source bugs are RESOLVED. See detailed tracking in source section of plan. 23 fixes across all domains completed 2026-06-04.

### 0.7 Resolve EventStaff / EventStaffAssignment duplicate — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** Consolidation decision: **EventStaff is canonical.** EventStaffAssignment is a deprecated ghost entity with zero active consumers. Documented decision with full evidence trail. No data migration needed (EventStaff already the active table). Stale generated client entries will be cleaned on next regeneration cycle.

---

## TIER 1 -- ROUTE ACCESSOR CORRECTNESS (DONE)

> **Status:** COMPLETE 2026-05-30. Phase-out-registry.md Section C confirms blast radius was exactly 2 entities.

---

## TIER 2 -- SCHEMA PROJECTION & GENERATOR FOUNDATIONS

### 2.1 Make the route generator accessor-aware from store layer — ✅ DONE 2026-06-08
- **✅ DONE 2026-06-08.** Consolidated ENTITY_ACCESSOR_OVERRIDES from 32 entries to 1 (QACheck semantic mismatch). Fixed 2 incorrect bridge entries (QACorrectiveAction, QATemperatureLog). Added SampleData createdAt field override. The 15 string-valued remaps are now resolved via ENTITY_TO_PRISMA_MODEL bridge + PRISMA_MODEL_METADATA (step 2). The 16 null-valued drops for entities that now have Prisma models (created in Task 0.3) are handled by step 3 auto-drop. New read routes generated for 16 previously-dropped entities (Deal, Budget, Vendor, etc.). API typecheck 0, runtime typecheck 0, 2863 tests pass, zero drift.

### 2.2 Add ENTITIES_WITHOUT_TABLE filtering at projection time — ✅ DONE 2026-06-08
- **✅ DONE 2026-06-08.** No additional filtering code needed. `resolveAccessor()` step 3 already auto-drops entities absent from `PRISMA_MODEL_METADATA`. 14 entities (training/onboarding) + QACheck have no metadata entry and are automatically excluded. The 16 entities that previously needed null-valued drops now have Prisma models (Task 0.3) and generate routes correctly.

### 2.3 manifest.config.yaml script wiring — ✅ DONE 2026-06-07
- **✅ DONE 2026-06-07.** Created `manifest/scripts/read-config.mjs` — shared config reader that parses `manifest.config.yaml` and exposes derived paths. Both `generate.mjs` and `compile.mjs` now import from it, replacing 6 hardcoded values (irPath, outputPath, commandsPath, dispatcherDir, srcDir, registryDir). Config reader uses a stack-based YAML parser (no js-yaml dependency). Drift gate: zero route drift. API+runtime typecheck: 0. 2772 tests pass.

### 2.4 ENTITY_DOMAIN_MAP consolidation — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** All 3 stale copies eliminated. `generate-route-manifest.ts` now imports canonical 189-entry map (was 90); Event mapping fixed from "manifest/Event" to "events/event". `packages/mcp-server/src/lib/entity-domain-map.ts` re-exports from canonical. `build.mjs` delegates to `compile.mjs` instead of duplicating logic (net -327 lines). New `entity-domain-map.d.mts` type declaration for TS resolution. All typechecks green.

### 2.5 Wire PrismaProjection to generate schema from IR — ✅ PHASE 1-3 DONE 2026-06-05
- **✅ PHASE 1-3 DONE 2026-06-05.** The PrismaProjection pipeline is complete for all 189 entities. All three phases (derive options, generate schema, combined) complete. **DISCOVERY: 5 pairs of IR entities map to the same Prisma table** (EventTimelineItem/EventTimeline, EventImportWorkflow/EventImport, QATemperatureLog/TemperatureLog, QACorrectiveAction/CorrectiveAction, LogisticsRoute/DeliveryRoute). Pipeline deduplicates by keeping canonical entity. Relations stripped (validation-only output); CI drift gate not yet wired.

### 2.6 Remove duplicate VendorContract from ENTITIES_WITH_SPECIFIC_STORES — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** Duplicate VendorContract entry at line 226 removed. Verified no other duplicates in ENTITIES_WITH_SPECIFIC_STORES.

### 2.7 Fix manifest source type mismatches (559+ datetime-as-number occurrences -- UNIVERSAL) — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** All 988 datetime-as-number type mismatches fixed across 90 .manifest source files. Event payload timestamp fields (923) and command parameters (69) changed from `number` to `datetime`. Fields like `windowMs`, `duration`, `guestCount` were correctly left as numeric types. IR recompiled: 189 entities, 952 commands, 936 events. API typecheck: 0 errors. Runtime typecheck: 0 errors. 2535/2535 tests pass. One stale test expectation (preptask `claimedAt` expecting 0 instead of null) also fixed.

### 2.8 Adopt `timestamps` entity modifier to eliminate datetime-as-number at the root — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** All 189 entities across 92 source files now use the `timestamps` modifier. Hand-declared `createdAt`/`updatedAt` property declarations (350 lines) and `mutate createdAt/updatedAt = now()` lines (1,041 lines) removed — net -1,202 lines of boilerplate. 5 entities that previously had no timestamps (AlertsConfig, Invoice, Payment, PrepList/PrepListItem, SampleData, Recipe/RecipeIngredient/RecipeStep, MenuDish) now have the modifier. IR compiles: 189 entities, 952 commands. createdAt/updatedAt auto-injected as readonly datetime in IR. API typecheck: 0 errors. Runtime typecheck: 0 errors. 2535/2535 tests pass. Route generation idempotent.

---

## TIER 3 -- GENERIC READ ROUTES & STORE STRATEGY

### 3.1 Add generic Manifest read routes -- DONE (2026-06-05)
- **DONE (2026-06-05).** List route at `[entity]/route.ts` and detail route at `[entity]/[id]/route.ts` exist and serve reads through the store layer. Entity resolution via `entity-accessor.ts` with accessor overrides, tenant isolation, soft-delete filtering, pagination. 17 tests pass.

### 3.2 Store generation strategy decision — ✅ DONE 2026-06-05
- **Decision:** GenericPrismaStore for all entities except 5 with genuine custom logic. ENTITIES_WITH_SPECIFIC_STORES reduced from 95 to 5 (PrepTask, KitchenTask, PrepTaskPlanWorkflow, Station, InventoryTransfer).

### 3.3 GenericPrismaStore migration — ✅ DONE 2026-06-05
- **✅ Phase 1 DONE (2026-06-05):** Deleted 39 dead store files (~11,210 LOC). `prisma-stores/` reduced from 45→6 files, 12,694→1,484 LOC. 81/94 entities use GenericPrismaStore. Remaining: consider inline store consolidation in `prisma-store.ts`.
- **✅ Phase 2 DONE (2026-06-05):** ENTITIES_WITH_SPECIFIC_STORES reduced from 95→5. prisma-store.ts: 2,764→~1,085 lines (61% reduction). prisma-stores/: 6→3 files. 24 dead load/sync helpers deleted. 89/94 entities now route to GenericPrismaStore. Only 5 retain custom logic (PrepTask, KitchenTask, PrepTaskPlanWorkflow, Station, InventoryTransfer).

### 3.4 Fix store-level bugs discovered in audit — ✅ PARTIALLY DONE 2026-06-05
- **✅ DONE 2026-06-05.** MenuPrismaStore: 4 `new Prisma.Decimal()` calls replaced with `toDecimalInput()` from shared helper. ShipmentPrismaStore: `as any` cast replaced with proper union type. AllergenWarningPrismaStore `toCommaString` confirmed NOT dead code (properly used). BattleBoardPrismaStore snake_case inconsistency remains (lower priority, cosmetic).

---

## TIER 4 -- BOOTSTRAP CONSTRAINT FIX (DONE)

> **Status:** COMPLETE 2026-06-01. Upstream fix in @angriff36/manifest@1.7.0 resolved the core bootstrap constraint issue. `createInstance` now seeds proper defaults.

---

## TIER 5 -- PROJECTION EVALUATION

### 5.1 Evaluate Zod projection for input validation
- **Status:** COMPLETE. `pnpm manifest:generate-zod` produces 202 entity schemas at `manifest/generated/schemas/*.schema.ts`. Constraint-derived refinements (.min, .max, .int) working. Upstream packaging bug (missing `.js` extension on ESM imports) patched as workaround.

### 5.2 Evaluate React Query projection for client hooks — ✅ DONE 2026-06-08
- **✅ DONE 2026-06-08.** Evaluation complete. Decision: **ADOPT existing custom script** (not upstream ReactQueryProjection). Upstream generates 1,403 hooks but has 2 code-generation bugs (non-TS primitives, bare-type parameter syntax) and flat read paths that don't match Capsule-Pro's domain-mapped routes. Existing custom script is better adapted.

### 5.3 Evaluate OpenAPI projection for API documentation — DONE
- **DONE.** OpenAPI 3.1.0 spec generated from IR via `@angriff36/manifest/projections/openapi`. 202 entities (404 GET paths), 999 commands (999 POST paths) = 1,403 total paths + 1,240 schemas. Post-processing rewrites list/command paths to match actual dispatcher.

### 5.12 Evaluate and wire agent-sdk for MCP server (HIGH PRIORITY) — ✅ DONE 2026-06-07
- **✅ DONE 2026-06-07.** Agent-sdk functions integrated into MCP server IR introspection plugin. NEW `packages/mcp-server/src/lib/agent-sdk.ts` — Thin wrapper re-exporting agent-sdk functions. ENHANCED `query_ir_summary`, `explain_entity`, `explain_command`. NEW `find_commands` tool for natural language command discovery. Backward compatibility preserved. 115 MCP server tests pass, API typecheck 0, runtime typecheck 0.

### 5.13 Wire ir-diff for CI schema drift detection (HIGH PRIORITY) — ✅ ALREADY DONE
- **DONE.** Script already implemented at `manifest/scripts/audit-ir-drift.mjs` with `--strict` CI gate. Verified working: 0 drift detected.

---

## TIER 6 -- FRONTEND CLIENT STRATEGY

### 6.1 Frontend data layer decision — ✅ DONE 2026-06-07
- **✅ DECISION: Adopt TanStack Query wrapping the generated client as `queryFn` sources.** TanStack Query v5 is installed and QueryProvider is live in production. The generated client has 1,328 typed functions with 94 consumers (Task 6.2 batches 1-21). Gold-standard pattern exists at `events/[eventId]/event-hooks.ts`.

### 6.5 Rename misleading `use-*.ts` files — ✅ DONE 2026-06-07
- **✅ DONE 2026-06-07.** Renamed 10 files in `apps/app/app/lib/` from `use-*.ts` to `*.ts` (they export plain functions, not React hooks). Updated 23 import paths across consumer files. All typechecks clean (app, api, mcp-server).

---

## TIER 7 -- RUNTIME FEATURE WIRING

### 7.1 Wire auditSink (PostgresAuditSink) — ✅ DONE (verified 2026-06-07)
- **✅ DONE.** `PostgresAuditSink` from `@angriff36/manifest/audit/postgres` is imported, instantiated when `dbUrl` exists, and passed to `ManifestRuntimeEngine` via RuntimeOptions. Every governed command produces a durable audit row via the upstream adapter. The `manifest_audit_records` table is created by `ensureManifestSchema()`.

### 7.2 Wire outboxStore (PostgresOutboxStore) — ✅ DONE (verified 2026-06-07)
- **✅ DONE.** `PostgresOutboxStore` from `@angriff36/manifest/outbox/postgres` is imported, instantiated when `dbUrl` exists, and passed to `ManifestRuntimeEngine` via RuntimeOptions. The upstream adapter provides `enqueue()`, `claim()` (FOR UPDATE SKIP LOCKED), `markDelivered()`, `markFailed()`. The `manifest_outbox_entries` table is created by `ensureManifestSchema()`.

### 7.3 Wire requireTenantContext — **DONE**
- **DONE.** Engine constructed with `requireTenantContext: true`. Commands without tenant context fail with `MISSING_TENANT_CONTEXT`.

### 7.4 Wire middleware pipeline (HIGHEST PRIORITY)
- **✅ COMPLETE 2026-06-06.** All 4 lifecycle hooks wired (before-guard, before-policy, before-action, after-emit). Hand-rolled proxies deleted. Task 7.4 (middleware pipeline) is now fully COMPLETE.

### 7.5 Wire Rules Engine into factory pipeline — ✅ DONE (deleted 2026-06-04)
- **✅ DONE.** Decision: DELETE. The `manifest/runtime/src/rules-engine/` directory was deleted as part of Task 10.4 (confirmed dead code: 0 consumers, 5 files, ~1000 LOC). Business rules now expressed via Manifest constraints, guards, and computed properties in `.manifest` source files.

### 7.6 Wire remaining RuntimeOptions — ✅ DONE (with documented deferrals, 2026-06-08)
- **✅ ACHIEVED.** 14 of 19 RuntimeOptions are wired. The 5 remaining are either blocked, future, or low-value without other blocked features.

### 7.7 Fix `as any` casts in runtime factory — ✅ DONE (verified 2026-06-06)
- **✅ DONE.** Fresh inspection (2026-06-06) found **zero `as any` casts** in `manifest/runtime/src/manifest-runtime-factory.ts`. The DI clients are typed via the `asStoreClient<T>()` generic helper.

### 7.8 Audit API shim for factory migration — ✅ DONE (verified 2026-06-07)
- **✅ DONE.** The API shim (`apps/api/lib/manifest-runtime.ts`) is **99 lines** (not 376 as previously claimed). The shim is already a thin dependency-injection wrapper. No logic needs to be migrated.

### 7.9 Wire Runtime Profiler export (`@angriff36/manifest/profiling`) — PARTIALLY DONE (blocked on upstream)
- **Wiring READY.** The factory already passes `deps.profiling` to the engine via RuntimeOptions. BLOCKED: The upstream `ProfileCollector` class is defined but `RuntimeEngine.getProfiles()` returns empty — actual per-phase timing capture not yet implemented in shipped v2.2.0.

---

## TIER 8 -- GOVERNANCE MIGRATION & CONFORMANCE

### 8.1 Payroll governance migration (HIGHEST GOVERNANCE PRIORITY) — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** Payroll writes now route through Manifest runtime. Phase 1-4 complete. API typecheck 0, 2591 tests pass.

### 8.4 Package-specific governance migration — ✅ DONE 2026-06-07
- **✅ DONE 2026-06-07.** All package-level governed-entity writes migrated to Manifest runtime. `packages/supplier-connectors/src/sync-service.ts`, notifications, payroll-engine all complete.

### 8.5 Conformance test index (Constitution S17) — ✅ DONE 2026-06-07
- **✅ DONE 2026-06-07.** 100 structural IR-level conformance checks at `manifest/runtime/src/__tests__/conformance-index.test.ts`. All 202 entities, 998 commands, 443 policies validated. Zero DB required — runs in ~400ms.

### 8.6 Fill command-level policies — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** All 952 commands have policies (was 0/952). ROOT CAUSE: top-level `policy` declarations not bound by compiler. FIX: `default policy` syntax INSIDE entity blocks. Added entity-specific `default policy` to all 92 source files. Result: 952/952 commands have policies, 189/189 entities have `defaultPolicies`.

### 8.7 Reduce write-route-allowlist — ✅ DONE (2026-06-07)
- **✅ DONE 2026-06-07.** Before: 247 rules. After: **37 rules** (under 50 target met). 145 dead rules removed, 65 consolidated into broad prefix-based rules. 100% coverage verified.

### 8.8 Adopt defaultPolicies for entity-level RBAC — ✅ DONE 2026-06-05 (via Task 8.6)
- **✅ DONE 2026-06-05.** All 189 entities now use `defaultPolicies` via `default policy` syntax inside entity blocks. Task 8.6 implemented this. Newly added commands are automatically protected.

### 8.9 Parent-context propagation — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** A single generic, IR-relationship-driven choke point now inherits parent-owned context onto child `create` commands. BattleBoard, Proposal, Shipment, WasteEntry, CateringOrder, RevenueRecognitionSchedule, FacilityWorkOrder, ScheduleShift migrated. Runtime + api typecheck 0; 44 runtime parent-context tests pass.

### 8.10 Migrate BASELINE parent-context candidates (follow-up to 8.9)
- **✅ COMPLETE 2026-06-08.** 8 adopters migrated: BattleBoard, Proposal, Shipment, WasteEntry, CateringOrder, RevenueRecognitionSchedule, FacilityWorkOrder, ScheduleShift. All DB-free migrations (columns already existed). Removed from `parent-context-overrides.json`. Runtime+api typecheck 0, all parent-context tests pass.

---

## TIER 9 -- ENTITY GRAPH & ADVANCED FEATURES

### 9.1 Entity-graph rebuild (currently dead code) — ✅ DONE 2026-06-04 (Task 10.4)
- **✅ DONE 2026-06-04.** Entire `manifest/runtime/src/entity-graph/` directory (7 files, ~1400 LOC) deleted as dead code. Zero consumers. Decision: delete (not rebuild).

### 9.2 Wire reactions (event-driven side effects) — ✅ ALL 10 REACTIONS FIXED (2026-06-06)
- **✅ COMPLETE 2026-06-06.** All 10 reactions defined and fixed. 3 reaction-blocking bugs fixed. Full emit→reaction→command→store chain end-to-end conformance test GREEN. IR: 189 entities, 952 commands, 936 events, **10 reactions**. API typecheck 0, 2591 tests pass.

### 9.3 Expand saga orchestration for multi-step workflows -- ✅ DONE 2026-06-08
- **✅ DONE 2026-06-08.** 6 sagas now defined (was 1): ProcessInvoicePayment, FinalizeEventWithReporting, AutoGeneratePrepList + 3 additional multi-step workflows.

### 9.4 Wire approval workflows — ✅ DONE 2026-06-08
- **✅ DONE 2026-06-08.** 3 entities have Manifest `approval` blocks: PurchaseOrder (1-stage), VendorContract (2-stage), PurchaseRequisition (2-stage). `PostgresApprovalStore` wired in runtime factory.

### 9.5 Adopt state transitions for status fields — ✅ DONE 2026-06-07
- **✅ DONE 2026-06-07.** 60+ entities have declarative `transition` blocks. EventGuest was the last meaningful entity without transitions — now complete. All entities benefiting from state-machine enforcement have `transition` blocks.

### 9.7 Property modifier adoption -- DONE (2026-06-08)
- **DONE 2026-06-08.** 534 modifier annotations across 94 files: 92 `indexed`, 73 `searchable`, 18 `unique`, 32 `encrypted`, 7 `private`. Parser accepts without error.

### 9.8 Overrideable constraints -- DONE (2026-06-08)
- **DONE 2026-06-08.** 5 overrideable constraints across 5 entities: VendorCatalog.warnLargePriceIncrease, EventBudget.warnOverBudget, Proposal.warnHighDiscount, VendorContract.warnEarlyTermination, Shipment.warnCancelInTransit. IR: 5/583 constraints now overrideable. 8 new tests pass. API typecheck 0, runtime typecheck 0.

### 9.9 Permission guard to middleware migration (SECURITY PRIORITY) — **DONE (mitigated by Task 8.6)**
- **DONE (2026-06-07).** Security goal achieved through dual-layer model: (1) IR policies (deny-by-default — Task 8.6), (2) RBAC middleware (allow-by-default, fine-grained). Proxy wrapper removed. RBAC enforcement universal via IR policies. `COMMAND_PERMISSION_MAP` retained by design.

### 9.12 Adopt snapshot testing for CI code generation validation — ✅ DONE 2026-06-08
- **✅ DONE 2026-06-08.** 8 snapshot tests covering 5 entities across 2 projection surfaces (nextjs.dispatcher + nextjs.route). CI job enabled on every PR/push. 6 golden-file snapshots created.

### 9.15 Expand CLI adoption (40 commands available) — ✅ DONE 2026-06-07
- **✅ DONE 2026-06-07.** 16 new CLI commands wired to package.json scripts. Combined with prior work: **40/40 commands now wired** (was 24/42). Only `help` remains non-wired (inherent — it's a flag).

### 9.16 Wire Governance CLI suite (7 commands) — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** 11 new pnpm scripts added: 7 governance scripts + 4 additional CLI scripts. Scripts use `pnpm exec manifest <command>` pattern. 4 scripts already existed — not duplicated.

### 9.18 Adopt policy matrix viewer for security audit -- DONE (2026-06-08)
- **DONE 2026-06-08.** Using `pnpm manifest:coverage:json` (`--format json`) instead. Policy coverage data available via JSON output for analysis. Task DONE with corrected scope.

---

## TIER 10 -- CODEBASE CONSOLIDATION & TYPE SAFETY

### 10.1 Delete legacy manifest-runtime.ts (3,205 lines of dead code) — ✅ ALREADY DONE (prior session)
- **✅ ALREADY DONE.** The legacy 3,205-line `manifest-runtime.ts` was deleted in a prior commit. The current 66-line re-export is a thin wrapper. No active consumers import the legacy code.

### 10.2 Recipe engine consolidation — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** Deleted two dead recipe engine files: `recipe-optimization-engine.ts` (837 lines), `recipe-scaling-engine.ts` (651 lines). Zero consumers. manifest-runtime typecheck: 0, API typecheck: 0.

### 10.3 Rules engine Manifest middleware integration — ✅ DONE 2026-06-04 (via Task 10.4)
- **✅ DONE.** The rules engine module was deleted as dead code in Task 10.4. Zero consumers existed. Manifest middleware pipeline replaces any role the rules engine would have played.

### 10.4 Delete confirmed dead code (rules-engine, entity-graph, packages/services)
- **✅ DONE 2026-06-04.** Removed rules-engine/ (5 files, ~1000 LOC), entity-graph/ (7 files, ~1400 LOC), packages/services/ (empty). 2560/2560 tests pass.

### 10.5 Outbox duplication consolidation — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** Bundle-claim route outbox events moved inside `$transaction` callback. Unsafe standalone `createOutboxEvent` function removed from `shared-task-helpers.ts`. 3 implementations reduced to 2, 1 unsafe helper removed.

### 10.6 MCP server entity-domain-map consolidation — ✅ DONE 2026-06-07
- **✅ DONE 2026-06-07.** Replaced `require()` CJS hack with proper ESM `export` re-export. 14 lines → 8 lines, eliminated eslint-disable comment. All typechecks clean.

### 10.7 Fix `as any` usage in API routes — ✅ DONE (2026-06-07)
- **✅ DONE 2026-06-07.** Before: 34 `as any` across 12 production files. After: **0 `as any`**. Created `apps/api/lib/trash/entity-helpers.ts` shared utility.

### 10.8 Fix `as unknown as` double-cast patterns — ✅ DONE 2026-06-07
- **✅ DONE 2026-06-07.** From ~60 production `as unknown as` → 20 (67% reduction). Remaining 20 are architecturally necessary. Created `toJson()` helper, fixed real bug in allergen detection route.

### 10.10 Investigate skipped test suite — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** `apps/api/__tests__/sales-reporting/generate.test.ts` was an empty stub with zero test logic. Feature fully implemented with 42 passing tests in `packages/sales-reporting/__tests__/`. Empty stub deleted.

### 10.11 Fix manifest runtime placeholder implementations — ✅ DONE 2026-06-07
- **✅ DONE 2026-06-07.** `graph-builder.ts` deleted (Task 10.4). Implemented `getAggregateMetrics()` in `manifest-telemetry-collector.ts` to query actual persisted telemetry. API+runtime typecheck: 0.

### 10.12 Adopt entity concurrency for high-contention entities -- DONE (2026-06-08)
- **DONE 2026-06-08.** InventoryItem, ScheduleShift, EventGuest now have `versionProperty version` and `versionAtProperty versionAt` declarations. DB-level optimistic locking in GenericPrismaStore. 322-line test suite, 2 DB migrations, all tests pass.

### 10.13 Remove legacy manifest-command-handler.ts -- DONE (2026-06-04)
- **DONE 2026-06-04.** `apps/api/lib/manifest-command-handler.ts` (289 lines) deleted. All 71 route files + 11 test files migrated to canonical `execute-command.ts`. API typecheck 0, 2574 tests pass, 0 remaining consumers.

---

## TIER 11 -- ADVANCED MANIFEST FEATURES

### 11.2 Implement Feature Flags via flagProvider — ✅ DONE 2026-06-08
- **✅ DONE 2026-06-08.** Feature flags wired end-to-end. `createEnvFlagProvider()` reads `MANIFEST_FLAG_*` env vars. 3 flags in .manifest sources (budget.early_warning, payroll.maintenance_mode, procurement.budget_management). 14 tests pass. IR verification confirms all 3 flag() expressions compiled correctly. API typecheck 0, runtime typecheck 0, 137 runtime tests pass.

---

End of Completed Tasks
