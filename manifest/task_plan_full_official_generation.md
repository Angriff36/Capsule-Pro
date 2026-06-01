# Plan: Full Official Manifest Generation — overwrite hand-authored code with IR-driven output

> **Created 2026-06-01.** Branch-isolated initiative. Goal: drive Capsule-Pro's schema, routes,
> stores, types, and validation from Manifest IR via the OFFICIAL `@angriff36/manifest` projections
> + `manifest build`/`generate` CLI, overwriting hand-authored equivalents. Supersedes the stalled
> additive approach (task_plan.md Phase 2b / notes.md §14).
>
> **DOCS-FIRST IS MANDATORY (see manifest/AGENTS.md top + tasks/lessons.md Lesson 10).** Every phase
> begins by WebFetching the relevant https://manifest-b1e8623f.mintlify.app/ page. Do not reason from
> dist/*.js or greps alone. If unsure whether the official method exists, fetch the doc — it does.

## Goal (success state)
`manifest build` (config-driven) regenerates: (1) the full Prisma schema, (2) all CRUD routes, (3)
types/client, (4) validation — and the app compiles, validates, and runs on that generated output,
with hand-authored schema/stores/routes RETIRED. No remote push until the branch is proven.

## Why this stalled before (the real blocker — confront it first)
notes.md §14 / §15c: the Prisma projection emits ONLY `durable` entities (19 of 132). The other ~207
live Prisma models have NO IR source. A full generate-replaces-hand failed `prisma validate` because
generated models lacked the back-relations the hand models point at, and `number`-typed props error
(`PRISMA_AMBIGUOUS_NUMBER`). **So "100% official generate" is fundamentally an IR-COMPLETION project:
the IR must model every entity (relations both sides, durable stores, real money/int/float types,
@map/@@map/@@schema via options) before the projection can emit a schema that validates and covers
what the 226 hand models cover.** This plan's bulk of effort is IR authoring, not codegen plumbing.

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
- [ ] **Phase 2 — IR completion: types + stores.** WebFetch /language/*. Flip every entity that has a
      real table to `durable`; fix all `number` props → money/decimal/int/float; add missing props the
      hand schema has. Recompile; `manifest:try-prisma` each until no drop diagnostics.
- [ ] **Phase 3 — IR completion: relations.** Model every relation BOTH sides in `.manifest` so the
      Prisma projection emits valid `@relation` + FKs. This is the largest sub-task (the §14 blocker).
- [ ] **Phase 4 — Prisma schema projection → live.** WebFetch /integration/prisma. Build the options
      bag (tableMappings/columnMappings/precision/foreignKeys) + Capsule post-process (@@schema,
      composite @@id) to reproduce/replace the live schema. `prisma validate` GREEN on generated output.
      `prisma generate`. Dev DB reset OK (per user, dev data expendable).
- [ ] **Phase 5 — Routes + stores from IR.** Generate all CRUD routes; wire stores (generic provider
      or per-entity) so all 132 entities persist to real tables (kill the 37 JSON-blob fallbacks).
      Retire hand-written routes/stores per phase-out-registry.md, replacement proven first.
- [ ] **Phase 6 — Replace custom audits with official CLI.** WebFetch /cli/overview. Evaluate
      `manifest doctor`/`audit-governance`/`enforce-surface` vs our custom `audit-*` scripts; adopt
      official where it covers our needs. Add drift gates (generated == committed) to CI.
- [ ] **Phase 7 — Fix downstream.** The hand-written raw-SQL routes (e.g. facilities/work-orders
      `work_order_type` 500) get replaced by generated routes against the generated schema — the whole
      column-drift bug class disappears. Verify app boots + key flows.

## Hard rules
- DOCS FIRST every phase. No push. Dev DB resettable. One retirement per commit, replacement proven.
- Never hand-edit a "Generated from Manifest IR - DO NOT EDIT" file — fix the producer/IR + regen.
- Migrations only via `pnpm db:dev --create-only` (CLAUDE.md DB rules).

## Status
**Phase 0 — not started.** This file created 2026-06-01; about to create the branch.

## Decisions / open questions
1. Domain route tree (95+ frontend URLs) vs flat entity URLs — keep wrapper, migrate FE, or shims?
2. `manifest build` wholesale vs `generate.mjs` wrapper retained for domain remap only.
3. Per-entity bespoke stores vs the generic IR-driven store for the 37 blob entities.
4. Replace custom `audit-*` scripts with official `manifest doctor`/`audit-governance`?
