# HANDOFF — Full official Manifest generation (2026-06-01)

> Branch: **`manifest/full-official-generation`** (NOT merged, NOT pushed). HEAD `aa9bb0093`.
> Canonical plan: `manifest/task_plan_full_official_generation.md`. Findings: `manifest/notes.md`.
> Docs-first rule + lessons: `manifest/AGENTS.md` top section, `tasks/lessons.md` Lesson 10.

## ONE-LINE STATE
Manifest is now the source of truth for the DB: 189 domain entities authored as business logic +
61 preserved infra = **250-model schema generated FROM IR, valid, dev DB recreated to match**.
Runtime store layer typechecks. Remaining: **965 compile-time typecheck errors** in ~198 app
route/service files (old field shapes vs new IR models) — these do NOT block the app at runtime.

## UPDATE 2026-06-01 (cont.) — business-logic ENRICHMENT track (user directive)
User directive: "define business logic with common sense for a catering company" — author real
command semantics in `.manifest` source; do NOT derive from old route code (aligns w/ constitution
§3/§15). Track chosen: **enrich entity command logic, entity-by-entity**. A sonnet triage classified
all 189 entities RICH/THIN/STUB/BUGGY (invoice/event-budget = the RICH calibration baseline).

- **COMMITTED `e92614d99`** — systematic `deletedAt` bug fix. 50 files / 168 replacements: the broken
  convention `property deletedAt: datetime = now()` (every row born deleted) + guards `== 0`/`> 0`
  (datetime tested as epoch) → aligned to the working nullable convention `deletedAt: datetime` +
  `== null`/`!= null` (api-key/rate-limit/crm-admin/vendor-catalog). proposal-rules was fully bricked
  (every mutation guard `deletedAt == 0` permanently false). Generated schema **byte-identical** → the
  bug was IR/runtime-guard only, NO DB impact. IR 189 ent/760 cmds; no new typecheck errors.
**MIGRATION POLICY (user decision):** during the enrichment sprint, DO NOT run incremental migrations.
Keep source+IR+schema in sync and commit each batch (schema columns run ahead of the baseline; `db:check`
drift is expected/fine pre-merge). Regenerate the SINGLE baseline migration + reset dev DB at the END of
the sprint (dev data expendable). New columns are always added NULLABLE/defaulted → no runtime-store
regressions (count held at 96 across every batch). Pre-existing ~96 runtime store errors in
`prisma-stores/broken-read-*` (store-field-shape class) are SEPARATE and pre-date this work.

**COMMITTED enrichment batches (each: compile→build-live-schema→validate→generate→runtime typecheck 96):**
- `492447c22` Events day-of-ops: EventStaff (assigned→confirmed→checked_in→checked_out + no_show/unassign),
  EventGuest (RSVP + check-in), EventDish (updateQuantity/Course/Notes).
- `6a27839b1` Kitchen: KitchenTask assignee tracking (reassign was a no-op) + dueDate/completedAt fixes;
  kitchen-extended lifecycle-now() fixes (TemperatureProbe/CorrectiveAction/KitchenTaskClaim/PrepListImport)
  + QualityCheck.reinspect.
- `bb9c0b35e` InventoryItem: declared quantityReserved + quantityAvailable computed; baseUnit→unitOfMeasure;
  fixed restock 'mutate unitCost' (was undeclared costPerUnit) — these were runtime-breaking undefined refs.
- `50e2fe2b3` CRM/Sales: proposal lifecycle-timestamp + validUntil(!=null) fixes; lead convertedAt/isConverted
  fixes; Deal enriched THIN→full pipeline (create/assign/updateValue/updateProbability/abandon/reopen).
- `11a530251` Payroll/Finance: PayrollRun pending→processing→approved→paid (+reject), replacing the
  unguarded updateStatus(rawString); PayrollPeriod close/reopen/lock; EmployeeDeduction update/deactivate;
  PurchaseOrder REMOVED blockEditAfterSubmit (block-when-true entity invariant that rejected every
  non-draft state → broke submit/approve/receive); lifecycle now() fixes.
IR now 189 ent / **789 cmds** (was 760).

### ✅ MILESTONE: every triage-flagged CORRECTNESS BUG is resolved or disproven.
- deletedAt, KitchenTask no-op reassign, InventoryItem undeclared props, proposal/lead lifecycle,
  PayrollRun raw status, PO block invariant — all FIXED.
- revenue-recognition `timestamp`: DISPROVEN — used only as command-PARAMETER types (3 spots), never a
  property; all entity columns render as DateTime, nothing dropped. Left as-is (don't fix what isn't broken).

