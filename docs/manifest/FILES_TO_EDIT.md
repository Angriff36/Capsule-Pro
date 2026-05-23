# Files To Edit (Manifest)

Use this guide to avoid editing generated or legacy locations.

## Edit Matrix

| Path | Edit? | Why |
|---|---|---|
| `packages/manifest-adapters/manifests/*.manifest` | Yes | Canonical domain source |
| `packages/manifest-adapters/src/*.ts` | Yes | Runtime and adapter implementation |
| `apps/api/lib/manifest-runtime.ts` | Yes | API runtime wrapper |
| `apps/api/lib/manifest-response.ts` | Yes | API response helper |
| `apps/api/app/api/**/route.ts` (handwritten workflow routes) | Yes | Custom orchestration logic |
| `ir` | No | Generated compile output |
| Generated projection `route.ts` files | No | Re-generated from IR |
| `archive/manifest-legacy-2026-02-10/**` | No | Quarantined legacy paths for reference only |
| `node_modules/@manifest/runtime/**` | No | External dependency |

## Safe Workflow

1. Edit `.manifest` source under `packages/manifest-adapters/manifests`.
2. Run `pnpm manifest:compile`.
3. Inspect IR in `ir`.
4. Run `pnpm manifest:generate` when projection routes are required.
5. Run `pnpm boundaries`.

## Common Changes

### Add Or Modify Business Rules

- Edit: `packages/manifest-adapters/manifests/*.manifest`
- Do not edit: `ir` directly

### Add Runtime Adapter Behavior

- Edit: `packages/manifest-adapters/src/*.ts` and `apps/api/lib/manifest-runtime.ts`
- Keep adapter/runtime implementation in these active paths

### Add A Custom Workflow Endpoint

- Edit: `apps/api/app/api/**/route.ts` (workflow route)
- Use runtime seam from `apps/api/lib/manifest-runtime.ts`
- Keep generated projection routes untouched

## Red Flags

- Hand-editing generated projection route files
- Hand-editing `ir`
- Placing app integration logic in `node_modules/@manifest/runtime`

## Related Docs

- `docs/manifest/README.md`
- `docs/manifest/structure.md`
- `docs/manifest/generation.md`
- `docs/manifest/INTEGRATION.md`
- `docs/standards/boundaries.md`
