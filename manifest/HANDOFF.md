# HANDOFF — Manifest slice, Phase 2 functional gate (2026-05-30, updated)

> Tool transport degraded badly at end of session (Bash/Read returning STALE cached output —
> replaying prior results instead of running). STOPPED making unverifiable changes per Rule 12.
> This file is the durable pick-up point. Canonical planning: `manifest/notes.md` §10–§14
> (gitignored), `manifest/task_plan.md` (gitignored), `manifest/phase-out-registry.md` (tracked).

## GATE STATUS (functional gate, per user's new_success_gate) — ✅ ALL MET (2026-05-30)
1. ✅ Manifest source compiles to IR — `pnpm manifest:compile` OK (132 entities, 593 commands).
2. ✅ Full schema validates — `prisma validate` → "is valid 🚀", 0 errors.
3. ✅ Prisma Client generates — `pnpm --filter @repo/database generate` → "Generated Prisma Client (7.3.0)".
4. ✅ Typecheck — `pnpm --filter @repo/manifest-runtime typecheck` and `pnpm --filter api typecheck` both exit 0.
5. ✅ StaffMember.create / Event.create / EventStaff.assign executed through RuntimeEngine
   (`run-manifest-command-core` for the two creates; createInstance+runCommand for assign) — all ok.
   Rows landed in the REAL typed tables `staff_members` + `event_staff` (NOT the JSON blob), Event via `event`.
