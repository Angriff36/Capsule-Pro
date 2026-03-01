# Manifest Route Ownership — Handoff

> **Last updated:** 2026-02-28 (Agent 56, recording Agent 55's work)
> **Branch:** `codex/manifest-cli-doctor`
> **Published version:** `@angriff36/manifest@0.3.35`
> **Governing plan:** `tasks/manifest-route-ownership-plan.md`

---

## Current State

### What's Done (Phases 1–3 + Guardrail)

| Phase | Status | Agent | Summary |
|-------|--------|-------|---------|
| 1. Compile emits `kitchen.commands.json` | ✅ Done | 44 | 308 entries, deterministic, projection-agnostic |
| 2. Generator forward/mirror/method checks | ✅ Done | 44 | Unconditional overwrite for commands namespace |
| 2b. `--strict` semantics (Option B) | ✅ Done | 46–47 | Strict gate on ownership rules only |
| 3A. Orphan exemption fix | ✅ Done | 48 | `create-validated`/`update-validated` exempted correctly |
| 3B. Delete camelCase station dupes | ✅ Done | 48 | 4 routes deleted, test imports updated |
| 3C. Delete prep-lists/items dupes | ✅ Done | 48 | 6 routes deleted, 6 reference files updated |
| Guardrail: `OWNERSHIP_RULE_CODES` | ✅ Done | 49 | Canonical Set, strict gate fixed, 4 new tests |
| 4. Flip to `--strict` | ✅ Done | 50 | build.mjs + CI now enforce ownership rules |
| 5. Plan tests A, B, C, G | ✅ Done | 50 | 10 tests in manifest-build-determinism.test.ts |
| 6. Fix 3 known integrity issues | ✅ Done | 51 | Security gap, dead exports, legacy route deleted |
| 7. Eliminate 47 false-positive audit errors | ✅ Done | 53 | `executeManifestCommand` recognized, 33 exemptions reclassified |
| 8. Route conversions (113→102) + suppression | ⚠️ Partial | 54 | Phase 1 genuine (11 routes), Phase 2 suppression reverted |
| 9. Revert suppression + convert 3 contract routes | ✅ Done | 55 | Reverted blanket suppression, converted 3 event contract routes (102→99) |

### Audit Numbers (as of Agent 55)

```
Audited 535 route file(s) — 99 error(s), 41 warning(s)
Orphans: 0
Build: complete (exit 0, strict mode)
```

- **99 errors** — all `WRITE_ROUTE_BYPASSES_RUNTIME` (manual write routes not using `runCommand`)
- **41 warnings** — read-quality rules (soft-delete, tenant scope, location filter)
- **0 orphans** — all command routes have IR backing
- **0 ownership-rule findings** — strict gate passes

Error count trajectory: 172 (Agent 50) → 171 (Agent 51) → 124 (Agent 53) → 102 (Agent 54 Phase 1) → 0 (Agent 54 Phase 2, suppressed) → 102 (Agent 55 revert) → 99 (Agent 55, 3 genuine conversions).

**Honest A/B decomposition (171→99 = 72 fewer):**
- **14 from route conversion (A):** Agent 54 converted 8 routes (-11), Agent 55 converted 3 routes (-3)
- **47 from audit tool change (B):** Agent 53 expanded regex to recognize `executeManifestCommand` — those routes genuinely use the runtime, but the reduction came from changing what the tool detects, not from converting route code
- **11 from churn (net zero):** Agent 54 Phase 2 suppression was reverted by Agent 55

The burn-down is 80% tool-surface change, 20% genuine conversion. See Lesson 8 in `tasks/lessons.md`.

---

## What's Active: `--strict` Enforcement (Phase 4 — Complete)

### What `--strict` Enforces

With `--strict` active (flipped by Agent 50), the build **fails** if any of these appear:
- `COMMAND_ROUTE_ORPHAN` — command route with no IR backing
- `COMMAND_ROUTE_MISSING_RUNTIME_CALL` — command route not calling `runCommand`
- `WRITE_OUTSIDE_COMMANDS_NAMESPACE` — non-exempted write route outside commands/

The 172 `WRITE_ROUTE_BYPASSES_RUNTIME` errors and 41 read-quality warnings are **reported but never block** the build (they are quality/hygiene rules, not ownership rules).

### Where `--strict` Is Wired

| Location | What changed | Agent |
|----------|-------------|-------|
| `scripts/manifest/build.mjs` | Added `--strict` flag; `console.warn` → `process.exit(1)` | 50 |
| `.github/workflows/manifest-ci.yml` | Added `--strict` flag; removed `continue-on-error: true` | 50 |

### If a New Ownership Violation Appears

The build will fail. To fix:
1. Run `node scripts/manifest/build.mjs` locally to see the finding
2. Either fix the route (preferred) or add it to the exemptions registry with a reason
3. The exemptions registry is at `packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json`

---

## Remaining Work (Beyond Phase 4)

### Burn-down 99 `WRITE_ROUTE_BYPASSES_RUNTIME` errors
These are manual write routes that bypass the runtime. Each needs to either:
- Be migrated to use `runCommand` / `executeManifestCommand` / `createManifestRuntime` (preferred)
- Be added to the exemption registry with a reason

**Why progress has slowed:** Most remaining bypass routes are complex composite operations — multi-table `$transaction`s, external API calls (email, inventory), or generic updates that don't map 1:1 to specific IR commands. Forcing these into `executeManifestCommand` would either break atomicity guarantees or require new manifest commands that don't exist yet. Future progress requires either:
1. New manifest command definitions for composite operations
2. Event-driven side-effect infrastructure (e.g., email after contract send)
3. Aggregate command patterns (e.g., `Shipment.completeWithItems`)

### Known Issues (resolved by Agent 51)
- ~~`app/conflicts/detect/route.ts`~~ — **FIXED**: Deleted `app/conflicts/` directory (orphaned non-API path with no auth guard). The canonical endpoint at `app/api/conflicts/detect/route.ts` has proper auth + tenant scoping.
- ~~`user-preferences/route.ts`~~ — **FIXED**: Removed dead exports `GET_KEY`/`PUT_KEY`/`DELETE_KEY` (invalid Next.js handler names). Only valid `GET` and `POST` remain.
- ~~`kitchen/prep-lists/save/route.ts`~~ — **FIXED**: Deleted legacy direct-Prisma route. The manifest-backed `save-db/route.ts` (uses `runCommand`) is the canonical path. Removed stale exemption from registry. Updated `routes.ts` to point to `save-db`.

### Plan Tests (implemented by Agents 50–51)
All plan tests are implemented in `apps/api/__tests__/kitchen/manifest-build-determinism.test.ts` (15 tests):
- **Test A** ✅ — Determinism: `commands.json` sorted, derivable from IR, correct schema
- **Test B** ✅ — Determinism: all generated routes have markers and POST exports
- **Test C** ✅ — Manual GET routes untouched by generator (no generated markers)
- **Test G** ✅ — Mirror check: reverse mirror (disk→commands.json) is exact; forward mirror tracks coverage (240/264 = 90.9%)
- **Test H** ✅ — Route integrity: no auth-gap duplicates, valid Next.js exports only, legacy routes deleted, exemptions registry clean

### Domain Migration (long-term)
Routes that should eventually move to the commands namespace:
- `accounting/**`, `administrative/**`, `payroll/**` — full domains not in manifest
- `training/**` — legacy manual writes
- `timecards/bulk` — model as `Timecard.bulkUpsert` aggregate command
- Various event/staff/inventory routes listed in plan §4

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `packages/manifest-runtime/packages/cli/src/commands/audit-routes.ts` | Audit logic + `OWNERSHIP_RULE_CODES` export |
| `packages/manifest-runtime/packages/cli/src/commands/audit-routes.test.ts` | 31 tests (707 total in suite) |
| `packages/manifest-runtime/packages/cli/src/commands/audit-routes-exemptions.json` | Exemption registry (~130 entries) |
| `packages/manifest-ir/ir/kitchen/kitchen.commands.json` | 308 IR command entries |
| `scripts/manifest/build.mjs` | Build pipeline (compile → generate → route surface → audit) |
| `scripts/manifest/compile.mjs` | Emits `kitchen.commands.json` |
| `scripts/manifest/generate.mjs` | Forward/mirror/method validation |
| `.github/workflows/manifest-ci.yml` | CI job `manifest-route-audit` |
| `apps/api/__tests__/kitchen/manifest-build-determinism.test.ts` | 15 tests: A, B, C, G, H (determinism + integrity) |
| `tasks/manifest-route-ownership-plan.md` | The governing plan |

---

## Publishing Checklist

When making CLI changes:

1. Edit source in `packages/manifest-runtime/packages/cli/src/commands/`
2. Run tests: `npm test` in `packages/manifest-runtime/`
3. Bump version in `packages/manifest-runtime/package.json`
4. Build: `npm run build:lib && npx tsc -p packages/cli/tsconfig.json`
5. Create `.npmrc` in package dir:
   ```
   //npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
   @angriff36:registry=https://npm.pkg.github.com
   ```
6. Publish: `npm publish --ignore-scripts`
7. Delete `.npmrc`
8. Update 4 consumer `package.json` files: root, `apps/api`, `apps/app`, `packages/manifest-adapters`
9. Run `pnpm install --no-frozen-lockfile`
10. Verify: `node scripts/manifest/build.mjs`

---

## Commands for the Next Agent

```bash
# Run the full build pipeline (includes audit as Step 4)
node scripts/manifest/build.mjs

# Run manifest repo tests (must stay green)
npm test   # from packages/manifest-runtime/

# Check manifest CLI version
pnpm exec manifest --version
# Should show: 0.3.35

# List only orphan findings (should be 0)
node scripts/manifest/build.mjs 2>&1 | grep COMMAND_ROUTE_ORPHAN
```

---

## Constraints (carry forward from AGENTS.md)

- **Do NOT mix product behavior changes with enforcement wiring.** Orphan cleanup,
  route deletions, and domain migrations are separate PRs.
- **Spec changes first, then tests, then implementation.** If any ownership rule
  semantics need to change, update the plan first.
- **`npm test` in the manifest repo must remain green.** No exceptions.
- **The `.npmrc` token must never be committed.** Always revert after publish.
- **`OWNERSHIP_RULE_CODES` is the single source of truth** for what constitutes an
  ownership rule. Do not scatter magic strings — always reference the Set.
