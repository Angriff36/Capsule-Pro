# `manifest/` — Manifest artifact layout

Canonical home for Manifest artifacts. Each subdirectory has a single,
explicit purpose. New consumers and CI gates **must** target this layout.
As of 2026-06-03 the relocation is complete — the legacy `packages/manifest-ir/`,
`packages/manifest-runtime/`, and `packages/manifest-adapters/` paths are retired
and forbidden (constitution §4a/§19a).

| Subdir | Purpose | Authority |
|---|---|---|
| `source/` | The `.manifest` text source files (read by `manifest/scripts/compile.mjs`). | `manifest/source/*.manifest` |
| `ir/` | Compiled IR — the structured representation of all manifests. | `manifest/ir/kitchen.ir.json` |
| `runtime/` | The `@repo/manifest-runtime` package + generated sidecars (command registry, route manifest/helpers) consumed by the dispatcher, MCP route-conformance scanner, and test fixtures. | `manifest/runtime/{commands.registry.json,routes.manifest.json,routes.ts}` |
| **`governance/`** | **Full Manifest registries used by CI governance gates** (audit-governance, audit-bypasses, integration-check). Single source of truth for compliance auditing. | `manifest/governance/{commands,entities,bypasses}.json` |
| `reports/` | Output destination for audit reports (direct-write scans, schema drift, etc.). Gitignored. | `manifest/reports/` |

See [`docs/audits/manifest-artifact-layout-adr.md`](../docs/audits/manifest-artifact-layout-adr.md) for the relocation history.
