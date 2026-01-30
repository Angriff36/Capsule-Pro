# Tenant

> **First documented**: 2025-01-30
> **Last updated**: 2025-01-30
> **Last verified by**: spec-executor
> **Verification status**: ⚠️ Needs verification

---

## Overview

The `Tenant` table serves as a **lightweight tenant registry** in the platform schema. It provides minimal tenant identification for systems that don't need the full subscription and tier management details stored in the `Account` table.

**Business Context**: Technical identifier for tenant isolation, separate from the business entity model in Account.

**Key Use Cases**:
- Provide minimal tenant reference for systems that don't need subscription details
- Support legacy systems that reference tenant by slug/name
- Serve as lightweight lookup table for tenant resolution

**Lifecycle**: Created when tenant provisions → Updated if slug changes → Deleted when tenant deprovisions

## Schema Reference

```sql
-- PostgreSQL schema reference
-- File: packages/database/prisma/schema.prisma
CREATE TABLE platform.Tenant (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      STRING NOT NULL,
  slug      STRING UNIQUE NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prisma model reference
model Tenant {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name      String
  slug      String   @unique
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @db.Timestamptz(6)

  @@schema("platform")
}
```

**Click-to-navigate**: Ctrl+click (Cmd+click on Mac) the Prisma schema path above to jump to the model definition.

## Columns

| Column | Type | Nullable | Default | Purpose | Notes |
|--------|------|----------|---------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | Primary key | Auto-generated, immutable |
| `name` | String | No | - | Tenant display name | Human-readable name |
| `slug` | String | No | - | Unique identifier | Used for subdomains/routing, UNIQUE |
| `createdAt` | Timestamptz | No | now() | Creation timestamp | Auto-managed |
| `updatedAt` | Timestamptz | No | now() | Last update | Auto-managed |

### Column Details

#### id
- **Type**: UUID
- **Nullable**: No
- **Default**: gen_random_uuid()
- **Purpose**: Primary key for tenant identification
- **Validation**: Immutable, unique across all tenants
- **Business rules**: Never changes once assigned
- **Gotchas**: Not directly referenced by tenant tables (they use Account.id)

#### name
- **Type**: String
- **Nullable**: No
- **Purpose**: Human-readable tenant name
- **Validation**: Required, but not unique
- **Business rules**: Can be updated without breaking references
- **Gotchas**: May duplicate Account.name (should stay in sync)

#### slug
- **Type**: String
- **Nullable**: No
- **Purpose**: URL-safe identifier for routing
- **Validation**: UNIQUE constraint, lowercase, alphanumeric + hyphens
- **Business rules**: Used in subdomains (e.g., `tenant.slug.app.com`)
- **Gotchas**: Changing slug breaks all URLs/routing - should be immutable

#### createdAt
- **Type**: Timestamptz
- **Nullable**: No
- **Default**: now()
- **Purpose**: Audit timestamp for tenant creation
- **Validation**: Auto-managed by Prisma
- **Business rules**: Never manually updated
- **Gotchas**: Different from Account.createdAt (may diverge)

#### updatedAt
- **Type**: Timestamptz
- **Nullable**: No
- **Default**: now()
- **Purpose**: Audit timestamp for last update
- **Validation**: Auto-managed by Prisma
- **Business rules**: Updated on name/slug changes
- **Gotchas**: May not match Account.updatedAt

## Relations

### Cross-Schema

- **Linked to** [`Account`](../platform/Account.md) via `slug` (application-level, not FK)
  - **Relationship**: Tenant.slug should match Account.slug
  - **Constraint**: No database FK enforcement (application must keep in sync)
  - **Business rule**: Tenant is lightweight registry, Account is full tenant model

### No Foreign Keys

**⚠️ IMPORTANT**: This table has NO foreign keys to other tables.

- Not referenced by tenant tables (they reference `Account.id`)
- Exists as independent registry for lookups
- Application code must ensure Tenant.slug = Account.slug

## Business Rules

### Invariant Rules

**MUST always be true**:

- ✅ **slug is unique** - No two tenants can have the same slug
- ✅ **id is immutable** - Primary key never changes
- ✅ **No tenantId column** - Platform tables exist above tenant isolation
- ✅ **Slug matches Account.slug** - Application-level invariant (not enforced by DB)

### Application-Level Validation

- **Slug format**: Lowercase, alphanumeric, hyphens only (no spaces/special chars)
- **Slug uniqueness**: Checked against both Tenant.slug and Account.slug
- **Name consistency**: Tenant.name should match Account.name (not enforced)

### Lifecycle Rules

- **Creation**: Created alongside Account when tenant provisions
- **Updates**: Name can change; slug changes break routing (should be rare)
- **Deletion**: Deleted when tenant deprovisions (after Account deleted)

## Type Fixing

