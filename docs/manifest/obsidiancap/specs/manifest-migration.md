# Manifest Migration

## Goal

Migrate the application from direct Prisma CRUD operations to the Manifest system for state management, enabling declarative entity definitions with commands, constraints, projections, and runtime execution across PrepTask and other domain entities.

## What exists when this is done

- **Manifest-first architecture**: All domain entities (PrepTask, KitchenTask, etc.) are defined as Manifest files with IR compilation, commands, constraints, and projections
- **Direct Prisma CRUD removed**: No more direct database mutations outside of the Manifest runtime
- **Adapter layer complete**: All API routes use Manifest adapters (stores) rather than direct Prisma access
- **Runtime wired**: The Manifest runtime properly executes commands, enforces constraints, and projects state
- **Type safety preserved**: TypeScript types are generated from Manifest IR for full compile-time safety

## What must be true

- All entity mutations go through Manifest runtime commands
- Database operations are mediated by the Prisma store adapter
- Constraints are enforced before state changes
- Projections are used for read operations (no direct queries outside projections)
- Type generation produces accurate TypeScript types
- Tests pass for all migrated entities
- No regressions in existing functionality

## What must not happen

- Direct Prisma CRUD in API routes (bypassing Manifest)
- Broken type generation or missing types
- Lost functionality during migration
- Performance degradation from IR compilation overhead
- Inconsistent state between Manifest and database

## References

- **Manifest spec**: `docs/manifest-official/spec/` — Complete Manifest specification including IR, commands, constraints, projections, runtime semantics
- **Manifest integration docs**: `docs/manifest/` — Integration patterns, store adapters, usage examples
- **Current PrepTask runtime**: `packages/manifest-adapters/src/prisma-store.ts` — Existing PrepTask Manifest runtime implementation
- **Kitchen ops manifests**: `packages/kitchen-ops/manifests/` — Existing Manifest files for kitchen operations
- **Database schema**: `packages/database/prisma/schema.prisma` — Current entity models

## Migration Strategy

1. **Identify migration targets** — Find all API routes and mutations using direct Prisma access
2. **Create Manifest entities** — Define entities in Manifest format with commands, constraints, projections
3. **Implement store adapters** — Create Prisma store adapters for each entity
4. **Wire API routes** — Replace direct Prisma calls with Manifest runtime operations
5. **Generate types** — Use Manifest IR to generate TypeScript types
6. **Test thoroughly** — Ensure no regressions in functionality

## Scope Boundaries

**In scope**:
- PrepTask mutations (already partially migrated)
- KitchenTask mutations
- Any other entity mutations using direct Prisma CRUD

**Out of scope**:
- Read-only queries that don't involve state mutations
- Database migrations and schema changes
- Manifest runtime engine changes (use existing runtime)
