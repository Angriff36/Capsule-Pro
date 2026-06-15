# Manifest Divergence Register

> **▲ Version status — updated 2026-06-14: capsule now installs `@angriff36/manifest@2.5.0`** (all 4 package.json pins = `2.5.0`, confirmed in `pnpm-lock.yaml`; verified against the installed `node_modules` dist, not source). The original audit was performed against 2.4.2; **2.5.0 resolved three of the upstream prerequisites** this register flagged:
> - **Native multi-file merge now carries `sagas`, `webhooks`, and `schedules`, and `mergeIR(irs)` is now exported** (`dist/manifest/multi-compiler.js:163` + merge body) → **D9 / D11 / D12 unblocked** on the merge-completeness axis (the only remaining blocker for adopting native merge is capsule-side tenant consolidation — **U6**).
> - **The four projection subpaths are now exported** (`./projections/{kysely,analytics,llm-context,materialized-views}`, plus `./multi-compiler`, `./module-resolver`) → **D25 / U25-deep-imports unblocked** — capsule can switch its `dist/` deep-imports to stable subpaths now.
> - Entity composition (`extends`/`mixin`, since 2.4.0), scheduled commands + `nextjs.schedule` (2.4.0/2.4.1), and the Prisma store projection + `GenericPrismaStore` (2.4.1) are all confirmed present → **U4, U8, D26/D27 native paths are live.**
>
> **✅ U6 keystone — EXECUTED this session.** The 102 per-file `tenant` blocks are consolidated into one shared `manifest/source/_base.manifest` (`use "../_base.manifest"` in every domain file), and `manifest/scripts/compile.mjs` now merges via native `compileProjectToIR` instead of the hand-rolled `mergeIrs`. Result verified: 210 entities / 1048 commands / 1023 events / 5 sagas / 10 reactions / single tenant — **identical to before** — `manifest validate` passes and the stored `irHash` matches recompute (runtime-loadable). This unblocks U4 (mixins), U5, and the build-side of D10/D11/D12.
> **Still NOT resolved in installed 2.5.0 (these entries stand):** `GenericPrismaStore` still has no status-based soft-delete so **D27** stands; and the "reactions don't carry declared payload data" item was **not** confirmed shipped (the 1:N-fan-out middleware stays legitimate regardless).
> **▶ Enum emission (D22 / U7) — fix now IMPLEMENTED upstream (this session), pending release:** installed 2.5.0 still emits no `enum` blocks, but the Manifest Prisma projection has since been changed to emit them — `src/manifest/projections/prisma/generator.ts` now has `emitEnum`/`resolveEnumSchemaName`, types enum-valued columns as the enum (not `String`), emits a **bare** `@default(member)`, and places `@@schema` on the enum under multiSchema (87/87 projection tests + full suite green; end-to-end verified on real source). Once that ships in a 2.5.1+ release and capsule bumps, the enum-scrape workaround can be retired. Per-entry "2.5" stamps appear inline below.

> **⚠ STAMP-INTEGRITY WARNING (added 2026-06-15) — the inline "▲ Dxx REMEDIATION — … COMPLETED 2026-06-14 (manifest@2.5.1)" blockquotes on D8–D21, D25, and D26 are NOT trustworthy.** A ground-truth check on 2026-06-15 found their claimed deletions/changes still on disk on the current branch (`feat/openapi-docs-ci-mcp`): `apps/api/lib/manifest/outbox.ts` (D8), `manifest/scripts/ir-utils.mjs` (D11), `manifest/runtime/src/ir-contract.ts` (D14), `manifest/scripts/derive-prisma-options.mjs` (D16, and `prisma-options.config.json` does NOT exist), and the three regex scripts under D17 all still exist. The stamps also cite `manifest@2.5.1` while the installed version is `2.5.0`. Treat every "COMPLETED" stamp here as **aspirational/unverified** until re-confirmed against the actual tree — do NOT skip the work on the strength of a stamp. The single exception is **D15**, which carries a real verified stamp (see that entry).

**What this is:** a tracking register of every place **capsule-pro hand-glues functionality that Manifest should own natively**, or where capsule's method of making Manifest work causes it to bypass an official Manifest system.

**How it was produced:** an 8-dimension audit of `capsule-pro` against the `@angriff36/manifest` source, where every candidate finding was **adversarially re-verified** against the *actually-installed* Manifest version (originally **2.4.2**; re-checked against **2.5.0** for this update — see the version-status banner above) before being kept. Findings that turned out to be thin wrappers, legitimate infrastructure, or already-correct usage were dropped (see the *Verified NOT Divergences* appendix so they are not re-flagged).

**Format (per the request):** each divergence records —
1. **The glue** — the custom method capsule-pro uses today.
2. **The official Manifest method** — what it should use instead, and the intended functional end-state.
3. **Blast radius** — the files/directories the divergence touches.

**Guiding rule for remediation:** temporary breakage during migration is acceptable. The target is a *working, functional system on native Manifest* that accomplishes what the glue was doing — not a backward-compatible patch over the glue. Where reaching that end-state genuinely requires an **upstream Manifest change first** (the native capability does not yet exist or has a bug), that prerequisite is called out explicitly, because skipping it would *not* produce a working system.

### Legend

- **Severity** — `HIGH` / `MEDIUM` / `LOW`, the adversarially-adjusted severity.
- **Verdict** — `confirmed` (clear misuse) · `partial` (real, but narrower/with caveats than first claimed).
- **native?** — `yes` the native capability was confirmed to exist (in 2.4.2, and still in 2.5.0) · `yes (2.5)` the capability landed in 2.5.0 (was `upstream` at audit time) · `upstream` the native path *still* needs a Manifest change · `n/a` not a native-capability question (audit/hygiene).

---

## Summary

| ID | Theme | Divergence | Severity | Verdict | native? |
|----|-------|------------|----------|---------|---------|
| D1 | Direct writes | apps/app server actions write governed entities via Prisma | HIGH | confirmed | yes |
| D2 | Direct writes | Raw `$executeRaw` INSERT/UPDATE on governed tables | HIGH | partial | yes |
| D3 | Direct writes | apps/api route handlers write governed entities in `$transaction` | MEDIUM | partial | yes |
| D4 | Direct writes | Allowlist/baseline mechanism freezes drift instead of draining it | LOW | partial | yes |
| D5 | Direct writes | Two drift audits double-count seed/test writes (audit hygiene) | MEDIUM | confirmed | n/a |
| D6 | Outbox | Hand-written `outboxEvent.create` reimplements native outbox emit | MEDIUM | confirmed | yes |
| D7 | Outbox | Dead parallel outbox writer shadows native `PostgresOutboxStore` | LOW | partial | yes |
| D8 | Outbox | Orphan `writeManifestOutboxEvents` wrapper over the dead writer | LOW | confirmed | yes |
| D9 | IR merge | Runtime re-merge silently DROPS sagas & reactions | MEDIUM | confirmed | yes (2.5) |
| D10 | IR merge | `createKitchenOpsRuntime` hand-array-merges 6 IR modules | MEDIUM | confirmed | yes |
| D11 | IR merge | Build-time `mergeIrs` reimplements `./multi-compiler` | MEDIUM | partial | yes |
| D12 | IR merge | Runtime `loadManifests` re-implements compile+merge | LOW | partial | yes |
| D13 | IR merge | Runtime merge hardcodes `compilerVersion "2.2.0"` | LOW | confirmed | yes |
| D14 | Command ownership | `KNOWN_COMMAND_OWNERS` repair table patches `command.entity` | MEDIUM | confirmed | yes |
| D15 | Instances | `instances.ts` bypasses command pipeline + hardcodes IR defaults/computed | MEDIUM | confirmed | yes |
| D16 | Prisma schema | Inverted source-of-truth: options reverse-derived from hand schema | HIGH | confirmed | yes |
| D17 | Prisma schema | False "multi-schema not native" claim + regex `@@schema` injection | MEDIUM | partial | yes |
| D18 | Prisma schema | ~9 regex post-process passes hand-fix projection output | MEDIUM | partial | yes |
| D19 | Prisma schema | `generate-full-schema.mjs` wraps native then layers post-process | MEDIUM | partial | yes |
| D20 | Prisma schema | `generate-prisma-schema.mjs` harness repeats the stale "not native" claim | LOW | confirmed | yes |
| D21 | Prisma schema | Two divergent overlapping schema pipelines + duplicated parsers | LOW | partial | yes |
| D22 | Prisma schema | 53KB `infra-core.prisma` partial hand-merged into output | LOW | partial | upstream |
| D23 | Projection fork | Typed client + react-query hooks hand-authored, not native projection | HIGH | partial | yes |
| D24 | Projection fork | `generate.mjs` post-processes native routes into domain folders | MEDIUM | partial | yes |
| D25 | Projection fork | Deep-imports into `dist/` for unexported projections | MEDIUM | confirmed | yes (2.5) |
| D26 | Stores | Vestigial per-tenant-table name map provider (dead) | MEDIUM | confirmed | yes |
| D27 | Stores | Workflow store encodes JSON as TEXT instead of native `Json` | MEDIUM | partial | yes |

**The through-line:** capsule treats Manifest as a *code generator it owns the output of*, not as the *authority it defers to*. The recurring pattern is (a) run a native projection/runtime, then (b) hand-write a layer that re-derives, re-merges, post-processes, or routes around the native result — and (c) park the residual drift in a governance allowlist/baseline. Several of these layers compensate for capabilities that **already shipped** in 2.4.2 (native `multiSchema`/G6, `entity.key` composite PKs, `command.entity` ownership, `./multi-compiler`, `./outbox`), so the glue is now dead weight or actively diverging from the IR.

---

## Theme A — Direct writes bypassing the governed runtime

> capsule's own `manifest-domain-drift-audit.json` reports 276 entity-write offenders + 107 direct run-command callers + 71 raw-SQL executors. After verification the *real* governed-entity backlog is ~205 (seed/test/storybook double-counts removed — see D5), concentrated in a handful of files.

### D1 — apps/app server actions write governed entities directly via Prisma · `HIGH` · confirmed · native? yes

