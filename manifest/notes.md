# Notes: Manifest Automation Findings (deep exploration 2026-05-30)

> Verified facts from direct file reads, two thorough subagent sweeps, and a live run of the
> package's Prisma projection. Numbers are exact unless prefixed with `~`. Re-verify file:line
> citations before relying on them — code moves.

---

## 0. How this started
A manually-triggered production deploy (`.github/workflows/deploy.yml`, `workflow_dispatch`, runs
`vercel deploy --prod` → `next build` with `typescript.ignoreBuildErrors: false`) failed. The
reported blocker was `apps/api/app/api/analytics/bottlenecks/route.ts:69` — a partial
`Record<BottleneckCategory, number>`. That was fixed (commit `51d6bdca3`). A Sentry 403 on
source-map upload was made non-fatal (commit `2a9abb9c3`). But `pnpm --filter api typecheck`
then surfaced **6 more errors** that are NOT staleness — they are generated-surface drift.

---

## 1. The drift bug (root cause of the deploy class of failures)

`pnpm --filter api typecheck` reports broken Prisma accessors in generated routes:

> **RESOLVED 2026-05-30 (Phase 1) — see §10.** The producer now rewrites these accessors
> automatically. The table below is the original diagnosis; corrections are inline.

| Accessor used | Reality | Files | Resolution |
|---|---|---|---|
| `database.eventStaff` | model is `EventStaffAssignment` (`@@map("event_staff_assignments")`, schema.prisma:1394) → accessor `eventStaffAssignment`. | `apps/api/app/api/events/staff/{list,[id]}/route.ts` | REMAP via producer → `eventStaffAssignment` |
| `database.eventImportWorkflow` | ~~no Prisma table exists at all~~ **WRONG.** Table **does** exist: `model EventImport` (`@@map("event_imports")`, schema.prisma:1437) → accessor `eventImport`. Confirmed by store header `prisma-stores/broken-read-batch08-event-guest-import.ts`. | `apps/api/app/api/events/import-workflows/{list,[id]}/route.ts` | REMAP via producer → `eventImport` (NOT delete) |
| `database.tenantAuditLog` | **hand-written route** (NOT generated); model never existed; selected columns (`operationType`, `immutableHash`, `aiConfidence`, `correlationId`…) exist on no audit table. | `apps/api/app/api/audit/logs/route.ts` | **DELETED** (unreferenced by app code; rewriting would invent semantics) |

~~A cross-check of all IR entity accessors vs. the 224 Prisma models found **~25 IR entities whose
naive-camelCase accessor matches no Prisma model**…~~ **CORRECTED 2026-05-30.** The real
broken-generated-route blast radius is **exactly 2 entities** (`EventStaff`,
`EventImportWorkflow`). Empirical method: scan the producer's `ENTITY_DOMAIN_MAP` (89 entries — the
only entities that actually get generated routes) against the 224 real Prisma model accessors. The
"~25" figure counted IR entities whose camelCase matches no model, but **most of those never get a
generated route** — they have no `ENTITY_DOMAIN_MAP` entry and log "No domain mapping … skipping"
during generation (QA*, Vendor, Budget, Deal, Logistics*, the Versioning set, etc.). They are not
broken routes; they are simply not emitted. Only `EventStaff` and `EventImportWorkflow` are both
mapped AND drifted.

**Why:** the route generator derives the db delegate as naive camelCase of the IR entity name and
performs **zero** validation that the model exists. See §2.

**Sharp observation:** the generated read routes call `database.<x>.findMany(...)` **directly on
the Prisma client — bypassing the entire `prisma-stores/` layer** that already holds the correct
entity→model mapping. The authoritative map already exists; the route generator just doesn't use it.
Phase 1 (§10) extracts that mapping into `manifest/scripts/entity-domain-map.mjs` and applies it.

---

## 2. The generation pipeline (what actually runs)

`pnpm manifest:generate` → `node manifest/scripts/generate.mjs`. This script:
- Shells out to the upstream CLI: `pnpm exec manifest generate <ir> --projection nextjs --surface route --output <staging>` (list routes).
- Runs an inline script invoking `NextJsProjection` with `surface: "nextjs.detail"` for `[id]` routes.
- Remaps the CLI's flat paths (`event/list/route.ts`) into domain paths via a hardcoded
  `ENTITY_DOMAIN_MAP` (**92 entries**) + `remapToDomainPath()`.
- Writes a singular command dispatcher at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`.
- Prunes legacy per-command route files (commands go through the dispatcher, not concrete routes).

**`generate.mjs` only ever invokes the `nextjs` projection.** Confirmed: a scan of `manifest/scripts/`
and `scripts/` shows exactly one projection reference: `projection nextjs`.

**Accessor derivation (the defect), upstream package, NOT editable in-repo:**
`…/@angriff36/manifest/dist/manifest/projections/nextjs/generator.js` ~line 60:
```js
function toCamelCase(value) { return value[0].toLowerCase() + value.slice(1); }
```
Used in `generatePrismaQuery` (~line 200) to emit
`database.${delegateName}.findMany({ where, orderBy: { createdAt: "desc" } })`.
No `@@map` / no model-existence check.

The header on every generated file: `// Generated from Manifest IR - DO NOT EDIT`. Per
constitution §10/§16, the fix belongs in the producer (`generate.mjs`, our code) + regenerate —
never hand-edit these files.

---

## 3. What `@angriff36/manifest@1.0.32` actually ships (the unused leverage)

Package exports **7 projections** (`<pkg>/projections/<name>`):
`prisma`, `nextjs`, `openapi`, `zod`, `react-query`, `drizzle`, `routes`.

**Only `nextjs` is used.** Grep for `PrismaProjection` / `prisma.schema` surface / `projections/prisma`
across the repo (excluding node_modules): **zero matches**.

### 3a. The Prisma projection (`projections/prisma/`, `PrismaProjection`, `generator.js` ≈663 lines)
- **Output:** a single `schema.prisma` **string** (artifact id `prisma.schema`), optionally a
  `prisma.config.ts` when `provider` is set.
- **Emits a model only for entities whose `ir.stores` target is `durable`** (skips `memory`,
  `localStorage`, `external`, and entities with no store entry — each emits an info/error diagnostic).
- **Model name = IR entity name verbatim** (`model ${entity.name}`). The projection carries zero app
  knowledge. From the live dry-run (§8), with **no options bag** the generated `model Event`
  contains ONLY: scalar fields, nullability, literal `@default(...)` values (e.g.
  `title @default("Untitled Event")`, `guestCount Int @default(1)`), `String[]` arrays, `@id` on `id`,
  and relation fields to **other durable entities** (`invoices Invoice[]`, `payments Payment[]`).
  Everything else must be supplied via options or fixed in source:
  - **NOT emitted without options:** `@@map` (→ `tableMappings`), `@map` snake_case columns
    (→ `columnMappings`), `@db.Uuid`/`@db.Timestamptz` native types (→ `dbAttributes`),
    `@db.Decimal(p,s)` precision (→ `precision`), `@@schema(...)`, composite `@@id`/`@@unique`/`@@index`
    (→ `indexes`), id default strategy (→ `fieldAttributes`).
  - **Source must be fixed, not options:** properties typed `number` are a HARD error
    (`PRISMA_AMBIGUOUS_NUMBER`) and are **dropped** (e.g. `Event.budget`/`Event.ticketPrice` were
    omitted). Fix the `.manifest` type to `money`/`decimal`/`int`/`float` (or use `typeMappings`).
  - **Relations to non-durable targets are dropped** (`PRISMA_RELATION_TARGET_NOT_EMITTED`).
- **Options interface — locked NESTED shape** `Record<EntityName, Record<PropertyName, X>>` (NO dotted
  `"Entity.property"` keys; verified in `options.d.ts`):
  ```ts
  interface PrismaProjectionOptions {
    provider?: 'postgresql' | 'mysql' | ... ;                          // omit → model blocks only
    tableMappings?: Record<EntityName, string>;                        // entity → @@map("...")
    columnMappings?: Record<EntityName, Record<PropertyName, string>>; // → @map("...")
    typeMappings?:  Record<EntityName, Record<PropertyName, string>>;  // literal Prisma scalar
    precision?:     Record<EntityName, Record<PropertyName, {precision:number; scale:number}>>;
    indexes?:       Record<EntityName, (string[] | {fields:string[]; name?:string})[]>;
    foreignKeys?:   Record<EntityName, Record<string, string | ForeignKeyConfig>>;
    dbAttributes?:  Record<EntityName, Record<PropertyName, string>>;     // @db.* suffix
    fieldAttributes?: Record<EntityName, Record<PropertyName, string[]>>; // verbatim @attrs
    urlEnvVar?: string;   // default "DATABASE_URL"
    output?: string;      // pathHint, default "schema.prisma"
  }
  ```
  Entry point: `import { PrismaProjection } from "@angriff36/manifest/projections/prisma";`
  then `new PrismaProjection().generate(ir, { surface: "prisma.schema", options: {...} })`.
  (No `tenantSchemaMappings`/`schemaName` option exists.)
- **Implication:** adopting it requires Capsule to build/own the options-bag mapping config encoding
  the existing tables' `@@map`/`@map`/precision/FK reality. That config becomes the single source of
  entity→DB-shape truth currently scattered across `schema.prisma` + `prisma-store.ts` + `ENTITY_DOMAIN_MAP`.

### 3b. Projection it does NOT ship: stores/repositories
There is **no** "Prisma store/repository" projection. `PrismaStore` does not appear in the package
dist. The hand-rolled store classes are a genuine codegen gap, not "the package already does this."

---

## 4. The hand-maintained reinvention (what to retire)

### 4a. `manifest/runtime/src/prisma-stores/` — **43 files, 12,207 LOC**
- **~95** distinct `*PrismaStore` classes (counting the dir + `prisma-store.ts`;
  `class XxxPrismaStore implements Store<…>`), full tenant-scoped CRUD
  (`getAll/getById/create/update/delete/clear`), soft-delete via `deletedAt`, composite `tenantId_id`
  keys, hand-written field-by-field `mapToManifestEntity` mappers.
- `shared.ts` (~199 LOC): coercion helpers (`toDecimalInput`, `asJsonInput`, `asNullableDate`, …).
- Filenames `broken-read-batch01..16-*` + 7 `broken-read-*-parent.ts` = fingerprint of a
  **manual, batched, one-entity-at-a-time** migration from in-memory → Prisma stores.

### 4b. `manifest/runtime/src/prisma-store.ts` — **3,075 LOC**
- `createPrismaStoreProvider(prisma, tenantId)`: a giant hand-maintained `switch(entityName)`
  (starts ~line 1677) returning `new XxxPrismaStore(...)`.
- Consumed by `manifest/runtime/src/manifest-runtime-factory.ts` (~line 27, 384) feeding `RuntimeEngine`.

### 4c. Coverage
- **92** domain-mapped entities (`ENTITY_DOMAIN_MAP` keys). Most have a hand-rolled Prisma store;
  the manual migration is well underway but incomplete (Phase 0 must produce the exact table).
- **224** Prisma models in `packages/database/prisma/schema.prisma` (hand-authored). The model count
  exceeds the domain-entity count because many tables are child/line-item/junction models.

---

## 5. The three derivations that drift (the core architectural problem)
The same entity is described three times, independently, by hand:
1. **Schema** — `packages/database/prisma/schema.prisma` (224 hand models, model names + `@@map`).
2. **Store** — `prisma-stores/*` + `prisma-store.ts` switch (entity→model mapping + CRUD).
3. **Route accessor** — nextjs projection's `camelCase(entityName)` (naive, no validation).

When any two disagree (e.g. IR `EventStaff` vs Prisma `EventStaffAssignment`), you get the §1 drift.
**Target state** (per `AGENTS.md`): one IR-driven pipeline + one mapping config → schema, stores, and
route accessors all derive from the same source.

---

## 6. Constitution constraints (binding — `docs/architecture/constitution.md`)
- §10/§16: generated-surface drift → fix producer/projection/config + regenerate; never hand-edit generated output.
- §6: governed command POSTs use the singular dispatcher; concrete command routes prohibited. Generated **GET reads** are allowed read surfaces (§10 Read Path Freedom).
- §15: agents must not ask the user to re-decide architecture; inspect IR/registry/adapters and act.
- §4a Canonical homes: generated runtime artifacts → `manifest/runtime/`; IR → `manifest/ir/`; scripts → `manifest/scripts/`; reports → `manifest/reports/`; governance → `manifest/governance/`. Retired `packages/manifest-*` paths are forbidden.
- DB workflow (`docs/database/CONTRIBUTING.md`): migrations only via `pnpm db:dev --create-only`; never hand-author migration SQL; never `prisma db push`/`migrate reset`.

---

## 7. Key file index (for fast future lookup)
- Producer: `manifest/scripts/generate.mjs` (92-entry `ENTITY_DOMAIN_MAP`, nextjs-only)
- Unused schema projection: `manifest/runtime/node_modules/@angriff36/manifest/dist/manifest/projections/prisma/{generator,options,type-mapping,index}.{js,d.ts}`
- Route accessor defect: `…/projections/nextjs/generator.js` (`toCamelCase`, `generatePrismaQuery`)
- Hand stores: `manifest/runtime/src/prisma-stores/*` (43 files), `manifest/runtime/src/prisma-store.ts` (provider switch)
- Runtime wiring: `manifest/runtime/src/manifest-runtime-factory.ts`
- Hand schema: `packages/database/prisma/schema.prisma` (224 models)
- IR source of truth: `manifest/ir/kitchen.ir.json`, `manifest/ir/kitchen.commands.json`; source `.manifest` files in `manifest/source/`
- Drift audit (read-only today): `manifest/scripts/audit-schema-drift.mjs`
- **Try-prisma harness: `manifest/scripts/try-prisma.mjs`** (`pnpm manifest:try-prisma [Entity] [--full]`)
- **Config reader:** `manifest/scripts/read-config.mjs` (shared YAML config parser + derived paths for generate/compile scripts)

---

## 8. Live Prisma-projection dry-run results (verified 2026-05-30)

Ran `PrismaProjection.generate(ir, { surface: "prisma.schema", options: {} })` against
`manifest/ir/kitchen.ir.json`. **The projection works today** and produces real models.

**Store target reality (the gate):** `ir.stores` has **99 entries → 85 `memory`, 14 `durable`**;
the remaining **32 of 131 entities have no store entry**. The projection emits a model ONLY for
`durable` entities, so **it emits 14 models today**. Full diagnostic breakdown (135 total):
- `PRISMA_SKIPPED_NON_DURABLE` (85): "store target 'memory'; flip to 'durable' to emit a Prisma model."
- `PRISMA_SKIPPED_NO_STORE` (32): "no 'store' declaration; add 'store X in durable'."
- `PRISMA_AMBIGUOUS_NUMBER` (17): a property typed `number` — Manifest won't guess int/float/money, so it's **dropped**. Fix the source type or use `typeMappings`.
- `PRISMA_RELATION_TARGET_NOT_EMITTED` (1): a relation whose target isn't a durable model — the relation field is skipped.

**14 models emitted now:** ApiKey, Client, Event, Invoice, PaymentMethod, Payment,
PurchaseRequisition, PurchaseRequisitionItem, PurchaseOrder, PurchaseOrderItem, RateLimitConfig,
Recipe, User, VendorCatalog.

**This corrects an earlier assumption:** the gap between 14 generated and 224 hand-models is NOT
because the projection is weak — it's because most persistence is hand-schema'd while the IR still
declares those entities `memory`. The per-entity migration unit is: **flip the source store to
`durable` + recompile → the model starts generating.**

**`model Event` — what the projection ACTUALLY produced (no options bag) vs committed:**
- **Generated has:** scalar fields with nullability, literal `@default(...)`
  (`title @default("Untitled Event")`, `guestCount Int @default(1)`, `status @default("confirmed")`),
  `accessibilityOptions String[]`, `tags String[]`, `id String @id`, `deletedAt DateTime?`, and
  relations to durable targets (`invoices Invoice[]`, `payments Payment[]`).
- **Generated is MISSING (vs committed):** `@@map("events")`; all `@map` snake_case columns
  (`tenant_id`, `event_number`, `client_id`, …); `@db.Uuid`/`@db.Timestamptz(6)`/`@db.Date` native
  types; `@db.Decimal(12,2)`/`(10,2)` precision; `@@schema("tenant_events")`; composite
  `@@id([tenantId,id])`/`@@unique`/`@@index`; id default `@default(dbgenerated("gen_random_uuid()"))`;
  `@default(now())`/`@updatedAt`; columns not yet in IR (`maxCapacity`, `templateId`, …); and rich
  relations (`tenant`, `client`, `location`, `venue`, `venueEntity`, `budgets`, `reports`,
  `wasteEntries`, `shipments`, `proposals`, `contracts`, `collectionCases`).
