# Migration 0010: Add Soft Delete to Event Imports

## Migration Metadata

- **Migration ID**: `20260129120004_add_deleted_at_to_event_imports`
- **Created**: 2026-01-29
- **Author**: Database Team
- **Status**: Deployed

## Overview

Adds the `deleted_at` column to the `event_imports` table to enable soft deletes. This ensures import records are retained for audit purposes and can be recovered if needed.

**Business Context**: Event imports contain valuable data and metadata. Soft deletes preserve this information for debugging, compliance, and analytics while hiding "deleted" records from normal queries.

## Dependencies

**Requires:**
- `0_init`: Base tenant_events schema
- Previous event migrations (event_imports table creation)
- `20260129120003_make_event_imports_event_id_nullable`: Previous event_imports modification

**Required by:**
- Application soft delete functionality
- Audit trail requirements

## Changes

### Columns Added

| Table | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| event_imports (tenant_events) | deleted_at | TIMESTAMPTZ(6) | YES | - | Soft delete timestamp (NULL = active) |

### SQL Operations

```sql
-- Add deleted_at column to event_imports for soft deletes

ALTER TABLE tenant_events.event_imports
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ(6);
```

**Important Notes**:
- Uses `IF NOT EXISTS` to prevent errors if column already exists
- Nullable column (NULL = record is active)
- No default value (explicitly set on deletion)
- No trigger required (application-managed)

## Rollback Plan

### Automated Rollback

```sql
-- Remove deleted_at column
ALTER TABLE tenant_events.event_imports
DROP COLUMN IF EXISTS deleted_at;
```

**WARNING**: Rollback will permanently delete all soft-deleted records (those with deleted_at IS NOT NULL).

### Data Migration Impact

- **Rows affected**: 0 (new column)
- **Data loss risk**: LOW (if rolled back, soft-deleted records lost)
- **Rollback data needed**: YES (if soft-deleted records exist)

## Verification

### Post-Deployment Verification

```sql
-- Verify column added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'event_imports'
AND table_schema = 'tenant_events'
AND column_name = 'deleted_at';

-- Verify data type is correct
SELECT
    column_name,
    data_type,
    character_maximum_length,
    datetime_precision
FROM information_schema.columns
WHERE table_name = 'event_imports'
AND table_schema = 'tenant_events'
AND column_name = 'deleted_at';

-- Expected: data_type = 'timestamp with time zone', datetime_precision = 6

-- Test: Soft delete a record
UPDATE tenant_events.event_imports
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = (
    SELECT id FROM tenant_events.event_imports
    WHERE deleted_at IS NULL
    LIMIT 1
);

-- Verify soft delete worked
SELECT COUNT(*) AS soft_deleted_count
FROM tenant_events.event_imports
WHERE deleted_at IS NOT NULL;

-- Cleanup test (restore)
UPDATE tenant_events.event_imports
SET deleted_at = NULL
WHERE deleted_at IS NOT NULL;
```

### Application Verification

- [ ] Application starts without errors
- [ ] Soft delete operation sets deleted_at
- [ ] Queries filter out soft-deleted records
- [ ] Hard delete prevented (application enforces)
- [ ] Restore/undelete works

## Performance Impact

### Expected Impact

- **Query performance**: MINIMAL degradation (additional WHERE clause)
- **Index maintenance**: NO CHANGE (new column, no index)
- **Storage**: MINIMAL increase (8 bytes per row)

### Mitigation

**Recommended**: Add partial index for active records:
```sql
-- Optimize queries filtering by deleted_at IS NULL
CREATE INDEX idx_event_imports_active
ON tenant_events.event_imports(tenant_id, created_at)
WHERE deleted_at IS NULL;
```

**Query Optimization**:
- Always include `WHERE deleted_at IS NULL` for active records
- Consider index on (tenant_id, deleted_at) if frequent filtering
- Use partial indexes (WHERE deleted_at IS NULL) for better performance

## Security Considerations

- [x] Audit trail maintained (deleted_at timestamps)
- [x] Data recovery enabled (restore from soft delete)
- [x] Compliance requirements met (retain deleted records)
- [x] No direct data loss (soft delete before hard delete)
- [ ] Application must prevent hard deletes (enforce soft delete only)

**Security Notes**:
- Soft-deleted records still exist in database
- Application must filter `deleted_at IS NULL` in queries
- Admin functions should access soft-deleted records (debugging)
- Hard delete should require special privileges (after retention period)

## Breaking Changes

### API Changes

- [ ] NONE - New column only

### Data Access Changes

- [ ] **REQUIRED** - All queries must filter `WHERE deleted_at IS NULL`
  - Old: `SELECT * FROM tenant_events.event_imports`
  - New: `SELECT * FROM tenant_events.event_imports WHERE deleted_at IS NULL`

### Migration Required

- [x] **YES** - Application code updates needed
  1. Update all queries to include `WHERE deleted_at IS NULL`
  2. Add soft delete function (set deleted_at = NOW())
  3. Add restore function (set deleted_at = NULL)
  4. Prevent hard deletes in application code
  5. Update Prisma schema to include deleted_at
  6. Regenerate Prisma client: `pnpm prisma:generate`

## Notes

**Soft Delete Pattern**:
```sql
-- Soft delete (application)
UPDATE tenant_events.event_imports
SET deleted_at = CURRENT_TIMESTAMP
WHERE id = $1;

-- Restore (application)
UPDATE tenant_events.event_imports
SET deleted_at = NULL
WHERE id = $1;

-- Query active records (application)
SELECT * FROM tenant_events.event_imports
WHERE deleted_at IS NULL;

-- Query all records including deleted (admin)
SELECT * FROM tenant_events.event_imports;
```

**Retention Policy** (application-defined):
- Soft-deleted records retained for 90 days
- After retention: hard delete via background job
- Compliance requirements may extend retention
- Audit trail may require permanent retention

**Why Soft Delete**:
1. **Audit Trail**: Track when records were deleted
2. **Recovery**: Restore accidentally deleted records
3. **Compliance**: Meet data retention requirements
4. **Debugging**: Investigate issues with deleted records
5. **Analytics**: Include deleted records in reporting

**Implementation Best Practices**:
1. Always filter `deleted_at IS NULL` in queries
2. Use partial indexes for performance
3. Add application-level soft delete methods
4. Prevent hard deletes in normal operations
5. Implement cleanup job for old soft-deleted records
6. Log all delete operations (who, when, why)

**Index Recommendations**:
```sql
-- For querying active imports
CREATE INDEX idx_event_imports_active
ON tenant_events.event_imports(tenant_id, created_at DESC)
WHERE deleted_at IS NULL;

-- For cleanup jobs
CREATE INDEX idx_event_imports_deleted
ON tenant_events.event_imports(deleted_at)
WHERE deleted_at IS NOT NULL;
```

## Related Issues

- Completes soft delete implementation for event_imports
- Aligns with other tables (menus, menu_dishes, events)
- Supports audit trail requirements

## References

- [PostgreSQL Soft Deletes](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- [Schema Contract: Soft Delete Pattern](docs/legacy-contracts/schema-contract-v2.txt)
