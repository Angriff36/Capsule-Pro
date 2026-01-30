# Migration Documentation Template

Use this template to document new database migrations. Copy this file and fill in the sections.

## Migration Metadata

- **Migration ID**: `YYYYMMDDHHMMSS_description`
- **Created**: YYYY-MM-DD
- **Author**: Your Name
- **Status**: Draft | Pending Review | Approved | Deployed | Rolled Back

## Overview

[Brief description of what this migration does and why it's needed]

## Dependencies

**Requires:**
- Migration ID: Description of dependency
- Migration ID: Description of dependency

**Required by:**
- Migration ID: Description of dependent migration

## Changes

### Tables Added

| Table Name | Schema | Description |
|------------|--------|-------------|
| table_name | schema_name | Brief description |

### Tables Modified

| Table Name | Schema | Changes |
|------------|--------|---------|
| table_name | schema_name | Brief description of changes |

### Tables Dropped

| Table Name | Schema | Reason |
|------------|--------|--------|
| table_name | schema_name | Reason for removal |

### Columns Added

| Table | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| table_name | column_name | type | YES/NO | value | Description |

### Columns Modified

| Table | Column | Change | Reason |
|-------|--------|--------|--------|
| table_name | column_name | Description of change | Reason |

### Columns Dropped

| Table | Column | Reason |
|-------|--------|--------|
| table_name | column_name | Reason for removal |

### Indexes Added

| Index Name | Table | Columns | Unique | Purpose |
|------------|-------|---------|--------|---------|
| index_name | table_name | column1, column2 | YES/NO | Query optimization |

### Foreign Keys Added

| FK Name | Child Table | Parent Table | On Delete | Purpose |
|---------|-------------|--------------|-----------|---------|
| fk_name | child_table | parent_table | CASCADE/SET NULL/RESTRICT | Description |

### Enums Added

| Enum Name | Values | Purpose |
|-----------|--------|---------|
| enum_name | value1, value2, value3 | Description |

### RLS Policies Added

| Policy Name | Table | Operation | Using | With Check |
|-------------|-------|-----------|-------|------------|
| policy_name | table_name | SELECT/INSERT/UPDATE/DELETE | Expression | Expression |

### Functions Added

| Function Name | Schema | Return Type | Purpose |
|---------------|--------|-------------|---------|
| function_name | schema_name | return_type | Description |

### Triggers Added

| Trigger Name | Table | Event | Timing | Function | Purpose |
|--------------|-------|-------|--------|----------|---------|
| trigger_name | table_name | INSERT/UPDATE/DELETE | BEFORE/AFTER | function_name | Description |

## Rollback Plan

### Automated Rollback

[If automated rollback is possible, describe the SQL to reverse changes]

```sql
-- Example: Drop table
DROP TABLE IF EXISTS schema_name.table_name CASCADE;

-- Example: Remove column
ALTER TABLE schema_name.table_name
DROP COLUMN IF EXISTS column_name;

-- Example: Remove constraint
ALTER TABLE schema_name.table_name
DROP CONSTRAINT IF EXISTS constraint_name;
```

### Manual Rollback

[If manual rollback is required, describe the steps]

1. Step 1: Description
2. Step 2: Description
3. Step 3: Description

### Data Migration Impact

- **Rows affected**: Estimated number
- **Data loss risk**: NONE / LOW / MEDIUM / HIGH
- **Rollback data needed**: YES / NO

## Verification

### Pre-Deployment Checks

- [ ] Migration script reviewed
- [ ] Rollback plan tested in dev
- [ ] Dependencies verified
- [ ] Performance impact assessed
- [ ] Backup confirmed available

### Post-Deployment Verification

```sql
-- Verify tables created
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name IN ('table1', 'table2');

-- Verify columns added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'table_name';

-- Verify indexes created
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE '%pattern%';

-- Verify foreign keys
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'schema_name';

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'table_name';

-- Verify row counts
SELECT COUNT(*) FROM schema_name.table_name;
```

### Application Verification

- [ ] Application starts without errors
- [ ] API endpoints respond correctly
- [ ] Data queries return expected results
- [ ] No errors in application logs
- [ ] Performance acceptable

## Performance Impact

### Expected Impact

- **Query performance**: IMPROVE / DEGRADE / NO CHANGE
- **Index maintenance**: LOW / MEDIUM / HIGH overhead
- **Storage**: Estimated additional storage (MB/GB)

### Mitigation

[If performance degradation expected, describe mitigation]

## Security Considerations

- [ ] RLS policies applied (for tenant tables)
- [ ] Service role policies defined
- [ ] No hardcoded secrets
- [ ] No privilege escalation risks
- [ ] Audit trail maintained

## Breaking Changes

### API Changes

- [ ] NONE - List any API changes here

### Data Access Changes

- [ ] NONE - List any data access changes here

### Migration Required

- [ ] NO - Describe if data migration is needed

## Notes

[Additional notes, decisions, or context that may be helpful for future developers]

## Related Issues

- Issue #123: Title of related issue
- PR #456: Title of related PR

## References

- [Prisma Migration Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Internal doc: Link to related documentation
