# Autonomous 8h run — App quality burn-down (2026-06-13)

Goal: improve the app while the user is at work. Safe, verifiable, reversible work only —
small atomic commits, each gated by typecheck (api/app/runtime) + targeted tests. No DB
deploys, no branch merges, no high-blast-radius refactors unattended.

Baseline at start (measured, not assumed):
- app typecheck: **5 errors** (allergen-warning-banner.examples.tsx — pre-existing on main). api/runtime: green.
- biome: **2,815 errors + 2,189 warnings** → after tooling-dir exclude **2,784 + 2,185**.
- Active workstream (notes §51): ultracite/biome burn-down (11,987 → 2,784 errors).

Honesty rule (lessons.md #8): every error-count drop is classified **(A) real code fix** or
**(B) tool/scope change**. B is never reported as A. The biome exclude below is **(B)**.

Ping-pong rule (notes §51): after any blanket lint fix, run `pnpm manifest:generate` and
`git checkout` every modified `// Generated from Manifest IR - DO NOT EDIT` file before
committing. Commit producer bytes only — never hand-edit generated routes.

---

## Stage 0 — Baseline repair & scope  [in progress]
- [x] (B) Exclude `.aboardai/`, `.superpowers/`, `__previewjs__/` from biome (user request) — 2,815→2,784
- [x] (A) Fix `allergen-warning-banner.examples.tsx` — add nullable `escalatedAt`/`escalatedTo` to 5 fixtures
- [ ] Confirm api + app + runtime typecheck all green; commit baseline repair

## Stage 1 — Correctness-class lint (real bugs)  [highest value]
Each rule: `biome --write --unsafe --only=<rule>` OR manual, then typecheck + tests + commit.
- [ ] useParseIntRadix (20) — `parseInt(x)` → add radix (silent base bugs)
- [ ] noGlobalIsNan (11) — `isNaN` → `Number.isNaN` (coercion bug)
- [ ] noAssignInExpressions (18) — un-nest assignments
- [ ] noImplicitAnyLet (15) + noEvolvingTypes (27) — close type holes
- [ ] noArrayIndexKey (119) — stable React keys where a real id exists (skip where none)

## Stage 2 — Performance + accessibility (user-facing)
- [ ] noImgElement (8) + useImageSize (8) — `<img>` → `next/image` w/ dimensions
- [ ] noNamespaceImport (92) — `import * as` → named imports
- [ ] a11y: useButtonType (29), noSvgWithoutTitle (16), useKeyWithClickEvents (13),
      noLabelWithoutControl (155), useHtmlLang (1), useAriaPropsSupportedByRole (1)

## Stage 3 — Type safety
- [ ] noExplicitAny (313: 35 err + 278 warn) — real types where locally inferable; skip deep-inference sites

## Stage 4 — Mechanical readability (bulk, low risk)
- [ ] organizeImports (337), noSubstr (33→slice), useForOf (33), useOptionalChain (19),
      noVoid (27), noDelete (3), useLiteralKeys (12), noUseless{CatchBinding,Constructor,SwitchCase,Fragments}
- [ ] noNestedTernary (348) — extract to named helpers / if-else

## Stage 5 — useTopLevelRegex (1,393, largest bucket)  [careful]
- [ ] Hoist ONLY non-global, non-sticky regex literals (script-identified). /g and /y change
      `lastIndex` semantics when hoisted (notes §51) — leave those for per-site human review.

## Stage 6 — Latent functional bugs (TDD, only if time + clearly bounded)
Candidates from notes/memory (failing test first, then fix):
- [ ] AdminTaskActivity has no writer (notes §52)
- [ ] EventPlanningDraft.proposalId never written (notes §52)
- [ ] Reactions that reference non-input payload fields silently no-op (memory: reactions-payload-model)

---

## Review

### Lint baseline + batches (verified)
- Stage 0: tooling-dir biome exclude (B) + allergen typecheck baseline repair (A). Commits 1a8bd4856, 815507fc3.
- Batch 1: 1 real bug (search dead `||` fallback, db16064b4) + 43 safe mechanical autofixes (320669361). noDelete reverted (risky).
- Batch 2: 20 correctness fixes — isNaN→Number.isNaN, parseInt radix, iterable-callback (c4a99d1bf).
- True fixable surface = ~3,305 hand-written (1,662 are generated DO-NOT-EDIT routes I can't touch). Classifier: tools/classify-lint.mjs.
- Every batch gated: typecheck 29/29, tests app 341 / api 5281 / runtime 172. Zero generated routes touched (no ping-pong).

### Kanban v2 + Call Planner MERGE (user-requested, 2026-06-13)
- ✅ Merged `port/kanban-call-planner` → main (merge `3dcb462f0`). Backup: `backup/main-pre-kanban-merge-20260613`.
- ✅ Conflicts resolved: notes.md (kept §51 addendum + §52); allergen-banner duplicate `escalatedAt/escalatedTo` (both sides added — kept branch placement).
- ✅ Fixed branch's STALE runtime store metadata (8 new entities were missing) — regenerated, idempotent (ea9eec5e3).
- ✅ Verified GREEN: manifest:ci (no drift, 0 new violations), typecheck 29/29, tests app 341 / api 5281 / runtime 172.
- ✅ Migration `20260612195000_port_kanban_call_planner` confirmed purely additive (11 CREATE TABLE + indexes + 1 nullable col; zero destructive).
- ⛔ **`pnpm db:deploy` BLOCKED by safety classifier — NEEDS EXPLICIT USER SIGN-OFF.** Migration is committed but NOT applied to the dev DB.
      **Until deployed, the kanban/call-planner pages will 500 (tables don't exist).**
      To apply: run `! pnpm db:deploy` in the session, or authorize me to. Then `pnpm db:check` should show zero drift.
- Note: 2 governed bypasses (ExtractedDetail, ProposalAction) are now in bypasses.json baseline — merging = accepting them.

---

# (prior run) Port: Kanban v2 + Call Planner — MERGED to main 2026-06-13 (see Review above)
Migration deploy pending user sign-off. Full detail: manifest/notes.md §52.
