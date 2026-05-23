# Manifest Generation Flow

## Config

- `manifest.config.yaml`
  - `src: packages/manifest-adapters/manifests/*.manifest`
  - `output: packages/manifest-ir/ir/kitchen/kitchen.ir.json`
  - projection output: `apps/api/app/api/kitchen`

## Script Entrypoints

- `scripts/manifest/check.mjs`
- `scripts/manifest/compile.mjs`
- `scripts/manifest/generate.mjs`
- `scripts/manifest/build.mjs`

## Scripts

- Compile sources to IR:
  - `pnpm manifest:compile`
- Generate code from IR:
  - `pnpm manifest:generate`
  - Default script generates `nextjs` `route` surface only (no client/type scaffolding output)
- One-step compile + generate:
  - `pnpm manifest:build`
- Structure and CLI check:
  - `pnpm manifest:check`
- Validate CLI availability:
  - `pnpm manifest:validate`
- Audit generated/manual route boundary compliance:
  - `pnpm manifest:route-audit`

## Current Limitation

In this environment, the linked `@manifest/runtime` package currently lacks required built dist files for CLI compile/generate commands.
If compile/generate fails with missing `dist/manifest/*` modules, rebuild/fix the linked runtime package first.

## Recommended Developer Sequence

1. Edit `.manifest` files under `packages/manifest-adapters/manifests`.
2. Run `pnpm manifest:compile`.
3. Review IR in `packages/manifest-ir/ir/kitchen/kitchen.ir.json`.
4. Run `pnpm manifest:generate`.
5. Run `pnpm manifest:route-audit`.
6. Verify boundaries and build:
   - `pnpm boundaries`
   - `pnpm build`

## Determinism Rule

Never hand-edit `packages/manifest-ir/ir/kitchen/*.json` or generated projection handlers.
Regenerate from `.manifest` sources to keep compile output deterministic.
