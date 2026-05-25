# `manifest/governance/` — Canonical governance registries

These files are the **single source of truth** for CI governance
gates (audit-governance, audit-bypasses, integration-check, enforce-surface).

| File | Producer | Format |
|---|---|---|
| `commands.json` | `pnpm manifest:registries` (wraps `manifest emit registries --ir manifest/ir/kitchen.ir.json --out manifest/governance`) | Wrapped envelope `{irHash, compilerVersion, commands: [...]}`. |
| `entities.json` | Same | Wrapped envelope. |
| `bypasses.json` | Hand-authored. Schema validated by `pnpm exec manifest audit-bypasses`. | `{ version, bypasses[] }`. |

## Rules

1. Do not regenerate by editing the JSON directly — run `pnpm manifest:registries`.
2. Do not point governance CI gates at the kitchen-scoped runtime sidecars. The runtime registry lives at `manifest/runtime/commands.registry.json`.
3. Do not duplicate these files elsewhere. The "single source of truth" only works if there is a single source.
4. After editing `bypasses.json`, run `pnpm exec manifest audit-bypasses --registry manifest/governance/bypasses.json --strict-expiry` locally.
5. The binding Manifest Integration Charter is at the repo root: `constitution.md`. All governance rules derive from it.
