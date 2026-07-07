# Handoff — Manifest 3.3.1 create-regression fix + the empty-UUID create bug

> **✅ EXECUTED 2026-07-07** — Part 4 (WS0 pilot) done: commits `f01e8c2a7` (manifest fix + regen + migration `20260707125708_training_assignment_uuid_not_null`) and `70f364cd9` (training route: phantom `user_id`→`auth_user_id` + scoreless-complete score default). Assign→start→complete→refresh proven in the real UI against Postgres. Results + batch recipes stamped in `manifest/NATIVE-REWRITE-PLAN.md` WS0 and memory `ws0-pilot-complete-2026-07-07`. Remaining: Ryan decides whether to sweep the other ~187 uuid="" sites.

**Date:** 2026-07-07 · **Author:** prior Fable session · **Capsule branch:** `feat/manifest-3.0-native`

---

## TL;DR

1. **DONE & SHIPPED:** The `@angriff36/manifest` 3.3.0 create regression is fixed, published as **3.3.1**, and Capsule is pinned/installed on it. Proven live: `Notification.create` → 200 with a bare uuid.
2. **STILL BROKEN (next task):** governed **creates whose command copies a value into a `@db.Uuid`/required field via a rename-mutate or context** still fail against Postgres. The 3.3.1 fix *unmasked* this. Training assignment is the pilot case.
3. **Everything below is committed** on `feat/manifest-3.0-native` (not pushed — pushing is the only step left manual per repo policy). No dangling uncommitted work.

---

## Part 1 — The shipped Manifest fix (complete)

**Bug:** 3.3.0 added composite-key runtime identity and, in `RuntimeEngine.prepareCreateData`, wrote the encoded key tuple `"tenantId|id"` into the persisted `id` for every `key`-declaring entity. So `store.create()` got `id="tenantId|id"` → Postgres `invalid input syntax for type uuid` on **every** generic-store create. `GenericPrismaStore` itself was byte-identical 3.2.0↔3.3.0; the regression was purely the engine.

**Fix (Manifest repo `C:\Projects\Manifest`):** `src/manifest/runtime-engine.ts` — guard the composite overwrite so it only applies when the key has NO real `id` column:
```ts
if (entity.key && entity.key.length > 0 && !entity.key.includes("id")) {
  mergedData.id = this.compositeId(entity, mergedData);
}
```
Keyless composites (e.g. `key [region, code]`) still get the synthetic handle; `key [tenantId, id]` keeps its bare uuid. Regression test: `src/manifest/runtime-engine.composite-key-persisted-id.test.ts` (proven RED without the fix, GREEN with). Full suite green.

**Release:** commit `a49807e` on Manifest `main` → triggered `cut-release.yml -f version=patch` → CI green → **npm `@angriff36/manifest@3.3.1`** published (verified `npm view` = 3.3.1). NOTE: local Manifest `main` is one commit behind origin (the CI-authored `[release] v3.3.1` commit is on origin; `git pull` to sync).

