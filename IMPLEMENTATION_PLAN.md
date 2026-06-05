# IMPLEMENTATION_PLAN.md -- Capsule-Pro Manifest Full Adoption

> **Purpose:** Prioritized, outcome-oriented task list for making Manifest the sole source-of-truth generator across Capsule-Pro. Each task is ready for a BUILDING loop to pick up and execute.
>
> **Ultimate Goal:** Fully utilize Manifest features that are currently useful but not implemented, AND use Manifest as the sole source of truth generator for as many surfaces as possible.
>
> **Prioritization:** Fix typecheck baseline -> fix permission guard (SECURITY) -> resolve Prisma model gaps -> adopt `timestamps` modifier (ROOT FIX for datetime-as-number) -> fix remaining source type mismatches -> model relationships -> wire middleware (highest-leverage runtime) -> schema projection -> store strategy -> runtime wiring -> governance -> frontend strategy -> reactions -> projection evaluation -> advanced features -> federation evaluation.
>
> **Companion docs:** task_plan.md, notes.md, phase-out-registry.md, AGENTS.md, constitution.md
> **Official Manifest docs:** https://manifest-b1e8623f.mintlify.app/ (docs/manifest-official/ does NOT exist locally; schemas are in `node_modules/@angriff36/manifest/docs/spec/`)

---

## Validation Baseline (2026-06-05, comprehensive audit -- 18th revision)

### Claim Verification Matrix

| # | Claim | Status | Detail |
|---|---|---|---|
| 1 | 189 entities, ALL durable | **CONFIRMED** | `stores[]` in IR: 189 entries, all `target: "durable"`, 0 memory |
| 2 | **80** typecheck errors, **71** in generated files | **CORRECTED** (13th rev) | Fresh `pnpm --filter api typecheck` count: 80. Breakdown: TS2339 (32 from 19 entities: 16 no model + 3 renamed model), TS2551 (28 from 14 entities: 12 need accessor overrides + 4 handwritten shipment), TS2353 (9: 7 created_at + 2 absent), TS2561 (6 wrong-where-field), TS2322 (4 kitchen tags contains→has), TS2345 (1 payroll constraint). **71 in generated files** (62 files) + **9 in handwritten files** (6 files: 4 shipment signatureData→signature, 2 kitchen tags contains→has, 1 payroll Json→string, 2 additional). 3 systematic generator bugs cause 71/80 (89%). Full fix list in Task 0.1. |
| 3 | ~~32~~ **1** IR entity without Prisma model (QACheck) | **CORRECTED** | **188 of 189 IR entities match a Prisma model** (was 173). QACheck is the only unmatched entity (different concept from QualityCheck — inspection task vs QC session). Prior 16 entities without models now have Prisma model declarations (Task 0.3). Additionally **15 entities have models but wrong accessor names** (handled by ENTITY_ACCESSOR_OVERRIDES in Task 0.1). |
| 4 | ~~Only 8~~ **60+ entities have relationships** | **UPDATED** | ~104 relationship declarations across 60+ entities (was 12 across 8). Event pilot (27), kitchen (30), inventory (~25), staff/logistics/CRM/finance/collections/facilities/command-board (37). Some lower-priority entities with FKs to non-IR targets remain without relationships. |
| 5 | ~~371~~ **301** direct-write violations | **CONFIRMED** | 191 API mutation calls across 80 files + 110 server action writes across 28 files = 301 total. 12 hybrid files. |
| 6 | **5 of 19 RuntimeOptions wired (7 of 19 wired or passthrough)** | **UPDATED** | Factory wires 5 constructor-level: `storeProvider`, `idempotencyStore` (conditional), `customBuiltins`, `auditSink` (conditional), `outboxStore` (conditional). 2 passthrough: `deterministicMode`, `evaluationLimits` (defined in context but NOT forwarded by primary factory). |
| 7 | ~~90~~ **70~~81** entities use GenericPrismaStore | **UPDATED** | 81 of 94 switch-case entities now route to GenericPrismaStore (was 70 boilerplate). Only **13 with custom logic** remain (was 23). |
| 8 | 0 reactions defined | **RESOLVED** (Task 9.2/9.2b) | **7 reactions** now defined (finance: 3, inventory: 1, events: 1, equipment: 2). Target: 5+ ✅ MET. |
| 9 | 1 saga (ProcessInvoicePayment) | **CONFIRMED** | `sagas: [{"name": "ProcessInvoicePayment", "steps": [...]}]` |
| 10 | **1,330** generated client functions, **0** consumers | **CONFIRMED** | `manifest-client.generated.ts` has 1,330 exported async functions. Prior audit incorrectly reported 2-3 consumers. Codebase-wide grep confirms zero files import from it. |
| 11 | prisma-store.ts: 3,061 lines, **94** switch cases | **CONFIRMED** (11th rev: was 93, re-counted as 94) | Verified line count and switch-case count |
| 12 | Custom outbox duplicates upstream | **CONFIRMED** | Factory has `createPrismaOutboxWriter` (~60 lines) in telemetry hooks; upstream ships `OutboxStore` contract with `outbox/postgres` adapter |

### NEW findings from this revision (5th)

| Finding | Impact | Source |
|---|---|---|
| **ENTITIES_WITH_SPECIFIC_STORES: 95 unique entries** | ✅ DONE — duplicate VendorContract removed (was at lines 199 and 226). | `manifest/runtime/src/manifest-runtime-factory.ts` |
| **1 of 15 advanced RuntimeOptions features used in production (middleware WIRED)** | ~~middleware~~ (WIRED — identity at before-policy, RBAC at before-guard, audit/outbox at after-emit), auditSink, outboxStore, approvalStore, requireTenantContext, flagProvider, jobQueue, profiling, generateId, deterministicMode, evaluationLimits, requireValidProvenance, expectedIRHash, wasmEvaluator, encryptionProvider -- 1 of 15 wired in the primary factory | `manifest/runtime/src/manifest-runtime-factory.ts` |
| **2 features partially wired but not forwarded** | `deterministicMode` and `evaluationLimits` are defined in `KitchenOpsContext` and passed by 7 `create*Runtime` functions, but the primary factory does NOT forward them | `manifest/runtime/src/index.ts:260-269`, `manifest/runtime/src/manifest-runtime-factory.ts:503-506` |
| **Event.create eventDate type mismatch**: `datetime` property but `number` param | RESOLVED 2026-06-04 — Fixed: `eventDate: number` → `datetime` in create (L68), update (L88), updateDate (L174); guards `>0` → `!=null`. | `manifest/source/event-rules.manifest` |
| **Event.create tags type mismatch**: `array<string>` property but `string` param | RESOLVED 2026-06-04 — Fixed: `tags: string` → `array<string>` in create (L68) and update (L88). | `manifest/source/event-rules.manifest` |
| **Event has 10 dead properties**: budget, ticketPrice, ticketTier, eventFormat, accessibilityOptions, featuredMediaUrl, venueEntityId, assignedTo, locationId, venueId (partially) | Declared but never mutated by any command. Either add commands or remove declarations. | `manifest/source/event-rules.manifest` |
| **EventProfitability missing belongsTo Event** | `eventId` is a foreign-key property with no relationship block. Blocks relationship traversal. | `manifest/source/event-rules.manifest` |
| **EventSummary missing belongsTo Event** | Same -- `eventId` without relationship. Array-as-string anti-pattern for JSON fields. | `manifest/source/event-rules.manifest` |
| **BudgetLineItem missing belongsTo EventBudget** | `budgetId` has no `relationship belongsTo budget: EventBudget`. | `manifest/source/event-budget-rules.manifest` |
| **EventBudget.variancePercentage never computed** | RESOLVED 2026-06-04 — Fixed: converted from stale property (always 0) to computed using `percent(self.varianceAmount, self.totalBudgetAmount)` builtin. 3 previously ineffective constraints now active. | `manifest/source/event-budget-rules.manifest` |
| **EventBudget.update missing variancePercentage recomputation** | RESOLVED 2026-06-04 — Resolved by variancePercentage becoming computed (no separate mutation needed). | `manifest/source/event-budget-rules.manifest` |
| **EventGuest.rsvpDecline overwrites notes** | RESOLVED 2026-06-04 — Fixed: Added `declineReason` property; mutation changed from `notes = reason` to `declineReason = reason`. | `manifest/source/event-guest-rules.manifest` |
| **EventContract.cancel silently drops canceledBy** | RESOLVED 2026-06-04 — Fixed: Added missing `canceledBy: string` property; cancel command now persists it. | `manifest/source/event-contract-rules.manifest` |
| **EventContract expiresAt: number into datetime** | RESOLVED 2026-06-04 — Fixed: `expiresAt: number` → `datetime` in create (L43) and update (L62). | `manifest/source/event-contract-rules.manifest` |
| **EventDish quantity: number into int** | RESOLVED 2026-06-04 — Fixed: `quantity: number` → `int` and `sortOrder: number` → `int` in create, updateQuantity, updateCourse + event payloads. | `manifest/source/event-dish-rules.manifest` |
| **BudgetLineItem.update bare number arithmetic into money** | **RESOLVED 2026-06-05** — Fixed: budget-rules.manifest (5 params number→money) + labor-budget-rules.manifest (4 params + 1 computed number→money). | `manifest/source/event-budget-rules.manifest` |
| **Event properties: 10 never mutated by any command** | Dead declarations add confusion and false surface area for tooling. | `manifest/source/event-rules.manifest` |
| **EventStaff / EventStaffAssignment duplicate IR entities** | Both exist with overlapping purpose (eventId + staffMemberId + role + shift + status). Both have separate Prisma models. Must consolidate or explicitly differentiate. | IR + `schema.prisma` |
| **Rules engine middleware factory exported but never called** | `createRulesEngineMiddleware()` at `manifest/runtime/src/rules-engine/runtime-integration.ts` is never imported outside its module. Complete, tested rules engine sitting unused. | `manifest/runtime/src/rules-engine/runtime-integration.ts` |
| **Entity graph module returns empty graph** | `buildGraphFromIR()` needs IR-derived relationships (Tier 0.3) to populate. Hardcoded `KNOWN_RELATIONSHIPS` array (~50 entries) should be replaced. | `manifest/runtime/src/entity-graph/graph-builder.ts` |
| **3 projections active, 3 blocked, 2 zero-footprint** | nextjs + routes + prisma(pilot) are active. zod/react-query/openapi blocked in phase-out-registry. drizzle/mermaid have zero references anywhere. | Codebase-wide grep |
| **Permission guard is whitelist-based, not deny-by-default** | `COMMAND_PERMISSION_MAP` covers ~30 entity.command pairs. Commands NOT in the map pass through unrestricted. Newly added entities are open until explicitly mapped. | `manifest/runtime/src/permission-guard.ts` |
| **RESOLVED: Proxy-based permission guard replaced with Manifest middleware (Task 7.4a)** | `createRbacMiddleware()` at `before-guard` hook replaces `createPermissionGuard` Proxy. Factory returns raw `ManifestRuntimeEngine` instead of Proxy-wrapped engine. `COMMAND_PERMISSION_MAP` and `AI_APPROVAL_COMMANDS` logic preserved identically. Middleware composable with future identity/audit middleware. | `manifest/runtime/src/middleware/rbac-middleware.ts`, `manifest/runtime/src/manifest-runtime-factory.ts` |
| **API shim is 376 lines, not a thin wrapper** | Contains additional runtime construction logic. Should be audited for logic that belongs in the factory. | `apps/api/lib/manifest-runtime.ts` |
| **Legacy manifest-runtime.ts (3,205 lines) is dead code** | Superseded by factory but still present. 60+ `as any` casts, 50+ command wrappers, deprecated PostgresStore, 240-line event switch. | `manifest/runtime/src/manifest-runtime.ts` |
| **No data caching layer in frontend** | TanStack Query IS installed but only 5 files use it. 162 other apiFetch files get zero caching. Every component mount triggers a fresh API call. | `apps/app/app/lib/api.ts` |
| **Supplier-connectors package does direct Prisma writes** | `sync-service.ts` performs `.create()/.update()/.updateMany()` on `vendorCatalog` bypassing Manifest. | `packages/supplier-connectors/src/sync-service.ts` |
| **Sentry-integration package does direct Prisma writes** | `prisma-store.ts` performs `.create()` and `.update()` on `sentryFixJob`. | `packages/sentry-integration/src/prisma-store.ts` |
| **Payroll engine 100% bypass** | 4 direct Prisma writes in `PrismaPayrollDataSource.ts`, 2 entities with zero Manifest registration. Non-transactional writes. | `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts` |
| **Manifest spec: defaultPolicies (vNext) available** | Entities MAY define `defaultPolicies` applied to all bound commands. Compiler expands them. Currently zero entities use this. | `node_modules/@angriff36/manifest/docs/spec/semantics.md` |
| **Manifest spec: command-level constraints (vNext) available** | Commands may define constraints for pre-execution validation (after policies, before guards). Currently unused. | `node_modules/@angriff36/manifest/docs/spec/semantics.md` |
| **Manifest spec: constraint severity/codes (vNext) available** | Constraints can have `ok`/`warn`/`block` severity and stable `code` identifiers for overrides/auditing. Currently only default `block` is used. | `node_modules/@angriff36/manifest/docs/spec/semantics.md` |
| **Manifest spec: overrideable constraints (vNext) available** | Constraints may be marked `overrideable: true` with policy-gated bypass and justification tracking. All 735 overrideable flags are currently `false`. | `node_modules/@angriff36/manifest/docs/spec/semantics.md` |
| **Manifest spec: entity concurrency (vNext) available** | Optimistic concurrency via `versionProperty`/`versionAtProperty` with `ConcurrencyConflict` result. Currently unused. | `node_modules/@angriff36/manifest/docs/spec/semantics.md` |
| **Manifest spec: state transitions (vNext) available** | Entities may define `transitions` for state machine enforcement. Currently status changes are guarded but not declared as transitions. | `node_modules/@angriff36/manifest/docs/spec/semantics.md` |
| **generate.mjs has 6 hardcoded values** | `defaultIr`, `defaultOutput`, `commandsManifestPath`, `dispatcherDirInfo`, projection name, surface names -- all hardcoded. Should come from `manifest.config.yaml`. | `manifest/scripts/generate.mjs` |
| **compile.mjs uses programmatic API workaround** | Uses programmatic API instead of CLI due to a `--glob` bug. | `manifest/scripts/compile.mjs` |

### NEW findings from this revision (6th)

| Finding | Impact | Source |
|---|---|---|
| **CRITICAL: CateringOrder transition property mismatch** | **RESOLVED 2026-06-04** — `transition status` references wrong property name (`status` vs `orderStatus`). ALL state machine enforcement silently broken. | `manifest/source/catering-order-rules.manifest:54-57` |
| **CRITICAL: VendorContract blockModifyActive prevents ALL mutations** | **RESOLVED 2026-06-04** — Entity-level block constraint fires on every command that mutates `status` while active (e.g. terminate, activate), including legitimate lifecycle commands. (Note: does NOT block all mutations — only status-mutating commands while active.) | `manifest/source/vendor-contract-rules.manifest:57-62` |
| **CRITICAL: RecipeVersion totalTimeMinutes hardcoded to 0** | **RESOLVED 2026-06-04** — Instead of `self.prepTimeMinutes + self.cookTimeMinutes + self.restTimeMinutes`. Prep time reporting broken. | `manifest/source/recipe-rules.manifest:105` |
| **CRITICAL: Ingredient recordLot drops expiresAt** | **RESOLVED 2026-06-04** — Param accepted but never assigned to `currentLotExpiresAt`. Lot expiry tracking non-functional. | `manifest/source/ingredient-rules.manifest:135-152` |
| **CRITICAL: VendorContract lastComplianceReview typed decimal but mutated to now()** | RESOLVED 2026-06-04 — Fixed: `lastComplianceReview: decimal = 0` → `datetime` in vendor-contract-rules.manifest:37. | `manifest/source/vendor-contract-rules.manifest:37` |
| **CRITICAL: ProcurementBudget periodStart/periodEnd type mismatch** | RESOLVED 2026-06-04 — Fixed: `periodStart: decimal, periodEnd: decimal` → `datetime` in inventory-extended-rules.manifest:666; guard `periodStart > 0` → `periodStart != null`. | `manifest/source/inventory-extended-rules.manifest:666` |
| **HIGH: Client tags string-into-array mismatch** | RESOLVED 2026-06-04 — Fixed: `tags: string` → `tags: array<string>` in client-rules.manifest create (L55) and update (L90). | `manifest/source/client-rules.manifest:25,80` |
| **HIGH: PayrollLineItem has ZERO commands** | Declared `store ... in durable` but no command to create through governance. All writes bypass runtime. | `manifest/source/payroll-rules.manifest:270-292` |
| **HIGH: PayrollRun reject overwrites approvedBy** | `reject` command mutates `approvedBy = rejectedBy`, losing original approver. | `manifest/source/payroll-rules.manifest:250-255` |
| **HIGH: VendorContract startDate/endDate number into datetime** | RESOLVED 2026-06-04 — Fixed: `startDate: number, endDate: number` → `datetime` in create (L65), update (L96), renew (L176); guard `startDate > 0` → `startDate != null`. | `manifest/source/vendor-contract-rules.manifest:64,73` |
| **HIGH: CateringOrder deliveryDate number into datetime** | RESOLVED 2026-06-04 — Fixed: `deliveryDate: number` → `datetime` in create (L94) and scheduleDelivery (L182). | `manifest/source/catering-order-rules.manifest:96` |
| **HIGH: PayrollLineItem hours/rate typed as money** | **RESOLVED 2026-06-04** — Hours/rate fields already typed as decimal (not money). Pre-audit finding was stale. | `manifest/source/payroll-rules.manifest:279-283` |
| **MEDIUM: RecipeVersion tagCount hardcoded to 0** | Never counts actual tags. | `manifest/source/recipe-rules.manifest` |
| **MEDIUM: Recipe hasVersion always returns true** | Never checks actual versions. | `manifest/source/recipe-rules.manifest` |
| **MEDIUM: InventoryItem totalValue typed number** | Should be money (int * money). | IR analysis |
| **MEDIUM: Dish margin/marginPercent bare number arithmetic** | Uses bare number on money fields. | IR analysis |
| **User and ShipmentItem in ENTITIES_WITH_SPECIFIC_STORES but have no switch case** | Fall back to GenericPrismaStore which lacks EmploymentType default (User) and proper item handling (ShipmentItem). Latent bugs. | `manifest/runtime/src/prisma-store.ts` |
| **MenuPrismaStore uses raw `new Prisma.Decimal()` instead of `toDecimalInput()`** | Inconsistent with all other stores. | `manifest/runtime/src/prisma-stores/` |
| **build.mjs line 170 has BROKEN PATH** | References `scripts/manifest/generate-route-manifest.ts` which doesn't exist (should be `manifest/scripts/generate-route-manifest.ts`). `pnpm manifest:build` Step 3 will fail. | `manifest/scripts/build.mjs:170` |
| **compilerVersion "0.3.8" is stale** | Installed package is 2.2.0. Stale version in build config. | `manifest/scripts/build.mjs` |
| **manifest.config.yaml is ENTIRELY DECORATIVE** | 148 lines of config but no scripts read it despite 6 hardcoded values in generate.mjs. | `manifest.config.yaml`, `manifest/scripts/generate.mjs` |
| **ENTITY_DOMAIN_MAP: ✅ DONE — all stale copies eliminated** | Canonical `entity-domain-map.mjs` covers ALL 189 entities. `generate-route-manifest.ts` now imports canonical (was 90 entries). `mcp-server/entity-domain-map.ts` re-exports canonical. `build.mjs` delegates to `compile.mjs`. | `manifest/scripts/entity-domain-map.mjs`, `manifest/scripts/generate-route-manifest.ts`, `packages/mcp-server/src/lib/entity-domain-map.ts`, `manifest/scripts/build.mjs` |
| **generate-route-manifest.ts Event mapping fixed** | ✅ DONE — Event now resolves to "events/event" (canonical). | `manifest/scripts/generate-route-manifest.ts` |
| **6 scripts have no package.json entry** | Orphaned scripts not reachable via standard workflow. | `package.json` |
| **notifications package has 9+ direct DB writes** | Across 4 files (emailLog, sms_logs, notification_preferences, emailWorkflow). NOT listed in prior governance audit. | `packages/notifications/` |
| **realtime package outbox duplicates manifest/runtime outbox** | Duplicate outbox implementation. | `packages/realtime/` |
| **packages/services/ is EMPTY** | Should be removed from monorepo. | `packages/services/` |
| **152 entities have FK properties but no relationships** | Far larger than prior "21 event-domain" estimate. Top gap entities: CycleCountRecord (5 FKs), InventoryTransaction (5 FKs), PrepListItem (5 FKs), WasteEntry (5 FKs). | IR analysis |
| **96 entities with transitions (256 total rules). 4 entities with free-form status intentionally skipped.** | | IR analysis |
| **563/611 computed properties have empty dependencies** | 92.1% may not recalculate correctly when upstream values change. | IR analysis |
| **0 overrideable constraints out of 583 total** | No constraint is marked overrideable despite the feature being available. | IR analysis |
| **irHash and contentHash are EMPTY** | No IR integrity verification possible. `requireValidProvenance` would fail if wired. | IR provenance analysis |
| **RESOLVED: 0/952 commands had policies bound → 952/952 bound** | ROOT CAUSE: Top-level `policy` declarations are NOT bound by the compiler. Only `default policy` inside entity blocks auto-expands. Fixed by moving/adding policies inside entity blocks across all 92 source files. | `manifest/source/*.manifest` (all files modified) |
| **TanStack Query IS installed with QueryProvider** | But only events domain uses it (5 files). 162 other apiFetch files get zero caching. Prior audit incorrectly said "no data caching installed". | `apps/app/app/providers/` |
| **Generated client has 0 consumers** | Prior audit incorrectly reported 2-3 consumers. No file imports from `manifest-client.generated.ts`. 9th revision re-confirmed with grep. | Codebase-wide grep |
| **81% of API URLs are hardcoded strings** | 211 hardcoded paths vs ~50 typed path builders. 6 files use typed routes. | Frontend analysis |
| **39 export paths in @angriff36/manifest, only 4 actively used** | 10.3% adoption. Prisma projection uses dist-path bypass instead of canonical export. | Package export analysis |
| **35 CLI commands available, 15 have package.json scripts, 20 unused** | Major unused features: Reactions, Sagas, Approvals, State Transitions, Entity Concurrency, Webhooks, Roles, Enums, Value Objects, Async Commands, Middleware Pipeline, WASM evaluator, Encryption, Feature Flags, Profiling, Agent SDK, Plugin system. | CLI analysis |

### NEW findings from this revision (7th)

| Finding | Impact | Source |
|---|---|---|
| **CRITICAL: Permission guard is allow-by-default on 180/189 entities** | Only 9 entity types have RBAC entries in `COMMAND_PERMISSION_MAP`. Commands NOT in the map pass through unconditionally. 3 bypass paths: no user.role, command not in map, enforce:false. This is a security vulnerability. | `manifest/runtime/src/permission-guard.ts` |
| **HIGH: build.mjs line 170 BROKEN PATH** | References `scripts/manifest/generate-route-manifest.ts` which doesn't exist. Step 3 of build pipeline fails. `package.json` script `manifest:routes:ir` has correct path. | `manifest/scripts/build.mjs:170` |
| **HIGH: compilerVersion "0.3.8" stale** | Provenance records useless version. contentHash/irHash always empty. | `manifest/scripts/build.mjs:96` |
| **HIGH: 559 event timestamp fields typed as number, not datetime** | Every event carrying a timestamp loses type safety at the boundary. Additionally, 9 datetime fields mutated to literal `0` instead of `null` for reset operations (prep-list, prep-comment, prep-task, time-entry, equipment, sample-data, admin-chat-participant). | Source analysis across all domains |
| **HIGH: 3 outbox implementations exist** | `packages/realtime/src/outbox/create.ts` (canonical, tx-safe), `apps/api/app/api/kitchen/tasks/shared-task-helpers.ts` (duplicate, NO tx safety), `manifest/runtime/src/prisma-store.ts` (batch writer). Kitchen task claim routes use the unsafe version. | Codebase-wide grep |
| **HIGH: payroll-engine 100% disconnected from Manifest** | Sets PayrollRun.status to "completed" (not a valid Manifest state). Constructor strips `$transaction` -- cannot be retrofitted without signature change. Zero Manifest awareness. | `packages/payroll-engine/` |
| **MEDIUM: 25 projections exist (not 9)** | 17 undocumented projections: llm-context (MCP integration), materialized-views (reporting), health (K8s), graphql, analytics. High-value candidates for adoption. | `node_modules/@angriff36/manifest/dist/manifest/projections/` |
| **MEDIUM: Rules engine and entity graph are dead code** | rules-engine/ (5 files, ~1000 LOC, 0 consumers), entity-graph/ (7 files, ~1400 LOC, 0 consumers, `buildGraphFromIR` is stub). Total: 12 files, ~2400 lines. | Runtime analysis |
| **MEDIUM: CollectionCase.dunningStage arithmetic on string** | **RESOLVED 2026-06-05** — Fixed: dunningStage changed from string to int; escalateDunning guarded to <5; resetDunning param string→int; escalateToLegal 'LEGAL'→5. | `manifest/source/collection-rules.manifest` |
| **MEDIUM: 12 hybrid files (partial migration started)** | 11 API + 1 app files contain BOTH direct Prisma writes AND manifest calls. Lowest-effort migration targets -- Manifest wiring already exists. | API analysis |
| **MEDIUM: Client.tags/ApiKey.scopes string-into-array mismatch** | RESOLVED 2026-06-04 — Client.tags fixed in first batch (L55, L90). Event.tags fixed in second batch (L68, L88). RolePolicy.permissions fixed: `string = "[]"` → `array<string> = []`; computed uses `length()`. | Source analysis |
| **LOW: 30 Prisma models use snake_case model names** | Convention violation: `audit_config`, `sms_logs`, `open_shifts` etc. Adds noise to accessor resolution. 179 models have @@map, 47 don't. | Schema analysis |
| **LOW: Finance domain inconsistent status casing** | Invoice/Payment/Collections use UPPERCASE (PAID, SENT), other domains use lowercase, Payroll mixes both. | Source analysis |
| **LOW: CLI adoption 35% (13/37 commands)** | 24 unused including high-value DX: watch, migrate, harness, coverage, docs, diagram, lint-routes, mock, changelog, fmt. No manifest.config.yaml exists. | CLI analysis |

### NEW findings from this revision (8th)

| Finding | Impact | Source |
|---|---|---|
| **CORRECTED: Projections available = 27 (not 25)** | 2 additional projections found: `sveltekit`, `terraform`. Full list of 12 NOT in prior plan: dart, dynamodb, elasticsearch, hono, jsonschema, kysely, mongoose, pydantic, remix, storybook, sveltekit, terraform. | `node_modules/@angriff36/manifest/dist/manifest/projections/` |
| **CORRECTED: Server actions with direct writes = 28 files** | App uses `database.*` singleton (not `prisma.*`), so prior search for `prisma.*` missed them. 28 files with `database.*` direct writes confirmed. | Server actions audit |
| **CORRECTED: apiFetch = 167 files, 1,092 call sites** | 9th revision fresh count: 1,092 calls in 167 files (down from prior 1,098/169). TanStack Query = 5 files, 31 uses (down from prior 6/32). | Frontend audit |
| **CORRECTED: Permission guard = 31 entries across 9 entity types** | Prior plan said ~36 entries. Actual is 28. Allow-by-default on 180/189 confirmed. | `manifest/runtime/src/permission-guard.ts` |
| ~~**CORRECTED: manifest-command-handler.ts is LEGACY**~~ RESOLVED 2026-06-04 (Task 10.13) | Legacy `manifest-command-handler.ts` deleted (289 lines). All 71 route files + 11 test files migrated to `runManifestCommand` via canonical `execute-command.ts`. Webhook dispatch support added to canonical handler. 0 legacy consumers remain. Single command path through full middleware pipeline (identity, RBAC, audit, outbox). API typecheck 0, 2562 tests pass. | `apps/api/lib/` |
| **Finance domain: universal datetime-as-number** | InvoiceSent.dueDate `number` into `datetime`. InvoiceViewed.viewedAt `number` into `datetime`. Payment events: createdAt/updatedAt as `number`. RevenueRecognitionSchedule timestamps as `number`. | Source audit |
| **Payroll domain: universal datetime-as-number + inverted logic** | PayrollPeriod.isLeaf: `self.parentId == ""` means no parent (root), but "leaf" in a tree means no children -- misleading. Payroll events: ALL timestamps as `number`. | Source audit |
| **Staff domain: universal datetime-as-number across 9 files** | StaffMember events: createdAt/updatedAt/deactivatedAt/reactivatedAt/roleChangedAt ALL `number` instead of `datetime` across 5 events. TimeEntry.addEntry: clockIn/clockOut `number` into `datetime`. TimecardEditRequest: multiple mismatches. EmployeeAvailability: dayOfWeek as `number` but compared as string. | Source audit |
| **Procurement domain: type mismatches beyond datetime** | PurchaseOrderItem.create: quantityOrdered `number`->`decimal`, unitId `number`->`int`, unitCost `number`->`money`. PurchaseOrder timestamps as `number`. | Source audit |
| **Notifications domain: universal datetime-as-number** | NotificationRules: ALL event timestamps (createdAt, readAt, dismissedAt, deletedAt) as `number`. EmailWorkflow: transition bugs and state machine issues. | Source audit |
| **Kitchen domain: datetime + logic bugs** | KitchenTask.updateDueDate: dueDate `number` into `datetime`. PrepList.createFromSeed/reopen: finalizedAt mutated to `0` instead of `null`. RecipeVersion tagCount hardcoded 0, hasVersion always true (reconfirmed). | Source audit |
| **Inventory domain: datetime + type mismatches** | InventoryItem.totalValue: `int * money` declared as `number` instead of `money`. InventoryItem.reserve: quantity `number` into decimal/int. WasteEntry.reasonId: RESOLVED 2026-06-04 — Fixed: `reasonId: number` → `int` in create command. | Source audit |
| **CRM domain: decimal/number mismatches** | Client.defaultPaymentTerms: `decimal` property but `number` params in create/update. Client tags: string into array\<string\>. CRM event timestamps as `number`. | Source audit |
| **Logistics domain: datetime mismatches** | Driver.licenseExpiry: `number` param into `datetime` (in create, update, renewLicense). Shipment tracking timestamps: `number` into `datetime`. | Source audit |
| **Admin domain: string/datetime + string/array mismatches** | AdminTask.dueDate: typed `string` instead of `datetime`. RolePolicy permissions: default `'[]'` string into `array<string>`. | Source audit |
| **Infra/Quality domain: datetime + type mismatches** | ApiKey.scopes: `array<string>` property but `string` params. TrainingAssignment.completedAt: `number` in events. Equipment.nextMaintenanceDate: number/datetime mismatch. FacilityWorkOrder.deadline: number/datetime mismatch. | Source audit |
| **Official Manifest docs: corrected URL paths** | Middleware: `/extensibility/runtime-middleware` (not `/adapters/middleware`). Sagas/Workflows: `/language/workflows` (not `/language/sagas`). Relationships: documented within Entities page. Projections: `/integration/projections` (not `/projections/overview`). Prisma: `/integration/prisma` (not `/projections/prisma`). | Official docs fetch |
| **Official Manifest docs: feature confirmation** | Middleware: 4 hooks (before-guard, before-policy, before-action, after-emit), composable, supports contextPatch/abortCommand/side-effects. Reactions: declarative event-to-command binding, resolve expressions, condition guards, batch mode. Workflows (Sagas): multi-step with compensate actions, timeout, retry. Custom Stores: Store\<T\> interface with 6 methods. Plugin API: definePlugin() for extending projections, store adapters, builtins. Tenancy: single `tenant tenantId : string from context.tenantId` declaration. Config: manifest.config.yaml, all fields optional, CLI flags override config. | Official docs fetch |
| **API route audit by domain** | Kitchen: 165 total (100 gen, 65 hand, 22 direct, 16 manifest). Events: 76 (40 gen, 36 hand, 6 direct, 16 manifest). CRM: 40 (20 gen, 20 hand). Staff: 60 (28 gen, 32 hand). Inventory: 75 (42 gen, 33 hand). Notifications: 16 (2 gen, 14 hand, 1 direct, 7 manifest). Admin: ~20 (13 direct). Command Board: 26 (12 gen, 14 hand, 4 direct, 4 manifest). All routes have tenant filtering. | API route audit |

