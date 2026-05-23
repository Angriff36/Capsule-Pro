# `manifest/runtime/` — Runtime dispatcher sidecars

Runtime sidecars currently live at:

| File | Purpose | Read by |
|---|---|---|
| `packages/manifest-ir/dist/commands.registry.json` | Flat-array kitchen-scope command index | `apps/api/lib/manifest/command-resolver.ts` (the dispatcher's runtime resolver) |
| `packages/manifest-ir/ir/kitchen/kitchen.commands.json` | Identical content, alternate path | `packages/mcp-server/src/lib/route-conformance-scan.ts` and test fixtures |
| `packages/manifest-ir/dist/routes.manifest.json` | Generated route manifest | Build-time codegen |
| `packages/manifest-ir/dist/routes.ts` | Generated route helpers | Imported by `apps/app/app/lib/routes.ts` re-export chain |

This directory is a layout marker. The runtime sidecars were **not**
relocated because every dispatcher/MCP/test caller reads from
`packages/manifest-ir/` paths. Migration plan in
[`docs/audits/manifest-artifact-layout-adr.md`](../../docs/audits/manifest-artifact-layout-adr.md).

## Why is the runtime sidecar kitchen-scoped?

The dispatcher's command-resolver only routes the kitchen surface today.
Non-kitchen commands exist in the governance registry
(`manifest/governance/commands.json`, 589 commands) but are not yet
dispatcher-routed. `enforce-surface` is the gate that flags drift; it's
currently in REPORTING mode (see `.github/workflows/manifest-ci.yml`).
