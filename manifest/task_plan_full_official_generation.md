# Plan: Full Official Manifest Generation — overwrite hand-authored code with IR-driven output

> **Created 2026-06-01.** Branch-isolated initiative. Goal: drive Capsule-Pro's schema, routes,
> stores, types, and validation from Manifest IR via the OFFICIAL `@angriff36/manifest` projections
> + `manifest build`/`generate` CLI, overwriting hand-authored equivalents. Supersedes the stalled
> additive approach (task_plan.md Phase 2b / notes.md §14).
>
> **DOCS-FIRST IS MANDATORY (see manifest/AGENTS.md top + tasks/lessons.md Lesson 10).** Every phase
> begins by WebFetching the relevant https://manifest-b1e8623f.mintlify.app/ page. Do not reason from
> dist/*.js or greps alone. If unsure whether the official method exists, fetch the doc — it does.

## ★ FIRST PRINCIPLE — Manifest is the source of truth (do not violate this)
The `.manifest` source files define what entities/commands/relations/policies SHOULD be. The Prisma
projection GENERATES whatever the database needs FROM that source. The database schema is downstream
OUTPUT, never a target to reproduce.

- The current 226 hand-authored Prisma models / live DB are **LEGACY**. They are REFERENCE-ONLY — used
  solely to spot intent that isn't yet expressed in `.manifest` source. They are NOT a parity target.
- When the generated schema is "missing" something, the fix is ALWAYS to **rewrite/add to the
  `.manifest` files** to express that intent, then regenerate. NEVER reconcile the IR backwards to
  match existing table/column names, and NEVER pair entities to current tables to preserve them.
- Dev data + the current schema are expendable. We regenerate and reset; we do not protect them.
If you find yourself trying to make generated output "match the existing 226 models," STOP — that is
the rejected backwards approach.

## Goal (success state)
`manifest build` (config-driven) regenerates the full Prisma schema, all CRUD routes, types/client,
and validation FROM the `.manifest` source — and the app compiles, validates, and runs on that
generated output, with hand-authored schema/stores/routes RETIRED. No remote push until proven.

## The real shape of the work (corrected — not what prior notes implied)
The classifier buckets the 226 live models as: **A=16** durable→projected today; **B=78** real Manifest
entities with FULL `.manifest` source, just classified `store … in memory` (73 already have a `create`
command); **C=14** real entities missing only a `store` line; **D=118** legacy child/junction/integration
tables (audit_log, task_claims, NowstaConfig, …) with no IR entity.

**So the gap is STORE CLASSIFICATION, not missing source.** 92 entities (B+C) are essentially one
`store … in durable` line away from projecting. The heavy "model every entity from scratch" fear in
prior notes (§14) was wrong for the bulk of them — their source already exists.

The one real authoring task is RELATIONS. The earlier emit stayed additive because, e.g., Event
(durable) → EventBudget relation was DROPPED since EventBudget was memory; the projection only emits a
relation when BOTH sides are durable. Flipping has **cluster effects**: making an entity durable can
require modeling the back-relation on each durable neighbor. That back-relation modeling is just
AUTHORING INTENT IN `.manifest` source (the right thing) — not reconciling to the old DB. Flip clusters
together (e.g. the whole Event cluster), add the relations both sides in source, regenerate.

D (118 legacy tables) are NOT a goal to preserve. If any represents real domain intent, that intent
gets authored as a proper `.manifest` entity; otherwise it's legacy to be dropped. Do not model the IR
around keeping them.

## Official tooling to ADOPT (doc-confirmed; we currently reinvent these)
- `manifest build [src]` — compile+generate in one step, config-driven (the official path).
- `manifest generate <ir> -p prisma -s prisma.schema -o <dir>` — Prisma schema projection
  (integration/prisma): full durable models, relations, `tableMappings`/`columnMappings`/`precision`/
  `foreignKeys`/`fieldAttributes`, `provider` → also emits `prisma.config.ts`.
- `manifest generate <ir> -p nextjs` — routes (+ `--surface types|client` for types/SDK).
- `manifest doctor` / `audit-governance` / `enforce-surface` / `audit-routes` / `scan` /
  `emit registries` — official governance+drift tooling. Capsule has custom `audit-*` scripts that
  likely duplicate these; evaluate replacing them.
- `manifest.config.yaml` is read by `manifest build` (NOT by our current `manifest generate` flag path).

## Known constraints from the docs (do not relearn the hard way)
- Prisma projection: durable-only; `number`→error (use `money`/`decimal`/`int`/`float`); columns are
  camelCase unless `columnMappings` adds `@map`; relations need BOTH sides modeled in IR; `@@schema`
  multi-schema + composite `@@id` are NOT projection-native (Capsule post-process or IR `key[...]`).
- nextjs projection: `output` is a SINGLE flat dir — `appDir/<entity-lowercased>/`. NO per-entity
  domain tree (no config for `kitchen/recipes`). Our `generate.mjs` remap exists ONLY for this, and
  the frontend has 95+ hardcoded `/api/<domain>/` URLs → domain tree is load-bearing. DECISION NEEDED:
  keep the remap wrapper, OR move frontend to flat entity URLs, OR add compat shims.

## Phases (each starts with a WebFetch of the relevant doc)
- [ ] **Phase 0 — Branch + baseline.** New branch. Snapshot current generate output (routes drift
      harness), `prisma validate` on current schema, full typecheck. Record baseline in notes.
- [ ] **Phase 1 — Adopt config-driven generation.** WebFetch /cli/configuration. Write a CORRECT,
      COMPLETE `manifest.config.yaml` (nextjs + prisma projection blocks, all real options). Decide
      `manifest build` vs keep `generate.mjs` wrapper for domain routing. Prove identical route output.
- [ ] **Phase 2 — Store classification + types (the bulk of the gap).** WebFetch /language/*. For the
      B (78) + C (14) entities whose `.manifest` source already exists: set/flip `store … in durable`,
      and fix `number` props → money/decimal/int/float (projection errors on bare number). This alone
      moves ~92 entities into projection. Recompile; `manifest:try-prisma` per entity until no
      PRISMA_SKIPPED/AMBIGUOUS diagnostics. NOT reconciling to old columns — just declaring durable +
      correct types in source.
- [ ] **Phase 3 — Relations, authored in source (cluster by cluster).** WebFetch /integration/prisma
      relations section. Where the projection drops a relation because the target was memory, the fix
      is to author BOTH sides of the relation in `.manifest` source and flip the cluster durable
      together (e.g. Event + EventBudget + EventGuest + … ). Add any genuinely-needed back-relations as
      INTENT in source. This is authoring what the domain SHOULD be, not matching the old DB.
- [ ] **Phase 4 — Generate the schema FROM source → make it live.** WebFetch /integration/prisma.
      Run the Prisma projection (`manifest generate -p prisma` / `manifest build`) to emit the schema
      from IR. Supply only the projection options that express INTENT (provider, precision, intentional
      @map/@@map physical names, @@schema/composite-key post-process). The generated schema is the new
      truth — do NOT diff-to-match the legacy 226 models; only consult them to catch missing intent to
      add to SOURCE. `prisma validate` GREEN on generated output → `prisma generate` → reset/recreate
      dev DB from it (data expendable).
- [ ] **Phase 5 — Routes + stores from IR.** Generate all CRUD routes; wire stores so every durable
      entity persists to its generated table (kill the JSON-blob fallbacks). Retire hand-written
      routes/stores per phase-out-registry.md, replacement proven first. D (118 legacy tables): drop
      unless the underlying intent has been authored as a proper `.manifest` entity.
- [ ] **Phase 6 — Replace custom audits with official CLI.** WebFetch /cli/overview. Evaluate
      `manifest doctor`/`audit-governance`/`enforce-surface` vs our custom `audit-*` scripts; adopt
      official where it covers our needs. Add drift gates (generated == committed) to CI.
- [ ] **Phase 7 — Fix downstream.** The hand-written raw-SQL routes (e.g. facilities/work-orders
      `work_order_type` 500) get replaced by generated routes against the generated schema — the whole
      column-drift bug class disappears. Verify app boots + key flows.
- [ ] **Phase 8 — Native companion / dispatcher / runtime ownership flip (PR #78 / 3.1.3).** NEW 2026-07-04.
      `@angriff36/manifest@3.1.3` ships native GenericPrismaStore, companion modules (`createManifestRuntime`,
      `manifest-response`, database, auth/tenant helpers), native Next.js dispatcher (`externalExecutor` mode),
      and full `RuntimeOptions` (middleware/storeProvider/idempotency/audit/outbox/approvals/transactions/eventBus/
      customBuiltins/tenantGate). Capsule currently runs `emitCompanions:false` + `dispatcher.enabled:false` and
      hand-writes ~2,800 LOC of factory/dispatcher/response/store twins. Work:
        (a) WebFetch mintlify `/extensibility/plugin-api`, `/adapters/custom-stores`, `/integration/nextjs`.
        (b) Migrate the 4 bespoke stores' business logic to `.manifest` source or options module.
        (c) Flip config flags → delete `manifest-runtime-factory.ts`, `apps/api/lib/manifest-runtime.ts`,
            `execute-command.ts`, `manifest-response.ts`, bespoke `prisma-stores/*`, duplicated middleware.
        (d) Keep a thin Capsule options/binding module (Prisma client, auth context, Sentry/log, flags, builtins).
        (e) Amend `constitution.md` §4a canonical-homes table (currently blesses the deleted glue paths).
      Ryan decision gate: `canonical/manifest/runtime-native-ownership/` Q001/Q002/Q003.

## Hard rules
- DOCS FIRST every phase. No push. Dev DB resettable. One retirement per commit, replacement proven.
- Never hand-edit a "Generated from Manifest IR - DO NOT EDIT" file — fix the producer/IR + regen.
- Migrations only via `pnpm db:dev --create-only` (CLAUDE.md DB rules).

## Status
**Phases 2–4 schema-generation MILESTONE HIT 2026-06-01: full IR-derived schema VALIDATES + Prisma
Client generates.** On branch `manifest/full-official-generation`.

### What was done (all source edits + regenerate — NO reconciling to legacy DB)
1. Flipped ALL `store … in memory` → `durable` across `manifest/source/*.manifest` (81 lines).
2. Added `store <Name> in durable` to the 32 entities that had no store line (`.tmp/add-store-lines.cjs`).
3. Typed all 231 `PRISMA_AMBIGUOUS_NUMBER` props in source via heuristic (`.tmp/fix-number-types.cjs`):
   14 datetime (timestamps), 77 int (counts/ids), 74 money (amounts), 66 decimal (rates/measures).
4. Fixed 14 `datetime = <number>` defaults (invalid Prisma `@default(0)` on DateTime) → required=now(),
   optional=no default (`.tmp/fix-datetime-defaults.cjs`).
5. Added missing `id` to `SampleData` (PRISMA_NO_ID_PROPERTY).
6. Fixed `PurchaseOrderItem → PurchaseOrder` belongsTo to composite FK
   `fields [tenantId, purchaseOrderId] references [tenantId, id]` (target has `key [tenantId,id]`;
   single-col ref was invalid). Matched its working `PurchaseRequisitionItem` sibling. Per docs
   /language/entities composite-FK syntax.

### Result (verified)
- `pnpm manifest:compile` → 132 entities, 593 commands. Projection diagnostics: **0** (was 232).
- Full schema emitted FROM IR via `PrismaProjection` (programmatic — installed CLI only supports
  `nextjs`, "Unknown projection: prisma"; emit script `.tmp/emit-schema-full.mjs`, minimal options
  `{provider: postgresql}`, natural entity/property names, NO legacy reconciliation): **132 models**,
  datasource+generator+`prisma.config.ts`, 66KB.
- `prisma validate` → **"is valid 🚀"** (exit 0). `prisma generate` → Client generated (exit 0).
- Only 6 `@relation`s emit (the declared belongsTo/hasMany); the rest use flat string FKs — CONSISTENT
  with Capsule's "no FKs, flat keys" convention (AGENTS.md). Relations are opt-in via source.

### PROMOTION ATTEMPT (2026-06-01): pure 132-model schema drops 118 tables — hybrid is required by docs
Promoted generated schema → live (`.tmp/build-live-schema.cjs`, single-schema, repo generator header).
`prisma validate` ✓, `prisma generate` ✓. But typecheck exploded: **2054 errors / 323 files** because a
PURE 132-model schema DROPS 118 tables the system needs:
- **Runtime infra (4): OutboxEvent, ManifestEntity, ManifestIdempotency, ManifestCommandTelemetry.**
  OutboxEvent alone breaks every command (audit row). **DOCS ARE EXPLICIT (/integration/prisma): infra
  tables must be defined OUTSIDE Manifest entities** — the projection has "no app coupling," no outbox/
  audit/idempotency concept. So these must NOT be authored as IR entities; they stay in a separate
  non-IR schema appendix. Authoring them as entities would contradict official guidance.
- **Core (Account=157 cols!, Location, Tenant, UserPreference)** — tenant/org backbone.
- **~30 snake_case raw/legacy** (audit_log, settings, units, sms_*, status_*, workflow_*).
- **~87 PascalCase**: real domain (Venue, line-items, claims) MIXED with more infra (webhooks,
  Goodshuffle*/Nowsta* integration sync, SentryFixJob, RateLimitEvent).