- **DROPPED entirely:** `budget` and `ticketPrice` (typed `number` → `PRISMA_AMBIGUOUS_NUMBER`); the
  `budgets → EventBudget` relation (EventBudget is `memory`).
- **Implication — closing the gap for one durable entity means:** (a) fix source types
  (`budget`/`ticketPrice` → `money`); (b) add missing fields to the `.manifest` source so the IR
  carries them; (c) flip related entities (EventBudget, etc.) to `durable` so relations emit;
  (d) supply `@@map`/`@map`/`@db.*`/precision/`@@schema`/composite-keys/id-default via the options bag.
  This is exactly the Pilot in `task_plan.md`.

## 9. Using the try-prisma harness (`manifest/scripts/try-prisma.mjs`)
- `pnpm manifest:try-prisma` → summary: store-target distribution, the 14 models emitted today, diagnostic counts.
- `pnpm manifest:try-prisma Event` → generated `model Event` + per-entity diagnostics + the committed `schema.prisma` block + a "gap to close" hint. Fastest way to scope an entity's migration.
- `pnpm manifest:try-prisma Event --full` → also dumps the IR properties/relationships.
- READ-ONLY (writes nothing). Registered in root `package.json` (line ~108).

---

## 10. Phase-1 producer fix — DONE (2026-05-30)

Replaces the non-durable hotfix `ef9404bbf` (which hand-edited 4 "DO NOT EDIT" generated route
files) with a producer-side fix, per constitution §10/§16 and phase-out-registry §C.

