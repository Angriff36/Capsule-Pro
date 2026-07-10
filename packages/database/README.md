# Database Documentation

**Canonical reference for Capsule Pro database architecture, patterns, and workflows**

Last updated: 2026-05-17

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Decisions & Patterns](#core-decisions--patterns)
3. [Database Workflow](#database-workflow)
4. [Common Patterns](#common-patterns)
5. [Prisma Invariants](#prisma-invariants)
6. [Commands Reference](#commands-reference)
7. [Schema Structure](#schema-structure)
8. [Additional Resources](#additional-resources)

---

## Architecture Overview

### Technology Stack

- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Prisma with `relationMode = "prisma"` (see [Foreign Keys](#2-foreign-keys) for why, and the gap vs `"foreignKeys"`)
- **Migration Tool**: Prisma Migrate (NOT `db push`)
- **Multi-tenancy**: Shared database with `tenant_id` column isolation
- **Authentication**: Clerk (handles user auth and session management)
- **Realtime**: Ably (via outbox pattern for authoritative events)

### Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────┐
│                PostgreSQL Database (Neon)                │
├─────────────────────────────────────────────────────────┤
│  • Shared database for ALL tenants                       │
│  • Tenant isolation enforced at the APP layer            │
│    (route handlers always filter by tenantId)            │
│  • Composite primary keys: (tenant_id, id)               │
│  • 137 physical foreign keys via migration               │
│    20260129120000_add_foreign_keys (236 @relation        │
│    directives → ~99 relations have no DB-level FK yet)   │
│  • RLS policies EXIST in migrations on 83/202 tenant     │
│    tables but are RUNTIME-BYPASSED (see RLS section)     │
│  • NO per-tenant databases                               │
└─────────────────────────────────────────────────────────┘
```

---

## Core Decisions & Patterns

### 1. Multi-Tenancy Strategy

**Decision**: Shared database with `tenant_id` column isolation

- ✅ All tenant tables include `tenant_id` column
- ✅ Composite primary keys: `(tenant_id, id)`
- ✅ Application-level tenant isolation (Clerk middleware)
- ❌ NO per-tenant databases
- ❌ NO Row Level Security (RLS) policies

**Why**: Simpler infrastructure, easier schema migrations, lower cost, shared reporting/analytics.

### 2. Foreign Keys

**Decision**: Foreign keys are partially enforced at database level; Prisma still
runs with `relationMode = "prisma"`.

- ✅ 137 foreign key constraints exist (migration `20260129120000_add_foreign_keys`)
- ✅ Composite foreign keys: `(tenant_id, parent_id)` → `(tenant_id, id)`
- ⚠️ `schema.prisma` has **236 `@relation` directives** — ~99 relations have no
  underlying physical FK yet
- ⚠️ `relationMode = "prisma"` means Prisma does NOT auto-generate FK constraints
  in new migrations; relations are emulated client-side
- ❌ Switching to `relationMode = "foreignKeys"` is currently blocked: known
  orphaned-row scenarios (see `docs/database/KNOWN_ISSUES.md` and the per-schema
  docs under `docs/database/schemas/`) would fail the `ALTER TABLE ... ADD
  CONSTRAINT FOREIGN KEY` Prisma would emit for the ~99 missing constraints

**Example of an existing FK**:

```sql
ALTER TABLE tenant_crm.client_contacts
ADD CONSTRAINT fk_client_contacts_client
FOREIGN KEY (tenant_id, client_id)
REFERENCES tenant_crm.clients(tenant_id, id)
ON DELETE CASCADE;
```

### 3. Authentication & Authorization

**Decision**: Clerk handles all auth. Tenant isolation is enforced in
application code (route handlers filter every query by `tenantId`). Database
RLS migrations EXIST but are not enforced at runtime.

**Current runtime behavior (as of 2026-05-17):**

- ✅ Clerk middleware authenticates the request and resolves `tenantId`
- ✅ Route handlers call `requireApiManager()` / `requireTenantId()` and pass
  the resolved `tenantId` into every Prisma `where` clause — this is the actual
  isolation mechanism today
- ✅ Session management via Clerk

**RLS-in-migrations vs RLS-at-runtime:**

- 83 of 202 tenant-scoped tables have `ENABLE ROW LEVEL SECURITY` + `CREATE
  POLICY` statements in migrations (see `IMPLEMENTATION_PLAN.md` for per-schema
  breakdown).
- Those policies reference `auth.jwt() ->> 'tenant_id'`, but `auth.jwt()` is a
  hardcoded stub defined in `packages/database/prisma/migrations/0_init/migration.sql:35-40`
  that always returns the zero UUID (`00000000-0000-0000-0000-000000000000`).
  No Supabase, no per-request `SET LOCAL request.jwt.claims` middleware.
- The app connects to Postgres as the Neon database owner role
  (`neondb_owner`), which has `BYPASSRLS`. Even if `auth.jwt()` returned a real
  tenant, the owner role would bypass the policies entirely.
- **Net effect**: the RLS policies provide ZERO runtime tenant isolation today.
  They are dormant defense-in-depth that will activate only after BOTH (a) a
  non-owner app role is configured and (b) per-query JWT context is wired into
  the Prisma client.

**Why we kept the policies in migrations anyway**: they are the
specification-by-SQL of the intended isolation boundary, and they will start
enforcing automatically once the runtime wiring lands. Removing them would be a
regression.

### 4. Realtime Events

**Decision**: Ably for authoritative events via outbox pattern

- ✅ Ably handles backend-to-client event propagation
- ✅ Outbox pattern ensures reliable event delivery
- ✅ Liveblocks for collaborative UI state (cursors, presence)
- ❌ NO Supabase Realtime (not using Supabase)

### 5. Prisma Configuration

**Decision**: `relationMode = "prisma"` (currently — see [Foreign Keys](#2-foreign-keys) for the gap to `"foreignKeys"`)

```prisma
datasource db {
  provider     = "postgresql"
  relationMode = "prisma"  // Relations emulated client-side; FKs added via raw SQL migrations
  schemas      = ["core", "platform", "tenant", ...]
}
```

**Implications**:

- Prisma does NOT auto-generate foreign key constraints in migrations — FKs are
  authored by hand in raw SQL (see `20260129120000_add_foreign_keys/migration.sql`)
- Database referential integrity is enforced ONLY where those raw-SQL FKs exist
  (137 of the 236 relations in the schema)
- Standard referential actions are supported only at the application/Prisma
  layer for relations without a physical FK; at the database layer, only the
  137 FK'd relations get on-delete enforcement
- Prisma client handles relation queries

**Why not `"foreignKeys"` yet**: switching would force Prisma to emit `ADD
CONSTRAINT FOREIGN KEY` statements for all ~99 currently un-FK'd relations,
which will fail against existing orphan rows. The unblock is a one-time orphan
audit + cleanup, then the mode flip.

### 6. UUID Generation

**Decision**: PostgreSQL `gen_random_uuid()` for all IDs

```prisma
model Example {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
}
```

**Why**: Database-generated UUIDs ensure uniqueness, no app-level coordination needed.

### 7. Soft Deletes

**Decision**: All tenant tables use `deletedAt` for soft deletion

```prisma
model Example {
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  @@index([tenantId, deletedAt])
}
```

**Why**: Enables undo functionality, maintains audit trail, supports recovery.

### 8. Timestamps

**Decision**: All tables include `createdAt` and `updatedAt`

```prisma
model Example {
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
}
```

**Why**: Audit trail, debugging, data lifecycle tracking.

### 9. Field Naming Convention

**Decision**: Prisma uses camelCase, database uses snake_case

```prisma
model Example {
  tenantId  String   @map("tenant_id") @db.Uuid
  createdAt DateTime @map("created_at") @db.Timestamptz(6)
}
```

**Critical Rules** (from CLAUDE.md):

- ✅ Field names: camelCase with `@map("snake_case")`
- ❌ NEVER: snake_case directly in Prisma schema
- ✅ UUIDs: `gen_random_uuid()` only
- ❌ NEVER: column refs in `@default()` (e.g., `@default(dbgenerated("col1 * col2"))`)
- ✅ Relations: `references` uses Prisma field names
- ❌ NEVER: DB column names in `references`

---

## Database Workflow

> ⚠️ Workflow instructions live in **ONE** place:
> [`docs/database/CONTRIBUTING.md`](../../docs/database/CONTRIBUTING.md). Do not follow workflow
> steps from any other file (including older revisions of this README — the schema-registry and
> pre-migration-checklist steps are retired, and the schema is now the multi-file directory
> `prisma/schema/`, not `schema.prisma`).

---

## Common Patterns

### 1. Composite Primary Keys

All tenant tables use composite primary keys:

```prisma
model Example {
  tenantId String @map("tenant_id") @db.Uuid
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  @@id([tenantId, id])  // Composite PK
  @@map("examples")
  @@schema("tenant_kitchen")
}
```

### 2. Composite Foreign Keys

Foreign keys reference composite primary keys:

```sql
ALTER TABLE tenant_events.event_guests
ADD CONSTRAINT fk_event_guests_event
FOREIGN KEY (tenant_id, event_id)
REFERENCES tenant_events.events(tenant_id, id)
ON DELETE CASCADE;
```

### 3. ON DELETE Behaviors

**CASCADE**: Child records deleted when parent deleted (composition relationships)

```sql
ON DELETE CASCADE  -- Line items, comments, assignments
```

**SET NULL**: Child records lose reference but survive (optional relationships)

```sql
ON DELETE SET NULL  -- Assignee references, event/location links
```

**RESTRICT**: Parent cannot be deleted if children exist (critical entities)

```sql
ON DELETE RESTRICT  -- Employee in time entries, inventory items in transactions
```

### 4. Cross-Schema References

Many foreign keys span multiple schemas:

```sql
-- tenant_events → tenant_crm
ALTER TABLE tenant_events.events
ADD CONSTRAINT fk_events_client
FOREIGN KEY (tenant_id, client_id)
REFERENCES tenant_crm.clients(tenant_id, id);

-- tenant_kitchen → tenant_inventory
ALTER TABLE tenant_kitchen.containers
ADD CONSTRAINT fk_containers_location
FOREIGN KEY (tenant_id, location_id)
REFERENCES tenant_inventory.storage_locations(tenant_id, id);
```

### 5. Standard Indexes

All tenant tables have tenant isolation indexes:

```prisma
model Example {
  @@index([tenantId, deletedAt])  // Tenant isolation + soft delete filtering
}
```

### 6. Migration Safety Pattern

All migrations use idempotent patterns:

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_name'
        AND table_schema = 'schema_name'
    ) THEN
        ALTER TABLE schema_name.table
        ADD CONSTRAINT fk_name
        FOREIGN KEY (columns)
        REFERENCES parent_table(columns)
        ON DELETE behavior;
    END IF;
END $$;
```

**Benefits**:

- Safe to re-run if migration fails partway
- No errors if constraints already exist
- Idempotent execution in CI/CD pipelines

---

## Prisma Invariants

These are explicit workspace invariants and should not drift.

### Canonical Prisma Schema Path

```text
C:\Projects\capsule-pro\packages\database\prisma\schema.prisma
```

### Canonical Validation Command (repo root)

```bash
pnpm exec prisma generate --schema=./packages/database/prisma/schema.prisma
```

This command is wired to root `package.json` as:

```json
"prisma:check": "pnpm exec prisma generate --schema=./packages/database/prisma/schema.prisma"
```

### Build/CI Enforcement

Root `build` runs `prisma:check` first:

```json
"build": "pnpm prisma:check && turbo build"
```

This guarantees CI fails early if Prisma schema validation fails.

### Filtered Command Note

If you run Prisma inside `@repo/database` via `--filter`, the command executes with `packages/database` as CWD. In that context, use:

```bash
pnpm --filter @repo/database exec prisma generate --schema=./prisma/schema.prisma
```

Using `--filter` with a root-relative schema path can fail due to path resolution.

### Error Behavior

Prisma schema relation issues surface as validation errors such as `P1012` (for example, missing back-relations).

---

## Commands Reference

> ⚠️ Migration commands and drift resolution are documented in **ONE** place:
> [`docs/database/CONTRIBUTING.md`](../../docs/database/CONTRIBUTING.md).

---

## Schema Structure

The database uses **9 PostgreSQL schemas** for logical separation:

### Core Schemas

| Schema     | Purpose                 | Tenant Scoped?             |
| ---------- | ----------------------- | -------------------------- |
| `core`     | Types, enums, functions | No                         |
| `platform` | Account, audit logs     | No (Account IS the tenant) |

### Tenant Schemas

| Schema             | Purpose            | Example Tables                         |
| ------------------ | ------------------ | -------------------------------------- |
| `tenant`           | Core tenant data   | Location, Employee, Settings           |
| `tenant_admin`     | Admin & reporting  | Report, Workflow, Notification         |
| `tenant_crm`       | CRM operations     | Client, Lead, Proposal                 |
| `tenant_events`    | Event management   | Event, BattleBoard, EventImport        |
| `tenant_inventory` | Inventory ops      | InventoryItem, PurchaseOrder, Shipment |
| `tenant_kitchen`   | Kitchen operations | Recipe, PrepTask, KitchenTask          |
| `tenant_staff`     | Staff management   | Schedule, TimeEntry, Shift             |

### Schema Pattern

All tenant schemas follow this pattern:

```prisma
model ExampleTable {
  tenantId  String   @map("tenant_id") @db.Uuid
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  @@id([tenantId, id])
  @@index([tenantId, deletedAt])
  @@map("example_tables")
  @@schema("tenant_xxx")
}
```

---

## Additional Resources

### Key Files

- **Schema**: `packages/database/prisma/schema/` (multi-file: `manifest.prisma` is
  projection-generated — never hand-edit; `infra.prisma` is hand-owned)
- **Migrations**: `packages/database/prisma/migrations/`
- **Workflow (canonical)**: [`docs/database/CONTRIBUTING.md`](../../docs/database/CONTRIBUTING.md)
- **Known Issues**: `docs/database/KNOWN_ISSUES.md`
- **Historical migration docs**: `docs/database/migrations/`

---

## Summary

**Key Takeaways**:

1. ✅ PostgreSQL on Neon + Prisma ORM (`relationMode = "prisma"`)
2. ✅ Multi-tenant via shared DB + `tenant_id` isolation, enforced in route handlers
3. ⚠️ 137 physical foreign keys (of 236 `@relation` directives in the schema)
4. ✅ Clerk handles auth; RLS policies exist in migrations but are runtime-bypassed
   (stub `auth.jwt()` + `neondb_owner` BYPASSRLS — see [Authentication & Authorization](#3-authentication--authorization))
5. ✅ Ably handles realtime (via outbox pattern)
6. ✅ Prisma Migrate for all schema changes (NOT `db push`)

**Before making schema changes**: read
[`docs/database/CONTRIBUTING.md`](../../docs/database/CONTRIBUTING.md) — the only authoritative
workflow doc — and nothing else.

---

Last updated: 2026-07-10