DECISION (user: author missing tables as .manifest entities) + DOCS reconciliation → **HYBRID by design:**
  - Author the genuine DOMAIN tables (junctions, line-items, Venue/Location-type) as `.manifest` source.
  - KEEP infra/integration/runtime tables (outbox, idempotency, telemetry, webhooks, sync, audit) as a
    SEPARATE non-IR schema partial appended at build time — this is what the docs prescribe, not a hack.
Live schema currently = pure 132 (BROKEN for app). Backup at `.tmp/schema.prisma.pre-regen.bak`.
NEXT: classify all 118 (domain-to-author vs infra-to-preserve), author domain entities by cluster,
build-live-schema appends the infra partial. Rollback always available via the backup.

### Note on CLI: prisma projection not exposed by installed CLI bin
`pnpm exec manifest generate -p prisma` fails ("Unknown projection: prisma (supported: nextjs)") even
though the package ships `projections/prisma`. So schema gen uses the programmatic `PrismaProjection`
API (docs sanction this: "call the projection API programmatically in a build script"). A committed
emit script is needed (the `.tmp` one is scratch). nextjs routes still go via `generate.mjs`.

### RESUME / remaining (Phases 4→5→6)
- [ ] Promote generated schema → live `packages/database/prisma/schema.prisma` (dev DB reset OK).
      Decide @@schema multi-schema placement (projection emits none; current DB uses tenant_* schemas)
      — author via IR or post-process; OR go single-schema for the regenerated DB (data expendable).