### What was built
- **NEW `manifest/scripts/entity-domain-map.mjs`** — canonical single source for:
  - `ENTITY_DOMAIN_MAP` (the 89-entry domain map, extracted from `generate.mjs`),
  - `ENTITY_ACCESSOR_OVERRIDES = { EventStaff: "eventStaffAssignment", EventImportWorkflow: "eventImport" }`
    (string → rewrite; `null` would mean "no table → drop the route"),
  - `toCamelCase` (byte-identical to the upstream nextjs projection's derivation),
    `FLAT_SEGMENT_TO_ENTITY` (recovers entity from the CLI's lowercased path segment),
    `resolveAccessor(entity) → { naive, accessor, drop, overridden }`.
  - Overrides verified against `schema.prisma` `@@map` (lines 1394, 1437) + store headers
    (batch08/09). **Not guessed** — constitution forbids inventing accessors.
- **`manifest/scripts/generate.mjs`** — now imports the canonical map (the inline ~100-line copy
  removed). Added `entityForStagedPath()` and a post-process pass in `materializeRemappedOutput`
  that, per staged read route: rewrites `database.<naive>` → correct accessor for drifted
  entities, and drops the route file for table-less entities (`drop:true`). Logs both actions.
  Writes via `writeFileSync` (was `copyFileSync`).
- **Deleted `apps/api/app/api/audit/logs/route.ts`** — hand-written, phantom `database.tenantAuditLog`.
  No audit model in schema carries its selected columns; the real `audit_log` (schema.prisma:2973)
  has unrelated columns (`table_name`, `record_id`, `created_at`). Rewriting would invent semantics
  (constitution §10). Unreferenced by app code (the dev-console audit page uses `OverrideAudit`).
- **`.gitignore`** — `logs` → `/logs/` (anchored to repo root). The bare `logs` rule was ignoring
  legit API route dirs named `logs`; tightening surfaced `apps/api/app/api/vercel/logs/route.ts`
  (and `docs/manifest/logs/`), both now visible/untracked — a PR decision whether to `git add`.

### Verification evidence
- `node <accessor-scan>`: **0** broken `database.*` accessors across 579 routes.
- **Hotfix-redundancy proof:** `git checkout ef9404bbf^ --` the 4 files (restoring the broken
  pre-hotfix accessors) → scan shows 4 broken `[GEN]` → `pnpm manifest:generate` → scan shows 0
  broken, and `git diff` vs HEAD is empty (producer output is byte-identical to the committed hotfix).
- **Drift gate:** re-running `pnpm manifest:generate` produces no diff against committed routes.
- **`pnpm --filter api typecheck`: exit 0** — the exact type-gate the deploy enforces
  (`typescript.ignoreBuildErrors:false`), so the deploy's type blocker is cleared.
- `pnpm --filter api build` locally fails at `next.config.ts` load with
  `Missing PostHog configuration (NEXT_PUBLIC_POSTHOG_KEY/HOST)` — a missing prod env var injected by
  Vercel at deploy time, **before any route compiles**; unrelated to this change.

### Not done (deliberate, surfaced)
- Hotfix `ef9404bbf` not literally `git revert`-ed (a literal revert re-breaks the build until a
  regen runs — churn). The producer now owns those 4 files (drift empty), satisfying exit-criterion
  #5. The commit is local/unpushed; squash at merge if clean history is wanted.
- ENTITY_DOMAIN_MAP consolidation is COMPLETE — all consumers now import from the canonical source
  at `manifest/scripts/entity-domain-map.mjs` (189 entries):
    - `generate.mjs` imports directly
    - `generate-route-manifest.ts` imports directly (fixes the `Event: "manifest/Event"` → `"events/event"` bug)
    - `packages/mcp-server/src/lib/entity-domain-map.ts` re-exports via `@ts-expect-error` (runtime via tsx)
    - `build.mjs` delegates to `compile.mjs` instead of duplicating compile logic
  A `.d.mts` type declaration exists at the canonical source for downstream type resolution.

---

## 11. Phase 2 — Schema projection: live scoping (started 2026-05-30)

### 11a. PACKAGE VERSION CHANGED — now **2.2.0** (was 1.5.0, originally 1.0.32) — re-verify everything downstream
**UPDATE 2026-06-03:** bumped all 5 live pins (`package.json`, `apps/api`, `apps/app`,
`manifest/runtime`, `packages/mcp-server`) from `2.1.0` → **`2.2.0`** (latest on npm). `pnpm install`
resolved `@angriff36/manifest@2.2.0`. Verification: `@repo/manifest-runtime` typecheck and
`@repo/mcp-server` typecheck both GREEN against 2.2.0 (the two packages that consume the manifest
API directly). `pnpm --filter api typecheck` is RED, but **every error is pre-existing Prisma
generated-surface accessor drift** (`logisticsDispatch`/`openShift`/`performancePrediction`/
`workforceOptimization` not on PrismaClient; `signatureData`→`signature`, `tenantId`→`tenant_id`
field drift) — none reference an `@angriff36/manifest` symbol, all live in `// DO NOT EDIT`
generated routes, so the bump did not cause them (§1 drift class; producer needs a regen pass, not a
package change). **2.x ships the runtime middleware pipeline** (`RuntimeOptions.middleware`, hooks
`before-policy`/`before-guard`/`before-action`/`after-emit`) + first-class `auditSink`/`outboxStore`/
`approvalStore`/`requireTenantContext`/`flagProvider` — none wired by `manifest-runtime-factory.ts`
yet (RBAC/identity/audit/bootstrap still hand-rolled outside the lifecycle; candidate adoption work).

**(historical)** `manifest/runtime/node_modules/@angriff36/manifest` symlinks to
`node_modules/.pnpm/@angriff36+manifest@1.5.0_…`. The entire planning corpus (task_plan,
§3/§7/§8 of this file, IMPLEMENTATION_PROMPT) was written against **1.0.32**; an interim session
resolved **1.5.0**. Re-verify any package-internal claim against 2.2.0.
The 1.5.0 prisma projection dist lives at
`…/dist/manifest/projections/prisma/{generator,options,type-mapping,index}.js` and its export
`./projections/prisma` points at `generator.js` (`PrismaProjection`).

### 11b. REAL `PrismaProjectionOptions` for 1.5.0 (verified from options.d.ts — supersedes §3a/§8)
Full field set of the interface (read in full): `provider, tableMappings, columnMappings,
precision, indexes, typeMappings, foreignKeys, dbAttributes, fieldAttributes, urlEnvVar, output`.
(The names `name/onDelete/onUpdate/references` belong to the `ForeignKeyConfig`/`IndexEntry`
sub-types, not the top-level options.) Semantics:
- All per-property options use NESTED `Record<Entity, Record<Prop, X>>` (no dotted keys).
- `tableMappings` → `@@map`. `columnMappings` → `@map`. `precision` → `@db.Decimal(p,s)`.
- `dbAttributes` → `@db.<value>` (value WITHOUT `@db.` prefix, e.g. `"Uuid"`, `"Timestamptz(6)"`).
  `@db.Decimal` (from `precision`) wins over a `dbAttributes` entry on the same field.
- `indexes` → `@@index([...])` (string[] or `{fields,name}`).
- `typeMappings` → override the resolved Prisma scalar (e.g. `"Decimal"`, `"Int"`). **It EXISTS in
  1.5.0** (corrects an earlier draft). This is the clean fix for the `number`→ambiguous problem
  *without* editing source — `typeMappings: { Event: { budget: "Decimal" } }` + `precision`.
- `foreignKeys` → FK scalar + `@relation(...)` for belongsTo/ref relationships.
- `fieldAttributes` → verbatim per-field attribute escape hatch
  (e.g. `["@default(now())","@updatedAt"]`, or `["@default(dbgenerated(\"gen_random_uuid()\"))"]`).
  Non-duplicating: attrs the standard pipeline already emits aren't repeated.

### 11c. generator.js emission logic (verified by CLEAN read L24-527 + a working harness run)
What the model footer assembly actually does (generator.js 1.5.0, L441-527) — supersedes any earlier
draft of this section:
- `@@map("<name>")` ← `options.tableMappings[entity]` (L474-478). **EMITS ✓** (harness confirms).
- `@@id([...])` ← `entity.key` in the IR, only if `entity.key.length > 0` (L441, L482-487). **The
  compiled IR has `entity.key === undefined` for ALL entities** (verified `.tmp/ir-probe.mjs` on
  Event/RateLimitConfig/ApiKey), so the generator falls back to single `id String @id`. No option
  forces composite `@@id` → must come from IR `key` or a Capsule post-process.
- `@@unique([...])` ← `entity.alternateKeys` in the IR (L489-496). IR lacks it → committed
  `@@unique([tenantId,name])` not emitted → needs IR `alternateKeys` or post-process.
- `@@index([...])` ← `options.indexes[entity]` (L500-505) + auto `@@index([tenantId])` if tenant not
  already covered (L507-516). **EMITS ✓** (harness confirms).
- `@@schema("...")` ← **NEVER** (`grep "@@schema"`=0, no `schemaName` option, no code path) → MUST
  be post-processed in.
- **RLS comment block** appended after each model's `}` when `ir.tenant` is set (L519-527). Committed
  schema has none → strip when generating the full file (per-model extract avoids it).
`options.d.ts` field set (read in full ×2): `provider, tableMappings, columnMappings, precision,
indexes, typeMappings, foreignKeys, dbAttributes, fieldAttributes, urlEnvVar, output`. NO
`schemaName`, NO `idConstraints`.
**Net:** Phase 2 = per-entity options bag + a Capsule post-process for what options/IR can't express:
`@@schema` (always), `@@id([tenantId,id])` (until IR `key` populated), `@@unique` (until IR
`alternateKeys` populated), and stripping the RLS comments. Same in-repo producer pattern as the
Phase-1 accessor rewrite (constitution §10). **Prototyped successfully on RateLimitConfig — see 11g.**

### 11d. Pilot scoping — `RateLimitConfig` (cleanest) vs `Event` (hardest)
`pnpm manifest:try-prisma RateLimitConfig`: 12 props, **0 relationships**, no `number` props, no
missing columns, single schema (`tenant_admin`), composite `@@id([tenantId,id])` + `@@unique` +
2 `@@index`. Its entire gap = the mechanical options bag (tableMappings/columnMappings/dbAttributes/
indexes/precision) PLUS the 11c post-process gaps (`@@schema`, composite `@@id`, `@@unique`) PLUS the
spurious-default question (11e). **All proven closeable — see 11g.**
`pnpm manifest:try-prisma Event` (committed model @ schema.prisma:639): 26 props, 3 rels,
store=durable, and ALSO hits: `budget`/`ticketPrice` typed `number` → dropped (fix via
`typeMappings`+`precision`, OR source type → `money`); relation `budgets→EventBudget` dropped
(EventBudget store=memory) plus ~10 more relations needing durable targets + `foreignKeys`; missing
columns `maxCapacity`/`templateId` (add to source). **Event is the hardest entity, not the easiest.**
**RECOMMENDED pilot order (refinement, not scope change):** prove the post-process + options recipe
on `RateLimitConfig` first (isolates mechanics + the 11c blockers), then `Event` (adds source-data
problems), then the Events cluster.

### 11e. Spurious-default question (confirmed on both entities)
The generator emits `@default(...)` from IR property defaults — e.g. `name String @default("")`,
`windowMs Int @default(60000)`, `guestCount Int @default(1)` — that the committed schema does NOT
have. Byte-parity needs either these defaults removed from `.manifest` source, or the diff accepted
as intentional. Decide per-property during the pilot; default behavior of the generator appears to
be "emit every IR default unconditionally" (confirm in `generator.js`).

### 11f. Harness built + RateLimitConfig run — WORKS (2026-05-30)
Two READ-ONLY scripts (write nothing to schema.prisma), committed under `manifest/scripts/`:
- `generate-prisma-schema.mjs` — runs `PrismaProjection` with the options bag, applies the Capsule
  post-process (injects `@@id` + `@@schema`), extracts one model, prints generated+post-process vs
  committed. Flags: `<Entity> [--raw]` (`--raw` also shows pre-post-process output).
- `prisma-projection-options.mjs` — `PILOT_OPTIONS` bag + `ENTITY_SCHEMA_MAP` (→`@@schema`) +
  `COMPOSITE_KEY` (→`@@id`). Covers RateLimitConfig (full) + Event (schema/key only, so far).

`node manifest/scripts/generate-prisma-schema.mjs RateLimitConfig` (post-process output):
```
model RateLimitConfig {
  id String @db.Uuid @default(dbgenerated("gen_random_uuid()"))
  tenantId String @map("tenant_id") @db.Uuid
  name String @default("")
  endpointPattern String @map("endpoint_pattern") @default("")
  windowMs Int @map("window_ms") @default(60000)
  maxRequests Int @map("max_requests") @default(100)
  burstAllowance Int? @map("burst_allowance") @default(0)
  priority Int @default(0)
  isActive Boolean @map("is_active") @default(true)
  createdAt DateTime @map("created_at") @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @map("updated_at") @default(now()) @updatedAt @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  @@map("rate_limit_configs")
  @@index([tenantId, isActive])
  @@index([tenantId, priority])
  @@id([tenantId, id])
  @@schema("tenant_admin")
}
```
**Worked:** `@@map` + both `@@index` (from options); `@map`/`@db.*`/`@default(...)` field attrs (from
options); post-process `@@id([tenantId,id])` + `@@schema("tenant_admin")`.
**CORRECTION:** an earlier draft of this note (written during a tool-transport outage, before the run
completed) claimed `@@map`/`@@index` "did NOT appear" — that was WRONG. The actual run emits both.

**Remaining diffs vs committed (genuine open items):**
1. **`@@unique([tenantId, name])` missing** — IR has no `alternateKeys`; add via post-process (like
   `@@id`/`@@schema`) or populate IR. (Next.)
2. **Spurious `@default(...)`** on name/endpointPattern/windowMs/maxRequests/burstAllowance (11e).
3. **Attribute & column ORDER differ** (generated `id`-first, `@map @default @db.*`; committed
   `tenantId`-first, `@default @map @db.*`). ⟹ **byte-parity is the WRONG gate.** Phase-3 must
   compare NORMALIZED schemas (`prisma format` both, or field-set + per-field attribute-SET +
   model-attr-SET). Key design input for the `audit-schema-drift.mjs` upgrade.
4. **RLS comment block** appended after the model in full-file generation (11c) — strip it.

### 11g. Next concrete steps (resume here)
1. Add `@@unique` (Capsule alternateKeys map) + RLS-comment-strip to the post-process.
2. Build the NORMALIZED-schema comparator (the real parity gate; reuse for Phase-3 CI), then iterate
   RateLimitConfig to normalized-equal.
3. Settle 11e (likely strip spurious defaults from source for pilot entities).
4. Then `Event`: `typeMappings`+`precision` for `budget`/`ticketPrice`; `foreignKeys` for relations
   (after targets durable); add `maxCapacity`/`templateId` to source.
5. Do NOT touch live `schema.prisma` until normalized parity proven across the pilot set (Phase 3).

**Scratch (safe to delete):** `.tmp/rlc-raw.log`, `.tmp/rlc-harness.log`, `.tmp/ir-probe.mjs`,
`.tmp/ir-probe-out.txt`, `.tmp/options-iface.txt`. The two `manifest/scripts/*.mjs` are committed.

---

## 12. GATE CHANGE + vertical-slice reality (2026-05-30, user directive)

### 12a. New Phase-2 success gate (supersedes the parity gate in §11)
User directive: **this is dev; data destruction is acceptable.** Normalized/byte parity with the
committed handwritten schema is **NO LONGER the gate**. The committed schema is now only a REFERENCE
to spot missing Manifest concepts (fields/relations/indexes/schema placement). The real gate is
FUNCTIONAL:
1. Manifest source compiles to IR.
2. PrismaProjection + Capsule post-process emits a schema that `prisma format`/`validate` passes.
3. Prisma Client generates.
4. `typecheck` passes OR yields a finite list of old callers to update.
5. The generic Manifest command route executes `Event.create`, `StaffMember.create`,
   `EventStaff.assign` (entity names per 12b).
6. Audit entries are written for those commands.
7. No generated route calls a stale Prisma accessor (e.g. `eventStaffAssignment`) UNLESS Manifest
   intentionally names the entity that way.
Rules: prefer the Manifest-generated shape over old handwritten Prisma when they conflict (unless the
old schema reveals a real missing Manifest concept); **Prisma model name = Manifest entity name**;
`@@map`/`@map` ONLY for intentional physical table/column compat. Dev DB may be reset/dropped/recreated
once the generated schema validates. STOP doing: preserving dev data, matching committed ordering,
preserving old Prisma names for their own sake, adding handwritten stores/routes where Manifest
runtime can carry the command.

### 12b. Vertical-slice reality — commands EXIST (corrects an earlier wrong note)
**CORRECTION:** an earlier draft of 12b claimed "Event/User/EventStaff have ZERO commands." That was
WRONG — it came from a probe that read `ir.commands` (whose `command` field is blank in that copy).
The authoritative `manifest/ir/kitchen.commands.json` is an array of **590 commands across 131
entities**. The slice entities DO have commands:
- **Event** (store=durable): archive, cancel, confirm, **create**, finalize, unfinalize, update,
  updateDate, updateGuestCount, updateLocation. 26 props, rels → Invoice/Payment/EventBudget.
- **User** (store=durable): **create**, deactivate, terminate, update, updateRole. 20 props, 0 rels.
- **EventStaff** (store=**memory**): **assign**, unassign. 12 props: id, tenantId, eventId, **userId**
  (NOT staffMemberId), role, notes, shiftStart:number, shiftEnd:number, status, createdAt, updatedAt,
  deletedAt. **0 relationships.**
- `StaffMember` does NOT exist as an IR entity (staff entity today is `User`).
- Reference templates with commands+durable+table already working: `Client` (archive, create,
  reactivate, update), `Recipe` (activate, create, deactivate, update).

### 12c. USER DECISIONS (2026-05-30)
1. **Staff entity = NEW `StaffMember`** (author a new entity + table; do not reuse `User`).
2. **Go straight at the Event cluster** (author/adjust commands + drive the full functional pipeline
   on Event + StaffMember + EventStaff — not a Client warm-up).

### 12d. Concrete work to hit the new functional gate (§12a) for the slice
Per the decisions, in `manifest/source/`:
1. **New `StaffMember`** entity (new `.manifest`): durable store; props (displayName, email, phone,
   role, status, tenantId, id, timestamps); command `create` (+ maybe updateProfile/deactivate),
   modeled on `User`/`Client`. Add to `ENTITY_DOMAIN_MAP` (→ e.g. `staff/members`).
2. **`EventStaff`**: flip store `memory → durable` so it projects a model. Decide the staff link —
   its prop is `userId` today; for a StaffMember-based slice either rename `userId → staffMemberId`
   or add `staffMemberId`. Keep flat string ids for the first cut (functional gate needs no FK), or
   add belongsTo rels (Event, StaffMember) so FKs project. `assign`/`unassign` commands already exist.
3. **`Event`**: already durable + has `create`. Fix `budget`/`ticketPrice` `number`→`money/decimal`
   (else dropped). Relations to memory entities (EventBudget) stay dropped — fine for the slice.
4. **Store provider** (`manifest/runtime/src/manifest-runtime-factory.ts`): confirm Event / StaffMember
   / EventStaff resolve to a real `PrismaStore`, not the `PrismaJsonStore` fallback (hand-set
   `ENTITIES_WITH_SPECIFIC_STORES`) — else writes land in the JSON blob table.
5. Pipeline: `pnpm manifest:compile` → project schema (+ post-process: @@schema/@@id/@@unique) →
   `prisma validate`/`format` → generate client → typecheck → execute Event.create, StaffMember.create,
   EventStaff.assign via the generic dispatcher → confirm audit rows. Dev DB reset/recreate is OK.

### 12e. SLICE SOURCE AUTHORED + IR COMPILED + MODELS PROJECT ✓ (2026-05-30)
Done this session (source edits on disk; IR regenerated):
- **NEW `manifest/source/staff-member-rules.manifest`** — `entity StaffMember` durable: props id,
  tenantId, displayName(req), email, phone, role="server", status="active", notes, timestamps;
  commands `create`/`updateProfile`/`deactivate`; policy + 3 events. Modeled on user/client rules.
- **`event-staff-rules.manifest`** — `store … in memory`→`durable`; `userId`→`staffMemberId`
  EVERYWHERE (property, constraint, assign param+guard+mutate, both event payloads); `shiftStart`/
  `shiftEnd` `number`→`int` (else PRISMA_AMBIGUOUS_NUMBER drops them). assign/unassign intact.
- **`event-rules.manifest`** — `budget`/`ticketPrice` `number`→`money`.
- **`entity-domain-map.mjs`** — added `StaffMember: "staff/members"`.
- `pnpm manifest:compile` → OK (87 manifests → 132 entities, 593 commands). Verified IR:
  StaffMember durable/[create,deactivate,updateProfile]; EventStaff durable/staffMemberId(no userId)/
  [assign,unassign]; Event budget+ticketPrice=money/[…create…]. durableCount now 16 (was 14).
- **Per-entity projection (harness) — all three emit VALID Prisma, nothing dropped:**
  - `model StaffMember` 11 fields, `id String @id`, clean (no `@@map`/`@@schema`/composite `@@id` yet —
    not in options/post-process maps; still valid).
  - `model EventStaff` `staffMemberId String`, `shiftStart Int? @default(0)`, `shiftEnd Int?`.
  - `model Event` `budget Decimal? @db.Decimal(12,2) @default(0)` + ticketPrice (money→Decimal ✓);
    `@@map("events")`+`@@id([tenantId,id])`+`@@schema("tenant_events")`; invoices/payments emit;
    budgets→EventBudget dropped (memory) — fine for slice.
  GOTCHA recorded: `number` props are DROPPED unless typed int/float/money/decimal — even with a
  numeric default (an earlier guess that defaults coerce to Float was wrong; harness errored).

### 12f. Remaining to close the functional gate (RESUME HERE)
1. Build the FULL-schema generation path: extend `generate-prisma-schema.mjs` (or a new
   `emit-full-schema` mode) to emit ALL durable models + datasource/generator header + strip the
   per-model RLS comment block. For a fresh dev DB, StaffMember/EventStaff can default-schema (no
   `@@map`/`@@schema` needed) — simplest path; data is expendable.
2. Write candidate `schema.prisma` → `prisma format` + `prisma validate` (gate #2).
3. `prisma generate` (gate #3) → `pnpm --filter api typecheck` (gate #4; expect finite caller fixups).
4. Store provider (`manifest-runtime-factory.ts` `ENTITIES_WITH_SPECIFIC_STORES` ~L139): ensure Event/
   StaffMember/EventStaff hit a real `PrismaStore` (gate so writes land in real tables, not JSON blob).
5. Execute Event.create / StaffMember.create / EventStaff.assign via the dispatcher (gate #5) +
   confirm audit rows (gate #6). Reset/recreate dev DB as needed.

### 13. OFFICIAL MANIFEST DOCS (fetched 2026-05-30) — authoritative integration facts
Source: manifest-b1e8623f.mintlify.app (adapters/custom-stores, extensibility/plugin-api,
language/tenancy, integration/prisma, integration/nextjs). These SUPERSEDE guesses.

**13a. Store wiring (adapters/custom-stores) — the clean pattern:**
- `Store<T>` interface: `getAll/getById/create/update/delete/clear` (matches the repo's stores).
- Wiring = `new RuntimeEngine(ir, { userId, tenantId, storeProvider: (entityName) => Store|undefined })`.
  `undefined` → fall back to the configured default. **This is exactly what
  `manifest/runtime/src/manifest-runtime-factory.ts` already does** (its `storeProvider` returns a
  repo `PrismaStore` for `ENTITIES_WITH_SPECIFIC_STORES`, else `PrismaJsonStore`). So the repo is
  ALREADY on the documented integration path — no plugin needed for the slice.
- **NO PrismaStore ships** — docs give it as a copy-paste example (`new PrismaStore(prisma, 'recipe')`,
  delegate = `prisma[model]`). The repo's own PrismaStore is the equivalent.
- Package DOES ship `@angriff36/manifest/stores` → `PostgresStore` / `SupabaseStore` / `MongoDBStore`
  (generic blob-ish stores keyed by `tableName`); not Prisma. Not needed — repo uses its own Prisma path.
- Tenancy in stores is NOT automatic: "runtime passes tenantId in context; your store filters on it."

**13b. Plugin API (extensibility/plugin-api):** `definePlugin({ manifest:{name,version,
pluginApiVersion:'1'}, storeAdapters, projections, builtins, ... })`; loaded via
`loadPlugins()` from `@angriff36/manifest/plugin-loader`; store adapters keyed by `scheme`
(built-in schemes memory/localStorage/postgres/supabase/durable/mongodb are reserved). "No
IR-mutation hook by design: plugins extend tooling/runtime, never language semantics." → a plugin is
the FUTURE clean home for a Capsule Prisma store adapter, but overkill for the slice.

**13c. Tenancy (language/tenancy) — divergence from repo:**
- Canonical syntax: a SINGLE top-level `tenant tenantId : string from context.tenantId`. Then runtime
  auto-writes tenant on create + filters reads; commands fail `MISSING_TENANT_CONTEXT` if absent.
- **Repo NOW uses this (2026-06-09):** all 94 `.manifest` source files carry `tenant tenantId : string from context.tenantId`. The merged IR has a structured `tenant` declaration (was previously missing despite individual files declaring it — fixed in `mergeIrs()`). Per-entity `property required tenantId` still exists in many entities for backward compat; the unified tenant block enables automatic runtime enforcement. See §24.
- Prisma projection adds a tenant discriminator column + index + RLS policy COMMENTS (not executed).
  **No `@@schema`/multi-schema and no composite `@@id` support in the projection** — confirms our
  Capsule post-process (§11c/§12) is the correct place for those. (`key [...]` composite-key syntax
  is NOT in the tenancy docs; repo source files `procurement-requisition-rules.manifest` +
  `purchase-order-rules.manifest` DO use `key [...]` — grammar supports it; worth adopting so the IR
  carries `entity.key` and the projection emits `@@id` natively instead of our post-process.)

**13d. Prisma integration (integration/prisma):** projection is "pure IR → text", compile-time only,
no DB ops. CLI: `manifest generate ir/ -p prisma -s prisma.schema -o generated/`. Options =
tableMappings/columnMappings/precision/indexes/typeMappings/foreignKeys/dbAttributes/fieldAttributes
(matches §11b). Relationships emit real `@relation` + FKs **only between durable entities**.

### 14. FULL-SCHEMA EMIT — strategy pivot (2026-05-30)
First attempt (`emit-full-schema.mjs` v1: header + 16 generated durable models REPLACING their hand
twins + 210 pass-through hand models) → `prisma validate` FAILED, but NOT on our models:
- ~15 errors = pass-through hand models referencing top-level **enums** (`EntityType`, `ShipmentStatus`,
  `UnitSystem`, …) that my "header = everything before first model" cutoff DROPPED (29 enums live
  AFTER the first model in the file). Trivially fixable (preserve enum/type blocks).
- BUT the deeper problem (not yet surfaced because validate stopped at enums): the 14 generated
  durable models that REPLACE hand twins (Event, Client, Invoice, User, …) **lack the back-relations
  the 210 hand models point at** (e.g. `Account.events Event[]`, `Account.clients Client[]`). Prisma
  requires both sides of every relation → replacing them would cascade "missing opposite relation
  field" errors across the hand schema. The generated models only carry relations to OTHER durable
  entities; all relations to memory/hand entities are dropped. This is a REAL missing-Manifest-concept
  (per user rule, keep the hand model where the generated one is incomplete).

**DECISION (hits the functional gate fastest, dev-safe): ADDITIVE emit.**
Keep the live 224-model schema VERBATIM (all enums/types/relations intact) and APPEND only the
genuinely-new durable models that have NO hand twin: **StaffMember + EventStaff**. These have no
incoming relations from hand models and no outgoing relations, so they validate cleanly. Post-process
adds `@@schema` + composite `@@id` + `@@map`. This:
- satisfies the gate (schema validates, client generates, the 2 new slice tables exist, Event already
  has its table), and
- avoids silently shipping a broken 226-model schema.
Full generated-replaces-hand for all 16 durable entities is the LARGER follow-up — it requires the
relations to be modeled in Manifest source (so the projection emits both sides) OR a relation-aware
merge. Tracked as Phase 2b. Per user's "prefer generated shape unless old schema reveals a real
missing concept" — the back-relations ARE that missing concept, so additive is rule-compliant now.

### 14a. GATE #2 PASSED (2026-05-30): additive candidate validates ✓
`node manifest/scripts/emit-full-schema.mjs` → `manifest/ir/candidate-schema.prisma` = 224 hand
models verbatim + 2 appended (`model StaffMember` @@map("staff_members") @@id([tenantId,id])
@@schema("tenant_staff"); `model EventStaff` @@map("event_staff") @@id([tenantId,id])
@@schema("tenant_events")). `prisma validate` → **valid, 0 errors** (exit 0). Enum-drop problem from
v1 gone (we keep the live file verbatim now). Remaining gate steps: promote candidate→live schema
(additive, dev-safe), `prisma generate` (#3), db push (dev reset OK), typecheck (#4), store-provider
wiring for StaffMember/EventStaff, run 3 commands (#5) + audit (#6).

---

## 15. Durable-flip RUNTIME ROUNDTRIP verification (2026-05-31) — what typecheck missed

Verified the 3 committed durable flips (AlertsConfig, PrepMethod, Container — commit `432fbc933`) with
REAL RuntimeEngine create calls against the dev DB (synthetic tenant `0000…a11c`, cleaned up after).
Harnesses (read/write, self-cleaning) in `.tmp/durable-*.mjs`. Init pattern that works headless:
- `import { database } from "@repo/database/standalone"` (NOT `@repo/database` — that pulls `server-only`
  and throws outside Next). standalone reads `DATABASE_URL` via `keys()`; load `.env.local`+`.env` first.
- `createManifestRuntime({ prisma: database, log, captureException }, { user, entityName })` then
  `runManifestCommandCore({ createRuntime }, { entity, command:"create", body, user })`.

### THE DURABLE STORES WORK ✓ (definitive)
`runtime.createInstance(entity, { ...fullBody, id: <uuid> })` → row lands in the typed table
(`alerts_config`/`prep_methods`/`containers`), confirmed by findFirst, then deleted. So the
memory→durable flip is CORRECT — the bespoke `PrismaStore.create()` writes real typed rows.

### BUT the end-to-end create command path has TWO pre-existing blockers (NOT flip-specific):
1. **Bootstrap constraint gotcha** (the documented `createInstance({id})` bootstrap problem). run-core's
   `bootstrapCreateCommand` calls `createInstance(entity, { id })` with NO body. `createInstance`
   (runtime-engine.js:801) seeds unset props via `getDefaultForType` (js:1907): non-nullable `string`→`''`.
   So `name=''` → block-severity `requireName` constraint fails → `createInstance` returns undefined →
   run-core returns `bootstrap_failed` (500). Affects memory AND durable identically; Event slice only
   dodged it because `title` defaults to `"Untitled Event"` (non-empty). Same class as the
   `event-rules` eventType ""→"general" fix in §12e/HANDOFF.
2. **Empty-id → `@db.Uuid`**: if `id` is seeded to `''` (string default) and the store's `?? randomUUID()`
   doesn't treat `''` as missing, Postgres rejects `''` on the `@db.Uuid` id column
   (`invalid input syntax for type uuid: ""`). Stores at prisma-store.ts:1352 (AlertsConfig),
   broken-read-batch01-prep-container.ts:47/156 (PrepMethod/Container).
3. **AlertsConfig store/IR mismatch (separate bug)**: `AlertsConfigPrismaStore.create()` only persists
   `channel`/`destination` — it does NOT write `name`, yet the IR has a block `requireName` constraint and
   the row comes back `name=undefined`. So even with a good id, an HTTP `AlertsConfig.create` would fail the
   bootstrap constraint. PrepMethod/Container stores DO persist `name`.

### IMPLICATION for the flips
The durable flips are not *wrong*, but AlertsConfig/PrepMethod/Container `create` did NOT initially
succeed through the canonical HTTP/run-core path (bootstrap gotcha). RESOLVED below in §15a.

### 15a. BOOTSTRAP GOTCHA FIXED (2026-05-31) — `bootstrapCreateCommand` seeds full body
Root cause (verified): `run-manifest-command-core.ts` `bootstrapCreateCommand` called
`runtime.createInstance(entity, { id: instanceId })` with ID-ONLY. `createInstance`
(runtime-engine.js:801) seeds unset props via `getDefaultForType` (non-nullable string → `""`) and
then evaluates block-severity ENTITY constraints. So a `requireName: self.name != ""` invariant fails
against the empty default BEFORE the create command's actions run → `createInstance` returns undefined
→ run-core returns `bootstrap_failed` (500). This hit ANY entity whose entity-level constraints don't
tolerate empty defaults — AlertsConfig, PrepMethod, Container, AND Recipe (control) all failed; only
Client passed (its block constraints validClientType/validPaymentTerms tolerate defaults). Memory and
durable entities alike — NOT flip-specific.

FIX: seed with the full body — `createInstance(entity, { ...body, id: instanceId })`. This is the
canonical Manifest pattern (context7 /angriff36/manifest docs: `createInstance('Order', { id, total:125 })`;
"constraints are evaluated during creation"). The create command's `mutate field = param` actions
re-apply the same values idempotently; fields the create command does NOT mutate (e.g. AlertsConfig
`name`, which `create(channel, destination)` never touches) now persist correctly because they are
seeded — this ALSO fixes the AlertsConfig "name not persisted" gap noted in §15.

EVIDENCE (`.tmp/bootstrap-fix-verify.mjs`, full canonical path run-core NO instanceId, dev DB synthetic
tenant, self-cleaning) — BEFORE vs AFTER:
| entity | BEFORE | AFTER |
| AlertsConfig* | bootstrap_failed | PASS (row in alerts_config) |
| PrepMethod*   | bootstrap_failed | PASS (row in prep_methods)  |
| Container*    | bootstrap_failed | PASS (row in containers)    |
| Recipe (ctrl) | bootstrap_failed | PASS (row in recipes)       |
| Client (ctrl) | PASS             | PASS (no regression)        |
`@repo/manifest-runtime typecheck` exit 0. One-line change + comment in bootstrapCreateCommand.
Honest status NOW: flips are store-write-proven AND full-command-path-proven end-to-end.

### 15b. WHY the bootstrap wrapper exists — it is LOAD-BEARING, not gratuitous (2026-05-31)
Investigated whether Capsule should drop `bootstrapCreateCommand` and call upstream
`runCommand('create', body, {entityName})` directly (per upstream docs' one-call pattern). ANSWER: NO —
it would silently break persistence. Evidence from the bundled engine `@angriff36/manifest@1.6.0`
(runtime-engine.js):
- `create` commands have NO special create semantics in the IR: `command.creates/isCreate/type` are all
  `undefined`. A create command is just a regular command whose actions are `mutate field = param`
  (e.g. AlertsConfig.create actions = compute, compute, mutate channel, mutate destination).
- `mutate` persists ONLY via `updateInstance(entityName, instanceId, …)` (runtime-engine.js:1658), and
  `updateInstance` (L864) does `const existing = await store.getById(id); if (!existing) return undefined;`
  — it does NOT create-if-missing. No `instanceId`/instance → mutate silently no-ops → nothing persists.
- There is NO create-command auto-instantiation anywhere in the engine's `runCommand` path. The ONLY
  `createInstance` call is the one Capsule makes in `bootstrapCreateCommand`.
- Upstream docs CONFIRM: "Mutate and targeted compute actions only update persisted entity state when
  BOTH entityName and instanceId are provided." (reference/runtime-engine.md). So even upstream requires
  a pre-existing instance for mutate-based creates.
⟹ Capsule's `.manifest` create commands are authored with `mutate field = param` (SAME pattern as the
upstream Todo/Recipe doc examples — there is NO "create action" keyword in the DSL). With this engine,
mutate-based create commands REQUIRE a pre-seeded instance. So the bootstrap pre-seed is the correct,
necessary driver-layer step. The bug was NEVER "the wrapper exists"; it was narrowly that the pre-seed
used `{id}` instead of `{...body, id}`. The §15a one-line fix is the correct fix.

### 15c. Can "true create/persist" be done by editing ONLY .manifest files? NO (with this engine)
User goal: rewrite manifest files so create persists without runtime wrapper logic. Finding: NOT
achievable via `.manifest` edits alone with `@angriff36/manifest@1.6.0`:
1. The DSL has no create/persist action keyword — upstream's own `Todo.create`/`Recipe.create` use
   `mutate this.title = title` (identical to Capsule). Nothing to author differently.
2. The bundled engine does not auto-instantiate mutate-based create commands (15b). Instance creation
   MUST happen in the driver layer regardless of how the .manifest is written.
⟹ The upstream one-call `runCommand('create', …)` example presumes either a newer engine with
create-detection OR an aspirational/simplified runtime. With the SHIPPED engine, a pre-seed (bootstrap)
or an engine upgrade is required. OPTIONS for a future call:
  (a) KEEP the §15a fix (minimal, correct, proven). RECOMMENDED now.
  (b) UPGRADE `@angriff36/manifest` to a version (if any) whose `runCommand` auto-instantiates create
      commands, then the bootstrap could be deleted and `.manifest` files would "just work". Needs
      verifying such a version exists + full regression — separate initiative.
  (c) Add a real `create`/`persist` action kind upstream (Manifest repo change) so create commands
      self-instantiate. That is an UPSTREAM feature request, not a Capsule edit.

### 15d. RESOLVED via 1.7.0 upstream fix — bootstrap REMOVED (2026-05-31)
`@angriff36/manifest@1.7.0` shipped the official fix: `runCommand` now auto-creates the instance for
create commands. Trigger (runtime-engine.js:1220):
`shouldAutoCreateInstance = commandName === 'create' && !!options.entityName && !options.instanceId`.
When set, the engine calls `persistPreparedCreate(entityName, entity, prepareCreateData(entity, body))`
(L1292) — constraint-validated, body applied — BEFORE the command's mutate actions, then sets
`options.instanceId`. This is exactly what Capsule's bootstrap did manually, now owned by the engine and
constraint-correct. So with `.manifest` files UNCHANGED, `runCommand('create', body, {entityName})`
now creates+persists. This is the "behavior from manifest files, not runtime wrappers" outcome.

CHANGES:
- Bumped `@angriff36/manifest` 1.6.0→1.7.0 (and mcp-server 1.5.0→1.7.0) in root + apps/api + apps/app +
  manifest/runtime + packages/mcp-server package.json; `pnpm install` OK; Prisma client regenerated.
- `run-manifest-command-core.ts`: REMOVED `bootstrapCreateCommand`, `resolveCreateInstanceId`,
  `normalizeCreateResult`, the `node:crypto` randomUUID import, and the create pre-seed branch. The
  create path now just calls `runCommand("create", body, { entityName })` with NO instanceId (passing
  one would DISABLE the engine auto-create via the `!options.instanceId` guard). Kept the
  `bootstrap_failed` union member (consumed by execute-command.ts switch) as harmless now-unproduced
  dead kind. My earlier §15a `{...body,id}` workaround is SUPERSEDED/reverted — 1.7 makes it unnecessary.
- Net: ~55 lines of divergent Capsule create-bootstrap deleted; create instantiation now lives upstream.

VERIFICATION (1.7.0, `.tmp/bootstrap-fix-verify.mjs` through `runManifestCommandCore` — the real wrapper):
| entity | result |
| AlertsConfig* / PrepMethod* / Container* / Recipe / Client | ALL PASS — ok=true, row in real typed table |
Outbox (`.tmp/v17-outbox-probe.mjs`): exactly 1 `outbox_event`, aggregateType=Container,
eventType=ContainerCreated, aggregateId === created instance id (matchesInstance:true — the old
aggregateId="unknown" bug does NOT recur). `@repo/manifest-runtime typecheck` + `api typecheck` both
exit 0. Honest status: the 3 durable flips create+persist+audit end-to-end through the canonical path,
and the create flow is now upstream-owned (no Capsule bootstrap hack).

## 16. CLI CONFIG GAP (2026-05-31) — `manifest.config.yaml` does NOT exist
Official docs: https://manifest-b1e8623f.mintlify.app/cli/configuration . The CLI looks for
`manifest.config.yaml|yml` / `.manifestrc.yaml|yml` at project root; config is OPTIONAL (built-in
defaults), CLI flags override config overrides defaults. This repo has NONE — `generate.mjs:395` shells
`pnpm exec manifest generate <ir> --projection nextjs --surface route --output <staging>` with hardcoded
flags, and `compile.mjs` hand-rolls file discovery to dodge a CLI `--glob` "last file wins" bug. A config
would centralize src glob, IR output dir, prismaSchema path, and the nextjs projection options (authProvider
clerk, databaseImportPath, includeTenantFilter, includeSoftDeleteFilter, dispatcher). Adding one is a clean
small win and aligns the repo with the documented mechanism. Tracked in task_plan.md §Phase-7.

---

## 9. Store/DataSource layer type-alignment pass (2026-06-01)

After regenerating `schema.prisma` from IR (250 models), the hand-written stores in
`manifest/runtime/src/prisma-store.ts` and `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts`
had ~55 type errors from field-name/shape mismatches. Key schema facts discovered:

- `KitchenTaskClaim`: FK field is `kitchenTaskId`, NOT `taskId`
- `Recipe`: no `createdAt`/`updatedAt` (not durable timestamps in IR)
- `RecipeVersion`: `tags` is `String` scalar, not `String[]`; `createdAt` is `DateTime?`, no `updatedAt`
- `RecipeIngredient`, `RecipeStep`: no `createdAt`/`updatedAt`
- `RecipeStep.equipmentNeeded`: `String?` scalar, not array
- `PrepTask`: no `locationId`, `dishId`, `recipeVersionId`, `methodId`, `containerId`, `estimatedMinutes`, `actualMinutes`; `quantityUnitId` is `String?`; has `stationId`, `claimedBy`, `claimedAt` inline
- `AllergenWarning`: `allergens`/`affectedGuests` is `String?` (comma-sep), not `String[]`
- `PrepTaskPlanWorkflow`: no `deletedAt` field
- `Menu`, `MenuDish`: no `createdAt`/`updatedAt`
- `PrepList`: `dietaryRestrictions` is `String?` scalar; no `deletedAt`, no `createdAt`/`updatedAt`
- `PrepListItem`: `allergens`/`dietarySubstitutions` is `String?` scalar; `stationId` is required `String`
- `KitchenTask`: `tags` is `String?` scalar; `createdAt`/`updatedAt` are `DateTime?`
- `PayrollLineItem`: missing `hoursRegular`, `hoursOvertime`, `rateRegular`, `rateOvertime`, `deductions` fields
- `TipPool`: missing `periodId`, `allocationRule`, `fixedShares` — only has `periodStart`/`periodEnd`/`totalTips`
- `PayrollPeriod.periodStart`/`periodEnd`: `String?` not `DateTime`
- `EmployeeDeduction.effectiveDate`/`endDate`: `String?` not `DateTime`
- `User`: no Prisma relations for `payrollRole`/`taxInfo`/`payrollPrefs`/`department` (separate models)
- Fix strategy: correct store code to match schema field names/types; no source .manifest edits needed

---

## 17. Custom expression builtins — TURNED ON + expression migration (2026-06-01)

`@angriff36/manifest@1.7.0` ships `RuntimeOptions.customBuiltins` (a `Map<string, fn>`
merged into the engine's builtins; core builtins win on name collision — see
docs/spec/builtins.md + extensibility/plugin-api). Capsule was NOT using it. Now wired.

### What was added
- **NEW `manifest/runtime/src/manifest-builtins.ts`** — 5 pure/deterministic project
  helpers + `createCustomBuiltins(): Map<string, fn>`:
  - `daysBetween(from,to)` = `(to-from)/86_400_000`
  - `hoursBetween(from,to)` = `(to-from)/3_600_000`
  - `addDays(t,days)` = `t + days*86_400_000`
  - `percent(part,whole)` = `whole>0 ? part/whole*100 : 0` (folds in the zero-guard)
  - `containsAny(haystack,needles)` — array OR comma-string substring match
  Strict numeric coercion: only finite `number` is valid, else NaN (fails closed; does
  NOT coerce `null`→0). Names verified outside RESERVED_BUILTIN_NAMES.
- **`manifest-runtime-factory.ts`** — single registration site (the one
  `new ManifestRuntimeEngine(...)` at the engine-assembly step): added
  `customBuiltins: createCustomBuiltins()`. Both apps/api, apps/app, and the MCP server
  flow through this factory → identical builtin set, no drift.
- **NEW `src/__tests__/manifest-builtins.test.ts`** — 23 tests: pure-function units,
  explicit "equals the inline expression it replaces" equivalence tests, an end-to-end
  test (compile a probe entity → `RuntimeEngine` with customBuiltins → `evaluateComputed`
  returns correct values for all 5), and a NEGATIVE control (without the map the same IR
  does NOT resolve). All green.

### Behavior-preserving expression migration (29 expressions, 16 source files)
Replaced repeated/magic-number expressions with the helpers — each an EXACT equivalent
(this is a refactor, not a semantics change, so constitution §14's "IR-source-first"
governs nothing here; verified by the helper "equals inline" tests + clean recompile).
- **Allergen (2):** `ingredient-rules`, `prep-list-rules` `warnMajorAllergen` →
  `containsAny(self.allergens, [...])`.
- **Date (11):** `vendor-contract-rules` (daysUntilExpiry, isExpiringSoon→`daysBetween(...)
  < noticeDays`, requiresComplianceReview→`daysBetween(...) > 90`), `equipment-rules`
  (×2 daysBetween, ×2 addDays), `schedule-rules` (hoursBetween, guard kept),
  `logistics-all-rules` (addDays), `prep-task-rules` (daysOverdue daysBetween),
  `workforce-ai-rules` (addDays).
- **Percent (16):** budget, collections ×2, cycle-count ×3 (incl. variancePct with a
  difference numerator), equipment, event-import-workflow, inventory-extended,
  logistics-all, prep-task, prep-task-plan-workflow, revenue-recognition ×3, shipment.

### Deliberately NOT migrated (would change behavior — left verbatim)
- `dish-rules.manifest:41` marginPercent — guard is `price>0 AND cost>0` (two conditions);
  `percent` only guards the denominator, so not equivalent.
- Bare `(a/b)*100` with NO zero-guard inside event-payload bindings (dish:180,
  inventory:138, proposal:69, menu:103, recipe:259, prep-list:260, dish:190) — `percent`
  would turn Infinity/NaN into 0.
- Pure duration→unit conversions with no from/to interval: `version-control-rules`
  (`waitingTime/86400000`, `> 604800000`), `time-entry-rules:23` (`/60000` minutes). No
  helper cleanly fits; `daysBetween(0, x)` would hurt readability.

### Verification
- `pnpm manifest:compile` clean (189 entities / 952 commands); IR carries all helper calls
  (grep: percent/daysBetween/hoursBetween/addDays/containsAny all present).
- 23/23 runtime tests pass incl. end-to-end + negative control.
- **CAVEAT (pre-existing, NOT from this work):** `@repo/manifest-runtime typecheck`
  reports 96 errors, ALL in `prisma-stores/broken-read-batch*` — the in-flight store/schema
  alignment from §9 above. My 3 changed files (manifest-builtins.ts,
  manifest-runtime-factory.ts, the test) are clean; `.manifest`→IR recompile is unaffected.
- Real-merged-IR roundtrip spot check was blocked by unrelated entity block-constraint
  seeding (durable entities need full valid bodies — see §15 bootstrap notes), so the
  synthetic-probe end-to-end test is the mechanism proof.

### Follow-up (separate, scoped during brainstorm — NOT done here)
Kitchen unit conversion is duplicated+divergent+buggy (3 copies of `quantity*multiplier`;
falsy-`0`-multiplier bug in the two `recipe-costing.ts`; `densityGPerMl` volume↔weight
documented but never implemented). It is NOT a custom-builtin candidate — conversions live
in the `unit_conversions` DB table and builtins must be pure (no I/O). Fix = consolidate
into one shared TS module + fix the zero bug + implement density. Tracked for a later task.

---

## 18. Package bump 1.8.0 → 2.0.6 (2026-06-02)

Bumped `@angriff36/manifest` **1.8.0 → 2.0.6** (latest; the only 2.x release — 2.0.0–2.0.5 are
unpublished). Edited the 5 real `package.json` (root, `apps/api`, `apps/app`, `manifest/runtime`,
`packages/mcp-server`) + `pnpm install`. The `.tmp/` and `.worktrees/` copies were left alone.

### Despite the MAJOR bump, the API surface is backward-compatible
v2.0.0 is a 76-feature release (entity inheritance, generics, new date/time + map types, event
reactions, approval workflows, async commands, role hierarchies, multi-module compile, 16 new
projections, AI agent SDK); 2.0.1–2.0.6 are bug fixes. **No breaking changes documented** in the
GitHub releases. Verified by diffing the installed dist:
- `RuntimeOptions` is additive only (new optional `middleware`, `wasmEvaluator`, `encryptionProvider`,
  `profiling`; `customBuiltins`/`storeProvider` intact). `runCommand` auto-create
  (`shouldAutoCreateInstance`/`persistPreparedCreate`, the §15d behavior) intact.
- `projections/nextjs/generator.d.ts` byte-identical; `projections/prisma/options.d.ts` identical.
- Package exports additive only (adds `./lexer`, `./profiling`, `./projections`, `./types`, `./wasm`;
  removes none).

### ONE real breaking change: `signature` is now a reserved lexer word
`compile.mjs` failed on `shipment-rules.manifest` — 2.0's lexer `KEYWORDS` set added `signature`
(among many vNext keywords). A precise scan of every `.manifest` property/param/mutate identifier vs
the full keyword set found **`signature` was the ONLY collision** (3 spots, all in Shipment). No
escape syntax for it (unlike the context-sensitive `value` keyword).

**Fix (contained, no DB migration, frontend untouched):**
- `manifest/source/shipment-rules.manifest`: `Shipment.signature` → `signatureData` (property, the
  `markDelivered` param, and the `mutate`).
- `manifest/scripts/build-live-schema.mjs`: added `options.columnMappings = { Shipment: {
  signatureData: "signature" } }` so the projected model is `signatureData String? @map("signature")`
  — the **physical column stays `signature`**. This is load-bearing: the hand-written shipments API
  uses raw SQL against the literal column `"signature"` (`apps/api/app/api/shipments/[id]/helpers.ts:224`,
  `[id]/status/route.ts:194`). Schema regen diff = exactly 1 line.
- `manifest/runtime/src/prisma-stores/broken-read-shipment-parent.ts`: Prisma field `signature` →
  `signatureData` (3 edits — create/update/mapToManifestEntity).
- 4 hand-API Prisma-client reads `.signature` → `.signatureData` (`shipments/route.ts`,
  `[id]/route.ts`, `[id]/status/route.ts`, `[id]/helpers.ts`). The snake_case **API field `signature`
  is preserved** at every mapping site, so `apps/app` consumers (`use-shipments.ts`,
  `shipments-page-client.tsx`) need NO change.

### Verification (all green / baseline-equal)
- `pnpm manifest:compile` OK (189 entities, 952 commands — unchanged counts).
- `node manifest/scripts/build-live-schema.mjs` → `prisma validate` passes; `prisma generate` OK
  (Prisma 7.3.0). Schema git-diff = 1 line (the signature field).
- `@repo/manifest-runtime typecheck`: **96 errors = exact pre-existing baseline** (notes §17); the
  edited shipment store file has none. (The 96 are the in-flight §9 store/schema-alignment debt.)
- `api typecheck`: **939 errors with AND without my change** (proven by `git stash` baseline) → my
  change added ZERO; none at my edited lines. (939 = pre-existing §9 schema-regen migration debt; api
  typecheck is already red on HEAD, independent of this bump.)
- `manifest-builtins.test.ts`: 17/17 pass (RuntimeEngine + `customBuiltins` work on 2.0.6).
- `pnpm manifest:generate`: idempotent — zero generated-route drift under 2.0.6.

### Not done (out of scope / surfaced)
- The 939 api + 96 runtime pre-existing errors are the §9 schema-regeneration migration still in
  flight (recent commits: `2619fd70a` "align task queries with schema"). NOT introduced by this bump.
- No DB migration was needed (column preserved). If `Shipment.signatureData`'s column is ever
  un-mapped, the raw-SQL shipments writers and a column rename migration must be handled together.
- v2.0's new capabilities (encryption, middleware, wasm evaluator, 16 new projections, saga/approval
  workflows) are now AVAILABLE but unused — potential future leverage, not adopted here.

---

## 19. Task 2.5 Phase 2 — Full PrismaProjection (2026-06-04)

**What:** `generate-full-schema.mjs` now produces a 258-model Prisma schema (189 IR + 69 infra-core) that passes `prisma validate`.

**Key post-processing fixes applied by the generator:**
- 40 type mismatches (`@db.Decimal` on `String`→`Decimal`, `@db.Date`/`@db.Timestamptz` on `String`→`DateTime`)
- 14 `@default("")` on numeric/DateTime fields stripped
- 63 `@@unique` injections from auto-derived `_uniqueIndexes`
- 82 invalid `@@index`/`@@unique` stripped (reference non-existent fields)
- 134 infra-core forward relations stripped (missing back-relations)

**Coverage:** 157/189 entities with auto-derived options (tableMappings, columnMappings, dbAttributes, precision, indexes from committed schema + `prisma-options.generated.json`). 32 new entities (no committed model) get bare models with id/tenantId/timestamps only.

**Artifacts:**
- `manifest/scripts/generate-full-schema.mjs` — the generator
- `manifest/ir/generated-schema.prisma` — the output (258 models, validates clean)
- `manifest/scripts/prisma-options.generated.json` — auto-derived per-entity options
- `manifest/scripts/derive-prisma-options.mjs` — extracts options from committed schema

**Next:** Wire as CI drift gate (Task 0.5). Consider wiring to replace committed schema (Task 3.x).

## Section 20 — Policy Binding Root Cause + Fix (2026-06-05)

### Problem
250 top-level `policy` declarations across 67 manifest source files were NOT bound to commands in the compiled IR. All 952 commands had `policies: []` despite policies existing in source.

### Root Cause
Policies declared OUTSIDE entity blocks (at file/module level) get `entity: null` in the IR and are never passed to `transformCommand()`. Only policies INSIDE entity blocks get bound.

### Fix
The `default policy` syntax inside entity blocks causes the compiler to:
1. Set `isDefault: true` on the policy (parser.js line 761)
2. Add it to `IREntity.defaultPolicies` (ir-compiler.js line 445)
3. Auto-expand it into every command's `policies` array (ir-compiler.js lines 688-700)

### Key Compiler Files
- `node_modules/@angriff36/manifest/dist/manifest/parser.js` lines 206-214, 750-761
- `node_modules/@angriff36/manifest/dist/manifest/ir-compiler.js` lines 269-278, 416-445, 682-711

### Implementation
- Script: `manifest/scripts/add-default-policies.mjs` adds entity-specific `default policy <EntityName>DefaultAccess` inside entity blocks
- Domain→role mapping validated against existing 250 top-level policy declarations
- 92 source files modified, 952/952 commands now bound, 189/189 entities have defaultPolicies

## Section 21 — Create commands MUST NOT re-mutate transition-guarded properties (2026-06-05)

### The gotcha (runtime, applies to EVERY entity with `transition` rules)
The runtime validates state transitions on **every** status mutation (`updateInstance`,
`runtime-engine.js:1195-1209`) and does **NOT** exempt no-op self-transitions. A `create` command
seeds its properties from the full request body via `createInstance` (the bootstrap full-body seed,
§15a) and then, if it ALSO does `mutate <prop> = <prop>` for a property that owns a `transition`
rule, the runtime re-evaluates that as a transition `currentValue -> currentValue`. Because the
property's own `to` list almost never includes its own `from` value, the self-transition is
**rejected** and the whole create fails.

### Concrete instance found + fixed
`AdminTask.create` did `mutate status = status`. `status` owns
`transition status from "backlog" to ["todo","cancelled"]` (and rules for todo/in_progress/
cancelled). So governed `AdminTask.create` FAILED for backlog/in_progress/todo/cancelled — only
`review`/`done` passed (no `from` rule). This is why `apps/api/__tests__/administrative/
admin-tasks.quarantine.test.ts` is quarantined and the kanban server action used a direct
`database.adminTask.create`. Fix: drop `mutate status = status` from `create` in
`manifest/source/admin-task-rules.manifest` — the body seed already sets the initial state. Repairs
BOTH the kanban migration AND the already-wired API POST route (`.../administrative/tasks/route.ts`).

### Rule for future migrations
When making a transition-bearing entity's `create` governed, audit the `create` actions and remove
any `mutate <statusProp> = <statusProp>`. The initial state must come from the createInstance body
seed, never a self-mutation. (Status CHANGE commands — startProgress/complete/etc. — are where the
transition rules legitimately apply.)

## 22. AdminTask state-machine reconciliation (2026-06-05)

**Old vs new vocabulary.** Old Manifest used `backlog/todo/in_progress/done/cancelled` with commands
`moveToTodo/startProgress/complete/cancel/reopen`. The product kanban has NO `todo` column — it was
never surfaced in the UI, validation, or overview boards. All create-time tests and the status select
defaulted to `backlog`. `todo` was removed; the final vocabulary is `backlog/in_progress/review/done`
(active columns) + `cancelled` (side-state).

**One-command-per-target-column design.** Each destination column has exactly one command:
`moveToBacklog`, `startProgress`, `submitForReview`, `complete`, `cancel`. Transitions allow free
movement among the 4 active columns so the kanban can drag cards between any columns without guard
failures. `create` is unchanged (body-seeded status, no transition mutation).

**No-op short-circuit.** `updateAdminTaskStatus` in `kanban/actions.ts` reads the current status
first (§10-compliant read) and skips `runManifestCommand` when the target column equals the current
status. This prevents the runtime from rejecting a self-transition when the Kanban `<select>`
defaults to the current column.

**Un-quarantine blocker.** `apps/api/__tests__/administrative/admin-tasks.quarantine.test.ts` has
~18 pre-existing failures: PATCH tests throw because the test only mocks `requireCurrentUser`/
`getTenantIdForOrg` but the handler now calls `resolveCurrentUser`; and the POST create flow drifted
(`createManifestRuntime`/`mockRunCommand` never invoked). Status-map assertions were corrected in
this increment; mock-infrastructure repair is a separate increment.

Search: AdminTask, kanban, state machine, updateAdminTaskStatus, todo removed

---

## 23. Prisma baseline repair + generated-column escape hatch (2026-06-06)

Branch `fix/migration-baseline-repair`. The migration history had been collapsed to a single
`0_init/migration.sql` baseline (prior 5 folders archived to
`packages/database/prisma/migrations_archive_pre_13schema_baseline/`). `0_init` IS correct
multi-schema and **byte-identical to `prisma migrate diff --from-empty --to-schema`** of the current
`schema.prisma` (225 schema-qualified + 16 default-`public` PascalCase tables = 241). `_prisma_migrations`
holds one baseline-resolved row (`applied_steps_count=0`).

**What was repaired this session (data-safe, verified):**
1. `0_init` lines 1-2 were corrupt dotenvx `◇ injected env …` banner text (leaked onto stdout during
   `prisma migrate diff > file`) → `db:dev` died P3006 `syntax error at or near "◇"`. Stripped.
   **GOTCHA: always strip the dotenvx banner from `migrate diff > file` output, or use `--output`.**
2. Live Neon carried **172 EMPTY legacy `public.*` PascalCase tables** (pre-13-schema layout) — dropped
   in one transaction (in-txn emptiness re-check, no CASCADE). KEPT: 16 baseline-expected public tables,
   `_prisma_migrations`, and the 2 pg-pool infra tables. ALL real data (4879 rows) lives in the
   multi-schema tables; 0 rows lost; 0 schema-required tables were missing from live.
3. **Generated-column escape hatch.** `schema.prisma:298` models
   `EmployeeBankAccount.accountNumberLast4` as `@default(dbgenerated("\"right\"(account_number,4)"))`
   because **Prisma has no generated-column support**. `migrate diff` renders that as an invalid column
   `DEFAULT "right"(account_number,4)` → `db:dev` shadow replay fails P3006
   `cannot use column reference in DEFAULT expression`. The LIVE column is correctly
   `GENERATED ALWAYS AS ("right"(account_number,4)) STORED`. Fix applied **to `0_init` SQL only**
   (NOT schema.prisma): patched that one line to the real `GENERATED ALWAYS AS (...) STORED` form so the
   baseline reproduces live reality. Shadow replay now passes the generated-column step.

**Open items (NOT done — need decisions):**
- **Ledger checksum:** editing `0_init` changed it vs the stored `_prisma_migrations.checksum`.
  `migrate:status` stays clean (does not enforce), but `migrate dev` reports "0_init was modified after
  it was applied" and `db:deploy` will likely enforce it. A `migrate resolve` re-baseline is needed for
  a fully deployable ledger (gated on explicit user approval — do not autonomously rewrite the ledger).
- **`schema.prisma` is materially BEHIND live** (revealed once shadow replay got past the generated
  column): `db:dev` drift shows live has ~15 extra enums, added columns on ~7 tables (`leads` +25,
  `Vendor` +7, `Budget` +3, `StaffPerformance`, `LogisticsDispatch`, `FacilitySchedule`,
  `EventWaitlistEntry`), extra FKs, index renames, and a `supplier_sync_logs` PK change. Plus the 2
  runtime-managed infra tables (`manifest_audit_records`/`manifest_outbox_entries`, raw-SQL via
  `pg-pool.ts`, intentionally outside Prisma). `db:check` (additive-only, live→schema) passes because it
  strips DROP statements. Reconciling this is the larger schema-projection initiative, NOT this repair.

**MANIFEST FOLLOW-UP (requested 2026-06-06):** the Manifest Prisma projection should support
derived/generated storage fields. `accountNumberLast4` is semantically **derived from `accountNumber`**
and must be non-user-editable (not a command input); the Postgres projection should emit
`GENERATED ALWAYS AS (...) STORED`. Until then, the `0_init` SQL patch above is the documented
Prisma/Postgres projection escape hatch.

Search: baseline repair, dotenvx banner, generated column, GENERATED ALWAYS AS, P3006, account_number_last4, schema behind live, db:dev drift, checksum modified after applied

---

## 24. Tenant declarations + mergeIrs() fix (2026-06-09)

### What changed
All 94 `.manifest` source files in `manifest/source/` now carry a top-level tenant declaration:
```
tenant tenantId : string from context.tenantId
```
This is the canonical syntax from the Manifest tenancy docs (§13c). Previously, most source files relied on per-entity `property required tenantId` fields and hand-rolled RLS instead of the unified tenant block.

### mergeIrs() fix
`mergeIrs()` in `manifest/scripts/ir-utils.mjs` was fixed to propagate the `tenant` field from individual compiled IRs to the merged IR. Previously, even when one source file declared `tenant`, the merged `kitchen.ir.json` had no structured `tenant` declaration at the top level — the field was silently dropped during merge. The fix ensures the merged IR carries a single `tenant` object reflecting the shared declaration.

### Runtime test impact
Tests that instantiate `RuntimeEngine` with the merged IR now need top-level `tenantId` in the engine context (since the IR declares `tenant tenantId : string from context.tenantId`). Without it, commands fail with `MISSING_TENANT_CONTEXT`. This is the correct behavior — the tenant block makes tenant enforcement automatic per the Manifest runtime contract.

### Why this matters
With all 94 source files declaring tenant uniformly:
- The merged IR is tenant-complete — no entity is missing tenant context
- The Manifest runtime can auto-filter reads and auto-write tenantId on creates
- Per-entity RLS policy duplication can eventually be retired in favor of the unified tenant block
- IR-completeness checks (Phase 0 / audit tools) can validate tenant coverage as a single gate

Search: tenant declarations, tenant tenantId, mergeIrs, ir-utils.mjs, kitchen.ir.json tenant, MISSING_TENANT_CONTEXT, context.tenantId, all 94 manifests, tenant block unified

---

## Section 27 — PrismaProjection default-value fix (2026-06-10)

### Problem
`generate-full-schema.mjs` produced 3 `prisma validate` errors from `@default(0)` on String/DateTime fields, plus 149 `@default("")` on non-String fields (Int/Float/Decimal/DateTime). All invalid Prisma.

### Root cause
The post-processing regexes in section 5e required `\S+` (at least one non-whitespace token) between the field type and `@default(...)`. Many fields have the default immediately after the type with no intermediate attributes (e.g., `guestCount Int? @default("")`). The regex couldn't match these.

### Fix
Added section 8b — a final post-assembly line-by-line pass on the COMPLETE output after all other post-processing. Processes all 3 error classes:
1. `@default(0)` on String → `@default("")`
2. `@default(0)` on DateTime → removed
3. `@default("")` on non-String (Int/Float/Decimal/DateTime/Boolean/BigInt) → removed

### Result
`prisma validate` now PASSES on the generated 256-model schema (191 IR + 70 infra-core). Database drift also resolved via migration `20260610041450_repair_drift` (adds event_followups.deleted_at + creates qa_checks table).

Search: PrismaProjection, generate-full-schema, @default validation, prisma validate, default fix, database drift, repair_drift

---

## 26. Governance migration: training/complete route (2026-06-06)

`apps/api/app/api/training/complete/route.ts` migrated from direct Prisma writes to Manifest runtime governance.

**Manifest commands used:**
- `TrainingAssignment.start` — replaces direct `UPDATE training_assignments SET status = 'in_progress'` for the "start" action. Transitions status from `assigned`/`overdue` to `in_progress`, sets `startedAt`.
- `TrainingAssignment.submitPassingAttempt` — replaces direct `UPDATE training_assignments SET status = 'completed'` for the "complete" action. Transitions status to `completed`, sets `completedAt`/`score`/`lastScorePercent`, increments `attemptCount`. Reactions auto-create `TrainingAttempt` + `StaffTrainingSignal` records.

**Backward compat retained:** The legacy `training_completions` table is NOT a Manifest entity. The INSERT/UPSERT into `training_completions` is kept as a transitional side-effect to avoid breaking consumers that read from that denormalized table. Once all consumers migrate to reading from Manifest-governed entities (`TrainingAssignment` + `TrainingAttempt`), the legacy writes can be removed.

**Pattern:** All reads (assignment lookup, employee lookup, existing completion check) bypass Manifest per constitution S10. Only the `training_assignments` status update is governed. Actor resolution via `resolveCurrentUser(request)`.

Search: training complete route, TrainingAssignment.start, TrainingAssignment.submitPassingAttempt, governance migration, training_completions legacy

---

## Invoice [id] route governance migration (Task 8.2 batch 10, 2026-06-06)

`apps/api/app/api/accounting/invoices/[id]/route.ts` migrated from 7 direct Prisma `database.invoice.update()` calls to Manifest runtime governance.

**Manifest changes (`manifest/source/invoice-rules.manifest`):**
- Added `update` command: accepts subtotal, taxAmount, total, amountDue, notes, internalNotes, dueDate, paymentTerms, lineItems. Guard: `self.status == "DRAFT"`.
- Fixed transitions: SENT now allows PARTIALLY_PAID and PAID (previously missing). VIEWED already had them but SENT did not.

**Route handlers migrated:**
- PUT → `Invoice.update` (replaces direct `database.invoice.update` with calculated totals)
- PATCH `apply-payment` → `Invoice.applyPayment` (replaces manual amountPaid/amountDue/status calculation)
- PATCH `mark-as-paid` → `Invoice.markAsPaid`
- PATCH `mark-overdue` → `Invoice.markOverdue`
- PATCH `send-reminder` → `Invoice.sendReminder` (email remains best-effort side-effect after command)
- POST `/send` → `Invoice.send` (email remains best-effort side-effect after command)
- DELETE → `Invoice.voidInvoice`

**Pattern:** Pre-validation reads (findFirst for existence, validateInvoiceAccess, validateInvoiceBusinessRules) bypass Manifest per constitution S10. Side-effects (email sending via Resend) execute after the command only if `result.status === 200`, wrapped in try/catch as non-fatal. GET handler unchanged. `formatInvoiceResponse` helper kept but only used in PATCH send-reminder fallback; other handlers return the Manifest response shape (`{ success, result, events }`) consistent with all other migrated routes.

Search: invoice route migration, Invoice.update command, Invoice.applyPayment, Invoice.voidInvoice, Invoice.send, governance migration, accounting invoices

---

## S25 — Quarantine Drain Complete (2026-06-09)

All 74 quarantine test files recovered. Baseline at ZERO. 5,131 tests pass, 0 typecheck errors.

**Production bugs found during test recovery:**
1. Missing `await` in manifest command dispatcher route at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts:25` — `return runManifestCommand(...)` without `await` caused unhandled rejections to propagate instead of being caught by the try/catch and returned as 500 responses.
2. Missing self-deactivation prevention in `apps/api/app/api/user/deactivate/route.ts` — no check for `body.userId === currentUser.id` returning 403.
3. Stale IR file paths in `prove-manifest-source.test.ts` referencing deleted `packages/manifest-ir/` and `packages/manifest-adapters/` — updated to `manifest/ir/` and `manifest/runtime/dist/`.

**Global test infrastructure improvements:**
- `apps/api/test/setup.ts` enhanced with global mocks: `@sentry/nextjs`, `@/app/lib/webhook-dispatch`, `@/lib/manifest/issue-log`, `@repo/notifications`
- `@repo/auth/server` and `@/app/lib/invariant` NOT added globally (broke accounting tests)
- `apps/api/test/mocks/@repo/database.ts` enhanced with `MockDecimal` class and missing models (purchaseRequisition, vendorContract, etc.)

**Root cause pattern catalog for future test work:**
1. Generic dispatcher uses `requireCurrentUser()` (not `auth()+getTenantIdForOrg`)
2. Command execution goes through `runManifestCommand` from `@/lib/manifest/execute-command` (not `createManifestRuntime`)
3. Next.js App Router requires `params: Promise.resolve({entity, command})` in route handler calls
4. Generated read routes use `findFirst` (not `findUnique`)
5. `manifestErrorResponse` returns `{success, error, diagnostics}` not `{success, message}`
6. Per-file database mocks override the global mock with incomplete model sets

Search: quarantine drain, test recovery, 74 quarantine files, 5131 tests, mock infrastructure, root cause patterns, MockDecimal, prove-manifest-source, command dispatcher await, self-deactivate prevention

---

## 28. Generated-route auth-import drift gate (2026-06-10, v0.12.247)

### The latent drift
`pnpm manifest:generate` on main emitted `import { auth } from "@clerk/nextjs"` for ALL 166 generated `list/route.ts` files, but the committed routes (and the version that passes `api typecheck`) use `import { auth } from "@repo/auth/server"`. This is a 166-file LATENT drift — regenerating routes would have broken the build (Clerk v5 exports `auth` from `@clerk/nextjs/server`, NOT the bare `@clerk/nextjs`). Detail `[id]/route.ts` routes did NOT drift (generated by the inline `NextJsProjection` detail call, not the CLI).

### Root cause
`manifest.config.yaml` set `projections.nextjs.options.authProvider: clerk` but did NOT set `authImportPath`. The nextjs projection (`node_modules/@angriff36/manifest/dist/manifest/projections/nextjs/generator.js:144-148`) does: for `authProvider: clerk`, `const clerkImport = authImportPath === '@/lib/auth' ? '@clerk/nextjs' : authImportPath`. The default `authImportPath` is `@/lib/auth` (defaults.js:11), so it collapsed to `@clerk/nextjs`. `generate.mjs` has NO auth-import post-process. The committed `@repo/auth/server` routes were produced by an earlier generator/config; once `manifest.config.yaml` was wired (Task 2.3, 2026-06-07) without `authImportPath`, the default took over but nobody re-ran generate to notice.

### Fix (config-native, constitution §10)
Added `authImportPath: "@repo/auth/server"` to `manifest.config.yaml` under `projections.nextjs.options`. The CLI (Run 1, list routes) reads it → emits the repo wrapper import → 0 route drift. The inline detail projection (Run 2) ignores config but does not drift (its default output already matches committed detail routes).

Search: auth import drift, authImportPath, @clerk/nextjs, @repo/auth/server, generator.js generateAuthImport, list route drift, manifest.config.yaml nextjs options

### Phase 4 store projection (same increment)
New `manifest:generate-metadata` chain: `generate-prisma-model-metadata.mjs` → `build-prisma-store-options.mjs` → `generate-prisma-store-projection.mjs`. Produces an IR-entity→Prisma-model bridge (`manifest/runtime/src/generated/entity-to-prisma-model.generated.ts`, `resolvePrismaModelKey()`), store metadata, and a store registry. Factory + `generic-prisma-store.ts` now resolve metadata by IR name OR resolved Prisma model key, and `GenericPrismaStore.create()` emits `tenant: { connect: { id } }` for models with `requiresTenantConnect` (detected from a `tenant Account @relation` in schema.prisma) — fixing PrepList, which moved off `PrismaJsonStore` onto `GenericPrismaStore`. Generated artifacts are reproducible (deterministic) and the committed copies are in sync.

### event_staff raw-SQL camelCase quoting
The `EventStaff` model → `event_staff` table (schema.prisma:6503) has camelCase physical columns with NO `@map` (`eventId`, `tenantId`, `staffMemberId`, `deletedAt`). Unquoted raw SQL (`WHERE tenantId = $1`) FAILS at runtime in Postgres (folds to `tenantid`). All 13 raw-SQL references to `tenant_events.event_staff` across apps/api + apps/app now quote these columns. Not caught by typecheck/unit tests (mocked DB) — runtime-only correctness.

Search: event_staff camelCase columns, quoted identifiers raw SQL, tenant_events.event_staff, column does not exist postgres lowercase

---

## 29. EventStaff shiftStart/shiftEnd live-schema drift (found 2026-06-11, plan-review)

IR declares `EventStaff.shiftStart`/`shiftEnd` as `datetime` (`manifest/source/events/event-staff-rules.manifest`), but the LIVE schema has `shiftStart Int? @default(0)` / `shiftEnd Int?` (schema.prisma:6510; `0_init` migration created INTEGER columns). The §12e source fix changed `number→int` at the time; a later pass retyped the source to `datetime` (v0.12.215 class) without migrating the live columns. No production path has ever written a non-zero value — every `EventStaff.assign` caller passes `shiftStart: 0` (`setup-event-completely.ts:278`, `battle-board/actions/tasks.ts:478`). Writing a real ISO datetime through the generic store would fail Prisma validation against `Int?`.

**RESOLVED 2026-06-11:** migration `20260611144817_event_staff_shift_times_to_timestamptz` applied (DROP+ADD → `Timestamptz(6)`; table was empty on both Neon endpoints). Both legacy callers now pass the event's `event_date` as an ISO placeholder for shiftStart/shiftEnd. The migration also healed the `invoices.version`/`versionAt` history gap (columns from v0.12.237 entity-concurrency commit `c6c72e195` had no migration) — Prisma folded plain `ADD COLUMN` statements into the generated migration and they applied cleanly (live columns were missing until then).

**Migration-history checksum repair (user-approved, same class as the 0_init defect):** `20260610041450_repair_drift` had a stale checksum (file modified post-apply, original content unrecoverable from any clone/stash/unreachable-blob; live schema verified drift-free) — re-resolved to the committed file's sha256 via checksum-guarded single-row UPDATE (transaction + WHERE guards on name AND old checksum + expect exactly 1 row). The `20260611144817_*` migration needed NO checksum repair: an orphaned `prisma migrate dev` zombie (from a stuck name prompt — `pnpm db:dev -- --create-only ...` with a literal `--` makes Prisma 7 ignore the flags and prompt interactively) applied the freshly generated file before review edits, so the file was restored to the exact applied content instead. Lesson: pass db:dev flags WITHOUT `--` (`pnpm db:dev --create-only --name X`), and kill stuck prisma processes before regenerating. Also note: `.env.local` DATABASE_URL points at stale branch ep-divine-math; prisma migrate targets ep-square-dust from `.env` — standalone scripts must load `.env` only (or override with DIRECT_URL) to hit the migrate target.

Also confirmed in the same review: `CommandBoardCard` has TWO block-severity enum constraints (`validStatus` AND `validCardType in ["task","note","reference","checklist","entity"]`) — any new card flow must use enum values, custom kinds belong in `metadata` (a Prisma `Json` column that reads back as string OR object — normalize both). `runManifestCommand` (apps/app/lib/manifest-command.ts) returns `{ ok, message, result }`, created id at `result.result.id`.

Search: EventStaff shiftStart Int datetime drift, event_staff shift columns integer, validCardType enum, metadata Json string object, event tree board plan

---

## 30. Event board atomic commit endpoint (Task 6, 2026-06-11)

New governed shared-tx cascade: `POST /api/command-board/[boardId]/commit` (apps/api/app/api/command-board/[boardId]/commit/route.ts) commits every assign-staff draft card on a board — `EventStaff.assign` + `CommandBoardCard.update` envelope flip per card — inside ONE `database.$transaction` threaded through the Manifest runtime via `prismaOverride` (same `makeCoreDeps(tx)` pattern as ManifestPayrollDataSource). Orchestration is pure/DI in apps/api/lib/event-board/commit-event-board-drafts.ts (re-implements the draft-envelope normalize/parse contract locally — apps/api must not import apps/app). Any command failure throws out of the tx callback → full rollback; route returns 200/422 with `{ success, committedCount | error, failedCardId }`. App-side server action `commitEventBoard(boardId, eventId)` in board/actions.ts posts via `apiPostJsonServer` (cookie-forwarded).

Review fixes (same day): (1) error classification — only CommitError (governed-command failure / board validation, client-safe messages) maps to 422 `{ success:false, error, failedCardId? }`; unexpected throws propagate out of the orchestrator and the route captureException()s them and masks as generic 500 "Internal error during commit". (2) First op inside the tx is `lockBoard`: raw `SELECT "event_id" FROM "tenant_events"."command_boards" ... FOR UPDATE` (columns are snake_case via @map here — unlike event_staff) — validates board exists + board.eventId matches the request, and the row lock serializes concurrent commits (second sees flipped cards, no-ops). (3) isDraftEnvelope also requires draftAction.params to be a non-null object. (4) tx options `{ timeout: 30_000, maxWait: 15_000 }`. 7 unit tests.

Search: event board commit, prismaOverride shared transaction, commitEventBoardDrafts, command-board commit route, draft envelope flip committed, lockBoard FOR UPDATE, commit error classification

---

## 31. EventStaff.create — assign was create-semantics but never persisted (2026-06-11)

Conformance testing of the board commit path (§30) exposed a production bug: `EventStaff.assign` is a create-semantics command, but the Manifest engine auto-instantiates ONLY commands named `create` (runtime-engine.js: `shouldAutoCreateInstance = commandName === 'create'`), and `deriveInstanceIdFromBody` finds nothing in an assign body (no `id`/`eventStaffId`). Every `EventStaff.assign` call without an existing row was a SILENT NO-OP — confirmed empirically (in-memory conformance run + the live `event_staff` table being empty despite assignment UIs). Fix per §14: added `EventStaff.create` (same params/guards/emit as assign, NO `mutate status` — status defaults to "assigned" via body seed; mutating a transition-guarded property in a create falsely fails on the no-op self-transition, see "create command transition self-loop bug"). `assign` is retained for future existing-row semantics (re-assigning an unassigned row). Switched callers: commit endpoint (apps/api/lib/event-board/commit-event-board-drafts.ts) + setup-event-completely.ts + battle-board/actions/tasks.ts (their pre-existing duplicate-assignment read-checks unchanged). Conformance Test A now proves auto-create (no seed, no instanceId → persisted row, status "assigned", result carries id).

OUT-OF-SCOPE pre-existing finding (vocab reconciliation needed later, §14 class): EventStaff transitions reference `"cancelled"`/`"completed"` which are NOT in the `validStatus` constraint list, and `unassign`/`checkOut` mutate to states (`unassigned`/`checked_out`) that have no inbound transition rule.

**Engine datetime contract = EPOCH MILLISECONDS (2026-06-11 follow-up):** `validateDateTimeTypes` (runtime-engine.js:1317) requires `typeof value === 'number'` for `datetime` properties at create validation — ISO strings are REJECTED with blocking `E_TYPE_DATETIME`. The prisma-generic store's `asNullableDate` coerces epoch→Date at the write boundary, so the correct caller pattern is: ISO strings in UI/JSON envelopes → `Date.parse()` to epoch ms when building the command body. Applied to the event-board commit orchestrator + both legacy EventStaff callers. ⚠ SUSPECT pre-existing path: `createEvent` (apps/app events/actions.ts) passes `eventDate` as a JS `Date`, which JSON-serializes to an ISO string over the dispatcher HTTP hop — that should hit the same E_TYPE_DATETIME rejection; needs verification (governed event create may be failing or being saved without validation passing as believed).

Also noted from review: the 6e26c9211 routes regen picked up a third drift item beyond EventStaff.create + BattleBoard.syncFromEvent — `Event.create` gained its (pre-existing in IR) `templateId` param in routes.manifest.json.

Search: EventStaff create assign silent no-op, shouldAutoCreateInstance, event_staff empty table, auto-create only create command, EventStaff vocab cancelled completed, E_TYPE_DATETIME epoch milliseconds ISO string rejected, datetime command body contract

---

## 32. Event Tree Command Board v1 SHIPPED + local-dev E2E findings (2026-06-11)

**Feature complete** (plan `docs/plans/2026-06-11-event-tree-board-v1.md`, spec `specs/event-tree-command-board.md`): per-event Command Board tab (lazy board create on tab activation — NO write-on-browse), tree canvas (opalescent elbow branches, template-driven branch states from `board/templates.ts` — ADVISORY only, never Manifest constraints), drag palette → draft cards (envelope in `CommandBoardCard.metadata` Json under key `eventBoardDraft`; cardType "entity"/status "pending" per the block-enum constraints), impact preview (pure `computeStaffImpact`, read-path), atomic commit endpoint (`POST /api/command-board/[boardId]/commit`: FOR-UPDATE board lock + event validation + EventStaff.create + full-field card flips, ALL in one `$transaction` via `prismaOverride`; CommitError→422, unexpected→Sentry+500). 30 tests green (17 app pure + 10 api orchestrator + 3 IR conformance); both typechecks 0.

**Browser E2E (local, Chrome): VERIFIED** tab renders with live data, tree/outline/palette/impact-rail UI, drag→shift-dialog (correct event-date prefill), error surfacing in dialog. **BLOCKED before the commit roundtrip** by two pre-existing local-dev infra issues:
1. **Split-brain envs:** `NEXT_PUBLIC_API_URL=https://capsule-pro-api.vercel.app` in root + apps/app `.env.local` → local dev posts governed commands to the PRODUCTION Vercel API (whose DB = ep-divine-math, 10 migrations behind!) while local reads hit ep-square-dust. A test board (`36952375-6f48-4a8f-9d92-bd155341a96b`, "A real event — Event Board") + 2 draft cards were inadvertently created on divine-math through the prod API — cleanup candidates. Root `.env.local` DATABASE_URL was fixed to square-dust (user-approved); `apps/app/.env.local` still has divine-math + the vercel API URL.
2. **API dev server couldn't bundle the Phase-4 generated store registry — FIXED `d53edab39`.** `prisma-store-registry.generated.ts` imported `./manifest-prisma-store-metadata.generated.js` (ESM `.js` specifier); webpack (even with resolve.extensionAlias) AND turbopack (with resolveExtensions) failed "Module not found" through the `manifest/runtime/src/generated` junction → every governed command via the local dispatcher 500'd since v0.12.247. ROOT CAUSE: the producer `manifest/scripts/build-prisma-store-options.mjs` hardcoded `metadataImportPath` with a `.js` suffix. Fix: extensionless (runtime resolves with moduleResolution "Bundler"; repo rule = no `.js` imports), regenerate via `pnpm manifest:generate-metadata`. Verified: local dispatcher now returns **401** (auth) not 500 (module error) on `POST /api/manifest/CommandBoard/commands/create`. The regen also trued up stale store metadata (EventStaff shiftStart/shiftEnd Int→DateTime post-migration — was a latent wrong-coercion bug at the write boundary).

Also: `.next-dev/dev/types` typegen corruption reappeared after dev-server runs (known gotcha — `rm -rf apps/api/.next-dev/dev/types`). Pre-existing `manifest:schema:check` staleness (~5k lines, from the source restructure) still open — fix is `pnpm manifest:schema:full` + commit.

Search: event tree command board v1, event board tab, draft commit pipeline, NEXT_PUBLIC_API_URL vercel split brain, prod API divine-math, prisma-store-registry module not found junction, api dev 500 governed commands

---

## 33. Runtime store-metadata regression: IR-projection metadata adopted prematurely (FIXED 2026-06-11)

**Symptom class:** every governed write through GenericPrismaStore (i.e. ~all generic-store entities) threw at store CONSTRUCTION — `GenericPrismaStore: Prisma client has no delegate "event_staffs"` — so commands 500'd even after the §32 bundling fix. This is why event-board drops "didn't persist" beyond the env split-brain.

**Root cause:** commit `a73572259` ("manifest changes") swapped the runtime's metadata authority from the LIVE schema-derived `prisma-model-metadata.generated.ts` to the Phase-4 IR-projection `manifest-prisma-store-metadata.generated.ts` (factory import, registry `createGenericPrismaStore`, event-prisma-store). The projection metadata describes the IR-PROJECTED schema world (snake_plural accessors like `event_staffs`, column-named fields like `tenant_id`), which the live PrismaClient does not expose: audit found **173/191 entities with a delegate name missing from the live client** (only 15 matched — exactly the `ENTITY_TO_PRISMA_MODEL` bridge entries threaded through `accessorNames`). Field names were equally wrong for camelCase-field models (Prisma create args need FIELD names like `boardId`, not column names like `board_id`). Nothing caught it because store construction is mocked in unit tests and §32's live verification only reached the 401 auth gate, never an authenticated write.

**Fix (producer-level, constitution §10):**
- `build-prisma-store-options.mjs`: `metadataImportPath` → `./prisma-model-metadata.generated` (live schema metadata) so the generated registry constructs GenericPrismaStore with metadata matching the real client.
- `manifest-runtime-factory.ts` + `prisma-stores/event-prisma-store.ts`: import `PRISMA_MODEL_METADATA` from `./generated/prisma-model-metadata.generated` (reverting a73572259's swap).
- Regenerated via `pnpm manifest:generate-metadata`. The IR-projection metadata file is still generated (it correctly describes the future Phase-2b projected schema) but is NOT the runtime authority until the live schema is IR-generated.

**Rule for future agents:** the runtime's GenericPrismaStore metadata MUST be derived from the live `schema.prisma` (`generate-prisma-model-metadata.mjs`) as long as the live schema is hand-authored. Do not point the runtime at the prisma-store projection output before Phase 2b lands (generated == live).

**Also fixed in the same increment:** pre-existing strict parent-context gate failure — `EventStaff.create`'s `role` param (added in §31) needed a FALSE_POSITIVE override (per-assignment shift role ≠ StaffMember.role job title) in `manifest/governance/parent-context-overrides.json`. And `apps/app/.env.local` repointed: DATABASE_URL → ep-square-dust, NEXT_PUBLIC_API_URL → http://localhost:2223 (closes the §32 split-brain for apps/app local dev).

Search: GenericPrismaStore no delegate, event_staffs accessor missing, manifest-prisma-store-metadata wrong accessors, prisma-model-metadata live authority, a73572259 regression, store metadata 173 entities, governed writes throw at construction

---

## 34. Event board v1.1: EventDish IR↔schema reconciliation + menu/battle-board/vehicles wiring (2026-06-11)

**EventDish source reconciled to the live table (§14 class):** `manifest/source/events/event-dish-rules.manifest` props renamed `quantity→quantityServings`, `courseLabel→course`, `notes→specialInstructions`, and `sortOrder` REMOVED (live `event_dishes` has no sort_order column — removed rather than invented). Every prior `EventDish.create` call was silently dropping quantity/course/notes (irName mismatch against the live store metadata); the documents/parse route was already double-passing live-named extras as a workaround (now cleaned). Callers updated: `events/actions/event-dishes.ts` (×2) + `events/documents/parse/route.ts`. Regen chain run: `manifest:compile` + `manifest:generate` + `manifest:client` + `manifest:routes:ir` + `manifest:generate-metadata`.

**Event board v1.1 (UI + pipeline):**
- Menu branch is now a real drag target: dish palette tab (`getDishPalette`), `add-dish` draft envelopes, DishDialog (servings default = guest count), commit orchestrator `buildDomainCommand` maps `add-dish → EventDish.create` (string envelope params → int). Unknown kinds still skipped, not failed.
- Battle-board leaf links to the REAL editor `/events/battle-boards/[boardId]` (the `/events/[eventId]/battle-board` route never existed); `getEventBoardData` returns `battleBoards[]`; zero-board state links to `/events/battle-boards/new?eventId=…` (new page now prefills from the query param).
- Vehicles leaf shows the real `DeliveryRoute` count for the event (read-path) + a `/logistics/routes` link. Equipment leaf states plainly there is no event↔equipment data model yet (do NOT invent one — constitution).
- DnD: PointerSensor(distance 4) + DragOverlay ghost + valid-target leaf pulse; layout widened (15rem/1fr/17.5rem grid), hub/excluded chips inset from the canvas border, AI-assistant panel styled as a real coming-soon card.

**Pre-existing test debt fixed:** `manifest-all-phases-compilation.test.ts` (147 failures) still used flat `manifest/source/*.manifest` paths from before the 2026-06-10 domain-subdir restructure — now resolves via a recursive `MANIFEST_PATH_INDEX`.

Search: EventDish quantityServings course specialInstructions rename, sortOrder removed, event board menu drag dish, add-dish draft commit, battle board leaf real route, delivery route count vehicles leaf, manifest compilation test subdirs

---

## 35. CommandBoardCard.create — requiresTenantConnect vs composite-FK relations (FIXED 2026-06-11)

**Symptom:** every `CommandBoardCard.create` (event-board draft cards) 500'd with `PrismaClientValidationError: Argument 'board' is missing` — confirmed live in the browser (drop → dialog → "Adding…" → silent failure; zero cards on the board despite the server action returning success, because the apps/api 500 surfaced as a failed governed command).

**Root cause:** the schema-metadata generator (`generate-prisma-model-metadata.mjs`) set `requiresTenantConnect: true` for ANY model with a `tenant Account @relation` (regex-only). `GenericPrismaStore` then writes `tenant: { connect: { id } }` (Prisma "checked" create input). For `CommandBoardCard` that breaks: `tenantId` is ALSO a foreign-key field of the `board` (`@relation(fields: [tenantId, boardId])`) and `group` (`[tenantId, groupId]`) composite relations. Once the tenant write is a relation-connect, Prisma can no longer accept scalar `boardId`/`groupId` to satisfy those composite FKs — it demands `board: { connect }` too. PrepList (the entity `requiresTenantConnect` was introduced for) has tenantId in NO other relation, so its connect is fine. This is why the §32 prod-DB (ep-divine-math, 10 migrations behind) test "created 2 draft cards" but square-dust (current schema) could not.

**Fix:** `requiresTenantConnect` is now `hasTenantRelation && !otherRelationUsesTenantId`, where `otherRelationUsesTenantId` is true when any `@relation(fields:[…])` besides the tenant relation includes `tenantId` in a composite (length > 1) FK list. Such models write FLAT scalar keys (the repo's flat-key convention — one scalar `tenantId` satisfies every composite FK at once), which is the correct "unchecked" Prisma create. Verified: `CommandBoardCard`/`CommandBoardGroup` → false; `CommandBoard`/`PrepList` → true. Regenerated via `pnpm manifest:generate-metadata`.

**Live E2E (square-dust, local API): VERIFIED FULL ROUNDTRIP** — drag staff → DragOverlay ghost → drop highlights the staff leaf → shift dialog → draft card persists (`CommandBoardCard.create` 200, envelope in metadata) → Review & Commit → `POST /api/command-board/[id]/commit` 200 → 2 real `tenant_events.event_staff` rows (status "assigned") + both cards flipped to `draftState:"committed"` with `committedRecordId` = the EventStaff ids → UI shows Staff 2/1 ✓, 0 drafts. The §32 split-brain is fully closed (root `.env.local` `NEXT_PUBLIC_API_URL` was ALSO still pointing at the prod Vercel API — that's the file the app actually loads; both root and apps/app now → http://localhost:2223).

Search: CommandBoardCard requiresTenantConnect, Argument board is missing, composite FK tenantId relation, GenericPrismaStore checked unchecked create, flat keys tenant connect, event board commit verified, NEXT_PUBLIC_API_URL root env split brain

---

## 36. Runtime datetime coercion bugs — R1/R2/R3/R4/R5 (FIXED 2026-06-11)

Four connected datetime bugs diagnosed and fixed in the Manifest runtime layer.

### R1 — Boundary coercion (run-manifest-command-core.ts)
**Problem:** Callers (forms, server actions) may send ISO strings or `Date` objects for datetime command parameters. The engine validates `typeof value === 'number'` (E_TYPE_DATETIME ~line 1318 of runtime-engine.js) and rejects non-numbers.
**Fix:** `coerceBodyDatetimes()` in `run-manifest-command-core.ts` — called after runtime creation, scoped to IR-typed `datetime` field names only (conservative: never sniffs arbitrary string fields). `Date` → `.getTime()`; non-empty string with finite `Date.parse` → `Date.parse(value)`; numbers/null/undefined/"" unchanged.
**Extension (review round 2):** for `create` commands the coercion set is the UNION of the command's datetime params AND the entity's datetime-typed PROPERTIES (`runtime.getEntity`). Reason: auto-create validates the FULL body against entity properties (`persistPreparedCreate`), so a datetime property present in the body but absent from the create param list (e.g. `eventDate` when create declares only id/clientId) still fails E_TYPE_DATETIME under param-only coercion. Verified by failing-first conformance tests.
**Fact-check during review:** the claim "Event.create does not exist in the IR" is FALSE for current `kitchen.ir.json` — Event entity.commands includes `"create"` and `ir.commands` has 1 create with `entity:'Event'` carrying `eventDate:datetime` (185 create commands total across 202 entities). Also verified: `compileToIR` does NOT auto-generate create commands (even with `store ... in durable`), and an entity whose IR truly lacks a create command cannot run create at all — engine returns `Command 'create' not found` BEFORE the shouldAutoCreateInstance branch (runtime-engine.js getCommand checks `entity.commands.includes(name)`). "Engine auto-creates create commands" refers to auto-creating the INSTANCE for commands named create, not synthesizing missing commands.

### R2 — Date objects from GenericPrismaStore (parent-context-resolver.ts)
**Problem:** `GenericPrismaStore.mapToManifestEntity` returns DateTime columns as JS `Date` objects verbatim (`entity[field.irName] = row[field.name] ?? null`). When `inheritFromParents` copies a parent value into the child create body, it copied the `Date` object. Engine rejects it with E_TYPE_DATETIME.
**Fix:** In `inheritFromParents`, one-liner coerce: `body[name] = parentValue instanceof Date ? parentValue.getTime() : parentValue`.

### R3 — refreshParentContext skip-set inverted (parent-context-resolver.ts)
**Problem:** `refreshParentContext` built `childParamNames` from the `syncFromEvent` command's own parameters (the six snapshot fields: `eventDate, clientId, guestCount, venueName, venueAddress, locationId`). Then `inheritFromParents` skipped every name in that set with `if (childParamNames.has(name)) continue`. Result: body stayed `{id}`-only, engine ran `mutate eventDate = eventDate` on the stored `Date` object → E_TYPE_DATETIME. Sync ALWAYS silently failed.
**Fix:** Pass `new Set<string>()` (empty) as `childParamNames` for the refresh path. The `respectExistingBody=false` argument already ensures existing body values are overwritten; the skip-set was wrong only for refresh commands where the sync params ARE the fields to populate.

### R4 — Swallowed reaction failures (runtime-engine.ts)
**Problem:** The upstream engine's reaction dispatcher calls `this.runCommand(...)` for `on EventCreated run BattleBoard.create` but only reads `reactionResult.emittedEvents`; `success:false` is silently dropped. Our `ManifestRuntimeEngine.runCommand` override had no visibility either.
**Fix:** Added structured `console.error('[manifest-runtime] command failed: ...')` immediately after `super.runCommand()` returns `result.success === false`. Non-throwing, best-effort. Makes all governed-command failures (including reaction-triggered ones) visible in API logs.

### R5 — Neon driver local-timezone offset (+7h) (packages/database/index.ts + standalone.ts)
**Problem:** `neonConfig.parseInputDatesAsUTC` defaults to `false` in `@neondatabase/serverless`. When `false`, the Neon pg-compat layer serializes `Date` objects using LOCAL time components (via `Iu()` branch in `prepareValue`) when writing to `timestamp without time zone` DB columns. On a US Pacific machine (UTC-7) this stores timestamps +7h ahead of actual UTC. EventStaff `createdAt` was 7h ahead of the correlated outbox `inserted_at`.
**Root cause location:** `node_modules/@neondatabase/serverless/index.js` — `prepareValue` function: `r instanceof Date ? Au.parseInputDatesAsUTC ? Tu(r) : Iu(r)` where `Au.parseInputDatesAsUTC` defaults `!1`.
**Fix:** Added `neonConfig.parseInputDatesAsUTC = true` in BOTH `packages/database/index.ts` AND `packages/database/standalone.ts` (after the existing `neonConfig.poolQueryViaFetch = true` line). This is a process-wide setting; one call covers all queries. **Note:** This also affects reads — Neon will now parse returned `timestamp` (no-tz) values as UTC. If any column was intentionally storing local times (unlikely given the flat-key convention), that would need re-evaluation. All Capsule-Pro DateTime columns store UTC epoch-ms-derived values, so this is safe.

Search: datetime coercion, E_TYPE_DATETIME, parseInputDatesAsUTC, neon driver UTC offset, inheritFromParents Date object, syncFromEvent skip-set, refreshParentContext bug, reaction failure swallowed, manifest-runtime command failed log

## 37. Event board duplicate-assignment fixes + CommandBoardCard metadata IR type finding (2026-06-11)

Root-caused Event Board bug batch (B1a–B1f). App-side: committed staff tokens now keyed by
EventStaff row `id` (branch-leaf.tsx; `EventBoardData.committedStaff` gained `id`); commit pipeline
(`apps/api/lib/event-board/commit-event-board-drafts.ts`) dedupes assign-staff drafts — new
`loadActiveStaff` dep seeds a staffMemberId→rowId map (mirrors getEventBoardData committed filter:
status in assigned/confirmed/checked_in, deletedAt null), pre-assigned or within-batch duplicate
drafts flip to committed pointing at the EXISTING row and are reported in the new
`skippedDuplicates` array on `CommitResult` (commit no longer creates duplicate event_staff rows).
`getOrCreateEventBoard` converges on the oldest board after a governed create (StrictMode race left
an orphan CommandBoard row); mount effect deduped via in-flight-promise ref. Draft creation guarded
server-side (existing draft for same entityId/kind returned as success, no second card) and
client-side (already drafted/committed staff short-circuits). Staff page `handleAssign` was missing
`staffMemberId: selectedEmployee` — EventStaff.assign always failed its guard.

**IR FINDING (for the manifest-source agent):** `CommandBoardCard.create` param `metadata` and
`update` param `newMetadata` are STRING-typed in kitchen.ir.json (`{"name":"string"}`), so governed
writes JSON.stringify the draft envelope and Postgres stores `jsonb_typeof(metadata)='string'`
(double-encoded) — jsonb path queries don't work on those rows. App/api read paths normalize
string-or-object (`normalizeMetadata`) so behavior is correct but the column content is wrong-typed.
Proper fix = change the IR param to a json/object type in manifest/source (NOT a consumer-side hack).
3 legacy string-typed rows exist in dev DB.

Search: event board duplicate staff, skippedDuplicates, loadActiveStaff, committed-token key, CommandBoardCard metadata string jsonb, double-encoded metadata, getOrCreateEventBoard race, StrictMode double create

## 38. Policy alignment, EventStaff unreachable transition, perf, governed data repair (2026-06-11)

Completion of the board-propagation fix batch (§36–§37). Commits f257af45b..9dec7158b.

- **BattleBoardDefaultAccess role gap (FIXED):** Event.create allowed roles
  `staff`/`catering_manager`/`event_manager` that BattleBoard's default policy denied — the
  EventCreated→BattleBoard.create reaction was silently policy-denied for those roles (reaction
  dispatch ignores `reactionResult.success`). Role list is now the union of both policies
  (8 roles, battle-board-rules.manifest:63).
- **EventStaff "unassigned" was unreachable (FIXED):** the `unassign` command + `validStatus`
  constraint + lifecycle comment all referenced `unassigned`, but the transition table omitted
  it → unassign could NEVER succeed. Added as terminal destination from `assigned`/`confirmed`
  (event-staff-rules.manifest:138-141). Same §14 contract-inconsistency class.
- **Governed dev-data repair (ep-square-dust):** `BattleBoard.syncFromEvent` backfilled ALL 32
  boards with NULL parent snapshots (live proof of the §36 refresh fix); duplicate Alex Chen
  `event_staff` row 487e0ecc governed-unassigned (keeper b1b1b60b); orphan race-created
  `command_boards` row 125b0e98 archived. Headless governed execution pattern: one-off
  tsx script building runManifestCommandCore with admin service context (deleted after).
- **CommandBoardCard.metadata json-type verdict (DECISION PENDING):** the IR type system DOES
  support `json` (prisma projection DEFAULT_TYPE_MAPPING maps json→Json; pydantic/dart/graphql
  projections recognize it). Migrating metadata (string→json) requires: source param+property
  type change, app-side raw-object writes (drop JSON.stringify), generated-client regen.
  Until then metadata stays a double-encoded jsonb string scalar; all read paths are tolerant.
- **Event detail perf:** board tab server content now renders only when `?tab=board` (was ~12
  queries on EVERY tab navigation); getEventBoardData 9 sequential RTTs → 2 Promise.all batches;
  getRelatedEvents narrowed (14-field select, take 50); palettes capped (take 200). Deferred:
  staleTimes, 30s clock-interval re-render, React.cache auth dedupe.
- **Neon driver local-time serialization (FIXED, §36 R5):** `parseInputDatesAsUTC = true` in
  packages/database/{index,standalone}.ts. Rows written BEFORE the fix on non-UTC dev machines
  keep their +offset skew (e.g. the two pre-fix event_staff rows); prod (UTC) never skewed.
- **Pre-existing warn-only IR provenance mismatch** (computed vs stored hash) logged by the
  runtime before AND after these recompiles — predates this batch, `requireValidProvenance`
  not set, manifest:ci provenance gates pass. Worth a future look.

## 39. Dev-log error sweep: raw-SQL identifier drift, use-server constants, rewrite shadowing (2026-06-11)

Source: full app+api dev-log triage (10-agent workflow), all fixes DB-probed against live Neon dev.

- **Raw-SQL identifier drift is the dominant bug class (4 of 10 errors).** Three sub-patterns:
  (a) unquoted camelCase ALIASES fold to lowercase — `as createdAt` → result key `createdat`,
  reader gets `undefined` (get-client-ltv.ts: cohort crash + 4 silently-NaN metrics; fix = quote
  aliases + `COUNT(...)::int` to avoid BigInt mixing); (b) camelCase Prisma FIELD names used as
  column names — `pt.tenantId`/`pli.createdAt`/`te.deletedAt` (bottleneck detector, 5 queries;
  fix = snake_case physical names, NOT quoting — these tables have no camelCase columns);
  (c) wrong TABLE name — `tenant_admin.activity_feed` vs physical `tenant_admin."ActivityFeed"`
  (PascalCase @@map; stats route + activity-feed-service), and phantom `tenant_admin.audit_log`
  (real table is `platform.audit_log`).
- **`$queryRawUnsafe` is variadic** — passing the values ARRAY as one arg binds 1 param
  ("bind message supplies 1 parameters"). Spread it: `...(cond ? [a,b,c] : [a,b])`. Found in
  menu-engineering route (logged) AND all 5 bottleneck-detector call sites (latent behind the
  column errors). menu-engineering also interpolated `${locationId}` raw (injection) → `$3::uuid`.
- **prep_tasks has NO completed_at column** — detector avgTime query used it; substituted
  `updated_at` (valid: rows filtered to status='completed'). Also `prep_list_items.station_id`
  is TEXT while `stations.id` is UUID → `s.id = pli.station_id` is `uuid = text` (always errors);
  fixed with `s.id::text = pli.station_id` + added missing `s.tenant_id = pli.tenant_id` scope.
- **apps/app/app/api/settings/audit-log/route.ts DELETED (phantom).** Queried nonexistent
  `tenant_admin.audit_log` with columns no audit table has; returned `{data,pagination}` while the
  only client (audit-log-client.tsx) expects `{entries,...}` — never worked. The working twin is
  apps/api/app/api/settings/audit-log/route.ts (Prisma `database.audit_log` → platform.audit_log);
  the existing `/api/settings/*` rewrite now proxies to it. Same class as the May audit/logs deletion.
- **Next.js rewrite-ordering gotcha (the playground-404 root cause):** afterFiles rewrites run
  AFTER static filesystem routes but BEFORE dynamic ones. The broad `/api/settings/:path*` rewrite
  let `entities/list` (static) work while swallowing `entities/[entityName]` (dynamic) → proxied
  to apps/api → 404. Fix: narrowed to the 3 subtrees apps/api actually serves
  (api-keys/audit-log/rate-limits). RULE: any future dynamic app-local route under a rewritten
  prefix will be silently captured — enumerate subtrees, don't blanket-rewrite. Also noted:
  routes.manifest.json has zero /api/settings/* entries so apiFetch dev validation can't see these.
- **"use server" modules may only export async functions at runtime.** email-workflows actions.ts
  exported TRIGGER_TYPE_LABELS (object) + TRIGGER_TYPE_GROUPS (array) → list-page actions loader
  500 + client imports became server-reference proxies (`.map is not a function` on /new). Fix:
  moved to email-workflows/constants.ts (plain module), imports updated in 3 consumers. Latent
  same-class: marketing/leads/actions.ts LEAD_SOURCES un-exported. Type-only exports are fine.
- **createEvent E_TYPE_DATETIME was deploy/process skew, NOT a coercion gap** — f257af45b
  (v0.12.249 ISO→epoch coercion) is correct (11/11 conformance tests) but main is ~40 commits
  ahead of origin; the 19:12 log came from a pre-fix executor (stale dev process and/or prod API
  via the NEXT_PUBLIC_API_URL split-brain). Hardened senders anyway to epoch ms:
  events/actions.ts (create/update/assignClient) + importer.ts. OPERATIONAL: restart both dev
  servers; push+deploy needed for prod.
- **Integrations page crash:** nowsta/status returns 200 with `lastSync:null` (never-synced or
  unconfigured); client interface lied (non-nullable) so TS missed the unguarded
  `status.lastSync.status`. Fix: `| null` types + optional chaining; `autoSyncInterval ?? "—"`.
- **Multi-location React key warning:** mapped child was a shorthand fragment `<>` with key on the
  INNER TableRow — key must go on the outermost mapped element: `<Fragment key={...}>`.
- **Dead code flagged (no action):** trash/list route's 400-line ENTITY_QUERIES map is unreferenced
  (live path uses Prisma delegates); its ActivityFeed entry queries nonexistent `activity_feeds`
  with a deleted_at column ActivityFeed doesn't have. Cleanup candidate.

## 40. Round-2 sweep: split-brain root cause, contract regressions, RecipeVersion block anti-pattern (2026-06-11)

Triggered by post-restart dev log + vendor-catalog screenshot. 4-agent diagnosis, all high-confidence.

- **SPLIT-BRAIN ROOT CAUSE FOUND AND KILLED:** Infisical dev env injects
  `NEXT_PUBLIC_API_URL=https://capsule-pro-api.vercel.app` as a process env var, which BEATS
  .env.local — every infisical-run app dev process posted governed commands to PROD API + PROD DB
  regardless of the .env.local flip. Yesterday's E_TYPE_DATETIME and tonight's "column version
  does not exist" were both prod executions (prod DB never received migration 20260610055049 —
  deploy.yml has NO migrate step; schema commit c6c72e195 IS on origin/main, so prod's client is
  version-aware while prod's DB is not). Fix: dev:infisical/dev:webpack pin
  `cross-env NEXT_PUBLIC_API_URL=http://localhost:2223` AFTER injection (verified override wins).
  OPEN OPERATIONAL: prod DB needs `db:deploy`; consider a migrate step in deploy.yml.
- **Recipe-cost recalc crash = response-contract regression (26ef0c5de):** POST
  kitchen/recipes/[id]/cost returned the runManifestCommand envelope `{success,result,events}`
  while the client stores it as RecipeCostBreakdown → `recipe.name` undefined crash. Fix: await
  the command, propagate failure, return `manifestSuccessResponse(costData.breakdown)` (same
  shape as GET). RULE: when migrating a route to runManifestCommand, preserve the client's
  response contract — return the domain payload, not the envelope. Client guard hardened
  (`!costData?.recipe`). Latent same-class flagged: update-budgets `affectedEvents` toast drift;
  unwrapManifestResponse in use-recipe-costing.ts matches NO current API shape (dead).
- **Inventory items crash = Task 6.2 adoption regression (7dae4343a):** listInventoryItems was
  pointed at generated `/api/kitchen/inventory/list` (raw camelCase rows, Decimal-as-string, no
  stock_status/total_value, ignores ALL filters) behind an `as unknown as` double cast; page
  reads snake_case + computed fields → toFixed crash for any tenant with ≥1 item (since Jun 8).
  Fix: reverted listInventoryItems + getInventoryItem to bespoke /api/inventory/items[/:id]
  (the listSuppliers escape-hatch convention). RULE: `as unknown as Promise<...>` casts over
  generated-client calls hide contract drift — audit remaining Task 6.2 batch-19 files
  (budgets.ts, shipments.ts) for the same class.
- **Vendor-catalog modal:** supplier dropdown empty because the tenant has zero InventorySupplier
  rows and NO UI exists to create one (procurement/vendors writes the DISJOINT Vendor entity;
  VendorCatalog.supplierId belongsTo InventorySupplier). Fixed: per-field validation message,
  dropdown empty-state, `Number("yyyy-MM-dd")`→NaN effective dates (now epoch ms), UI
  currency/unit lists aligned to IR vocab (validCurrency [USD,EUR,JPY,CAD]; requireUnitOfMeasure
  [each,case,lb,oz,kg,units,cases] — UI offered GBP/g/liter/gallon/box/bag/dozen/pack which the
  runtime always blocks). STRUCTURAL GAP (open): need an InventorySupplier management UI (governed
  inventorySupplierCreate exists in generated client, zero call sites) or Vendor/InventorySupplier
  reconciliation. ALSO UNVERIFIED: create payload passes null for string/int params and omits
  required `tags` — verify against dispatcher before calling the modal done.
- **RecipeVersion entity-level :block anti-pattern (v0.12.58 redux) + ENGINE SWALLOW:**
  validDifficulty/validStatus block constraints re-validate on EVERY mutate; live rows have NULL
  difficulty_level and NO status column (IR↔schema drift, Phase 2b), so EVERY updateCosts was
  silently dropped. Fixed at source: both constraints removed (status enforced by transitions;
  difficulty now a create guard `difficulty == null or (1..5)`), recompiled, manifest:ci green.
  UPSTREAM BUG (open, @angriff36/manifest): runtime-engine executeAction case 'mutate'
  (dist line ~2724) DISCARDS updateInstance's return; blocked updates warn-log but the command
  still returns success:true → HTTP 200 no-op writes. Needs engine fail-loud patch + version
  bump; repo-wide audit afterward (any entity whose live row violates an entity block constraint
  has silent-200 governed updates). Also open: RecipeVersion markPublished/retract/approve are
  persistence NO-OPS (status/publishedAt/approvedAt/approvedBy columns don't exist in live
  schema); markPublished can never pass (ingredientCount has no column); seed-dev.ts writes NULL
  difficulty rows directly.

---

## 41. requiresTenantConnect round 2: ANY other FK relation forces flat writes (FIXED 2026-06-12)

**Symptom:** `Event.create` (AI event setup + any governed event create) failed at the store with
`PrismaClientValidationError: Unknown argument 'clientId'. Did you mean 'client'?` — the
GenericPrismaStore passed `tenant: { connect: { id } }` plus scalar `clientId/locationId/venueId/
venueEntityId`.

**Root cause (completes §35):** a relation-connect selects Prisma's CHECKED create input, which
rejects the scalar FK of EVERY relation on the model — not just composite FKs sharing tenantId.
§35's heuristic (`hasTenantRelation && !otherRelationUsesTenantId`) still flagged Event
(its client/location/venue/venueEntity relations are single-column FKs that don't include
tenantId). Connect-mode is safe ONLY when the tenant relation is the model's SOLE FK-bearing
relation.

**Fix:** `generate-prisma-model-metadata.mjs` now sets `requiresTenantConnect` only when every
`@relation(fields:[…])` list is exactly `[tenantId]`. Regen flipped **20 models to flat writes**
(Event, EventReport, EventBudget, BudgetLineItem, Proposal, InventoryItem, SupplierSyncLog,
PurchaseOrderItem, Shipment, ShipmentItem, BudgetAlert, EventContract, Invoice, PaymentMethod,
Payment, CollectionCase, CollectionAction, CollectionPaymentPlan, EmailWorkflow, Driver) — every
one of these had governed creates broken since v0.12.247 introduced connect-mode. 100 tenant-only-FK
models (PrepList, Menu, CommandBoard, BattleBoard, Client, Recipe, …) keep connect. Verified live
on ep-square-dust: the exact failing payload now creates (row persisted, clientId null) — test row
deleted after.

**Same increment — AI "Missing required args" fixed at source:** the DSL DOES support optional
command params (`optional name: type`, parser.js:817 — keyword BEFORE the name; undocumented in
mintlify). All 18 `Event.create` params (source comment already said "All params are optional")
and `BattleBoard.addDish`/`removeDish` `userId` (unused in command body, audit-only via event
payload) are now `optional`. IR/routes.manifest.json now carry `required: false`, so the
command-board agent loop (`validateStepArgs`) stops demanding clientId/featuredMediaUrl/templateId
and inventing placeholder values (it had fabricated `featuredMediaUrl: "https://example.com/fbkl"`).
Generated client output unchanged. NOTE: `MenuDish.create` was already fixed by §35 (composite
menu/dish FKs → flat) — the AI's "request format was invalid" (generic 4xx mapping in
tool-registry.ts) predates the running server picking up that metadata; retest before chasing.

Regen chain run: manifest:compile + manifest:routes:ir + manifest:generate-metadata +
manifest:client. manifest:ci fully green; api+app typecheck 0; factory tests 16/16,
command-board tests 113/113. Restart the API dev server to pick up the new metadata.

Search: requiresTenantConnect other FK relation, Unknown argument clientId did you mean client,
checked unchecked create input, optional command parameter keyword, Event.create missing required
args, agent loop required false, flat keys 20 models flipped
