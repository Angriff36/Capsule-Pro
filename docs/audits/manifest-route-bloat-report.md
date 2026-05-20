# Manifest Route Generation Bloat Report

> **⚠️ HISTORICAL DOCUMENT (2026-05-08).** This report documented the 232 generated per-command routes and the bloat from the old generation system. The dynamic dispatcher at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` has since replaced all generated routes. This report is kept for historical context; the bloat it describes has been resolved.

**Date:** 2026-05-08  
**Scope:** `apps/api/app/api/` route surface vs `packages/manifest-ir/dist/routes.manifest.json`  
**Method:** Filesystem census + IR canonical route comparison + generator analysis

---

## 1. Route File Census

| Metric | Count |
|--------|-------|
| Total `route.ts` files on disk | **1,381** |
| Generated (`// Generated from Manifest IR`) | **944** (68.4%) |
| Hand-written (no marker) | **437** (31.6%) |

### Generated File Breakdown

| Pattern | Count | Description |
|---------|-------|-------------|
| `entity/list` | 91 | GET list routes (flat camelCase entity) |
| `entity/[id]` | 88 | GET detail routes (flat camelCase entity) |
| `entity/command` | 375 | POST command routes (flat camelCase entity) |
| `domain/subdomain/entity/...` | 390 | Domain-organized projection routes |
| **Total generated** | **944** | |

---

## 2. Generated vs Hand-Written

**Marker:** `// Generated from Manifest IR - DO NOT EDIT` on line 2 of every generated file.

- 944 files carry this marker
- 437 files do not — these are hand-coded REST adapters, infrastructure routes, and utility endpoints

Hand-written routes fall into these categories:
- **Domain REST adapters:** `accounting/accounts`, `kitchen/dishes`, `crm/clients`, `staff/employees`, etc.
- **Infrastructure:** `cron/*`, `webhooks/*`, `health/*`, `sentry-fixer/*`
- **Integration endpoints:** `integrations/goodshuffle/*`, `integrations/nowsta/*`, `integrations/quickbooks/*`
- **Command board proxy:** `command-board/*`
- **Public endpoints:** `public/contracts/[token]/*`, `public/proposals/[token]/*`
- **AI/bulk/suggestion routes:** `ai/*`, `analytics/*`, `search`

---

## 3. Manifest IR Canonical Surface

| IR Metric | Count |
|-----------|-------|
| Total routes in `routes.manifest.json` | **729** |
| Entity list routes (`entity-read`) | 107 |
| Entity detail routes (`entity-read`) | 107 |
| Command routes | 515 |
| Unique entities with read routes | 107 |
| Entities with commands | 107 |
| Unique `.manifest` source files | 74 |

**Per-entity command density (top 10):**

| Entity | Commands | Total Routes |
|--------|----------|-------------|
| CollectionCase | 18 | 20 |
| EventImportWorkflow | 18 | 20 |
| PrepTaskPlanWorkflow | 16 | 18 |
| KitchenTask | 15 | 17 |
| PrepTask | 13 | 15 |
| RevenueRecognitionSchedule | 12 | 14 |
| Event | 10 | 12 |
| Invoice | 10 | 12 |
| PrepList | 10 | 12 |
| VendorContract | 10 | 12 |

---

## 4. Estimated File Counts Under Alternative Generation Strategies

### 4a. List/detail routes only (no command files)

| Component | Count |
|-----------|-------|
| List routes | 107 files |
| Detail routes | 107 files |
| **Total** | **214 files** |

IR projects 107 entities × 2 read routes. Drop all command projections from filesystem generation.

**Reduction:** 944 → 214 (**-77%**)

### 4b. One physical route per command (current pattern)

| Component | Count |
|-----------|-------|
| List routes | 107 |
| Detail routes | 107 |
| Command routes | 515 |
| **Total** | **729 files** |

This matches the IR canonical surface 1:1. Still high but at least proportional.

**Current excess:** 944 vs 729 = **215 extra files** from domain-organized duplications.

### 4c. One generic dynamic Manifest command dispatcher

| Component | Count |
|-----------|-------|
| List routes | 107 |
| Detail routes | 107 |
| Command dispatcher | **1 file** |
| **Total** | **215 files** |

Single `[entity]/[command]/route.ts` dynamic route:

```
apps/api/app/api/
  [entity]/
    list/route.ts         ← GET  (list)
    [id]/route.ts         ← GET  (detail)
    commands/[command]/route.ts  ← POST (command dispatcher)
```

The command dispatcher reads `params.entity` and `params.command`, resolves via IR registry, calls `runtime.runCommand()`.

**Reduction:** 944 → 215 (**-77%**)

---

## 5. Duplicate / Overlapping Route Surfaces

### 5.1 Dual Projection (Flat + Domain-Organized)

The generator creates routes under BOTH naming conventions for some entities:

| Pattern | Example |
|---------|---------|
| Flat camelCase | `eventimportworkflow/cancel/route.ts` |
| Domain-organized | `events/import-workflows/commands/cancel/route.ts` |

Both serve the same entity/command. 27 domain-organized generated files carry the marker, but **390 domain-organized files total are generated** — many duplicating flat routes under different paths.

### 5.2 Generated vs Hand-Written Overlap

**57 of 107 entities (53.3%)** have both generated and hand-written routes for the same entity:

