# Migration 0005: Add Menu Models

## Migration Metadata

- **Migration ID**: `20260126145500_add_menu_models`
- **Created**: 2026-01-26
- **Author**: Database Team
- **Status**: Deployed

## Overview

Introduces menu management functionality to the kitchen module. This migration creates tables for managing catering menus and their associated dishes, supporting the events module's need to track menu offerings per event.

**Business Context**: Catering operations need to manage menu catalogs with pricing, guest counts, and dish associations. This enables proper event planning and cost tracking.

## Dependencies

**Requires:**
- `0_init`: Base schema and tenant_kitchen schema
- `20260101000000_enable_pgcrypto`: For gen_random_uuid() function

**Required by:**
- `20260129120001_fix_menus_id_type`: Type correction migration
- `20260129120000_add_foreign_keys`: Foreign key constraints

## Changes

### Tables Added

| Table Name | Schema | Description |
|------------|--------|-------------|
| menus | tenant_kitchen | Catering menu definitions with pricing and guest constraints |
| menu_dishes | tenant_kitchen | Junction table linking menus to dishes with course organization |

### Columns Added: menus

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tenant_id | UUID | NO | - | Tenant identifier (composite PK) |
| id | TEXT | NO | - | Menu identifier (composite PK, fixed to UUID in 0007) |
| name | TEXT | NO | - | Menu display name |
| description | TEXT | YES | - | Detailed menu description |
| category | TEXT | YES | - | Menu category (e.g., "wedding", "corporate") |
| is_active | BOOLEAN | NO | true | Whether menu is available for new events |
| base_price | DECIMAL(10,2) | YES | - | Fixed base pricing |
| price_per_person | DECIMAL(10,2) | YES | - | Per-person pricing |
| min_guests | SMALLINT | YES | - | Minimum guest count |
| max_guests | SMALLINT | YES | - | Maximum guest count |
| created_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Record update timestamp |
| deleted_at | TIMESTAMPTZ(6) | YES | - | Soft delete timestamp |

### Columns Added: menu_dishes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tenant_id | UUID | NO | - | Tenant identifier (composite PK) |
| id | TEXT | NO | - | Junction record identifier (composite PK) |
| menu_id | UUID | NO | - | Reference to menus.id (will be FK in 0010) |
| dish_id | UUID | NO | - | Reference to dishes table (will be FK in 0010) |
| course | TEXT | YES | - | Course name (e.g., "appetizer", "entree") |
| sort_order | SMALLINT | NO | 0 | Display order within menu |
| is_optional | BOOLEAN | NO | false | Whether dish can be omitted |
| created_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Record update timestamp |
| deleted_at | TIMESTAMPTZ(6) | YES | - | Soft delete timestamp |

### Indexes Added

| Index Name | Table | Columns | Unique | Purpose |
|------------|-------|---------|--------|---------|
| menu_dishes_menu_id_idx | menu_dishes | menu_id | NO | Query optimization for menu lookups |
| menu_dishes_dish_id_idx | menu_dishes | dish_id | NO | Query optimization for dish lookups |
| menu_dishes_tenant_menu_dish_unique | menu_dishes | tenant_id, menu_id, dish_id | YES | Prevent duplicate dish associations |

### Triggers Added

| Trigger Name | Table | Event | Timing | Function | Purpose |
|--------------|-------|-------|--------|----------|---------|
| menus_update_timestamp | menus | UPDATE | BEFORE | core.fn_update_timestamp() | Auto-update updated_at |
| menus_prevent_tenant_mutation | menus | UPDATE | BEFORE | core.fn_prevent_tenant_mutation() | Prevent tenant_id changes |
| menu_dishes_update_timestamp | menu_dishes | UPDATE | BEFORE | core.fn_update_timestamp() | Auto-update updated_at |
| menu_dishes_prevent_tenant_mutation | menu_dishes | UPDATE | BEFORE | core.fn_prevent_tenant_mutation() | Prevent tenant_id changes |

### Replication Identity

- **menus**: REPLICA IDENTITY FULL (for real-time synchronization)
- **menu_dishes**: REPLICA IDENTITY FULL (for real-time synchronization)

## Rollback Plan

### Automated Rollback

```sql
-- Drop triggers first
DROP TRIGGER IF EXISTS menus_update_timestamp ON tenant_kitchen.menus;
DROP TRIGGER IF EXISTS menus_prevent_tenant_mutation ON tenant_kitchen.menus;
DROP TRIGGER IF EXISTS menu_dishes_update_timestamp ON tenant_kitchen.menu_dishes;
DROP TRIGGER IF EXISTS menu_dishes_prevent_tenant_mutation ON tenant_kitchen.menu_dishes;

-- Drop indexes
DROP INDEX IF EXISTS tenant_kitchen.menu_dishes_menu_id_idx;
DROP INDEX IF EXISTS tenant_kitchen.menu_dishes_dish_id_idx;
DROP INDEX IF EXISTS tenant_kitchen.menu_dishes_tenant_menu_dish_unique;

-- Drop tables
DROP TABLE IF EXISTS tenant_kitchen.menu_dishes CASCADE;
DROP TABLE IF EXISTS tenant_kitchen.menus CASCADE;
```

### Data Migration Impact

- **Rows affected**: 0 (new tables)
- **Data loss risk**: NONE (new tables only)
- **Rollback data needed**: NO

## Verification

### Post-Deployment Verification

```sql
-- Verify tables created
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name IN ('menus', 'menu_dishes')
AND table_schema = 'tenant_kitchen';

-- Verify columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('menus', 'menu_dishes')
AND table_schema = 'tenant_kitchen'
ORDER BY table_name, ordinal_position;

-- Verify indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'tenant_kitchen'
AND tablename IN ('menus', 'menu_dishes');

-- Verify triggers
SELECT trigger_name, event_object_table, action_timing, action_condition
FROM information_schema.triggers
WHERE event_object_schema = 'tenant_kitchen'
AND event_object_table IN ('menus', 'menu_dishes');
```

## Performance Impact

### Expected Impact

- **Query performance**: NO CHANGE (new tables, no existing queries)
- **Index maintenance**: LOW overhead (3 indexes on menu_dishes)
- **Storage**: Minimal initial storage (new empty tables)

### Mitigation

None required for new tables.

## Security Considerations

- [x] RLS policies need to be applied (not included in this migration)
- [x] Tenant isolation enforced via composite primary keys
- [x] No hardcoded secrets
- [x] Replica identity set for real-time features
- [x] Audit trail maintained (created_at, updated_at, deleted_at)

**Note**: RLS policies should be added in a follow-up migration following the pattern in `docs/database/migrations/README.md`.

## Breaking Changes

### API Changes

- [ ] NONE - New tables only

### Data Access Changes

- [ ] NONE - New tables only

### Migration Required

- [ ] NO - New tables only

## Notes

**Known Issue - Type Mismatch**:
- `menus.id` is TEXT but `menu_dishes.menu_id` is UUID
- This prevents foreign key constraint creation
- Fixed in migration `0007_fix_menus_id_type`
- This was an oversight during initial schema design

**Design Decisions**:
- TEXT used for menu IDs initially (should have been UUID)
- Composite primary keys (tenant_id + id) for tenant isolation
- Soft deletes enabled via deleted_at
- Course stored as TEXT (not enum) for flexibility
- sort_order allows manual dish ordering within courses

## Related Issues

- Related to events module menu selection feature
- Enables TPP PDF parser to associate dishes with menus
- Migration 0007 required to fix type mismatch

## References

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- Schema Contract: `docs/legacy-contracts/schema-contract-v2.txt`
