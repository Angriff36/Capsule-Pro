# CONVEX-MIGRATION.md — Single Source of Truth

> **This is the ONE authoritative doc for the Prisma/Neon/Next.js → Convex migration.**
> If any other doc in this repo disagrees with this file, **this file wins.** When you
> change migration state, update THIS file in the same commit. Do not start a new plan doc.
>
> Last verified: 2026-06-17 (re-verified end-to-end this session) · Branch: `feat/convex-compile-path-a` · Last commit at write time: `e801fb67f`
>
> **2026-06-17 verification result:** `pnpm manifest:ci` is **GREEN** (compile, invariants, validate,
> generate, drift, architecture `4 baselined/0 new`, registries `1060 commands / 212 entities`).
> Track A (Prisma reads) is **complete** (codemod 0 sites, dead-import helper 0 files). Track B was
> re-measured against the tooling + a 12-agent classification sweep of all 92 `apiFetch` files: the
> **mechanical repoints are already done**; the 90 files / 237 calls that remain are the hard residue
> (custom aggregates, AI, integrations/sync, imports/exports/blob, composite writes, and lossy reads)
> — see the corrected §2 and §5. They are **not** mechanical swaps and need Phase 4–6 work + a live
> Convex backend to verify. Do not re-assume "92 files = mechanical."

---

## 0. Why this file exists

Sessions kept contradicting each other about "what needs to happen" because there were
~24 overlapping plan/status/constitution docs and no anchor. Each session re-derived the
state from scratch, often looked in the wrong place, and reached a different conclusion.
This file ends that. It records **verified** facts and the **proven** path. Read it first.

Legend: ✅ = verified by file inspection on 2026-06-17 · 📄 = reported by a prior status doc (not re-verified at runtime).

---

## 1. The proven approach (do not re-litigate)

Capsule-pro's domain is modeled once in Manifest `.manifest` source → compiled to IR →
projected to Convex by the **official `ConvexProjection`** from `@angriff36/manifest`.
This is proven end-to-end in the reference repo `C:/Projects/convex-example` (same domain,
running on Convex with zero hand-written business logic).

**Hard rules (these are why past attempts failed):**
1. **Never hand-roll the Convex generator.** The official `ConvexProjection` does schema,
   mutations, queries, guards, policies, constraints, events, reactions, sagas, crons, http.