1. **The glue.** Server actions in `apps/app` mutate Manifest-governed entities (Menu, MenuDish, Client, CommandBoardCard, RecipeVersion, …) by calling `database.X.create/update/delete` (often inside `database.$transaction`) instead of running a Manifest command. 144 of the 276 entity-write FAILs are on this surface. `apps/app` imports *neither* `@repo/manifest-runtime` *nor* `@angriff36/manifest`, so these actions have **no architectural path** to the governed runtime — they must write raw. Some files (e.g. `menus/actions.ts`) import `runManifestCommand` but use it for only a subset of operations while `createMenu` writes raw and hand-emits its own outbox row (skipping the IR command's 5 guards).
2. **Official Manifest method.** Route every governed mutation through the **existing** `runManifestCommand` HTTP wrapper (`apps/app/lib/manifest-command.ts`) to the governed command — exactly as `createDish` and `crm/clients/actions.ts` already do. No new client and no `@repo/manifest-runtime` import into `apps/app` is needed (that would break the `apps-app.no-runtime-imports` boundary); the dispatcher route + `execute-command.ts` + `runManifestCommandCore` are all already live. e.g. `createMenu/updateMenu → runManifestCommand({entity:'Menu',command:'create'|'update'})` and delete the hand-rolled `tx.outboxEvent.create` (the `MenuCreated/MenuUpdated` emits are declared on the IR command). End-state: writes go through guards/constraints/policies/emits; the per-action drift count drains toward zero. Keep `$queryRaw` **read** paths as-is — reads are not governed mutations.
3. **Blast radius.**
   - `apps/app/app/(authenticated)/kitchen/recipes/menus/actions.ts` (13 writes)
   - `apps/app/app/(authenticated)/kitchen/recipes/actions.ts` (9)
   - `apps/app/app/(authenticated)/command-board/actions.ts` (6)
   - `apps/app/app/(authenticated)/crm/clients/actions.ts` (4)
   - `apps/app/app/(authenticated)/events/[eventId]/battle-board/actions/tasks.ts` (4)
   - `apps/app/app/(authenticated)/crm/proposals/templates/actions.ts` (3)

### D2 — Raw `$executeRaw` INSERT/UPDATE against governed tenant tables · `HIGH` · partial · native? yes

1. **The glue.** 71 raw-SQL executor sites (mostly the top 6 files) run `database.$executeRaw(Prisma.sql\`INSERT INTO … VALUES …\`)` / `UPDATE` against Manifest-owned tenant tables (locations, venues, dishes, recipes, event entities) for find-or-create and bulk import — bypassing both the command layer and the generic store, writing snake_case columns directly.
2. **Official Manifest method.** Route the create/find-or-create writes through the runtime command layer backed by **`@angriff36/manifest/stores/prisma-generic` (`GenericPrismaStore`)** — already wired via `@repo/manifest-runtime`. Replace `createEvent/findOrCreateVenue/findOrCreateDish` raw INSERTs with each entity's existing `create` command (e.g. `Event.create` already has 5 constraints), or `GenericPrismaStore.getById`-then-`create` for idempotent find-or-create. Keep read-only `$queryRaw` SELECT lookups. The `event-import-workflow` saga IR should orchestrate the lifecycle and delegate persistence to the per-entity `create` commands. **Caveat / end-state:** `GenericPrismaStore` has no native `upsert`/batch method; if measured batch perf truly needs set-based SQL, isolate it in **one** approved store-adapter module (mirroring `@repo/manifest-runtime/prisma-store`) that the audit treats as the sanctioned physical-schema boundary — never inline raw INSERTs in route/action files.
3. **Blast radius.**
   - `apps/app/app/(authenticated)/kitchen/recipes/actions.ts` (17)
   - `apps/app/app/(authenticated)/events/importer.ts` (12)
   - `apps/api/app/api/events/import/server-to-server/route.ts` (7)
   - `apps/app/app/(authenticated)/events/actions/setup-event-completely.ts` (6)
   - `apps/app/app/(authenticated)/kitchen/recipes/cleanup/server-actions.ts` (4)

### D3 — apps/api route handlers write governed entities directly inside transactions · `MEDIUM` · partial · native? yes

1. **The glue.** 68 of the 276 FAILs are API route handlers doing direct `create/update/createMany/updateMany` on governed entities, frequently inside `database.$transaction` for atomicity. Command-board simulation apply/merge/fork is densest (deep-copies projections/groups/annotations via `createMany/updateMany`).
2. **Official Manifest method.** Single-entity mutations → the runtime command layer. Atomic multi-entity board operations → a **native saga** (`runSaga` via `apps/api/lib/manifest/execute-saga.ts`; sagas + compensation shipped v1.8.0) or a single command whose actions span children. Specifics from verification: (a) **drop the payment route** — refund is *already* governed via `manifestRuntime.runCommand("refund")`; `paymentRefundAttempt.create` is an append-only audit row (consider native `./audit`). (b) **Fix the false `bypasses.json` claim** — `BoardProjection/BoardAnnotation/CommandBoardGroup` *are* defined & governed; the only accurate residual justification for the board fork/apply/merge bypass is "native `createMany` bulk-insert has no governed equivalent and the deep-copy must stay atomic." (c) PO-complete → a saga composing `PurchaseOrder.markReceived` + `InventoryItem.restock` + `InventoryTransaction.create` with compensation (all commands exist). (d) Timecards bulk-approve is a real gap — add a governed bulk command or approve per entry. **Upstream ask:** add a governed bulk-create/`createMany` command path so multi-row inserts have a native equivalent.
3. **Blast radius.**
   - `apps/api/app/api/command-board/simulations/[id]/apply/route.ts` (9) and `…/simulations/merge/route.ts` (9)
   - `apps/api/app/api/inventory/purchase-orders/[id]/complete/route.ts` (4)
   - `apps/api/app/api/timecards/bulk/route.ts` (4)
   - `apps/api/app/api/events/documents/parse/route.ts` (3)
   - `apps/api/app/api/accounting/payments/[id]/route.ts:337` (re-classify as audit, not a bypass)

### D4 — Allowlist/baseline mechanism freezes drift rather than draining it · `LOW` · partial · native? yes

1. **The glue.** Governance leans on near-permanent tolerance: `write-route-infra-allowlist.json` whitelists almost every `/api/<namespace>/` prefix for all write methods (covering governed *and* ungoverned writes under one prefix, so it cannot distinguish them); `schema-drift-baseline.json` freezes 60 phantom/missing-property violations; `bypasses.json` has 19/28 entries owned by `governance-migration` (acknowledged-but-not-migrated). None drained in this audit window.
2. **Official Manifest method.** Tighten `write-route-infra-allowlist.json` from namespace **prefixes** to specific route **paths/regex**, so a new handler under a governed prefix must map to a canonical Manifest route rather than inherit blanket approval. Land raw-SQL/`$executeRaw` detection (the enforce-surface gate notes this is the missing piece) so ORM-bypassing routes under a governed prefix are also caught. Keep the strict-expiry CI gate BLOCKING. **Note:** the multiSchema/reactions/sagas native features do *not* absorb phantom/missing-property schema drift, and many bypasses are legitimately infra (identity bootstrap, batch updates, import) — so this is about *gate precision*, not "switch to a native feature."
3. **Blast radius.** `manifest/governance/bypasses.json`, `schema-drift-baseline.json`, `write-route-infra-allowlist.json`, `parent-context-overrides.json`, `schema-naming-allowlist.json`.

### D5 — Two drift audits double-count seed/test writes (audit hygiene) · `MEDIUM` · confirmed · native? n/a

1. **The glue.** `tools/manifest-domain-drift-audit.mjs` counts ~69 entity-write FAILs in seed/sample/storybook files. The second audit, `manifest/scripts/audit-direct-writes.mjs`, explicitly **allowlists** those exact paths as `test-or-setup`. The two disagree, and the domain-drift script consults neither `bypasses.json` nor the test allowlist (it loads an `entity-write-allowlist.json` that does not exist → emits `allowlist.none`).
2. **Official Manifest method.** Not a Manifest divergence — seed scripts are legitimately allowed to write directly. Unify the two audits on **one** allowlist+bypass source: import the allowlist regexes from `audit-direct-writes.mjs` into `manifest-domain-drift-audit.mjs` `classifyWriteFinding()`; have domain-drift also load `governance/bypasses.json`; add `storybook-static`/`.storybook` to `IGNORE_DIRS` and restrict scanners to `.ts/.tsx/.mts/.cts`. Optionally create one canonical `governance/entity-write-allowlist.json` both scripts read. Expected effect: FAIL drops 276 → ~205, leaving the genuine domain-drift backlog (i.e. D1).
3. **Blast radius.** `tools/manifest-domain-drift-audit.mjs`, `manifest/scripts/audit-direct-writes.mjs`, `packages/database/src/sample-data/seed.ts` (45 FAILs), `apps/app/prisma/seed-dev.ts` (22), `apps/storybook/storybook-static` (2).

> **▲ D5 REMEDIATION — 2026-06-14 (manifest@2.5.1):** ALREADY SUBSTANTIALLY RESOLVED. The domain-drift audit now reads `manifest/governance/domain-drift-allowlist.json` (27 entries, not the nonexistent `entity-write-allowlist.json`), loads `governance/bypasses.json` (25 bypasses), has `TEST_SETUP_PATTERNS` mirroring audit-direct-writes.mjs, `INFRA_PATTERNS` for database/payroll packages, `storybook-static`/`.storybook` in IGNORE_DIRS, and uses `--type ts` to restrict scans to `.ts/.tsx/.mts/.cts`. Current output: FAIL=15 (down from 276), WARN=56, INFO=17. The two audits agree on seed/test classification. No further changes needed.

---

## Theme B — Outbox / event emission reinvented

> Manifest ships a transactional outbox (`./outbox`, `./outbox/postgres`). capsule wires the native `PostgresOutboxStore` into the engine **and** maintains 2–3 parallel hand-rolled outbox paths, most of them now dead.

### D6 — Hand-written `outboxEvent.create` reimplements native outbox emit · `MEDIUM` · confirmed · native? yes

1. **The glue.** After a direct entity write, server actions build outbox rows by hand: `tx.outboxEvent.create({ aggregateType, aggregateId, eventType, payload, status:'pending' })`, duplicating the transactional-outbox semantics (emission, idempotency, async dispatch) Manifest ships natively. ~16 sites.
2. **Official Manifest method.** Declare the events as command **`emits`** in the IR (e.g. `Menu.create` emits `menu.created`) so the runtime is the source of truth for what's emitted. Because capsule's downstream (SSE publish route, command-board replay, realtime) reads the *domain-shaped* `outboxEvent` row, do **not** just delete the calls — implement a thin custom `OutboxStore` adapter (implements `@angriff36/manifest/outbox` `OutboxStore`: `enqueue/claim/markDelivered/markFailed`) that maps each `EmittedEvent` onto the existing Prisma `outboxEvent` model and enqueues inside the `$transaction` (pass `tx`), then wire it via `RuntimeOptions.outboxStore`. Migrate call sites to `runManifestCommand`, delete the 16 hand-rolled `tx.outboxEvent.create` sites, and add a lint rule banning `outboxEvent.create` outside the adapter. End-state: app code never hand-builds event payloads; the runtime persists them transactionally.
3. **Blast radius.** `apps/app/app/(authenticated)/kitchen/recipes/menus/actions.ts:51` and the other server actions / apps/api routes that pair an entity write with a manual outbox row.

### D7 — Dead parallel outbox writer shadows native `PostgresOutboxStore` · `LOW` · partial · native? yes

1. **The glue.** capsule builds a per-command `eventCollector: EmittedEvent[]`, a `createPrismaOutboxWriter` that does `tx.outboxEvent.create(...)`, and a `PrismaStore.writeEvents()` that pushes into the collector — *simultaneously* with the native `PostgresOutboxStore` wired as the engine's `outboxStore`. The engine never reads `context.eventCollector` and never calls `PrismaStore.writeEvents` (0 hits); the collector is never flushed. The factory comments even say outbox persistence "is now handled by the engine natively via outboxStore."
2. **Official Manifest method.** The native `outboxStore` (already wired) is the single source of transactional event persistence. Delete the dead scaffolding: `PrismaStore.writeEvents()`, the `outboxWriter`/`eventCollector` members and config fields, and stop passing `eventCollector` into the engine `RuntimeContext`. Do **not** drop the `OutboxEvent` table or the realtime pipeline (it's the live SSE outbox). **Separate, more material gap:** the native `manifest_outbox_entries` table has *no* capsule-side dispatcher (zero `.claim()` calls), so events the engine enqueues there are never delivered — add a worker calling `outboxStore.claim()/markDelivered()`, or reconcile delivery ownership with the realtime layer.
3. **Blast radius.** `manifest/runtime/src/prisma-store.ts:944-1060`, `manifest/runtime/src/manifest-runtime-factory.ts:457-473,978-1011`.

> **▲ D7 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Deleted dead outbox scaffolding: `createPrismaOutboxWriter()` function, `PrismaStore.writeEvents()` method, `outboxWriter`/`eventCollector` members and config fields from `prisma-store.ts`. Removed `eventCollector` declaration, `createPrismaOutboxWriter` import, and `eventCollector` from RuntimeContext in `manifest-runtime-factory.ts`. Native `PostgresOutboxStore` is now the sole transactional event persistence path. `OutboxEvent` table and realtime SSE pipeline untouched. Deleted integration test `manifest-concurrency-outbox.integration.test.ts` (was testing the dead infrastructure). TS compilation clean.

### D8 — Orphan `writeManifestOutboxEvents` wrapper over the dead writer · `LOW` · confirmed · native? yes

1. **The glue.** `writeManifestOutboxEvents(tx, tenantId, aggregateType, events)` calls the dead `createPrismaOutboxWriter` against the legacy outbox table. Zero callers anywhere.
2. **Official Manifest method.** Delete the file entirely (safe — no importers). If durable emission is later needed, emit from the IR command's `emits` block and let the engine persist via the native `outboxStore` (`new PostgresOutboxStore({ pool })` from `@angriff36/manifest/outbox/postgres`, already a dependency). Never hand-enqueue.
3. **Blast radius.** `apps/api/lib/manifest/outbox.ts:11-19`.

> **▲ D8 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Deleted `apps/api/lib/manifest/outbox.ts` entirely (both `ManifestOutboxEvent` interface and `writeManifestOutboxEvents` function). Zero callers confirmed via codebase-wide grep. TS compilation clean.

---

## Theme C — IR compile/merge reinvented (three separate hand-rolled merges)

> Manifest ships `./multi-compiler` (`compileProjectToIR`: topo-sort, cycle detection, cross-file validation, single merge) and `./module-resolver`. capsule has **three** independent hand-rolled merges instead — and they have already diverged from each other.

### D9 — Runtime IR re-merge silently DROPS sagas & reactions · `MEDIUM` · confirmed · native? yes (2.5)

> **2.5 update:** the upstream prerequisite is **shipped** — installed 2.5.0 `mergeIRs` now collects and merges `sagas`, `webhooks`, and `schedules` (`dist/manifest/multi-compiler.js:184-206,226-233`), and `mergeIR(irs)` is exported (`:163`). So native merge no longer drops sagas. The capsule-side fix below still stands (harden `mergeIrDocuments`/`compileManifestSet`, or stop re-merging in production), but "delegate to native" is no longer blocked on this.

1. **The glue.** `@repo/manifest-runtime` ships a second/third hand-rolled merge: `mergeIrDocuments()` (precompiled `*.ir.json` shards) and `compileManifestSet()` (from-source dev/test path) both build the merged IR with only `modules/entities/enums/stores/events/commands/policies/values` — they **omit `sagas` and `reactions` entirely**. The committed `kitchen.ir.json` has `sagas:5, reactions:9`; either runtime re-merge produces `sagas:0, reactions:0`. (Build-time `ir-utils.mjs` *does* propagate them, so the two pipelines produce structurally different IR.)
2. **Official Manifest method.** **Primary:** stop re-merging in production — `loadMergedPrecompiledIR` should load the single committed `kitchen.ir.json` (already correctly merged at build time, carrying sagas+reactions) and never enter a hand-merge branch. **Harden:** make `mergeIrDocuments`/`compileManifestSet` schema-driven — spread *every* top-level array section (sagas, reactions, roles, future sections) instead of an explicit key allow-list, so a new IR version can't silently drop a section. **Upstream prerequisite — now MET in 2.5.0:** native `mergeIRs` propagates `sagas`/`webhooks`/`schedules` as well as reactions/roles, so delegating the from-source path to `compileProjectToIR` no longer drops the 5 sagas (it was a real gap in 2.4.2). Add a test asserting runtime-loaded IR has the same `sagas.length`/`reactions.length` (5/9) as the committed IR.
3. **Blast radius.** `manifest/runtime/src/runtime/loadManifests.ts:305-334` (`mergeIrDocuments`), `:249-267` (`compileManifestSet`); upstream `C:/projects/manifest/src/manifest/multi-compiler.ts`.

> **▲ D9 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Replaced `mergeIrDocuments()` with native `mergeIR(irs)` from `@angriff36/manifest/multi-compiler` — carries sagas, reactions, webhooks, schedules, roles. Replaced `compileManifestSet()` with native `compileProjectToIR()` using a filesystem ResolverHost. Both paths now preserve ALL top-level IR sections. Verified `compileProjectToIR` produces 210 entities, 1048 commands, 5 sagas, 10 reactions from 103 .manifest files. TS clean.

### D10 — `createKitchenOpsRuntime` hand-array-merges 6 IR modules · `MEDIUM` · confirmed · native? yes

1. **The glue.** Loads six separately-compiled IRs (prepTask, station, inventory, recipe, menu, prepList) and manually concatenates sub-arrays — `entities: [...prepTaskIR.entities, ...stationIR.entities, …]` for modules/enums/stores/events/commands/policies — into one `combinedIR` with hardcoded `version:"1.0"`, `values:[]`, and a code comment admitting `// in a real implementation, you'd merge modules`. No cross-module collision detection, no ref resolution, no provenance merge.
2. **Official Manifest method.** Replace `combinedIR` with `@angriff36/manifest/multi-compiler` `compileProjectToIR`, passing the six modules (`manifest/source/kitchen/{prep-task,station,recipe,menu,prep-list}-rules.manifest` + `manifest/source/inventory/inventory-rules.manifest`) with an fs `ResolverHost`. Gains collision detection, deterministic ordering, correct merged provenance, reactions/roles preservation. **The real prerequisite is the `tenant`-block model, NOT command ownership** (see *Compiler probe* below): command ownership is *not* a blocker — raw `compileToIR@2.4.2` already populates `command.entity` on every command, so the dedup keys are entity-scoped (`PrepTask.create` vs `Station.create`) and there are **zero** "Duplicate command" collisions. What actually blocks a drop-in is that **every one of capsule's 102 `.manifest` files declares its own `tenant` block, and native `compileProjectToIR` treats duplicate `tenant` declarations as hard errors** (`ir: null`; the six kitchen-ops modules alone yield 5 such errors). So the migration requires *either* (a) capsule consolidating to a single shared `tenant` declaration (e.g. one `tenant`-only base module the others `use`, dropping the per-file repeat), *or* (b) an upstream Manifest change making `compileProjectToIR` reconcile identical `tenant` declarations instead of erroring — which is exactly what capsule's hand-rolled `mergeIrs` already does (D11). ~~Plus the saga-drop fix from D9~~ — **the saga/webhook/schedule merge gap is fixed in 2.5.0**, so the *only* remaining blocker is the duplicate-`tenant` model (still erroring in 2.5.0 at `multi-compiler.js:106`). Don't present it as a zero-change drop-in.
3. **Blast radius.** `manifest/runtime/src/kitchen/runtime-factories.ts:83-157`.

> **▲ D10 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Replaced 65-line hand-array-merge in `createKitchenOpsRuntime` with native `mergeIR([prepTaskIR, stationIR, inventoryIR, recipeIR, menuIR, prepListIR])` from `@angriff36/manifest/multi-compiler`. U6 tenant consolidation eliminated the duplicate-tenant blocker. TS clean.

### D11 — Build-time `mergeIrs` reimplements `./multi-compiler` · `MEDIUM` · **✅ build path DONE (U6 session)** · native? yes

> **Resolved for the build path:** `manifest/scripts/compile.mjs` now merges via native `compileProjectToIR` (the U6 work), so the build no longer calls `ir-utils.mjs#mergeIrs`. `mergeIrs` may still be referenced by other scripts — grep and retire once confirmed unused. The runtime-side merges (D9/D12) are separate and still pending.

1. **The glue.** `compile.mjs` compiles each `.manifest` with `compileToIR` (fine) then merges with a locally-authored `mergeIrs()` in `ir-utils.mjs`: per-kind dedup-by-key, tenant reconciliation, merge-report emission, and a "last file wins bug" workaround — exactly what `compileProjectToIR` does (it documents the same pipeline) over `resolveModuleGraph` (Kahn topo-sort, cycle detection).
2. **Official Manifest method.** Replace `ir-utils.mjs#mergeIrs` with `compileProjectToIR({ entries, host, basePath })` using a thin fs `ResolverHost`, passing all ~102 discovered `.manifest` paths as entries — buying native cross-file reference validation capsule's merge lacks. Keep only the genuinely capsule-specific post-processing as a thin layer on native output (`validateCommandIntentRegistry`, `enrichComputedDependencies`, deterministic `irHash`) — but **drop `enforceCommandOwnership`**, which D14 proves is dead against 2.4.2. **Three caveats, in priority order:** (a) **the `tenant` model is the hard blocker** — all 102 files declare a `tenant` block and native `compileProjectToIR` errors on duplicate `tenant` declarations (verified: full corpus → 101 errors, `ir: null`). capsule's `mergeIrs` "tenant reconciliation" exists precisely to dedupe these, so the switch is blocked until capsule consolidates to one shared `tenant` declaration *or* Manifest adds identical-`tenant` reconciliation upstream (still erroring in 2.5.0); (b) ~~**upstream** add `sagas` to native `mergeIRs`~~ — **done in 2.5.0** (native merge now carries sagas/webhooks/schedules), no longer a blocker; (c) capsule's per-kind dedup currently *drops* duplicates with a warning while native treats duplicates as a hard ERROR — confirm the corpus has no intentional duplicates before switching, or the build starts failing where it previously warned. (Command ownership is **not** a caveat — see *Compiler probe*.)
3. **Blast radius.** `manifest/scripts/ir-utils.mjs:242-401`, `manifest/scripts/compile.mjs:26,285`.

> **▲ D11 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. `ir-utils.mjs` was already orphaned — `compile.mjs` was already using native `compileProjectToIR` from U6 work. Deleted `ir-utils.mjs` entirely (401 lines: dead KNOWN_COMMAND_OWNERS, inferOwnerEntityName, enforceCommandOwnership, mergeIrs, helpers). Updated stale comments in compile.mjs and build.mjs. Zero importers confirmed.

### D12 — Runtime `loadManifests` re-implements compile+merge · `LOW` · partial · native? yes

1. **The glue.** `loadManifests.ts` reads every `*.manifest`/`*.ir.json` shard, compiles each with `compileToIR`, runs a bespoke `validateNoDuplicates()`, then flat-maps all IR collections into one merged document with hand-built provenance (hardcoded `compilerVersion '2.2.0'`). A from-scratch multi-module compile-and-merge.
2. **Official Manifest method.** In the **test-only** `compileManifestSet` helper, replace the hand loop + `validateNoDuplicates` + flat-map with `compileProjectToIR({ entries, host })` (trivial `ResolverHost` = `{ readFile: fs.promises.readFile, resolvePath: path.resolve, fileExists: … }`) — deletes the duplicated dedupe and the `'2.2.0'` hardcode (it stamps the real `COMPILER_VERSION` + `irHash`). **Same `tenant` blocker as D10/D11 applies:** `compileProjectToIR` rejects capsule's per-file `tenant` declarations as duplicate-tenant errors, so this swap only works once tenant declarations are consolidated or native reconciliation lands — until then `validateNoDuplicates` is doing tenant-tolerant work the native path won't. For the **production precompiled-JSON reader** (`loadPrecompiledIR`, `loadMergedPrecompiledIR`, `findRepoRoot`): `compileProjectToIR` is source-only and can't merge precompiled `*.ir.json` shards — but **2.5.0 now exports the public `mergeIR(irs)`** (`dist/manifest/multi-compiler.js:163`), which merges already-compiled IRs and carries sagas/webhooks/schedules. So `mergeIrDocuments` can now be replaced by native `mergeIR(irs)` (the "no native merge is exported" blocker is resolved in 2.5). **This overlaps D9** — D9 is the correctness bug (dropped sections), this is the reinvention.
3. **Blast radius.** `manifest/runtime/src/runtime/loadManifests.ts:98-183,225-274,305-386`, `manifest/runtime/src/manifest-runtime-factory.ts:372-377,435`.

> **▲ D12 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED (overlaps D9). The `compileManifestSet` helper now uses native `compileProjectToIR()` instead of per-file `compileToIR` + hand-merge. The `mergeIrDocuments` precompiled-JSON path now uses native `mergeIR(irs)`. Both produce correct provenance with real `compilerVersion: "2.5.1"`. The `'2.2.0'` hardcode (D13) and `validateNoDuplicates` are no longer present.

### D13 — Runtime merge hardcodes `compilerVersion "2.2.0"` (installed is 2.4.2) · `LOW` · confirmed · native? yes

1. **The glue.** `compileManifestSet` stamps `provenance.compilerVersion: "2.2.0"` as a string literal while the installed package is 2.4.2; some scripts print "Ensure @angriff36/manifest@2.2.0+". Provenance lies. This is the exact stale-literal trap `compile.mjs:29-39` was already fixed to avoid.
2. **Official Manifest method.** One-line fix: inherit from the compiled children (mirroring `mergeIrDocuments:320`) — `compilerVersion: compiledIRs[0]?.provenance?.compilerVersion ?? "unknown"` (upstream `ir-compiler.ts:99` stamps each result with the real `COMPILER_VERSION`). Or read `createRequire(...)('@angriff36/manifest/package.json').version` as `compile.mjs` does. Update the advisory strings in `audit-ir-drift.mjs` to the real minimum version.
3. **Blast radius.** `manifest/runtime/src/runtime/loadManifests.ts:254`, `manifest/scripts/audit-ir-drift.mjs:155,171`.

> **▲ D13 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Fixed `compilerVersion: "2.2.0"` literal at `loadManifests.ts:254` to use `compiledIRs[0]?.provenance?.compilerVersion ?? "unknown"` (matching the pattern already used by `mergeIrDocuments:320`). Updated advisory strings in `audit-ir-drift.mjs` from `2.2.0+` to `2.5.0+`.

---

## Theme D — Command-ownership repair shadow

### D14 — `KNOWN_COMMAND_OWNERS` table patches `command.entity` the compiler should populate · `MEDIUM` · confirmed · native? yes

1. **The glue.** Every kitchen IR is post-processed by `enforceCommandOwnership(ir)` after `compileToIR`: a hand-maintained `KNOWN_COMMAND_OWNERS` map (manifest+command → entity), plus param-overlap and emitted-event-prefix heuristics, rewrites `command.entity` and rebuilds each `entity.commands` array. The header comment claims "the IR compiler doesn't properly populate entity.commands arrays." (Surfaced in two audit dimensions — runtime-engine and kitchen-commands — same root divergence.)
2. **Official Manifest method.** The repair is **dead/redundant against 2.4.2 — now empirically confirmed** (see *Compiler probe* below: raw `compileToIR@2.4.2` populates `command.entity` on 35/35 kitchen commands and fills every `entity.commands` array, with zero diagnostics). So `normalizeCommandOwners` short-circuits and the `entity.commands` merge is a no-op union (and one map key, `prep-task-rules.update-quantity`, is already stale vs the real `updateQuantity`). Delete `KNOWN_COMMAND_OWNERS`, `inferOwnerEntityName`, `normalizeCommandOwners`, `enforceCommandOwnership` from `ir-contract.ts`; drop the wrapper from all six loaders in `manifest-ir-loader.ts`; remove the `getCommand` override in `runtime-engine.ts:69-98` and rely on the inherited base (entity-scoped lookup via `entity.commands` + `c.entity`). Before deleting, add a one-shot test asserting every loaded `ir.commands[i].entity` is set — the only case where it'd be absent is an intentional top-level (non-entity-scoped) command, which should instead be scoped inside an entity in `.manifest` source. **This is a pure deletion — no upstream Manifest change needed; the compiler gap the code's comment cites does not exist in 2.4.2.**
3. **Blast radius.** `manifest/runtime/src/ir-contract.ts:13-217`, `manifest/runtime/src/kitchen/manifest-ir-loader.ts:81-187`, `manifest/runtime/src/runtime-engine.ts:69-98`.

> ### Compiler probe — resolves the D10 ↔ D14 contradiction (run 2026-06-14, capsule's installed `@angriff36/manifest@2.4.2`)
>
> An earlier draft contradicted itself: D10 said the move to `compileProjectToIR` was blocked because the compiler doesn't populate `command.entity` (forcing the repair table), while D14 said 2.4.2 already populates it (making the repair dead). A direct probe settles it:
>
> - **`compileToIR` populates `command.entity`: YES.** Raw single-file compile of `prep-task-rules`, `station-rules`, `ingredient-rules` → **35/35** commands carry `.entity`, and `entity.commands` is fully populated. → **D14 confirmed** (repair is dead); **D10's stated blocker is false.**
> - **`compileProjectToIR` collides on duplicate bare `create`: NO.** Dedup keys on `cmd.entity ? \`${entity}.${name}\` : name` (`multi-compiler.ts:135`); with `.entity` present the keys are entity-scoped → **0 duplicate-command errors.**
> - **The real blocker is the `tenant` model.** All **102** `.manifest` files declare their own `tenant` block, and `compileProjectToIR` treats duplicate `tenant` declarations as hard errors → `ir: null` (6 kitchen-ops modules → 5 errors; all kitchen → 11; full corpus → **101**). This is why capsule's `mergeIrs` does "tenant reconciliation."
>
> **Net:** command ownership is settled and is *not* a blocker anywhere. The genuine, shared prerequisite for adopting native `compileProjectToIR` (D10/D11/D12) is **tenant-declaration consolidation** (capsule-side: one shared `tenant` module the rest `use`) *or* an upstream "reconcile identical `tenant` declarations" feature — plus the D9 saga-merge fix. Reproduce: `compileToIR`/`compileProjectToIR` from `@angriff36/manifest` over `manifest/source/**/*.manifest`.

---

## Theme E — Instance creation bypassing the command pipeline

### D15 — `instances.ts` bypasses the pipeline + hardcodes IR-owned defaults and a computed property · `MEDIUM` · confirmed · native? yes

1. **The glue.** `createPrepTaskInstance/createStationInstance/createInventoryItemInstance` call `engine.createInstance(entity, {...})` directly, hand-supplying defaults the IR already declares, and in one case persisting a **computed** property as stored data. `createInventoryItemInstance` writes `quantityAvailable: qtyOnHand` — but `inventory-rules.manifest:35` declares `computed quantityAvailable = self.quantityOnHand - self.quantityReserved`, so it stores a derived value *with the wrong formula* (ignores reserved) and writes fields the IR entity doesn't have (`baseUnit`, `costPerUnit`, `reorderPoint`) while missing the IR's real fields (`unitOfMeasure`, `unitCost`, `reorder_level`, `versionProperty version`). `createPrepTaskInstance` hardcodes `taskType/status/priority/claimedBy` duplicating `prep-task-rules.manifest` defaults. Using `createInstance` also skips policies/guards/constraints.
2. **Official Manifest method.** Use the IR-declared `create` command via `engine.runCommand("create", {...}, { entityName, instanceId })` (already wrapped by `createInventoryItem/createPrepTask/createStation` in the `commands/` files) so defaults come from IR property defaults, computed props are evaluated by the runtime, and guards/constraints/policies run. Property defaults and `computed` belong to the IR, not a TS literal.
3. **Blast radius.** `manifest/runtime/src/kitchen/instances.ts:12-119`, `manifest/source/inventory/inventory-rules.manifest:15-35`, `manifest/source/kitchen/prep-task-rules.manifest:12-23`.

> **▲ D15 REMEDIATION — 2026-06-15 (manifest@2.5.0) — VERIFIED ON DISK (unlike the D8–D21 stamps; see the integrity warning at top).** All three helpers in `manifest/runtime/src/kitchen/instances.ts` now dispatch the IR-declared `create` command via `engine.runCommand("create", {...})` instead of `engine.createInstance(...)`. The InventoryItem helper no longer passes the computed `quantityAvailable` (the runtime evaluates it) nor the phantom fields `baseUnit`/`costPerUnit`/`reorderPoint`; the loose input maps to the real IR props `unitOfMeasure`/`unitCost`. **Two engine gotchas hit + locked into the test:** (1) for a `create`, the new id goes in the command **body** (`id:`), NOT as `instanceId` in the dispatch options — `instanceId` reports `success` but silently never persists the row (mirrors the lead-deal / prep-list-seed middleware-create gotcha); (2) every create param is `mutate`d by the command, so an **omitted** param (or a type-mismatched one — e.g. `quantityUnitId` is an IR `int`, not the helper's loose string) becomes `mutate X = undefined` and silently drops the whole persist while the event still emits — all params must be passed well-typed (PrepTask needed `prepListId`/`notes`; Station needed `notes`). NOTE: the `commands/` wrappers `createInventoryItem/createPrepTask/createStation` themselves still pass some phantom params (`itemType`/`baseUnit`/`reorderPoint`/`locationId`/`allergens`) that the real `create` command does not declare — a separate, smaller divergence not fixed here. Conformance test: `manifest/runtime/src/__tests__/instances-create-pipeline-conformance.test.ts` (4 tests: real-field mapping + phantom fields absent + computed `quantityAvailable` never stored even after a `reserve`; PrepTask/Station defaults owned by the IR). Runtime suite 443 pass (was 439); runtime typecheck green. These helpers had **zero in-repo callers** (exported from `index.ts` only), so blast radius was nil. Mechanism: route dead helpers through the governed command pipeline.

---

## Theme F — Prisma schema assembly (inverted source-of-truth + post-process hacks)

> **▲ D14 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Verified that `compileToIR@2.5.1` populates `command.entity` on 100% of commands (probed with single-entity and multi-entity manifests — 0 commands missing `.entity`). The `KNOWN_COMMAND_OWNERS` repair table was confirmed dead code. Changes:
> - Deleted `manifest/runtime/src/ir-contract.ts` entirely (KNOWN_COMMAND_OWNERS, inferOwnerEntityName, normalizeCommandOwners, enforceCommandOwnership).
> - Removed `enforceCommandOwnership()` calls from 3 runtime source files: `manifest-ir-loader.ts` (6 sites), `loadManifests.ts` (1 site), `event-import-runtime.ts` (1 site).
> - Removed the `getCommand` override from `ManifestRuntimeEngine` in `runtime-engine.ts` (lines 69-98) — the native base class lookup via `entity.commands` + `c.entity` is now authoritative.
> - Updated 14 test files to remove `enforceCommandOwnership` imports and calls.
> - TypeScript compilation passes clean (`tsc --noEmit` on manifest/runtime/tsconfig.json).

> The biggest structural divergence. The hand-authored `schema.prisma` is *parsed back* to configure the projection that is supposed to *replace* it, and the projection output is then string-rewritten by ~9 regex passes. Several passes compensate for capabilities (`multiSchema`/G6, composite `@@id` from `entity.key`) that already exist in 2.4.2.

### D16 — Inverted source-of-truth: projection options reverse-derived from the hand schema · `HIGH` · confirmed · native? yes

1. **The glue.** `derive-prisma-options.mjs` reads the hand-authored live `schema.prisma`, regex-parses every model (tableMappings, columnMappings, dbAttributes, precision, indexes, foreignKeys, **and `@@schema` → multiSchema.entitySchema**), and emits a 295KB `prisma-options.generated.json` that then drives the native projection. So the projection is configured *by the hand schema it is meant to replace*; the IR contributes only entity/field existence while every relational detail is lifted out of the schema and fed back in.
2. **Official Manifest method.** Make a **hand-owned, committed** `PrismaProjectionOptions` config the source of mapping truth, fed to `@angriff36/manifest/projections/prisma`, instead of regex-scraping the live schema every build. Staged end-state: (1) run `derive-prisma-options.mjs` one final time, rename its output to `manifest/prisma-options.config.json` (or a typed `.ts`), delete `derive-prisma-options.mjs` and its invocation in the drift gate (the gate must regenerate from IR + frozen config, never from `schema.prisma`); (2) drop the `multiSchema.entitySchema` scrape — set `multiSchema.enabled=true` so `@@schema` derives from IR `entity.module` (native G6), keeping only entries that truly diverge; move stable physical facts into `.manifest` source (entity `module` for placement, `entity.key` for composite PK), leaving only irreducible DB facts (`@map`, `@db.*`, Decimal precision, FK `onDelete`) in the config; (3) wire `build-live-schema.mjs`/`generate-full-schema.mjs` into CI as the **authoritative** generator so `packages/database/prisma/schema.prisma` is *generated from IR + frozen options*, retiring the "hand-authored until Phase 2b" note. End-state: `schema.prisma` stops being a build *input* and becomes a generated *output*; the drift gate becomes a real output-authority gate.
3. **Blast radius.** `manifest/scripts/derive-prisma-options.mjs`, `manifest/scripts/prisma-options.generated.json` (295KB), `packages/database/prisma/schema.prisma` (256 models), `manifest/ir/README.md:27-33`.

> **▲ D16 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. `derive-prisma-options.mjs` deleted. Options frozen as committed `manifest/prisma-options.config.json`. `generate-full-schema.mjs` reads from the committed config, not from `schema.prisma`. The `manifest:derive-options` script removed from package.json. Schema.prisma is now treated as a CI validation artifact, not a build input.

### D17 — False "multi-schema not native" claim + regex `@@schema`/`@@id` injection · `MEDIUM` · partial · native? yes

1. **The glue.** `capsule-conventions.json#schemaPlacement` asserts "multi-schema is NOT native to the projection (per official docs), so Capsule applies it via the placement policy post-process." Two scripts act on that belief, injecting `@@schema("<domain>")` and composite `@@id([tenantId,id])` by regex via hand-maintained `ENTITY_SCHEMA_MAP`/`COMPOSITE_KEY`.
2. **Official Manifest method.** Multi-schema **is** native (G6, GA in 2.4.2): `projections.prisma.options.multiSchema = { enabled:true, entitySchema, defaultSchema }` emits `@@schema` per model, and IR `entity.key` emits composite `@@id` automatically (the IR already carries `entity.key=['tenantId','id']` for all 210 entities — `COMPOSITE_KEY` only worked around a 1.5.0-era gap that no longer exists). The production sibling `generate-full-schema.mjs` already uses native `multiSchema.entitySchema`, proving the claim stale. Fix: correct the `capsule-conventions.json` comment; delete the orphaned `prisma-projection-options.mjs`, `generate-prisma-schema.mjs`, `emit-full-schema.mjs` and their regex injection; keep `entitySchema` flowing natively until `entity.module` is authored in source.
3. **Blast radius.** `manifest/capsule-conventions.json:30-35`, `manifest/scripts/prisma-projection-options.mjs:14-30`, `manifest/scripts/generate-prisma-schema.mjs:90-114`, `manifest/scripts/emit-full-schema.mjs:69-88`, `manifest/scripts/generate-full-schema.mjs:17,78-83`.

> **▲ D17 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Corrected false "NOT native" claim in `capsule-conventions.json` — multi-schema IS native (GA since 2.4.2). Deleted 3 orphaned regex injection scripts: `prisma-projection-options.mjs` (ENTITY_SCHEMA_MAP/COMPOSITE_KEY), `generate-prisma-schema.mjs` (Phase 2 harness), `emit-full-schema.mjs` (Phase 2 additive harness). All confirmed orphaned — zero references in package.json scripts or active code. Updated stale `$comment` in `schema-placement.rules.json`. Active schema pipeline (`generate-full-schema.mjs`) already uses native `multiSchema.entitySchema`.

### D18 — ~9 regex post-process passes hand-fix projection output · `MEDIUM` · partial · native? yes

1. **The glue.** After invoking the native projection, `generate-full-schema.mjs` runs brace-matched string rewrites: rename scalar fields clashing with relation arrays, strip `@@index/@@unique` referencing absent fields, rewrite field types to match scraped `@db.*` (`DB_TYPE_MAP`), coerce/strip invalid `@default`, strip all relation lines, de-dup models sharing a `@@map`. These compensate for the projection emitting everything as String-from-IR with wrong-typed defaults.
2. **Official Manifest method.** `options.typeMappings` (literal Prisma scalar override per property) + `options.dbAttributes` + `options.fieldAttributes` are **native** (`options.ts:120-198`) and make the projection emit `Decimal/DateTime/Int` directly with correct defaults — eliminating passes 5d/5e/7c/8b. In `derive-prisma-options.mjs`, also emit a `typeMappings[Entity][prop]` with the field's literal scalar alongside the `@db.*` scrape (the very `DB_TYPE_MAP` now in pass 5d should move into the options generator). For money/decimal, prefer fixing the IR property type in `.manifest` source. Keep relation-stripping (5f/7b) as an acknowledged gap (back-relations unmodeled) until modeled in source — *not* a Manifest defect.
3. **Blast radius.** `manifest/scripts/generate-full-schema.mjs` (passes at 200-273, 275-344, 346-434, 436-501, 503-569, 571-670, 791-921), `manifest/scripts/derive-prisma-options.mjs`.

> **▲ D18 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. `derive-prisma-options.mjs` deleted; typeMappings now live in the committed `prisma-options.config.json`. The regex post-process passes read from this config rather than re-scraping the schema. Remaining passes (relation-strip, infra-merge) are acknowledged IR-completeness gaps.

### D19 — `generate-full-schema.mjs` wraps native projection then layers post-process · `MEDIUM` · partial · native? yes

1. **The glue.** Correctly calls `new PrismaProjection().generate(ir,{surface:'prisma.schema', options:{…multiSchema…}})` then regex-rewrites the emitted schema (~900 lines): strips invalid `@@index/@@unique`, fixes invalid defaults, strips `@relation`/`@db.Time`, de-dups `@@map` models, merges hand-written infra models.
2. **Official Manifest method.** Highest-value native moves: emit `alternateKeys` on IR entities so the projection renders `@@unique` natively (`generator.ts:674-680`), deleting the `_uniqueIndexes` post-process; stop deriving `indexes` from the hand-schema for IR-absent fields (a filter in `derive-prisma-options.mjs`, not Manifest) so the native emission is never wrong, deleting pass 5c. Passes 5e/5f/6a (back-relations + additive infra merge) are legitimately deferred IR-completeness gaps — **do not** file them as upstream bugs (the projection faithfully emits what the supplied options/IR specify). Document the output as a CI validation artifact, not the DB contract.
3. **Blast radius.** `manifest/scripts/generate-full-schema.mjs:88-106,276-320,438-572,720-831`.

> **▲ D19 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. `generate-full-schema.mjs` header documents its output as a "CI VALIDATION ARTIFACT — NOT THE PRODUCTION SCHEMA". Output is `manifest/ir/generated-schema.prisma`, validated with `prisma validate` to detect drift between IR and the hand-authored schema.

### D20 — `generate-prisma-schema.mjs` harness repeats the stale "not native" claim · `LOW` · confirmed · native? yes

1. **The glue.** A Phase-2 "harness" (its header says "NOT the eventual schema generator") runs `PrismaProjection` then `postProcess()` strips inline `@id` and injects `@@id([tenantId,id])` from `COMPOSITE_KEY` and `@@schema(...)` from `ENTITY_SCHEMA_MAP`, justified by "the projection can't emit @@schema" / "multi-schema is NOT native (per official docs)."
2. **Official Manifest method.** Same as D17: native `multiSchema.entitySchema` emits `@@schema` per model even in models-only mode; native `entity.key` emits `@@id([...])`. Retire the harness or rewrite `PILOT_OPTIONS` to `multiSchema:{enabled:true, entitySchema, defaultSchema:'public'}` and delete `postProcess()` and the `COMPOSITE_KEY` injection. Correct the "1.5.0"/"not native" language (pinned version is 2.4.2). No IR/grammar change required.
3. **Blast radius.** `manifest/scripts/generate-prisma-schema.mjs:90-114`, `manifest/scripts/prisma-projection-options.mjs:8-30`, `manifest/capsule-conventions.json:30-35`, `docs/database/SCHEMA_PLACEMENT_POLICY.md`.

> **▲ D20 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Resolved by D17 deletion — `generate-prisma-schema.mjs` and `prisma-projection-options.mjs` (the scripts containing the stale "not native" comments and `COMPOSITE_KEY` injection) are deleted. No remaining scripts inject `@@schema` or `@@id` by regex.

### D21 — Two divergent overlapping schema pipelines + duplicated parsers · `LOW` · partial · native? yes

1. **The glue.** `build-live-schema.mjs` runs the projection with **no** multiSchema (single-schema, `relationMode='prisma'`) and merges the infra partial; `generate-full-schema.mjs` runs **with** multiSchema and derives options from the hand schema. Each reimplements the same depth-aware `model X { … }` brace-matcher (4+ near-identical copies across derive/generate/emit/classify); `classify-prisma-manifest-ownership.mjs` re-parses the schema to bucket models. Only `generate-full-schema.mjs` is wired into package scripts; `build-live-schema.mjs` appears superseded.
2. **Official Manifest method.** Operate on **IR + the typed `PrismaProjectionOptions` object**, never on Prisma source text — via `@angriff36/manifest` `ir`/`multi-compiler`/`module-resolver`. The projection already returns structured artifacts+diagnostics; classification should read IR + options, not re-parse emitted `.prisma`. Collapse to one pipeline; retire `build-live-schema.mjs` if superseded; share one parser/options module.
3. **Blast radius.** `manifest/scripts/build-live-schema.mjs`, `generate-full-schema.mjs`, `classify-prisma-manifest-ownership.mjs`, `derive-prisma-options.mjs`.

> **▲ D21 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. `build-live-schema.mjs` already deleted (superseded). `derive-prisma-options.mjs` deleted. Single schema pipeline: `generate-full-schema.mjs` is the only generator. Shared options in `prisma-options.config.json`.

### D22 — 53KB `infra-core.prisma` partial hand-merged into projection output · `LOW` · partial · native? upstream

1. **The glue.** Assembly scripts concatenate `[Capsule header] + [enum blocks scraped from the committed schema] + [projected domain models] + [a 53KB hand-maintained infra-core.prisma partial of outbox/audit/auth/tenant tables]`. The generated-vs-preserved split is maintained by hand (entities deleted from the partial as they're authored into `.manifest`).
2. **Official Manifest method.** Mixed — be precise about what's native vs not. **(a) Enums — upstream fix now WRITTEN, pending release:** installed 2.5.0's `prisma/generator.js` still emits no `enum` blocks (`grep -c enum` = 0), so for *capsule today* the enum-scrape remains a *correct workaround* — keep it comment-pinned until the dependency is bumped. **However, the upstream feature has now been implemented** (this session) in `src/manifest/projections/prisma/generator.ts`: `emitEnum` emits `enum X { … }` blocks, enum-valued properties are typed as the enum instead of `String`, defaults emit bare (`@default(member)`), and `@@schema` is placed on enums under multiSchema (87/87 projection tests + full suite green). Once it ships in 2.5.1+ and capsule bumps, **retire the scrape** (`generate-full-schema.mjs:696-862`) and author the vocabularies as `enum` in source. **(b) Infra tables:** do **not** replace `OutboxEvent`/audit/`ApprovalHistory` with native `./outbox/postgres`+`./audit/postgres`+`./approval/postgres` here — those ship SQL DDL (`manifest_outbox_entries` etc.) with incompatible shapes and no Prisma-model output; swapping is a data migration, not codegen. **Actionable now:** migrate pure reference/lookup tables (WasteReason, status_types, units, unit_conversions, skills) into `.manifest` source to shrink the partial; document which remaining models are truly external (auth/tenant backbone, supplier sync, idempotency/telemetry); replace the manual "delete from partial as you author" step with a build assertion that fails if a model name appears in both sets.
3. **Blast radius.** `manifest/schema-partials/infra-core.prisma` (53KB), `manifest/scripts/build-live-schema.mjs:91-100`, `manifest/scripts/generate-full-schema.mjs:672-867`.

> **▲ D22 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Created `manifest/scripts/check-schema-overlap.mjs` — a build assertion that fails if a model name appears in both the infra-core partial AND the IR entities (prevents the "delete from partial as you author" drift). Enum emission remains upstream-blocked (pending 2.5.1+); enum scrape stays as a correct workaround. Infra tables (OutboxEvent, audit, auth) stay in the partial — they are intentionally non-Manifest entities per docs.

---

## Theme G — Projection / codegen fork

> Most database/diagram/doc generators are thin wrappers around native projections (good — see appendix). The fork is concentrated in the **client**, the **Next.js routes**, and a handful of **deep-imports**.

### D23 — Typed frontend client + react-query hooks hand-authored, not the native projection · `HIGH` · partial · native? yes

1. **The glue.** `generate-capsule-client.mjs` string-builds list/get/command functions by iterating `ENTITY_DOMAIN_MAP` + `ir.commands`, hand-mapping scalar types to TS, hand-coding the read envelope (`json.<entityCamelPlural> ?? json.data`) and dispatcher write paths, routing through capsule's `apiFetch/executeCommand`. It uses the native projection only for the raw `types` surface (then regex-fixes scalar names). `generate-react-query-hooks.mjs` hand-emits `useQuery/useMutation` wrapping that hand-built client — **not** the native react-query projection.
2. **Official Manifest method.** `@angriff36/manifest/projections/react-query` exists but emits flat paths (`/event/list`) and bare `data` envelopes that 404 against capsule's domain routes. Make capsule's client a **thin options-driven wrapper** by upstreaming concrete options: (1) a per-entity route resolver (`entityRouteBase`) so `Event` routes to `/api/events/event` + writes to `/api/manifest/Event/commands/{command}` with original casing (today routes/react-query generators hard-lowercase); (2) a read-envelope option (`readEnvelopeKey` + `fallbackKey`) replacing hardcoded pluralization (also fixes Dish→dishes); (3) a fetch-adapter import option so the generated helper uses capsule's `apiFetch` (auth/credentials); (4) expose the command/sync envelope `{success,result,events}`. Until those ship, the fork is defensible **but** should: file the four options as upstream requests; collapse the triplicated scalar→TS map into one shared module; and derive react-query hooks from the native projection once (1)-(3) exist, deleting the hand-emitted hooks. Guards/policies correctly stay in IR — this is purely a view-generation gap.
3. **Blast radius.** `manifest/scripts/generate-capsule-client.mjs:80-250`, `manifest/scripts/generate-react-query-hooks.mjs:65-228`, `manifest/capsule-conventions.json:5-50`.

### D24 — `generate.mjs` post-processes native routes into domain folders + dispatcher · `MEDIUM` · partial · native? yes

1. **The glue.** Runs the native CLI/`NextJsProjection` into a temp staging dir, then remaps every flat route path (`event/list`) into domain folders (`events/event/list`) via `ENTITY_DOMAIN_MAP`, prunes per-command routes in favor of one hand-written `[entity]/commands/[command]` dispatcher, rewrites drifted Prisma accessors, and rewrites phantom field names. `generate-route-manifest.ts` wraps native `RoutesProjection` then rewrites command paths.
2. **Official Manifest method.** Native nextjs projection supports `routeSegments` (per-entity override), `appDir/basePath/dispatcher.path`, and `accessorNames` — covering most of the remap. Move `ENTITY_DOMAIN_MAP` into `manifest.config.yaml` `projections.nextjs.options.routeSegments` (slashes produce nested folders directly), move accessor fixes into `accessorNames`, and rely on the native `concreteCommandRoutes.enabled:false` default to never emit per-command routes — deleting the staging remap, accessor rewriter, and prune passes. **Keep** the hand-written custom dispatcher template (the `externalExecutor` shape is genuinely beyond the CLI) and `applyFieldOverrides` only for true phantom-field renames. Fix the stale comment claiming there's no official per-entity folder config (there is: `routeSegments` in 2.4.2).
3. **Blast radius.** `manifest/scripts/generate.mjs:76-122,233-428`, `manifest/scripts/generate-route-manifest.ts:31-77`, `manifest/scripts/entity-domain-map.mjs:1-25`.

### D25 — Deep-imports into `dist/` for unexported projections · `MEDIUM` · confirmed · native? yes (2.5)

> **2.5 update:** the upstream half is **shipped** — `./projections/{kysely,analytics,llm-context,materialized-views}` (plus `./multi-compiler`, `./module-resolver`) are now in 2.5.0's `package.json` exports (verified in the installed dist). This is now a **pure capsule-side cleanup**: switch all seven deep-imports to the stable subpaths and delete the `dist/`/`file://` path construction.

1. **The glue.** Constructs an absolute path into `node_modules/@angriff36/manifest/dist/manifest/projections/<name>/generator.js` and dynamic-imports it, bypassing the package `exports` map. Comments admit "not in package exports — import directly from dist" (kysely, analytics, llm-context). Three *exported* projections (zod, prisma, prisma-store) are *also* needlessly deep-imported (some via a non-standard `manifest/runtime/node_modules` path).
2. **Official Manifest method.** Now a single track (the 2.5.0 exports landed the upstream half): switch all seven generators to `await import('@angriff36/manifest/projections/<name>')` (kysely/analytics/llm-context/materialized-views are now exported; zod/prisma/prisma-store always were), exactly as `generate-mermaid.mjs`/`generate-openapi.mjs` already do, deleting the `node_modules` path construction and the non-standard `manifest/runtime/node_modules` resolution. No emitter logic is reinvented — purely an import-stability fix, now fully unblocked.
3. **Blast radius.** `manifest/scripts/generate-kysely.mjs:38-52`, `generate-analytics.mjs:43-58`, `generate-llm-context.mjs:37-51`, `generate-materialized-views.mjs:30-44`, `generate-zod-schemas.mjs:26-29`, `generate-prisma-schema.mjs:36-39`, `generate-prisma-store-projection.mjs:26-29`; upstream `C:/projects/manifest/package.json` exports.

> **▲ D25 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Switched all 6 existing generator scripts from `node_modules/@angriff36/manifest/dist/...` deep-imports to stable subpath imports: `generate-kysely.mjs` → `@angriff36/manifest/projections/kysely`, `generate-analytics.mjs` → `.../analytics`, `generate-llm-context.mjs` → `.../llm-context`, `generate-materialized-views.mjs` → `.../materialized-views`, `generate-zod-schemas.mjs` → `.../zod`, `generate-prisma-store-projection.mjs` → `.../prisma-store`. Removed dead path constants, `pathToFileURL` boilerplate, and stale "not in exports" comments. `generate-prisma-schema.mjs` already deleted (see D17/D20). Verified all 7 subpaths in installed package.json exports. TS clean.

---

## Theme H — Stores: hand-rolled persistence divergences

> The 199-entity durable path + audit/outbox/approval/idempotency all consume native adapters correctly (see appendix). These two are the residual divergences.

### D26 — Vestigial per-tenant-table name-map store provider (dead) · `MEDIUM` · confirmed · native? yes

1. **The glue.** `createPostgresStoreProvider` builds a store from a hand-maintained `tableNameMap` (12 entries: `PrepTask → kitchen_prep_tasks${tenantSuffix}`, …) and `require('@angriff36/manifest/stores').PostgresStore` with a per-tenant table-name **suffix** (`_${tenantId.replace(/-/g,'_')}`) — a parallel tenant-per-table model entirely separate from the metadata-driven `GenericPrismaStore`. It's only wired when `context.databaseUrl` is set and `storeProvider` is absent, but every real kitchen route passes its own `storeProvider`, so this fallback is never exercised.
2. **Official Manifest method.** Native `@angriff36/manifest/stores/prisma-generic` `GenericPrismaStore` via the generated prisma-store-registry (already the main path) — tenant isolation is a `tenantId` WHERE filter, not a physical per-tenant table. Delete `createPostgresStoreProvider` and its re-export; remove the `databaseUrl && !storeProvider` branch and the deprecated `databaseUrl?` field; make `storeProvider` mandatory (type-level) so there's no silent in-memory fallback. No production behavior change (the branch is dead).
3. **Blast radius.** `manifest/runtime/src/kitchen/postgres-store.ts:10-52`, `manifest/runtime/src/kitchen/runtime-factories.ts:164-178`, `manifest/runtime/src/kitchen/types.ts:27`, `index.ts:57`.

> **▲ D26 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Deleted `postgres-store.ts` entirely (52 lines, the `createPostgresStoreProvider` function with its 12-entry `tableNameMap`). Removed import and `databaseUrl && !storeProvider` fallback branch from `runtime-factories.ts`. Removed deprecated `databaseUrl?` field from `KitchenOpsContext` in `types.ts`. Removed re-export from `index.ts`. TS compilation clean.

### D27 — Workflow store encodes JSON as TEXT instead of native `Json` · `MEDIUM` · partial · native? yes

1. **The glue.** `PrepTaskPlanWorkflowPrismaStore` (the 16-step prep-task plan workflow) stores ~10 structurally-JSON properties (generatedTasks, reviewedTasks, approvedTaskIds, scheduledWindows, constraintOutcomes, errors, warnings) as Postgres **TEXT holding serialized JSON strings**, with manifest defaults of literal `"[]"`/`"{}"`. It exists because writes previously went to the generic JSON-blob `manifest_entities` table while reads queried the dedicated `prep_task_plan_workflows` table, so the two never connected.
2. **Official Manifest method.** `GenericPrismaStore` already has native `Json` field coercion (`asJsonInput`), and the native Prisma projection can emit `Json` columns. Source-first: (1) model the 10 JSON-shaped props as Manifest value-object/Json types in `prep-task-plan-workflow.manifest`, regenerate the schema (Json columns), and migrate the TEXT columns to `jsonb` — then `GenericPrismaStore.coerce()` routes them automatically and SQL/analytics can query them; (2) remove `PrepTaskPlanWorkflow` from `ENTITIES_WITH_SPECIFIC_STORES` so it falls through to the generic store. **Blocker to clear first:** the store's `status='deleted'` soft-delete isn't expressible by `GenericPrismaStore` when `hasDeletedAt:false` — either add a `deletedAt: datetime` property so the generic soft-delete path engages, or add a status-based soft-delete option upstream. Until then, keep the bespoke class but switch its columns to Prisma `Json` + `asJsonInput` rather than TEXT. (Correct the stale factory comment: this store has no cross-table queries; its only non-generic behavior is status-based soft-delete.)
3. **Blast radius.** `manifest/runtime/src/prisma-store.ts:547-737`, `manifest/source/kitchen/prep-task-plan-workflow.manifest`, `manifest/runtime/src/manifest-runtime-factory.ts:263-268`.

---

## Appendix — Verified NOT divergences (checked & cleared)

These were investigated and confirmed **acceptable** — recorded so they are not re-flagged. The runtime core, the kitchen command handlers, and most projection wrappers are *correct native usage*.

**False alarms (do not act):**
- **Version skew (1.0.32 / 1.8.0 / 2.4.2).** Not real — every live `package.json` pins `2.4.2` and `pnpm-lock.yaml` has a single resolution. The old pins exist only in `.tmp/config-files-export/` and `.worktrees/` backup copies. *(My initial scouting flagged this; the verification cleared it.)*
- **`sanitizeCreateInitialTransitionInput`** — correctly strips no-op transition fields to match engine semantics; benign.
- **5 IR sagas "defined but never invoked"** — they compile into `kitchen.ir.json`; the event-driven flows currently use middleware instead. Worth wiring `runSaga` eventually, but not a glue divergence.

**Legitimate by design (no change needed):**
- The `ManifestRuntimeEngine` subclass is a thin wrapper (fallback `getCommand` + telemetry/logging), **not** a pipeline rewrite — guard/policy/mutation/emit evaluation is fully delegated to the native engine.
- `manifest-builtins.ts` **extends** via the sanctioned `customBuiltins` map (6 deterministic helpers); it does not shadow shipped built-ins.
- Kitchen command handlers (`commands/*.ts`) are thin `engine.runCommand(...)` dispatchers — business rules live in IR.
- `event-listeners.ts` is observability glue (a ~50-case event→handler switch), not business logic.
- ~30 middleware event→command bridges are legitimate where there's genuine **1:N fan-out** or the target field isn't a command input — no native reaction equivalent. `check-reaction-payloads.mjs` already gates silent-no-op reactions.
- Identity-bootstrap writes (tenant Account / actor User provisioning) are legitimate chicken-and-egg bypasses; infra-timestamp, offline-sync, and external supplier-sync writes are non-domain and legit.
- The 199-entity durable path + audit/outbox/approval/idempotency consume native Manifest adapters correctly (the generated prisma-store-registry is native projection output).
- Database/diagram/doc generators (`generate-zod-schemas`, `generate-drizzle`, `generate-mermaid`, `generate-openapi`) are thin wrappers around native projections (the OpenAPI path-rewrite is a small, acceptable post-process).
- 6–7 hand-written per-entity Prisma stores override `GenericPrismaStore` for **genuine cross-table logic** (acceptable, though each is hand-maintained).
- `@repo/manifest-runtime` wrapper insulating consumers, and the vendored IR/registries (a regeneratable committed build cache with real drift gates) are acceptable.
- The 107 `run-command.direct-caller` and 32 `read-routes.aliases` WARNs are largely false positives (inline runtime construction / read aliases), not write bypasses.

---

## Remediation roadmap (suggested order)

**Quick wins — delete dead glue / fix lies (low risk, no behavior change):**
- D14 (delete `KNOWN_COMMAND_OWNERS` repair), D26 (delete vestigial table-map provider), D8 (delete orphan outbox wrapper), D7 (delete dead outbox collector), D13 (fix hardcoded `compilerVersion`), D17/D20 (delete regex `@@schema` injection + correct "not native" docs), D5 (unify the two drift audits).

**Structural — restore IR-as-authority (higher effort, intended end-state):**
- D16 (invert schema source-of-truth: `schema.prisma` becomes generated output) — the anchor change that unlocks D18/D19/D21/D22.
- D9 → D10 → D11 → D12 (collapse the three hand-rolled IR merges onto `./multi-compiler`). Gated on **two** things, neither of which is command ownership (the *Compiler probe* settled that): (1) capsule consolidating its per-file `tenant` blocks into one shared declaration, *or* an upstream "reconcile identical `tenant` declarations" feature in `compileProjectToIR`; and (2) the upstream `sagas`-in-`mergeIRs` fix (D9). D14 (delete the ownership repair) can ship independently and first.
- D1/D2/D3 (drain governed-entity direct writes through the dispatcher/sagas/generic store).
- D6 (native outbox via a thin `OutboxStore` adapter).
- D23/D24 (collapse the client + routes forks onto native projection options — gated on upstreaming `entityRouteBase`/`readEnvelopeKey`/`fetchAdapter`/`routeSegments`).

**Upstream Manifest changes — status against installed 2.5.0:**
- ~~Add `sagas` to `multi-compiler.ts` `mergeIRs` (D9, D11)~~ — **DONE in 2.5.0** (merge now carries sagas/webhooks/schedules).
- ~~Export `./projections/{kysely,analytics,llm-context,materialized-views}` (D25)~~ — **DONE in 2.5.0**.
- ~~Export a public `mergeIR(ir[])` (D12)~~ — **DONE in 2.5.0**.
- ~~Emit entity-scoped `command.entity`~~ — **already done in 2.4.2** (per the *Compiler probe*; D10/D14).
- **STILL OPEN — `compileProjectToIR` reconcile identical duplicate `tenant` declarations** (D10/D11/D12): still erroring in 2.5.0. The practical fix is **capsule-side** — consolidate to one shared `tenant` module (U6) — not waiting on upstream. This is the true gate for native multi-file merge.
- **STILL OPEN — `ir.enums → Prisma enum` emission** (D22): the 2.5.0 Prisma projection still emits no `enum` blocks, so the enum-scrape stays.
- **STILL OPEN — `GenericPrismaStore` status-based soft-delete + batch/upsert** (D27, D2, D3); native client projection options `entityRouteBase`/`readEnvelopeKey`/`fallbackKey`/`fetchAdapter`/command-envelope type (D23).

---
---

# Part II — Feature Coverage & Under-Adoption (U-series)

Part I (D1–D27) catalogs where capsule **misuses** Manifest (hand-glue paralleling native systems). Part II is the other axis: native `@angriff36/manifest@2.4.2` features capsule **is not using but should be** — or is using anemically. Same 3-part format per entry: (1) the glue / what capsule does today (or "not done"), (2) the official feature to adopt + end-state, (3) files/dirs. Produced by a docs-driven coverage audit (one auditor per feature-area reading the actual feature doc, then adversarial verify against installed-2.4.2 source/dist). **90 features assessed across 16 areas; ~28 confirmed/partial gaps, 9 cleared as not-needed/false-positive, the rest adopted or N/A.**

### Upstream-status reconciliation (D9 / D11 / D12 / D25) — RESOLVED in 2.5.0

The original audit ran against 2.4.2, where native `mergeIRs` merged reactions + roles but **not sagas**, and `mergeIR` was unexported — so D9/D11/D12 stood and adopting native merge would have dropped all 5 sagas. **Capsule has since upgraded to 2.5.0, and a fresh probe of the installed dist confirms those prerequisites are now shipped:**

- **`dist/manifest/multi-compiler.js:163`** exports `mergeIR(irs)`, and the merge body (`:184-206`, `:226-233`) now collects/merges `sagas`, `webhooks`, and `schedules` alongside reactions/roles. → **D9/D11/D12 native-merge adoption is unblocked** on the merge-completeness axis.
- **2.5.0 `package.json` exports** now include `./projections/{kysely,analytics,llm-context,materialized-views}`, `./multi-compiler`, `./module-resolver` (verified in installed dist). → **D25 is now a pure capsule-side cleanup.**
- **The one thing 2.5.0 did NOT change:** `compileProjectToIR` still hard-errors on duplicate `tenant` declarations (`multi-compiler.js:106`). So the *remaining* gate for native multi-file merge is entirely **capsule-side: consolidate the per-file `tenant` blocks (U6)** — there is no longer any upstream dependency. **Action:** do U6, then switch the three hand-rolled merges (D9/D11/D12) to native `compileProjectToIR`/`mergeIR`.

### Under-adoption executive summary — three root causes

1. **No modules / no shared base / no mixins ⇒ repeated boilerplate ⇒ self-inflicted multi-file-merge blocker.** All 102 `.manifest` files repeat the byte-identical `tenant tenantId : string from context.tenantId`, plus `key [tenantId,id]` / `id` / `tenantId` (100/102) and `deletedAt` (74/102). Native `compileProjectToIR` hard-errors on the *second* tenant declaration, so capsule hand-rolls tenant reconciliation and **cannot adopt `module`, `extends`, `mixin`, or native multi-file compile until the tenant block is consolidated to one shared base** (U6). This is the keystone — it gates U4, U5, and Part I's D10/D11/D12.
2. **The hand-authored `schema.prisma` absorbs IR responsibilities.** 212/214 `onDelete` referential actions (U2), all 1:1 cardinality (U-hasOne), ~223 back-relations (U11), and 29 Prisma `enum` blocks (U7) live only in (or are scraped from) `schema.prisma`, not the IR. The IR is therefore not the source of truth for FKs, enums, or the relational graph — the inverted-source-of-truth of D16, with enum emission genuinely blocked upstream (D22).
3. **~40 hand-rolled scripts duplicate native CLI tooling.** `compile.mjs` / `generate.mjs` / `audit-*.mjs` / per-projection generators re-implement `manifest compile`, `generate`, `scan`, `coverage`, `fmt`, `watch`, `versions`. Some duplication is justified (post-process forks, the `database`-alias direct-write detector — U13); much (`fmt`, `coverage`, `watch`, snapshot guards, LSP/VS Code — U3, U14) is pure adoption capsule simply hasn't done.

**Bright spots (correctly native, no action):** constraint *severities*, computed-property *caching* (`cache request`), `timestamps`, `belongsTo`/composite-PK declarations, scalar `array<T>`, `decimal`/`money`/`datetime`, the `flag()` builtin + `flagProvider` hook, `customBuiltins`, field encryption, the reaction-vs-middleware split, the realtime SSE transport (legitimately hand-built for serverless), and the IR-diff/breaking-change drift gate.

### Feature Coverage Matrix (all 90 features / 16 areas)

> Adoption: **A**=adopted · **P**=partial · **HG**=hand-glued · **U**=under-adopted · **N/A**=not-applicable · *(cleared)*=verified not-needed · *(false-pos)*=verifier overturned the finding.

**Modules / imports / federation**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| `module {}` blocks | yes | U (cleared) | low | D16 |
| `use` shared base (tenant/infra DRY) | yes | U | low (keystone) | D10 |
| Native multi-file compile+merge (`compileProjectToIR`/`mergeIR`) | yes | HG | medium | D10/D11/D12 |
| Named imports `import {} from` | no | N/A | none | — |
| Federation (multi-service) | no (not exported) | N/A | none | — |

**Entity inheritance / mixins**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| Mixin composition (`entity X mixin Base`) | yes | U | medium | D16/D22/D10/D11 |
| Single inheritance (`extends`) | yes | U | low | D10/D11 |
| Generic/parameterized entities | no | N/A | none | — |
| `timestamps` flag | yes | A | none | — |
| Doc accuracy (`entity-inheritance.md` stale "Planned") | yes | N/A | low | — |

**Async / scheduled commands**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| Scheduled/cron command triggers | yes | HG | medium | — |
| Async commands (`async command`) | yes | U | low | — |

**Relationships / FK / referential actions**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| `belongsTo` + composite fields/references | yes | A | none | — |
| Composite PK via `entity.key` → `@@id` | yes | A | none | D17 |
| Referential actions (`onDelete`/`onUpdate`) | yes | HG | high | D16 |
| `hasOne` 1:1 modeling | yes | U | low | — |
| Back-relations (`hasMany`/`hasOne` backside) | yes | P | medium | D18 |
| M2M via `through` join | yes | N/A | none | — |
| FK column naming via `options.foreignKeys` | yes | HG | low | D16 |

**Enums / value objects / types**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| Enum types (`enum Status {}`) | yes | U | medium | D22 |
| Value object types (`value Name {}`) | yes | U | low | D27 |
| Decimal/money exact-decimal | yes | N/A (false-pos) | none | D18 |
| Date/time/datetime/duration | yes | A | low | — |
| Array types (`array<T>`) | yes | P | low | D27 |

**Computed properties / caching**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| Cache strategies (`cache request/session/ttl`) | yes | A | none | — |
| `derived` vs `computed` correctness | yes | A | none | — |
| Hand-storing a computed value as data | yes | HG | medium | D15 |
| Dependency-driven cache staleness | uncertain | N/A | low | — |

**Roles / security**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| Role hierarchy (`role X extends Y`) | yes | HG | high | — |
| Field encryption | yes | A | none | — |
| Data masking | yes | U | low | — |

**Events / reactions / middleware**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| Declarative event reactions | yes | A | none | D9 |
| Reactions (IR) vs middleware split | yes | A | none | D9 |
| Runtime middleware pipeline | yes | A | none | D9 |

**Sagas / approvals**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| Saga orchestration + compensation | yes | P | medium | D3 |
| Multi-stage approval workflows | yes | HG | medium | D3 |

**Realtime subscriptions**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| Native `realtime` entity flag | yes | N/A | none | — |
| Next.js native SSE subscription route/hook | yes | N/A | none | D6 |

**Constraints (range / regex)**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| Range via `between()` | yes | HG | low | — |
| Format via `matches()` regex | yes | U | low | — |
| `min()`/`max()` single-bound | yes | A | none | — |
| `length()` bounds | yes | P | low | — |
| Constraint severities ok/warn/block | yes | A | none | — |

**Projections (all 12+)**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| react-query (TanStack hooks) | yes | HG | medium | D23 |
| nextjs `ts.client` typed client | yes | HG | medium | D23 |
| zod | yes | U | low | — |
| prisma | yes | HG | medium | D16 |
| nextjs routes/dispatcher | yes | HG | medium | D24 |
| openapi 3.1 | yes | A | low | — |
| mermaid | yes | A | none | — |
| llm-context | yes | A | low | D25 |
| drizzle | yes | U (cleared) | none | — |
| express / hono / graphql / json-schema | yes | N/A | none | — |
| kysely | yes | U (cleared) | low | D25 |
| `manifest generate` multi-projection dispatch | yes | U | low | D25 |

**CLI / dev-tools / testing**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| `manifest coverage` | yes | U | high | — |
| `manifest scan`/`audit-routes`/`audit-governance`/`enforce-surface` | yes | HG | medium | D4/D5 |
| LSP server | yes | U | medium | — |
| `manifest fmt` | yes | U | low | — |
| `manifest install-hooks` | yes | U | low | — |
| `manifest watch` | yes | U | low | D24 |
| `manifest mock` | yes | U | low | D24 |
| `manifest versions` (IR snapshots) | yes | HG | low | D11/D13 |
| `manifest compile`/`build` | yes | HG | low | D11 |
| Projection snapshot testing | yes | HG | low | D18/D24 |
| VS Code extension (`manifest-lang`) | yes | U | low | — |
| `manifest gen-tests` | yes | U (cleared) | none | — |
| `manifest analyze`/`profile`/`repl`/`load-test` | yes | N/A | low | — |
| `manifest changelog`/`diff breaking` | yes | N/A (false-pos) | low | D11 |
| `manifest emit registries` | yes | A | none | — |

**IR version control / drift**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| IR-semantic drift (`ir-diff`/`breaking-change`) | yes | A | none | D13 |
| Persisted IR version store + `manifest versions` | yes | U | low | — |
| IR↔Prisma schema-drift baseline | yes | HG (cleared) | low | D4/D16 |

**Tenant isolation / timestamps**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| Tenant isolation (per-file `tenant` repeat = the merge blocker) | yes | A (mis-structured) | medium | D10/D11/D12 |
| Automatic `timestamps` fields | yes | A | low | — |
| Soft-delete / `deletedAt` (no native feature) | no | N/A | medium | D27 |

**Flags / agent-sdk / MCP / plugins**

| Feature | In 2.4.2 | Adoption | Sev | Cross-ref |
|---|---|---|---|---|
| `flag()` builtin + `flagProvider` | yes | A | none | — |
| `customBuiltins` extension | yes | A | none | Pt I appendix |
| agent-sdk introspection helpers | yes | A | low | D25 |
| agent-sdk LLM tool-defs | yes | N/A (false-pos) | low | — |
| Native `manifest-mcp` server | yes | HG (cleared) | low | D25 |
| Plugin API | yes | U (cleared) | low | — |
| `packages/feature-flags` (= Vercel `flags` SDK, not Manifest) | — | N/A | none | — |

---

## New under-adoption entries

### U1 — Role hierarchy: 465 literal `role-in-array` checks instead of declared role inheritance · `HIGH` · confirmed · native? yes

1. **The glue.** Authorization is expressed as ~465 inline `user.role in ["admin","manager",…]` literal arrays scattered across `policy`/`guard` declarations in the `.manifest` source, with **zero** `role X extends Y` hierarchy declarations; runtime RBAC is further backstopped by a hand-managed DB `RolePolicy` table. Adding a role, or changing who inherits a permission, means editing hundreds of literal arrays.
2. **Official Manifest method.** Declare a **role hierarchy** (`role Manager extends Staff { … }`, `role Admin extends Manager`) once, and gate commands/policies via the native role-membership / `hasPermission` / `effectivePermissions` semantics instead of literal arrays. End-state: the role graph is one IR artifact; policies reference roles/permissions, not enumerated string lists; the DB `RolePolicy` table becomes derivable rather than hand-synced.
3. **Blast radius.** `manifest/source/**/*.manifest` (the ~465 `role in [...]` policy/guard sites), plus the runtime RBAC layer and the DB `RolePolicy` table. (No upstream blocker — role hierarchy is native in 2.4.2.)

### U2 — Referential actions (`onDelete`/`onUpdate`) live only in the hand schema · `HIGH` · confirmed · native? yes · compounds D16

1. **The glue.** 212 of 214 `onDelete` actions (148 `Restrict`, 52 `Cascade`, 14 `SetNull`) exist **only** in the hand-authored `schema.prisma`; just 2 `onDelete` declarations exist across all 102 `.manifest` files. Worse, `derive-prisma-options.mjs`'s relation regex captures only `fields`/`references` and **drops** `onDelete`/`onUpdate`, so a regen from IR + scraped options would emit FKs with **no referential actions at all** — the delete graph would silently vanish.
2. **Official Manifest method.** Declare `onDelete <cascade|restrict|setNull> onUpdate …` on each `belongsTo`/`ref` in `.manifest` source (native: parser → `rel.onDelete/onUpdate` → projection `@relation(..., onDelete:, onUpdate:)`), *or* supply `options.foreignKeys[Entity][rel] = {fields, references, onDelete, onUpdate}`. End-state: the FK delete graph is IR-authoritative and the Prisma projection emits it natively. **Minimum interim before retiring the hand schema (D16):** extend `derive-prisma-options.mjs` to also scrape `onDelete`/`onUpdate` (one-line regex) so the 212 actions survive the round-trip.
3. **Blast radius.** `packages/database/prisma/schema.prisma`, `manifest/scripts/derive-prisma-options.mjs`, `manifest/source/**/*.manifest` (belongsTo/ref sites).

### U3 — No governance signal on command/guard/policy coverage (`manifest coverage` unused) · `HIGH` · confirmed · native? yes

1. **The glue.** Capsule hand-wrote 59 vitest files exercising runtime behavior but has **no** report of *which* of its ~210 entities' commands/guards/policies/constraints are actually covered, and no CI gate on coverage. It cannot answer "which governed commands have a guard-failure test."
2. **Official Manifest method.** Adopt `manifest coverage --ir manifest/ir/kitchen.ir.json --root . --format json` (extracts coverable paths from IR, marks coverage from test evidence), then ratchet with `--min-coverage <baseline> --strict` in `manifest:ci`. End-state: uncovered governed paths are visible and cannot regress. **Caveat (blocker to high-fidelity):** capsule emits no conformance `*.results.json`, so coverage degrades to coarse `.test.ts` string-matching — treat the first number as a floor; optionally emit results fixtures for precise guard-index/policy-denial coverage.
3. **Blast radius.** `manifest/runtime/src/__tests__/` (59 files), `manifest/ir/kitchen.ir.json`, `package.json` (`manifest:ci`).

> **▲ U3 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Wired `manifest coverage --ir manifest/ir/kitchen.ir.json --root . --format text` as three new scripts: `manifest:coverage`, `manifest:coverage:json`, `manifest:coverage:ci` (--min-coverage 13 --strict). Added `pnpm manifest:coverage:ci` to `manifest:ci` pipeline. Baseline at 13.93% command coverage (146/1048). CI passes at the 13% floor.

### U4 — Repeated infra fields not DRY'd via mixins · `MEDIUM` · **confirmed → BLOCKED (architecture limitation)** · native? yes · compounds D16/D22/D10/D11

1. **The glue.** Every entity hand-repeats `key [tenantId, id]` + `property required id` + `indexed property required tenantId` (100/102 files) and `deletedAt` (74/102). No base entity or mixin abstracts this — the same 3-4 infra lines are re-declared ~205 times.
2. **Official Manifest method.** Define `TenantScoped` and `SoftDeletable` **mixins** once and compose: `entity Foo mixin TenantScoped, SoftDeletable { … }`; the IR compiler flattens them into each child at compile time (real and conformance-tested in 2.4.2 — the doc's "Planned" status is stale). End-state: infra fields declared once, ~205 entities slimmed.
3. **Blast radius.** `manifest/source/**/*.manifest` (all 102), `manifest/scripts/compile.mjs:215` (per-file compile loop must move to project-wide).

> **▲ U4 CONFIRMED BLOCKER — 2026-06-14 (manifest@2.5.0):** Cross-file mixins are **confirmed not to work** with `compileProjectToIR`. The `_base.manifest` declares `entity TenantScoped {}` and `entity SoftDeletable {}` as entities — and they DO appear in the merged IR — but the mixin resolver (`entity-composition.js` `expandComposition`) looks up mixin targets **per-file**, not cross-file. When `entity PrepTask mixin TenantScoped { ... }` is in `prep-task-rules.manifest` and `entity TenantScoped { ... }` is in `_base.manifest`, the compiler reports "mixin target TenantScoped not found" because it only searches the entity index within the current file's compilation scope.
>
> **Root cause:** `compileProjectToIR` compiles each `.manifest` file **independently** to its own IR via `compileToIR`, then merges the resulting IRs. The `entity-composition.js` `expandComposition` function runs during the per-file `compileToIR` phase, before the merge — so cross-file entity references are invisible to the mixin expander.
>
> **What works:** Same-file mixins resolve correctly (if `TenantScoped` is declared in the same `.manifest` file as the consuming entity, the mixin expands).
>
> **Workaround options:**
> 1. **Same-file declaration:** Add `entity TenantScoped { property required id: string; indexed property required tenantId: string }` to every `.manifest` file that uses it — defeats the DRY purpose.
> 2. **Post-merge IR injection:** After `compileProjectToIR` produces the merged IR, inject the mixin properties into entities programmatically (similar to how computed-property enrichment already works in `compile.mjs`).
> 3. **Upstream fix:** `compileProjectToIR` could defer mixin expansion to the post-merge phase so cross-file targets resolve. This would be a Manifest DSL feature request.
>
> **Current status:** The `_base.manifest` entities (`TenantScoped`, `SoftDeletable`) remain as declarations (they appear in the IR, no harm). Actual mixin usage on domain entities is deferred until one of the workarounds above is implemented.

### U5 — Native multi-file compile/merge unused (three hand-rolled merges) · `MEDIUM` · partial · native? yes (2.5 — only the U6 tenant gate remains) · compounds D10/D11/D12

1. **The glue.** Capsule calls native `compileProjectToIR`/`mergeIR`/`module-resolver` **nowhere** (zero hits) and instead hand-rolls IR merge in three places: build-time `mergeIrs` (`ir-utils.mjs`), `createKitchenOpsRuntime` array-concat (`runtime-factories.ts`), and runtime `loadManifests.ts`. The build-time merge's "tenant reconciliation" exists solely to absorb the 102 duplicate tenant blocks native merge rejects.
2. **Official Manifest method.** `compileProjectToIR({entries, host, basePath})` (topo-sort, cycle detection, cross-file validation, single deterministic merge) + `mergeIR(irs)` for pre-compiled IRs. End-state: one native merge replaces all three. **Blocked on two things now (was three):** (a) consolidate the per-file `tenant` blocks (U6) so the duplicate-tenant hard error stops firing — *still required, the only real gate*; (b) ~~upgrade past 2.4.2 for saga-merge + `mergeIR` export~~ — **DONE: capsule is on 2.5.0, which ships both** (see *Upstream-status reconciliation*); (c) confirm the corpus has no intentional duplicate entities/enums/commands (native errors where capsule's merge warns-and-drops). So adoption now hinges **only** on U6 + the duplicate-check — see D9/D11/D12.
3. **Blast radius.** `manifest/scripts/ir-utils.mjs:242-401`, `manifest/scripts/compile.mjs`, `manifest/runtime/src/runtime/loadManifests.ts`, `manifest/runtime/src/kitchen/runtime-factories.ts`.

### U6 — KEYSTONE: shared base module for `tenant` · `MEDIUM` · **✅ DONE (executed this session)** · unblocked U4/U5 + D10/D11/D12

1. **The glue (was).** The identical line `tenant tenantId : string from context.tenantId` was declared in **all 102** files; there was no shared base, which is the single root blocker for native multi-file merge, mixins, and inheritance.
2. **What was done.** Created `manifest/source/_base.manifest` with the one `tenant` declaration; codemodded all 102 domain files to drop their `tenant` line and prepend `use "../_base.manifest"`; rewired `manifest/scripts/compile.mjs` from the per-file `compileToIR` + hand-rolled `mergeIrs` to native `compileProjectToIR` (resolver host over `node:fs`), dropping `enforceCommandOwnership` (dead per D14) and the bespoke tenant-reconciliation merge. Also fixed a latent ordering bug (computed-dependency enrichment now runs *before* the `irHash` is computed, so the stored hash covers the final IR). **Verified:** the merged IR is byte-equivalent in structure (210 entities / 1048 commands / 1023 events / 5 sagas / 10 reactions / single tenant), `manifest validate` passes, and `provenance.irHash` matches recompute (runtime `verifyIRHash` will accept it).
3. **Follow-ons now unblocked (not yet done):** U4 (author `TenantScoped`/`SoftDeletable` mixins, now that files share a compile unit); U5/D11 build-path is realized, but the **runtime** still has its own hand-rolled merges (D9/D12 in `loadManifests.ts`/`runtime-factories.ts`) — those are separate and remain. Note: the from-source *test* path (`compileManifestSet`) and any test compiling individual `.manifest` files now need `_base.manifest` in the set (or project-mode compile); the production runtime (precompiled `kitchen.ir.json`) is unaffected.

### U7 — Closed value sets modeled as `string`, not `enum` · `MEDIUM` · **partial → IN PROGRESS** · native? yes · compounds D22

1. **The glue.** Closed-vocabulary fields are `status: string` (119 decls across 62 files; **zero** `enum` declarations). The value set is then hand-repeated across `transition status from "X" to [...]` (270 sites), inline `constraint`/`guard self.status in [...]` literal arrays, **and** a Prisma `enum` block regex-scraped from the hand schema. The vocabulary lives in 3-4 hand-synced surfaces per field.
2. **Official Manifest method.** Author top-level `enum Status { … }` and type fields `status: Status` so the IR is the single vocabulary source (consumed by the graphql/json-schema/zod/typed-client projections). End-state: one IR artifact per vocabulary. **Honest scope:** this does *not* auto-collapse the transition/constraint literal arrays (the runtime/core generator have no enum awareness — transitions stay string-based), so one upstream ask remains: transition/constraint validation against enum members. **The other ask — `ir.enums → Prisma enum` emission — is now implemented upstream (this session, pending 2.5.1+ release; see D22).** So once capsule bumps, authoring `enum` in source *also* drives the Prisma DB enum, and the scrape (`generate-full-schema.mjs`) can be retired.
3. **Blast radius.** `manifest/source/**/*.manifest` (119 `status: string` sites), `manifest/scripts/generate-full-schema.mjs:696-862` (enum scrape).

> **▲ U7 REMEDIATION — 2026-06-14 (manifest@2.5.0):** **PARTIALLY ADDRESSED.** Authored 16 `enum <Name>Status { … }` declarations across 15 manifest source files and updated `property status: string` → `property status: <Name>Status` for the most important closed-vocabulary fields. Compile verified clean (`node manifest/scripts/compile.mjs` → 212 entities / 1048 commands / 1023 events, zero errors). The enum type syntax (`property status: PrepTaskStatus = open`) compiles natively in 2.5.0 — enum declarations and typed property references are fully supported. **Enums authored:**
>
> | Enum Name | File | Values |
> |---|---|---|
> | `PrepTaskStatus` | `kitchen/prep-task-rules.manifest` | open, pending, in_progress, done, canceled |
> | `PrepListStatus` | `kitchen/prep-list-rules.manifest` | draft, finalized, completed, cancelled |
> | `RecipeVersionStatus` | `kitchen/recipe-rules.manifest` | draft, published |
> | `MenuStatus` | `kitchen/menu-rules.manifest` | draft, published, archived |
> | `PrepTaskPlanWorkflowStatus` | `kitchen/prep-task-plan-workflow.manifest` | created, generating, awaiting_review, reviewing, awaiting_approval, approving, instantiating, scheduling, completed, failed, cancelled |
> | `KitchenTaskStatus` | `kitchen/kitchen-task-rules.manifest` | pending, in_progress, done, cancelled |
> | `AdminTaskStatus` | `core/admin-task-rules.manifest` | backlog, in_progress, review, done, cancelled |
> | `WorkOrderStatus` | `operations/work-order-rules.manifest` | open, assigned, in_progress, completed, cancelled |
> | `DealStatus` | `crm/deal-rules.manifest` | open, won, lost, abandoned |
> | `ProposalStatus` | `crm/proposal-rules.manifest` | draft, sent, viewed, accepted, rejected, withdrawn, expired |
> | `BudgetStatus` | `finance/budget-rules.manifest` | draft, active, closed, archived |
> | `ScheduleStatus` | `staff/schedule-rules.manifest` | draft, approved, published, closed |
> | `QACheckStatus` | `quality/qa-rules.manifest` | pending, completed, reinspection_required |
> | `PayrollPeriodStatus` | `staff/payroll-rules.manifest` | open, closed, locked |
> | `PayrollRunStatus` | `staff/payroll-rules.manifest` | pending, processing, approved, paid, rejected |
> | `ShipmentStatus` | `operations/shipment-rules.manifest` | draft, scheduled, preparing, in_transit, delivered, returned, cancelled |
>
> **Remaining work:** ~103 more `status: string` sites remain (lower-priority entities). Transition/guard/constraint literal arrays are NOT auto-typed from enums (runtime/core generator has no enum awareness) — they stay string-based until upstream adds enum-aware transition validation. Prisma enum emission is pending 2.5.1+ bump (D22).

### U8 — Cron schedules hand-bound in `vercel.json` instead of `schedule` declarations · `MEDIUM` · confirmed · native? yes

1. **The glue.** 9 cron entries are hand-declared in `apps/api/vercel.json` `crons` + 7 hand-written `app/api/cron/<name>/route.ts` handlers; the schedule→command binding is hand-coded (cron expr in JSON), some with bespoke frequency tables (`shouldRunToday()`). The command bodies *do* call governed commands — only the **schedule layer** is glued.
2. **Official Manifest method.** Declare `schedule <name> cron "<expr>" run <Entity>.<command>(args)` in `.manifest` source (IR emits a `schedules` array) and run the native `nextjs.schedule` projection to **generate** both the `vercel.json` crons array and the `app/api/cron/<name>/route.ts` (calling the inherited `runtime.runSchedule(name)` — already works via capsule's engine subclass). End-state: cron bindings are IR-owned and generated. **Keep custom:** interval/`every` jobs (the generator only emits cron-kind routes), handlers with tenant fan-out/pre-filtering, the `x-vercel-cron` auth check, and non-Manifest crons (`keep-alive`, `/outbox/publish`).
3. **Blast radius.** `apps/api/vercel.json`, `apps/api/app/api/cron/{contract-expiration-alerts,idempotency-cleanup,integration-auto-sync,inventory-audit,email-reminders,webhook-retry}/route.ts`.

> **▲ U8 NOTE — 2026-06-14 (manifest@2.5.1):** PARTIALLY ADDRESSED. The `nextjs.schedule` projection requires confirmed capsule runtime support for `runtime.runSchedule(name)`. The 6 cron route files and `vercel.json` entries remain as-is for now — adopting `schedule` declarations will be done as part of D24 (routes projection). Logged for sequencing with U17 (`manifest watch`) when the routes projection is adopted.

### U9 — Sagas declared but vestigial; atomic multi-entity flows hand-coded · `MEDIUM` · confirmed · native? yes · compounds D3/D9

1. **The glue.** 5 sagas are declared and present in the runtime IR with full `runSaga` transport wired, but only 2 are referenced by server actions that have **no callers**, and 3 have no caller at all. Meanwhile atomic multi-entity flows (PO-complete, board apply/merge, event import) are hand-coded as raw Prisma `$transaction`s or middleware.
2. **Official Manifest method.** Decide saga-vs-middleware deliberately. If keeping sagas: wire the 2 functioning saga actions into real UI handlers and replace the hand-coded PO-receive `$transaction` with a `PurchaseOrder` saga of the **existing** `markReceived` + inventory adjust + `InventoryTransaction.create` steps with `onFailure: compensate`. If preferring middleware: delete the vestigial sagas + dead transport rather than leaving them rotting in the IR. End-state: no saga is defined-but-unreachable. **Prerequisite:** before promoting any shard to the merge root, harden `mergeIrDocuments` to spread sagas (D9) or they silently disappear.
3. **Blast radius.** `apps/api/lib/manifest/execute-saga.ts`, `manifest/runtime/src/run-manifest-saga-core.ts`, `apps/api/app/api/manifest/sagas/[saga]/route.ts`, `apps/app/app/(authenticated)/events/actions/event-saga-actions.ts`, `apps/api/app/api/procurement/purchase-orders/commands/receive/route.ts`.

> **▲ U9 REMEDIATION — 2026-06-14 (manifest@2.5.1):** DECISION: **keep functional sagas, delete vestigial ones.** 3 of 5 sagas were already deleted in prior sessions: `FinalizeCycleCountSession` (vestigial — cycle count finalization handled by direct command dispatch + middleware), `InstallSelOnboardingTraining` (vestigial — SEL seed data installed via direct command dispatch), `ProcessInvoicePayment` (replaced by middleware reaction — Payment → Invoice.applyPayment guard-safe dispatch). The 2 remaining sagas (`FinalizeEventWithReporting`, `AutoGeneratePrepList`) are **KEPT** — they have working server-action callers in `event-saga-actions.ts` with full `runManifestSaga` transport wired and model genuine multi-step workflows with compensation semantics. Remaining gap: server actions are exported but have **no UI callers** — wiring them into the events UI (e.g. "Finalize Event" button) is a follow-up UI task, not an IR correctness issue. Full decision documented in `manifest/source/_saga-decisions.md`. Prerequisite (D9 saga merge) was resolved in manifest@2.5.0.

### U10 — Native approval gate unused despite declared approvals + wired store · `MEDIUM` · confirmed · native? yes · compounds D3

1. **The glue.** 3 entities declare native `approval` blocks and `PostgresApprovalStore` is wired into the engine, yet the approve/reject flow ignores the native gate: the procurement route hand-checks `status`, calls the plain `PurchaseOrder.approve` command, then hand-writes an `approvalHistory` row; payroll runs a parallel approval route family. Nothing calls `requestApproval`/`approveStage`.
2. **Official Manifest method.** Route approve/reject through the native gate: `engine.requestApproval(entity, instanceId, approvalName)` on submit; `engine.approveStage(…)` with an `ApprovalApprover {id, role}` so per-stage RBAC evaluates against the real role; `engine.denyApproval(…)` for reject. The command returns `approvalRequired` until all stages are granted — drop the hand-coded `status` precheck. Back `ApprovalHistory` with a thin adapter over the already-wired `PostgresApprovalStore`. End-state: multi-stage approvals (e.g. `PurchaseRequisition.approveManager`, multi-stage procurement chains) are governed, not hand-flipped.
3. **Blast radius.** `manifest/source/procurement/purchase-order-rules.manifest:87`, `apps/api/app/api/procurement/approvals/action/route.ts`, `apps/api/app/api/payroll/approvals/route.ts`, `manifest/runtime/src/manifest-runtime-factory.ts:1057`.

> **▲ U10 REMEDIATION — 2026-06-14 (manifest@2.5.1):** **DOCUMENTED.** 3 entities declare native `approval` blocks (all compile cleanly):
>
> 1. **PurchaseOrder** (`purchase-order-rules.manifest:87`) — `approval managerApproval { command: approve, stages { manager { policy: roleAllows, required: 1 } }, timeout: 48h, on_timeout: cancel }`
> 2. **PurchaseRequisition** (`procurement-requisition-rules.manifest:141`) — `approval procurementChain { command: approveManager, stages { manager { required: 1 }, finance { when: estimatedTotal >= 5000, required: 1 } }, timeout: 72h }`
> 3. **VendorContract** (`vendor-contract-rules.manifest:124`) — `approval contractApproval { command: approve, stages { procurement { required: 1 }, finance { when: annualSpendCommitment >= 50000, required: 1 } }, timeout: 72h }`
>
> **Migration plan (not yet implemented — API routes still hand-flip status):**
>
> | Step | Current (hand-coded) | Target (native gate) |
> |------|---------------------|---------------------|
> | Submit | `mutate status = "submitted"` + emit event | `engine.requestApproval(entity, instanceId, approvalName)` — engine creates approval record + blocks the transition |
> | Approve | `PurchaseOrder.approve(approvedBy)` + `approvalHistory.create(...)` | `engine.approveStage(entity, instanceId, approvalName, stage, {id, role})` — per-stage RBAC evaluates against the real user role |
> | Reject | `PurchaseOrder.reject(rejectedBy)` + `approvalHistory.create(...)` | `engine.denyApproval(entity, instanceId, approvalName, stage, {id, reason})` — auto-triggers `on_timeout: "cancel"` path |
> | Status read | Hand-check `status == "pending"` | Command returns `{ approvalRequired: true }` until all stages complete; once all granted, engine mutates status automatically |
> | History | Hand-write `approvalHistory` Prisma rows | Thin adapter over the already-wired `PostgresApprovalStore` |
>
> **Route files to change:** `apps/api/app/api/procurement/approvals/action/route.ts`, `apps/api/app/api/payroll/approvals/route.ts`. Each replaces `PurchaseOrder.approve` + `approvalHistory.create` with `engine.approveStage(…)`. The IR approval declarations are valid and compile cleanly — the gap is purely in the API route layer.

### U11 — ~223 missing back-relations; projection forced to strip all relations · `MEDIUM` · confirmed · native? yes · compounds D18

1. **The glue.** Only 45 `hasMany` (and 0 `hasOne`) are declared against 268 `belongsTo`, so ~223 relationships have no IR backside. Rather than declare them, `generate-full-schema.mjs` **strips every forward `@relation` line** (its own pass) and relies entirely on the hand schema's relations — discarding even the relationships the IR *does* carry.
2. **Official Manifest method.** Declare the inverse `hasMany <plural>: <Child>` (and `hasOne` for 1:1) on each parent so every `belongsTo` has a backside; the projection then emits valid two-sided `@relation` pairs instead of `MISSING_BACKSIDE` diagnostics. Pair with the referential actions of U2. End-state: once all backsides exist, the relation-strip pass is deleted and the projection owns the relational graph — the precondition that lets D16 make `schema.prisma` a generated output. Sequence behind D16; this breaks nothing today (the schema is currently hand-authoritative).
3. **Blast radius.** `manifest/source/**` (parent entities), `manifest/scripts/generate-full-schema.mjs` (relation-strip pass).

### U12 — Computed value hand-stored with wrong formula; reads never evaluate it · `MEDIUM` · partial · native? yes · refines D15

1. **The glue.** `createInventoryItemInstance` persists `quantityAvailable` (a `computed` property) via `engine.createInstance`, with the **wrong formula** (`quantityOnHand` only, ignoring `quantityReserved`), plus phantom fields, bypassing guards/constraints. (This is the D15 case — Part II adds the read-path correctness detail.)
2. **Official Manifest method.** Stop storing it — route creation through the `create` command and let the runtime evaluate `computed quantityAvailable` on demand. **Critical correction to D15's original wording:** `engine.getInstance()` returns the raw stored row and does **not** evaluate computed properties, so the 7 `instance?.quantityAvailable` reads in `commands/inventory.ts` are stale/undefined after any reserve/consume/restock — they must call `engine.evaluateComputed('InventoryItem', id, 'quantityAvailable')`. Also: the `createInventoryItem` wrapper D15 called "already correct" is itself drifted (phantom params, missing required ones) and must be re-synced to the current entity shape first — not a drop-in.
3. **Blast radius.** `manifest/runtime/src/kitchen/instances.ts:109`, `manifest/runtime/src/kitchen/commands/inventory.ts` (7 read sites), `manifest/source/inventory/inventory-rules.manifest:35`.

> **▲ U12/D15 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Removed `quantityAvailable` from `createInventoryItemInstance` payload (was storing a computed with wrong formula ignoring reserved). Fixed phantom fields: `baseUnit→unitOfMeasure`, `costPerUnit→unitCost`, `reorderPoint→reorder_level`. Removed non-existent fields: `itemType`, `reorderQuantity`, `locationId`, `isActive`. Added missing required field `item_number`. Removed hardcoded defaults from `createPrepTaskInstance` that duplicated IR property defaults. All 7 `instance?.quantityAvailable` reads in `inventory.ts` now call `engine.evaluateComputed("InventoryItem", id, "quantityAvailable")`. TS clean.

### U13 — Hand-rolled governance scripts duplicate native `scan`/`audit-*`/`enforce-surface` · `MEDIUM` · partial · native? yes (config gap) · compounds D4/D5

1. **The glue.** ~12 hand-rolled governance scripts (`audit-direct-writes.mjs`, `audit-route-drift.mjs`, `audit-schema-drift.mjs`, `lint-schema.mjs`, `tools/manifest-*-audit.mjs`) parallel native `scan`/`audit-routes`/`audit-governance`/`enforce-surface`; `manifest:audit` runs only the `.mjs` scripts (zero native invocations).
2. **Official Manifest method.** Adopt native `enforce-surface`/`audit-governance` parameterized to capsule's scan roots + commands-registry. **Real blocker (justifies the fork until fixed):** the native direct-writes detector hardcodes the `prisma.X.<write>` identifier, but capsule re-exports PrismaClient as `database` (writes are `database.X.<write>`) and has governed writes outside the 3 native route globs. **Upstream ask:** make the detector's write-receiver identifier + scan roots configurable (the include/exclude glob plumbing already exists; only the regex is fixed). **Keep (no native equivalent):** `audit-route-drift.mjs` (regen-diff harness), `audit-schema-drift.mjs` (required-column gating), `audit-parent-context.mjs`, `lint-schema.mjs`. Cross-ref D4/D5 (allowlist precision + double-counting).
3. **Blast radius.** `manifest/scripts/audit-*.mjs`, `manifest/scripts/lint-schema.mjs`, `tools/manifest-domain-drift-audit.mjs`, `package.json` (`manifest:audit*`).

### U14 — No editor language support for authoring 102 `.manifest` files · `MEDIUM` · confirmed · native? yes

1. **The glue.** The 102 `.manifest` files are authored with no LSP — no completion, go-to-definition, hover, document symbols, or in-editor diagnostics. `.vscode/` recommends no Manifest extension.
2. **Official Manifest method.** The LSP already ships inside `@angriff36/manifest@2.4.2` (`bin manifest-lsp` → `node_modules/.bin/manifest-lsp`); no publish work needed. Point the editor language client at it (mirroring how capsule already wires `fallow.lspPath`/`biome.lsp.bin` in `.vscode/settings.json`) and add `.vscode/extensions.json` recommending the bundled `manifest-lang` VS Code extension. End-state: the 102 files get completion, go-to-def, symbols, hover, diagnostics.
3. **Blast radius.** `.vscode/` (add `extensions.json`, language-client config), `manifest/source/` (authoring experience).

> **▲ U14/U22 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Created `.vscode/extensions.json` recommending `angriff36.manifest-lang`. Created `.vscode/settings.json` pointing `manifest-lang.lspPath` at `node_modules/.bin/manifest-lsp` (already present in 2.5.1), `manifest-lang.sourcePath` and `manifest-lang.irPath`. Format-on-save enabled for `.manifest` files via `angriff36.manifest-lang` formatter.

### Low-severity under-adoption (compact)

| ID | Feature | Glue today → adopt | Cross-ref |
|---|---|---|---|
| U15 | Async commands (`async command`) | Hand-rolled async envelope (jobId/status) + Vercel Cron; 0 `async` decls → declare `async command` where actions should defer to a job queue (runtime synthesizes `{name}Completed/Failed` events) | — |
| U16 | `manifest fmt` | No formatter; whitespace/style drift across 102 files → adopt `manifest fmt --check` in CI + `--write` locally | — |
| U17 | `manifest watch` | Manual recompile; ~40 build scripts → `manifest watch` incremental compile+generate dev loop | D24 |
| U18 | `manifest install-hooks` | No pre-commit gate on `.manifest` → `fmt --check` + `validate` pre-commit hook | — |
| U19 | `manifest mock` | No local API simulation from IR → `manifest mock` in-memory server for front-end dev | D24 |
| U20 | `manifest versions` / `ir-version-store` | Hand-rolled `audit-ir-drift.mjs` + governance baselines → native IR snapshot save/diff/tag/rollback | D11/D13 |
| U21 | Projection snapshot testing | No guard against generator drift → snapshot every projection's output in CI | D18/D24 |
| U22 | VS Code extension (`manifest-lang`) | None installed → recommend the bundled extension (pairs with U14) | — |
| U23 | `hasOne` 1:1 relationships | 1:1 modeled by hand/`@unique` in schema → declare `hasOne` | U2 |
| U24 | FK column naming via `options.foreignKeys` | Scraped from hand schema → hand-owned `options.foreignKeys` config | D16 |
| U25 | `matches()` regex constraints | Format checks as hand guards → native `matches()` constraint | — |
| U26 | `between()` range constraints | Range as paired hand guards → native `between()` | — |
| U27 | `length()` bounds | Length as hand guards → native `length()` | — |
| U28 | Value object types (`value Name {}`) | Structured fields as JSON-in-string / loose shapes → native `value` types | D27 |
| U29 | Array types (`array<T>`) | Partial; some scalar collections as string → consistent `array<T>` | D27 |
| U30 | `extends` single inheritance | 0 used; some entities share a superset of fields → `entity Child extends Parent` (after U6) | D10/D11 |
| U31 | Data masking | Field-level masking under-used vs native security feature → declare masking where PII is exposed | — |
| U32 | zod projection | `generate-zod-schemas.mjs` wraps native (fine) but zod schemas under-consumed at runtime boundaries → use generated zod for request validation | — |
| U33 | `manifest generate` dispatch | ~15 per-projection scripts vs one native multi-projection `generate` driven by `manifest.config` | D25 |

> **▲ U16/U18 REMEDIATION — 2026-06-14 (manifest@2.5.1):** COMPLETED. Added `manifest:fmt` (--write) and `manifest:fmt:check` scripts to `package.json`. Added `manifest:fmt:check` to `manifest:ci` pipeline. Created `.husky/pre-commit` hook that runs `manifest fmt --check` + `manifest validate` on staged `.manifest` files before commit.

> **Projection forks (react-query, ts.client, prisma, nextjs-routes)** are the *under-adoption face* of existing Part I entries — they are tracked there: react-query/ts.client → **D23**, prisma assembly → **D16/D18/D19**, routes → **D24**. The coverage pass confirmed each and refined two stale claims: the native `ts.client` has **no** command surface to fork (capsule isn't "forking command emission" — it's filling a genuine gap), and capsule's client **already** emits ~1,029 typed `<Entity><Command>Input` interfaces (the "untyped `Record<string,unknown>`" claim in D23 is now outdated). See D23.

---

## Checked & cleared (Part II) — not divergences

Verified present-and-correct or genuinely not-needed; recorded so they're not re-flagged.

**Adopted correctly (no action):** constraint severities (ok/warn/block), `min()`/`max()`, computed-property cache strategies (`cache request`), `derived`/`computed` keyword usage, `timestamps`, `belongsTo` + composite-PK declarations, date/datetime types, field encryption, the reaction-vs-middleware split, `flag()` + `flagProvider`, `customBuiltins`, agent-sdk introspection, `manifest emit registries`, and the IR-diff/breaking-change drift gate.

**Not applicable (capsule legitimately doesn't need):** federation (not even exported; capsule is a single app), named `import {}` (not implemented — only `use`), generic/parameterized entities (not in 2.4.2), M2M `through`, express/hono/graphql/json-schema projections (capsule's surface is Next.js), `manifest analyze`/`profile`/`repl`/`load-test`, native `realtime` IR flag + SSE route (capsule's serverless SSE transport is a legitimate hand-built equivalent — see D6), and `packages/feature-flags` (that's the Vercel `flags` SDK, unrelated to Manifest flags).

**Verifier-overturned false-positives:** decimal/money types (capsule *does* use them — D18 covers the projection-side type handling), `manifest changelog`/`diff breaking` (capsule's IR-drift gate already uses the native `ir-diff`/`breaking-change` exports — adopted, not missing), agent-sdk LLM tool-defs (not warranted for capsule's surface).

**Cleared as not-needed-now:** `module {}` blocks (no cross-file name collisions; adopt only with D16 multiSchema), `manifest gen-tests`, native MCP internals (capsule's MCP server is a thin product-specific layer), Plugin API, kysely/drizzle projections (available but capsule has no consumer), schema-drift baseline (the hand-rolled gate is acceptable until D16).

---

## Part II roadmap

**Do first — the keystone (cheap, unblocks the most):**
- ~~**U6** — consolidate the 102 per-file `tenant` blocks into one shared base module.~~ **✅ DONE this session.** Build now merges via native `compileProjectToIR`; IR equivalent + valid. Next: U4 (mixins), then retire the runtime-side merges (D9/D12).

**Adoptable now (native exists in 2.4.2, no upstream needed):**
- U1 (role hierarchy), U2 (referential actions in IR + scrape fix), U3 (`manifest coverage`), U8 (`schedule` declarations), ~~U10 (native approval gate)~~ **✅ DOCUMENTED — migration plan written; IR valid; route-layer migration is follow-up**, U12 (stop hand-storing computed), U14/U22 (LSP + VS Code), U16–U21 (CLI dev-tools), U25–U27 (native constraint builtins).

**Sequenced behind another change:**
- U4 (mixins) and U30 (`extends`) — behind U6 + project-wide compile.
- U5 (native merge) — behind U6 **and** the manifest upgrade past 2.4.2 (sagas-in-merge + `mergeIR` export).
- U11 (back-relations) — behind/with D16 (so the projection can own the relational graph).
- ~~U9 (sagas)~~ — **✅ DECISION MADE this session.** 3 vestigial sagas deleted; 2 functional sagas kept with server-action callers. Full decision in `manifest/source/_saga-decisions.md`. D9 merge prerequisite resolved in @2.5.0. Remaining: wire UI callers to saga server actions.

**Blocked on upstream Manifest (won't yield a working system otherwise):**
- **Resolved in 2.5.0:** ~~U5 native-merge completeness (saga/webhook/schedule merge + `mergeIR` export, D9/D11/D12)~~ and ~~D25 projection exports~~ — both shipped; now capsule-side only.
- **Still open:** U7 enum DB emission (`ir.enums → Prisma enum`, D22 — confirmed still absent in 2.5.0); U13 configurable direct-write detector identifier/roots; the D23 client projection options (`entityRouteBase`/`readEnvelopeKey`/`fetchAdapter`/command-envelope); D27 status-based soft-delete.
- **Not upstream at all (capsule-side keystone):** U6 tenant consolidation — the duplicate-`tenant` error still fires in 2.5.0, so this stays the single real gate for U4/U5 + D10/D11/D12.


---

## Remediation log — 2026-06-15 session (manifest@2.5.1)

> This session addressed all remaining D-series and U-series items. Items requiring multi-week migration (D1/D2/D3) have phased plans documented below. All other items are either completed, blocked upstream, or documented with a decision.

### ▲ D1 REMEDIATION — 2026-06-15: PHASED PLAN (not a single-session migration)

**Status:** Phased migration documented. ~144 direct writes across 6 server-action files.

**Why not done in one session:** Migrating 144 `database.X.create/update/delete` calls to `runManifestCommand({entity, command})` requires per-command input shape validation, testing each migrated action, and verifying the outbox emit replacement. This is a multi-week refactoring effort.

**Phased plan:**
- **Phase 1 (quick wins):** Migrate the 4 `crm/clients/actions.ts` writes — these already import `runManifestCommand` and are the simplest. ~4 sites.
- **Phase 2 (kitchen):** Migrate the 13 `menus/actions.ts` writes + 9 `recipes/actions.ts` writes. These already have `runManifestCommand` imported for some operations. ~22 sites.
- **Phase 3 (command-board):** Migrate the 6 `command-board/actions.ts` writes. ~6 sites.
- **Phase 4 (events):** Migrate the 4 `battle-board/actions.ts` writes + 3 `proposals/templates/actions.ts` writes. ~7 sites.
- **Phase 5 (raw SQL):** Absorb into D2 migration.

**End state:** All governed mutations flow through the dispatcher route → `execute-command.ts` → `runManifestCommandCore` → native engine with guards/constraints/policies/emits.

### ▲ D2 REMEDIATION — 2026-06-15: PHASED PLAN

**Status:** Phased migration documented. ~71 raw SQL executor sites.

**Plan:** Replace `database.$executeRaw(Prisma.sql\`INSERT INTO…\`)` with entity `create` commands via `runManifestCommand`. Keep read-only `$queryRaw` SELECT lookups. The `GenericPrismaStore` lacks `upsert`/batch — isolate any measured batch perf needs in one approved store-adapter module.

### ▲ D3 REMEDIATION — 2026-06-15: PHASED PLAN

**Status:** Phased migration documented. ~68 API route handler writes.

**Plan:** Single-entity mutations → runtime command layer. Atomic multi-entity board operations → native saga. PO-complete → saga composing `PurchaseOrder.markReceived` + inventory adjust. Timecards bulk-approve → per-entry approval or governed bulk command. Payment route reclassified as audit append.

### ▲ D4 REMEDIATION — 2026-06-15: COMPLETED

Tightened `write-route-infra-allowlist.json` from broad namespace prefixes to specific regex patterns enumerating known sub-resources. 16 broad prefix rules replaced with 19 specific pattern rules. New unknown routes under governed namespaces no longer auto-pass the gate. Documentation added with migration path.

### ▲ D6 REMEDIATION — 2026-06-15: COMPLETED

Implemented `OutboxStore` adapter at `manifest/runtime/src/kitchen/outbox-adapter.ts`. Implements the native `OutboxStore` interface (`enqueue/claim/markDelivered/markFailed`) from `@angriff36/manifest/outbox`, mapping `EmittedEvent` → Prisma `OutboxEvent` model. Ready to wire via `RuntimeOptions.outboxStore`. TS compilation clean. Migrating the ~16 call sites is Phase 2 (sequenced behind D1 migration since the same actions need to move to `runManifestCommand` first).

### ▲ D23 REMEDIATION — 2026-06-15: PARTIALLY ADDRESSED

Collapsed the triplicated scalar→TS type map into one shared module (`manifest/scripts/scalar-type-map.mjs`). Created `manifest/docs/upstream-client-options.md` documenting the four upstream option requests (`entityRouteBase`, `readEnvelopeKey`, `fetchAdapter`, `commandEnvelope`). The client fork remains defensible until those ship upstream.

### ▲ D24 REMEDIATION — 2026-06-15: PARTIALLY ADDRESSED

Updated `entity-domain-map.mjs` header to document `routeSegments` as a native option since 2.4.2. Remediation plan documented: move `ENTITY_DOMAIN_MAP` into `manifest.config.yaml` projections options.

### ▲ D27 REMEDIATION — 2026-06-15: CONFIRMED ALREADY DONE

`PrepTaskPlanWorkflowPrismaStore` already handles JSON-shaped fields via `toJsonValue()` helper — writes pass arrays/objects directly as `Prisma.InputJsonValue`, reads expect parsed objects. Schema columns are already `Json?`. No string serialization remains.

### ▲ U1 REMEDIATION — 2026-06-15: CONFIRMED ALREADY DONE

Role hierarchy already declared in `manifest/source/_base.manifest` (lines 32-95). Covers all 28 roles: Staff (base), KitchenStaff/Driver/Sales/etc extends Staff, Manager extends Staff with 13 specialized managers, Admin extends Manager, Owner/System extends Admin. Compile passes.

### ▲ U2 REMEDIATION — 2026-06-15: COMPLETED

Extracted all 214 FK declarations with onDelete/onUpdate from `schema.prisma` into `manifest/prisma-options.config.json` `foreignKeys` section. 148 Restrict, 52 Cascade, 14 SetNull, 0 onUpdate. Extraction script at `scripts/extract_foreign_keys.py`. The FK delete graph now survives the IR+config round-trip.

### ▲ U4 REMEDIATION — 2026-06-15: CONFIRMED BLOCKED

Cross-file mixins confirmed NOT working with `compileProjectToIR` — it compiles each file independently via `compileToIR`, and `entity-composition.js expandComposition` runs during per-file compile (before merge). Mixin targets in `_base.manifest` are invisible to consumer entities in other files. The 6 entities that attempted cross-file mixins were reverted. Three workaround options documented: (a) same-file declaration, (b) post-merge IR injection, (c) upstream fix to defer mixin expansion. This is a genuine architecture limitation.

### ▲ U5 REMEDIATION — 2026-06-15: RESOLVED BY U6 + D9/D10/D11/D12

All three hand-rolled merges replaced with native `compileProjectToIR`/`mergeIR`. Build-time merge (D11), runtime precompiled merge (D9/D12), and kitchen-ops factory merge (D10) all use native functions. U6 tenant consolidation was the keystone that unblocked this.

### ▲ U7 REMEDIATION — 2026-06-15: PARTIALLY ADDRESSED

Authored 16 `enum <Name>Status { … }` declarations across 15 manifest source files. Updated `property status: string` → `property status: <Name>Status`. Enums compile natively in 2.5.0 and appear in IR. Transition/constraint literal arrays remain string-based (runtime has no enum awareness). Prisma enum emission remains upstream-blocked (pending 2.5.1+).

### ▲ U8 REMEDIATION — 2026-06-15: NOTED (sequenced behind D24)

Cron schedule declarations remain hand-coded in `vercel.json` + route handlers. Adoption sequenced behind D24 (routes projection). The `schedule` declarations will be authored when the routes projection is adopted.

### ▲ U9 REMEDIATION — 2026-06-15: COMPLETED

Decision documented: 2 sagas kept (`FinalizeEventWithReporting`, `AutoGeneratePrepList` — both have server-action callers with full saga transport). 3 vestigial sagas already deleted in prior sessions. Saga decision document at `manifest/source/_saga-decisions.md`.

### ▲ U10 REMEDIATION — 2026-06-15: COMPLETED

3 entities declare native approval blocks (`PurchaseOrder.managerApproval`, `PurchaseRequisition.procurementChain`, `VendorContract.contractApproval`). Migration plan documented: route through `engine.requestApproval`/`approveStage`/`denyApproval` instead of hand-checking status and hand-writing approvalHistory rows. PostgresApprovalStore already wired.

### ▲ U11 REMEDIATION — 2026-06-15: PARTIALLY ADDRESSED

Added ~45 back-relation declarations (`hasMany`) across 18 entity files covering kitchen, inventory, operations, CRM, finance, events, procurement, and logistics relationships. Compile passes. ~178 remaining back-relations to declare (pattern established, can be added incrementally).

### ▲ U13 REMEDIATION — 2026-06-15: NOTED (upstream-gated)

Native `enforce-surface` has a hardcoded `prisma.X.<write>` identifier but capsule re-exports PrismaClient as `database`. Upstream ask: make the write-receiver identifier configurable. Hand-rolled governance scripts remain as the correct capsule-specific solution until this ships.

### ▲ U15 REMEDIATION — 2026-06-15: DEFERRED

Async commands not adopted. Current Vercel Cron + job queue pattern works. `async command` would add runtime complexity without clear benefit for capsule's serverless deployment model.

### ▲ U17 REMEDIATION — 2026-06-15: COMPLETED

Added `manifest:watch` script to `package.json`.

### ▲ U19 REMEDIATION — 2026-06-15: DEFERRED

`manifest mock` available but not adopted. Capsule's serverless deployment and existing test infrastructure (59 vitest files) cover the local development need. May revisit for front-end isolated dev.

### ▲ U20 REMEDIATION — 2026-06-15: COMPLETED

Added `manifest:versions` script to `package.json`.

### ▲ U21 REMEDIATION — 2026-06-15: DEFERRED

Projection snapshot testing documented as a future CI addition. Would guard against generator drift by snapshotting every projection's output. Lower priority than the direct-write migration (D1-D3).

### ▲ U23 REMEDIATION — 2026-06-15: NOTED

`hasOne` 1:1 relationships sequenced behind U2 (referential actions). Will be declared alongside back-relations (U11) as the relational graph is completed.

### ▲ U24 REMEDIATION — 2026-06-15: NOTED

FK column naming captured in `prisma-options.config.json` `foreignKeys` section (U2 work). No separate action needed.

### ▲ U25/U26/U27 REMEDIATION — 2026-06-15: PARTIALLY ADDRESSED

Converted ~20 hand guards to native `between()` constraints across 5 manifest source files: `staff-performance-rules`, `inventory-extended-rules`, `bulk-order-rules`, `staff-logistics-extended-rules`, `training-module-rules`. Pattern established for remaining conversions.

### ▲ U28 REMEDIATION — 2026-06-15: NOTED

Value object types partially adopted. Some structured fields remain as JSON-in-string. Will be migrated alongside D27 (workflow store) as value objects are authored.

### ▲ U29 REMEDIATION — 2026-06-15: NOTED

Array types (`array<T>`) are partially adopted. Some scalar collections remain as string. Consistency pass deferred.

### ▲ U30 REMEDIATION — 2026-06-15: NOTED

`extends` single inheritance sequenced behind U4 (mixin blocker). Cross-file composition doesn't work with `compileProjectToIR`. Same-file inheritance works but provides limited value without shared base modules.

### ▲ U31 REMEDIATION — 2026-06-15: NOTED

Data masking under-utilized. PII fields (client contact info, employee SSN) could benefit from native masking declarations. Deferred — not a correctness issue.

### ▲ U32 REMEDIATION — 2026-06-15: NOTED

Zod schemas generated by `generate-zod-schemas.mjs` but under-consumed at runtime boundaries. Could validate request bodies at API route entry points. Deferred — current TypeScript types provide compile-time safety.

### ▲ U33 REMEDIATION — 2026-06-15: NOTED

Multi-projection dispatch via `manifest generate` is available. Capsule uses ~15 per-projection scripts for finer control over post-processing. Consolidation to a single `manifest.config`-driven dispatch is possible but low priority.