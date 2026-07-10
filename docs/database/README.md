# Database Documentation

**Canonical reference for Capsule Pro database architecture, patterns, and workflows**

Last updated: 2025-02-07

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Decisions & Patterns](#core-decisions--patterns)
3. [Database Workflow](#database-workflow)
4. [Common Patterns](#common-patterns)
5. [Commands Reference](#commands-reference)
6. [Schema Structure](#schema-structure)
7. [Additional Resources](#additional-resources)

---

## Architecture Overview

### Technology Stack

- **Database**: PostgreSQL (hosted on Neon)
- **Neon branches**: `ep-square-dust` = **dev** (local + CI migration preview); `ep-divine-math` = **prod**. Never point local `DATABASE_URL` at prod.
- **ORM**: Prisma with `relationMode = "prisma"`
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
│  • Tenant isolation via tenant_id column                 │
│  • Composite primary keys: (tenant_id, id)               │
│  • Foreign keys enforced at database level (108 total)   │
│  • NO per-tenant databases                               │
│  • NO Row Level Security (RLS) - Clerk handles auth      │
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

**Decision**: Foreign keys ARE enforced at database level

- ✅ 108 foreign key constraints added in migration `20260129120000_add_foreign_keys`
- ✅ Referential integrity enforced by PostgreSQL
- ✅ Composite foreign keys: `(tenant_id, parent_id)` → `(tenant_id, id)`
- ⚠️ Prisma uses `relationMode = "prisma"` (doesn't auto-generate FK constraints)
- ⚠️ FK constraints added manually in migrations

**Example**:
```sql
ALTER TABLE tenant_crm.client_contacts
ADD CONSTRAINT fk_client_contacts_client
FOREIGN KEY (tenant_id, client_id)
REFERENCES tenant_crm.clients(tenant_id, id)
ON DELETE CASCADE;
```

### 3. Authentication & Authorization

**Decision**: Clerk handles all auth, NO database-level RLS

- ✅ Clerk middleware enforces tenant isolation
- ✅ Session management via Clerk
- ✅ User authentication via Clerk
- ❌ NO Supabase RLS policies (leftover docs are outdated)
- ❌ NO database-level row security

**Why**: Clerk provides robust auth out-of-the-box. Database complexity reduced.

### 4. Realtime Events

**Decision**: Ably for authoritative events via outbox pattern

- ✅ Ably handles backend-to-client event propagation
- ✅ Outbox pattern ensures reliable event delivery
- ✅ Liveblocks for collaborative UI state (cursors, presence)
- ❌ NO Supabase Realtime (not using Supabase)

### 5. Prisma Configuration

**Decision**: `relationMode = "prisma"`

```prisma
datasource db {
  provider     = "postgresql"
  relationMode = "prisma"  // Prisma manages relations in app code
  schemas      = ["core", "platform", "tenant", ...]
}
```

**Implications**:
- Prisma does NOT auto-generate foreign key constraints
- Foreign keys must be added manually in migrations
- Database still enforces referential integrity (good!)
- Prisma client handles relation queries

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

> ⚠️ Workflow instructions live in **ONE** place: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
> (this directory). Do not follow workflow steps from any other file. This README covers
> architecture and patterns only. (The old steps here — `schema.prisma` single-file edits,
> schema-registry, checklist entries, `db:repair` — were removed 2026-07-10; `db:repair`
> and the accepted-drift model no longer exist.)

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

## Commands Reference

> ⚠️ Commands and drift resolution are documented in **ONE** place:
> [`CONTRIBUTING.md`](./CONTRIBUTING.md). (`db:repair` no longer exists; `pnpm db:check`
> is a strict full diff — any difference fails.)

---

## Schema Structure

The database uses **9 PostgreSQL schemas** for logical separation:

### Core Schemas

| Schema | Purpose | Tenant Scoped? |
|--------|---------|----------------|
| `core` | Types, enums, functions | No |
| `platform` | Account, audit logs | No (Account IS the tenant) |

### Tenant Schemas

| Schema | Purpose | Example Tables |
|--------|---------|----------------|
| `tenant` | Core tenant data | Location, Employee, Settings |
| `tenant_admin` | Admin & reporting | Report, Workflow, Notification |
| `tenant_crm` | CRM operations | Client, Lead, Proposal |
| `tenant_events` | Event management | Event, BattleBoard, EventImport |
| `tenant_inventory` | Inventory ops | InventoryItem, PurchaseOrder, Shipment |
| `tenant_kitchen` | Kitchen operations | Recipe, PrepTask, KitchenTask |
| `tenant_staff` | Staff management | Schedule, TimeEntry, Shift |

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

- **Schema**: `packages/database/prisma/schema/` (multi-file directory: `manifest.prisma` is
  projection-generated — never hand-edit; `infra.prisma` is hand-owned)
- **Migrations**: `packages/database/prisma/migrations/`
- **Workflow (canonical)**: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- **Known Issues**: `docs/database/KNOWN_ISSUES.md`

### Getting Help

- **Workflow / migration / drift questions**: [`CONTRIBUTING.md`](./CONTRIBUTING.md) — the only
  authoritative source
- **Current Issues**: `docs/database/KNOWN_ISSUES.md`
- **Historical migration docs**: `docs/database/migrations/`

---

## Summary

**Key Takeaways**:

1. ✅ PostgreSQL on Neon + Prisma ORM
2. ✅ Multi-tenant via shared DB + `tenant_id` isolation
3. ✅ Clerk handles auth (NO RLS policies)
4. ✅ Ably handles realtime (via outbox pattern)
5. ✅ Prisma Migrate for all schema changes (NOT `db push`)

**Before making schema changes**: read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and nothing else.

---

Last updated: 2026-07-10