### ✅✅ ENRICHMENT INITIATIVE COMPLETE (2026-06-01)
Every THIN/STUB domain entity enriched + every correctness bug fixed. **IR 189 ent / 952 cmds**
(was 760 → +192). All batches verified compile→build-live-schema→prisma validate→generate→runtime
typecheck **96 (held flat the entire time — every new column was nullable/additive)**.

Domains done (Staffing, Inventory/procurement, Kitchen/recipe/menu, QA, Facilities/logistics,
Finance/CRM, Events) via a 6-agent parallel fan-out + my own batches. Commits: 79908db0a, 11a530251,
50e2fe2b3, bb9c0b35e, 6a27839b1, 492447c22, 0ad727f61 (fan-out), 90bfff24a, ad9a71cfd, 4c9454623, 79bb8840e.

Central DSL fixes applied during integration (lessons for future authoring):
- Reserved command names (compile-error): publish, version, block, unblock, void → renamed.
- `x not in [...]` is INVALID → `not (x in [...])`.
- Intent collisions: one command per canonical intent (no archive+deactivate or activate+reactivate
  on the same entity).
- Entity-level `:block <expr>` is an INVARIANT (fires every command when expr true) → never use it to
  gate a transition; it bricks the lifecycle (removed from PurchaseOrder + Driver).
- datetime is epoch-numbered at runtime; `self.dt > 0`/`== 0` "works" but combined with a `= now()`
  default permanently pins computeds (payment.isRefundable etc.) → use nullable + `== null`/`!= null`.
- Completion/event timestamps must be nullable (no `= now()` default) — only createdAt/updatedAt/issuedAt default.

### ✅ RESOLVED 2026-07-10 — DB baseline regen (historical)
> **2026-07-10:** Superseded. Migration history was fully reconciled with the schema
> (`20260710142245_reconcile_schema_truth` + `20260710153700`), `pnpm db:check` is strict and
> clean, and `db:repair` no longer exists. The ONLY DB workflow doc is
> `docs/database/README.md`. Original text kept below for history.

Schema columns ran AHEAD of the committed baseline migration; `pnpm db:check` showed additive-only
drift. Options considered were (a) baseline regen + destructive reset, or (b) one additive
migration via `pnpm db:dev --create-only`.

### Still-out-of-scope (untouched, appropriately simple): email-template/workflow, sms-automation,
override-audit (audit log), sample-data, command-board/battle-board (internal tools), workflow,
workforce-ai, ai-event-setup. Pre-existing ~96 runtime-store errors in `prisma-stores/broken-read-*`
(store-field-shape / call-site track) remain SEPARATE and untouched.

