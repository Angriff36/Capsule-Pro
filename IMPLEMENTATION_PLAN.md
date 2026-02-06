# IMPLEMENTATION PLAN
Capsule-Pro / Manifest Runtime Integration

This document is the persistent handoff artifact between loop iterations.

It MUST remain concise and internally consistent.
It is NOT a specification archive or design journal.

Authoritative sources of truth:
- Repository source code
- specs/*
- Tests / conformance fixtures

This file tracks ONLY:

1. Active work items
2. Verified constraints discovered during implementation
3. Completion history

Nothing else.

---

## Current Platform Baseline

Manifest Runtime Version: v0.3.0

**Verified Capabilities:**
- Typed IR schema
- Deterministic execution
- Three-tier constraint severity model: OK, WARN, BLOCK
- `ConstraintOutcome` with code, severity, message, details, resolved values
- `OverrideRequest` with authorization support
- `CommandResult` with `constraintOutcomes`, `overrideRequests`, `concurrencyConflict`
- Override workflow with policy-based authorization
- Template interpolation for constraint messages
- Structured details mapping for UI display
- Event emission for OverrideApplied, ConcurrencyConflict
- Optimistic concurrency control with version properties

**Kitchen-Ops Integration Status:**
- `packages/kitchen-ops/` provides complete runtime wrappers for PrepTask, Station, InventoryItem
- Server actions exist: `manifestClaimPrepTask`, `manifestCompletePrepTask`, etc.
- Override API endpoint: `/api/kitchen/overrides`
- Three manifest files: prep-task-rules, station-rules, inventory-rules
- **GAP**: API routes bypass Manifest (direct DB mutations)
- **COMPLETED**: PostgresStore integration added (2025-02-06)
  - `createPostgresStoreProvider()` function for persistent storage
  - `KitchenOpsContext.databaseUrl` option enables Postgres backing
  - Table namespacing per tenant: `kitchen_prep_tasks_{tenantId}`, etc.
- **GAP**: Missing conformance tests

---

## Active Tasks

### P0 - Complete Kitchen Ops Migration to Manifest

**Current State:**
- Server actions in `apps/app/app/(authenticated)/kitchen/prep-tasks/actions.ts` use Manifest runtime
- API routes in `apps/app/app/api/kitchen/tasks/[id]/claim/route.ts` bypass Manifest

**Tasks:**
- [x] Replace direct DB mutations in API routes with Manifest runtime commands (2025-02-06)
  - Migrated `/api/kitchen/tasks/[id]/claim` to use `claimPrepTask` via Manifest runtime
  - Migrated `/api/kitchen/tasks/[id]` PATCH to use `completePrepTask`, `cancelPrepTask`, `releasePrepTask`
- [x] Implement PostgresStore for persistent entity storage (2025-02-06)
  - `createPostgresStoreProvider()` function for persistent storage
  - `KitchenOpsContext.databaseUrl` option enables Postgres backing
  - Table namespacing per tenant: `kitchen_prep_tasks_{tenantId}`, etc.
- [x] Add storeProvider to runtime initialization for Postgres backing (2025-02-06)
- [x] Create PrismaStore adapter for bridging Manifest entities to existing Prisma schema (2025-02-06)
  - `PrepTaskPrismaStore` class maps Manifest PrepTask to Prisma PrepTask + KitchenTaskClaim tables
  - `createPrismaStoreProvider()` function for Store interface
  - Handles claim synchronization between Manifest's inline claimedBy/claimedAt and Prisma's separate KitchenTaskClaim table
- [ ] Audit all kitchen mutation paths for Manifest compliance
- [ ] Add telemetry: count WARN/BLOCK constraints, override usage, top constraint codes
- [ ] Write conformance fixtures for all prep-task, station, and inventory commands

**Owner:** Loop

---

### P1 - Event Import Workflow Manifest Integration

**Current State:**
- `apps/app/app/api/events/documents/parse/route.ts` has incomplete/broken Manifest integration
- References to `createEventImportRuntime`, `processDocumentImport`, `createOrUpdateEvent` don't exist
- Try-catch fallback to original behavior (non-deterministic)

**Tasks:**
- [ ] Create event-import-rules.manifest with DocumentImport, Event, EventReport entities
- [ ] Implement commands: parseDocument, validateEvent, createEvent, generateChecklist, generateBattleBoard
- [ ] Define constraints for: missing fields, validation failures, data quality
- [ ] Create event-import-runtime.ts in packages/kitchen-ops or new package
- [ ] Replace broken integration with working Manifest-powered workflow
- [ ] Emit structured events for each workflow step
- [ ] Add idempotency keys for retry safety

**Owner:** Loop

---

### P2 - Spec Implementation (56 Total Specs, 17 TODO)

**Completed Specs (non-TODO):**
- All feature specs exist and are well-defined

**TODO Specs Requiring Implementation:**
- `manifest-kitchen-ops-rules-overrides` - Foundation spec (in progress)
- `ai-employee-conflict-detection`
- `ai-inventory-conflict-detection`
- `ai-venue-conflict-detection`
- `ai-equipment-conflict-detection`
- `event-timeline-builder`
- `kitchen-allergen-tracking`
- `mobile-time-clock`
- `scheduling-labor-budget-tracking`
- `scheduling-auto-assignment`
- `warehouse-shipment-tracking`
- `scheduling-availability-tracking`
- `warehouse-receiving-workflow`
- `scheduling-shift-crud`
- `ai-suggested-next-actions`

**Tasks:**
- [ ] Prioritize TODO specs by business value and dependencies
- [ ] For each spec: create corresponding .manifest file or use existing runtime
- [ ] Implement commands, guards, constraints following severity model
- [ ] Add conformance tests for each spec
- [ ] Document integration points with existing API routes

**Owner:** Loop

---

### P3 - Diagnostics and Observability

**Tasks:**
- [ ] Unify runtime error reporting format across all Manifest usage
- [ ] Ensure API/UI receive consistent `CommandResult` shapes
- [ ] Add test coverage for denial explanations with resolved values
- [ ] Create diagnostics UI component for constraint outcomes
- [ ] Add override audit log viewer

**Owner:** Loop

---

## Verified Constraints

### Manifest Runtime v0.3.0 Facts

1. **Severity Model IS Implemented**
   - `IRConstraint.severity?: "ok" | "warn" | "block"` exists
   - `ConstraintOutcome.severity: "ok" | "warn" | "block"` is returned
   - Previous plan stating "no severity levels" was incorrect

2. **Constraint Evaluation Returns Full Outcomes**
   - `evaluateCommandConstraints()` returns `ConstraintOutcome[]`
   - Each outcome has: code, constraintName, severity, formatted, message, details, passed, overridden, overriddenBy, resolved
   - Template interpolation via `interpolateTemplate()`

3. **Override Workflow is Complete**
   - `OverrideRequest` type with constraintCode, reason, authorizedBy, timestamp
   - `validateOverrideAuthorization()` checks policies or defaults to admin role
   - `emitOverrideAppliedEvent()` audits all overrides
   - `overrideable?: boolean` on constraints
   - `overridePolicyRef?: string` for policy-based authorization

4. **Optimistic Concurrency Control**
   - `versionProperty` and `versionAtProperty` on IREntity
   - `ConcurrencyConflict` event emission on version mismatch
   - Auto-increment version on successful updates

5. **Event Provenance**
   - `EmittedEvent.provenance` contains contentHash, compilerVersion, schemaVersion
   - `IRProvenance` with contentHash, irHash, compilerVersion, schemaVersion, compiledAt
   - `verifyIRHash()` for integrity checking
   - `requireValidProvenance` option for production safety

### Loop Iteration Rules

- Loop iteration completes only after:
  - Validation passes (pnpm lint, format, type-check, build)
  - Plan updated (this file)
  - Commit created

- Plan must not exceed actionable size.
  Background material belongs in `/docs`.

### Code Quality Standards

- **No `any` types**: Use Prisma inference or `unknown` + narrowing
- **Windows paths**: Use backslashes for Edit tool paths
- **pnpm only**: No npm/yarn
- **Run validation after implementation**: pnpm install, lint, format, test, build

---

## Completed Work

### 2025-01-XX: Initial Platform Audit

**Discovery:**
- Manifest v0.3.0 is fully functional with severity levels and override support
- Kitchen-Ops runtime implementation exists and is comprehensive
- Server actions use Manifest correctly
- API routes need migration
- Event import integration broken
- 17 specs marked TODO awaiting implementation

**Files Analyzed:**
- `packages/manifest/src/manifest/runtime-engine.ts` (2027 lines)
- `packages/manifest/src/manifest/ir.ts` (ConstraintOutcome, OverrideRequest defined)
- `packages/manifest/src/manifest/types.ts` (AST nodes with severity)
- `packages/kitchen-ops/src/index.ts` (1232 lines, complete wrappers)
- `packages/kitchen-ops/manifests/*.manifest` (3 files with constraints)
- `apps/app/app/(authenticated)/kitchen/prep-tasks/actions.ts` (uses runtime)
- `apps/app/app/api/kitchen/overrides/route.ts` (override endpoint)
- `apps/app/app/api/events/documents/parse/route.ts` (broken integration)
- `specs/manifest-kitchen-ops-rules-overrides_TODO/*.md` (foundation spec)

**Corrected Misconceptions:**
- Previous plan stated "no severity levels" - INCORRECT, severity exists
- Previous plan stated "no structured constraint outcome array" - INCORRECT, exists
- Reality: v0.3.0 has complete implementation, gaps are in adoption, not capability

**Next Actions:**
- Migrate API routes to use Manifest runtime
- Fix event import workflow
- Implement TODO specs with Manifest backing
- Add conformance tests

---

### 2025-02-06: PostgresStore Integration for Kitchen-Ops

**Completed:**
- Added `stores.node` export to `packages/manifest/package.json`
- Implemented `createPostgresStoreProvider()` in `packages/kitchen-ops/src/index.ts`
  - Maps entity names to table names: `PrepTask` → `kitchen_prep_tasks_{tenantId}`, etc.
  - Dynamic require to avoid hard dependency on `pg` package
  - Graceful fallback to memory store if PostgresStore unavailable
- Extended `KitchenOpsContext` with optional `databaseUrl` property
- Updated all four runtime creation functions to use `storeProvider` option:
  - `createPrepTaskRuntime()`
  - `createStationRuntime()`
  - `createInventoryRuntime()`
  - `createKitchenOpsRuntime()`

**Files Modified:**
- `packages/manifest/package.json` - Added stores.node export
- `packages/kitchen-ops/src/index.ts` - Added PostgresStore integration

**Usage:**
```typescript
const runtime = await createKitchenOpsRuntime({
  tenantId: "tenant-123",
  userId: "user-123",
  userRole: "kitchen_staff",
  databaseUrl: process.env.DATABASE_URL, // Enables Postgres persistence
});
```

**Table Schema (auto-created by PostgresStore):**
- `id` (TEXT PRIMARY KEY)
- `data` (JSONB NOT NULL)
- `created_at`, `updated_at` (TIMESTAMP)
- GIN index on `data` for efficient querying

---

### 2025-02-06: API Route Migration to Manifest + PrismaStore Adapter

**Completed:**
- Created `packages/kitchen-ops/src/prisma-store.ts` with Prisma-backed Store implementation
  - `PrepTaskPrismaStore` class bridges Manifest entities to existing Prisma schema
  - Handles claim synchronization between Manifest inline fields and Prisma's KitchenTaskClaim table
  - `createPrismaStoreProvider()` factory for runtime configuration
  - `loadPrepTaskFromPrisma()` and `syncPrepTaskToPrisma()` helper functions
- Updated `packages/kitchen-ops/package.json`:
  - Added `@repo/database` dependency
  - Added `/prisma-store` export for Store implementations
- Updated `packages/kitchen-ops/src/index.ts`:
  - Exported PrismaStore types and functions
- Migrated API routes to use Manifest runtime:
  - `/api/kitchen/tasks/[id]/claim/route.ts` - Now uses `claimPrepTask()` via Manifest
  - `/api/kitchen/tasks/[id]/route.ts` (PATCH) - Now uses `completePrepTask()`, `cancelPrepTask()`, `releasePrepTask()`
  - Both routes handle constraint outcomes (BLOCK severity returns 400)
  - Both routes include constraint outcomes in response payload
  - Both routes create outbox events with constraint data

**Files Modified:**
- `packages/kitchen-ops/src/prisma-store.ts` - Created new file
- `packages/kitchen-ops/package.json` - Added database dependency and prisma-store export
- `packages/kitchen-ops/src/index.ts` - Added PrismaStore exports
- `apps/app/app/api/kitchen/tasks/[id]/claim/route.ts` - Migrated to Manifest runtime
- `apps/app/app/api/kitchen/tasks/[id]/route.ts` - Migrated to Manifest runtime
- `IMPLEMENTATION_PLAN.md` - Updated task status and added completion history

**Architecture Notes:**
- Manifest uses command-based mutations (claim, complete, cancel, release)
- Prisma uses generic field updates - mapping requires routing status changes to appropriate commands
- Non-status updates (priority, tags, etc.) still use direct Prisma updates
- Status changes through Manifest enable constraint checking and event emission
- PrismaStore adapter maintains existing database schema (no migration needed)