6. ✅ Audit rows — exactly one `outbox_event` per command (StaffMember:1, Event:1, EventStaff:1).
   (Minor pre-existing gap: outbox `aggregateId` is "unknown" — the factory's id extraction reads
   `result.result.id`, which these command results don't surface at top level. Not a gate blocker.)
7. ✅ No generated route calls stale `eventStaffAssignment`; EventStaff command now writes to
   `event_staff` (verified legacy `event_staff_assignments` got 0 rows).

### How the store wiring was actually done (supersedes the STORE_CONFIGS guesses below)
The factory's `PrismaStore` (prisma-store.ts L2971) delegates to `createPrismaStoreProvider` — a
hand `switch(entityName)` (L1677), NOT a `STORE_CONFIGS` map. Changes made:
- NEW `manifest/runtime/src/prisma-stores/staff-slice.ts`: `StaffMemberPrismaStore` (prisma.staffMember →
  staff_members) + `EventStaffPrismaStore` (prisma.eventStaff → event_staff). Modeled on the batch09
  pattern + shared.ts coercion helpers; composite key `tenantId_id`; soft-delete via deletedAt.
- `prisma-store.ts`: import the two new stores; `case "EventStaff"` now returns `EventStaffPrismaStore`
  (was `EventStaffAssignmentPrismaStore` → legacy event_staff_assignments); added `case "StaffMember"`.
- `manifest-runtime-factory.ts`: added `"StaffMember"` to `ENTITIES_WITH_SPECIFIC_STORES` (Event/EventStaff already present).
- Source fixes required to make `createInstance({id})` bootstrap pass block-severity entity constraints:
  `event-rules.manifest` eventType default ""→"general"; removed two mis-modeled entity invariants
  (`blockCancelIfFinalized`/`blockArchiveIfNotCompleted` — already enforced as cancel/archive command
  guards, but as entity invariants they made Event un-instantiable). `staff-member-rules.manifest`
  displayName default ""→"Unnamed" (matches the Event.title="Untitled Event" convention). IR recompiled.
- DB: additive migration `20260530194102_repair_drift` (via `pnpm db:repair`, since the shadow-DB
  `db:dev` path is blocked by a pre-existing broken historical migration `20260304220000_add_quality_control`
  referencing `core.accounts`) created `tenant_events.event_staff` + `tenant_staff.staff_members`;
  `pnpm db:deploy` applied it; `pnpm db:check` → zero drift.

## WHAT IS ON DISK NOW (real, verified before transport died)
- **Source authored** (`manifest/source/`): NEW `staff-member-rules.manifest` (StaffMember durable,
  create/updateProfile/deactivate); `event-staff-rules.manifest` flipped memory→durable +
  userId→staffMemberId everywhere + shiftStart/shiftEnd number→int; `event-rules.manifest`
  budget/ticketPrice number→money. IR recompiled & verified.
- **LIVE SCHEMA WAS PROMOTED** — `packages/database/prisma/schema.prisma` now has **226 models**
  (224 hand verbatim + appended `model StaffMember` @@map("staff_members") @@id([tenantId,id])
  @@schema("tenant_staff") and `model EventStaff` @@map("event_staff") @@id([tenantId,id])
  @@schema("tenant_events")). **Backup at `.tmp/schema.prisma.bak`** (pre-promotion 224-model).
  NOTE there is ALSO a pre-existing `model EventStaffAssignment` (the OLD hand table @1394) — it
  still exists; the NEW `model EventStaff`@6396 is a SEPARATE table (`event_staff`). That's fine
  (additive), but see WIRING.
- **Prisma Client regenerated** from the 226-model schema → `packages/database/generated`.
- **New scripts** (`manifest/scripts/`, all working): `emit-full-schema.mjs` (ADDITIVE mode),
  `generate-prisma-schema.mjs` (per-entity harness), `prisma-projection-options.mjs` (options +
  ENTITY_SCHEMA_MAP/COMPOSITE_KEY/TABLE_MAP), `entity-domain-map.mjs` (Phase-1).
- `manifest/ir/candidate-schema.prisma` = the validated candidate (same as live now).

## ⚠️ STORE WIRING — CORRECTED MECHANISM (read this first)
There are TWO store mechanisms in `manifest/runtime/src/prisma-store.ts`:
1. **Generic `PrismaStore` class** (~L2971) — the factory ACTUALLY uses this:
   `manifest-runtime-factory.ts` L395 does `new PrismaStore({ prisma, entityName, tenantId, ... })`
   for any entity in `ENTITIES_WITH_SPECIFIC_STORES`. This generic class resolves the Prisma model
   from `entityName` INTERNALLY (need to read L2971+ to see exactly how — camelCase? a lookup map?).
2. **`createPrismaStoreProvider` switch** (~L1677) — a SEPARATE/older mechanism with per-entity
   hand classes (e.g. `case "EventStaff": return new EventStaffAssignmentPrismaStore(...)` → OLD
   `event_staff_assignments` table). UNVERIFIED whether the factory path calls this at all.
NEXT SESSION FIRST STEP: read `prisma-store.ts` L2971+ (generic PrismaStore) to learn how it maps
`entityName`→model + columns. THAT determines what (if anything) StaffMember/EventStaff need. If the
generic store camelCases entityName: `EventStaff`→`eventStaff` (the NEW table ✓), `StaffMember`→
`staffMember` (NEW table ✓) — then possibly only need to ADD `StaffMember` to
`ENTITIES_WITH_SPECIFIC_STORES` (EventStaff already there) and confirm column mapping. Verify before editing.

## ⚠️ STORE WIRING — the key remaining risk (RESUME HERE, gate #4-6)
The runtime store provider is in `manifest/runtime/src/manifest-runtime-factory.ts`:
- `storeProvider(entityName)` (~L372): if `ENTITIES_WITH_SPECIFIC_STORES.has(entityName)` → builds
  `PrismaStore` from `STORE_CONFIGS[entityName]` (`.model`, `.mapToManifest`, `.mapToPrisma`); else
  `PrismaJsonStore` fallback.
- `PrismaStore` (`prisma-store.ts`): `delegate = prisma[config.model]` — so `STORE_CONFIGS[E].model`
  must be the Prisma CLIENT ACCESSOR (camelCase of the model name).
- `ENTITIES_WITH_SPECIFIC_STORES` already contains `Event`, `EventStaff`, `User`, `Client`, … but
  **NOT `StaffMember`** (it's new).
- **DID NOT LOCATE where `STORE_CONFIGS` is defined/imported** (transport died; grep returned stale
  cache). `manifest-runtime-factory.ts` references it but the def is imported from another module —
  FIND IT FIRST next session: `grep -rn "STORE_CONFIGS" manifest/runtime/src` and check imports at
  top of factory (~L1-30). Likely a generated/large config object or a `prisma-stores/` aggregation.

### Wiring TODO (next session)
1. Find `STORE_CONFIGS` definition.
2. **EventStaff**: its existing STORE_CONFIG (if any) almost certainly points `.model:
   "eventStaffAssignment"` (the OLD table). For the slice, EventStaff must now write to the NEW
   `event_staff` table → Prisma accessor `eventStaff`. Update `.model` to `"eventStaff"` and fix
   mapToManifest/mapToPrisma to the new columns (staffMemberId, shiftStart:int, etc.). OR decide the
   slice keeps using the existing eventStaffAssignment table — but that contradicts the new
   StaffMember-based model. RECOMMENDED: point at the new `eventStaff` model.
3. **StaffMember**: add to `ENTITIES_WITH_SPECIFIC_STORES` + add a `STORE_CONFIGS.StaffMember`
   ({ model: "staffMember", mapToManifest/mapToPrisma identity-ish }).
4. **Event**: already wired (uses `event` model) — verify mapToPrisma handles budget/ticketPrice
   Decimal (`.toFixed(2)` per AGENTS.md Prisma rule).

## DB: push the new tables (dev reset OK per user)
After wiring, create the 2 new tables. Dev data is expendable. Options:
- `pnpm db:dev --create-only --name add_staff_member_event_staff` then `pnpm db:deploy`, OR
- for pure dev throwaway, a direct push — but repo DISABLES `prisma db push` (AGENTS.md). Use the
  `db:dev` migration path. The new models are additive (new tables in tenant_staff/tenant_events),
  so the migration is clean.

## RUN THE COMMANDS (gate #5/#6)
Canonical path: `POST /api/manifest/[entity]/commands/[command]` → `apps/api/lib/manifest/execute-command.ts`
→ `RuntimeEngine.runCommand`. Needs: API server (port 2223) + Clerk auth + tenant context + DB.
Two ways to satisfy gate #5/#6:
- (a) Start api dev server, POST the 3 commands with a valid tenant/user (heaviest; needs secrets).
- (b) Write a small NODE harness that builds the runtime via `createManifestRuntime(...)` from
  manifest-runtime-factory with a test tenantId/userId and calls `runCommand("create", {...},
  {entityName:"StaffMember"})` etc., then queries the audit table. Lighter; preferred for the gate.
  Check how `execute-command.ts` builds context to mirror it.
Audit: confirm rows in whatever audit sink the runtime uses (check manifest-runtime-factory for the
audit wiring — outbox/audit adapter).

## DO NOT
- Don't chase byte-parity. Don't preserve dev data. Don't switch EventStaff back to User.
- Don't add bespoke route logic — commands go through the generic dispatcher only.
- Don't trust stale tool output — if Bash/Read replay old results, STOP and resume when stable.

## ROLLBACK if needed
`cp .tmp/schema.prisma.bak packages/database/prisma/schema.prisma && pnpm --filter @repo/database generate`
restores the pre-slice 224-model schema.