- [ ] Commit a real emit script under `manifest/scripts/` (replace `.tmp/emit-schema-full.mjs`).
- [ ] `prisma migrate`/`db push` to recreate dev DB from generated schema; `pnpm --filter api typecheck`.
- [ ] Wire stores so all 132 durable entities persist to real tables; retire JSON-blob fallbacks.
- [ ] Routes: regenerate; retire hand-written where covered.
- [ ] Adopt official `manifest doctor`/audit CLI; add drift gates.

### Framing (unchanged, reaffirmed)
Manifest source is the source of truth; the 226 legacy models are reference-only, never a parity
target. Fix gaps by authoring `.manifest` source + regenerating, never by reconciling IR to existing
tables. (Original plan's parity framing was reversed per user correction.)

## Decisions / open questions
1. Domain route tree (95+ frontend URLs) vs flat entity URLs — keep wrapper, migrate FE, or shims?
   **(SUPERSEDED 2026-07-04: native `routeSegments` config in 3.1.3 owns this; PR #78 commit `d1f2159`.)**
2. `manifest build` wholesale vs `generate.mjs` wrapper retained for domain remap only.
3. Per-entity bespoke stores vs the generic IR-driven store for the 37 blob entities.
   **(SUPERSEDED 2026-07-04: native GenericPrismaStore ships; question is now deletion timing, see
   `canonical/manifest/runtime-native-ownership`.)**
4. Replace custom `audit-*` scripts with official `manifest doctor`/`audit-governance`?
