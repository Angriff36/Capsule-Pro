# Manifest Integration Architecture

This document defines where Manifest integration code belongs in Capsule-Pro.

## Design Rules

1. Manifest source of truth is `.manifest` files in `packages/manifest-adapters/manifests`.
2. Generated IR artifact is `ir` at repo root and is not hand-edited.
3. Runtime adapters live in `packages/manifest-adapters/src`.
4. API route runtime wrappers live in `apps/api/lib/manifest-runtime.ts` and `apps/api/lib/manifest-response.ts`.
5. Side effects (Prisma writes, outbox, external actions) stay outside Manifest core.
6. Generated API route handlers are derivative artifacts and should not be hand-edited.

## Integration Flow

```txt
packages/manifest-adapters/manifests/*.manifest
  -> compile (manifest CLI)
ir
  -> generate (nextjs projection)
apps/api/app/api/**/route.ts
  -> runtime execution path uses apps/api/lib/manifest-runtime.ts + manifest-adapters
```

## App-Owned Adapter Seams

`packages/manifest-adapters/src/index.ts`
- Compiles/loads manifests and creates runtime engines.

`packages/manifest-adapters/src/prisma-store.ts`
- Implements storage adapter backed by Prisma.

`packages/manifest-adapters/src/api-response.ts`
- Shared response contract for app/server handlers.

`apps/api/lib/manifest-runtime.ts`
- API wrapper for generated handlers and runtime options.

`apps/api/lib/manifest-response.ts`
- API route success/error normalization.

## Boundaries Enforcement

Architecture boundaries are enforced by Turbo:

- Rule config: `turbo.json`
- Human-readable mirror: `boundaries.json`
- Policy docs: `docs/standards/boundaries.md`

Run enforcement:

```bash
pnpm boundaries
```

## Runtime Package Note

Manifest core is consumed from `node_modules/@manifest/runtime` (linked file dependency), not from a local `packages/manifest` workspace package.