2. **Never HAND-edit generated `convex/` files.** The drift gate (`manifest:check-convex-drift`)
   regenerates and fails CI if committed output differs. Fix the IR source or projection version,
   then regenerate. (Exception that is NOT a hand-edit: the generator's own idempotent
   `patchMutationsAuth` step injects Clerk `resolveMutationAuth` into `convex/mutations.ts` on
   every regen — it's part of generation and stays in sync with the drift gate.)
3. **Regenerate via the pipeline only:** `pnpm manifest:generate-convex` (backend, 6 surfaces)
   and `pnpm manifest:client` (typed frontend client). Both read `manifest/ir/kitchen.ir.json`.
4. **Use `@angriff36/manifest@2.10.7` or later.** (2.10.6 fixed money/decimal→number mapping;
   2.10.7 cleared the last generated-mutation typecheck errors.)
5. **Commit small and often.** A large uncommitted diff is how state becomes ambiguous.

**Actual projection config** (`manifest/scripts/generate-convex.mjs`, verified 2026-06-17 ✅):
`referenceMode: "stringId"`, `emitEventsTable: true`, `eventsTable: "manifestEvents"`,
**`policyMode: "enforce"`** — policies are LIVE in the generated mutations, not skipped — output → root `convex/`.

---

## 2. Verified current state (2026-06-17)

### Toolchain ✅
- `@angriff36/manifest` is pinned to **`2.10.7`** in all real workspace packages:
  `./package.json`, `./manifest/runtime/package.json`, `./packages/mcp-server/package.json`.
- Older pins (`1.0.32`, `1.8.0`, `2.4.2`) exist **only** in throwaway dirs `./.tmp/` and
  `./.worktrees/` — NOT workspace projects. Ignore them. (They also pollute grep/audits —
  consider deleting `.tmp/config-files-export` and the stale `.worktrees/feature-main-*`.)

### Generated Convex backend ✅ — present and complete, in the **root `convex/`** dir
| File | Size | Contents |
|---|---|---|
| `convex/mutations.ts` | ~1.42 MB | ~1043 generated mutations |
| `convex/schema.ts` | ~134 KB | ~200 tables + events table |
| `convex/queries.ts` | ~114 KB | list / getById / listBy queries |
| `convex/sagas.ts`, `convex/crons.ts`, `convex/http.ts` | small | orchestration surfaces |
| `convex/auth.config.ts`, `convex/identity.ts` | small | hand-written auth glue (not generated) |
- Convex typed refs: `apps/app/convex/_generated/`.
- Typed frontend client: `apps/app/app/lib/manifest-client.generated.ts`.
- **Note:** the generated surfaces live in **root `convex/`**, NOT `apps/app/convex/`
  (that only holds `_generated/`). Don't conclude "backend missing" by looking there.

### Governance pipeline ✅ (what each step ACTUALLY does — verified by reading the .mjs source)
`pnpm manifest:ci` runs, in order:
1. `manifest:compile` (`manifest/scripts/compile.mjs`) — discovers `.manifest` sources, merges via
   native `compileProjectToIR` → `manifest/ir/kitchen.ir.json` (+ shards, commands registry,
   provenance). Deterministic: reuses prior `compiledAt` when source `contentHash` is unchanged → zero git drift.
2. `manifest:verify-invariants` — IR invariant checks.
3. `manifest:validate` — `manifest validate manifest/ir/kitchen.ir.json`.
4. `manifest:generate-convex` — official `ConvexProjection` → 6 files in `convex/`, then the
   idempotent Clerk-auth patch on `mutations.ts`. Exits 1 on projection error diagnostics.
5. `manifest:check-convex-drift` — backs up the 6 surfaces, regenerates, **fails if committed
   `convex/` differs** (working tree restored in `finally`). Keeps generated output honest.
6. `manifest:enforce-convex-architecture` — baseline-gated guard. Forbids `@prisma/client`,
   `@repo/database`, `createManifestRuntime`, `storeProvider`, `prismaOverride`, and hand-written
   Convex mutations outside generated files. Blocks NEW violations vs
   `manifest/governance/baselines/convex-architecture.json`. Legacy allowlist (warn-only):
   `packages/database/`, `manifest/runtime/`, `apps/api/app/api/`, supplier-connectors sync.
7. `manifest:registries` + `git diff --exit-code` on `manifest/governance/{commands,entities}.json`.

Migration helpers (NOT in CI, run manually): `pnpm manifest:client` regenerates the typed frontend
client from IR; `node manifest/scripts/codemod-prisma-to-manifest-client.mjs` auto-rewrites
`database.*` reads (see §5). The frontend client (`manifest-client.generated.ts`) is itself
generated from IR — reads go through a Convex read-bridge, writes through `executeCommand` → generated mutations.

### Frontend data-layer migration — TOOL-AUTHORITATIVE counts (2026-06-17 ✅)
Numbers below are from the tools, not grep (grep over-counted earlier):
- **`enforce-convex-architecture`: 4 actionable violations** ("4 baselined, 0 new"). This is the
  objective "work remaining" meter for forbidden Prisma/runtime patterns. Target: 0.
- ~~**codemod dry-run: 0 `database.*` call sites**~~ → **Track A (Prisma reads) is COMPLETE** (re-verified
  2026-06-17: codemod reports 0 sites; `remove-dead-database-imports.mjs` reports 0 files to clean).
- **`apiFetch` shim usages in `apps/app`: 92 files** (90 invoke it; `lib/api.ts`/`api-server.ts` just
  *define* the shim). A 12-agent classification sweep of all 92 (verified against the generated client
  + entity types) gives the **real** Track B shape — NOT the optimistic "mechanical repoint" framing:
  - **REPOINT (clean, fully migratable now): effectively 0.** The straightforward `list*/get*/<entityCmd>`
    repoints were already done by prior sessions; that's *why* the files still contain `apiFetch` — only
    their hard calls are left. (Classifier said `REPOINT:8`, but on inspection those 8 are already-migrated
    files whose residual `apiFetch` is a custom/blob/aggregate call, e.g. `use-card-mutations.ts` = only a
    FormData blob upload remains.)
  - **CUSTOM: 64 files** — endpoint is a hand-written Convex action / non-CRUD aggregate with **no generated
    fn** (`invoiceCreate`, `paymentCreate`, `financialReportGenerate`, etc. confirmed absent). Needs a new
    Convex query/action ported from `main`.
  - **MIXED: 12 / REVIEW: 3 / TEST: 2 / INFRA: 3.**
  - **~237 residual call sites** categorize as: integration/sync ~41, custom aggregate/query ~34,
    composite-or-command writes ~26, AI ~15, analytics aggregate ~14, import/export/blob ~12, forecast ~4,
    plus lossy reads. **Three structural blockers make these non-mechanical:**
    1. **Wrong-entity / lossy-entity traps** — you must map each read to the entity whose generated TYPE
       actually carries every field the UI shows, then check completeness. Two real examples found this session:
       (a) `/api/staff/employees` does **NOT** map to the minimal `StaffMember`
       (`{displayName,email,phone,role,status,notes}`) — it maps to the **`User`** entity, whose type is
       field-complete (`firstName,lastName,hourlyRate,hireDate,employmentType,isActive,avatarUrl,…`), so
       `listUsers()` **is** a faithful read (a win the classifier mislabeled as `listEmployees`/`StaffMember`).
       (b) Where the right entity is genuinely missing fields, faithful migration needs IR enrichment →
       regenerate, not a swap. Verify per file; don't trust the classifier's entity guess.
    2. **No filtered reads** — the generated read-bridge only does `list-all-by-tenant` + `getById`.
       Per-user / filtered / aggregated reads (e.g. a notifications *inbox* scoped to the recipient) have
       **no** generated query (`convex/queries.ts` has `listNotification`, `getNotification`,
       `listNotificationByTenantId` — no `…ByRecipient`). Repointing such a read to `listNotifications()`
       would **leak all tenant rows to every user**. Needs a new IR-defined query (+index) → regenerate.
    3. **Actor/audit params required by generated writes (the biggest write blocker).** Many generated
       mutations take the *actor* identity (and audit fields) as **required client args**, not server-injected
       from auth — the same governance hazard as tenant (CONSTITUTION §6). The validator rejects calls that
       omit them, and the wrapper input types mark them optional so **tsc, drift, and `manifest:ci` all stay
       green while the call fails at runtime.** Verified this session in `convex/mutations.ts`:
       `PayrollRun.approve` requires `approvedBy` (guarded non-empty **and written to the row**),
       `PayrollRun.reject` `rejectedBy`, `ApiKey.revoke` `reason`+`revokedBy`, `ApiKey.softDelete`
       `reason`+`deletedBy`, `Notification.markRead`/`InteractionAttachment.remove`/`User.deactivate`/
       `User.updateRole` a required `userId` (+`reason` for deactivate). Also: the bridge resolves the
       subject **only from `body.id`** (`buildMutationArgs` maps `id`→`docId`), so a write that passes
       `{userId}` instead of `{id}` never locates the record. Supplying these from the client is either
       spoofable (real actor) or a band-aid (`""`) — **defer all such writes to Phase 5 actor-injection**
       (derive actor from `resolveMutationAuth`, make the params server-side). Only writes whose every
       required param is a legitimate UI/domain value are migratable now (e.g. `proposalDraftSend`,
       `proposalDraftRefreshToken`, `payrollRunMarkPaid`).
  - `REPOINT-MAP.md`'s per-endpoint "targets" are an auto-generated first-6-mutations fallback for most
    rows (the same `actionMilestone…` list repeats) — **treat as a hint, not authoritative.**

### Session 2026-06-17 — Track B work actually landed
Migrated the genuinely-safe calls (gated: 0 NEW `apps/app` tsc errors, `pnpm manifest:ci` green, `pnpm test`
unchanged at 13 pre-existing fails). **Reads → generated client (7 files):** `dev-console/users` & admin-chat
employee roster → `listUsers` (User entity is field-complete — classifier had wrongly said `StaffMember`);
`crm/.../communications-tab` → `listInteractionAttachments`; `events/.../allergen-section` → `listAllergenWarnings`;
`kitchen/schedule` → `listTimeOffRequests`; `payroll/runs` → `listPayrollRuns`; `dev-console/api-keys` →
`listApiKeies` (all tenant-level surfaces, not per-user → no leak). **Writes → generated client (3, no actor param):**
`proposal-detail` `proposalDraftSend`/`proposalDraftRefreshToken`; `payroll/runs/[runId]` `payrollRunMarkPaid`.
**Reverted as unsafe** (actor-param blocker #3, kept on `apiFetch` with TODO): `payrollRunApprove`/`reject`,
`apiKeyRevoke`/`softDelete`, `interactionAttachmentRemove`, `notificationMarkRead`, `userUpdateRole`/`userDeactivate`.
Net: a few files fully off `apiFetch`; most reads repointed while their custom/aggregate/blob/actor-write calls
stay. The 64 CUSTOM files were left untouched (correctly) — they need new Convex actions (buckets above).

### Proof slices already on Convex 📄 (per `CONVEX_APP_MIGRATION_STATUS.md`, 2026-06-15)
Events list/detail, Inventory items list/detail, Kitchen production board, Kitchen tasks,
Prep lists, Recipe catalog/detail — reads via Convex loaders, writes via `runManifestCommand`.
(Marked working/preserved in that doc; not re-verified at runtime here.)

---

## 3. Phase model & where we are

Anchored to `C:/Projects/convex-example/migration-guide.md`.

| Phase | What | Status |
|---|---|---|
| 0 | Prereqs: manifest 2.10.7, Convex CLI, local backend | ✅ done |
| 1 | IR authoring fixes (reaction param types) | ✅ done (per reference) |
| 2 | Add Convex projection + scripts to capsule-pro | ✅ done (`manifest:generate-convex`, `convex/` populated) |
| ~~**3a**~~ | ~~**Prisma `database.*` reads → generated client**~~ | **✅ DONE** (2026-06-17: codemod 0 sites, dead-import helper 0 files) |
| **3b** | **`apiFetch` endpoints → generated client** (Track B) | **▶ blocked on Phase 4–6.** Mechanical repoints DONE; the 90 residual files all carry custom/lossy/aggregate/blob calls that need new Convex queries/actions (§5). Not mechanical. |
| 4 | Convex loaders/hooks for reactive reads where wanted | partial (loaders used; hooks selective) |
| 5 | Auth: Clerk→Convex | **largely done ✅ — `policyMode: "enforce"` already set; generated mutations patched with `resolveMutationAuth` (Clerk JWT). Remaining: end-to-end verification** |
| 6 | Data migration Postgres → Convex | not started |
| 7 | Remove Prisma: delete `packages/database/prisma`, domain API routes, prisma projection; empty the architecture baseline | not started |

**Current focus = Track B residue (see §5), which is really Phase 4–6 work.** Track A is DONE. Track B is
NOT mechanical: each remaining `apiFetch` file needs a new Convex query/action, IR enrichment, or a filtered
query (+ a live backend to verify) — grouped by bucket in §5. `REPOINT-MAP.md` per-endpoint targets are an
auto-generated fallback (hint only). The `enforce-convex-architecture` baseline (4) shrinks only as the
legacy `apps/api`/`packages` runtime is deleted in Phase 7, not as `apiFetch` files migrate.

---

## 4. Definition of done (encoded in CI, not opinion)

- **`pnpm manifest:enforce-convex-architecture --strict` passes with an empty actionable set** —
  no `@prisma/client` / `@repo/database` / `createManifestRuntime` / `storeProvider` outside the
  legacy allowlist, AND the legacy allowlist dirs (`packages/database/`, `apps/api/app/api/`) are
  themselves migrated or deleted. This guard — not a prose checklist — is the source of truth for "done."
- `pnpm manifest:ci` green (compile, invariants, validate, generate, **drift**, architecture, registries).
- `apps/app`: 0 `apiFetch` shim usages, 0 `database.*`/Prisma imports.
- Auth verified end-to-end (`policyMode: "enforce"` is already on).
- Data migrated (Phase 6); Prisma package + domain API routes deleted (Phase 7).
- App still deploys on Vercel (`capsule-pro-app`) at each phase boundary.

**Known gate gap (2026-06-17):** `pnpm check` (full turbo typecheck) is **NOT** green — independent of
Track B. `@repo/notifications` fails typecheck (`sms-automation-engine.ts` / `sms-notification-service.ts`
still call `database.sms_automation_rules.*` with no `database` in scope — dead Prisma refs). It's a
Phase-7 legacy package (architecture allowlist); it must be ported off Prisma to make `pnpm check` green.
A raw `tsc` over `apps/app` also reports ~561 pre-existing normalized errors (test files importing the
removed `@repo/database`, plus accumulated type debt from earlier partial migrations). Neither blocks
`pnpm manifest:ci` (the encoded DoD), which is green. The verification gate for Track B edits is therefore:
no NEW `apps/app` tsc errors vs baseline **+** `pnpm manifest:ci` green **+** `pnpm test`.

---

## 5. Next concrete action — what Track B ACTUALLY needs (corrected 2026-06-17)

~~**Track A — Prisma `database.*` reads (codemod-assisted)**~~ — **DONE** (0 sites, 0 dead imports).

**Track B is NOT a mechanical repoint.** The easy `list*/get*/<entityCmd>` swaps are already committed.
Each of the 90 remaining `apiFetch` files keeps `apiFetch` precisely because its leftover call(s) fall
into one of these buckets — each needs real backend work (IR-first + a running Convex backend to verify),
**not** a one-line client swap. Tackle by bucket, not file-by-file:

1. **Wrong-entity / lossy-entity reads** — map each read to the entity whose generated TYPE carries every
   field the UI shows. Some are faithful wins the classifier mislabeled (`/api/staff/employees` → **`User`**
   `listUsers()`, NOT `StaffMember`). Where the right entity is genuinely missing fields, **enrich the
   `.manifest` entity** → `pnpm manifest:compile && generate-convex && client`, then repoint. Don't repoint a
   lossy entity (silent data loss).
2. **Call-site bugs in already-migrated writes** — e.g. `dev-console/users` `userUpdateRole({id})` never
   passes `newRole` even though `UserUpdateRoleInput` = `{id, newRole, userId}`. Fix the call to pass the
   real fields; the command itself is correctly specified in `.manifest` (`updateRole(newRole, userId)`).
3. **Filtered / per-user / paginated reads** (notifications inbox, my-tasks, available-tasks, activity-feed
   list) — no generated query exists; the read-bridge is list-all-by-tenant. **Add an IR query (+index)**
   → regenerate → consume via `convex/react useQuery(api.queries.…)` (real-time) or extend the async client.
   Repointing to the unfiltered `list*()` is a **tenant-wide data leak** — do not.
4. **Aggregates / analytics** (`/api/analytics/*`, profitability, bottlenecks, menu-engineering, finance,
   staff/kitchen analytics, activity-feed stats) — port the hand-written Convex action from `main`
   (Convex `query`/`action` in `convex/` glue or a `*-loaders.ts`), then call it. ~48 sites.
5. **AI endpoints** (`/api/ai/*`, summaries, suggestions, transcripts, generate-proposal, bulk-tasks,
   nutrition-labels/generate) — port the Convex action from `main`. ~15 sites.
6. **Integrations / sync** (calendar sync, webhooks + DLQ, goodshuffle, nowsta, quickbooks) — port the
   integration actions; these are also gated by the `apps/api` connector kill-order (§7). ~41 sites.
7. **Imports / exports / blob & file** (inventory/kitchen import, events export, document parse, task
   attachments, interaction attachments, contract document/history) — need Convex **file storage** actions
   (`ctx.storage`). ~12 sites.
8. **Composite writes** (`POST /api/accounting/invoices` with line items, `payments` create+process,
   `contracts/:id/send` = sign+document+email, `trash/restore` generic-by-entityType) — multi-step; express
   as a **Convex action/saga**, not a single governed mutation. ~26 sites.

**Always IR-first:** edit `manifest/source/*.manifest` → `pnpm manifest:compile && pnpm manifest:generate-convex
&& pnpm manifest:client` → gate with `pnpm manifest:ci`. Never hand-edit `convex/` or `*.generated.ts`.
A full machine-readable ledger of every file → call → bucket was produced this session (12-agent sweep);
regenerate it any time by re-running that classification over the `apiFetch` file list.

---

## 6. Superseded docs — ARCHIVED OUT OF REPO (2026-06-17)

22 outdated migration-era docs were moved to `C:/Projects/_capsule-pro-archive/docs-2026-06-17/`
(subpaths preserved; nothing deleted — restore by moving back). They are no longer in the repo
so sessions can't re-derive conflicting state from them. Archived set included:
`CONVEX_APP_MIGRATION_STATUS.md`, `MIGRATION_SUMMARY.md`, `IMPLEMENTATION_PLAN.md`,
`MIGRATION-DELETE-KEEP.md`, `CONVEX_APP_TYPECHECK_FINDING.md`, `DESIGN.md`, `DESIGN-sanity.md`,
`VISION.md`, `APPLY.md`, `SCRIPTS-AND-CONFIG.md`, `PROMPT_build.md`, `PROMPT_plan.md`,
`constitution.md`, `CONVEX-CONSTITUTION.md`, `CONVEXCONSTITUTION.md`, `migration-guide.md`,
`CLAUDE-FABLE-5.md`, `manifest/IMPLEMENTATION_PLAN.md`, `manifest/task_plan.md`,
`codex-plans/pre-migration-fixes.md`, `convex/migration-guide.md`, `convex/MIGRATION-DELETE-KEEP.md`.

**Kept in repo** — operational: `README.md`, `CLAUDE.md`, `AGENTS.md`. Authoritative **data**
(not plans): `REPOINT-MAP.md` (repoint targets), `manifest/convex-phase-out-registry.json` (delete/keep registry).

The canonical, proven reference implementation lives at `C:/Projects/convex-example`.

---

## 7. Script audit — resolving the half-and-half toward Convex (2026-06-17)

Full read of all root `package.json` scripts. The repo is mid-migration, so governance is
split between the legacy Prisma+Next dispatcher runtime and the compile-to-Convex path.
Decision: **everything resolves toward Convex** — switch what's safe now, delete the rest
*with* the runtime they guard.

### ✅ Switched now
- **`manifest:verify-invariants`** — removed the D22 **Prisma**-projection enum invariant (it
  was validating Prisma codegen inside the Convex `manifest:ci` gate). 19/19 invariants still
  pass. Convex output stays gated by `check-convex-drift` + `enforce-convex-architecture`.

### ❌ DELETE with the runtime (Phase 7 — they REQUIRE/POLICE the live Prisma+Next runtime)
Do not delete these in isolation: they guard code that is still load-bearing. They die in the
same change that removes `apps/api` dispatcher + `manifest/runtime` Prisma stores.
- **`check:manifest:structure`** (`tools/manifest-structure-audit.mjs`) — hard-requires
  `prisma-store.ts`, `prisma-json-store.ts`, `prisma-idempotency-store.ts`, `@repo/database`
  import, `PrismaJsonStore`, and the Next dispatcher route.
- **`check:manifest:domain`** (`tools/manifest-domain-drift-audit.mjs`) — approved-write-path
  is the Prisma stores; polices Prisma/SQL writes.
- **`manifest:check`** (`check.mjs`) — requires `apps/api/lib/manifest-runtime.ts` + the Next
  route generator `manifest/scripts/generate.mjs`.
- **`check:staged-write-routes`** + **`governance:verify-routes`** — police Next.js
  `apps/api/**/route.ts` handlers; in pure Convex, mutations ARE the API (no such routes).

### ⚠️ Switch to real CLI (cosmetic glue, no runtime risk — low priority)
- **`manifest:mermaid`** (`generate-mermaid.mjs`) → `manifest diagram`.
- **`manifest:build`** (`build.mjs`) → `manifest build` for the compile+generate half.

### Kill order (so nothing breaks the live app)
1. Finish **Track B** (92 `apiFetch` files → generated client) so nothing calls the `apps/api`
   dispatcher / Prisma runtime.
2. Delete `apps/api` dispatcher + `manifest/runtime` Prisma stores + the Prisma runtime factory.
3. Delete the four "DELETE with the runtime" scripts above.
4. Drop `packages/database/`, `apps/api/app/api/`, `manifest/runtime/` from the
   `enforce-convex-architecture` legacy allowlist — baseline should then be 0.
