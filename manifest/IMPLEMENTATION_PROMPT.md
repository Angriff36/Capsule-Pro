# Implementation Prompt — Manifest Automation

Copy everything in the fenced block below to direct an agent (or agent team) to begin. It assumes
the agent has repo access at `C:\projects\capsule-pro` and will read the companion files first.

---

```
You are implementing the "Manifest Automation" initiative for Capsule-Pro. The goal is to make the
Prisma schema, runtime stores, and generated route accessors all derive from the Manifest IR using
the projections shipped in @angriff36/manifest@1.0.32 — eliminating ~15,000 LOC of hand-maintained
store code, the hand-authored 224-model schema.prisma, and the naive route-accessor derivation that
currently causes generated-surface drift and breaks `next build`.

MANDATORY FIRST STEP — read, do not skip. All planning files live directly in manifest/ (not nested):
1. manifest/AGENTS.md          (the target architecture: generic command/read routes, IR-driven)
2. manifest/task_plan.md       (phases, decisions, status, the Pilot)
3. manifest/notes.md           (verified findings — the full evidence base, incl. live dry-run §8)
4. manifest/phase-out-registry.md  (what gets deleted, and the exit criteria)
5. docs/architecture/constitution.md          (binding charter — §6, §10, §15, §16, §4a)
6. docs/database/CONTRIBUTING.md + AGENTS.md   (migration workflow, build commands)
Run `pnpm manifest:try-prisma <Entity>` to scope any entity before touching it.
Verify any file:line claim in notes.md against current code before relying on it — it is a
2026-05-30 snapshot.

HARD CONSTRAINTS (constitution + repo rules):
- NEVER hand-edit any file containing "Generated from Manifest IR - DO NOT EDIT". Fix the producer
  (manifest/scripts/generate.mjs or a mapping config) and regenerate.
- NEVER invent Prisma models, table names, or storage accessors. Names flow from IR/source + an
  explicit, reviewed mapping config — not from guesses.
- Migrations ONLY via `pnpm db:dev --create-only --name X`; never hand-author migration SQL; never
  `prisma db push` or `prisma migrate reset`. Verify table names against schema.prisma (@@map is
  inconsistent — see CONTRIBUTING.md).
- Governed WRITES go through the singular dispatcher / RuntimeEngine. Generated GET reads are
  allowed read surfaces. Do not create concrete command routes.
- Work phase-by-phase. Do NOT delete anything from phase-out-registry.md until its replacement is
  proven (generated + typechecked + tested + drift-checked). One retirement per PR.

EXECUTE IN ORDER (update task_plan.md status + phase-out-registry.md after each phase):

PHASE 0 — Pre-flight. The Prisma dry-run harness already exists: `pnpm manifest:try-prisma`
(summary) and `pnpm manifest:try-prisma <Entity> [--full]` (per-entity generated-vs-committed diff)
— USE IT to scope every entity. Build a regen-diff harness for ROUTES too: snapshot current
generated routes, run `pnpm manifest:generate`, and diff. Catalog which of the 92 domain-mapped
entities have: (a) `durable` store + matching Prisma model, (b) drifted-name model (e.g. EventStaff
→ event_staff_assignments), (c) `memory`/no-store but a hand table exists, (d) no table at all.
Output the classification table to manifest/notes.md. KEY FACT (verified, notes.md §8): only 14
entities are `durable` in the IR today, so the projection emits 14 models; the rest need their
source store flipped to `durable` + recompile before they project.

PHASE 0.5 — PILOT (do this before any broad rollout). Prove the full recipe on ONE entity, then the
hard cluster, exactly as specified under "Pilot" in manifest/task_plan.md:
  • Pilot A = Event alone (already durable): close the generated-vs-committed gap via source fields
    + an options bag; verify typecheck + a read/command roundtrip.
  • Pilot B = the full Events cluster: forces the EventStaff naming fix and the no-table
    EventImportWorkflow decision — the patterns that recur everywhere.
Only generalize to other entities after Pilot B passes.

PHASE 1 — Unblock the deploy (smallest correct fix). The nextjs projection emits
`database.<camelCase(entity)>` with no validation. In manifest/scripts/generate.mjs, post-process
generated route bodies to resolve the accessor from the AUTHORITATIVE entity→Prisma-model mapping
already encoded in manifest/runtime/src/prisma-store.ts's provider switch (extract it into a shared
map module — also remove the ENTITY_DOMAIN_MAP triplication). For entities with no Prisma model,
do NOT emit a `database.*` read route; delete the materialized broken file. Specifically resolve:
  - eventStaff -> eventStaffAssignment
  - eventImportWorkflow -> no table: delete events/import-workflows/{list,[id]} routes
  - audit/logs/route.ts (hand-written): delete OR rewrite against the real audit_log model
Then: `pnpm manifest:generate`, `pnpm --filter api typecheck` until GREEN. Show the full regen diff
before committing. Commit. This makes the deploy buildable.

PHASE 2 — Schema projection. Stand up PrismaProjection (import from
@angriff36/manifest/projections/prisma) in a new script manifest/scripts/generate-prisma-schema.mjs.
Call `new PrismaProjection().generate(ir, { surface: "prisma.schema", options })`. Build the
PrismaProjectionOptions config (NESTED Record<Entity,Record<Prop,X>> shape: tableMappings,
columnMappings, typeMappings, precision, indexes, foreignKeys, dbAttributes, fieldAttributes — see
notes.md §3a for the exact interface) that reproduces the CURRENT 224-model schema.prisma exactly.
Diff generated-vs-committed (use try-prisma per entity) until zero meaningful drift. The options
config becomes the single source of entity→DB-shape truth. Do not change the live schema yet — just
prove parity. NOTE: properties typed `number` in source are dropped (PRISMA_AMBIGUOUS_NUMBER) — fix
those source types to money/decimal/int/float as part of this phase.

PHASE 3 — Schema drift gate. Switch schema.prisma model blocks to generated output; keep the
datasource/generator header. Add a CI check (extend manifest/scripts/audit-schema-drift.mjs) that
fails if regeneration diffs from committed. New schema changes now start in .manifest source ->
recompile IR -> regenerate schema -> `db:dev --create-only` -> review -> deploy.

PHASE 4 — Stores. The package ships NO store/repository projection. Choose and build ONE:
  (a) a generic IR-driven store provider that replaces all ~95 *PrismaStore classes + the 3,075-line
      switch with a single metadata-driven implementation, OR
  (b) a Capsule-owned store codegen step under manifest/scripts/.
Prove behavioral parity against the existing stores (port shared.ts coercion helpers). Rewire
manifest-runtime-factory.ts. Then retire prisma-stores/* and prisma-store.ts per the registry.

PHASE 5 — Adjacent projections. Evaluate enabling zod (input validation), react-query (client
hooks), openapi (API docs) projections to retire hand-written equivalents. Only adopt where output
covers real usage.

PHASE 6 — Phase-out. Execute deletions from phase-out-registry.md, one PR each, replacement proven
first. Confirm all Exit Criteria in that file are met.

DELIVERABLES per phase: updated task_plan.md status, regen diffs, green typecheck/build evidence,
and (phases 4-6) the phase-out-registry.md rows moved to DONE. Surface any blocker or ambiguity
against the IR/constitution rather than guessing. Use subagents for multi-file exploration; keep
the main context lean.
```

---

## Notes for the human dispatching this
- **Phase 1 alone unblocks the deploy** and is low-risk; you can stop there and schedule 2–6 later.
- Phases 2–4 are the high-leverage work (retire ~15K LOC) but require care and parity proofs.
- Consider running Phase 4 in a git worktree given its blast radius.
- The two already-committed fixes (`51d6bdca3` bottleneck, `2a9abb9c3` Sentry) are local on `main`
  and **not pushed** — push them (or include in the Phase 1 PR) so the deploy actually picks them up.
- Scope any entity fast with `pnpm manifest:try-prisma <Entity>` before editing its source/options.