### NEW findings from this revision (9th)

| Finding | Impact | Source |
|---|---|---|
| **agent-sdk export generates AI tool definitions FROM IR** | Provides `toAnthropicTools()`, `toOpenAITools()`, `toVercelAITools()`, `listEntities()`, `describeEntity()`, `listCommands()`, `describeCommand()`, `findMatchingCommands()` (keyword-based intent matching). Could replace hand-rolled MCP server tool definitions entirely. | `node_modules/@angriff36/manifest/docs/` |
| **ir-diff + breaking-change exports for CI schema drift** | `diffIR(oldIR, newIR)` produces structured diff report. `classifyBreakingChanges()` gates PRs with breaking-change detection. `generateMigration()` produces PostgreSQL DDL from IR diff. HIGH VALUE for CI/CD. | `node_modules/@angriff36/manifest/docs/` |
| **audit/postgres export: PostgresAuditSink** | `ON CONFLICT DO NOTHING` idempotency. Engine already has `emitAudit()` built-in. Just needs the sink instance. Zero audit trail exists today. | `node_modules/@angriff36/manifest/docs/` |
| **profiling export: per-phase timing** | 13 execution phases (tenantContextGate, idempotencyCheck, policyEvaluation, guardEvaluation, approvalGate, actionExecution, eventEmission). `toFlameGraph()` visualization. `onProfileComplete` callback. | `node_modules/@angriff36/manifest/docs/` |
| **outbox/postgres export: production-grade** | `claim()` (FOR UPDATE SKIP LOCKED), `markDelivered()`, `markFailed()`. Capsule's custom outbox only writes, never dispatches. | `node_modules/@angriff36/manifest/docs/` |
| **Async Commands: `async command <name>()` prefix** | Defers execution to background worker. Returns `{ jobId, status: "pending" }`. `JobQueue` adapter interface. Auto-synthesized `CommandNameCompleted`/`CommandNameFailed` events. High-value for report generation, batch imports, payroll processing. | Official docs, new page |
| **Feature Flags: `flag("name")` builtin** | In guards/computed properties. Resolved via `flagProvider` RuntimeOption. Supports external providers (LaunchDarkly etc). Zero flags defined. | Official docs, new page |
| **Mixin Composition: `mixin Auditable { ... }`** | For property/constraint reuse across entities. 189 entities have heavy repetition (timestamps, tenantId, audit fields). Would eliminate duplication. | Official docs `/language/advanced-entities` |
| **Scheduled Commands: `schedule <name> { cron ... }`** | Next.js projection generates cron routes automatically. Zero scheduled commands exist. Candidates: daily reconciliation, nightly inventory sync, expiration checks. | Official docs `/language/workflows` |
| **Entity Property Modifiers: encrypted, masked, searchable, indexed, unique, readonly** | Only `required`/`optional` used. `encrypted` on PII, `masked` (redact/partial/tokenize/email/phone/ssn/creditCard), `searchable` (full-text), `indexed`, `unique` on ApiKeyName/VendorCatalog.itemNumber. | Official docs entity modifiers |
| **build.mjs duplicates compile.mjs logic** | Instead of delegating to compile.mjs. Design debt. Also has dead `CODE_OUTPUT_DIR` variable. | `manifest/scripts/build.mjs` |
| **generate-route-manifest.ts has only 90/189 ENTITY_DOMAIN_MAP entries** | Canonical map now covers 189 entities. Stale copy has 90. Event mapped as "manifest/Event" vs canonical "events/event". | `manifest/scripts/generate-route-manifest.ts` |
| **prisma-projection-options.mjs EventStaff table wrong** | RESOLVED 2026-06-05 (Task 2.5 Phase 3) — derive-prisma-options.mjs now uses ENTITY_ACCESSOR_OVERRIDES for fallback lookup. 188/189 entities matched (was 173/189). | `manifest/scripts/derive-prisma-options.mjs` |
| **generate-all-routes.mjs is orphaned** | No pnpm script entry at all. Completely unreachable from standard workflow. | `manifest/scripts/generate-all-routes.mjs` |
| **generate.mjs has stale comment** | References "CLI (0.3.37)". Installed version is 2.2.0. | `manifest/scripts/generate.mjs` |
| **4 coexisting data patterns clearly identified** | raw apiFetch+useState (~160 files), Server Actions (~20 files), TanStack Query (1 domain), generated client (0 consumers). Server actions vs apiFetch is a competing pattern needing unification. | Frontend analysis |
| **manifest-client.ts (executeCommand) already wired but orphaned** | Clean migration target for the 14 misnamed `use-*.ts` files. Already has command execution wiring but nothing consumes it. | `apps/app/app/lib/manifest-client.ts` |
| **routes.ts has 218 lines of hand-maintained route helpers** | Only 7 files use them vs 205 hardcoded paths. Low adoption despite investment. | `apps/app/app/lib/routes.ts` |
| **IR stores is a top-level array `ir.stores[]`** | Not a per-entity field. All 189 store definitions accessible at `ir.stores[]` with `target: "durable"`. | IR structure verification |

### NEW findings from this revision (10th)

| Finding | Impact | Source |
|---|---|---|
| **CRITICAL: `timestamps` entity modifier eliminates 559+ datetime-as-number bugs** | Auto-injects `createdAt`/`updatedAt` as readonly datetime properties. Runtime populates via deterministic `getNow()`. Prisma projection translates to `@default(now())` and `@updatedAt`. Currently ZERO entities use it -- all hand-declare these fields, creating the entire datetime-as-number bug class. | Official docs `/language/timestamps` |
| **HIGH: `realtime` entity modifier auto-generates SSE + React hooks** | `realtime` modifier produces `GET /api/{entity}/realtime` SSE endpoints and `use{Entity}Realtime` React hooks with auto-reconnect. Zero realtime infrastructure exists today -- all data refresh is polling-based via apiFetch. | Official docs `/extensibility/realtime-subscriptions` |
| **MEDIUM: Federation export (`@angriff36/manifest/federation`)** | Multi-service runtime mesh: `FederationRegistry`, `FederationClient`, `buildDescriptor`. Service discovery, cross-service command invocation, health checks. Policy bridge propagates identity via `X-Manifest-*` headers. HTTP adapter generation for typed client classes. Idempotency heuristics for retry safety. NOT in plan's export list at all -- completely undiscovered. | Official docs `/extensibility/federation` |
| **MEDIUM: Computed caching (`cache request/session/ttl`)** | Memoizes computed properties with 3 strategies: request-scoped, session-scoped, TTL-based. Dependency-driven staleness propagation (mutation marks dependent caches stale). Currently ZERO computed properties use caching. 563/611 have empty dependencies -- caching could mask dependency gaps if adopted prematurely. | Official docs `/language/computed-caching` |
| **MEDIUM: Snapshot testing for generated code** | Snapshots generated code across ALL built-in projections. Timestamp stabilization for deterministic comparison. `listBuiltinProjections()` for programmatic enumeration. 13 built-in projections asserted by snapshot tests. Would have caught the accessor derivation bugs in CI. | Official docs `/extensibility/snapshot-testing` |
| **MEDIUM: Property-based testing (fast-check)** | Invariant testing: determinism, guard safety, constraint monotonicity, policy isolation, state consistency. NOT in plan at all. Would provide rigorous conformance verification beyond example-based tests. | Official docs |
| **LOW: IR Compression (`@angriff36/manifest/compression`)** | Binary serialization for large IR payloads (60-80% size reduction). `compressIR()` / `decompressIR()` -- lossless, byte-identical roundtrip. NOT in plan's export list. | Official docs |
| **LOW: Coverage Reporter programmatic API** | `CoverageReporter` class with `compute()` method. Reports command/guard/policy/constraint test coverage. Plan mentions CLI `coverage` but not the programmatic API. | Official docs |
| **NEEDS VERIFICATION: MCP Server export** | Docs sidebar lists "MCP Server" under extensibility. May overlap with Task 5.12 agent-sdk or be a separate export. | Official docs sidebar |
| **CLI has 40 commands (plan says 35-37)** | Additional commands NOT in plan: `init` (interactive setup with templates), `install-hooks` (pre-commit), `validate-ai` (scored diagnostics for AI agents), `preflight` (env var validation), `scan` (write/fabrication/drift detection), `harness` (IR harness scripts), `mock` (local mock HTTP server from IR), `docs` (static doc site), `duplicates` (merge report), `runtime-check` (route/source/IR correlation), `cache-status` (offline cache), `versions` (IR version management: save/list/diff/changelog/verify/rollback/compress), `routes` (canonical route manifest), `inspect` (surface inspection), `load-test` (k6/Artillery generation). | CLI analysis |
| **Package has 39 exports (plan said 44 -- corrected)** | Complete export list verified from package.json `exports` field. New exports NOT in prior plan: `./federation`, `./compression`, `./projections` (top-level), `./audit` (top-level), `./outbox` (top-level), `./approval` (top-level). The `./wasm` export was NOT in prior count. No `./express` export exists despite projection directory. | Package export analysis |
| **Adapter doc pages not in plan** | DynamoDB adapter (`/adapters/dynamodb`), Redis adapter (`/adapters/redis`), Turso adapter (`/adapters/turso`), Event sourcing adapter (`/adapters/event-sourcing`). | Official docs sidebar |
| **Additional doc pages not analyzed** | Roles (`/language/roles`), Modules (`/language/modules`), More projections (`/projections/more-projections`), AI tooling (`/extensibility/ai-tooling`), Runtime tooling (`/extensibility/runtime-tooling`). | Official docs sidebar |

### NEW findings from this revision (12th)

| Finding | Impact | Source |
|---|---|---|
| **ROOT CAUSE: Event payloads use `number` for ALL 916 timestamp fields while entity properties correctly use `datetime`** | The `now()` builtin returns epoch-ms (number). All 936 events carry timestamps as `number` in their payloads. Entity properties are correctly `datetime` (741 fields). The mismatch is in the event channel, not entity declarations. `timestamps` modifier (Task 2.8) fixes createdAt/updatedAt but does NOT fix the 916 event timestamp fields. | IR analysis: `ir.events[].payload[]` where name contains "At"/"Date" = 916 `number`, 0 `datetime` |

### NEW findings from this revision (13th)

| Finding | Impact | Source |
|---|---|---|
| **CORRECTED: 80 errors = 71 generated + 9 handwritten (was 72+8)** | TS2339=32 (19 entities: 16 no model + 3 renamed), TS2551=28 (14 entities: 12 accessor overrides + 4 handwritten shipment), TS2353=9 (7 created_at + 2 absent, was 6+3), TS2561=6, TS2322=4, TS2345=1 | `pnpm --filter api typecheck` full analysis |
| **ENTITY_ACCESSOR_OVERRIDES needs 33 entries (currently 2)** | 12 accessor name mismatches (Document→documents, SmsAutomationRule→sms_automation_rules, EventTimelineItem→eventTimeline, StorageLocation→storage_locations, BulkCombineRule→bulk_combine_rules, MethodVideo→method_videos, PrepListImport→prep_list_imports, QACorrectiveAction→correctiveAction, QATemperatureLog→temperatureLog, TaskBundleItem→task_bundle_items, TaskBundle→task_bundles, OpenShift→open_shifts) + 3 renamed models (BankAccount→employeeBankAccount, LogisticsRoute→deliveryRoute, QACheck→qualityCheck) + 16 route drops (Deal, AiEventSetupSession, AutomatedFollowup, EntityVersion, EventWaitlistEntry, FacilitySchedule, FacilityWorkOrder, LogisticsDispatch, PerformancePrediction, SampleData, StaffPerformance, VersionApproval, VersionedEntity, WorkforceOptimization, Budget, Vendor) = 33 total | `manifest/scripts/entity-domain-map.mjs`, schema.prisma cross-reference |
| **CONFIRMED: MCP Server is a SEPARATE export** (`@manifest/mcp-server`, bin `manifest-mcp`, 4 tools) | Resolves Task 12.2 "NEEDS VERIFICATION". Distinct from agent-sdk. | Official docs `/extensibility/mcp-server` |
| **Runtime Profiler is a SEPARATE export** (`@angriff36/manifest/profiler`) | NOT just a RuntimeOption boolean. `Profiler` class with per-phase timing, `toFlameGraph()`, `onProfileComplete`. | Official docs `/extensibility/runtime-tooling` |
| **AI conformance test generator** (`manifest generate-tests`) | Generates test suites from IR for all 189 entities. Covers command conformance, policy compliance, guard safety. Would automate Task 8.5. | Official docs `/extensibility/ai-tooling` |
| **Governance CLI suite** (7 commands) | `enforce-surface`, `integration-check`, `audit-governance`, `audit-bypasses`, `scan`, `doctor`, `audit-routes`. Zero in package.json. Directly addresses 301 direct-write violations. | Official docs `/cli/governance` |
| **Tenant isolation is TWO layers** | IR-level declaration (`tenant tenantId: string from context.tenantId`) + RuntimeOption (`requireTenantContext: true`). Plan only covers RuntimeOption. Both should be active. | Official docs `/language/tenancy` |
| **Policy matrix viewer** (`manifest coverage --format policy-matrix`) | Visualizes which entities/commands have policies. Surfaces 180/189 no-RBAC gap immediately. | Official docs `/cli/governance` |
| **Runtime REPL** (`manifest repl`) | Interactive debugging of Manifest runtime. Inspect entity state, evaluate expressions, test guards/policies. Not in plan. | Official docs `/extensibility/runtime-tooling` |
| **Time-travel debugger** (`@angriff36/manifest/debug`) | Records state mutations during command execution with replay. Step forward/backward through state changes. Was "planned" in FEATURE-LIST, now SHIPPED. | Official docs `/extensibility/runtime-tooling` |
| **Entity inheritance** (`extends`) | Single inheritance for entities. Eliminates repetition across hierarchies. Complements mixin composition (Task 11.3). | Official docs `/language/advanced-entities` |
| **LLM IR validator/repair** (`manifest validate-ir`) | Auto-repairs malformed IR. Detects orphaned references, malformed entity structure. Not in plan. | Official docs `/extensibility/ai-tooling` |
| **CORRECTED: /features/security-features URL returns 404** | Security features distributed across command-level and entity-level pages. Task 11.5/11.6 doc refs must be corrected. | Official docs fetch |
| **CORRECTED: Profiling is a SEPARATE EXPORT, not just RuntimeOption** | `@angriff36/manifest/profiler` is standalone. Task 7.6 `profiling` entry incomplete without wiring the export. | Official docs `/extensibility/runtime-tooling` |
| **Runtime tooling = 3 tools: REPL + time-travel debugger + profiler** | Not just "profiling" as a RuntimeOption. Three distinct developer tools with separate exports. | Official docs `/extensibility/runtime-tooling` |
| **AI tooling = 3 tools: conformance test generator + IR validator + NL transpiler** | Only agent-sdk was tracked. NL transpiler converts natural language to Manifest DSL. | Official docs `/extensibility/ai-tooling` |
| **CORRECTED: TS2353 = 7 created_at + 2 absent (was 6+3)** | One entity re-verified as created_at case, not absent. ForecastInput confirmed absent. | Typecheck output analysis |
| **compilerVersion in IR provenance is `0.3.8`** despite installed package being 2.2.0 | Provenance records are useless for integrity verification. `irHash` and `contentHash` are also EMPTY. `requireValidProvenance` RuntimeOption would fail if wired. | `ir.provenance.compilerVersion = "0.3.8"` |
| **MCP Server is a SEPARATE export** (`@manifest/mcp-server`, bin `manifest-mcp`) with 4 tools: compile, execute, validate, explain | Distinct from `agent-sdk`. Capsule has TWO MCP servers: upstream `manifest-mcp` (unused) and custom `packages/mcp-server` (active). Task 5.12 and 12.2 should consider replacing the custom server entirely. | `docs/manifest-official/features/mcp-server.md` |
| **Rate Limiting is a Manifest DSL feature** (`rateLimit { window, maxRequests, scope, strategy }` in commands) | Zero commands use it. RateLimitConfig entity exists but rate limiting is enforced outside Manifest. Official feature available for adoption. | `docs/manifest-official/features/security-features.md` |
| **Command Retry Policy is a Manifest DSL feature** (`retry { maxAttempts, backoff, initialDelay, maxDelay, jitter }`) | Zero commands use it. Notification sendEmail and report generation are natural candidates. | `docs/manifest-official/features/security-features.md` |
| **Middleware uses `runtime.use()` method, NOT constructor options** | Task 7.4 says `middleware: [...]` in constructor but docs show `runtime.use({ beforePolicy, beforeGuard, beforeAction, afterEmit })`. May be both -- needs verification. | `docs/manifest-official/features/runtime-middleware.md` |
| **116 features planned** across v1.9-v1.12 (27 shipped, 76 unreleased, 13 no summary) | Major upcoming capabilities not in plan: Runtime Time-Travel Debugger, Runtime REPL, Seed Data Generator, AI Test Generator, LLM IR Validator, Watch Mode, VS Code Extension, LSP, Default-Deny Policy, CQRS Read Model, Cross-Entity Actions, Soft Delete Pattern, Pagination API, Notification Channels, OpenTelemetry Metrics. | `docs/manifest-official/FEATURE-LIST.md` |
| **Dynamic Data Masking** supports policy expressions per property with strategies (full/partial/hash) | Plan mentions `masked` in Task 9.7 but doesn't detail policy-based masking. Can mask based on user role. | `docs/manifest-official/features/security-features.md` |
| **Feature adoption confirmed at 10.3% (4/39 exports)** | Unchanged from 11th revision. Confirmed stable. | `node_modules/@angriff36/manifest/package.json` exports field |

### NEW findings from this revision (11th)

| Finding | Impact | Source |
|---|---|---|
| **CORRECTED: API typecheck = 80 (not 79)** | 10th revision said 79, but fresh verification confirms 80. One error reappeared (possibly from bankAccount/qACheck shifting categories). | `pnpm --filter api typecheck` |
| **CORRECTED: Package exports = 39 (not 44)** | 10th revision overcounted. Verified from `package.json` exports field: 39 entries, not 44. Feature adoption = 4/39 = 10.3%. | `node_modules/@angriff36/manifest/package.json` |
| **CORRECTED: Switch cases = 94 (not 93)** | `prisma-store.ts` has 94 `case` statements, not 93. | `manifest/runtime/src/prisma-store.ts` grep |
| **CORRECTED: Permission guard = 31 entries (not 28)** | `COMMAND_PERMISSION_MAP` has 31 entries across 9 entity types, not 28. Still allow-by-default on 180/189 entities. | `manifest/runtime/src/permission-guard.ts` |
| **CORRECTED: Factory = 520 lines (not 521)** | Minor correction. | `manifest/runtime/src/manifest-runtime-factory.ts` |
| **ENTITY_DOMAIN_MAP expanded to 189 entries — ✅ stale copies eliminated** | Canonical `entity-domain-map.mjs` now covers all 189 entities (was 89-92 in prior revisions). Stale copies in `generate-route-manifest.ts` and `mcp-server` eliminated (2026-06-04). Task 2.4 DONE. | `manifest/scripts/entity-domain-map.mjs` |
| **ENTITY_ACCESSOR_OVERRIDES still has only 2 entries** | Despite Task 0.1 listing ~31 entities needing overrides, only EventStaff and EventImportWorkflow are in the map. The remaining ~29 entities still produce broken accessors. | `manifest/scripts/entity-domain-map.mjs:256-259` |
| **generate-route-manifest.ts now imports canonical map** | ✅ DONE — imports canonical 189-entry map (was 90 hardcoded entries). Event mapping fixed to "events/event". | `manifest/scripts/generate-route-manifest.ts` |
| **Feature adoption = 10.3% (not 9.1%)** | 4 of 39 exports used (was 4 of 44). The denominator correction raises the percentage slightly. | Package export analysis |
| **No new completed milestones since 10th revision** | All metrics stable. No new code changes affecting the plan's claims. | Git status verification |

### NEW findings from this revision (14th, 2026-06-04)

| Finding | Impact | Source |
|---|---|---|
| **RESOLVED: RecipeVersion.totalTimeMinutes + Ingredient.recordLot expiresAt** | Two silently-broken governed-logic bugs fixed at source. totalTimeMinutes now sums prep+cook+rest; recordLot persists currentLotExpiresAt. Verified via new runtime regression test. | `manifest/source/recipe-rules.manifest:105`, `ingredient-rules.manifest` recordLot |
| **Recipe.tagCount + Recipe.hasVersion still hardcoded (DEFERRED)** | tagCount: int = 0 needs an array-length/count builtin (unverified in DSL). hasVersion: boolean = true needs a cross-entity existence check, but Recipe has NO relationship to RecipeVersion, so a self-only computed cannot express it — requires a relationship + aggregate or a stored flag maintained by RecipeVersion.create. Not fixable as a simple computed. | `manifest/source/recipe-rules.manifest:17-18` |
| **CRITICAL: ~40 non-quarantine kitchen runtime tests broken by the all-durable flip (storeProvider)** | RESOLVED 2026-06-04 (commit 12e0b3ed4) — After "ALL 189 entities flipped to durable" (2026-06-03), every test that constructs ManifestRuntimeEngine WITHOUT a storeProvider throws "declares durable but no storeProvider is bound". Confirmed failing (pre-existing, NOT caused by source edits): manifest-preptask-runtime.test.ts (7), manifest-constraint-severity.test.ts (3), manifest-all-phases-compilation.test.ts (29 of 30). Fix: supply an in-memory storeProvider (function (entityName)=>Store as the 3rd RuntimeEngine ctor arg; the MOCK_STORE_PROVIDER in all-phases uses a wrong {getEntityStore} object shape). Pattern proven in `apps/api/__tests__/kitchen/manifest-recipe-ingredient-logic.test.ts`. FIXED: shared InMemoryStore + inMemoryStoreProvider() added to apps/api/__tests__/test-helpers.ts and wired as the 3rd ctor arg into manifest-preptask-runtime / manifest-constraint-severity / manifest-all-phases-compilation. createCustomBuiltins re-exported from the DB-free manifest/runtime/src/runtime-engine.ts so the preptask percentComplete=percent(...) computed resolves without pulling the package index's DATABASE_URL side effects. All 163 tests pass. | `apps/api/__tests__/kitchen/*`, `manifest/runtime/src/runtime-engine.ts` |
| **PrepComment missing 'resolve' command (test/source drift)** | RESOLVED 2026-06-04 — manifest-all-phases-compilation.test.ts asserts PrepComment has command 'resolve' but the IR only has create/edit/+2. Either the command was dropped from source or the test expectation is stale. Needs a decision: add the resolve command to prep-comment-rules.manifest or update the test expectation. Fixed the stale test expectation: PrepComment commands are create/edit/markResolved/unresolve/softDelete (source is authoritative). | `manifest/source/prep-comment-rules.manifest`, `manifest-all-phases-compilation.test.ts:680` |
| **RBAC deny-by-default (Task 9.9) BLOCKED on product authorization matrix** | Investigated permission-guard.ts deeply this session. The allow-by-default vuln (180/189 entities) cannot be flipped to deny-by-default safely without a role->domain authorization matrix: only 'admin' has ['*']; manager/kitchen_lead/kitchen_staff/staff have narrow explicit permission lists (permission-checker.ts:40-88), so a naive flip would deny legitimate commands for all non-admin roles. The IR-driven path is also not ready (entity policies: [] are empty). 3 bypass paths confirmed: no user.role, command not in COMMAND_PERMISSION_MAP (now 22 mapped entries / 9 entity types), enforce:false. RECOMMENDATION: needs an explicit product role->domain matrix OR populate entity policies in IR (Task 8.6/8.8) first. A conservative non-breaking partial (fail-closed for roleless callers on already-mapped sensitive commands) is available if a full matrix is not provided. | `manifest/runtime/src/permission-guard.ts`, `permission-checker.ts` |

### NEW findings from this revision (16th, 2026-06-04)

| Finding | Impact | Source |
|---|---|---|
| **CRITICAL CORRECTION: "build the 7 shipment command routes" (prior next-loop target b) is the WRONG action — it would violate the constitution.** | The concrete routes `apps/api/app/api/shipments/shipment/commands/{create,cancel,schedule,ship,start-preparing,mark-delivered,update}/route.ts` were **deliberately DELETED** by commit `12c1a4f9b` ("Route all manifest IR command POSTs through the single dispatcher, **prune legacy per-command API routes**"). That is constitution §6 consolidation (one canonical dispatcher; no concrete command routes). `shipment-commands.test.ts` (added later by `d1f50ec9e`) was orphaned by that prune. Worse: the orphaned test blocks (auth-guards + runtime-failure-responses, ~45 tests) assume routes that call `runtime.runCommand(...)` **directly** (test docstring lines 20-24), which §4a forbids (only `execute-command.ts` may invoke the runtime). The file's "success paths" block already tests the canonical dispatcher (`/api/manifest/Shipment/commands/*`) which IS the live surface. **Resolution is a test reconciliation, NOT route creation.** `shipment-end-to-end.test.ts` (~12 failures) imports the same deleted routes and needs the same reconciliation. **Precise breakdown (`shipment-commands.test.ts` = 71 tests, 10 pass / 61 fail): 49 fails = the orphaned concrete-route blocks (delete them — routes were intentionally pruned). The OTHER 12 fails reveal a REAL GAP, not just stale tests: the canonical dispatcher forwards `instanceId` for `create` (passes) but NOT for instance-scoped verbs (`update/cancel/schedule/ship/startPreparing/markDelivered`) when the id is in `body.id` — so the manifest store cannot identify which instance to mutate.** The legacy `manifest-command-handler.ts` DID extract `instanceId` from `commandPayload.id`/`params.id` for non-create commands (L171-178); the canonical `apps/api/lib/manifest/execute-command.ts` path (used by the dispatcher) appears NOT to. **NEXT-LOOP (focused, HIGH blast radius — canonical write path, all 189 entities): (1) make `execute-command.ts` forward `instanceId` from `body.id` for non-create commands [verify against legacy handler L171-178 + shipment-end-to-end "Blocker #1" tests]; (2) delete the orphaned concrete-route test blocks; (3) re-run both shipment files green.** Do NOT recreate concrete routes (§6/§15). | `git show 12c1a4f9b`, `apps/api/__tests__/logistics/shipments/shipment-commands.test.ts:20-24,124-475`, `apps/api/lib/manifest/execute-command.ts`, `apps/api/lib/manifest-command-handler.ts:171-178`, constitution §4a/§6/§15 |
| RESOLVED: 30 test-drift failures + payments-route Edge-safety bug (commit 25588dde7, pushed) | Full `pnpm --filter api test` 82→67 failed. Fixed manifest-runtime-factory loadManifests mock (+loadMergedPrecompiledIR), board-crud create mocks (+createInstance/getInstance), kitchen-task-query-shape expectation (String[] → `has`), and pinned accounting/payments route to `runtime="nodejs"`. API typecheck still 0. Remaining failures: shipment auth-guard tests now fixed (InvariantError → 401); orphaned concrete-route test blocks still need reconciliation; ~~1 file payment-create-idempotency pre-existing DATABASE_URL import issue~~ **RESOLVED 2026-06-05** — vi.mock for manifest-runtime + @repo/database stubs added (12 tests green). | this session |
| RESOLVED: Dispatcher InvariantError → 401 (was 500) | Canonical dispatcher route's catch-all returned 500 for ALL errors including auth failures (InvariantError from requireCurrentUser). Fixed: InvariantError caught specifically and returns 401. 5 shipment auth-guard tests now green. | `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` |
| CORRECTED: instanceId forwarding already handled in run-manifest-command-core.ts | The 16th revision claimed execute-command.ts doesn't forward instanceId for non-create commands. ACTUAL: `deriveInstanceIdFromBody()` at lines 85-99 already derives instanceId from `body.id` or `body.<entity>Id` for non-create commands. The legacy handler's inline extraction (L171-178) was the SAME logic, now encapsulated in the core function. No instanceId fix was needed. | `manifest/runtime/src/run-manifest-command-core.ts:134-137` |
| RESOLVED: build.mjs line 170 broken path fixed | Path segments were swapped: `scripts/manifest/generate-route-manifest.ts` → `manifest/scripts/generate-route-manifest.ts`. Step 3 of build pipeline no longer fails at runtime. | `manifest/scripts/build.mjs:169` |
| RESOLVED: compilerVersion updated from 0.3.8 to 2.2.0 | Both build.mjs and compile.mjs had hardcoded stale version. IR provenance records now show correct compiler version. | `manifest/scripts/build.mjs:95`, `manifest/scripts/compile.mjs:98` |
| RESOLVED: InvariantError→401 moved to producer (generate.mjs) | Fix moved from generated dispatcher route to the producer (generate.mjs) per constitution §10/§16. The generated file's DO-NOT-EDIT header means hand-edits are wiped on regeneration. | `manifest/scripts/generate.mjs:545-550` |

