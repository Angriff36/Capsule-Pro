# CONVEX-MIGRATION.md — Single Source of Truth

> **This is the ONE authoritative doc for the Prisma/Neon/Next.js → Convex migration.**
> If any other doc in this repo disagrees with this file, **this file wins.** When you
> change migration state, update THIS file in the same commit. Do not start a new plan doc.
>
> Last verified: 2026-06-17 · Branch: `feat/convex-compile-path-a` · Last commit at write time: `0b3971976`

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
- **codemod dry-run: 0 `database.*` call sites** in `apps/app`/`apps/api` → **Track A (Prisma reads)
  is effectively complete.** Lingering `@repo/database`/`PrismaClient` imports are mostly dead/type
  imports (clean with `remove-dead-database-imports.mjs`), not live calls.
- **`apiFetch` shim usages in `apps/app`: 92 files (grep).** ← the real remaining queue (Track B).
  Per-endpoint repoint targets enumerated in **`REPOINT-MAP.md`** (REPOINT / CUSTOM / REVIEW).

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
| **3a** | **Prisma `database.*` reads → generated client** (codemod-assisted, Track A in §5) | **✅ effectively complete — codemod reports 0 `database.*` call sites; residual dead `@repo/database` imports + 4 architecture-baseline items remain** |
| **3b** | **`apiFetch` endpoints → generated client** (mapped in `REPOINT-MAP.md`, Track B in §5) | **▶ IN PROGRESS — 92 files in `apps/app`** ← real remaining work |
| 4 | Convex loaders/hooks for reactive reads where wanted | partial (loaders used; hooks selective) |
| 5 | Auth: Clerk→Convex | **largely done ✅ — `policyMode: "enforce"` already set; generated mutations patched with `resolveMutationAuth` (Clerk JWT). Remaining: end-to-end verification** |
| 6 | Data migration Postgres → Convex | not started |
| 7 | Remove Prisma: delete `packages/database/prisma`, domain API routes, prisma projection; empty the architecture baseline | not started |

**Current focus = Phase 3 (two mechanical tracks, see §5).** Don't hand-grind: Track A (Prisma
`database.*`) is codemod-assisted; Track B (`apiFetch`) is enumerated in `REPOINT-MAP.md`. The
`enforce-convex-architecture` baseline is the objective progress meter — it shrinks as files migrate.

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

---

## 5. Next concrete action — USE THE TOOLING, don't hand-grind

Two mechanical tracks. Both target the IR-generated client `apps/app/app/lib/manifest-client.generated.ts`
(regenerate it with `pnpm manifest:client` whenever IR changes).

**Track A — Prisma `database.*` reads (codemod-assisted):**
1. Dry run (reports buckets, changes nothing): `node manifest/scripts/codemod-prisma-to-manifest-client.mjs`
2. Apply the safe ones: add `--apply`. It auto-rewrites `database.X.findMany(...)` →
   `(await listX()).data` and `findUnique/findFirst` by id → `getX(id)`, idempotently (≤10 passes).
3. Handle the tail in `manifest/scripts/prisma-tail-sites.txt` by hand: writes
   (create/update/delete), aggregates (count/aggregate/groupBy), and `include` joins — the codemod
   intentionally refuses to auto-convert these. Port to commands/queries.

**Track B — `apiFetch` endpoints (mapped in `REPOINT-MAP.md`):**
1. Pick an endpoint. **REPOINT** → swap to the listed `manifest-client.generated` fn;
   **CUSTOM** → port the Convex action that existed on `main`; **REVIEW** → decide keep-shim vs. new query.

**After either track:** if IR changed, `pnpm manifest:compile && pnpm manifest:generate-convex && pnpm manifest:client`.
Then gate everything with `pnpm manifest:ci` and watch the `enforce-convex-architecture` count drop. Commit small.
Never hand-edit `convex/` generated files — the drift gate will fail.

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