## ✅ DONE & COMMITTED (11 commits this branch, each verified)
1. `35f5bb7e7` adopt @angriff36/manifest 1.7 engine auto-create; remove create bootstrap.
2. `46a073644` tracked manifest.config.yaml (descriptive; scripts don't read it yet).
3. `3d0d5624c` docs-first discipline (AGENTS.md/lessons) + the full-generation plan.
4. `8b229cf0d` plan correction: gap is store classification, not missing source.
5. `b62c2f55f` ALL 132 entities durable; full IR schema validates (231 number props typed,
   composite FK + id fixes, projection diagnostics 232→0).
6. `49037b90a` HYBRID schema: 132 generated + 61 preserved infra/core (per docs, infra lives
   OUTSIDE the IR). 193 models, valid. `manifest/scripts/build-live-schema.mjs` +
   `manifest/schema-partials/infra-core.prisma`.
7. `63d9b0f49` authored 57 DOMAIN entities (5 cluster files manifest/source/*-extended-rules.manifest)
   + composite `key [tenantId, id]` on all 185 tenant entities + 4 composite-FK relation fixes.
   IR 132→189 entities, 760 commands. 250-model schema valid.
8. `a14dbb388` runtime store layer fixed: `prisma-store.ts` 115→0 errors (stale field names only;
   no source change needed).
9. `5375d874c` mapped all 189 entities into ENTITY_DOMAIN_MAP; regenerated nextjs read routes
   (581→763 files, +182 generated). Superseded hand routes NOT yet deleted.
10. `aa9bb0093` **DB RESET**: archived 92 legacy multi-schema migrations + `0_init`; created ONE
    baseline `prisma/migrations/20260601105352_baseline_ir_generated` from the 250-model schema.
    `migrate status: up to date`. Fixed EmployeeBankAccount generated-column default in the partial.

### Verified facts (re-runnable)
- `pnpm manifest:compile` → 189 entities, 760 commands. `pnpm manifest:try-prisma` → 0 diagnostics.
- `node manifest/scripts/build-live-schema.mjs` → 250 models (189 generated + 61 preserved).
- `pnpm --filter @repo/database exec prisma validate` → "is valid 🚀".
- `pnpm --filter @repo/database generate` → client OK. `migrate status` → up to date.
- DB probe: `account`/`event`/`kitchenTaskClaim` all query (empty fresh DB). The P2021
  "table public.accounts does not exist" RUNTIME crashes are RESOLVED at the root.
- Dev DB = Neon `ep-divine-math-ah5lmxku.../neondb` (single `public` schema now).

## ⬜ REMAINING — 965 typecheck errors / 198 files (the call-site migration)
App route/service files written against OLD table shapes (snake_case columns, renamed/removed fields,
composite-key `where`, type coercions) that differ from the IR-authored entities. COMPILE-TIME ONLY —
the app runs; `next build`/typecheck fails. Breakdown:
- Only ~44 of the erroring files are simple `list`/`[id]` CRUD that GENERATED routes now replace —
  generated versions exist alongside (commit 9) but the **superseded hand routes were NOT deleted**.
- ~151 are BESPOKE routes (nested paths, custom actions, aggregations) needing real migration:
  reads → fix field shapes or route through generated; writes → the singular dispatcher/runtime.
- Top files: accounting/invoices/[id] (28), payroll PrismaPayrollDataSource (28, was 43),
  command-board/simulations/* (~63 across 3), kitchen/iot/readings (24), cateringorder/list (22),
  inventory/audit + stock-levels, staff/performance, procurement/budget.
- Error codes: TS2322(254) TS2339(238) TS2353(147) TS2551(123 "did you mean" renamed) TS18047(55 null).

### RECOMMENDED NEXT STEPS (in order)
1. **Delete-superseded-hand-routes pass**: for each entity with a generated list/[id] route, delete
   the old hand-written CRUD route it replaces (~44). Converts generated routes from additive noise
   into real replacements; drops a chunk of errors. The frontend has ~95 hardcoded /api/<domain>/
   URLs — generated paths were chosen to match domain dirs, but VERIFY callers per route.
2. **Finish payroll datasource** (28) — runtime-adjacent, same store-field-shape class as prisma-store.ts.
3. **Bespoke routes by domain** (subagents per cluster): fix field shapes to the new IR models, or
   convert writes to the dispatcher. Author business logic; do NOT reconcile IR back to old columns.
4. Re-typecheck to 0; then `pnpm --filter api build`; boot app; smoke-test key flows.
5. Phase-out: delete the now-dead bespoke stores per phase-out-registry.md once routes use runtime.

## KEY MECHANICS / GOTCHAS (learned + verified this session)
- **Regenerate after ANY source change**: `pnpm manifest:compile && node manifest/scripts/build-live-schema.mjs && pnpm --filter @repo/database generate`.
- Source PROPERTY types NEVER bare `number` (→ dropped); use int/money/decimal/datetime. datetime
  defaults `= now()` or none (never `=0`). Every entity: `id` + `store X in durable` + (tenant) `key [tenantId, id]`.
- `delete` is RESERVED → use `remove`. Also reserved: read/write/execute/state/field/relation/policy/
  constraint/guard/effect/event/query/all/override.
- Composite-key targets need composite FK rels: `fields [tenantId, x] references [tenantId, id]`.
- Installed `manifest` CLI bin only exposes `nextjs` ("Unknown projection: prisma"). Schema gen uses
  the programmatic `PrismaProjection` API (docs-sanctioned) via build-live-schema.mjs.
- Infra tables (outbox/idempotency/audit/webhooks/integration-sync + tenant/org/auth backbone) live
  in `manifest/schema-partials/infra-core.prisma`, NOT as IR entities (docs: projection has no app coupling).
- Bash tool MANGLES regex backslashes in heredoc/-e scripts (`\\s`→`s`). Write transform scripts as
  `.cjs` FILES with plain-string methods, or use the Write tool.
- DB destructive ops hit a Prisma AI-consent gate: rerun with env
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="<user's exact consent words>"`.
- Old 92 migrations preserved (uncommitted) at `.tmp/migrations-archive/`.
- `.claude/settings.json` (context7 hooks) + `CLAUDE.md` intentionally left uncommitted (user handles).
  Everything else on the branch is committed; working tree otherwise clean.

## DO NOT
- Don't reconcile the IR/schema BACK to the old 226 hand tables — author intent in `.manifest` source
  and regenerate. The old schema is reference-only.
- Don't hand-edit generated routes or schema model blocks — fix source/partial + regenerate.
- Don't bypass the context7 hook for source/code edits — query the docs, then edit.
- Don't push. Don't merge to main without typecheck at 0 + a green build.
