# APPLY — installing the charter on capsule-pro-convex

This bundle was authored on a machine **without** the capsule-pro-convex repo. Apply it on the
remote (`/home/oc/projects/capsule-pro-convex`) and run the one-time verification before trusting
the gate.

## 0. Status of each file

| File | Status | Needs remote verification? |
|---|---|---|
| `CONSTITUTION.md` | **Final** | No |
| `AGENTS.md` | **Final** | No |
| `CLAUDE.md` | **Final** | No |
| `.github/workflows/manifest-governance.yml` | **Final** | Re-run once to confirm green |
| `manifest/governance/projection-options.json` | Stub — fill mappings | Yes |
| `manifest/governance/bypasses.json` | Empty (correct default) | No |
| `manifest/scripts/convex-projection.mjs` | Reference | **Yes — confirm package export path** |
| `manifest/scripts/generate-convex.mjs` | Reference | Yes |
| `manifest/scripts/check-convex-drift.mjs` | Reference | Yes |
| `manifest/scripts/check-guards.mjs` | Reference | Yes — tune SCAN_ROOTS |
| `manifest/scripts/compile-ir.mjs` | Reference (single-file) | **Yes — keep your merge if multi-file** |
| `manifest/scripts/build-governance-registries.mjs` | Reference | Yes |

## 1. Copy onto the remote

```bash
rsync -av --exclude APPLY.md --exclude package.scripts.json \
  ./capsule-pro-convex-charter/ /home/oc/projects/capsule-pro-convex/
```

## 2. Merge package.json scripts

Add the `scripts` from `package.scripts.json`. Then **REMOVE** every script below (Prisma/Neon/
prisma-projection — forbidden by CONSTITUTION §13):

- All `manifest:*` Prisma/SQL projections: `manifest:try-prisma`, `manifest:generate-metadata`,
  `manifest:generate-zod`, `manifest:generate-hooks`, `manifest:generate-schema`,
  `manifest:schema:*`, `manifest:kysely`, `manifest:drizzle`, `manifest:materialized-views`,
  `manifest:openapi*`, `manifest:react-query*`, `manifest:client`,
  `manifest:check-accessor-config*`, `manifest:audit*`, `manifest:coverage*`,
  `manifest:registries`, `manifest:routes:ir`, `manifest:verify-invariants`, `manifest:doctor`,
  `manifest:ci` (old), `manifest:build`, `manifest:check`, `manifest:compile`,
  `manifest:generate`, `manifest:generate-convex` (replaced).
- All Prisma/DB: `prisma:*`, `db:*`, `migrate*`, `predev` (if it runs `db:check`).
- `build`/`build:all` `pnpm prisma:check &&` prefixes → drop the prisma:check.

Also remove the dependencies: `@prisma/client`, `prisma`, `@repo/database`, and any
prisma-derived generator deps. Delete `packages/database/` and prisma schema dirs.

## 3. One-time verification (do NOT skip)

```bash
cd /home/oc/projects/capsule-pro-convex
pnpm install

# (a) Confirm the package export paths the scripts assume actually resolve:
node -e "import('@angriff36/manifest/projections').then(m=>console.log('projections:', !!m.getProjection))"
node -e "import('@angriff36/manifest/ir-compiler').then(m=>console.log('ir-compiler:', !!m.compileToIR))"
#  → if either prints undefined/throws, fix CONFIG.projectionsImport / compilerImport in the scripts.

# (b) Compile IR and generate Convex from real source:
pnpm manifest:ir
pnpm manifest:convex
git status convex/        # review the six generated files

# (c) Prove the drift gate catches drift (should FAIL, then pass after regen):
echo "// tampered" >> convex/mutations.ts
pnpm manifest:convex:check   # expect: ✗ CONVEX DRIFT (exit 1)
pnpm manifest:convex         # regenerate, restoring it
pnpm manifest:convex:check   # expect: ✓ No Convex drift

# (d) Prove the guards catch a planted violation (should FAIL):
#   add `ctx.db.insert(...)` to a non-generated file, run `pnpm manifest:guards`, expect failure, remove it.

# (e) Build registries:
pnpm manifest:governance     # writes manifest/governance/entities.json
```

Only after (a)–(e) behave as described should you commit and let CI enforce it.

## 4. Commit & lock

```bash
git checkout -b charter/manifest-convex
git add CONSTITUTION.md AGENTS.md CLAUDE.md .github/workflows/manifest-governance.yml manifest/
git commit -m "[governance] projection-only Manifest+Convex constitution + drift-gated CI"
```

Make `manifest-governance` a **required status check** on the default branch (GitHub → Settings →
Branches → branch protection) — this is what "locks it down in stone." Without required-check
enforcement, the gate is advisory.

## 5. Known gaps to close next (flagged honestly)

- **External HTTP door** (CONSTITUTION §6): decide keep/drop the `convex.http` surface. If no
  external callers, set `--surface` to exclude it and delete `convex/http.ts`.
- **Tenant-injection lint** (§9): the guards script does not yet statically prove tenant is
  server-injected (hard to do reliably). Treat as `MISSING ENFORCEMENT`; enforce by review until
  a targeted check exists.
- **compile-ir merge** (§14): if your IR is composed from many `.manifest` files with a real
  merge step, port that logic into `compile-ir.mjs`.
