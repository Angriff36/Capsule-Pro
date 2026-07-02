# `manifest/ir/` — Compiled IR

The compiled IR lives here, at **`manifest/ir/kitchen.ir.json`** (despite the
`kitchen` prefix it contains the full aggregated IR for all manifest sources —
189 entities, 952 commands as of this writing).

This is the canonical, single home for the IR. The legacy
`packages/manifest-ir/` location was retired (2026-06-03) — every consumer now
reads from `manifest/ir/`:

- The codegen scripts (`manifest/scripts/build.mjs`, `compile.mjs`,
  `generate.mjs`) write into `manifest/ir/`.
- `packages/mcp-server/src/lib/route-conformance-scan.ts` reads
  `manifest/ir/kitchen.commands.json` and `manifest/runtime/routes.manifest.json`.
- The manifest-editor settings API (`apps/app/app/lib/manifest-editor/kitchen-ir.ts`)
  reads `manifest/ir/kitchen.ir.json`.

Files in this directory:

- `kitchen.ir.json` — full merged IR (canonical for validate/codegen; large monolith).
- `shards/*.ir.json` — per-source IR shards (one per `.manifest`; smaller diffs).
- `module-graph.json` — source → entity/command counts (module graph index).
- `kitchen.commands.json` — flat command index.
- `kitchen.merge-report.json` — per-compile merge/dedup report.
- `kitchen.provenance.json` — compiler version + content hashes.

**Prisma schema:**

`packages/database/prisma/schema.prisma` is the live DB schema and is
**generated natively** by the Manifest prisma projection from the IR — it is not
hand-authored (source of truth: `manifest.config.yaml` → `projections.prisma`).
Regenerate with `pnpm manifest:generate` (via `generate --all`) or the
prisma-only form `manifest generate -p prisma -o packages/database/prisma`.
The CI drift gate is native: `pnpm manifest:schema:check` runs the projection in
`--check` mode against the committed schema. (The retired glue —
`generate-full-schema.mjs`, `generated-schema.prisma`, `prisma-options.config.json`,
`candidate-schema.prisma`/`emit-full-schema.mjs` — is gone; the native projection
supersedes it.)
