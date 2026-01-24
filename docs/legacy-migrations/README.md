# Legacy Migrations Archive

**DEPRECATED - DO NOT USE**

These migration files are archived for historical reference only.
As of 2026-01-23, **Prisma Migrate is the single source of truth for database schema changes**.

## Contents

- `supabase-migrations/` - 73 legacy SQL migration files (originally in `supabase/migrations/`)
- `neon-migrations/` - 63 legacy SQL migration files (originally in `supabase/neon-migrations/`)

## Current Migration Workflow

All schema changes should now use Prisma Migrate:

```bash
# Make schema changes in packages/database/prisma/schema.prisma
# Then run:
pnpm migrate              # Creates new migration (dev)
pnpm migrate:deploy       # Applies migrations (production)
```

## Why These Are Archived

- The project originally used a "database-first" approach with SQL migrations
- We've now switched to Prisma Migrate for proper schema management
- A baseline migration was created to represent the current schema state
- These files are kept only for reference if needed

## Where Migrations Live Now

- Schema: `packages/database/prisma/schema.prisma`
- Migrations: `packages/database/prisma/migrations/`
- Config: `packages/database/prisma.config.ts`
