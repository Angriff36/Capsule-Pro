# `manifest/` — Manifest artifact layout

Canonical home for Manifest artifacts. Each subdirectory has a single,
explicit purpose. New consumers and CI gates **must** target this layout.

| Subdir | Purpose | Authority |
|---|---|---|
| `source/` | The `.manifest` text source files. Pointer doc; sources currently live in `packages/manifest-adapters/manifests/` because they ship with that package. | `packages/manifest-adapters/manifests/*.manifest` |
| `ir/` | Compiled IR — the structured representation of all manifests. Reference doc; the IR currently lives at `packages/manifest-ir/ir/kitchen/kitchen.ir.json` because the dispatcher and codegen scripts read it from there. | `packages/manifest-ir/ir/kitchen/kitchen.ir.json` |
| `runtime/` | Runtime sidecars consumed by the dispatcher, MCP route-conformance scanner, and test fixtures. Reference doc; sidecars currently live at `packages/manifest-ir/dist/commands.registry.json` and `packages/manifest-ir/ir/kitchen/kitchen.commands.json`. | `packages/manifest-ir/dist/commands.registry.json` |
| **`governance/`** | **Full Manifest registries used by CI governance gates** (audit-governance, audit-bypasses, integration-check). Single source of truth for compliance auditing. | `manifest/governance/{commands,entities,bypasses}.json` |
| `reports/` | Output destination for audit reports (direct-write scans, schema drift, etc.). Gitignored. | `manifest/reports/` |

See [`docs/audits/manifest-artifact-layout-adr.md`](../docs/audits/manifest-artifact-layout-adr.md) for the migration plan and the reason the runtime/IR artifacts still live under `packages/manifest-ir/`.