**Status**: ✅ No `any` types found

The tenant resolution code in `packages/database/tenant.ts` uses proper TypeScript types:
- `PrismaArgs` typed as `Record<string, unknown>` (not `any`)
- Helper functions use proper type guards and type narrowing
- No type assertions needed - all types are properly inferred

**Files checked**:
- `packages/database/tenant.ts` - Tenant scoping extension
- `packages/database/types.ts` - Type re-exports (clean)

## Queries

### Common Query Patterns

#### Get tenant by slug
```typescript
// Used for routing/subdomain resolution
const tenant = await prisma.platform.Tenant.findUnique({
  where: { slug: 'acme-catering' }
});
```

#### List all tenants
```typescript
// Used for admin dashboard
const tenants = await prisma.platform.Tenant.findMany({
  select: { id: true, name: true, slug: true }
});
```

#### Get tenant with Account details
```typescript
// Used for tenant profile page
const tenant = await prisma.platform.Tenant.findUnique({
  where: { slug: 'acme-catering' },
  include: {
    // Note: No relation defined - must join manually
    // account: { ... } // Requires application-level join
  }
});
```

## Performance

### Indexes

- **Primary key**: `id` (clustered index)
- **Unique index**: `slug` (for lookups by slug)

### Query Performance

- **Lookup by slug**: O(log n) via unique index
- **Lookup by id**: O(1) via primary key
- **List all tenants**: O(n) - table is small (platform-level, not tenant data)

### Hot Paths

- **Subdomain resolution**: Every request may lookup tenant by slug
- **Auth middleware**: Tenant resolution on authenticated requests
- **Admin dashboards**: List all tenants for platform admin

## Design Decisions

### Decision: Separate Tenant and Account Tables

**Context**: Need both a rich tenant model (Account with subscription/tier) and lightweight registry (Tenant).

**Decision**: Two tables in platform schema - `Account` and `Tenant`.

**Why**:
- **Account** can evolve with subscription fields without breaking lightweight references
- **Tenant** provides minimal identifier for systems that don't need subscription details
- **Separation of concerns**: Account = business entity, Tenant = technical identifier

**Alternatives considered**:
- Single table: Rejected - would couple subscription logic to all tenant references
- No separate Tenant: Rejected - some systems need lightweight tenant reference (no subscription overhead)

**Tradeoffs**:
- **Two sources of truth**: Must keep Tenant.slug and Account.slug in sync (application-level)
- **Application complexity**: Code must choose which table to reference
- **Risk of divergence**: If Account.slug != Tenant.slug, routing breaks

### Decision: No Foreign Key to Account

**Context**: Tenant and Account represent the same logical entity, but serve different purposes.

**Decision**: No database FK between Tenant and Account (link via slug at application level).

**Why**:
- **Flexibility**: Allows Account to be deleted/recreated without breaking Tenant
- **Decoupling**: Tenant can evolve independently of Account schema
- **Performance**: No FK lookup overhead for tenant resolution

**Alternatives considered**:
- FK on Tenant.account_id: Rejected - would make Tenant dependent on Account lifecycle
- FK on Account.tenant_id: Rejected - same as above, reversed
- Merge into single table: Rejected - loses separation of concerns

**Tradeoffs**:
- **No referential integrity**: Database won't catch orphaned records
- **Manual sync required**: Application must ensure slug consistency
- **Query complexity**: Must join manually (no Prisma relation)

## Migration TODOs

### No Migration TODOs

This table is stable with no known issues requiring migration.

### Future Considerations

- **Consider FK to Account**: If slug consistency becomes problematic, add FK
- **Consider merge**: If separation doesn't provide value, merge into Account
- **Audit sync status**: Add column to track whether Tenant matches Account

## Related Documentation

- **Schema**: [Platform Schema](../../schemas/00-platform.md)
- **Related Table**: [Account](./Account.md) - Full tenant model with subscription details
- **Pattern**: [Multi-Tenancy Architecture](../../README.md#multi-tenancy)

## Notes

### Gotchas

1. **No FK to Account**: Database doesn't enforce relationship - application must keep in sync
2. **Slug immutability**: Changing slug breaks routing - should effectively be immutable
3. **Dual source of truth**: Tenant and Account both represent tenant identity - choose correctly

### Common Pitfalls

1. **Using Tenant.id for tenant isolation**: Use Account.id instead (that's what tenant tables reference)
2. **Assuming FK to Account**: No relation defined - must join manually in application code
3. **Expecting subscription details**: Use Account table for tier/limits/metadata

### Maintenance Notes

- **Slug changes**: Avoid if possible - breaks all URLs and cached references
- **Sync with Account**: Ensure Tenant.slug = Account.slug on create/update
- **Use Account for FKs**: Tenant tables should reference Account.id, not Tenant.id
