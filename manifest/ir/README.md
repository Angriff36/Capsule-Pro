# `manifest/ir/` — Compiled IR

The compiled IR currently lives at
**`packages/manifest-ir/ir/kitchen/kitchen.ir.json`** (despite the
`kitchen` prefix it contains the full aggregated IR for all 86 manifest
sources — 130 entities, 589 commands).

This directory is a layout marker. The IR was not relocated in the
artifact-layout cleanup because:

- The dispatcher tests reference `packages/manifest-ir/ir/kitchen/kitchen.commands.json` (a sidecar emitted next to the IR).
- The codegen scripts (`scripts/manifest/build.mjs`, `generate.mjs`, `generate-all-routes.mjs`) write into `packages/manifest-ir/ir/kitchen/`.
- `packages/mcp-server/src/lib/route-conformance-scan.ts` reads from there.

A follow-up PR can:

1. Retarget every consumer to read from `manifest/ir/`.
2. Update the codegen scripts to write there.
3. Drop the `kitchen` directory prefix entirely (the name is historical and misleading).

See [`docs/audits/manifest-artifact-layout-adr.md`](../../docs/audits/manifest-artifact-layout-adr.md) for context.