**Capsule uptake:** `pnpm manifest:update` bumped all four pins to **3.3.1** (`package.json`, `apps/api/package.json`, `manifest/runtime/package.json`, `packages/mcp-server/package.json`) — the `manifest/runtime` one was the sneaky one (it's what the API actually loads). Regenerated: `pnpm manifest:compile`, `generate-command-param-schemas.mjs`, `manifest:client`, `manifest:ir:embed`. **API server must be restarted with a clean cache** to pick up a new package version — `.next-dev` caches the vendored engine (see Gotchas).

---

## Part 2 — The unmasked bug (NEXT TASK = WS0)

**Symptom:** `TrainingAssignment.create` → 500 `invalid input syntax for type uuid: ""`.

**Root cause (PROVEN, engine store-op trace):**
```
TrainingAssignment.create store ops: [ ["CREATE", ""], ["UPDATE", "c4a2402f-…"] ]
```
The engine **inserts the row first** from the create *bootstrap* (defaults + params **whose names match a field**), then runs the command's `mutate` actions **afterward as an UPDATE**. Training's create takes param `staffMemberId` but the field is `employeeId` (`training-module-rules.manifest:353` `employeeId: uuid? = ""`, `:407` `mutate employeeId = staffMemberId`). Names differ → `employeeId` is NOT seeded at insert → it inserts as its `""` default → Postgres `@db.Uuid` rejects it before the UPDATE runs. In-memory stores (unit tests) accept `""` then update, so **tests pass and hide this**.

Contrast `TimeOffRequest.create` (`time-off-request-rules.manifest:44/50`): param IS `employeeId` (matches field) → filled at insert → works. (But `:10 employeeId: uuid = ""` is a NOT-NULL field with a `""` default — a landmine that only survives because callers pass the same-named param.)

**Scale:** `rg 'uuid.*= ""' manifest/source` = **188 lines / 69 files** (this is your reviewer's "188 UUID defaults" item). Any of these that (a) is required/NOT-NULL, or (b) is filled by a rename-mutate/context, is broken against Postgres now that creates reach the DB.

**Rule of thumb:** a create param that feeds a `@db.Uuid`/required field via `field = otherParam` or `= user.id` is broken. Same-named param → fine.

**The plan:** `manifest/NATIVE-REWRITE-PLAN.md` — I added **WS0 (do first)** with this proof, the fix strategy, and the per-domain migration cadence. Fix shapes:
- **Nullable uuid (`uuid? = ""`):** drop the `= ""` → inserts `null` (valid), the later mutate fills it. (Column loses `@default("")` → migration.)
- **Required uuid set only by a mutate (e.g. `assignedBy`):** null/`""` both fail at insert → fix at source so the value is present at insert time (rename the param to match the field, accept it as a create param, or make the column nullable). Decide per field.

---

## Part 3 — Capsule work already done (COMMITTED on `feat/manifest-3.0-native`, not pushed)

Committed in two commits (staged by explicit pathspec — this branch carries unrelated concurrent-loop files, so **never `git add -A`**):
- `apps/app/app/(authenticated)/staff/training/[id]/components/assign-training-dialog.tsx` — **fixed two real dialog bugs:** (1) employee picker read the empty `StaffMember` table → repointed to `listUsers` (`/api/staff/employees/list`, the real 18 employees); (2) implemented "Assign to All" as one create per employee; sends `moduleTitle`.
- `manifest/source/staff/training-module-rules.manifest` — `TrainingAssignment.create`: made `id` + denormalized fields **optional** (so the dialog's minimal payload passes the param gate), added `mutate assignedBy = user.id`. ⚠️ **These are necessary but NOT sufficient** — the create still fails on `employeeId=""` (and `assignedBy` is NOT-NULL, set post-insert, so it also needs the WS0 treatment). Don't assume training works yet.
- `manifest/NATIVE-REWRITE-PLAN.md` — corrected compiler version 3.2.1→3.3.1, added the 3.3.1 note, added **WS0** with the proof above, added a gap-matrix row + success criterion.
- Four `package.json` pins + `pnpm-lock.yaml` — 3.3.1.
- Regenerated artifacts: `manifest/ir/kitchen.ir.json`, `apps/api/lib/manifest/kitchen.ir.generated.json`, `manifest/runtime/src/generated/command-param-schemas.generated.ts`, `manifest/runtime/command-source-map.json`, `kitchen.merge-report.json`, `kitchen.provenance.json`, `module-graph.json`.

`.agents/skills/capsule-manifest-rebuild/SKILL.md` — DELETED 2026-07-07 per Ryan: its content (incl. the concurrent PR #78 native-ownership update) was folded into the single global manifest skill at `~/.claude/skills/manifest/SKILL.md`, which is now the one authority for DSL + capsule pipeline.

**Committed as:** (1) `[deps]` 3.3.1 pin bump + regen + training command wiring, (2) `[docs]` plan + handoff. The WS0 training-source fix + migration is the next commit (not done yet). Per `AGENTS.md`, agents commit often without asking; only `git push` stays manual.

---

## Part 4 — Immediate next step (WS0 pilot)

Fix `TrainingAssignment` end-to-end and prove the flow:
1. `training-module-rules.manifest`: `employeeId: uuid? = ""` → `employeeId: uuid?`. For `assignedBy` (currently `uuid`, NOT-NULL, set only by the post-insert `mutate assignedBy = user.id`): make it `uuid?` OR seed it at insert. Verify `user.id` resolves in the update step (the employeeId trace shows param-mutates DO persist via the UPDATE).
2. Regen (property + command change): `pnpm manifest:compile · generate-metadata · schema:full · client · generate-hooks · openapi`, then `pnpm manifest:ir:embed`.
3. Migration: `pnpm db:dev --create-only --name training_assignment_uuid_defaults` (never hand-author SQL), review the dropped-default/nullability SQL, `pnpm db:deploy`, `pnpm db:check`.
4. Restart API clean (Gotchas), then verify in the real UI at `http://localhost:2221/staff/training/<moduleId>`: assign employee → `/staff/my-training` → start → complete → refresh → confirm persistence. **A Postgres-backed smoke test is mandatory — in-memory tests won't catch this class.**
5. Then decide with Ryan whether to sweep the other ~187 (WS0 batches) or pause.

---

## Gotchas / environment

- **API restart:** the dev stack runs under `turbo run dev:infisical --filter=./apps/api --filter=./apps/app --parallel`. To restart just the API on 3.3.x or after regen: `npx kill-port 2223 && rm -rf apps/api/.next-dev && (pnpm --filter api run dev:infisical &)` then wait for "Ready in". **You must `rm -rf apps/api/.next-dev`** — turbopack caches the vendored `@angriff36/manifest` engine and will keep serving the old version (chunk rehashes but code is stale) otherwise. Infisical is already authenticated (no prompt). Never `taskkill //F //IM node.exe`.
- **In-memory vs Postgres:** the whole bug class is invisible to unit tests (MemoryStore accepts `""`/null then updates). Only real Postgres `@db.Uuid` rejects the bootstrap insert. Always smoke-test creates against the running app.
- **⚠️ STRIPE IS LIVE:** `apps/api/.env.local` has an `sk_live_` key; the API runs with it. Do **not** trigger the payment-refund flow. (App/root `.env.local` are `sk_test_`.)
- **Diagnostic harnesses (scratchpad, reusable):** `…/scratchpad/compare-probe.mjs` (runs a create through the installed engine with a mock store that logs CREATE/UPDATE ops — how the persist-before-mutate trace was captured) and `ab-create.mjs` (per-version A/B). Point them at `require.resolve('@angriff36/manifest/.../dist/manifest/runtime-engine.js', {paths:['manifest/runtime']})`.
- **Original 4-finding task is stale-but-open:** this whole thread started from the `MANIFEST_GOVERNED_WRITE_BYPASS` findings in `combinedanalysis.txt` (verdicts saved in memory `manifest-bypass-audit-verdicts-2026-07-07`). The other post-change UI flows (event file attachment, proposal default switching) were never reached — they may hit the same empty-UUID create class.

## Memory pointers (`~/.claude/projects/C--projects-capsule-pro/memory/`)
- `manifest-3.3.0-generic-store-create-regression-2026-07-07.md` — the shipped fix, proven cause.
- `training-assignment-ui-broken-2026-07-07.md` — the picker/param/assignedBy chain.
- `manifest-bypass-audit-verdicts-2026-07-07.md` — the original 4 findings' verdicts.
