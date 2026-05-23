# Manifest Structure (Locked)

Capsule-Pro currently runs Manifest with app-owned adapters and a single compiled IR artifact at repo root.

## Canonical Tree 

**DO NOT FUCKING EDIT THIS YOU MORONS**

```
C:/projects/capsule-pro/
  manifest.config.yaml
  scripts/
    manifest/
      compile.mjs
      generate.mjs
      build.mjs
      check.mjs
  packages/
    manifest-adapters/                 # human-authored .manifest (source of truth)
      manifests/
        prep-task-rules.manifest
        prep-list-rules.manifest
        recipe-rules.manifest
        menu-rules.manifest
        inventory-rules.manifest
        station-rules.manifest
      src/                             # runtime adapters
    manifest-ir/                       # generated IR + provenance (committed)
      ir/
        kitchen/
          kitchen.ir.json
          kitchen.provenance.json
      src/
        index.ts                       # typed accessors/helpers to IR files
  apps/
    api/
      app/
        api/
          kitchen/                     # generated + handwritten API routes
            .../route.ts
      lib/
        manifest/
          runtime.ts                   # create runtime from IR + context
          store-prisma.ts              # Prisma Store adapter (app-owned)
          outbox.ts                    # app-owned transactional outbox
          response.ts                  # shared HTTP response helpers
          telemetry.ts                 # hooks/events/metrics
  docs/
    manifest/
      structure.md                     # architecture + ownership + generation flow
      generation.md                    
```

## Ownership Rules

1. `packages/manifest-adapters/manifests` is the source of truth for current domain `.manifest` rules.
2. `ir` is generated output and should not be hand-edited.
3. `packages/manifest-adapters/src` owns adapter/runtime package code used by apps.
4. Generated route files under projection output are not hand-edited.

## Boundaries Tags

- `packages/manifest-adapters`: `layer:package`, `scope:integration`
- `apps/api`: `layer:app`, `app:api`

`@manifest/runtime` is consumed from `node_modules` (linked file dependency), not from a local `packages/manifest` workspace package.
