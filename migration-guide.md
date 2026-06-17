oc@pop-os:~/projects/capsule-pro-convex$ cat /home/oc/projects/manifest-lab/MIGRATION-GUIDE.md
# Capsule-Pro: Prisma → Convex Migration Guide

> Based on a full forensic analysis of `manifest-lab` (branch `convex-clone`).
> This repo is a working POC proving the exact same Manifest domain model can run on Convex.

---

## TL;DR

Manifest-lab takes capsule-pro's **identical** 103 `.manifest` source files (212 entities, 1054 commands, 1029 events), compiles them to the same IR, then projects them to **Convex instead of Prisma**. The official `ConvexProjection` from `@angriff36/manifest@2.10.7` generates all schema, mutations, queries, crons, HTTP routes, and sagas — zero hand-edits, and as of 2.10.7 the generated backend typechecks with **zero** TypeScript errors against Convex's generated types. This is the blueprint for migrating capsule-pro.

> **Version note:** use `@angriff36/manifest@2.10.7` or later. 2.10.6 mapped money/decimal/int to numbers (matching the runtime, fixing generated arithmetic); 2.10.7 cleared the last generated-mutation typecheck errors. Earlier versions generated, but did not typecheck clean and stored money as text — see the corrected source-differences and decimal-handling sections below.

---

## What manifest-lab Actually Is

### Architecture (side-by-side)

```
        CAPSULE-PRO (current)                    MANIFEST-LAB (POC)
        ─────────────────────                    ──────────────────

SOURCE   103 .manifest files                      103 .manifest files (near-identical)
              │                                         │
COMPILE  compile.mjs → kitchen.ir.json               compile.mjs → merged.ir.json
              │                                         │
PROJ     PrismaProjection → schema.prisma            ConvexProjection → 6 .ts files
         NextJSProjection → route handlers            (schema, mutations, queries,
              │                                       crons, http, sagas)
              │                                         │
BACKEND  PostgreSQL + Prisma Client                  Convex (local :3212/:3213)
              │                                         │
API      Next.js /api/manifest/[entity]/             Convex mutations ARE the API
         commands/[command] (dispatcher route)        api.mutations.Entity_command()
              │                                         │
REALTIME None (polling/manual refresh)               Built-in reactive queries
              │                                         │
AUTH     Clerk auth().protect()                      Stub (policyMode: "skip" in dev)
```

### The Pipeline (3 steps, 2 scripts)

**Step 1 — Compile** (`scripts/compile.mjs`, 39 lines):
- Discovers all `.manifest` files under `manifest/source/`
- Uses `compileProjectToIR()` from `@angriff36/manifest/multi-compiler`
- Outputs `manifest/ir/merged.ir.json`

**Step 2 — Generate** (`scripts/generate-convex.mjs`, 101 lines):
- Loads the IR JSON
- Imports `ConvexProjection` from `@angriff36/manifest/projections/convex`
- Iterates over 6 projection surfaces
- Writes 6 TypeScript files into `convex/`
- **Zero hand-rolled codegen.** No sed patches. The official projection does everything.

**Step 3 — Deploy** (`npx convex dev`):
- Convex CLI reads `convex/` directory
- Deploys all functions to local backend (anonymous mode)
- Generates typed API references in `apps/web/convex/_generated/`

### Config That Drives the Projection

```javascript
const baseOptions = {
  referenceMode: "stringId",   // App-level UUIDs, not Convex native _id refs
  policyMode: "skip",          // Dev mode — skip auth, keep guards/constraints
  emitEventsTable: true,       // Audit trail table
  eventsTable: "auditEvents",  // Table name for events
  output: "convex/",
};
```

### What Gets Generated (verified numbers)

| Surface | File | Lines | Count |
|---------|------|-------|-------|
| Schema | `convex/schema.ts` | 3,701 | 200 tables + 1 events table = 201 `defineTable` |
| Mutations | `convex/mutations.ts` | 27,130 | 1,043 mutations |
| Queries | `convex/queries.ts` | 4,191 | 598 query exports (list, getById, listBy) |
| Crons | `convex/crons.ts` | 10 | 0 (no schedules in IR yet) |
| HTTP | `convex/http.ts` | 11 | 0 webhook routes (none in IR yet) |
| Sagas | `convex/sagas.ts` | 44 | 2 saga orchestrators with reverse compensation |
| **Total** | **6 files** | **35,087** | |

