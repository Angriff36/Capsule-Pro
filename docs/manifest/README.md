# Manifest Docs (Capsule-Pro)

This folder is the Capsule-Pro integration guide for Manifest.

## Current Source Of Truth

Use these docs for the active repo structure:

- [structure.md](./structure.md): canonical directory layout and ownership
- [generation.md](./generation.md): compile/generate/build commands
- [INTEGRATION.md](./INTEGRATION.md): runtime + adapter architecture in `apps/api`
- [USAGE.md](./USAGE.md): day-to-day developer workflow
- [FILES_TO_EDIT.md](./FILES_TO_EDIT.md): edit vs generated boundaries

Route boundary audit command:

- `pnpm manifest:route-audit` checks that write routes use runtime command execution and read routes preserve expected scoping filters.

## GitHub Packages Auth (Required)

Manifest package publish/install in this repo uses GitHub Packages. The required auth env var is:

- `GITHUB_PACKAGES_TOKEN`

Do not use `NPM_TOKEN` in this repo for package registry auth. `.npmrc` is wired to `GITHUB_PACKAGES_TOKEN`.

## Canonical Paths

- Manifest sources: `packages/manifest-adapters/manifests/*.manifest`
- Compiled IR artifact: `packages/manifest-ir/ir/kitchen/kitchen.ir.json`
- Compiled provenance: `packages/manifest-ir/ir/kitchen/kitchen.provenance.json`
- IR access helpers: `packages/manifest-ir/src/index.ts`
- API runtime seam: `apps/api/lib/manifest/runtime.ts`
- API store seam: `apps/api/lib/manifest/store-prisma.ts`
- API outbox seam: `apps/api/lib/manifest/outbox.ts`
- API response seam: `apps/api/lib/manifest/response.ts`
- API telemetry seam: `apps/api/lib/manifest/telemetry.ts`
- Projected API output: `apps/api/app/api/kitchen/**/route.ts`
- Quarantined legacy paths: `archive/manifest-legacy-2026-02-10/**`

- Tools you can use: these are in the root package.json
    manifest-ir-schema-validator: validates capsule-pro IR files.
    manifest-IR-consumer-test-harness: runs fixture scripts against capsule-pro IR/manifest files.
    IR-diff-explainer: compare before/after capsule-pro IR outputs.
    manifest-devtools: manual local UI for debugging/profiling IR/guards.
    generator-field-access-guard: use if you are validating generator field reads.
    stress-simulator and manifest-ir-test-harnessv2: build first, then run (optional/advanced).

## Operational Invariants (2026-02-12)

- Manifest compile/generate workflow is stable:
  - `pnpm manifest:compile`
  - `pnpm manifest:generate`
- Generated Next route handlers are materialized only from generated `route.ts` files (marker-gated copy).
- Non-generated/manual `route.ts` files are not overwritten during materialization.
- Generator path normalization is enforced so projection output is rooted under:
  - `apps/api/app/api/kitchen`
- Post-generation guard fails if any generated path contains duplicated nested API segments (for example `.../apps/api/app/api/...` under output root).
- `apps/api/app/api/kitchen/apps` must not exist after generation.
- Workspace build enforces Prisma schema validation first:
  - root `build` script runs `pnpm prisma:check && turbo build`.

## Historical Docs

Some files in this directory are historical test notes from pre-restructure work and can reference removed paths such as `packages/kitchen-ops` or `packages/manifest`.

When there is any mismatch, follow the five "Current Source Of Truth" docs above.

## External Spec

Official Manifest language specification and upstream docs live at:

- [../manifest-official](../manifest-official)
