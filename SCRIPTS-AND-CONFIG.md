# Scripts & Config — the real ones (do not reinvent)

capsule-pro **already has** the full Manifest→Convex pipeline. Do not add parallel scripts.
This is the authoritative map of what exists and what each does. Verified against
`C:\projects\capsule-pro` @ `feat/convex-compile-path-a` and the POC `convex-example`.

## Pipeline (the path A: `.manifest` → IR → Convex)

| Command | Script | Does |
|---|---|---|
| `pnpm manifest:compile` | `manifest/scripts/compile.mjs` | `compileProjectToIR` (`@angriff36/manifest/multi-compiler`) over `manifest/source/**/*.manifest` → **`manifest/ir/kitchen.ir.json`** (canonical merged IR; per-manifest shards under `manifest/ir/shards/`) |
| `pnpm manifest:generate-convex` | `manifest/scripts/generate-convex.mjs` | `ConvexProjection` (`@angriff36/manifest/projections/convex`) over the IR → `convex/{schema,queries,mutations,crons,http,sagas}.ts`. Options read from `manifest.config.yaml`. |
| `pnpm manifest:client` | `manifest/scripts/generate-convex-client.mjs` | Generates the frontend trio in `apps/app/app/lib/`: `manifest-types.generated.ts`, `manifest-client.generated.ts`, `manifest-hooks.generated.ts` |
| `pnpm manifest:check-convex-drift` | `manifest/scripts/check-convex-drift.mjs` | **Drift lock** — committed `convex/` must equal a fresh regen (`:self-test` available) |
| `pnpm manifest:enforce-convex-architecture` | `manifest/scripts/enforce-convex-architecture.mjs` | **Architecture guard** (baseline-based). `:strict` blocks any violation; `:save-baseline` re-snapshots |
| `pnpm manifest:ci` | — | The full gate (chains all of the above + `verify-invariants`, `validate`, `registries`, governance `git diff`) |

`pnpm manifest:ci` =
`compile && verify-invariants && validate && generate-convex && check-convex-drift && enforce-convex-architecture && registries && git diff --exit-code manifest/governance/{commands,entities}.json`

## Migration helpers (already in the repo)

| Script | Does |
|---|---|
| `manifest/scripts/codemod-prisma-to-manifest-client.mjs` | `database.X.findMany/findUnique` → `listX()/getX()` (report; `--apply` for simple `findMany`) |
| `manifest/scripts/migrate-prisma-imports.mjs` | rewrite `@repo/database` imports |
| `manifest/scripts/remove-dead-database-imports.mjs` | drop dead Prisma imports |
| `manifest/scripts/cleanup-generated-orphans.mjs` | prune stale generated files |

## Projection config — lives in `manifest.config.yaml` (NOT a separate json)

`manifest/scripts/read-config.mjs` is the single source of truth. The convex block:

```yaml
projections:
  convex:
    output: convex/
    options:
      referenceMode: stringId      # app-level string UUIDs (matches the frontend), NOT convex _id
      emitEventsTable: true
      eventsTable: manifestEvents   # capsule-pro uses manifestEvents (the POC used auditEvents)
      policyMode: enforce           # capsule-pro targets prod (POC used skip for dev)
```

**`stringId` is load-bearing:** the whole frontend and the generated client use string UUIDs
(`getEvent(id: string)`). Do not switch to `convexId`.

The same file still carries a `nextjs` projection block (Path B → `apps/api` read routes). It is
**LEGACY** — being phased out; Convex queries in `apps/app` are the path forward.

## The architecture guard, precisely (`enforce-convex-architecture.mjs`)

Baseline-driven (grandfathers existing violations via `manifest/governance/baselines/convex-architecture.json`,
~289 entries; fails on NEW ones). Forbidden patterns:

- `from "@prisma/client"` — use the Convex projection
- `from "@repo/database"` — use the generated client / Convex queries
- `prismaOverride` — legacy Prisma transaction bridging
- `createManifestRuntime` — the runtime-interpreter path; call generated Convex mutations instead
- hand-written Convex `mutation(` outside generated `convex/` files

As you migrate, the baseline shrinks (re-snapshot with `:save-baseline`); `:strict` requires zero.