### Generated Mutation Anatomy

Each mutation contains (in order):
1. **Arg validators** — `v.string()`, `v.number()`, `v.id("tableName")`
2. **Guard checks** — fail-closed: `if (!(condition)) throw new Error("Guard N failed")`
3. **DB write** — `ctx.db.insert()` for create, `ctx.db.patch()` for updates
4. **Payload binding** — `{ _id, id, result: { _id, id, ...doc }, _subject: { entity, command, id } }`
5. **Audit event** — insert to `auditEvents` with type, entity, entityId, timestamp
6. **Reactions** — inline fan-out: resolve target entity, patch it

---

## Source File Differences (capsule-pro vs manifest-lab)

The 103 `.manifest` files are **nearly identical**. Only `platform/reactions.manifest` differs:

| Field | capsule-pro | manifest-lab | Why |
|-------|-------------|--------------|-----|
| `accessibilityOptions` default | no default | `= []` | Required array needs explicit default or Convex rejects |
| `tags` default | no default | `= []` | Same — required array missing default |
| `dietaryRestrictions` | `""` (string) | `[]` (array) | It's an array field, not string |

These are **IR authoring fixes** — the projection is correct, the source had wrong-typed reaction params. All three are backend-agnostic (they improve Prisma output too).

> **Corrected for `@angriff36/manifest@2.10.7`:** older versions of this guide also listed `ticketPrice "0"` and `batchMultiplier "1"` string workarounds, because the previous Convex projection stored money/decimal as `v.string()`. As of 2.10.7 the projection maps every numeric type (`int`/`bigint`/`float`/`decimal`/`money`) to `v.number()`, matching the Manifest runtime. Those string workarounds are now **wrong** — Convex rejects a string in a number field at runtime (and the reaction insert's `as any` cast hides it from typecheck). manifest-lab now uses plain `0` / `1`, identical to capsule-pro, so **capsule-pro needs no money/decimal source change at all.**

---

## How to Use This as a Migration Guide

### Phase 0: Prerequisites
- `@angriff36/manifest@2.10.7` or later (2.10.6 fixed numeric types; 2.10.7 cleared the last typecheck errors)
- Convex CLI (`npx convex dev`)
- Local Convex backend (anonymous mode, ports 3212/3213)

### Phase 1: Fix IR Authoring Issues (do this FIRST in capsule-pro)

Fix the **3** reaction param type mismatches in `manifest/source/platform/reactions.manifest` — the two required-array defaults (`accessibilityOptions = []`, `tags = []`) and the array-vs-string field (`dietaryRestrictions = []`). These are backend-agnostic — they'll improve Prisma projections too.

The two money/decimal string fixes from older versions of this guide are **no longer needed and would now be bugs**: with 2.10.7, money/decimal project to `v.number()`, so capsule-pro's existing numeric values (`0`, `1`) are already correct. Leave them as numbers.

### Phase 2: Add Convex to capsule-pro

1. Install: `pnpm add convex`
2. Create `scripts/generate-convex.mjs` (copy from manifest-lab, adjust paths)
3. Add scripts to `package.json`:
   ```json
   "manifest:convex": "pnpm manifest:compile && node scripts/generate-convex.mjs",
   "convex:dev": "cd apps/app && npx convex dev"
   ```
4. Init local backend: `npx convex dev`

### Phase 3: Parallel Operation

- Keep Prisma as primary
- Generate Convex alongside
- Use `apiFetch` adapter pattern (already in capsule-pro-convex) to switch reads/writes incrementally
- Test entity-by-entity against local Convex backend

### Phase 4: Frontend Migration

Replace API calls with Convex hooks:
- `useQuery(api.queries.listEntity)` for reactive reads (auto-updates on data change)
- `useMutation(api.mutations.Entity_command)` for writes
- No HTTP API layer needed — Convex handles transport + real-time

### Phase 5: Auth Integration

Per Convex docs, Clerk integrates natively:
- Wire Clerk webhook to Convex `upsertFromClerk` / `deleteFromClerk` internal mutations
- `ctx.auth.getUserIdentity()` in mutations for authenticated identity
- Flip `policyMode: "skip"` → `"enforce"` — generated `checkRole()` stubs start enforcing

### Phase 6: Data Migration

- Export from Postgres
- Flatten to Convex document format. Note: as of 2.10.7 Convex stores money/decimal as Float64 (`v.number()`), so Postgres `NUMERIC`/`Decimal` columns import as **numbers**, not strings. (If you need lossless decimal transport on the Convex side, opt specific properties back to `v.string()` via the projection's `typeMappings` and import those as strings.)
- Import via `npx convex import` or mutation calls

### Phase 7: Remove Prisma

- Delete `packages/database/prisma/`
- Remove prisma/nextjs projections from `manifest.config.yaml`
- Delete dispatcher route handler (`apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`)
- Convex mutations ARE the API — no HTTP route layer needed

---

## What Convex Eliminates

| Current (Prisma) | Convex Replacement |
|---|---|
| `packages/database/prisma/schema.prisma` (295KB) | `convex/schema.ts` (generated, 134KB) |
| Dispatcher route handler | Not needed — mutations ARE the API |
| GET list/detail route handlers | Not needed — `useQuery(api.queries.listEntity)` |
| Prisma Client + store metadata + accessor name maps | Not needed — Convex has typed API directly |
| `manifest.config.yaml` (prisma/prisma-store/nextjs) | Replace with single ConvexProjection |
| 20+ manifest scripts (store options, schema gen, etc.) | Replace with 2 scripts (compile + generate) |
| Clerk `auth().protect()` per route | `policyMode: "enforce"` in projection config |
| Manual real-time (polling/webhooks) | Built-in reactive queries |
| Custom saga orchestration | Generated saga actions with compensation |

---

## Key Decisions

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Big bang or incremental? | All at once vs entity-by-entity | Incremental via `apiFetch` adapter |
| Auth | Clerk-Convex integration vs keep Next.js auth | Clerk-Convex — projection already stubs it |
| Self-host or cloud? | Convex Cloud vs self-hosted | Self-hosted dev, evaluate Cloud for production |
| Keep Next.js? | Next.js + ConvexReact vs pure Convex | Keep Next.js for SSR, swap data layer to Convex hooks |
| Decimal handling | String vs Float64 vs BigInt | **Float64 (`v.number()`)** — projection default as of 2.10.7, matching the Manifest runtime (which treats decimals/money as plain numbers; precision/scale are projection metadata, not runtime-enforced). Opt specific properties back into `v.string()` via `typeMappings` only if you need lossless decimal transport. |

---

## Risks and Gaps

| Risk | Severity | Mitigation |
|------|----------|------------|
| Convex has no foreign keys | Low | `referenceMode: "stringId"` — flat string refs, same as capsule-pro |
| `policyMode: "skip"` = no auth in dev | Medium | Flip to `"enforce"` before prod, wire Clerk-Convex |
| No tenant filtering in queries | Medium | Add tenant filter in query layer or generated query wrappers |
| 0 cron schedules in IR | Low | Add scheduled jobs in manifest source when needed |
| 2 sagas generated but untested | Medium | Saga compensation needs runtime validation |
| Frontend is demo-only | Medium | Production needs full CRUD UI across all 200 tables |

---

## Manifest-Lab Git History (POC Evolution)

| Commit | What |
|--------|------|
| `e917802` | Turborepo scaffold, manifest@2.2.0 |
| `20d3299` | First attempt: hand-rolled Convex projection (buggy) |
| `279c833` | Added policy/constraint/role enforcement |
| `c42c460` | Fixed expression resolver (DSL operators) |
| `5a65d8c` | **Switched to official ConvexProjection from manifest@2.10.0** |
| `4e7a751` | Minimal runtime patches (payload binding fix) |
| `6b9056d` | Standalone clone (current HEAD) |

The critical pivot was `5a65d8c` — abandoning the hand-rolled generator for the official `ConvexProjection`. The hand-rolled version silently mapped types wrong and lacked fail-closed invariants. The official projection is production-quality.

---

## The Bottom Line

Manifest-lab proves capsule-pro's domain model (212 entities, 1054 commands) projects to Convex with **zero hand-written business logic**. The ConvexProjection handles schema, mutations, queries, guards, events, reactions, sagas, and policies — all generated, all typed.

The hard part isn't the projection. It's the operational migration: auth wiring, tenant filtering, data migration from Postgres, and building out the frontend. The domain model is ready.