### NEW findings from this revision (15th, 2026-06-04)

| Finding | Impact | Source |
|---|---|---|
| RESOLVED: VendorContract blockModifyActive + CateringOrder transition/blockCancelIfCompleted (3 CRITICAL governed-logic bugs) | Entity-level `:block` constraints fire on every command that mutates a referenced property (verified runtime behavior), so a `block self.status=="active"`-style entity invariant breaks legitimate lifecycle commands. Pattern: such "guard-like" intentions belong in command-scoped guards, NOT entity-level block constraints. Fixed at source + IR recompiled; 10 new runtime regression tests added. | `manifest/source/vendor-contract-rules.manifest`, `manifest/source/catering-order-rules.manifest`, `apps/api/__tests__/procurement/vendor-contract-lifecycle.test.ts`, `apps/api/__tests__/events/catering-order-lifecycle.test.ts` |
| PATTERN TO AUDIT: misauthored entity-level `:block` constraints across other entities | Other entities may have the same anti-pattern (an entity-level `:block` constraint encoding a per-command rule). Grep `manifest/source/*.manifest` for entity-level `constraint <name>:block` declarations referencing `self.status`/`self.<stateField>` and verify they are command invariants, not per-command guards. Candidate follow-up task. | `manifest/source/*.manifest` |
| BASELINE CORRECTION: full `pnpm --filter api test` suite is NOT all-green — was 119 failed / 2454 passed; after storeProvider repair ~89 failed remain across 7 files (quarantine excluded) | Pre-existing failures unrelated to the governed-logic fixes. Taxonomy: (a) ~~~30 tests missing `storeProvider` in test setup from the all-durable flip~~ **RESOLVED 2026-06-04 (commit 926856a97, tag v0.12.59)** — manifest-event-preplist-seed-runtime (2), manifest-preptask-claim-conformance (10), manifest-role-policy-admin-only (18) now bind `inMemoryStoreProvider()` as the 3rd ctor arg; 40 tests green; (b) **RESOLVED** shipment auth-guard tests (5) now green after dispatcher InvariantError → 401 fix; remaining shipment test failures are orphaned concrete-route blocks (test reconciliation, not route creation); (c) **RESOLVED** stale mocks fixed (commit 25588dde7); (d) **RESOLVED** board-crud mocks fixed (commit 25588dde7); (e) **RESOLVED** kitchen-task-query-shape fixed (commit 25588dde7); (f) ~~**OPEN** payment-create-idempotency suite-level `Invalid environment variables`~~ **RESOLVED 2026-06-05** — vi.mock for manifest-runtime + @repo/database stubs added (12 tests green). **2574 tests pass, 117 files pass.** | `pnpm --filter api test` full run 2026-06-04 |

### NEW findings from this revision (17th, 2026-06-04)

| Finding | Impact | Source |
|---|---|---|
| **RESOLVED: 8 more Task 0.6 source bugs fixed** | EventProfitability computed, Event dead props activated, PayrollLineItem enhanced, PayrollRun.reject fixed, InventoryItem.totalValue money, AdminTask.dueDate datetime, ChartOfAccount.isLeaf->isRoot | `manifest/source/event-rules.manifest`, `payroll-rules.manifest`, `staff-logistics-extended-rules.manifest`, `inventory-rules.manifest`, `admin-task-rules.manifest`, `chart-of-account-rules.manifest` |
| **PayrollLineItem was DUPLICATED across two files** | Stub in payroll-rules.manifest (no commands) conflicted with canonical entity in staff-logistics-extended-rules.manifest (had commands). Stub removed; canonical enhanced with missing properties. | `manifest/source/payroll-rules.manifest`, `manifest/source/staff-logistics-extended-rules.manifest` |
| **ChartOfAccount.isLeaf was in wrong file in the plan** | Plan listed it as "PayrollPeriod.isLeaf" in payroll-rules.manifest. Actual bug was ChartOfAccount.isLeaf in chart-of-account-rules.manifest. Fixed by renaming to isRoot. | `manifest/source/chart-of-account-rules.manifest` |
| **EventStaff vs EventStaffAssignment: MERGE recommended** | Both model same domain (staff assigned to event). EventStaff is superset with 8 commands + attendance tracking vs 5 commands. Migration already half-done (staff-slice.ts comment says "REPLACES the legacy EventStaffAssignmentPrismaStore"). Hand-written routes cross-wired (events/staff queries eventStaffAssignment table). Recommend merge into EventStaff, data migration, then drop event_staff_assignments. | Exploration across IR, schema, stores, routes, frontend |
| **Task 0.6 remaining bugs: 4 already fixed, 1 not a bug, 1 deferred** | Kitchen tags (fixed by removeTagFromString builtin), BudgetLineItem (fixed), Dish margin (fixed), Client.defaultPaymentTerms (fixed). EmployeeAvailability.dayOfWeek is NOT a bug (int is correct). Recipe hasVersion/tagCount DEFERRED (needs cross-entity relationship). | Source exploration |

### NEW findings from this revision (18th, 2026-06-05)

| Finding | Impact | Source |
|---|---|---|
| **RESOLVED: 0/952 commands had policies bound → 952/952 bound (Task 8.6)** | ROOT CAUSE: Top-level `policy` declarations are NOT bound by the Manifest compiler to IR commands. Only `default policy` inside entity blocks triggers the compiler's auto-expansion to every command. Fixed by adding entity-specific `default policy <EntityName>DefaultAccess` inside all 92 source files via `add-default-policies.mjs` script. 189/189 entities now have `defaultPolicies`. 8 previously zero-policy files (invoice, payment, collections, etc.) now protected. | `manifest/source/*.manifest` (all 92 files modified) |
| **KEY DISCOVERY: `policy` vs `default policy` binding semantics** | Top-level `policy <Name> { ... }` declarations define reusable policy templates but do NOT auto-bind to entity commands. `default policy <Name>` inside an entity block causes the compiler to auto-expand the policy to ALL commands in that entity. This is the ONLY mechanism to bind policies to commands at scale. Without it, every command needs a manual `policy <Name>` per-command declaration. | Manifest compiler behavior, verified empirically |

### Package & IR

- `@angriff36/manifest@2.2.0` (confirmed from npm package + runtime dependency)
- IR: **189 entities (ALL durable)**, 952 commands (905 with non-empty guards, 950 with non-empty emits, 2 without emits, 132 with non-empty constraints), 936 events, 241 policies, 92 source files
- **952/952 commands have policies bound** (was 0/952 before Task 8.6). 189/189 entities have `defaultPolicies`.
- **1 saga** defined: `ProcessInvoicePayment` (2 steps with compensate)
- **7 reactions** defined (finance: 3, inventory: 1, events: 1, equipment: 2). Target: 5+ high-value reactions ✅ MET.
- 168 entities with computed properties (611 total; 563 have empty `dependencies` arrays)
- 183 entities with 583 constraints
- **Only 8 entities have relationships** (12 declarations total). **152 entities with FK properties but NO relationship blocks**. **96 entities with transitions (256 total rules). 4 entities with free-form status intentionally skipped.**
- 563/611 computed properties have empty `dependencies` (92.1% may not recalculate correctly)
- `provenance.irHash` and `provenance.contentHash` are empty strings (no IR integrity verification)
- **`provenance.compilerVersion` is `0.3.8`** despite installed package being 2.2.0
- 241 top-level policies exist; **all 189 entities now have `defaultPolicies` bound (952/952 commands have policies)** — RESOLVED 2026-06-05 (Task 8.6)
- 0 overrideable constraints out of 583 total
- **Event payload timestamps: FIXED (Task 2.7)** — was 916 fields typed `number`, 0 typed `datetime`; now all timestamp fields correctly typed `datetime`
- **Entity property timestamps: 741 fields typed `datetime`, 0 typed `number`** (correctly declared)
### Property types (all resolved)

- string(1,584), datetime(741), int(158), money(109), decimal(102), boolean(94), array(7), float(1)
- **0 number-typed properties** (was 17 -- all fixed to proper types)

### Prisma & Database

- 226 models, 29 enums, 12 PostgreSQL schemas, ~6,430 LOC in schema.prisma
- Two naming conventions: ~146 models use camelCase fields + `@map("snake_case")`; ~40 legacy models use raw `snake_case` fields without `@map`
- 4 PascalCase @@map anomalies (Tenant, ActivityFeed, EmployeeDeduction, OutboxEvent)
- **166 Prisma models match IR entities**
- **69 Prisma-only models** (infrastructure: Account, Location, UserPreference, Role, OutboxEvent, ManifestEntity, audit_*, admin_*, etc.)
- **16 IR entities without Prisma model** (need new tables -- see full list in Tier 0.3). Additionally **15 entities with models but wrong accessor names** need overrides.

### API Typecheck

- **0 errors** (Task 0.1 RESOLVED 2026-06-04; was 80). Generator-side fixes in `manifest/scripts/entity-domain-map.mjs` (ENTITY_ACCESSOR_OVERRIDES 2→33, new ENTITY_FIELD_OVERRIDES, new ENTITY_DETAIL_DROP) + `generate.mjs` (applyFieldOverrides post-process pass) + 9 hand-written source fixes. Drift gate idempotent.
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

- Factory wires: `{ storeProvider, idempotencyStore (conditional), customBuiltins, auditSink (conditional), outboxStore (conditional) }` (5 of 19 directly wired)
- **7 of 19 RuntimeOptions properties wired or passthrough** (5 wired + 2 passthrough: evaluationLimits, deterministicMode)
- **12 of 19 NOT wired**; additional cross-cutting concerns handled OUTSIDE lifecycle (eventCollector, telemetry, prismaOverride, RBAC proxy)
- Factory is **520 lines** (the ONE canonical implementation). API shim is 376 lines. Package re-export is 66 lines.
- Legacy `manifest-runtime.ts` (3,205 lines) is superseded dead code
- Custom outbox implementation duplicates upstream `OutboxStore` contract
- No audit trail (`auditSink` not wired despite upstream having full `emitAudit` infrastructure)
- No durable approval state (`approvalStore` not wired)
- No middleware pipeline (all cross-cutting concerns handled by Proxy wrapper)
- Permission guard: whitelist-based `COMMAND_PERMISSION_MAP` covering **31 entries** across 9 entity types
- **Single command handler**: `execute-command.ts` (CANONICAL). Legacy `manifest-command-handler.ts` removed (Task 10.13, 2026-06-04). All routes use full middleware pipeline (identity, RBAC, audit, outbox).

### Store Layer

- `prisma-store.ts`: 3,061 lines, **94** switch cases
- `prisma-stores/` directory: 45 files, ~12,694 lines
- **81 of 94 switch-case entities now route to GenericPrismaStore** -- **13 have custom logic** (was 23). GenericPrismaStore is now used at runtime for the majority of entities.
- **VendorContract appears twice** in ENTITIES_WITH_SPECIFIC_STORES (lines 199 and 226 -- duplicate entry, benign)
- GenericPrismaStore available as fallback for unmapped entities
- `ShipmentPrismaStore` uses `as any` cast on status field
- `BattleBoardPrismaStore` uses snake_case field names inconsistent with all other stores
- `AllergenWarningPrismaStore` has dead-code `toCommaString` method never called
- **User and ShipmentItem in ENTITIES_WITH_SPECIFIC_STORES but have no switch case** -- fall back to GenericPrismaStore which lacks EmploymentType default (User) and proper item handling (ShipmentItem). Latent bugs.
- **MenuPrismaStore uses raw `new Prisma.Decimal()` instead of `toDecimalInput()`** -- inconsistent with all other stores

### Governance

- **191 direct-write violations in API routes** + **110 in server actions** = **301 total** (191 API mutation calls across 80 files; 110 domain-entity server action writes across 28 files). **12 hybrid files** (both direct writes AND manifest calls) indicate partial migration started. notifications package adds 9+ direct DB writes across 4 files.
- Payroll engine: 100% bypass -- 4 direct Prisma writes, 2 entities with zero Manifest registration
- Invoice entity: **zero policies** -- any user can void/write-off
- `as any` usage: 39 in apps/api/app/, 10 in manifest/runtime/src/ (6 in factory, 1 in run-manifest-command-core, 2 in permission-guard, 1 in manifest-runtime.ts re-export)
- describe.skip: 1 entire test suite (sales-reporting) disabled
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
| 2026-05-30 | Phase 1: Route accessor correctness | 0 broken accessors, ENTITY_ACCESSOR_OVERRIDES covers 2 proven drifted entities, api typecheck GREEN |
| 2026-05-30 | Phase 2: Functional gate (Event/StaffMember/EventStaff commands) | Audit rows in outbox_events, runtime + api typecheck GREEN |
| 2026-05-30 | ENTITY_DOMAIN_MAP consolidation (generate.mjs -> entity-domain-map.mjs) | generate.mjs imports canonical map |
| 2026-05-31 | Durability classifier + GenericPrismaStore fallback | Store provider falls back to GenericPrismaStore for unmapped entities |
| 2026-05-31 | manifest.config.yaml created (147 lines, descriptive) | File exists at repo root; scripts not yet consuming it |
| 2026-05-31 | 3 entity durability flips (AlertsConfig, PrepMethod, Container) | IR declarations honest; runtime behavior unchanged |
| 2026-06-01 | Bootstrap constraint fix via upstream 1.7.0 | createInstance seeds proper defaults; requireName blocks pass |
| 2026-06-01 | Custom expression builtins wired (5 helpers) | customBuiltins in RuntimeOptions |
| 2026-06-02 | Signature reserved word fix for Shipment | signatureData rename in generated output |
| 2026-06-03 | **ALL 189 entities flipped to durable** | Zero memory entities. PrismaProjection can emit models for ALL. |
| 2026-06-03 | **Number-type properties fixed to proper types** | 0 number-typed properties (was 17). All use money/decimal/int/float. |
| 2026-06-03 | **Runtime typecheck: 0 errors** | Was 96. All store/schema alignment debt resolved. |
| 2026-06-04 | **Task 0.1: API typecheck 80 → 0 errors (deploy type-blocker cleared)** | Producer fix: ENTITY_ACCESSOR_OVERRIDES 2→33, new ENTITY_FIELD_OVERRIDES + applyFieldOverrides() post-process, new ENTITY_DETAIL_DROP. 49 generated routes modified, 30 dropped. 9 hand-written errors fixed. Drift gate byte-identical. Runtime typecheck still 0. |
| 2026-06-04 | **Kitchen governed-logic bugs: RecipeVersion.totalTimeMinutes + Ingredient.recordLot expiresAt** | totalTimeMinutes computed was hardcoded 0 (now sums prep+cook+rest); recordLot dropped expiresAt (now persists currentLotExpiresAt). IR recompiled, 0 route drift, api+runtime typecheck GREEN, new regression test apps/api/__tests__/kitchen/manifest-recipe-ingredient-logic.test.ts (3 pass). |
| 2026-06-04 | **Repaired ~40 kitchen runtime tests broken by the all-durable flip + tag v0.12.57** | Shared in-memory storeProvider test helper; createCustomBuiltins re-exported from DB-free runtime-engine.ts; PrepComment expectation fixed. 163/163 kitchen tests pass; api+runtime typecheck GREEN. Commits 09e34a3b7 + 12e0b3ed4, tag v0.12.57. |
| 2026-06-04 | **Repaired 30 test-drift failures (4 files) + 1 Edge-safety bug** | Full `pnpm --filter api test` was 82 failed → 67 failed (remaining are shipment routes + payment-env, below). Fixes: (A) `manifest-runtime-factory.test.ts` — loadManifests mock now exports `loadMergedPrecompiledIR` (factory L251 calls it when no irPath); (B) `board-crud.test.ts` — 5 create mock runtimes now expose `createInstance`/`getInstance` (legacy `executeManifestCommand` create path seeds via `createInstance`, handler L149); (C) `kitchen-task-query-shape.test.ts` — expectation corrected to `tags: { has }` (KitchenTask.tags is `String[]`, schema:326; route was already correct); (D) `accounting/payments/route.ts` — added `export const runtime = "nodejs"` (uses createManifestRuntime; Node-only), fixing `manifest-runtime-node.invariant.test.ts`. API typecheck still 0. No regressions. |
| 2026-06-04 | **Dispatcher auth error handling: InvariantError → 401 (was 500)** | Canonical dispatcher route catches `InvariantError` from `requireCurrentUser()` and returns 401 instead of 500. Fixes auth-guard tests across all 189 entities. 5 shipment auth-guard tests green. |
| 2026-06-04 | **Task 0.2: Fix build.mjs broken path, stale compilerVersion, dead variable** | `pnpm manifest:build` completes all 4 steps. Line 170 path fixed (swapped segments), compilerVersion 0.3.8→2.2.0 in both build.mjs+compile.mjs, dead CODE_OUTPUT_DIR removed. |
| 2026-06-04 | **Producer-level InvariantError→401 auth fix** | Moved from generated dispatcher to `manifest/scripts/generate.mjs` (the producer) per constitution §10/§16. Fix now survives regeneration. |
| 2026-06-04 | **Task 0.6: 7 HIGH-priority source type mismatches fixed** | VendorContract (lastComplianceReview decimal→datetime, startDate/endDate number→datetime), ProcurementBudget (periodStart/periodEnd decimal→datetime), Client (tags string→array), CateringOrder (deliveryDate number→datetime), PurchaseOrderItem (quantityOrdered number→decimal, unitCost number→money), Driver (licenseExpiry number→datetime). IR recompiled: 189 entities, 952 commands. API+runtime typecheck GREEN. 2527/2527 tests pass (1 pre-existing env-var failure). |
| 2026-06-04 | **Task 0.6: 11 more source bugs fixed (event, contract, budget, role-policy, waste-entry)** | Event (eventDate/tags type fixes across 3 commands), EventContract (canceledBy property added + expiresAt fix), EventDish (quantity/sortOrder int fixes), EventGuest (rsvpDecline no longer overwrites notes), EventBudget (variancePercentage now computed, activates 3 constraints), RolePolicy (permissions array fix), WasteEntry (reasonId int fix). IR 189/952. All green. |
| 2026-06-04 | **Task 0.6: 8 more source bugs fixed (payroll, event, inventory, admin, chart-of-account)** | EventProfitability marginPct now computed via percent() builtin; Event dead properties (budget, ticketPrice, ticketTier, eventFormat) added to create/update commands; PayrollLineItem duplicate stub removed, canonical entity enhanced with commands + decimal-typed hours/rate; PayrollRun.reject no longer overwrites approvedBy; InventoryItem.totalValue money typed; AdminTask.dueDate datetime typed; ChartOfAccount.isLeaf renamed to isRoot. IR 189/952. All green. |
| 2026-06-04 | **Task 0.3: Create Prisma models for 16 IR entities** | 16 Prisma model declarations added to schema.prisma for: AiEventSetupSession, AutomatedFollowup, Budget, Deal, EntityVersion, EventWaitlistEntry, FacilitySchedule, FacilityWorkOrder, LogisticsDispatch, PerformancePrediction, SampleData, StaffPerformance, Vendor, VersionApproval, VersionedEntity, WorkforceOptimization. All match existing SQL tables from baseline migration. 0 typecheck errors, 0 drift, 2535 tests pass. |
| 2026-06-04 | **Task 2.8: Adopt timestamps modifier (ROOT FIX for datetime-as-number)** | All 189 entities use `timestamps` modifier. Net -1,202 lines of boilerplate removed (350 property declarations + 1041 mutate lines). createdAt/updatedAt auto-injected as readonly datetime. IR 189/952. All green. |
| 2026-06-04 | **Task 2.7: Fix 988 datetime-as-number occurrences across 90 manifest sources** | Event payload (923) and command param (69) timestamp fields changed from number to datetime across all domains. IR 189/952. API+runtime typecheck GREEN. 2535/2535 tests pass. |
| 2026-06-04 | **Task 2.4: ENTITY_DOMAIN_MAP consolidation** | 3 stale copies eliminated; generate-route-manifest.ts imports canonical 189-entry map; mcp-server re-exports; build.mjs delegates to compile.mjs. |
| 2026-06-05 | **Task 2.5 Phase 1-2: PrismaProjection pipeline verified and wired** | Two-phase pipeline: `derive-options` (173/189 matched, 154 full coverage) + `generate-schema` (258 models, prisma validate passes). Three pnpm scripts added: `manifest:derive-options`, `manifest:generate-schema`, `manifest:schema:full`. 16 accessor-override entities need remapping. Relations stripped (validation-only). Pipeline idempotent. API typecheck 0, 2574 tests pass. |
| 2026-06-05 | **Task 2.5 Phase 3: PrismaProjection pipeline completed for all 189 entities** | derive-prisma-options.mjs uses ENTITY_ACCESSOR_OVERRIDES for fallback lookup (173→188 matched). generate-full-schema.mjs deduplicates models sharing the same @@map table (5 generated + 2 infra-core removed). `prisma validate` passes with 251 models (184 unique IR entity models + 67 infra-core). Only QACheck unmatched (different concept from QualityCheck). |
| 2026-06-04 | **Task 2.6: Remove duplicate VendorContract** | Duplicate entry at line 226 removed from ENTITIES_WITH_SPECIFIC_STORES. |
| 2026-06-04 | **Task 0.4: ~104 relationship declarations across 60+ entities** | Expanded from 12 to ~104 declarations. Event pilot (27), kitchen (30), inventory (25), staff/logistics/CRM/finance/collections/facilities/command-board (37). |
| 2026-06-04 | **Task 7.4c: Audit/outbox middleware replaces telemetry-embedded outbox writes** | `createAuditOutboxMiddleware()` at `after-emit` hook persists emitted events to outbox. Factory telemetry hooks simplified to caller-provided hooks only. Outbox logic moved from post-hoc telemetry to engine lifecycle. 2560/2560 tests pass. |
| 2026-06-04 | **Task 10.4: Delete dead code (~4,971 LOC removed)** | rules-engine/ (5 files), entity-graph/ (7 files), packages/services/ all deleted. Zero consumers confirmed. Re-exports removed from index.ts. |
| 2026-06-04 | **Task 7.4a: RBAC middleware replaces Proxy-based permission guard** | `createRbacMiddleware()` registered as Manifest-native `before-guard` middleware. Factory no longer wraps engine in `createPermissionGuard` Proxy — returns raw engine with middleware pipeline. COMMAND_PERMISSION_MAP and AI_APPROVAL_COMMANDS preserved, allow-by-default behavior unchanged. 2560/2560 tests pass. API+runtime typecheck GREEN. |
| 2026-06-04 | **Task 7.4b: Identity middleware wired into lifecycle pipeline** | `createIdentityMiddleware` registered as Manifest-native `before-policy` middleware. Factory no longer pre-resolves user roles — role resolution runs inside the engine lifecycle where policies/guards can reference `context.userRole`. Legacy `resolveUserRole` function removed. Role policies always loaded for tenant (not gated on pre-resolved role). Duplicate VendorContract removed from ENTITIES_WITH_SPECIFIC_STORES. Pipeline order: identity (before-policy) → RBAC (before-guard) → audit/outbox (after-emit). 2560/2560 tests pass (1 pre-existing payment-env failure). API+runtime typecheck GREEN. Tag v0.12.73. |
| 2026-06-04 | **Task 7.1 + 7.2: Wire auditSink + outboxStore from upstream** | PostgresAuditSink + PostgresOutboxStore wired via singleton pg.Pool. Custom createAuditOutboxMiddleware removed from pipeline. Schema bootstrap (manifest_audit_records + manifest_outbox_entries) is idempotent. Graceful fallback when DATABASE_URL absent (test envs). Factory: auditSink and outboxStore passed as RuntimeOptions. 2560/2560 tests pass. API+runtime typecheck GREEN. |
| 2026-06-05 | **Task 10.5: Outbox consolidation — unsafe helper removed** | Bundle-claim route outbox events moved inside transaction (data loss risk eliminated). Unsafe standalone `createOutboxEvent` removed from shared-task-helpers (0 callers). 3 implementations → 2. API typecheck 0, 2574 tests pass. |
| 2026-06-05 | **Task 10.1: Legacy dead code already deleted** | Confirmed legacy 3,205-line manifest-runtime.ts was deleted in prior commit. 66-line re-export is thin wrapper. 0 legacy consumers remain. |
| 2026-06-05 | **Task 9.2: First 2 Manifest reactions implemented** | `on PaymentProcessed run Invoice.applyPayment` + `on PaymentRefunded run Invoice.recordRefund`. Cross-entity updates now flow through governed Manifest lifecycle instead of raw Prisma. IR: 2 reactions (was 0). API typecheck 0, 2574 tests pass. |
| 2026-06-05 | **Task 3.4: Store-level bug fixes (MenuPrismaStore + ShipmentPrismaStore)** | MenuPrismaStore uses toDecimalInput() (was raw new Prisma.Decimal). ShipmentPrismaStore status properly typed (was as any). AllergenWarning toCommaString confirmed alive. 2574 tests pass. |
| 2026-06-05 | **Task 0.6 + 9.2: Source bug fixes + 2 equipment maintenance reactions** | CollectionCase.dunningStage string→int (was NaN on arithmetic); Budget/LaborBudget number→money type fixes (9 param declarations); 2 new reactions: MaintenanceWorkOrderCompleted→Equipment.recordMaintenance + Equipment.updateStatus. IR: 189/952/936/7 reactions. API+runtime typecheck 0. 2574 tests pass. |
| 2026-06-05 | **Task 9.3 + 0.7: State transitions for 5 entities + searchable modifiers** | Added state machine enforcement to InventoryTransfer (4 rules), Proposal (3 rules), Lead (4 rules), PurchaseRequisition (4 rules), EventBudget (2 rules) — total 17 new transition rules across 5 entities. Added `searchable` modifier to 7 properties (Event.title, Client.companyName/notes, VendorCatalog.itemName, Lead.companyName/contactName/notes). IR: 49 entities with transitions (141 total rules). API+runtime typecheck 0. 2574 tests pass. Note: compiler v2.2.0 accepts `searchable` syntax but doesn't emit it to IR modifiers yet (forward-compatible source). |
| 2026-06-05 | **Task 9.3/9.7: State transitions for 10 entities + readonly audit fields** | 22 new transition rules across CycleCountSession (4), EventImportWorkflow (10), Budget (3), ClientInteraction (4), WasteEntry (2). Plus 7 readonly modifiers on audit fields (BankAccount.verifiedAt, ApiKey.hashedKey/keyPrefix, PayrollRun.approvedAt/approvedBy/paidAt, Payment.gatewayTransactionId). IR: 54 entities with transitions (163 total rules). 378 readonly properties from timestamps modifier. API+runtime typecheck 0. 2574 tests pass. |
| 2026-06-05 | **Task 9.3 COMPLETE: State transitions for 96 entities (256 rules)** | Added state machine enforcement to 30+ entities. Only 4 entities intentionally skipped (free-form status). Transition coverage: 96/100 status entities (96%). Fix: PrepList.createFromSeed draft→draft self-transition added. IR: 96 entities with 256 transition rules. API+runtime typecheck 0. 2574 tests pass. |
| 2026-06-05 | **Task 8.6 + Policy Binding Fix: `default policy` binds RBAC to ALL 952 commands** | ROOT CAUSE: 250 top-level policies were declared OUTSIDE entity blocks, so the compiler never bound them to IR commands (all 952 had `policies: []`). FIX: `default policy` syntax INSIDE entity blocks causes the compiler to auto-expand to every command. Added entity-specific `default policy <EntityName>DefaultAccess` to all 92 source files via `add-default-policies.mjs` script. Result: 952/952 commands have policies, 189/189 entities have `defaultPolicies`. 8 zero-policy files (invoice, payment, collections, etc.) now protected. API typecheck 0, 2574 tests pass. |

---

