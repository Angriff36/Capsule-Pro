# Using Manifest In Capsule-Pro

This guide documents the active Manifest workflow in this repo.

## Current Architecture

Capsule-Pro is IR-first:

1. Author `.manifest` files under `packages/manifest-adapters/manifests`.
2. Compile to IR into the root `ir` artifact.
3. Optionally generate route handlers into `apps/api/app/api`.
4. Keep runtime wiring and side-effect adapters in `packages/manifest-adapters` and `apps/api/lib/manifest-runtime.ts`.

Manifest core is consumed from `node_modules/@manifest/runtime`.

## Required Commands

From repo root:

```bash
pnpm manifest:check
pnpm manifest:compile
pnpm manifest:generate
pnpm manifest:route-audit
pnpm boundaries
```

One-shot compile + generate:

```bash
pnpm manifest:build
```

## Typical Developer Loop

1. Edit a source module in `packages/manifest-adapters/manifests/*.manifest`.
2. Run `pnpm manifest:compile`.
3. Inspect generated IR in `ir`.
4. Run `pnpm manifest:generate` if route projections are needed.
5. Run `pnpm manifest:route-audit` to validate runtime-write/read-scope boundaries in API routes.
6. Run `pnpm boundaries` to catch architecture drift.

## Runtime Integration Surface

Current integration seam:

- `packages/manifest-adapters/src/index.ts`: runtime factories and command wrappers
- `packages/manifest-adapters/src/prisma-store.ts`: Prisma-backed store adapter
- `apps/api/lib/manifest-runtime.ts`: API runtime wiring for generated handlers
- `apps/api/lib/manifest-response.ts`: shared API responses

## Compile/Generate Limitations

If compile or generate fails with missing `@manifest/runtime/dist/*` modules, the linked runtime package is not built in this environment.

In that case:

1. Keep authoring sources and checking boundaries locally.
2. Rebuild/fix linked `@manifest/runtime` artifacts.
3. Re-run `pnpm manifest:compile` and `pnpm manifest:generate`.

## Related Docs

- `docs/manifest/structure.md`
- `docs/manifest/generation.md`
- `docs/manifest/INTEGRATION.md`
- `docs/manifest/FILES_TO_EDIT.md`
- `docs/standards/boundaries.md`
