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

- `kitchen.ir.json` — full merged IR (source of truth for codegen + runtime).
- `kitchen.commands.json` — flat command index.
- `kitchen.merge-report.json` — per-compile merge/dedup report.
- `kitchen.provenance.json` — compiler version + (currently empty) content hashes.
- `candidate-schema.prisma` — an experimental Prisma-projection output (NOT the
  live schema; the live schema is hand-authored at
  `packages/database/prisma/schema.prisma`).
