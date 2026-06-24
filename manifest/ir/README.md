# `manifest/ir/` — Compiled IR

The compiled IR lives here, at **`manifest/ir/kitchen.ir.json`** (despite the
`kitchen` prefix it contains the full aggregated IR for all manifest sources).
Re-run `node -e "..."` or `pnpm manifest:compile` and read entity/command counts from
`kitchen.ir.json` — do not hardcode counts in docs (they change every enrichment batch).

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

**Three Prisma schemas (do not conflate):**

| File | Role |
|------|------|
| `packages/database/prisma/schema.prisma` | **Live** DB schema — must reflect IR; edit via manifest source → compile → schema pipeline (see `manifest/scripts/script-index.md`). |
| `generated-schema.prisma` | IR projection for **CI drift gate** (`pnpm manifest:schema:check`). |
| `candidate-schema.prisma` | **Dev-only** additive harness (`emit-full-schema.mjs`); not deployed. |

Canonical script registry: `manifest/scripts/script-index.md`.