## Unwired RuntimeOptions (19 properties, 3 wired)

| Property | Purpose | Status | Tier |
|---|---|---|---|
| `storeProvider` | Entity -> Store factory function | WIRED | -- |
| `idempotencyStore` | Command idempotency dedup | WIRED (conditionally; routes don't pass key yet) | -- |
| `customBuiltins` | Plugin-provided expression builtins | WIRED | -- |
| `middleware` | Lifecycle hooks (before-guard, before-policy, before-action, after-emit) | NOT WIRED | 7.4 |
| `auditSink` | Durable audit record emission | **WIRED** (PostgresAuditSink, conditional on DATABASE_URL) | -- |
| `outboxStore` | Transactional event persistence | **WIRED** (PostgresOutboxStore, conditional on DATABASE_URL) | -- |
| `approvalStore` | Multi-stage approval persistence | NOT WIRED | 7.5 |
| `requireTenantContext` | Fail if tenantId absent | **WIRED** (line 466, manifest-runtime-factory.ts) | 7.3 ✅ |
| `flagProvider` | Feature flag resolver for `flag()` builtin | NOT WIRED | 7.6 |
| `jobQueue` | Async command execution | NOT WIRED | 7.6 |
| `profiling` | Per-phase command timing | NOT WIRED | 7.6 |
| `generateId` | Custom ID generator | NOT WIRED | 7.6 |
| `now` | Custom timestamp function | NOT WIRED | 7.6 |
| `deterministicMode` | Throw on effect boundaries | DEFINED in context, NOT FORWARDED by factory | 7.6 |
| `evaluationLimits` | Max expression depth/steps | DEFINED in context, NOT FORWARDED by factory | 7.6 |
| `requireValidProvenance` | IR integrity hash verification | NOT WIRED | 7.6 |
| `expectedIRHash` | Expected IR hash | NOT WIRED | 7.6 |
| `wasmEvaluator` | WASM expression evaluation | NOT WIRED | Future |
| `encryptionProvider` | Field-level encryption | NOT WIRED | Future |

---

## Available Projections (27 projection directories in @angriff36/manifest@2.2.0)

| Export Path | Purpose | Used? |
|---|---|---|
| `projections/nextjs` | Next.js route generation (list + detail) | YES -- active, generates routes |
| `projections/routes` | Route metadata/registry | YES -- produces `manifest/runtime/routes.manifest.json` |
| `projections/prisma` | Prisma schema model generation | PARTIAL -- pilot harness for 4 entities, not in CI |
| `projections/zod` | Zod input validation schemas | NO -- blocked (Phase 5 eval) |
| `projections/react-query` | React Query hooks | NO -- blocked (Phase 5 eval) |
| `projections/openapi` | OpenAPI spec generation | NO -- blocked (Phase 5 eval) |
| `projections/drizzle` | Drizzle ORM schema | NO -- zero references |
| `projections/mermaid` | Mermaid diagram generation | NO -- zero references |
| `projections/llm-context` | Structured JSON for LLM agent injection | NO -- candidate for MCP server (Task 5.7) |
| `projections/materialized-views` | PostgreSQL materialized view DDL | NO -- candidate for reporting (Task 5.8) |
| `projections/health` | K8s health check endpoints | NO -- zero health infra exists (Task 5.9) |
| `projections/graphql` | Full SDL + resolver stubs | NO -- not evaluated |
| `projections/analytics` | Typed tracking event schemas | NO -- zero analytics instrumentation (Task 5.10) |
| `projections/dart` | Dart/Flutter model generation | NO -- not evaluated |
| `projections/dynamodb` | DynamoDB table definitions | NO -- not evaluated |
| `projections/elasticsearch` | Elasticsearch index mappings | NO -- not evaluated |
| `projections/hono` | Hono framework routes | NO -- not evaluated |
| `projections/jsonschema` | JSON Schema output | NO -- not evaluated |
| `projections/kysely` | Kysely ORM types | NO -- not evaluated |
| `projections/mongoose` | Mongoose ODM schemas | NO -- not evaluated |
| `projections/pydantic` | Pydantic model generation | NO -- not evaluated |
| `projections/remix` | Remix framework routes | NO -- not evaluated |
| `projections/storybook` | Storybook story generation | NO -- not evaluated |
| `projections/sveltekit` | SvelteKit routes | NO -- not evaluated |
| `projections/terraform` | Terraform infrastructure definitions | NO -- not evaluated |
| `projections/shared` | Shared projection utilities | Internal |
| `projections/express` | Express.js route generation | NO -- not evaluated |

**Other package exports available but unused (39 total, only 4 actively used = 10.3%):** compiler, ir-compiler, audit/postgres (PostgresAuditSink with ON CONFLICT DO NOTHING idempotency), audit/memory, outbox/postgres (production-grade with FOR UPDATE SKIP LOCKED), outbox/memory, approval/postgres, approval/memory, agent-sdk (generates AI tool definitions from IR: toAnthropicTools, toOpenAITools, toVercelAITools, listEntities, describeEntity, findMatchingCommands, irTypeToJsonSchema), ir-diff (structured diff + breaking change classification + migration DDL generation), breaking-change (PR gating with breaking-change detection), wasm, profiling (per-phase timing for 13 execution phases with toFlameGraph), plugin-api, plugin-loader, multi-compiler, module-resolver, parser, lexer, types, config, stores, ir, ir-version-store, registry/emit, **federation** (multi-service mesh: FederationRegistry, FederationClient, buildDescriptor, policy bridge, HTTP adapter generation), **compression** (binary IR serialization: compressIR/decompressIR, 60-80% size reduction, lossless roundtrip), **projections** (top-level projection utilities), **audit** (top-level audit utilities), **outbox** (top-level outbox utilities), **approval** (top-level approval utilities). Prisma projection uses dist-path bypass instead of canonical export.

---

## Known Blockers & Gotchas

1. **Bootstrap constraint gotcha (MOSTLY RESOLVED):** Upstream 1.7.0 fixed the core issue. Edge cases may remain for entities with unusually complex constraint blocks.

2. **~~16 IR entities have no Prisma model~~ RESOLVED 2026-06-04:** All 16 entities now have Prisma model declarations matching their SQL tables from the baseline migration. Additionally ~14 entities have models but wrong accessor names needing overrides (handled by ENTITY_ACCESSOR_OVERRIDES in Task 0.1).

3. **No store projection in the package:** Capsule must use GenericPrismaStore or build a codegen step.

4. **Upstream accessor derivation is naive:** The nextjs projection uses `camelCase(entityName)` with zero model validation. Fix is in our producer.

5. **Generated client has 0 consumers and is effectively dead:** 1,330 functions, zero files import from it. Decision needed in Tier 6.

6. **Non-transactional writes in payroll:** `savePayrollRecords()` can leave partial state.

7. **manifest.config.yaml not consumed by scripts:** File is descriptive/forward-looking. 6 hardcoded values in `generate.mjs` should come from config.

8. **Relationship gap: ~104 declarations across 60+ entities (was 12 across 8):** Event, kitchen, inventory, staff/logistics/CRM/finance/collections/facilities/command-board domains covered. Some lower-priority entities with FKs to non-IR targets still lack relationship blocks.

9. **ENTITY_DOMAIN_MAP: ✅ DONE — all 3 stale copies eliminated (2026-06-04).** Canonical `entity-domain-map.mjs` covers ALL 189 entities. `generate-route-manifest.ts` now imports canonical (was 90 entries with wrong Event mapping). `packages/mcp-server` re-exports from canonical. `build.mjs` delegates to `compile.mjs`. No remaining copies.

10. **Only 1 saga, 7 reactions defined (was 0):** 936 events available for reaction-driven side effects.

11. ~~Custom outbox duplicates upstream~~ RESOLVED 2026-06-04: PostgresOutboxStore from upstream replaces custom implementation. `createPrismaOutboxWriter` still exists for PrismaStore-level writes but is separate from the Manifest-level adapter.

12. **Idempotency store deliberately disabled:** Generated routes do not pass `idempotencyKey`, so the store would reject commands.

13. **VendorContract duplicate in ENTITIES_WITH_SPECIFIC_STORES:** ✅ DONE — duplicate removed (2026-06-04).

14. **`as any` casts in runtime factory:** 6 casts. prismaForWrites/prismaForLookups/outboxWriter are cast `as any` in dependency injection.

15. **Mixed schema naming conventions:** 195 PascalCase models coexist with 31 legacy snake_case models. 4 PascalCase @@map values deviate from snake_case convention.

16. **describe.skip in sales-reporting tests:** Entire test suite disabled. Unknown if feature is unimplemented or test is broken.

17. **compile.mjs workaround:** Uses programmatic API instead of CLI due to a `--glob` bug.

18. **Payroll entity naming mismatch:** Payroll engine writes to `payrollAuditLog` but Manifest only knows about `PayrollApprovalHistory`.

19. **EventStaff / EventStaffAssignment duplicate entities:** Both exist in IR with overlapping purpose. Both have separate Prisma models. Must consolidate or differentiate.

20. **~~Legacy manifest-runtime.ts (3,205 lines) is dead code~~ RESOLVED (prior session):** Deleted in commit `147091035`. 66-line re-export is thin wrapper. No legacy consumers remain.

21. **Permission guard is whitelist-based, not deny-by-default:** Commands NOT in `COMMAND_PERMISSION_MAP` pass through unrestricted. (Proxy replaced by middleware in Task 7.4a — middleware uses same map)

22. **API shim is 376 lines, not a thin wrapper:** Contains additional runtime construction logic.

23. **~~EventBudget.variancePercentage never computed~~ RESOLVED 2026-06-04:** Converted from stale property (always 0) to computed using `percent()` builtin. 3 previously ineffective constraints now active.

24. **Rules engine middleware factory never called:** Complete rules engine at `manifest/runtime/src/rules-engine/` is exported but never imported or wired.

25. **Entity graph returns empty graph:** `buildGraphFromIR()` needs IR relationships to populate. Module exists but produces no useful output.

26. **Manifest vNext features available but unused:** ~~defaultPolicies~~ (RESOLVED 2026-06-05, Task 8.6 — all 189 entities use defaultPolicies), command-level constraints, constraint severity/codes, overrideable constraints, entity concurrency, state transitions (96 entities now have transitions) -- all defined in spec.

27. **~~CateringOrder transition property mismatch~~ RESOLVED 2026-06-04:** `transition status` references wrong property name (`status` vs `orderStatus`). ALL state machine enforcement silently broken.

28. **~~VendorContract blockModifyActive prevents ALL mutations~~ RESOLVED 2026-06-04:** Entity-level block constraint was firing on every command that mutates `status` while active, including legitimate lifecycle commands. Fixed by moving to command-scoped guards.

29. **~~RecipeVersion totalTimeMinutes hardcoded to 0~~ RESOLVED 2026-06-04:** Prep time reporting broken. Now correctly computed.

30. **~~Ingredient recordLot drops expiresAt~~ RESOLVED 2026-06-04:** Lot expiry tracking non-functional. Now persists `currentLotExpiresAt`.

31. **~~build.mjs line 170 has BROKEN PATH~~ RESOLVED 2026-06-04:** References `scripts/manifest/generate-route-manifest.ts` which doesn't exist. Fixed path segments.

32. **~~compilerVersion "0.3.8" is stale~~ RESOLVED 2026-06-04:** Updated to 2.2.0 in both build.mjs and compile.mjs.

33. **manifest.config.yaml is ENTIRELY DECORATIVE:** 148 lines of config, zero scripts read it.

34. **PayrollLineItem has ZERO commands:** Declared `store ... in durable` but no command exists. All writes bypass runtime.

35. **notifications package has 9+ direct DB writes** across 4 files -- not listed in prior governance audit.

36. **152 entities with FK properties but NO relationship blocks:** Far larger than initial "21 event-domain" estimate. 563/611 computed properties have empty dependencies. irHash and contentHash are empty (no IR integrity verification).

37. **39 export paths in @angriff36/manifest, only 4 actively used (10.3%):** Major unused features include Reactions, Sagas, Approvals, State Transitions, Entity Concurrency, Webhooks, Roles, Enums, Value Objects, Async Commands, WASM evaluator, Encryption, Feature Flags, Profiling, Agent SDK, Plugin system.

38. **Permission guard allow-by-default (SECURITY):** Only 9/189 entity types have RBAC entries (28 command entries total). 180/189 bypass all permission checks. 3 bypass paths. Task 9.9.

39. **~~559+ datetime-as-number source mismatches (UNIVERSAL)~~ RESOLVED 2026-06-04 (Task 2.7/2.8):** Task 2.7 fixed 988 datetime-as-number occurrences across 90 manifest sources. Task 2.8 adopted `timestamps` modifier for all 189 entities (-1,202 lines of boilerplate). All event payload timestamps now correctly typed `datetime`.

40. **~~3 outbox implementations~~ RESOLVED 2026-06-05 (Task 10.5):** Unsafe kitchen helper removed. 2 implementations remain (canonical tx-safe + manifest batch writer). Bundle-claim route now uses transactional outbox.

41. **27 projections available (not 9, not 25):** 12 NOT in prior plan: dart, dynamodb, elasticsearch, hono, jsonschema, kysely, mongoose, pydantic, remix, storybook, sveltekit, terraform. Tasks 5.7-5.10.

42. **Rules engine + entity graph dead code (~2400 LOC, 0 consumers):** Both exported but never imported. Entity graph is a stub. Rebuild or delete. Tasks 7.5, 9.1, 10.4.

43. **Payroll-engine 100% disconnected from Manifest:** Sets invalid status values, constructor strips `$transaction`, zero Manifest awareness. Task 8.1.

44. ~~**Legacy manifest-command-handler.ts coexists with canonical execute-command.ts:**~~ RESOLVED 2026-06-04 (Task 10.13). Legacy handler deleted, all routes migrated to canonical execute-command.ts.

45. **Universal domain-level source bugs beyond datetime:** PurchaseOrderItem (number->decimal/int/money), InventoryItem.totalValue (number instead of money), Client.defaultPaymentTerms (number into decimal), AdminTask.dueDate (string instead of datetime), PayrollPeriod.isLeaf (inverted logic), EmployeeAvailability.dayOfWeek (number vs string comparison). Task 0.6.

46. **generate-route-manifest.ts covers only 90/189 entities:** 99 entities missing from route generation map. Event mapped as "manifest/Event" vs canonical "events/event". Task 2.4.

47. **~~prisma-projection-options.mjs EventStaff table wrong~~ RESOLVED 2026-06-05:** Task 2.5 Phase 3 — derive-prisma-options.mjs now uses ENTITY_ACCESSOR_OVERRIDES for fallback lookup. 188/189 entities matched.

48. **generate-all-routes.mjs orphaned:** No package.json script entry. Completely unreachable from standard workflow. Task 0.2.

49. **build.mjs duplicates compile.mjs logic:** Design debt. Also has dead `CODE_OUTPUT_DIR` variable declared but unused. Task 0.2.

50. **Manifest advanced features with zero adoption:** Async Commands, Feature Flags, Mixin Composition, Scheduled Commands, Entity Property Modifiers (encrypted/masked/searchable) -- all fully implemented in the package but unused. Tasks 11.1-11.4, 9.7.

51. **`timestamps` entity modifier prevents datetime-as-number recurrence:** Official docs confirm auto-injection of createdAt/updatedAt with proper datetime types, runtime population, and Prisma projection. Zero adoption. Root fix for 559+ bug class. Task 2.8.

52. **Federation export completely undiscovered:** `@angriff36/manifest/federation` provides full multi-service runtime mesh. Not in plan's export list. Low priority (monolith) but should be tracked. Task 12.1.

53. **`realtime` entity modifier enables SSE without infrastructure:** Auto-generates SSE endpoints and React hooks. Zero realtime infrastructure exists. Would replace 1,092 polling apiFetch calls for critical entities. Task 9.10.

54. **Computed caching available but premature for 92% of computed properties:** 563/611 computed properties have empty dependencies -- caching without correct dependencies would mask bugs. Start with the 48 that DO have dependencies. Task 9.11.

55. **CLI has 40 commands, plan said 35-37:** 5 additional commands discovered: `init`, `install-hooks`, `validate-ai`, `preflight`, `scan`, `harness`, `mock`, `docs`, `duplicates`, `runtime-check`, `cache-status`, `versions`, `routes`, `inspect`, `load-test`. Task 9.15 (expanded from 9.6).

56. **Package has 39 exports, plan said 38:** Additional exports: `federation`, `compression`, `projections` (top-level), `audit` (top-level), `outbox` (top-level), `approval` (top-level), `wasm`. `./express` projection directory exists but has no export.

57. **Event payloads use `number` for ALL timestamps (root cause of datetime-as-number in events):** `now()` returns epoch-ms (number). All 936 events carry timestamp fields as `number` (916 total). Entity properties are `datetime` (741). The mismatch is in the event emission layer. `timestamps` modifier fixes createdAt/updatedAt but not custom timestamp fields in events. Task 2.7 source fixes remain necessary.

58. **compilerVersion in IR provenance is `0.3.8` despite package 2.2.0:** Provenance records useless. `irHash` and `contentHash` also empty. `requireValidProvenance` would fail if wired.

59. **Rate Limiting and Command Retry Policy are Manifest DSL features with zero adoption:** `rateLimit { window, maxRequests, scope, strategy }` and `retry { maxAttempts, backoff, initialDelay, maxDelay, jitter }` are available in the DSL but no `.manifest` source uses them. Task 11.5, 11.6.

60. **116 features planned across v1.9-v1.12 (27 shipped, 76 unreleased):** Major upcoming capabilities: Seed Data Generator, Default-Deny Policy, Soft Delete Pattern, Pagination API, CQRS Read Model, Notification Channels, OpenTelemetry Metrics. Task 11.8.

61. **ENTITY_ACCESSOR_OVERRIDES needs 33 entries (currently 2):** 12 accessor name mismatches + 3 renamed models + 16 route drops = 31 new entries needed. Without the complete map, 30 entities produce broken generated routes. Task 0.1.

62. **Task 12.2 MCP Server verification RESOLVED:** MCP Server is a CONFIRMED separate export (`@manifest/mcp-server`, 4 tools). Task 12.2 updated from "NEEDS VERIFICATION" to "CONFIRMED".

63. **Security features docs URL is WRONG:** `/features/security-features` returns 404. Rate limiting, retry policies, and masking are distributed across command-level and entity-level doc pages. Task 11.5 and 11.6 doc references corrected.

64. **Profiling is a SEPARATE EXPORT, not just RuntimeOption:** `@angriff36/manifest/profiler` is standalone, not a boolean flag. Task 7.6 `profiling` entry is incomplete without wiring the export (Task 7.9 added).

65. **Tenant isolation is TWO layers, plan only covers one:** IR-level declaration (`tenant tenantId: string from context.tenantId`) + RuntimeOption (`requireTenantContext: true`). Task 7.3 only addresses RuntimeOption. IR declaration needed in source files.

59. **Rate Limiting and Command Retry Policy are Manifest DSL features with zero adoption:** `rateLimit { window, maxRequests, scope, strategy }` and `retry { maxAttempts, backoff, initialDelay, maxDelay, jitter }` are available in the DSL but no `.manifest` source uses them. Task 11.5, 11.6.

60. **116 features planned across v1.9-v1.12 (27 shipped, 76 unreleased):** Major upcoming capabilities: Seed Data Generator, Default-Deny Policy, Soft Delete Pattern, Pagination API, CQRS Read Model, Notification Channels, OpenTelemetry Metrics. Task 11.8.

---

## TIER 0 -- FIX TYPECHECK BASELINE & RELATIONSHIP MODELING

> **Why:** 80 typecheck errors block deploy. 72 are in generated files (fix the generator). 16 IR entities lack Prisma models. Only 8/189 entities have relationships (152 entities with FK properties but no relationship blocks). Source-level bugs across ALL domains produce incorrect runtime behavior. This is the single most important blocking tier.

### 0.1 Categorize and fix the 80 typecheck errors via generator changes — ✅ DONE 2026-06-04
- **RESOLVED:** `pnpm --filter api typecheck` exits 0 (was 80). `pnpm --filter manifest-runtime typecheck` exits 0. Generator is idempotent (drift gate: byte-identical diff hash across consecutive `pnpm manifest:generate` runs). All 71 generated-file errors fixed at the producer; all 9 hand-written errors fixed in source.
  - **Producer fix** (`manifest/scripts/entity-domain-map.mjs` + `generate.mjs`):
    - `ENTITY_ACCESSOR_OVERRIDES` expanded from 2 → 33 entries: 14 remaps (12 TS2551 "Did you mean" accessors + BankAccount→employeeBankAccount + LogisticsRoute→deliveryRoute, both verified same-concept via store headers + schema) and 17 drops (`null`): the 16 no-model entities **plus QACheck**. **QACheck deviates from the plan** (which said remap→qualityCheck): store-header/source verification showed `QACheck` (inspection task: result pass/fail/na, reinspectedAt) is a DIFFERENT concept from Prisma `QualityCheck` (QC session with itemized children, status passed/failed). Remapping would invent semantics over a mismatched table (constitution §10), so it is DROPPED. Revisit in Task 0.3 if a real table is created.
    - NEW `ENTITY_FIELD_OVERRIDES` + `applyFieldOverrides()` post-process: rewrites phantom `where: { tenantId }`→`{ tenant_id: tenantId }` (TS2561) and `orderBy: { createdAt }`→`created_at` (TS2353) for 15 legacy raw-snake_case models, and removes the `orderBy` clause for 2 models with no created-at column (ForecastInput, InventoryForecast).
    - NEW `ENTITY_DETAIL_DROP` set: drops ONLY the by-id detail route for entities whose Prisma model has no single-column `id` (TaskBundleItem → composite PK `[tenant_id, bundle_id, task_id]`); the list route is kept.
  - **Regen result:** 30 accessor rewrites, 32 field rewrites, 30 routes dropped. **49 generated route files modified, 30 deleted.**
  - **Hand-written fixes (9 errors, 7 files):** 4 shipment files `.signatureData`→`.signature` (TS2551, Prisma field renamed); 2 kitchen task files `tags: { contains }`→`tags: { has }` (TS2322, String[] list filter); 1 payroll-engine `JSON.parse` on a Prisma Json column → typeof-narrowed cast handling both string-encoded and object-stored values (TS2345).
- **Done when:** `pnpm --filter api typecheck` returns 0 errors. Generator changes fix all 72 generated-file errors. The 8 hand-written file errors are fixed in their source files.
- **Why:** ROOT CAUSE -- The route generator's naive accessor derivation produces broken `database.*` calls across 3 systematic bug classes. Detailed breakdown (11th revision corrected):
- **Backpressure:** `pnpm --filter api typecheck 2>&1 | tee typecheck-baseline.txt` returns exit code 0.
- **Source to change:** `manifest/scripts/generate.mjs`, `manifest/scripts/entity-domain-map.mjs` (ENTITY_ACCESSOR_OVERRIDES), hand-written files for the 8 non-generated errors.
- **Subtasks:**
  - [ ] Fix 32 missing-model errors (TS2339): 16 entities have no Prisma model (drop routes). 3 entities have renamed models needing accessor overrides: BankAccount→employeeBankAccount, LogisticsRoute→deliveryRoute, QACheck→qualityCheck. Route-drop list (16): Deal, AiEventSetupSession, AutomatedFollowup, EntityVersion, EventWaitlistEntry, FacilitySchedule, FacilityWorkOrder, LogisticsDispatch, PerformancePrediction, SampleData, StaffPerformance, VersionApproval, VersionedEntity, WorkforceOptimization, Budget, Vendor.
  - [ ] Fix 28 wrong-accessor errors (TS2551): 12 entities need accessor name overrides. Complete ENTITY_ACCESSOR_OVERRIDES map (33 entries total): Document→documents, SmsAutomationRule→sms_automation_rules, EventTimelineItem→eventTimeline, StorageLocation→storage_locations, BulkCombineRule→bulk_combine_rules, MethodVideo→method_videos, PrepListImport→prep_list_imports, QACorrectiveAction→correctiveAction, QATemperatureLog→temperatureLog, TaskBundleItem→task_bundle_items, TaskBundle→task_bundles, OpenShift→open_shifts (accessor overrides); BankAccount→employeeBankAccount, LogisticsRoute→deliveryRoute, QACheck→qualityCheck (renamed models); 16 route drops (see above).
  - [ ] Fix 9 wrong-orderBy errors (TS2353): `createdAt` emitted but Prisma field is `created_at` (7 entities: EventFollowup, ReorderSuggestion, ActionMilestone, DisciplinaryAction, OnboardingCompletion, OnboardingTask, PerformanceReview) or absent (2 entities: ForecastInput, InventoryForecast). Generator must read actual Prisma field names.
  - [ ] Fix 6 wrong-field-in-where errors (TS2561): `tenantId` should be `tenant_id` in where inputs for 6 entities (PerformanceReview, OnboardingTask, OnboardingCompletion, EventFollowup, DisciplinaryAction, ActionMilestone). These models use raw snake_case fields without @map.
  - [ ] Fix 4 kitchen task hand-written errors (TS2322): `tags: { contains: string }` → `tags: { has: string }` for `String[]` fields in 2 files.
  - [ ] Fix 4 shipment hand-written errors (TS2551): `signatureData` → `signature` in 4 files (shipments/route.ts, [id]/route.ts, [id]/status/route.ts, [id]/helpers.ts).
  - [ ] Fix 1 payroll-engine hand-written error (TS2345): Add type narrowing for Json→string in PrismaPayrollDataSource.ts:191.

### 0.2 Fix build.mjs broken path, stale compilerVersion, and orphaned scripts — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** All three issues fixed: (1) build.mjs line 170 broken path fixed — swapped segments from `scripts/manifest/generate-route-manifest.ts` to `manifest/scripts/generate-route-manifest.ts`; (2) compilerVersion updated from `0.3.8` to `2.2.0` in both `build.mjs` and `compile.mjs`; (3) dead `CODE_OUTPUT_DIR` variable removed from `build.mjs`. `pnpm manifest:build` completes all 4 steps. Producer-level InvariantError→401 fix moved to `generate.mjs` per constitution §10/§16 so it survives regeneration.
- **Why:** Line 170 of `manifest/scripts/build.mjs` references `scripts/manifest/generate-route-manifest.ts` which does not exist. Correct path is `manifest/scripts/generate-route-manifest.ts`. Step 3 of build pipeline fails at runtime. Also `compilerVersion: "0.3.8"` is stale vs installed 2.2.0. Additionally: `generate-all-routes.mjs` is orphaned (no package.json entry at all); `build.mjs` has dead `CODE_OUTPUT_DIR` variable declared but unused; `build.mjs` duplicates `compile.mjs` logic instead of delegating (design debt).
- **Backpressure:** `pnpm manifest:build` succeeds through all steps. All scripts reachable via `package.json` or removed.
- **Source to change:** `manifest/scripts/build.mjs` (line 170 path fix + line 96 version fix + remove dead CODE_OUTPUT_DIR + delegate to compile.mjs instead of duplicating), `package.json` (add entry for generate-all-routes.mjs or remove it).

### 0.3 Create Prisma models for the 16 IR entities without tables — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** All 16 entities now have Prisma model declarations in `packages/database/prisma/schema.prisma`. Models match the existing SQL tables from the baseline migration: PascalCase column names (no @map needed), TEXT type IDs (no @db.Uuid), public schema, composite @@id([tenantId, id]). `"public"` added to datasource schemas array. `prisma validate` passes, `prisma generate` succeeds, `db:check` reports zero drift, `api typecheck` exits 0, 2535/2535 tests pass (1 pre-existing payment-env failure). Baseline migration applied to create the tables in the database.
- **Done when:** All 189 IR entities have a corresponding Prisma model. `pnpm manifest:try-prisma <Entity>` succeeds for all entities.
- **Why:** These entities exist in the IR with commands, events, and constraints but have no database table. Generated routes for them produce runtime errors.
- **Backpressure:** `pnpm manifest:try-prisma` succeeds for all 189 entities with zero errors.
- **Source to change:** `packages/database/prisma/schema.prisma` + `pnpm db:dev -- --create-only --name add_missing_entity_tables`
- **Validation:** `pnpm db:check` shows zero drift.
- **Full list of 16 entities (CORRECTED from 23):** AiEventSetupSession, AutomatedFollowup, Budget, Deal, EntityVersion, EventWaitlistEntry, FacilitySchedule, FacilityWorkOrder, LogisticsDispatch, PerformancePrediction, SampleData, StaffPerformance, Vendor, VersionApproval, VersionedEntity, WorkforceOptimization.
- **Note:** 7 entities previously in this list now have Prisma models: BankAccount (→EmployeeBankAccount), EventImportWorkflow (→EventImport), EventTimelineItem (→EventTimeline), LogisticsRoute (→DeliveryRoute), QACheck (→QualityCheck), QACorrectiveAction (→CorrectiveAction), QATemperatureLog (→TemperatureLog). These 7 need ACCESSOR OVERRIDES instead (see Task 0.1).

### 0.4 Model relationship declarations in .manifest sources
- **✅ DONE 2026-06-04 (pilot + expansion).** ~104 relationship declarations now exist (was 12). Event domain pilot (27 declarations across 19 entities), then expanded to kitchen (30, 21 entities), inventory (~25), staff/logistics/CRM/finance/collections/facilities/command-board (37). FK properties verified against source before each addition. Entities with FKs pointing to non-IR targets (e.g., Location, Employee, Unit) intentionally skipped. IR compiles: 189 entities, 952 commands. API+runtime typecheck: 0 errors.
- **Done when:** All junction entities and relation-carrying entities have `relationship` blocks. The top 60+ high-priority entities are now covered. Some lower-priority entities with FK properties pointing to non-IR targets may still benefit from relationships if those targets are later added to the IR.
- **Minimum required relationships:**
  - Event: belongsTo Client (via clientId), hasMany EventStaff, hasMany EventBudget, hasMany EventGuest, hasMany EventDish, hasMany EventFollowup, hasMany EventTimelineItem, hasMany EventReport, hasMany EventContract, hasOne EventProfitability, hasOne EventSummary
  - EventProfitability: belongsTo Event (via eventId)
  - EventSummary: belongsTo Event (via eventId)
  - BudgetLineItem: belongsTo EventBudget (via budgetId)
  - EventStaff: belongsTo Event (via eventId), belongsTo StaffMember (via staffMemberId)
  - EventStaffAssignment: belongsTo Event (via eventId), belongsTo StaffMember (via staffMemberId)
  - EventGuest: belongsTo Event (via eventId)
  - EventDish: belongsTo Event (via eventId), belongsTo Dish (via dishId)
  - EventContract: belongsTo Event (via eventId), belongsTo Client (via clientId)
  - ContractSignature: belongsTo EventContract (via contractId)
  - EventFollowup: belongsTo Event (via eventId)
  - EventReport: belongsTo Event (via eventId)
  - CateringOrder: belongsTo Event (via eventId)
  - Venue: referenced by Event but no relationship declared
- **Why:** Only 8/189 entities have relationships. **152 entities with FK properties lack relationship blocks** (far larger than initial "21 event-domain" estimate). This blocks: (a) PrismaProjection from emitting foreign keys and relation fields, (b) entity graph construction from IR, (c) cascade delete safety, (d) referential integrity in generated schema, (e) relationship traversal in expressions.
- **Backpressure:** `pnpm manifest:compile` succeeds with relationships. `pnpm manifest:try-prisma <JunctionEntity>` produces models with relation fields.
- **Source to change:** `manifest/source/event-*.manifest` and other source files with foreign key properties.

### 0.5 Route regen-diff harness
- **Done when:** A script snapshots current generated routes, runs `pnpm manifest:generate`, and diffs output. Exits 0 on clean regen, non-zero on drift.
- **Backpressure:** Intentionally break a generated route; harness catches it.
- **Source to change:** Extend `manifest/scripts/audit-schema-drift.mjs` or create a companion route-drift script.

### 0.6 Fix source-level bugs across manifest entities (ALL DOMAINS)
- **Done when:** All source bugs listed below are fixed. `pnpm manifest:compile` succeeds.
- **Why:** These bugs produce incorrect runtime behavior in production workflows. The 8th revision audit confirmed the pattern is UNIVERSAL -- every domain has datetime-as-number and type coercion bugs.
- **Backpressure:** Create entity, run affected commands, confirm correct state.
- **Source to change:** Multiple `.manifest` source files across all domains.
- **Subtasks:**
  - [x] **Kitchen task bugs**: `removeTag` and `addTag` fixed via `removeTagFromString` builtin. File: `manifest/source/kitchen-task-rules.manifest`. — ✅ DONE 2026-06-04
  - [x] **Event.create eventDate type**: Fixed: `eventDate: number` → `datetime` in create (L68), update (L88), updateDate (L174); guards `>0` → `!=null`. — ✅ DONE 2026-06-04
  - [x] **Event.create tags type**: Fixed: `tags: string` → `array<string>` in create (L68) and update (L88). — ✅ DONE 2026-06-04
  - [x] **EventBudget variance**: Fixed: `variancePercentage` converted from stale property (always 0) to computed using `percent(self.varianceAmount, self.totalBudgetAmount)` builtin. 3 previously ineffective constraints now active. — ✅ DONE 2026-06-04
  - [x] **EventBudget.update**: Resolved by variancePercentage becoming computed (no separate mutation needed). — ✅ DONE 2026-06-04
  - [x] **EventProfitability**: `budgetedGrossMarginPct` and `actualGrossMarginPct` now computed via `percent()` builtin. File: `manifest/source/event-rules.manifest` (profitability section). — ✅ DONE 2026-06-04
  - [x] **EventGuest.rsvpDecline**: Fixed: Added `declineReason` property; mutation changed from `notes = reason` to `declineReason = reason`. — ✅ DONE 2026-06-04
  - [x] **EventContract.cancel**: Fixed: Added missing `canceledBy: string` property; cancel command now persists it. — ✅ DONE 2026-06-04
  - [x] **BudgetLineItem.update**: bare `number` arithmetic into `money` property — fixed. File: `manifest/source/event-budget-rules.manifest`. — ✅ DONE 2026-06-04
  - [x] **EventContract expiresAt: number into datetime**: Fixed: `expiresAt: number` → `datetime` in create (L43) and update (L62). — ✅ DONE 2026-06-04
  - [x] **EventDish quantity: number into int**: Fixed: `quantity: number` → `int` and `sortOrder: number` → `int` in create, updateQuantity, updateCourse + event payloads. — ✅ DONE 2026-06-04
  - [x] **Event dead properties**: `budget`, `ticketPrice`, `ticketTier`, `eventFormat` added to create/update commands. Remaining decorative properties (`accessibilityOptions`, `featuredMediaUrl`, `locationId`, `venueId`, `venueEntityId`, `assignedTo`) kept as optional declarations. File: `manifest/source/event-rules.manifest`. — ✅ DONE 2026-06-04
  - [x] **CRITICAL: CateringOrder transition property mismatch**: Fixed: moved to command-scoped guards. File: `manifest/source/catering-order-rules.manifest:54-57`. — ✅ DONE 2026-06-04
  - [x] **CRITICAL: VendorContract blockModifyActive prevents ALL mutations**: Fixed: entity-level block constraint replaced with command-scoped guards. File: `manifest/source/vendor-contract-rules.manifest:57-62`. — ✅ DONE 2026-06-04
  - [x] **CRITICAL: RecipeVersion totalTimeMinutes hardcoded to 0**: Fixed: now computed from prep+cook+rest. File: `manifest/source/recipe-rules.manifest:105`. — ✅ DONE 2026-06-04
  - [x] **CRITICAL: Ingredient recordLot drops expiresAt**: Fixed: now persists `currentLotExpiresAt`. File: `manifest/source/ingredient-rules.manifest:135-152`. — ✅ DONE 2026-06-04
  - [x] **CRITICAL: VendorContract lastComplianceReview typed decimal but mutated to now()**: Fixed: `lastComplianceReview: decimal = 0` → `lastComplianceReview: datetime` in vendor-contract-rules.manifest:37. — ✅ DONE 2026-06-04
  - [x] **CRITICAL: ProcurementBudget periodStart/periodEnd type mismatch**: Fixed: `periodStart: decimal, periodEnd: decimal` → `datetime` in inventory-extended-rules.manifest:666; guard `periodStart > 0` → `periodStart != null`. — ✅ DONE 2026-06-04
  - [x] **HIGH: Client tags string-into-array mismatch**: Fixed: `tags: string` → `tags: array<string>` in client-rules.manifest create (L55) and update (L90). — ✅ DONE 2026-06-04
  - [x] **HIGH: PayrollLineItem has ZERO commands**: Duplicate stub in payroll-rules.manifest removed; canonical entity in staff-logistics-extended-rules.manifest enhanced with commands. File: `manifest/source/staff-logistics-extended-rules.manifest`. — ✅ DONE 2026-06-04
  - [x] **HIGH: PayrollRun reject overwrites approvedBy**: Fixed — `reject` no longer overwrites `approvedBy`. File: `manifest/source/payroll-rules.manifest:250-255`. — ✅ DONE 2026-06-04
  - [x] **HIGH: VendorContract startDate/endDate number into datetime**: Fixed: `startDate: number, endDate: number` → `datetime` in create (L65), update (L96), renew (L176); guard `startDate > 0` → `startDate != null`. — ✅ DONE 2026-06-04
  - [x] **HIGH: CateringOrder deliveryDate number into datetime**: Fixed: `deliveryDate: number` → `datetime` in create (L94) and scheduleDelivery (L182). — ✅ DONE 2026-06-04
  - [x] **HIGH: PayrollLineItem hours/rate typed as money**: Fixed — changed to decimal-typed in canonical entity. File: `manifest/source/staff-logistics-extended-rules.manifest`. — ✅ DONE 2026-06-04
  - [x] **HIGH: PurchaseOrderItem.create type mismatches**: Fixed: `quantityOrdered: number` → `decimal`, `unitCost: number` → `money` in create (L194) and update (L215). — ✅ DONE 2026-06-04
  - [x] **HIGH: Driver.licenseExpiry number into datetime**: Fixed: `licenseExpiry: number` → `datetime` in create (L44), update (L72), renewLicense (L89); guard `licenseExpiry > 0` → `licenseExpiry != null`. — ✅ DONE 2026-06-04
  - [x] **HIGH: InventoryItem.totalValue typed `number` instead of `money`**: Fixed — now correctly typed as `money`. File: `manifest/source/inventory-rules.manifest`. — ✅ DONE 2026-06-04
  - [x] **HIGH: AdminTask.dueDate typed `string` instead of `datetime`**: Fixed — changed to `datetime`. File: `manifest/source/admin-task-rules.manifest`. — ✅ DONE 2026-06-04
  - [ ] **MEDIUM: RecipeVersion tagCount hardcoded to 0**: Never counts actual tags. Needs cross-entity relationship. File: `manifest/source/recipe-rules.manifest`. — DEFERRED (needs cross-entity relationship)
  - [ ] **MEDIUM: Recipe hasVersion always returns true**: Never checks actual versions. Needs cross-entity relationship. File: `manifest/source/recipe-rules.manifest`. — DEFERRED (needs cross-entity relationship)
  - [x] **MEDIUM: Dish margin/marginPercent bare number arithmetic**: NOT A BUG — types are correct, already using money operands. — ✅ DONE 2026-06-04
  - [x] **MEDIUM: ChartOfAccount.isLeaf inverted logic (was in chart-of-account-rules.manifest, not payroll)**: Renamed to `isRoot` — `self.parentId == ""` correctly means root (no parent). File: `manifest/source/chart-of-account-rules.manifest`. — ✅ DONE 2026-06-04
  - [x] **MEDIUM: Client.defaultPaymentTerms `decimal` property but `number` params**: Already correctly typed as decimal. File: `manifest/source/client-rules.manifest`. — ✅ DONE 2026-06-04
  - [x] **MEDIUM: RolePolicy permissions default `'[]'` string into `array<string>`**: Fixed: property `string = "[]"` → `array<string> = []`; commands accept `array<string>`; computed uses `length()` instead of string comparison. — ✅ DONE 2026-06-04
  - [x] **MEDIUM: EmployeeAvailability.dayOfWeek as `number` but compared as string**: NOT A BUG — int is correct with 0-6 range validation. File: `manifest/source/employee-availability.manifest`. — ✅ DONE 2026-06-04
  - [x] **MEDIUM: WasteEntry.reasonId `int` property but `number` param**: Fixed: `reasonId: number` → `int` in create command. — ✅ DONE 2026-06-04

### 0.7 Resolve EventStaff / EventStaffAssignment duplicate
- **Done when:** Either (a) one entity is removed and the other absorbs all properties/commands, or (b) both are explicitly differentiated with documented justification.
- **Why:** Both IR entities serve the same domain (staff assignment to an event) with overlapping properties (eventId, staffMemberId, role, shift, status). Both have separate Prisma models (`event_staff` and `event_staff_assignments`). Creates confusion and data inconsistency risk.
- **Backpressure:** Single canonical entity handles all staff assignment use cases. `pnpm manifest:compile` succeeds.
- **Source to change:** `manifest/source/event-staff-rules.manifest`, `manifest/source/events-extended-rules.manifest`, possibly `packages/database/prisma/schema.prisma`.

---

## TIER 1 -- ROUTE ACCESSOR CORRECTNESS (DONE)

> **Status:** COMPLETE 2026-05-30. Phase-out-registry.md Section C confirms blast radius was exactly 2 entities.
>
> NOTE: Accessor correctness is DONE for the 2 proven drifted entities, but Tier 0.1 extends this to fix the remaining ~20 wrong-accessor errors + ~38 missing-model errors in generated files via a more robust generator fix.

---

## TIER 2 -- SCHEMA PROJECTION & GENERATOR FOUNDATIONS

> **Why:** ALL 189 entities are now durable. PrismaProjection can generate models for ALL of them. The 226-model `schema.prisma` is hand-authored and drifts from the IR.

### 2.1 Make the route generator accessor-aware from store layer
- **Done when:** Generator reads entity-to-Prisma-model mappings from `PRISMA_MODEL_METADATA`, not from a hand-maintained overrides map.
- **Why:** ROOT CAUSE -- Upstream nextjs projection derives accessors as `camelCase(entityName)` with zero validation. The post-process `resolveAccessor()` patch works but requires manual maintenance.
- **Backpressure:** Adding a new entity+table requires zero manual mapping updates.
- **Source to change:** `manifest/scripts/generate.mjs`.

### 2.2 Add ENTITIES_WITHOUT_TABLE filtering at projection time
- **Done when:** Generator drops routes for entities with no backing Prisma model.
- **Why:** ROOT CAUSE -- Upstream projection emits routes for ALL entities regardless of table existence. ~30 of the ~80 typecheck errors are from routes referencing non-existent Prisma models.
- **Backpressure:** Zero `database.<entity>.findMany is not a function` errors for tableless entities.
- **Source to change:** `manifest/scripts/generate.mjs`.

### 2.3 manifest.config.yaml script wiring
- **Done when:** `compile.mjs` and `generate.mjs` read from `manifest.config.yaml` instead of 6 hardcoded flags (`defaultIr`, `defaultOutput`, `commandsManifestPath`, `dispatcherDirInfo`, projection name, surface names). `build.mjs` line 170 broken path fixed. `compilerVersion "0.3.8"` updated to 2.2.0.
- **Why:** `manifest.config.yaml` is ENTIRELY DECORATIVE -- 148 lines of config but no scripts read it. Scripts pass explicit flags that override the config file. Additionally, `build.mjs:170` references `scripts/manifest/generate-route-manifest.ts` which doesn't exist (should be `manifest/scripts/generate-route-manifest.ts`). `compilerVersion` is stale at "0.3.8" vs installed 2.2.0.
- **Backpressure:** Removing hardcoded flags and relying on config produces identical output. `pnpm manifest:build` succeeds through all steps.
- **Source to change:** `manifest/scripts/compile.mjs`, `manifest/scripts/generate.mjs`, `manifest/scripts/build.mjs`.

### 2.4 ENTITY_DOMAIN_MAP consolidation — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** All 3 stale copies eliminated. `generate-route-manifest.ts` now imports canonical 189-entry map (was 90); Event mapping fixed from "manifest/Event" to "events/event". `packages/mcp-server/src/lib/entity-domain-map.ts` re-exports from canonical. `build.mjs` delegates to `compile.mjs` instead of duplicating logic (net -327 lines). New `entity-domain-map.d.mts` type declaration for TS resolution. All typechecks green.
- **Done when:** Single canonical source. `generate-route-manifest.ts`, `packages/mcp-server/src/lib/entity-domain-map.ts`, and `build.mjs` all import from `entity-domain-map.mjs`. Event mapping divergence fixed (generate-route-manifest.ts maps Event as "manifest/Event" vs canonical "events/event"). generate-route-manifest.ts expanded from 90 to 189 entries.
- **Why:** Canonical `entity-domain-map.mjs` now covers all 189 entities (COMPLETE). The stale copies in `generate-route-manifest.ts` (**90 entries of 189**, Event mapped as "manifest/Event"), `packages/mcp-server/src/lib/entity-domain-map.ts`, and `build.mjs` (duplicates compile logic) must be eliminated. Duplication causes subtle bugs when maps drift.
- **Backpressure:** `grep -r "ENTITY_DOMAIN_MAP" manifest/scripts/ packages/mcp-server/` shows only imports from canonical map. Event command routes resolve to correct paths.
- **Source to change:** `manifest/scripts/generate-route-manifest.ts`, `packages/mcp-server/src/lib/entity-domain-map.ts`, `manifest/scripts/build.mjs`.

### 2.5 Wire PrismaProjection to generate schema from IR — ✅ PHASE 1-3 DONE 2026-06-05
- **✅ PHASE 1-3 DONE 2026-06-05.** The PrismaProjection pipeline is complete for all 189 entities:
  - `pnpm manifest:derive-options` — Phase 1: Parses committed `schema.prisma`, cross-references with IR, produces `prisma-options.generated.json` with tableMappings, columnMappings, dbAttributes, fieldAttributes, precision, indexes, foreignKeys, multiSchema for all 189 entities.
  - `pnpm manifest:generate-schema` — Phase 2: Runs PrismaProjection with derived options, applies 6+ post-processing fix passes, assembles full schema with header + enums + generated models + infra-core pass-through, validates with `prisma validate`.
  - `pnpm manifest:schema:full` — Combined: derive + generate in one command.
  - **Phase 3 results:** derive-prisma-options.mjs now uses ENTITY_ACCESSOR_OVERRIDES for fallback lookup (173→188 matched). generate-full-schema.mjs deduplicates models sharing the same @@map table (5 generated + 2 infra-core removed). `prisma validate` passes with **251 models** (184 unique IR entity models + 67 infra-core). Only QACheck unmatched (different concept from QualityCheck).
  - **DISCOVERY: 5 pairs of IR entities map to the same Prisma table** (EventTimelineItem/EventTimeline, EventImportWorkflow/EventImport, QATemperatureLog/TemperatureLog, QACorrectiveAction/CorrectiveAction, LogisticsRoute/DeliveryRoute). These are the same pattern as EventStaff/EventStaffAssignment (Task 0.7). Pipeline deduplicates by keeping canonical entity.
  - **Remaining:** relations are stripped (validation-only output); CI drift gate not yet wired.
- **Done when:** `pnpm manifest:generate` produces Prisma models for all 189 durable entities. Generated schema includes proper field types, `@@map` directives, composite keys, and relationships. CI drift check compares generated vs committed.
- **Why:** ALL entities are now durable. The Prisma projection can finally emit all models. Pilot harness exists for 4 entities (RateLimitConfig, Event, StaffMember, EventStaff); needs expansion to all 189.
- **Backpressure:** `pnpm manifest:try-prisma` succeeds for all 189 entities. `pnpm db:check` shows zero drift.
- **Source to change:** `manifest/scripts/generate-prisma-schema.mjs`, `manifest/scripts/prisma-projection-options.mjs`.

### 2.6 Remove duplicate VendorContract from ENTITIES_WITH_SPECIFIC_STORES — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** Duplicate VendorContract entry at line 226 removed. Verified no other duplicates in ENTITIES_WITH_SPECIFIC_STORES.
- **Done when:** VendorContract appears exactly once in the set.
- **Why:** Duplicate entry at lines 199 and 226. Benign but indicates copy-paste drift.
- **Source to change:** `manifest/runtime/src/manifest-runtime-factory.ts`.

### 2.7 Fix manifest source type mismatches (559+ datetime-as-number occurrences -- UNIVERSAL) — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** All 988 datetime-as-number type mismatches fixed across 90 .manifest source files. Event payload timestamp fields (923) and command parameters (69) changed from `number` to `datetime`. Fields like `windowMs`, `duration`, `guestCount` were correctly left as numeric types. IR recompiled: 189 entities, 952 commands, 936 events. API typecheck: 0 errors. Runtime typecheck: 0 errors. 2535/2535 tests pass. One stale test expectation (preptask `claimedAt` expecting 0 instead of null) also fixed. Only pre-existing payment-create-idempotency env-var failure remains.
- **Done when:** `pnpm manifest:compile` produces zero type warnings. No datetime field mutated to literal `0`. No `number` param assigned to `datetime`/`decimal`/`money`/`int` property. No `string` param assigned to `array<string>` property.
- **Why:** 559+ event timestamp fields typed as `number` while entity property is `datetime` -- every event loses type safety at the boundary. Confirmed in EVERY domain: Finance, Payroll, Staff, Procurement, Notifications, Kitchen, Inventory, CRM, Logistics, Admin, Infra/Quality. Additionally: 9 datetime fields mutated to literal `0` instead of `null` for reset operations. Array<string> properties (Client.tags, ApiKey.scopes, RolePolicy.permissions) mutated from string param. CollectionCase.dunningStage arithmetic on string produces NaN. PurchaseOrderItem (number->decimal/int/money). Driver.licenseExpiry (number->datetime in 3 commands). AdminTask.dueDate (string instead of datetime).
- **Backpressure:** IR recompile shows all datetime fields with correct types.
- **Source to change:** ALL `.manifest` source files across every domain. This is the single most widespread source-level bug.
- **Subtasks:**
  - [ ] Fix datetime fields mutated to `0` -> mutate to `null` (9 occurrences across 7 source files)
  - [ ] Fix ALL event timestamp params from `number` to `datetime` (559+ occurrences)
  - [ ] Fix Client.tags, ApiKey.scopes, RolePolicy.permissions: change param type from `string` to `array<string>`
  - [ ] Fix CollectionCase.dunningStage: use integer type or conditional expression instead of string arithmetic
  - [ ] Fix PurchaseOrderItem.create: correct param types for quantityOrdered, unitId, unitCost
  - [ ] Fix Driver.licenseExpiry: correct param type from `number` to `datetime` in create/update/renewLicense
  - [ ] Fix AdminTask.dueDate: change from `string` to `datetime`
  - [ ] Fix Client.defaultPaymentTerms: change params from `number` to `decimal`
  - [ ] Fix InventoryItem.totalValue: change from `number` to `money`
  - [ ] Fix WasteEntry.reasonId: change param from `number` to `int`
  - [ ] Fix EmployeeAvailability.dayOfWeek: reconcile number vs string type

### 2.8 Adopt `timestamps` entity modifier to eliminate datetime-as-number at the root — ✅ DONE 2026-06-04
- **✅ DONE 2026-06-04.** All 189 entities across 92 source files now use the `timestamps` modifier. Hand-declared `createdAt`/`updatedAt` property declarations (350 lines) and `mutate createdAt/updatedAt = now()` lines (1,041 lines) removed — net -1,202 lines of boilerplate. 5 entities that previously had no timestamps (AlertsConfig, Invoice, Payment, PrepList/PrepListItem, SampleData, Recipe/RecipeIngredient/RecipeStep, MenuDish) now have the modifier. IR compiles: 189 entities, 952 commands. createdAt/updatedAt auto-injected as readonly datetime in IR. API typecheck: 0 errors. Runtime typecheck: 0 errors. 2535/2535 tests pass. Route generation idempotent.
- **Why:** **ROOT FIX for the entire datetime-as-number bug class.** The `timestamps` modifier auto-injects `createdAt` and `updatedAt` as readonly datetime properties. Runtime populates them via deterministic `getNow()` clock. Prisma projection translates to `@default(now())` and `@updatedAt`. Currently ZERO entities use this modifier -- all 189 hand-declare these fields, creating the entire 559+ occurrence bug class. Adopting `timestamps` eliminates the need for every entity to manually declare and type these fields correctly. It does NOT retroactively fix the 559 existing source-level number-to-datetime mismatches (Task 2.7 still needed), but it prevents recurrence and simplifies all future entity definitions.
- **Backpressure:** `pnpm manifest:compile` succeeds with `timestamps` modifier on all entities. Generated Prisma models have `@default(now())` + `@updatedAt`. Entity sources no longer contain hand-declared createdAt/updatedAt.
- **Source to change:** ALL 92 `.manifest` source files -- add `timestamps` modifier, remove hand-declared createdAt/updatedAt properties and their command mutations.
- **Doc:** Official docs `/language/timestamps`
- **Note:** This task should be executed IN PARALLEL with Task 2.7. The `timestamps` modifier handles createdAt/updatedAt automatically; Task 2.7 fixes the remaining domain-specific datetime fields (eventDate, dueDate, licenseExpiry, etc.) that are NOT covered by `timestamps`.

## TIER 3 -- GENERIC READ ROUTES & STORE STRATEGY

> **Why:** Constitution S6 says canonical route shape is `manifest/{entity}/...`. Zero generic read routes exist. The ~15,755 LOC store layer is 71/94 boilerplate that GenericPrismaStore could handle.

### 3.1 Add generic Manifest read routes
- **Done when:** `apps/api/app/api/manifest/[entity]/route.ts` and `manifest/[entity]/[id]/route.ts` exist and serve reads through the store layer.
- **Why:** Currently ALL reads go through per-entity generated routes that call `database.<entity>.findMany()` directly, bypassing the store layer.
- **Backpressure:** `GET /api/manifest/Event` returns paginated events through `storeProvider`.
- **Source to change:** New files at `apps/api/app/api/manifest/[entity]/route.ts` and `manifest/[entity]/[id]/route.ts`.

### 3.2 Store generation strategy decision
- **Done when:** Decision documented: GenericPrismaStore (exists, metadata-driven) vs codegen step. Audit confirmed 71 of 94 switch-case stores are pure boilerplate CRUD. 23 have custom logic.
- **Backpressure:** Decision document with trade-offs.
- **Source to change:** Analysis of `manifest/runtime/src/prisma-stores/` vs `generic-prisma-store.ts`.

### 3.3 GenericPrismaStore migration
- **Done when:** All 71 boilerplate switch-case entities use GenericPrismaStore. Only 23 stores with genuine custom logic retain specific implementations. `prisma-stores/broken-read-batch*.ts` files deleted.
- **Backpressure:** `pnpm --filter manifest-runtime typecheck` green; command roundtrip tests pass.
- **Source to change:** `manifest/runtime/src/prisma-store.ts` + `prisma-stores/` directory.
- **Note:** Retain `prisma-stores/shared.ts` coercion helpers until GenericPrismaStore has equivalent coercion.

### 3.4 Fix store-level bugs discovered in audit — ✅ PARTIALLY DONE 2026-06-05
- **✅ DONE 2026-06-05.** MenuPrismaStore: 4 `new Prisma.Decimal()` calls replaced with `toDecimalInput()` from shared helper. ShipmentPrismaStore: `as any` cast replaced with proper union type. AllergenWarningPrismaStore `toCommaString` confirmed NOT dead code (properly used). BattleBoardPrismaStore snake_case inconsistency remains (lower priority, cosmetic).
- **Why:** Store bugs found: (a) Shipment status cast bypasses type safety, (b) BattleBoard snake_case inconsistency, (c) dead code in AllergenWarning, (d) User/ShipmentItem in ENTITIES_WITH_SPECIFIC_STORES but no switch case (latent bugs), (e) MenuPrismaStore inconsistent Decimal usage.
- **Source to change:** `manifest/runtime/src/prisma-stores/` relevant files, `manifest/runtime/src/prisma-store.ts`.

---

## TIER 4 -- BOOTSTRAP CONSTRAINT FIX (DONE)

> **Status:** COMPLETE 2026-06-01. Upstream fix in @angriff36/manifest@1.7.0 resolved the core bootstrap constraint issue. `createInstance` now seeds proper defaults.
>
> NOTE: Edge cases may remain for entities with unusually complex constraint blocks.

---

## TIER 5 -- PROJECTION EVALUATION

> **Why:** 24 of 27 projections ship unused (excluding shared, nextjs, routes). Each could retire hand-written equivalents. Now that ALL entities are durable and IR is complete, projections have maximum coverage potential. 12 projections were NOT in the prior plan.

### 5.1 Evaluate Zod projection for input validation
- **Done when:** Generated Zod schemas compared against hand-written validation. Decision documented.
- **Backpressure:** `z.safeParse()` tests pass for sample command inputs.

### 5.2 Evaluate React Query projection for client hooks
- **Done when:** Generated hooks compared against 22 hand-written `use-*` modules. Decision documented.
- **Backpressure:** Generated hooks compile and work against the API.

### 5.3 Evaluate OpenAPI projection for API documentation
- **Done when:** OpenAPI spec generated covering all manifest routes. Validates in OpenAPI linter.

### 5.4 Evaluate Mermaid projection for architecture docs
- **Done when:** ER diagrams generated from IR covering all 189 entities with relationships.

### 5.5 Evaluate Routes projection for typed path builders
- **Done when:** Generated typed path builders compared against ~1,092 hardcoded `apiFetch("/api/...")` string paths across 167 files. Decision documented.
- **Why:** The `projections/routes` export produces canonical route manifests + typed path builders. 81% of API URLs are hardcoded strings (211 paths). Only ~50 typed path builders and 7 files use typed routes despite `routes.ts` having 218 lines of hand-maintained helpers.

### 5.6 Evaluate Drizzle projection as Prisma alternative
- **Done when:** Drizzle schema generated from IR. Compared against Prisma output for coverage.

### 5.7 Evaluate llm-context projection for MCP server integration
- **Done when:** Decision documented on replacing hand-rolled MCP tool definitions with llm-context projection output.
- **Why:** The llm-context projection generates structured JSON containing entities, commands, policies, and constraints for LLM agent injection. Could replace hand-rolled tool definitions in `packages/mcp-server`.

### 5.8 Evaluate materialized-views projection for reporting
- **Done when:** Decision documented on using generated materialized view DDL for reporting dashboards (event profitability, inventory analytics, staff performance) instead of hand-rolled aggregation SQL.
- **Why:** Generates PostgreSQL CREATE MATERIALIZED VIEW DDL with refresh strategies. Eliminates hand-rolled aggregation queries.

### 5.9 Evaluate health projection for K8s readiness
- **Done when:** Decision documented on using health check endpoints (liveness, readiness checking IR integrity, store connectivity, outbox depth) instead of zero health infrastructure.
- **Why:** Zero health check infrastructure exists today. Projection has a Next.js surface.

### 5.10 Evaluate analytics projection for tracking events
- **Done when:** Decision documented on using typed tracking event schemas from IR commands.
- **Why:** Capsule has zero analytics instrumentation today. Projection generates typed schemas from command definitions.

### 5.11 Evaluate new projections (12 not in prior plan)
- **Done when:** Each of the 12 new projections evaluated for capsule-pro applicability: dart, dynamodb, elasticsearch, hono, jsonschema, kysely, mongoose, pydantic, remix, storybook, sveltekit, terraform. Decision documented per projection.
- **Why:** 8th revision audit found 27 projections (not 25). 12 were not in prior plan. Some may have high value (e.g., jsonschema for API contract validation, elasticsearch for search indexing, terraform for infra-as-code).
- **Backpressure:** Each projection evaluated with a one-paragraph assessment.

### 5.12 Evaluate and wire agent-sdk for MCP server (HIGH PRIORITY)
- **Done when:** Hand-rolled MCP tool definitions in `packages/mcp-server` replaced with `toAnthropicTools()`/`toOpenAITools()` from `@angriff36/manifest/agent-sdk`. IR introspection uses `listEntities()`, `describeEntity()`, `findMatchingCommands()` instead of `entity-domain-map.ts` copy.
- **Why:** The `agent-sdk` export generates Anthropic/OpenAI/Vercel tool definitions FROM the IR automatically. Provides `AgentRuntime`, `listEntities()`, `describeEntity()`, `listCommands()`, `describeCommand()`, `findMatchingCommands()` (keyword-based intent matching), `irTypeToJsonSchema()`, `getEntityRelationships()`. This is a clean replacement for the entire hand-rolled MCP server implementation and eliminates the stale `entity-domain-map.ts` copy.
- **Backpressure:** MCP server tools reflect ALL 189 entities and 952 commands without manual maintenance. `entity-domain-map.ts` in mcp-server deleted.
- **Source to change:** `packages/mcp-server/`. Import from `@angriff36/manifest/agent-sdk`.
- **Spec:** `specs/agent-sdk-integration.md`

### 5.13 Wire ir-diff for CI schema drift detection (HIGH PRIORITY)
- **Done when:** `diffIR()` added to CI pipeline. PRs gated with `classifyBreakingChanges()`. Auto-detection of which Prisma models need migration.
- **Why:** The `ir-diff` and `breaking-change` exports provide structured IR diff reports and breaking-change classification. `generateMigration()` produces PostgreSQL DDL from IR diff. Currently schema drift is detected manually via `pnpm db:check`. Automating this catches IR-to-Prisma drift before merge.
- **Backpressure:** CI pipeline fails on breaking IR changes without corresponding Prisma migration.
- **Source to change:** CI workflow, import from `@angriff36/manifest/ir-diff` and `@angriff36/manifest/breaking-change`.

---

## TIER 6 -- FRONTEND CLIENT STRATEGY

> **Why:** The generated `manifest-client.generated.ts` has **1,330 functions with 0 consumers**. The app uses 4 coexisting patterns. TanStack Query IS installed with QueryProvider but only 5 files (31 uses) use it; 167 other apiFetch files get zero caching. 81% of API URLs are hardcoded strings (211 paths vs ~50 typed path builders). Before adopting or extending the generated client, decide whether it is the right abstraction.

### 6.1 Frontend data layer decision
- **Done when:** Evaluate three options: (a) Fix and adopt generated client (currently 1,330 functions, **0 consumers**), (b) Delete generated client and formalize existing `use-*` pattern, (c) Generate only React Query hooks via `react-query` projection and retire both flat client and hand-written hooks.
- **Why:** The `use-*.ts` naming convention implies React hooks but files export plain async functions -- misleading. 21 hand-written modules (10 plain functions, 11 hooks, 1 TanStack Query) duplicate patterns the generated file already covers. Generated client has **0 actual consumers** despite 1,330 functions. `manifest-client.ts` (executeCommand) is already wired but orphaned -- clean migration target.
- **Backpressure:** Decision document with trade-offs.

### 6.2 Add data caching/deduplication layer
- **Done when:** TanStack Query wraps apiFetch as the universal fetcher beyond just the events domain. Component re-mounts do not trigger fresh API calls.
- **Why:** TanStack Query IS installed with QueryProvider but only 5 files (31 uses) use it. 167 other apiFetch files (1,092 call sites) get zero caching. Every component mount in those files triggers a fresh API call via uncached `apiFetch()`.
- **Backpressure:** Network tab shows cached responses on re-mount for non-event domains.
- **Source to change:** `apps/app/app/lib/api.ts` (expand TanStack Query wrapper beyond events domain).

### 6.3 Implement chosen frontend strategy
- **Done when:** Single consistent frontend data access pattern. Dead code eliminated.
- **Backpressure:** `grep -r 'from.*manifest-client.generated' apps/app/` returns only intended consumers. Sample CRUD flow works end-to-end.

### 6.4 Typed command input generation
- **Done when:** All 952 command functions have typed input parameters derived from IR (not `Record<string, unknown>`).
- **Why:** The IR defines per-command input schemas with required/optional fields and types, but the generated client projects all commands as `(input: Record<string, unknown>)`.
- **Source to change:** `manifest/scripts/generate-capsule-client.mjs`.

### 6.5 Rename misleading `use-*.ts` files
- **Done when:** Files that export plain async functions (not React hooks) use a naming convention that matches their export shape (e.g. `api-*.ts` or `data-*.ts`).
- **Why:** The `use-*.ts` convention implies React hooks per community standards. These files export plain async functions. This is misleading for developers.
- **Source to change:** `apps/app/app/lib/use-*.ts` files (21 files: 10 plain functions, 11 hooks, 1 TanStack Query).

---

## TIER 7 -- RUNTIME FEATURE WIRING

> **Why:** 16 of 19 RuntimeOptions properties are NOT wired. The highest-leverage change is **middleware wiring** -- it enables RBAC, identity enrichment, audit, and bootstrap seed to be expressed as lifecycle hooks instead of hand-rolled proxies. The audit found that the custom outbox implementation duplicates the upstream OutboxStore contract, no audit trail exists, and no durable approval state is possible.

### 7.1 Wire auditSink (PostgresAuditSink)
- **Done when:** Engine constructed with `auditSink`. Every governed command produces a durable audit row with: who invoked, tenant/org, entity, command, outcome, diagnostics.
- **Why:** The upstream engine already has `emitAudit()` and `classifyOutcome()` built-in. It just needs the sink instance. Currently zero audit trail exists for governed commands.
- **Backpressure:** Run a command, query the audit table, confirm all fields present.
- **Source to change:** `manifest/runtime/src/manifest-runtime-factory.ts`. Import from `@angriff36/manifest/audit/postgres`.

### 7.2 Wire outboxStore (PostgresOutboxStore)
- **Done when:** Custom `createPrismaOutboxWriter` (~60 lines in telemetry hooks) replaced by official `OutboxStore` adapter. Events flow through official pipeline.
- **Why:** The factory has its OWN outbox implementation that duplicates what the upstream `OutboxStore` contract provides. The upstream `enqueueOutbox()` is never called. Migrating eliminates duplication and gets transactional semantics from the engine itself.
- **Backpressure:** Enqueue events, claim batch, mark delivered -- all succeed.
- **Source to change:** `manifest/runtime/src/manifest-runtime-factory.ts`. Import from `@angriff36/manifest/outbox/postgres`.

### 7.3 Wire requireTenantContext
- **Done when:** Engine constructed with `requireTenantContext: true`. Commands without tenant context fail with `MISSING_TENANT_CONTEXT`.
- **Why:** Multi-tenant app should enforce tenant scoping at the engine level. Currently defaults to false. Manifest docs confirm: single `tenant tenantId : string from context.tenantId` declaration auto-writes tenant and filters reads.
- **Backpressure:** Test command without tenant; confirm diagnostic error.
- **Source to change:** `manifest/runtime/src/manifest-runtime-factory.ts`.
- **Note (13th rev):** Tenant isolation operates at TWO layers: (1) IR-level declaration (`tenant tenantId: string from context.tenantId` in `.manifest` source files) auto-writes tenant and filters reads, and (2) RuntimeOption (`requireTenantContext: true`) enforces at engine level. Both should be active. Current plan only addresses RuntimeOption layer.

### 7.4 Wire middleware pipeline (HIGHEST PRIORITY)
- **Done when:** Factory passes `middleware: [...]` to engine. Lifecycle hooks fire in order. Hand-rolled proxies deleted.
- **Why:** Single highest-leverage change. Engine ships 4 hooks (before-guard, before-policy, before-action, after-emit). Manifest docs confirm composable middleware with contextPatch, abortCommand, and side effects. Currently cross-cutting concerns are hand-rolled outside the lifecycle:
  - RBAC: `createPermissionGuard` proxy -> should be `before-guard` middleware
  - Identity: `resolveUserRole` DB lookup -> should be `before-policy` contextPatch
  - Audit: telemetry handler -> should be `after-emit`
  - Tenant: `requireTenantContext: true` not set
  - Bootstrap: workaround -> should be `before-policy` patch
- **Backpressure:** `createPermissionGuard` proxy deleted; `resolveUserRole` moved to `before-policy` contextPatch; telemetry to `after-emit`.
- **Source to change:** `manifest/runtime/src/manifest-runtime-factory.ts`.
- **Subtasks:**
  - [x] **7.4a -- RBAC:** `before-guard` middleware replaces `createPermissionGuard` proxy. — ✅ DONE 2026-06-04
  - [x] **7.4b -- Identity:** `before-policy` with `contextPatch` replaces `resolveUserRole`. — ✅ DONE 2026-06-04
  - [x] **7.4c -- Audit:** `after-emit` middleware replaces post-hoc telemetry handler. — ✅ DONE 2026-06-04
  - [ ] **7.4d -- Bootstrap:** `before-policy` patch replaces `bootstrapCreateCommand` workaround.
  - [ ] Delete hand-rolled equivalents after each migration proven.

### 7.5 Wire Rules Engine into factory pipeline (currently dead code)
- **Done when:** `createRulesEngineMiddleware()` registered as middleware. Kitchen rules (prep-tasks, equipment, allergens, workflow) evaluate before/after commands. OR module deleted if dead code decision favors removal.
- **Why:** The rules-engine module (5 files, ~1000 LOC) is **dead code**: 0 consumers outside its own directory. `createRulesEngineMiddleware()` is exported but never imported. 10 predefined rules across 5 categories (PrepTask: 3, KitchenTask: 2, Recipe: 2, Ingredient: 2, Station: 1). Decision needed: rebuild with consumers or delete entirely.
- **Backpressure:** Kitchen commands validated against business rules automatically.
- **Source to change:** `manifest/runtime/src/manifest-runtime-factory.ts`, import from `manifest/runtime/src/rules-engine/runtime-integration.ts`.

### 7.6 Wire remaining RuntimeOptions
- **Done when:** Each option evaluated: `approvalStore`, `flagProvider`, `jobQueue`, `profiling`, `generateId`, `now`, `deterministicMode` (defined in context but not forwarded), `evaluationLimits` (defined in context but not forwarded), `requireValidProvenance`, `expectedIRHash`. Wired where applicable, documented where intentionally deferred.
- **Backpressure:** Factory options diff against upstream interface shows only intentional deferrals.
- **Note (13th rev):** `profiling` is a separate export (`@angriff36/manifest/profiler`), not just a boolean RuntimeOption. See Task 7.9 for wiring the Profiler class.

### 7.7 Fix `as any` casts in runtime factory
- **Done when:** `prismaForWrites`, `prismaForLookups`, and `outboxWriter` are properly typed in dependency injection instead of being cast `as any` (6 casts at lines 387, 409, 460, 464, 492, 514).
- **Why:** 6 `as any` casts silently bypass the compiler on critical runtime infrastructure. Type mismatches here could cause silent runtime failures.
- **Source to change:** `manifest/runtime/src/manifest-runtime-factory.ts`.

### 7.8 Audit API shim for factory migration
- **Done when:** `apps/api/lib/manifest-runtime.ts` (376 lines) is audited. Any logic that belongs in the factory is migrated. Shim becomes a thin re-export.
- **Why:** The API shim is 376 lines, not a simple re-export. It may contain logic that should be in the canonical factory for consistency across API and app paths.
- **Backpressure:** Shim is under 50 lines (constructor injection only).
- **Source to change:** `apps/api/lib/manifest-runtime.ts`.

### 7.9 Wire Runtime Profiler export (`@angriff36/manifest/profiler`)
- **Done when:** `Profiler` class from `@angriff36/manifest/profiler` imported and wired to factory. Per-phase timing captured for all 13 execution phases. `toFlameGraph()` produces visualization output. `onProfileComplete` callback logs timing data.
- **Why:** Profiling is a SEPARATE EXPORT (`@angriff36/manifest/profiler`), not just the `profiling` boolean RuntimeOption. The Profiler class provides granular per-phase timing (tenantContextGate, idempotencyCheck, policyEvaluation, guardEvaluation, approvalGate, actionExecution, eventEmission), flamegraph visualization, and completion callbacks. Currently zero profiling exists -- all performance diagnosis is manual.
- **Backpressure:** Run a command, observe per-phase timing in logs. `toFlameGraph()` produces valid output.
- **Source to change:** `manifest/runtime/src/manifest-runtime-factory.ts`. Import from `@angriff36/manifest/profiler`.
- **Doc:** Official docs `/extensibility/runtime-tooling`

---

## TIER 8 -- GOVERNANCE MIGRATION & CONFORMANCE

> **Why:** The audit found 191 direct-write violations in API routes and 110 in server actions (301 total across 28 server-action files + 80 API files). Payroll engine is 100% bypass. Invoice entity has zero policies. Constitution S12 requires audit discipline. Constitution S17 requires a conformance test index.

### 8.1 Payroll governance migration (HIGHEST GOVERNANCE PRIORITY)
- **Done when:** Payroll writes route through `RuntimeEngine.runCommand()` instead of direct Prisma. `$transaction` wrapping added. `PayrollLineItem` and `PayrollAuditLog` have Manifest entity registrations (or are documented as intentionally ungoverned auxiliary tables). Entity naming mismatch resolved (PayrollAuditLog vs PayrollApprovalHistory).
- **Why:** 100% direct Prisma bypass -- no RBAC, no audit, no tenant enforcement, no events. `savePayrollRecords()` can leave partial state on failure. 4 direct writes in `PrismaPayrollDataSource`, 2 entities with zero Manifest registration. Constructor strips `$transaction` -- cannot be retrofitted without signature change.
- **Backpressure:** Audit rows appear for payroll writes. Transactional integrity verified.
- **Source to change:** `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts`, `apps/api/app/api/payroll/*/route.ts`.

### 8.2 API route governance migration (~191 violations across 80 files)
- **Done when:** All ~191 API mutation calls across 80 files in `apps/api/` hand-written routes route through Manifest runtime or are documented as infrastructure bypasses.
- **Why:** 47% of hand-written routes bypass the Manifest dispatcher. Breakdown by domain: kitchen (22 direct writes of 165 routes), events (6 of 76), CRM (varies), staff (varies), inventory (varies), administrative (13 of ~20), notifications (1 of 16, but 14 hand-written), command-board (4 of 26).
- **Backpressure:** `pnpm manifest:audit-direct-writes` shows zero violations in `apps/api/` (excluding allowlisted paths).
- **Source to change:** `apps/api/app/api/` hand-written route files.

### 8.3 Server actions governance migration (~110 violations across 28 files)
- **Done when:** All ~110 domain-entity server action writes across 28 files in `apps/app/` route through Manifest runtime via `executeCommand()` or the API route.
- **Why:** App uses `database.*` singleton for direct writes. 28 files with direct `database.*` calls bypass governance.
- **Backpressure:** `pnpm manifest:audit-direct-writes` shows zero violations in `apps/app/`.
- **Source to change:** `apps/app/app/(authenticated)/**/actions*.ts` files.

### 8.4 Package-specific governance migration
- **Done when:** `supplier-connectors` (5 direct writes on VendorCatalog -- governed entity), `sentry-integration` (2 writes on SentryFixJob -- infrastructure, NOT governed), `payroll-engine` (covered by 8.1), `notifications` (1 direct write on EmailWorkflow -- governed entity; emailLog/sms_logs/notification_preferences writes are infrastructure logs, not governed), `packages/database/src/vendor-cost-service.ts` (1 documented bypass on InventoryItem with explicit GOVERNANCE NOTE -- downstream mechanical effect of governed VendorCatalog commands) route writes through Manifest or are documented as intentionally ungoverned. `packages/realtime/` (outbox is infrastructure, not governed). `packages/services/` removed (confirmed truly empty -- no package.json, no source files).
- **Backpressure:** `pnpm manifest:audit-direct-writes` shows zero unexpected direct writes for these packages.
- **Source to change:** `packages/supplier-connectors/src/sync-service.ts` (5 writes), `packages/notifications/email-workflow-triggers.ts` (1 write on EmailWorkflow), `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts` (covered by 8.1).

### 8.5 Conformance test index (Constitution S17)
- **Done when:** Centralized conformance test verifies: all governed entities have IR definitions, all commands route through dispatcher, all mutations produce audit rows, all store targets consistent with IR.
- **Backpressure:** `pnpm test:conformance` passes and is wired to CI.
- **Source to change:** New test file in CI pipeline.

### 8.6 Fill command-level policies — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** ROOT CAUSE: 250 top-level `policy` declarations existed OUTSIDE entity blocks, so the Manifest compiler never bound them to IR commands (all 952 had `policies: []`). FIX: `default policy` syntax INSIDE entity blocks causes the compiler to auto-expand to every command. Added entity-specific `default policy <EntityName>DefaultAccess` to all 92 source files via `add-default-policies.mjs` script. Result: 952/952 commands have policies, 189/189 entities have `defaultPolicies`. 8 zero-policy files (invoice, payment, collections, etc.) now protected. API typecheck 0, 2574 tests pass.
- **Done when:** All 952 commands have meaningful policies (not empty `[]`). At minimum, Invoice must have policies preventing unauthorized void/write-off. ✅ ACHIEVED.
- **Why:** Policies exist at entity level only; command-level policies are all empty. Invoice has ZERO policies despite 10 commands including `voidInvoice`, `writeOff`, `applyPayment`.
- **Backpressure:** `grep -r '"policies": \[\]' manifest/ir/` returns 0 matches.
- **Source to change:** `manifest/source/*.manifest` -- add policy blocks to commands.

### 8.7 Reduce write-route-allowlist
- **Done when:** Allowlist under 50 rules (infrastructure + approved bypasses only).
- **Why:** 247 rules, 96 marked "pending manifest migration".
- **Source to change:** `manifest/governance/write-route-infra-allowlist.json`.

### 8.8 Adopt defaultPolicies for entity-level RBAC — ✅ DONE 2026-06-05 (via Task 8.6)
- **✅ DONE 2026-06-05.** All 189 entities now use `defaultPolicies` via `default policy` syntax inside entity blocks. Task 8.6 implemented this as part of the policy binding fix. Newly added commands are automatically protected.
- **Done when:** Entities that share the same policy across all commands use `defaultPolicies` declarations instead of per-command repetition.
- **Why:** Manifest spec defines `defaultPolicies` -- array of policy names applied to all bound commands unless overridden at command level. Currently zero entities use this. Reduces duplication and ensures new commands inherit protection automatically.
- **Backpressure:** At least 5 entities use `defaultPolicies`. Newly added commands are automatically protected.
- **Source to change:** `manifest/source/*.manifest`.

---

## TIER 9 -- ENTITY GRAPH & ADVANCED FEATURES

> **Why:** A complete entity-graph module exists at `manifest/runtime/src/entity-graph/` (7 files) with zero useful output. The IR has 1 saga and 0 reactions but 936 events ready for reaction-driven side effects. Manifest DSL features (reactions, approvals, sagas, modifiers, concurrency, state transitions) are available but unused. 39 export paths in @angriff36/manifest with only 4 actively used (10.3%). 40 CLI commands available, 25 unused. Manifest docs confirm: Reactions support declarative event-to-command binding with resolve expressions, condition guards, and batch mode. Workflows (Sagas) support multi-step with compensate actions, timeout, retry. Custom Stores use Store\<T\> interface with 6 methods. Plugin API via definePlugin() for extending projections, store adapters, builtins. See also Tier 11 for newly discovered advanced features (async commands, feature flags, mixin composition, scheduled commands) and Tier 12 for federation.

### 9.1 Entity-graph rebuild (currently dead code)
- **Done when:** Entity graph module rebuilt with IR-derived relationships (requires Tier 0.4 relationships). `pnpm manifest:graph <Entity>` prints the entity's dependency graph. CI uses it for impact analysis.
- **Why:** The entity-graph module (7 files, ~1400 LOC) is **dead code**: `buildGraphFromIR()` is a stub returning empty object, 0 consumers. The hardcoded `KNOWN_RELATIONSHIPS` array (~50 entries) must be replaced. Decision needed: rebuild or delete.
- **Backpressure:** Graph output for Event includes related entities (EventStaff, EventBudget, etc.).
- **Source to change:** `manifest/runtime/src/entity-graph/graph-builder.ts`.

### 9.2 Wire reactions (event-driven side effects) — ✅ STARTED 2026-06-05 (2 of 5+ implemented)
- **✅ STARTED 2026-06-05.** First 2 reactions implemented in `manifest/source/reactions.manifest`:
  1. `on PaymentProcessed run Invoice.applyPayment` — resolves `payload.invoiceId`, maps `paymentAmount` and `paymentId`. Replaces raw Prisma writes in Stripe webhook handler.
  2. `on PaymentRefunded run Invoice.recordRefund` — resolves `payload.invoiceId`, maps `refundAmount` and `paymentId`. Ensures invoice consistency on refund.
  IR compiled: 189 entities, 952 commands, 936 events, **2 reactions** (was 0). API typecheck 0, 2574 tests pass. Remaining high-value candidates: Shipment.delivered → InventoryTransaction, PurchaseOrder.received → InventoryTransaction, WasteEntry.approved → InventoryItem.adjust.

### 9.3 Expand saga orchestration for multi-step workflows
- **Done when:** At least 3 sagas beyond the existing ProcessInvoicePayment.
- **Why:** Manifest docs confirm sagas (documented as "workflows" at `/language/workflows`): multi-step with compensate actions, timeout, retry. Candidate workflows: event finalization, prep-list autogeneration, procurement fulfillment.
- **Source to change:** `manifest/source/*.manifest` -- define sagas.

### 9.4 Wire approval workflows
- **Done when:** Commands requiring approval use engine's `approvalStore` and `IRApproval` declarations. At least 3 entities use Manifest `approval` blocks.
- **Why:** Multi-stage approval workflows exist in the domain (payroll, vendor contracts, procurement, inventory transfer, staff timecards) but are implemented as status strings + guard conditions rather than Manifest's `approval` primitive.
- **Source to change:** Factory + `.manifest` approval blocks.

### 9.5 Adopt state transitions for status fields
- **Done when:** At least 5 entities with status fields declare `transitions` blocks instead of guard-based status validation.
- **Why:** Manifest spec defines `transitions` (property, from, to array) for state machine enforcement. Currently status transitions are encoded as guard conditions scattered across commands. Declared transitions are clearer, auditable, and produce diagnostic output on violation.
- **Source to change:** `manifest/source/*.manifest` -- add `transitions` blocks.

### 9.6 Adopt CLI commands for development workflow
- **Done when:** Key unused CLI commands integrated into standard workflow: `validate`, `coverage`, `watch`, `fmt`, `docs`, `diagram`, `mock`, `lint-routes`, `audit-routes`, `enforce-surface`, `audit-governance`, `diff`, `migrate`, `changelog`, `runtime-check`, `doctor`, `integration-check`, `config`, `versions`, `plugins`. 6 orphaned scripts identified and given package.json entries or removed.
- **Why:** 35 CLI commands available, 15 have package.json scripts, 20 unused. 6 scripts have no package.json entry at all (orphaned). Many provide direct value (validate, coverage, watch, fmt, diff, audit-governance, doctor).
- **Source to change:** `package.json` scripts section, orphaned script cleanup.

### 9.7 Property modifier adoption
- **Done when:** At least `unique` and `indexed` adopted on clear candidates. `encrypted` evaluated for PII fields (email, phone, SSN). `masked` evaluated for sensitive fields with appropriate strategies (redact, partial, tokenize, email, phone, ssn, creditCard). `searchable` evaluated for text fields. Decision documented per modifier.
- **Why:** IR schema defines property modifiers: `encrypted` (via EncryptionProvider), `masked` (redact/partial/tokenize/email/phone/ssn/creditCard), `searchable` (full-text search), `indexed`, `unique`, `readonly`. Only `required`/`optional` are used. Candidates: `unique` on ApiKeyName/VendorCatalog.itemNumber, `indexed` on frequently queried fields, `encrypted` on PII, `searchable` on text fields, `masked` on SSN/creditCard fields.
- **Source to change:** `manifest/source/*.manifest`.

### 9.8 Overrideable constraints
- **Done when:** Decision documented on which warn-level constraints should be overrideable. At least 3 warn constraints enabled for override with policy-gated bypass.
- **Why:** All 735 overrideable flags are `false`. The Manifest runtime supports constraint override with justification tracking. Warn constraints like `warnLargePriceIncrease`, `warnOverBudget`, `warnHighWaste` are natural override candidates.
- **Source to change:** `manifest/source/*.manifest`.

### 9.9 Permission guard to middleware migration (SECURITY PRIORITY)
- **Done when:** Permission checks execute via Manifest middleware, not Proxy wrapper. `COMMAND_PERMISSION_MAP` (31 entries across 9 entity types) eliminated. All 189 entity types have RBAC enforcement.
- **Why:** **SECURITY VULNERABILITY.** Current RBAC uses a Proxy-based permission guard that is allow-by-default: commands NOT in the 28-entry `COMMAND_PERMISSION_MAP` pass through unconditionally. Only 9 of 189 entity types have RBAC entries. 180/189 entities bypass all RBAC. 3 bypass paths exist: no user.role in context, command not in map, enforce:false option. Should migrate to Manifest's native middleware where policies are read from IR.
- **Source to change:** `manifest/runtime/src/permission-guard.ts`, `manifest/runtime/src/manifest-runtime-factory.ts`.

### 9.10 Evaluate and adopt `realtime` entity modifier for SSE subscriptions
- **Done when:** At least 5 high-value entities use the `realtime` modifier. SSE endpoints auto-generated. `use{Entity}Realtime` React hooks integrated in frontend. Auto-reconnect verified.
- **Why:** The `realtime` modifier auto-generates SSE endpoints (`GET /api/{entity}/realtime`) and React hooks. Currently ZERO realtime infrastructure exists -- all data refresh is polling-based via 1,092 `apiFetch` call sites. High-value candidates: KitchenTask (live task board), Event (real-time event status), InventoryItem (stock level monitoring), NotificationRules (instant notification delivery), ScheduleShift (real-time schedule changes). This would replace polling with push-based updates for critical workflows.
- **Backpressure:** SSE endpoint serves real-time entity updates. React hook auto-reconnects on disconnect. Network tab shows event stream instead of repeated GET requests.
- **Source to change:** `manifest/source/*.manifest` (add `realtime` modifier), frontend components (replace polling with `use{Entity}Realtime` hooks).
- **Doc:** Official docs `/extensibility/realtime-subscriptions`

### 9.11 Evaluate computed caching for performance-critical computed properties
- **Done when:** At least 10 computed properties use caching strategies. Request-scoped caching applied to frequently-evaluated computed properties. Session/TTL caching evaluated for expensive aggregations.
- **Why:** Manifest supports 3 computed caching strategies: request-scoped, session-scoped, TTL-based. Dependency-driven staleness propagation auto-invalidates caches when mutations change upstream values. Currently ZERO computed properties use caching. 563/611 computed properties have empty `dependencies` -- caching MUST NOT be applied to these until dependencies are correctly declared (chicken-and-egg with Task 8.5 conformance). Start with the 48 properties that DO have declared dependencies.
- **Backpressure:** Cached property evaluated once per request/session/TTL window instead of on every access. Staleness propagation invalidates cache on mutation.
- **Source to change:** `manifest/source/*.manifest` (add `cache` modifiers to computed properties with correct dependencies).
- **Doc:** Official docs `/language/computed-caching`
- **Prerequisite:** Task 0.4 (relationships) and dependency declaration audit for the 563 empty-dependency computed properties.

### 9.12 Adopt snapshot testing for CI code generation validation
- **Done when:** Snapshot tests assert generated code across all active projections (nextjs, routes, prisma). CI fails on unintentional generation drift. Timestamp stabilization verified.
- **Why:** The Manifest package provides snapshot testing that captures generated code across all built-in projections with timestamp stabilization for deterministic comparison. `listBuiltinProjections()` enables programmatic enumeration. 13 built-in projections are asserted by upstream snapshot tests. This would have caught the accessor derivation bugs (Task 0.1) and the EventStaff table mapping bug (Task 2.5) in CI before they reached the codebase.
- **Backpressure:** Intentional generator change requires snapshot update (explicit). Unintentional drift fails CI.
- **Source to change:** CI workflow, new snapshot test configuration.
- **Doc:** Official docs `/extensibility/snapshot-testing`

### 9.13 Add property-based testing for entity invariants
- **Done when:** fast-check powered invariant tests cover at least 5 entities. Tests verify: determinism (same input produces same state), guard safety (guards never throw on valid input), constraint monotonicity (stronger constraints never weaker), policy isolation (policies don't leak across entities), state consistency (valid transitions only).
- **Why:** The Manifest package supports property-based testing via fast-check for rigorous conformance verification. Example-based tests (Task 8.5) verify specific scenarios; property-based tests verify invariants across the entire input space. Critical for entities with complex state machines (VendorContract, PayrollRun, EventGuest RSVP flow, CateringOrder status).
- **Backpressure:** Property tests pass with 10,000+ random inputs per entity. Invariant violations surface as shrinking counterexamples.
- **Source to change:** New test files in CI pipeline.

### 9.14 Evaluate IR compression for large deployments
- **Done when:** Decision documented on whether to adopt `compressIR()`/`decompressIR()` for IR payload size reduction (60-80% claimed). If adopted, IR loading pipeline updated.
- **Why:** The `@angriff36/manifest/compression` export provides lossless binary serialization with 60-80% size reduction. The IR for 189 entities is substantial -- compression could reduce load times and memory footprint. Low priority but worth evaluating for production deployments.
- **Backpressure:** If adopted: `compressIR()` produces smaller payload, `decompressIR()` produces byte-identical roundtrip.
- **Source to change:** IR loading pipeline, import from `@angriff36/manifest/compression`.
- **Doc:** Official docs `/extensibility/compression`

### 9.15 Expand CLI adoption (40 commands available, 27 unused)
- **Done when:** Key unused CLI commands integrated into standard workflow. Target 25+ of 40 commands with package.json scripts. At minimum: `init`, `validate-ai`, `preflight`, `scan`, `harness`, `mock`, `docs`, `duplicates`, `runtime-check`, `cache-status`, `versions`, `routes`, `inspect`, `load-test`.
- **Why:** The CLI has **40 commands** (corrected from prior count of 35-37). 15 have package.json scripts, 25 are unused. High-value additions: `init` (interactive setup with templates for nextjs/minimal/express), `validate-ai` (scored diagnostics for AI agents -- useful for automated plan review), `preflight` (environment variable validation -- prevents runtime config errors), `scan` (direct write/event fabrication/route drift detection -- automates governance audit), `mock` (local mock HTTP server from IR -- enables frontend development without backend), `versions` (IR version management with save/list/diff/changelog/verify/rollback/compress), `routes` (canonical route manifest generation), `load-test` (k6/Artillery load test generation).
- **Source to change:** `package.json` scripts section.
- **Note:** Supersedes prior Task 9.6 which listed 35 commands. Expanded with 5 additional commands discovered in 10th revision.

### 9.16 Wire Governance CLI suite (7 commands)
- **Done when:** All 7 governance CLI commands have package.json scripts: `enforce-surface`, `integration-check`, `audit-governance`, `audit-bypasses`, `scan`, `doctor`, `audit-routes`.
- **Why:** These 7 CLI commands provide the highest governance value of any CLI grouping. `scan` automates write/fabrication/drift detection (replaces manual `pnpm manifest:audit-direct-writes`). `audit-governance` and `audit-bypasses` surface the 301 direct-write violations. `enforce-surface` ensures generated route coverage. `doctor` validates runtime health. Currently ZERO of these are in package.json.
- **Backpressure:** `pnpm manifest:scan` reports direct-write violations. `pnpm manifest:audit-governance` surfaces governance gaps.
- **Source to change:** `package.json` scripts section.
- **Doc:** Official docs `/cli/governance`

### 9.17 Wire AI conformance test generator (`manifest generate-tests`)
- **Done when:** `pnpm manifest:generate-tests` produces test suites from IR for at least 10 entities. Tests cover command conformance, policy compliance, and guard safety.
- **Why:** The `manifest generate-tests` command auto-generates test suites from IR definitions. Produces command conformance tests, policy compliance tests, and guard safety tests for all 189 entities. Automates the bulk of Task 8.5 conformance test authoring. Currently zero auto-generated tests exist.
- **Backpressure:** Generated tests compile and pass for sample entities. CI runs generated test suite.
- **Source to change:** `package.json` scripts section, CI workflow.
- **Doc:** Official docs `/extensibility/ai-tooling`

### 9.18 Adopt policy matrix viewer for security audit
- **Done when:** `pnpm manifest coverage --format policy-matrix` produces a policy coverage report for all 189 entities. Report surfaces the 180/189 no-RBAC gap.
- **Why:** The `manifest coverage --format policy-matrix` command visualizes which entities and commands have policies, guards, and constraints. Currently the 180/189 no-RBAC gap (Task 9.9) is invisible without manual analysis.
- **Backpressure:** Policy matrix report shows coverage percentages per entity. Zero-policy entities highlighted.
- **Source to change:** `package.json` scripts section.

---

## TIER 10 -- CODEBASE CONSOLIDATION & TYPE SAFETY

> **Why:** Several code modules duplicate functionality that Manifest provides. The audit found significant type-safety gaps (`as any` usage) and code hygiene issues.

### 10.1 Delete legacy manifest-runtime.ts (3,205 lines of dead code) — ✅ ALREADY DONE (prior session)
- **✅ ALREADY DONE.** The legacy 3,205-line `manifest-runtime.ts` was deleted in a prior commit (`147091035`). The current 66-line re-export at `manifest/runtime/src/manifest-runtime.ts` is a thin wrapper importing from `./index`. No active consumers import the legacy code. All 82 API consumers import from `@/lib/manifest-runtime` (the API shim).
- **Done when:** `manifest/runtime/src/manifest-runtime.ts` (3,205 lines) is deleted or archived. All imports verified to use the factory instead.
- **Why:** The legacy file contained 60+ `as any` casts, 50+ per-entity command wrappers, deprecated `PostgresStore` via dynamic `require()`, and a 240-line event switch statement. It was superseded by the 521-line factory.
- **Source to change:** `manifest/runtime/src/manifest-runtime.ts`.

### 10.2 Recipe engine consolidation
- **Done when:** Dead recipe engine removed. Active recipe engine uses Manifest reads instead of raw SQL.
- **Why:** Two engines exist, one is dead code. Both use raw SQL.
- **Source to change:** `manifest/runtime/src/recipe-optimization-engine.ts`, `recipe-scaling-engine.ts`.

### 10.3 Rules engine Manifest middleware integration
- **Done when:** Rules engine's middleware factory registered through Manifest's `middleware` option (Tier 7.4/7.5), not as external wrapper. OR module deleted if dead code decision favors removal.
- **Source to change:** `manifest/runtime/src/rules-engine/runtime-integration.ts`.

### 10.4 Delete confirmed dead code (rules-engine, entity-graph, packages/services)
- **✅ DONE 2026-06-04.** Removed rules-engine/ (5 files, ~1000 LOC), entity-graph/ (7 files, ~1400 LOC), and packages/services/ (empty). Re-exports removed from index.ts. 2560/2560 tests pass.

### 10.5 Outbox duplication consolidation — ✅ DONE 2026-06-05
- **✅ DONE 2026-06-05.** Bundle-claim route outbox events moved inside `$transaction` callback (was created AFTER transaction — data loss risk on crash). Unsafe standalone `createOutboxEvent` function removed from `shared-task-helpers.ts` (0 remaining callers — all callers use canonical `@repo/realtime` version or direct `tx.outboxEvent.create`). `manifest-plans.ts` direct database calls are standalone operations (no correlated mutations) — lower risk, acceptable. 3 implementations reduced to 2 (canonical + manifest batch writer), 1 unsafe helper removed.
- **Done when:** Only one `createOutboxEvent` implementation exists. Kitchen task routes use transactional-safe version.
- **Why:** 3 separate `createOutboxEvent` functions write to the same `outboxEvent` table. Kitchen task claim routes use a duplicate version (`shared-task-helpers.ts`) that lacks transactional safety (uses global singleton, not tx client). Events could be lost on failure.
- **Source to change:** Replace `apps/api/app/api/kitchen/tasks/shared-task-helpers.ts` local `createOutboxEvent` with import from `@repo/realtime/src/outbox/create.ts`.

### 10.6 MCP server entity-domain-map consolidation
- **Done when:** `packages/mcp-server/src/lib/entity-domain-map.ts` imports from canonical `entity-domain-map.mjs`. OR replaced entirely by agent-sdk (Task 5.12).
- **Source to change:** `packages/mcp-server/src/lib/entity-domain-map.ts`.

### 10.7 Fix `as any` usage in API routes
- **Done when:** The 39 production-code `as any` occurrences in `apps/api/app/` are eliminated or justified with proper typed alternatives. Priority targets: trash module dynamic model access (8 uses), staffing coverage raw SQL (6 uses), payroll tax config (4 uses).
- **Why:** 39 `as any` in apps/api/app/ production code. The trash module's `(db as any)[modelName]` pattern bypasses all type safety on CRUD operations.
- **Source to change:** `apps/api/app/api/administrative/trash/`, `apps/api/app/api/staffing/coverage/route.ts`, `apps/api/app/api/payroll/tax/`.
- **Recommendation:** Create a typed model registry (`Record<string, Prisma.ModelDelegate>`) for the trash module's dynamic model access.

### 10.8 Fix `as unknown as` double-cast patterns
- **Done when:** 32 double-cast occurrences replaced with proper type guards, Zod schemas, or explicit conversion functions.
- **Why:** `as unknown as` indicates a type system gap. Suspicious casts include: `conflictingItems as unknown as string` (array to string -- likely a bug), `entries as unknown as Array<{...}>` (should use type guard), dates cast `as unknown as string` for `Date.parse` (should use `.toString()`).
- **Source to change:** `apps/api/app/api/kitchen/allergens/detect-conflicts/route.ts`, `apps/api/app/api/kitchen/waste/trends/route.ts`, `apps/api/app/api/kitchen/ai/bulk-generate/prep-tasks/save/route.ts`.

### 10.9 Fix schema naming convention anomalies
- **Done when:** Document the exact mapping convention in a schema style guide. Establish CI-enforced convention for new models.
- **Why:** 195 PascalCase models coexist with 31 legacy snake_case models. 4 PascalCase @@map values (Tenant, ActivityFeed, EmployeeDeduction, OutboxEvent) deviate from the snake_case convention. Mixed enum casing.
- **Source to change:** `docs/database/CONTRIBUTING.md` (add style guide).

### 10.10 Investigate skipped test suite
- **Done when:** `describe.skip` in `sales-reporting/generate.test.ts` is either fixed (test runs) or removed (feature unimplemented).
- **Why:** Entire test suite is disabled. Unknown if feature is unimplemented or test is broken.
- **Source to change:** `apps/api/__tests__/sales-reporting/generate.test.ts`.

### 10.11 Fix manifest runtime placeholder implementations
- **Done when:** `graph-builder.ts:547` placeholder for separate-file implementation is resolved. `manifest-telemetry-collector.ts:477` returns real data instead of placeholder.
- **Why:** Two placeholder implementations in the manifest runtime produce incomplete entity graphs and fake telemetry data.
- **Source to change:** `manifest/runtime/src/entity-graph/graph-builder.ts`, `manifest/runtime/src/manifest-telemetry-collector.ts`.

### 10.12 Adopt entity concurrency for high-contention entities
- **Done when:** At least 3 high-contention entities (InventoryItem, ScheduleShift, EventGuest) declare `versionProperty`/`versionAtProperty` for optimistic concurrency.
- **Why:** Manifest spec defines entity concurrency with `ConcurrencyConflict` results. Currently no entity uses this, making concurrent mutations prone to lost-update bugs.
- **Source to change:** `manifest/source/*.manifest`.

### 10.13 Remove legacy manifest-command-handler.ts -- DONE (2026-06-04)
- **Completed:** `apps/api/lib/manifest-command-handler.ts` (legacy monolithic handler, 289 lines) deleted. All code paths use `execute-command.ts` (canonical handler) via the dispatcher.
- **What was done:**
  - Deleted `apps/api/lib/manifest-command-handler.ts` (289 lines).
  - Migrated ALL 71 route files from `executeManifestCommand` to `runManifestCommand`.
  - Migrated all 11 test files to mock the new canonical handler.
  - Added webhook dispatch support to canonical `execute-command.ts` (fire-and-forget, matching legacy behavior).
  - Migration pattern: routes now call `resolveCurrentUser(request)` + `runManifestCommand({ entity, command, body, user })` instead of `executeManifestCommand(request, { entityName, commandName, transformBody })`. All `transformBody` callbacks inlined into `body` parameter. All `ctx.userId`/`ctx.tenantId`/`ctx.role` replaced with `user.id`/`user.tenantId`/`user.role`.
- **Verification:** API typecheck 0 errors. 2574 tests pass (117 files, payment-create-idempotency fixed). 0 remaining consumers of legacy handler. Single canonical command path through full middleware pipeline (identity, RBAC, audit, outbox).

---

## TIER 11 -- ADVANCED MANIFEST FEATURES (9TH REVISION + 12TH REVISION ADDITIONS)

> **Why:** The 9th revision research uncovered several high-value Manifest features that are fully implemented in the package but have zero adoption: Async Commands, Feature Flags, Mixin Composition, Scheduled Commands. The 12th revision added Rate Limiting, Command Retry Policies, Dynamic Data Masking, and cataloged 116 planned features across v1.9-v1.12. These features would replace hand-rolled patterns with Manifest-native alternatives, reducing code and increasing consistency. agent-sdk and ir-diff are covered in Tier 5 (Tasks 5.12, 5.13).

### 11.1 Implement Async Commands for long-running operations
- **Done when:** At least 3 long-running operations converted to `async command`. `jobQueue` RuntimeOption wired. Auto-synthesized `CommandNameCompleted`/`CommandNameFailed` events verified.
- **Why:** The `async command <name>()` prefix defers execution to a background worker, returning `{ jobId, status: "pending" }` immediately. The `JobQueue` adapter interface supports pluggable backends. High-value candidates: report generation (currently blocks HTTP request), batch imports (vendor catalog sync), payroll processing (runs for minutes). These operations currently either block the request or use ad-hoc queue mechanisms.
- **Backpressure:** Async command returns immediately with jobId. Completion event fires when done. Failed commands produce `CommandNameFailed` event.
- **Source to change:** `manifest/source/*.manifest` (add `async` prefix to commands), `manifest/runtime/src/manifest-runtime-factory.ts` (wire `jobQueue`).
- **Spec:** `specs/async-commands.md`

### 11.2 Implement Feature Flags via flagProvider
- **Done when:** `flagProvider` RuntimeOption wired. At least 3 flags defined in `.manifest` sources. Flags resolve via external provider (LaunchDarkly etc) or local config.
- **Why:** The `flag("name")` builtin is available in guards and computed properties. Resolved via `flagProvider` RuntimeOption. Supports external providers. Zero flags defined today. Feature gating is currently done via ad-hoc environment variable checks scattered across the codebase. Centralizing in Manifest makes flags auditable and consistent with the entity model.
- **Backpressure:** `flag("enableBatchImport")` returns correct value in guard evaluation. Changing flag at runtime affects command flow.
- **Source to change:** `manifest/source/*.manifest` (add `flag()` calls), `manifest/runtime/src/manifest-runtime-factory.ts` (wire `flagProvider`).
- **Spec:** `specs/feature-flags.md`

### 11.3 Adopt Mixin Composition for shared properties
- **Done when:** `Auditable` mixin created (createdAt, updatedAt, deletedAt, tenantId). Applied to entities with heavy repetition. Source file duplication measurably reduced.
- **Why:** 189 entities have heavy repetition of common property sets: timestamps (createdAt/updatedAt), tenantId, audit fields, status fields. The `mixin Auditable { ... }` construct allows property/constraint reuse across entities. Currently every entity repeats these declarations verbatim. A single mixin could eliminate duplication across 150+ entities.
- **Backpressure:** Entities using mixin compile and run identically to entities with inline declarations. `pnpm manifest:compile` succeeds.
- **Source to change:** `manifest/source/*.manifest` (extract shared properties into mixins).

### 11.4 Implement Scheduled Commands
- **Done when:** At least 3 scheduled commands defined. Next.js cron routes auto-generated and registered. Schedules execute on time.
- **Why:** The `schedule <name> { cron "0 6 * * *" } run <command>` construct auto-generates Next.js cron routes. Zero scheduled commands exist today. Candidates: daily reconciliation (invoice/payroll), nightly inventory sync (supplier connectors), expiration checks (vendor contracts, certifications, licenses). These are currently either manual or implemented as ad-hoc cron jobs outside the Manifest lifecycle.
- **Backpressure:** Cron route fires at scheduled time. Command executes through full Manifest lifecycle (RBAC, audit, policies).
- **Source to change:** `manifest/source/*.manifest` (add `schedule` blocks).
- **Spec:** `specs/scheduled-commands.md`

### 11.5 Adopt Rate Limiting for high-traffic commands
- **Done when:** At least 3 high-traffic commands have `rateLimit` blocks. `RateLimitConfig` entity governs limits through Manifest rather than external middleware.
- **Why:** The `rateLimit { window, maxRequests, scope, strategy }` block is a Manifest DSL feature for command-level rate limiting with per-user, per-tenant, or global scope. Capsule has a `RateLimitConfig` entity and rate-limiting infrastructure outside Manifest. Migrating to Manifest-native rate limiting centralizes the policy.
- **Backpressure:** Command exceeding rate limit returns `rateLimitExceeded` with retry-after metadata.
- **Source to change:** `manifest/source/*.manifest` (add `rateLimit` blocks to commands).
- **Doc:** Rate limiting documented at command level in Manifest DSL docs. NOTE: `/features/security-features` URL returns 404.

### 11.6 Adopt Command Retry Policies for transient-failure commands
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

### 11.9 Wire Runtime REPL for interactive debugging
- **Done when:** `pnpm manifest repl` launches interactive REPL. Can inspect entity state, evaluate Manifest expressions, test guards/policies in real-time against loaded IR.
- **Why:** The `manifest repl` command provides an interactive debugging environment for Manifest runtime. Developers can inspect entity state, evaluate expressions, test guards and policies without deploying. Currently all runtime debugging requires running the full application with breakpoint inspection. REPL dramatically improves development velocity for IR authoring and debugging.
- **Backpressure:** REPL starts, loads IR, responds to entity inspection queries.
- **Source to change:** `package.json` scripts section.
- **Doc:** Official docs `/extensibility/runtime-tooling`

### 11.10 Evaluate Time-Travel Debugger for command debugging
- **Done when:** Decision documented on adopting `@angriff36/manifest/debug` export for state mutation recording with replay. If adopted, wired to factory for at least development environments.
- **Why:** The time-travel debugger (`@angriff36/manifest/debug`) records every `mutate` during command execution and enables stepping forward/backward through state changes. Was listed as "planned" in FEATURE-LIST but is now SHIPPED. Invaluable for debugging complex multi-step commands (VendorContract lifecycle, PayrollRun processing, EventGuest RSVP flow).
- **Backpressure:** Command execution recorded. State replay produces identical final state.
- **Source to change:** `manifest/runtime/src/manifest-runtime-factory.ts`. Import from `@angriff36/manifest/debug`.
- **Doc:** Official docs `/extensibility/runtime-tooling`

### 11.11 Evaluate entity inheritance (`extends`) for entity hierarchies
- **Done when:** Decision documented on using entity inheritance to reduce repetition across entity families. If adopted, identify entity hierarchies and create base entities.
- **Why:** The `extends` keyword enables single inheritance for entities, allowing shared properties/constraints to be defined once in a base entity. Complements mixin composition (Task 11.3) for hierarchical relationships. Candidate hierarchies: Event→CateringEvent, InventoryItem→WasteEntry.
- **Backpressure:** Child entity inherits parent properties/constraints. `pnpm manifest:compile` succeeds.
- **Source to change:** `manifest/source/*.manifest`.
- **Doc:** Official docs `/language/advanced-entities`

### 11.12 Wire LLM IR validator/repair for CI
- **Done when:** `pnpm manifest validate-ir` runs in CI. Detects orphaned references, malformed entity structure, and common IR issues.
- **Why:** The `manifest validate-ir` command validates IR integrity and auto-repairs common issues. Detects orphaned references (e.g., policy names referenced but not defined), malformed entity structure, and inconsistent declarations. Would catch issues like the EventStaff table mapping bug (Task 2.5) and Event mapping divergence (Task 2.4) in CI.
- **Backpressure:** CI fails on invalid IR. Auto-repair produces valid IR.
- **Source to change:** CI workflow, `package.json` scripts section.
- **Doc:** Official docs `/extensibility/ai-tooling`

---

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

---

## Phase-Out Registry Status

| Section | Target | Status |
|---|---|---|
| A | Hand-rolled Prisma stores -> GenericPrismaStore or codegen | BLOCKED (Tier 3) |
| B | Hand-authored Prisma schema -> PrismaProjection + mapping config | IN PROGRESS (Tier 2.5 Phase 3 DONE — 188/189 matched, 251 models, prisma validate passes) |
| C | Route accessor hack -> schema-aware accessor resolution | DONE (2026-05-30) |
| D | ENTITY_DOMAIN_MAP consolidation | DONE (2026-06-04) |
| E | Explicitly NOT for phase-out (keep) | N/A |

**Exit criteria** (all must be true before declaring the initiative done):
1. `pnpm manifest:generate` produces schema + routes with zero broken `database.*` accessors.
2. `pnpm --filter api typecheck` and `next build` are green with no generated-surface drift.
3. CI drift gate: re-running generation produces no diff against committed artifacts.
4. Sections A-D above are DONE.
5. No file outside `node_modules` hand-edits a `// Generated from Manifest IR - DO NOT EDIT` file.
6. Middleware pipeline wired (RBAC, identity, audit as lifecycle hooks).
7. All 189 entities have backing Prisma models.
8. Schema generation from IR is the default workflow (hand-authored schema retired).
9. All governed domain mutations execute via `RuntimeEngine.runCommand()` (~301 direct-write violations reduced to 0 + documented bypasses).
10. Manifest DSL features (reactions, approvals, sagas, relationships) are used where the domain requires them.
11. **No `build.mjs` broken paths** -- all 4 build pipeline steps succeed without ENOENT.
12. **Permission guard coverage 100%** -- all 189 entity types have RBAC enforcement, not just 9.
13. **Source type correctness** -- zero datetime-as-number mismatches, zero datetime-mutated-to-0, zero number-into-decimal/money/int mismatches.
14. **Dead code eliminated** — ✅ rules-engine/, entity-graph/, packages/services/, legacy manifest-command-handler.ts, legacy manifest-runtime.ts (3,205 lines), unsafe outbox helper all removed.
15. **Single command handler** -- legacy manifest-command-handler.ts removed, all paths use execute-command.ts. DONE (Task 10.13).
16. **ENTITY_DOMAIN_MAP coverage 100%** -- all 189 entities mapped in canonical map (DONE), stale copies eliminated (DONE 2026-06-04).
17. **Script hygiene** -- all scripts reachable via package.json or removed (generate-all-routes.mjs, dead CODE_OUTPUT_DIR, build.mjs compile delegation).
18. **Advanced Manifest features evaluated** -- async commands, feature flags, mixin composition, scheduled commands evaluated with adoption decisions documented.
19. **`timestamps` modifier adopted** -- all 189 entities use `timestamps` modifier, hand-declared createdAt/updatedAt eliminated, datetime-as-number recurrence prevented.
20. **CLI adoption at 60%+** -- at least 25 of 40 CLI commands have package.json scripts and documented workflow integration.
21. **Realtime subscriptions evaluated** -- SSE + React hook strategy documented for high-value entities, with adoption decision recorded.
22. **Federation capability assessed** -- architecture fit documented for future multi-service decomposition.
23. **ENTITY_ACCESSOR_OVERRIDES complete** -- all 33 entries mapped (12 accessor names + 3 renamed models + 16 route drops + 2 existing). Zero generated routes reference non-existent Prisma accessors.
24. **Governance CLI suite adopted** -- at least 5 of 7 governance commands (`scan`, `audit-governance`, `audit-bypasses`, `enforce-surface`, `doctor`) have package.json scripts and CI integration.
25. **Runtime tooling wired** -- Profiler export wired to factory (not just RuntimeOption). REPL available via `pnpm manifest:repl`. Time-travel debugger evaluated with adoption decision.
26. **Tenant isolation dual-layer** -- IR-level `tenant` declaration in source files + `requireTenantContext: true` RuntimeOption both active.
27. **AI tooling evaluated** -- conformance test generator, IR validator, and NL transpiler assessed for adoption with decisions documented.
28. **Outbox consolidation** — ✅ unsafe standalone `createOutboxEvent` removed; bundle-claim route uses transactional outbox; 3 implementations → 2.

---

## Codebase Metrics (verified 2026-06-05, 18th revision)

| Metric | Value | Prior Value | Change |
|---|---|---|---|
| IR entities | 189 (ALL durable) | 189 | -- |
| IR commands | 952 (905 with guards, 950 with emits, 2 without emits) | 952 | -- |
| IR events | 936 | 936 | -- |
| IR sagas | 1 (ProcessInvoicePayment) | 1 | -- |
| IR reactions | **2** (Payment→Invoice, PaymentRefund→Invoice) | 0 | NEW: first reactions adopted |
| IR relationships | 8 entities (12 declarations) | 8 | -- |
| IR entities with FK props but no relationship | **152** | 152 | -- |
| IR entities with transitions | 96 | 96 | -- |
| IR status entities lacking transitions | 4 | 4 | -- |
| IR computed properties with empty dependencies | 563/611 (92.1%) | 563/611 | -- |
| IR overrideable constraints | 0/583 | 0/583 | -- |
| IR source files | 92 | 92 | -- |
| IR source type bugs (datetime-as-number) | **559+ in EVENT PAYLOADS only (entity-level fixed by timestamps modifier)** | 559 | CONFIRMED across ALL domains |
| IR event payload timestamps as `number` | **916 fields across 936 events** | 916 | NEW: 12th revision root cause discovery |
| IR entity property timestamps as `datetime` | **741 fields** | 741 | NEW: correctly declared, mismatch is in events only |
| IR datetime mutated to 0 | **9 occurrences** | 9 | -- |
| IR property types | string(1584) datetime(741) int(158) money(109) decimal(102) boolean(94) array(7) float(1) | same | -- |
| IR number-type props | 0 | 0 | -- |
| Prisma models | 226 total, **188 match IR**, 67 Prisma-only, **1 IR without model** (QACheck), **15 wrong accessor** | 226/173/16 | UPDATED: 188/189 matched after Task 2.5 Phase 3 |
| `prisma-store.ts` | 3,061 lines, **94** switch cases (**71 pure boilerplate, 23 custom**) | same | CORRECTED 11th rev: 94 not 93 |
| `prisma-stores/` | 45 files, ~12,694 lines | same | -- |
| Total hand-maintained store code | ~15,755 lines | same | -- |
| `manifest-runtime-factory.ts` | **520** lines | 521 | CORRECTED 11th rev |
| `manifest-runtime.ts` (package re-export) | 66 lines | 66 | -- |
| `manifest-runtime.ts` (legacy dead code) | 3,205 lines, 60+ `as any`, 50+ wrappers | same | -- |
| `manifest-runtime.ts` (API shim) | 376 lines | 376 | -- |
| `manifest-command-handler.ts` (legacy) | ~~Monolithic handler, SHOULD BE DELETED~~ DELETED (Task 10.13) | N/A | RESOLVED 2026-06-04 |
| `execute-command.ts` (canonical) | Single canonical handler, used by all 71 routes + dispatcher | N/A | RESOLVED 2026-06-04 |
| `manifest-client.generated.ts` | **1,330 functions, 0 consumers** | 1,330/3 | CORRECTED (9th rev confirms 0 consumers) |
| `manifest-types.generated.ts` | 3,367 lines, 189 interface definitions | same | -- |
| API typecheck errors | **0** (Task 0.1 RESOLVED 2026-06-04; was 80) | 80 (72+8) | RESOLVED: generator fixes + hand-written fixes applied |
| Runtime typecheck errors | **0** | 0 | -- |
| Entity graph module | 7 files, **DEAD CODE** (0 consumers, stub) | same | -- |
| Rules Engine module | 5 files, 10 rules, **DEAD CODE** (0 consumers) | same | -- |
| Dead code total (graph + rules-engine + services) | **~2400+ lines** | same | -- |
| CLI scripts using manifest | 13 of **40** (**33%**) | 13/37 | CORRECTED: 40 CLI commands total (was 35-37) |
| GenericPrismaStore | Available (233 LOC), NOT used at runtime | same | -- |
| RuntimeOptions wired | **7 of 19** (5 wired + 2 passthrough) | same | -- |
| Direct-write violations (API) | **191** across 80 files | same | -- |
| Direct-write violations (server actions) | **110** across 28 files | same | -- |
| Direct-write violations (packages) | 9+ in notifications + others | same | -- |
| Hybrid files (partial migration) | **12** (11 API + 1 app) | same | -- |
| Total direct-write violations | **301** | same | -- |
| `as any` in apps/api/app/ | 39 | 39 | -- |
| `as any` in manifest/runtime/src/ | 10 (6 factory, 1 core, 2 permission-guard, 1 re-export) | 10 | -- |
| `as any` in factory specifically | 6 (lines 387, 409, 460, 464, 492, 514) | 6 | -- |
| `as unknown as` double-casts | 32 occurrences | 32 | -- |
| describe.skip test suites | 1 (sales-reporting) | 1 | -- |
| apiFetch call sites | **1,092** across **167 files** | 1,098/169 | CORRECTED (9th rev) |
| Frontend data caching | TanStack Query installed, **5 files, 31 uses** | 6/32 | CORRECTED (9th rev) |
| use-*.ts files | 21 (10 plain functions, 11 hooks, 1 TanStack Query) | 21 | -- |
| Hardcoded API URL paths | ~1,092 (81% of total) | ~1,098 | CORRECTED (9th rev) |
| Typed path builders | ~50 | ~50 | -- |
| Files using typed routes | **7** (routes.ts has 218 lines of helpers) | 6 | CORRECTED (9th rev) |
| ENTITIES_WITH_SPECIFIC_STORES | 96 entries (95 unique, VendorContract duped) | same | -- |
| Permission guard coverage | **31 entries across 9/189 entity types (4.8%)**, allow-by-default | ~36 entries | CORRECTED 11th rev: 31 not 28 |
| Advanced RuntimeOptions features used | 0 of 15 | 0 | -- |
| Package exports actively used | 4 of **39** (10.3%) | 4/38 | CORRECTED 11th rev: 39 exports total (was 44) |
| Projections available | **27** (was 25) | 25 | CORRECTED |
| Projections NOT in prior plan | **12**: dart, dynamodb, elasticsearch, hono, jsonschema, kysely, mongoose, pydantic, remix, storybook, sveltekit, terraform | N/A | NEW |
| Projections active | 2 (nextjs, routes) + 1 pilot (prisma) | same | -- |
| Projections unevaluated | **22** (12 new + 10 from prior plan) | 20 | CORRECTED |
| Manifest config consumed | 0 of 148 lines | same | -- |
| irHash / contentHash | EMPTY (no integrity verification) | same | -- |
| Outbox implementations | **3** (realtime canonical, kitchen helpers unsafe, manifest batch) | same | -- |
| Snake_case Prisma model names | **30 models** | same | -- |
| Total API routes | **767** (363 generated + 404 hand-written) | same | -- |
| Kitchen domain routes | 165 (100 gen, 65 hand, 22 direct writes, 16 manifest) | N/A | NEW breakdown |
| Events domain routes | 76 (40 gen, 36 hand, 6 direct writes, 16 manifest) | N/A | NEW breakdown |
| Notifications domain routes | 16 (2 gen, 14 hand, 1 direct write, 7 manifest) | N/A | NEW breakdown |
| Command Board routes | 26 (12 gen, 14 hand, 4 direct, 4 manifest) | N/A | NEW breakdown |

---

## Root Cause Generator Issues

1. **Naive camelCase accessor derivation (upstream):** The nextjs projection derives Prisma accessor names as `camelCase(entityName)` with zero model-existence validation. In-repo fix (`ENTITY_ACCESSOR_OVERRIDES`) is a patch -- currently only 2 of ~31 needed overrides are mapped. 3 systematic generator bugs cause 72 of 80 typecheck errors (90%). Task 2.1 is the long-term fix.

2. **No ENTITIES_WITHOUT_TABLE filtering at projection time (upstream):** The upstream projection emits routes for ALL entities regardless of Prisma table existence. Now 23 entities (not 32). Task 2.2.

3. **ENTITY_DOMAIN_MAP duplication (3 stale copies of canonical 189-entry map):** Canonical `entity-domain-map.mjs` now covers ALL 189 entities. Stale copies: `generate-route-manifest.ts` (**90 entries of 189**, Event mapped as "manifest/Event"), `mcp-server/entity-domain-map.ts` (~92 entries, severely stale), and `build.mjs` (duplicates compile logic). 99 entities missing from route manifest map. Task 2.4.

4. **Hardcoded CLI flags bypass manifest.config.yaml:** `compile.mjs` and `generate.mjs` pass 6 explicit flags that override the 147-line config file. Task 2.3.

5. **Relationship gap in IR sources:** Only 8/189 entities have relationships defined. 152 entities with FK properties lack relationship blocks. Blocks PrismaProjection, entity graph, cascade analysis, relationship traversal in expressions. Task 0.4.

6. **Generated client disconnected from frontend patterns:** 1,330 functions with **0 consumers**. Task 6.1 must decide direction before building on it.

7. **~~32~~ ~~23~~ ~~16~~ 1 IR entity without Prisma model (QACheck):** Reduced from 32->23->16->1. All 16 entities now have Prisma model declarations (Task 0.3). PrismaProjection pipeline (Task 2.5 Phase 3) matches 188/189 — only QACheck unmatched (different concept from QualityCheck). Additionally ~14 entities need accessor overrides (handled by ENTITY_ACCESSOR_OVERRIDES). Task 0.3 + Task 0.1 + Task 2.5.

8. **Custom outbox duplicates upstream + 3 implementations total:** Factory has own `createPrismaOutboxWriter` (~60 lines) that duplicates what upstream `OutboxStore` provides. Additionally, kitchen helpers have a 3rd implementation lacking transaction safety. Task 7.2.

9. **Proxy-based permission guard instead of middleware (SECURITY):** Permission checks use a Proxy wrapper with a hardcoded 31-entry whitelist map instead of Manifest's native middleware pipeline. Commands not in the map are unrestricted. Only 9/189 entity types have RBAC coverage. Task 7.4/9.9.

10. **Duplicate EventStaff/EventStaffAssignment entities:** Two IR entities with overlapping purpose, separate Prisma models. Creates data inconsistency risk. Task 0.7.

11. **Legacy dead code in runtime package:** 3,205-line `manifest-runtime.ts` is importable but superseded. Contains 60+ `as any` casts, deprecated PostgresStore, per-entity command wrappers. Task 10.1.

12. **Rules engine + entity graph are DEAD CODE:** `createRulesEngineMiddleware()` and `buildGraphFromIR()` are exported but never imported. 12 files, ~2400 LOC, 0 consumers. Entity graph is a stub returning empty object. Task 7.5/9.1 (rebuild or delete).

13. **Entity graph stub:** `buildGraphFromIR()` needs IR relationships (Tier 0.4). Hardcoded `KNOWN_RELATIONSHIPS` should be replaced. Task 9.1.

14. **6 hardcoded values in generate.mjs + build.mjs broken path:** `defaultIr`, `defaultOutput`, `commandsManifestPath`, `dispatcherDirInfo`, projection name, surface names -- should come from `manifest.config.yaml`. `build.mjs:170` references non-existent `scripts/manifest/generate-route-manifest.ts`. `compilerVersion "0.3.8"` stale vs 2.2.0. Task 0.2.

15. **Source-level type mismatches (UNIVERSAL -- 559+ datetime-as-number + domain-specific type bugs):** The 8th revision confirmed this pattern exists in EVERY domain. Not just datetime: number into decimal/money/int, string into array, string instead of datetime, inverted boolean logic. Task 0.6 + 2.7.

16. **Store layer gaps:** User and ShipmentItem in ENTITIES_WITH_SPECIFIC_STORES but have no switch case (latent bugs). MenuPrismaStore uses raw `new Prisma.Decimal()` instead of `toDecimalInput()`. Task 3.4.

17. **notifications package ungoverned:** 9+ direct DB writes across 4 files (emailLog, sms_logs, notification_preferences, emailWorkflow) bypassing Manifest. Task 8.4.

18. **IR integrity gaps:** irHash and contentHash are empty strings. 563/611 computed properties have empty dependencies (92.1%). ~~241 top-level policies exist but all 189 entities have empty `policies: []`~~ **RESOLVED 2026-06-05:** 952/952 commands now have policies bound via `default policy` inside entity blocks (Task 8.6). 0 overrideable constraints out of 583 total. Task 0.4, 9.8.

19. **Feature adoption at 10.3%:** 39 export paths in @angriff36/manifest, only 4 actively used. 40 CLI commands available, 25 unused (63%). 27 projections available (not 9), 12 new in 8th revision. Major unused: Reactions, Sagas, Approvals, State Transitions, Entity Concurrency, Webhooks, WASM evaluator, Encryption, Feature Flags, Profiling, Agent SDK, Plugin system. 9th revision discovered: Async Commands, Feature Flags, Mixin Composition, Scheduled Commands, Entity Property Modifiers (encrypted/masked/searchable). 10th revision discovered: timestamps modifier, realtime subscriptions, computed caching, federation, IR compression, snapshot testing, property-based testing -- all fully implemented but zero adoption. Tasks 9.1-9.15, 11.1-11.4, 12.1-12.2.

20. **Frontend caching gap:** TanStack Query IS installed with QueryProvider but only 5 files (31 uses) use it. 167 other apiFetch files (1,092 call sites) get zero caching. Task 6.2.

21. **build.mjs broken path (CONFIRMED):** Line 170 references `scripts/manifest/generate-route-manifest.ts` which doesn't exist. `pnpm manifest:build` Step 3 will fail. Task 0.2.

22. **Event mapping divergence:** `generate-route-manifest.ts` (90/189 entries) maps Event as "manifest/Event" vs canonical "events/event". Route surface manifest produces wrong paths for Event commands. Task 2.4.

23. **Permission guard allow-by-default (CONFIRMED):** 31 entries across 9/189 entity types. 180/189 entities bypass all permission checks. 3 bypass paths: no user.role, command not in map, enforce:false. Security vulnerability. Task 9.9.

24. **Payroll 100% disconnected (CONFIRMED):** Sets invalid status values, constructor strips `$transaction`, zero Manifest awareness. Task 8.1.

25. **27 projections available (CORRECTED from 25):** 12 NOT in prior plan: dart, dynamodb, elasticsearch, hono, jsonschema, kysely, mongoose, pydantic, remix, storybook, sveltekit, terraform. Tasks 5.7-5.10, 5.11.

26. ~~**Legacy manifest-command-handler.ts coexists with canonical execute-command.ts:**~~ RESOLVED 2026-06-04 (Task 10.13). Legacy handler deleted, all 71 routes migrated to canonical handler.

27. **~~`timestamps` entity modifier prevents datetime-as-number bug class~~ RESOLVED 2026-06-04:** Official docs at `/language/timestamps` describe a modifier that auto-injects createdAt/updatedAt as readonly datetime properties with runtime population via `getNow()` and Prisma projection as `@default(now())`/`@updatedAt`. ZERO entities use it -- all 189 hand-declare these fields, creating the 559+ datetime-as-number mismatch opportunities. Adopting `timestamps` is the ROOT FIX that prevents this entire class of bugs from recurring. Task 2.8.

28. **Event payloads use `number` for ALL timestamps (root cause of datetime-as-number in event channel):** The `now()` builtin returns epoch-ms (number). All 936 events carry timestamp fields as `number` in their payloads (916 timestamp fields total). Entity properties are correctly `datetime` (741 fields). The mismatch is in the event emission layer: `mutate updatedAt = now()` correctly sets a `datetime` property, but the corresponding `emit` event payload declares the field as `number`. This is a Manifest compiler/runtime behavior -- event payloads mirror the runtime value type (number from `now()`), not the declared entity property type (datetime). The `timestamps` modifier (Task 2.8) fixes createdAt/updatedAt automatically but does NOT fix custom timestamp fields in events (e.g., `archivedAt`, `completedAt`, `deactivatedAt`). Those require either: (a) changing event payload type declarations in `.manifest` source, or (b) Manifest upstream fixing `now()` to return `datetime` instead of `number`. Task 2.7 source fixes remain necessary for event-level datetime mismatches.

29. **~~Top-level policies never bound to IR commands~~ RESOLVED 2026-06-05 (Task 8.6):** ROOT CAUSE: 250 top-level `policy` declarations existed OUTSIDE entity blocks, so the Manifest compiler never bound them to IR commands (all 952 had `policies: []`). The Manifest compiler requires `default policy` syntax INSIDE entity blocks to auto-expand policies to every command. Top-level `policy` declarations only define reusable templates -- they do NOT auto-bind. FIX: Added entity-specific `default policy <EntityName>DefaultAccess` inside all 92 source files via `add-default-policies.mjs` script. Result: 952/952 commands have policies, 189/189 entities have `defaultPolicies`. 8 zero-policy files (invoice, payment, collections, etc.) now protected. This was the ROOT CAUSE of the permission guard allow-by-default vulnerability (Root Cause #23) at the IR level. Task 8.6.

---

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

---

## Change Log

| Date | Change |
|---|---|
| 2026-06-03 | **Comprehensive rewrite via 83-agent audit**. Package version confirmed 2.2.0. RuntimeOptions corrected to 19 properties (3 wired). Major corrections: manifest-runtime.ts is 66 lines not 3,100+; generated client is 1,330 functions not 1,708; CLI usage is 14+ scripts not 5. |
| 2026-06-03 | **Second comprehensive update**: ALL 189 entities durable, 0 number-type properties, 80 API typecheck errors (was 939), 0 runtime typecheck errors (was 96). Tier 4 marked DONE. Added Tier 0 (typecheck + Prisma gaps + relationships). Added CLI adoption, relationship modeling, command-level policies. |
| 2026-06-03 | **Third update**: Incorporated findings from full 9-domain audit. Direct-write violations are 385 (was 141). Store layer is 88/93 boilerplate. Custom outbox duplicates upstream. 259 `as any` in apps/api, 10 in runtime. Kitchen task source bugs. Command parameter type mismatches. No frontend caching. describe.skip test suite. |
| 2026-06-03 | **Fourth revision**: Full claim verification against codebase. Key corrections: source files = 92 (was 93), API shim = 376 lines (was listed as 66), Prisma-only models = 69 (was 38). New findings: EventStaff/EventStaffAssignment duplicate, 3205-line legacy dead code, permission guard whitelist-based, EventBudget variance bug, Event source-level bugs. |
| 2026-06-03 | **Fifth revision:** Multi-agent synthesis of spec analysis, source analysis, runtime analysis, generator analysis, apps analysis, packages analysis, typecheck analysis, and gap analysis. **Key corrections:** direct-write API violations = 188 (not 236 -- empirical count); factory line count = 521; 0 of 15 advanced RuntimeOptions features used in production; `deterministicMode` and `evaluationLimits` defined in context but NOT forwarded. **New findings:** detailed typecheck error breakdown by TS error code; 10 accessor name mismatches; Rules Engine middleware factory never called; Entity graph returns empty graph; Manifest vNext features cataloged; generate.mjs has 6 hardcoded values; supplier-connectors and sentry-integration have direct Prisma writes; projections routes is ACTIVE. **New tasks:** 8.8 (adopt defaultPolicies), 9.5 (adopt state transitions), 10.10 (adopt entity concurrency). |
| 2026-06-03 | **Sixth revision:** Deep source-level audit across all manifest entity domains + IR analysis + frontend analysis + package analysis. **Key corrections:** typecheck errors = 71 generated + 9 hand-written; TS2339=32, TS2551=28, TS2353=9; store boilerplate = 90/93; generated client = 378 functions, 0 consumers; direct-write violations = ~371; apiFetch call sites = 922 across 168 files; relationship gap = 152 entities. **Critical new source bugs:** CateringOrder transition property mismatch, VendorContract blockModifyActive blocks ALL mutations, RecipeVersion totalTimeMinutes hardcoded to 0, Ingredient recordLot drops expiresAt, VendorContract lastComplianceReview decimal/datetime mismatch, ProcurementBudget periodStart/periodEnd decimal/datetime mismatch, Client tags string-into-array, PayrollLineItem zero commands, PayrollRun reject overwrites approvedBy, PayrollLineItem hours/rate typed as money. **New store bugs:** User/ShipmentItem missing switch cases, MenuPrismaStore raw Decimal. **New generator issues:** build.mjs broken path at line 170, compilerVersion 0.3.8 stale, manifest.config.yaml entirely decorative, ENTITY_DOMAIN_MAP has 3rd stale copy in build.mjs, Event mapping divergence, 6 orphaned scripts. **New packages:** notifications package 9+ direct DB writes, realtime package outbox duplicates, packages/services/ empty. **New IR findings:** 563/611 computed properties with empty dependencies, 0 overrideable constraints, irHash/contentHash empty, 241 top-level policies but entities have empty policies, 38 exports with 10.5% adoption, 35 CLI commands with 20 unused. **New frontend:** TanStack Query IS installed, 81% API URLs hardcoded. |
| 2026-06-03 | **Seventh revision:** 33-agent comprehensive audit via Workflow. **Key corrections:** typecheck errors = 79 (not 80), 3 systematic generator bugs cause 75/79 (95%); unmapped IR entities = 23 (not 32); direct-write violations = 301 total (not 371); store boilerplate = 70/93 (not 90/93); RuntimeOptions = 5/19 wired (not 3); projections available = 25 (not 9); generated client = 1,330 functions, 3 consumers (not 378/0); ENTITY_DOMAIN_MAP = 3 copies (not 2). **New critical findings:** permission guard allow-by-default on 180/189 entities (security vulnerability); build.mjs line 170 broken path (build Step 3 fails); 559 datetime-as-number source type mismatches; 3 outbox implementations (kitchen uses unsafe version); rules-engine + entity-graph confirmed dead code (~2400 LOC, 0 consumers); payroll-engine 100% disconnected from Manifest; 17 undocumented projections including llm-context, materialized-views, health, analytics. **New tasks added:** 0.2 (fix build.mjs), 2.7 (source type fixes), 5.7-5.10 (new projection evaluations), 10.4 (dead code deletion), 10.5 (outbox consolidation). **Priority escalations:** permission guard migration (9.9) escalated to security priority; entity graph (9.1) and rules engine (7.5) flagged as dead code requiring rebuild-or-delete decision. |
| 2026-06-03 | **Eighth revision:** 69-agent comprehensive audit via Workflow. **Key corrections:** projections available = 27 (not 25); server actions with direct writes = 28 files using `database.*` (not `prisma.*`); apiFetch = 169 files, 1,098 call sites; TanStack Query = 6 files, 32 uses; permission guard = 31 entries across 9 entity types (not ~36); legacy manifest-command-handler.ts coexists with canonical execute-command.ts. **Confirmed universal datetime-as-number pattern across ALL domains:** Finance (InvoiceSent.dueDate, InvoiceViewed.viewedAt, Payment events, RevenueRecognitionSchedule), Payroll (ALL timestamps, PayrollPeriod.isLeaf inverted logic), Staff (5 StaffMember events, TimeEntry, TimecardEditRequest, EmployeeAvailability), Procurement (PurchaseOrderItem number->decimal/int/money), Notifications (ALL timestamps, EmailWorkflow transitions), Kitchen (KitchenTask.dueDate, PrepList.finalizedAt mutated to 0), Inventory (totalValue number instead of money, reserve quantity, WasteEntry.reasonId), CRM (Client.defaultPaymentTerms, tags), Logistics (Driver.licenseExpiry in 3 commands, Shipment timestamps), Admin (AdminTask.dueDate string instead of datetime, RolePolicy permissions string into array), Infra/Quality (ApiKey.scopes, TrainingAssignment.completedAt, Equipment.nextMaintenanceDate, FacilityWorkOrder.deadline). **Official Manifest docs corrections:** Middleware at `/extensibility/runtime-middleware` (not `/adapters/middleware`), Sagas/Workflows at `/language/workflows` (not `/language/sagas`), Relationships documented within Entities page, Projections at `/integration/projections` (not `/projections/overview`). **Official Manifest docs feature confirmation:** 4 middleware hooks (before-guard, before-policy, before-action, after-emit) with composable, contextPatch, abortCommand, side-effects; Reactions with declarative event-to-command binding, resolve expressions, condition guards, batch mode; Workflows with multi-step, compensate, timeout, retry; Custom Stores with Store\<T\> interface (6 methods); Plugin API via definePlugin(); Tenancy via single declaration; Config via manifest.config.yaml. **API route audit by domain:** Kitchen 165 (100 gen, 65 hand, 22 direct, 16 manifest), Events 76 (40/36/6/16), Notifications 16 (2/14/1/7), Command Board 26 (12/14/4/4). **New tasks:** 0.6 expanded with domain-specific subtasks (PurchaseOrderItem, Driver.licenseExpiry, AdminTask.dueDate, Client.defaultPaymentTerms, InventoryItem.totalValue, WasteEntry.reasonId, PayrollPeriod.isLeaf, EmployeeAvailability.dayOfWeek), 5.11 (evaluate 12 new projections), 10.13 (remove legacy manifest-command-handler.ts). **New blocker:** #44 (legacy command handler coexistence). **Updated metrics:** projections = 27, apiFetch = 1,098/169, TanStack = 6 files/32 uses, permission guard = 28 entries. |
| 2026-06-03 | **Ninth revision:** Research-driven update from official Manifest docs and deep codebase analysis. **Key corrections:** API typecheck = **80 errors** (fresh count, was 79); typecheck = **72 generated + 8 handwritten** (was 71+4); generated client = **0 consumers** (was reported as 3); apiFetch = **1,092 calls in 167 files** (was 1,098/169); TanStack Query = **5 files, 31 uses** (was 6/32); generate-route-manifest.ts has only **85/189 entries** (was stated as 91); IR stores is a top-level array `ir.stores[]` not a per-entity field; IR entities without Prisma model = **16** (was 23 -- 7 now have models); IR entities with wrong accessor = **15** (new finding); 4 coexisting data patterns clearly identified (raw apiFetch, Server Actions, TanStack Query, generated client -- was stated as 3). **Complete typecheck fix list:** 16 entities to drop (no model), 15 accessor overrides to add, 6 tenantId→tenant_id where fixes, 9 createdAt→created_at orderBy fixes, 4 shipment signatureData→signature, 2 kitchen tags contains→has, 1 payroll Json→string. **Package audit findings:** 10 governed-entity direct writes in 3 packages (payroll-engine 4 on PayrollPeriod/PayrollRun/PayrollLineItem, supplier-connectors 5 on VendorCatalog, notifications 1 on EmailWorkflow) + 1 documented bypass (database/vendor-cost-service.ts on InventoryItem). **New high-value package exports:** agent-sdk (AI tool definition generation from IR), ir-diff + breaking-change (CI schema drift detection), audit/postgres (PostgresAuditSink), profiling (per-phase timing), outbox/postgres (production-grade with claim/markDelivered). **New Manifest features:** Async Commands, Feature Flags, Mixin Composition, Scheduled Commands, Entity Property Modifiers. **New script findings:** build.mjs duplicates compile.mjs, generate-route-manifest.ts 85/189 entries, prisma-projection-options EventStaff table wrong, generate-all-routes.mjs orphaned. **New tasks:** 5.12 (agent-sdk for MCP), 5.13 (ir-diff for CI), 11.1-11.4 (async commands, feature flags, mixins, scheduled commands). **New specs:** async-commands.md, reactions-implementation.md, feature-flags.md, scheduled-commands.md, agent-sdk-integration.md. |
| 2026-06-03 | **Tenth revision:** Official Manifest docs deep-dive uncovered 12+ undiscovered features. **Key corrections:** API typecheck = **79** (was 80 in 9th -- 1 fewer from upstream fix); CLI commands = **40** (was 35-37); package exports = **44** (was 38); feature adoption = **9.1%** (was 10.5%). **HIGHEST IMPACT DISCOVERY: `timestamps` entity modifier** (docs `/language/timestamps`): auto-injects createdAt/updatedAt as readonly datetime with runtime `getNow()` and Prisma `@default(now())`/`@updatedAt` projection. ZERO entities use it -- all 189 hand-declare, creating the entire 559+ datetime-as-number bug class. Adopting it is the ROOT FIX that prevents recurrence. **New Tier 0 task:** 2.8 (timestamps modifier). **New high-impact features:** `realtime` entity modifier (auto-generates SSE endpoints + React hooks with auto-reconnect -- zero realtime infra exists, Task 9.10); computed caching (`cache request/session/ttl` -- 3 strategies with dependency-driven staleness, Task 9.11); federation export (multi-service mesh: FederationRegistry, FederationClient, buildDescriptor, policy bridge, Task 12.1); snapshot testing (CI code generation validation, Task 9.12); property-based testing (fast-check invariants, Task 9.13); IR compression (60-80% size reduction, Task 9.14). **New CLI commands:** init, install-hooks, validate-ai, preflight, scan, harness, mock, docs, duplicates, runtime-check, cache-status, versions, routes, inspect, load-test (Task 9.15 expands 9.6). **New exports:** ./federation, ./compression, ./projections, ./audit, ./outbox, ./approval (top-level). **New Tier 12:** Federation & multi-service architecture evaluation. **New specs:** timestamps-modifier.md, realtime-subscriptions.md, federation-evaluation.md. **New blockers:** #51-56. **Updated exit criteria:** added criteria 19-22 (timestamps adoption, CLI 60%+, realtime evaluation, federation assessment). **New Root Cause Generator issue #27:** timestamps modifier as root fix for datetime-as-number. |
| 2026-06-03 | **Eleventh revision:** Targeted re-verification of codebase claims against current state. **Key corrections:** API typecheck = **80** (was 79 in 10th -- re-verified, 1 error reappeared); package exports = **39** (was 44 in 10th -- overcounted, verified from package.json `exports` field); switch cases = **94** (was 93); permission guard = **31 entries** (was 28); factory = **520 lines** (was 521); feature adoption = **10.3%** (4/39, was 9.1% at 4/44). **Major finding: ENTITY_DOMAIN_MAP now has 189 entries** (canonical `entity-domain-map.mjs` expanded to cover all entities -- was 89-92). This changes Task 2.4 from "expand map" to "eliminate 3 stale copies". ENTITY_ACCESSOR_OVERRIDES still has only 2 entries despite ~29 more needed. generate-route-manifest.ts has 90 entries (was stated as 85). No new completed milestones. No structural changes to tiers or priorities. No new specs needed. |
| 2026-06-04 | **Thirteenth revision:** Targeted typecheck re-verification + official docs deep-dive for runtime tooling, AI tooling, and governance CLI. **Key corrections:** API typecheck = 71 generated + 9 handwritten (was 72+8); TS2339=32 from 19 entities (was ~30/~15); TS2551=28 from 14 entities (was ~27/~14); TS2353=7 created_at + 2 absent (was 6+3). **ENTITY_ACCESSOR_OVERRIDES needs 33 entries total** (12 accessor name mismatches + 3 renamed models + 16 route drops + 2 existing). Complete accessor map documented in Task 0.1. **CONFIRMED:** MCP Server is separate export (resolves Task 12.2 "NEEDS VERIFICATION"). **CONFIRMED:** Profiling is separate export `@angriff36/manifest/profiler` (not just RuntimeOption). **New official docs findings (22 features NOT in plan):** Runtime Profiler export, AI conformance test generator, Governance CLI suite (7 commands), Tenant isolation via IR declaration, Policy matrix viewer, Runtime REPL, Time-travel debugger, Entity inheritance (`extends`), LLM IR validator/repair, Coverage Reporter API, Saga+schedule composition, Federation HTTP adapter, Policy override scope, NL transpiler. **Docs corrections:** `/features/security-features` URL returns 404, runtime tooling has 3 tools not 1, AI tooling has 3 tools not 1, tenant isolation is dual-layer. **New tasks:** 7.9 (Runtime Profiler export), 9.16 (Governance CLI suite), 9.17 (AI conformance test generator), 9.18 (Policy matrix viewer), 11.9 (Runtime REPL), 11.10 (Time-travel Debugger), 11.11 (Entity inheritance), 11.12 (LLM IR validator). **New blockers:** #61-65. **New exit criteria:** 23-27. **New specs:** governance-cli-suite.md, runtime-profiler.md, tenant-isolation-dual-layer.md, ai-tooling-adoption.md. |
| 2026-06-04 | **Seventeenth revision:** 8 more Task 0.6 source bugs resolved. PayrollLineItem duplicate stub discovered and removed. ChartOfAccount.isLeaf corrected (was misattributed to PayrollPeriod). EventStaff/EventStaffAssignment merge recommended with detailed exploration. Remaining Task 0.6 status: kitchen tags, BudgetLineItem, Dish margin, Client.defaultPaymentTerms already fixed; EmployeeAvailability not a bug; Recipe hasVersion/tagCount deferred. Task 0.3 (16 missing Prisma models) fully explored and ready. |
| 2026-06-04 | **Task 7.4c + 10.4 (21st revision):** Audit/outbox middleware replaces telemetry-embedded outbox writes. Dead code deleted: rules-engine/, entity-graph/, packages/services/ (~4,971 LOC). New: `manifest/runtime/src/middleware/audit-outbox-middleware.ts`. Modified: `manifest/runtime-factory.ts` (simplified telemetry, added audit middleware to pipeline). Deleted: 12 dead code files + 1 empty package. |
| 2026-06-04 | **Task 7.4a (20th revision):** RBAC middleware replaces Proxy-based permission guard. `createRbacMiddleware()` wired as `before-guard` middleware in factory. Proxy wrapping removed. COMMAND_PERMISSION_MAP preserved. 2560/2560 tests pass, typecheck GREEN. New files: `manifest/runtime/src/middleware/rbac-middleware.ts`, `manifest/runtime/src/middleware/index.ts`. Modified: `manifest/runtime/src/manifest-runtime-factory.ts`. |
| 2026-06-04 | **Task 7.1 + 7.2 (22nd revision):** PostgresAuditSink + PostgresOutboxStore wired from upstream. New pg-pool.ts provides singleton pg.Pool with idempotent schema bootstrap. Custom createAuditOutboxMiddleware removed from pipeline. RuntimeOptions now wires 5 of 19 properties directly (storeProvider, idempotencyStore, customBuiltins, auditSink, outboxStore). |
| 2026-06-04 | **Task 10.13 (23rd revision):** Legacy `manifest-command-handler.ts` removed (289 lines deleted). All 71 route files migrated from `executeManifestCommand` to `runManifestCommand`. All 11 test files migrated to mock the canonical handler. Webhook dispatch support added to canonical `execute-command.ts` (fire-and-forget). API typecheck 0, 2562 tests pass. Exit criteria 14 (dead code eliminated) and 15 (single command handler) now satisfied. Blocker #44 resolved. |
| 2026-06-05 | **Eighteenth revision:** Task 8.6 completed — policy binding fix. ROOT CAUSE: top-level `policy` declarations are NOT bound by the compiler; only `default policy` inside entity blocks auto-expands. Fixed by adding entity-specific `default policy` to all 92 source files. Result: 952/952 commands have policies, 189/189 entities have `defaultPolicies`. Key discovery: `policy` vs `default policy` binding semantics. Task 8.8 (defaultPolicies) also completed as part of 8.6. Exit criteria 12 (permission guard coverage 100%) now has IR-level policy foundation. |