| Entity | Generated Path | Hand-Written Path |
|--------|---------------|-------------------|
| Client | `/api/client/list`, `/api/client/[id]` | `/api/crm/clients`, `/api/crm/clients/[id]` |
| Dish | `/api/dish/list`, `/api/dish/[id]` | `/api/kitchen/dishes` |
| Event | `/api/event/list`, `/api/event/[id]` | `/api/events` |
| Invoice | `/api/invoice/list`, `/api/invoice/[id]` | `/api/accounting/invoices` |
| Recipe | `/api/recipe/list`, `/api/recipe/[id]` | `/api/kitchen/recipes` |
| Lead | `/api/lead/list`, `/api/lead/[id]` | `/api/crm/leads` |
| Ingredient | `/api/ingredient/list`, `/api/ingredient/[id]` | `/api/kitchen/ingredients` |
| ... | ... 50 more entities ... | ... |

This means **for 57 entities, there are at least 4 routes on disk serving the same data** (2 generated + 2 hand-written), plus additional command routes on each side.

### 5.3 Command Route Proliferation

515 commands across 107 entities = average **4.8 commands per entity**. The top entity (CollectionCase) has **18 commands**, each in its own physical `route.ts` file. This is the primary driver of file count.

---

## 6. Architecture Recommendation: Lower-Bloat Design

### Current State

```
1,381 route.ts files
├── 944 generated (IR projection — flat + domain-organized duplicates)
│   ├── 214 entity-read (list/detail)
│   ├── 515 individual command files
│   └── 215 domain-organized projection duplicates
└── 437 hand-written (REST adapters, infra, integrations, proxies)
    ├── ~250 REST adapters (overlapping with generated read routes)
    ├── ~80 infrastructure (cron, webhooks, health, sentry)
    ├── ~60 integration endpoints
    └── ~47 other (public, AI, analytics, search)
```

### Proposed Architecture

```
~400 route.ts files  (↓71%)
├── 214 generated entity-read (list/detail) — KEEP, direct Prisma, fast
│   └── Projected to: entityName/list, entityName/[id]
├──   1 generated command dispatcher — REPLACE 515 individual command files
│   └── Dynamic route: [entity]/commands/[command]/route.ts
│   └── Resolves via IR registry, runs through Manifest runtime
├── ~150 thin REST adapters — KEEP only stable external/public routes
│   └── Domain-organized: /api/accounting/accounts, /api/crm/clients
│   └── These delegate to generated list/detail routes internally
└──  ~35 infrastructure (cron, webhooks, health, sentry) — KEEP
```

### Rules

1. **Generated list/detail routes only where useful.** Drop all generated command route files. Keep 214 entity-read files — they're thin Prisma queries, fast to compile, and useful for tools/Vercel.

2. **One shared Manifest command dispatcher.** Replace 515 individual `entityName/commandName/route.ts` files with a single dynamic route: `[entity]/commands/[command]/route.ts`. The dispatcher:
   - Resolves entity + command from URL params
   - Looks up the command in the compiled IR registry
   - Routes through `runtime.runCommand()` (preserving guards, policies, constraints)
   - No per-command file generation needed

3. **Thin REST adapters only for stable external/public routes.** Hand-coded `accounting/accounts`, `crm/clients`, `kitchen/dishes` provide kebab-case, human-readable URLs for external consumers and the frontend. These are **adapters** — they internally delegate to the IR-backed read/command infrastructure.

4. **No domain-organized duplicate generation.** The current generator creates both `entityName/list` AND `domain/subdomain/entity/list` for the same IR entity. Eliminate the domain-organized generation path. If domain-organized REST routes are needed, write them once by hand as thin adapters.

5. **Do not hand-edit generated files.** Continue treating generated files as projections. The IR is the source of truth.

### Impact Estimate

| Metric | Current | Proposed | Reduction |
|--------|---------|----------|-----------|
| Total route.ts files | 1,381 | ~400 | **71%** |
| Generated files | 944 | 215 | **77%** |
| Command route files | 515 | 1 | **99.8%** |
| Duplicate entity surfaces | 57 entities | 0 | **100%** |
| Next.js compilation units | 1,381 | ~400 | **71%** |

### Implementation Order

1. **Phase 1:** Create the dynamic command dispatcher `[entity]/commands/[command]/route.ts`. Verify all 515 existing commands pass through it correctly.
2. **Phase 2:** Delete the 515 generated per-command route files.
3. **Phase 3:** Stop generating domain-organized projection duplicates (390 files).
4. **Phase 4:** For the 57 overlapped entities, choose one canonical read path per entity. Remove the unused duplicate. Prefer keeping the hand-written REST adapter for external/public entities, prefer the generated route for internal-only entities.
5. **Phase 5:** Audit remaining 437 hand-written routes and remove any that are now redundant.

---

## 7. Appendix: Generator Architecture

The Next.js generator (`packages/manifest-runtime/src/manifest/projections/nextjs/generator.ts`) exposes 5 surfaces:

| Surface | Output | Path convention |
|---------|--------|-----------------|
| `nextjs.route` | GET list handler | `entityName/list/route.ts` |
| `nextjs.detail` | GET detail handler | `entityName/[id]/route.ts` |
| `nextjs.command` | POST command handler | `entityName/kebab-command/route.ts` |
| `ts.types` | TypeScript type defs | `src/types/manifest-generated.ts` |
| `ts.client` | Client SDK | `src/lib/manifest-client.ts` |

The routes projection (`packages/manifest-runtime/src/manifest/projections/routes/generator.ts`) produces `routes.manifest.json` — the canonical route surface that is the IR source of truth.

The bloat comes from:
- **515 individual command files** (one per command, no batching/dynamic dispatch)
- **Domain-organized projection duplicates** (separate generation pass creating kebab-case paths alongside flat camelCase paths)
- **57 entities with both generated and hand-written routes** (dual surface maintenance)
