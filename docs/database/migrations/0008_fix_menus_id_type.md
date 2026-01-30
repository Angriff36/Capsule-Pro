# Migration 0007: Fix Menus ID Type

## Migration Metadata

- **Migration ID**: `20260129120001_fix_menus_id_type`
- **Created**: 2026-01-29
- **Author**: Database Team
- **Status**: Deployed

## Overview

Fixes a type mismatch in the `menus` table by changing the `id` column from TEXT to UUID. This is required to enable the foreign key constraint from `menu_dishes.menu_id` (UUID) to `menus.id`.

**Business Context**: Migration 0005 created `menus.id` as TEXT but `menu_dishes.menu_id` as UUID, preventing referential integrity. This migration corrects the type mismatch.

## Dependencies

**Requires:**
- `20260126145500_add_menu_models`: Creates the menus table with TEXT id
- `20260101000000_enable_pgcrypto`: For gen_random_uuid() function

**Required by:**
- `20260129120000_add_foreign_keys`: Foreign key constraint creation

## Changes

### Columns Modified

| Table | Column | Change | Reason |
|-------|--------|--------|--------|
| menus (tenant_kitchen) | id | TEXT → UUID | Match menu_dishes.menu_id type for FK constraint |

### SQL Operations

```sql
-- Change menus.id from text to uuid to match menu_dishes.menu_id
-- This is required for the fk_menu_dishes_menu foreign key constraint

ALTER TABLE tenant_kitchen.menus
ALTER COLUMN id TYPE UUID USING (id::UUID),
ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

**Important Notes**:
- Uses `USING (id::UUID)` to cast existing TEXT values to UUID
- Adds `gen_random_uuid()` as default for new rows
- Assumes existing TEXT values are valid UUID strings
- Fails if any existing id values are not valid UUIDs

## Rollback Plan

### Automated Rollback

```sql
-- Revert id back to TEXT
ALTER TABLE tenant_kitchen.menus
ALTER COLUMN id TYPE TEXT USING (id::TEXT),
ALTER COLUMN id DROP DEFAULT;
```

**WARNING**:
- Rollback will fail if foreign keys have been created
- Must drop FK constraints before rolling back
- Data type conversion may lose precision

### Data Migration Impact

- **Rows affected**: All existing rows in menus table
- **Data loss risk**: LOW if existing values are valid UUIDs, HIGH otherwise
- **Rollback data needed**: NO (reversible type conversion)

## Verification

### Pre-Deployment Checks

- [ ] Verify all existing menus.id values are valid UUIDs
- [ ] Ensure no orphaned menu_dishes records exist
- [ ] Backup available

### Post-Deployment Verification

```sql
-- Verify id column type is now UUID
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'menus'
AND table_schema = 'tenant_kitchen'
AND column_name = 'id';

-- Verify data integrity (no conversion failures)
SELECT COUNT(*) AS total_menus,
       COUNT(CASE WHEN id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) AS valid_uuids
FROM tenant_kitchen.menus;

-- Verify primary key still works
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'menus'
AND table_schema = 'tenant_kitchen';

-- Verify matching types with menu_dishes
SELECT
    (SELECT data_type FROM information_schema.columns
     WHERE table_name = 'menus' AND column_name = 'id' AND table_schema = 'tenant_kitchen') AS menus_id_type,
    (SELECT data_type FROM information_schema.columns
     WHERE table_name = 'menu_dishes' AND column_name = 'menu_id' AND table_schema = 'tenant_kitchen') AS menu_dishes_menu_id_type;
```

**Expected Result**: Both columns should show `uuid`

### Application Verification

- [ ] Application starts without errors
- [ ] Menu queries return UUID ids correctly
- [ ] Menu creation uses default UUID generation
- [ ] Type coercion works in application code
- [ ] No errors in application logs related to type conversion

## Performance Impact

### Expected Impact

- **Query performance**: NO CHANGE (UUID vs TEXT has minimal difference)
- **Storage**: NO CHANGE (both use similar space)
- **Index maintenance**: NO CHANGE (index structure unchanged)

### Mitigation

None required.

## Security Considerations

- [x] Data integrity maintained through type conversion
- [x] Primary key constraints preserved
- [x] No security implications from type change
- [x] UUID format provides better uniqueness guarantees than TEXT

## Breaking Changes

### API Changes

- [ ] **BREAKING** - Type of menus.id changes from TEXT to UUID
  - Applications expecting TEXT may need updates
  - JSON serialization changes (quotes vs no quotes)
  - Form validation rules must accept UUID format

### Data Access Changes

- [ ] **POTENTIAL BREAKING** - Queries filtering by id must use UUID format
  - Old: `WHERE id = '550e8400-e29b-41d4-a716-446655440000'` (TEXT)
  - New: `WHERE id = '550e8400-e29b-41d4-a716-446655440000'::uuid` (UUID)

### Migration Required

- [x] **YES** - Application code updates needed
  1. Update TypeScript types: `id: string` → `id: string` (still string in runtime)
  2. Update Prisma schema: `id String @id` → `id String @id @db.Uuid`
  3. Regenerate Prisma client: `pnpm prisma:generate`
  4. Update validation logic to ensure UUID format
  5. Test all menu CRUD operations

## Notes

**Root Cause**:
- Migration 0005 created menus.id as TEXT (oversight)
- menu_dishes.menu_id was correctly created as UUID
- Type mismatch prevented foreign key creation
- This migration fixes the inconsistency

**Why UUID is Better**:
- Automatic uniqueness guarantees
- Better for distributed systems
- Standard format for identifiers
- Enforced validation by database
- Smaller index footprint than random TEXT

**Conversion Safety**:
- Migration assumes existing TEXT values are valid UUIDs
- If conversion fails, entire migration rolls back
- Pre-deployment validation recommended:
  ```sql
  -- Check for invalid UUIDs before running migration
  SELECT id FROM tenant_kitchen.menus
  WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  ```

**Impact on Foreign Keys**:
- Enables creation of fk_menu_dishes_menu in migration 0010
- Without this fix, referential integrity cannot be enforced
- Menu-dish relationships would remain unconstrained

## Related Issues

- Fixes issue introduced in migration 0005
- Required for migration 0010 (foreign keys)
- Enables proper data integrity for menu management

## References

- [PostgreSQL ALTER COLUMN TYPE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL UUID Type](https://www.postgresql.org/docs/current/datatype-uuid.html)
- [PostgreSQL Type Casting](https://www.postgresql.org/docs/current/sql-expressions.html#SQL-SYNTAX-TYPE-CASTS)
- Schema Contract: `docs/legacy-contracts/schema-contract-v2.txt`
