# Migration 0006: Move Public Objects to Proper Schemas

## Migration Metadata

- **Migration ID**: `20260128000000_move_public_objects`
- **Created**: 2026-01-28
- **Author**: Database Team
- **Status**: Deployed

## Overview

Reorganizes database schema by moving internal types and tables from the `public` schema to their appropriate schemas. This improves security, organization, and follows the multi-tenant architecture principles.

**Business Context**: The `public` schema should only contain user-facing objects. Internal implementation details (enums, system tables) belong in specialized schemas for better security and maintainability.

## Dependencies

**Requires:**
- `0_init`: Base schema with public, platform, core, tenant schemas
- Previous migrations that created objects in public schema

**Required by:**
- All subsequent migrations (establishes proper schema organization)

## Changes

### Enums Moved

| Enum Name | From Schema | To Schema | Purpose |
|-----------|-------------|-----------|---------|
| KitchenTaskPriority | public | core | Task priority levels (low, medium, high, urgent) |
| KitchenTaskStatus | public | core | Task status values (open, in_progress, done, canceled) |
| OutboxStatus | public | core | Outbox event processing status |
| UserRole | public | core | User role definitions |
| ShipmentStatus | public | core | Shipment tracking status values |

### Tables Moved

| Table Name | From Schema | To Schema | Reason |
|------------|-------------|-----------|--------|
| OutboxEvent | public | tenant | Outbox pattern for tenant-scoped events |
| Tenant | public | platform | Platform-level tenant management |

## SQL Operations

```sql
-- Move enums to core schema
alter type "public"."KitchenTaskPriority" set schema core;
alter type "public"."KitchenTaskStatus" set schema core;
alter type "public"."OutboxStatus" set schema core;
alter type "public"."UserRole" set schema core;
alter type "public"."ShipmentStatus" set schema core;

-- Move tables to appropriate schemas
alter table "public"."OutboxEvent" set schema tenant;
alter table "public"."Tenant" set schema platform;
```

## Rollback Plan

### Automated Rollback

```sql
-- Move enums back to public (reverses the migration)
alter type "core"."KitchenTaskPriority" set schema public;
alter type "core"."KitchenTaskStatus" set schema public;
alter type "core"."OutboxStatus" set schema public;
alter type "core"."UserRole" set schema public;
alter type "core"."ShipmentStatus" set schema public;

-- Move tables back to public
alter table "tenant"."OutboxEvent" set schema public;
alter table "platform"."Tenant" set schema public;
```

**WARNING**: Rollback may break application code that expects the new schema locations.

### Data Migration Impact

- **Rows affected**: 0 (schema changes only, no data movement)
- **Data loss risk**: NONE
- **Rollback data needed**: NO

## Verification

### Post-Deployment Verification

```sql
-- Verify enums in core schema
SELECT typname, typnamespace::regnamespace::text AS schema_name
FROM pg_type
WHERE typnamespace = 'core'::regnamespace
AND typname IN ('KitchenTaskPriority', 'KitchenTaskStatus', 'OutboxStatus', 'UserRole', 'ShipmentStatus')
ORDER BY typname;

-- Verify tables moved
SELECT tablename, schemaname
FROM pg_tables
WHERE schemaname IN ('tenant', 'platform')
AND tablename IN ('OutboxEvent', 'Tenant');

-- Verify no orphaned objects in public
SELECT 'enum' AS object_type, typname AS object_name
FROM pg_type
WHERE typnamespace = 'public'::regnamespace
AND typname IN ('KitchenTaskPriority', 'KitchenTaskStatus', 'OutboxStatus', 'UserRole', 'ShipmentStatus')
UNION ALL
SELECT 'table', tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('OutboxEvent', 'Tenant');
```

**Expected Result**: Empty result set (no objects in public)

### Application Verification

- [ ] Application starts without errors
- [ ] Type references updated in Prisma schema
- [ ] Queries using moved enums work correctly
- [ ] Tenant table accessible from platform schema
- [ ] OutboxEvent queries work from tenant schema

## Performance Impact

### Expected Impact

- **Query performance**: NO CHANGE (schema location doesn't affect performance)
- **Schema lookup**: MINIMAL improvement (fewer objects in public schema)
- **Storage**: NO CHANGE

### Mitigation

None required.

## Security Considerations

- [x] Reduces public schema surface area
- [x] Internal implementation details properly isolated
- [x] Platform-level objects (Tenant) in platform schema
- [x] Tenant-scoped objects (OutboxEvent) in tenant schema
- [x] Enum types in core schema for shared access

**Security Improvements**:
- Public schema now contains only user-facing objects
- Internal types hidden from casual inspection
- Clear separation of concerns between schemas
- Better access control boundaries

## Breaking Changes

### API Changes

- [ ] **BREAKING** - Type references must include schema prefix
  - Old: `KitchenTaskStatus`
  - New: `core.KitchenTaskStatus`

- [ ] **BREAKING** - Table references must include schema prefix
  - Old: `public.OutboxEvent`
  - New: `tenant.OutboxEvent`
  - Old: `public.Tenant`
  - New: `platform.Tenant`

### Data Access Changes

- [ ] **BREAKING** - All queries referencing moved objects must update schema paths
- [ ] **BREAKING** - Prisma schema must reflect new schema locations

### Migration Required

- [x] **YES** - Code changes required
  1. Update Prisma schema with schema prefixes
  2. Update raw SQL queries with schema prefixes
  3. Regenerate Prisma client: `pnpm prisma:generate`
  4. Update type annotations in application code

## Notes

**Migration Strategy**:
- Uses PostgreSQL's `ALTER TYPE ... SET SCHEMA` and `ALTER TABLE ... SET SCHEMA`
- These operations are metadata-only and instantaneous
- No data movement required
- Object IDs remain unchanged

**Why This Migration Was Needed**:
1. **Security**: Public schema is accessible by default in PostgreSQL
2. **Organization**: Clear separation of concerns (platform, tenant, core)
3. **Maintainability**: Easier to understand schema boundaries
4. **Best Practice**: Follows PostgreSQL multi-tenant patterns

**Impact on Application Code**:
All references must include schema prefix:
```typescript
// Before
enum KitchenTaskStatus { ... }

// After (in Prisma schema)
enum KitchenTaskStatus {
  // core.KitchenTaskStatus
}
```

**Dependencies**:
- Prisma schema must be regenerated after this migration
- Application restart required to load new schema locations

## Related Issues

- Part of schema reorganization effort
- Enables proper RLS policy implementation
- Follows multi-tenant architecture best practices

## References

- [PostgreSQL ALTER TYPE](https://www.postgresql.org/docs/current/sql-altertype.html)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL Schemas](https://www.postgresql.org/docs/current/ddl-schemas.html)
- Schema Contract: `docs/legacy-contracts/schema-contract-v2.txt`
