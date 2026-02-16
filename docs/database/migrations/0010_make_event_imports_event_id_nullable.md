# Migration 0009: Make Event Imports Event ID Nullable

## Migration Metadata

- **Migration ID**: `20260129120003_make_event_imports_event_id_nullable`
- **Created**: 2026-01-29
- **Author**: Database Team
- **Status**: Deployed

## Overview

Modifies the `event_imports` table to allow `event_id` to be NULL, enabling storage of event import records that are not yet associated with an event. This supports workflows where imports are processed and validated before creating events.

**Business Context**: Event imports from CSV/PDF may need preprocessing, validation, and approval before an actual event is created. This change allows import records to exist independently of events.

## Dependencies

**Requires:**
- `0_init`: Base tenant_events schema
- Previous event migrations (event_imports table creation)

**Required by:**
- Event import workflow features
- Batch import processing

## Changes

### Columns Modified

| Table | Column | Change | Reason |
|-------|--------|--------|--------|
| event_imports (tenant_events) | event_id | NOT NULL → NULL | Allow imports without associated events |

### Foreign Keys Modified

| FK Name | Table | Change | Reason |
|---------|-------|--------|--------|
| fk_event_imports_event | event_imports | ON DELETE behavior → ON DELETE SET NULL | Allow imports to survive event deletion |

### SQL Operations

```sql
-- Make event_imports.event_id nullable to allow imports without an event

-- First drop the FK constraint
ALTER TABLE tenant_events.event_imports
DROP CONSTRAINT IF EXISTS fk_event_imports_event;

-- Drop the NOT NULL constraint on event_id
ALTER TABLE tenant_events.event_imports
ALTER COLUMN event_id DROP NOT NULL;

-- Re-add the FK constraint (allows NULL values)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_imports_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_imports
        ADD CONSTRAINT fk_event_imports_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE SET NULL;
    END IF;
END $$;
```

**Important Notes**:
- Drops original foreign key constraint
- Removes NOT NULL constraint
- Recreates foreign key with `ON DELETE SET NULL`
- Allows event_id to be NULL (orphaned imports)
- Preserves referential integrity when event_id is not NULL

## Rollback Plan

### Automated Rollback

```sql
-- Drop the nullable foreign key
ALTER TABLE tenant_events.event_imports
DROP CONSTRAINT IF EXISTS fk_event_imports_event;

-- Make event_id NOT NULL (may fail if NULLs exist)
ALTER TABLE tenant_events.event_imports
ALTER COLUMN event_id SET NOT NULL;

-- Recreate original foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_imports_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_imports
        ADD CONSTRAINT fk_event_imports_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
```

**WARNING**: Rollback will fail if any NULL event_id values exist.

### Data Migration Impact

- **Rows affected**: 0 (schema change only)
- **Data loss risk**: LOW (enables new use cases, doesn't break existing)
- **Rollback data needed**: NO

## Verification

### Pre-Deployment Checks

- [ ] Verify no orphaned event_imports exist (event_id IS NULL)
- [ ] Check application code handles NULL event_id
- [ ] Backup available

### Post-Deployment Verification

```sql
-- Verify event_id is now nullable
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'event_imports'
AND table_schema = 'tenant_events'
AND column_name = 'event_id';

-- Verify foreign key allows NULLs
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'event_imports'
AND tc.table_schema = 'tenant_events'
AND kcu.column_name = 'event_id';

-- Verify delete rule is SET NULL
-- Expected: delete_rule = 'SET NULL'

-- Test: Insert record with NULL event_id
INSERT INTO tenant_events.event_imports (
    tenant_id, id, event_id, source_file, status
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(),
    NULL,
    'test.csv',
    'pending'
);

-- Verify insert succeeded
SELECT COUNT(*) AS null_event_id_count
FROM tenant_events.event_imports
WHERE event_id IS NULL;

-- Cleanup test record
DELETE FROM tenant_events.event_imports
WHERE event_id IS NULL
AND source_file = 'test.csv';
```

### Application Verification

- [ ] Application starts without errors
- [ ] Import creation works without event_id
- [ ] Import-to-event linking works correctly
- [ ] Queries handle NULL event_id properly
- [ ] SET NULL on delete works (event deletion)

## Performance Impact

### Expected Impact

- **Query performance**: MINIMAL degradation (NULLs in indexed column)
- **Index maintenance**: NO CHANGE
- **Storage**: NO CHANGE

### Mitigation

- Consider partial index on non-NULL event_ids if most queries filter by event_id:
  ```sql
  CREATE INDEX idx_event_imports_with_event
  ON tenant_events.event_imports(event_id)
  WHERE event_id IS NOT NULL;
  ```

## Security Considerations

- [x] Data integrity maintained (FK still enforced when not NULL)
- [x] No security implications from nullable column
- [x] Application must validate NULL handling
- [x] SET NULL prevents orphaned references on delete

**Security Notes**:
- NULL event_id values are valid (imports without events)
- Application must check `event_id IS NULL` before dereferencing
- Queries must handle NULL in JOINs:
  ```sql
  -- Use LEFT JOIN to include imports without events
  SELECT ei.*, e.name
  FROM tenant_events.event_imports ei
  LEFT JOIN tenant_events.events e ON ei.event_id = e.id;
  ```

## Breaking Changes

### API Changes

- [ ] **POTENTIAL BREAKING** - event_id can now be NULL
  - Applications assuming NOT NULL must add NULL checks
  - TypeScript types must allow `null | undefined`

### Data Access Changes

- [ ] **POTENTIAL BREAKING** - Queries must handle NULL
  - INNER JOINs will exclude imports without events
  - Use LEFT JOIN to include all imports
  - Add `WHERE event_id IS NOT NULL` for existing behavior

### Migration Required

- [x] **YES** - Application code updates needed
  1. Update TypeScript types: `event_id: string` → `event_id: string | null`
  2. Update queries to use LEFT JOIN for event lookups
  3. Add NULL checks before accessing event properties
  4. Update validation logic
  5. Test import workflows

## Notes

**Why This Change Was Needed**:
1. **Staged Import Workflow**: Import → Validate → Approve → Create Event
2. **Batch Processing**: Import multiple events before creating any
3. **Error Handling**: Failed imports shouldn't require event creation
4. **Flexibility**: Allow imports to exist independently

**Workflow Example**:
```
1. User uploads CSV/PDF
2. System creates event_imports record (event_id = NULL)
3. System parses and validates data
4. User reviews import results
5. On approval: system creates event, links import (event_id = event.uuid)
6. On rejection: import remains (event_id = NULL) for debugging
```

**ON DELETE SET NULL**:
- If event is deleted, import record is preserved
- event_id set to NULL (import becomes orphaned)
- Useful for audit trail and debugging
- Prevents accidental data loss

**Data Integrity**:
- When event_id IS NOT NULL: FK enforced (must reference valid event)
- When event_id IS NULL: No FK check (import is standalone)
- Application must enforce business rules for NULL handling

## Related Issues

- Enables staged import workflow
- Supports batch import processing
- Required for import preview/validation features

## References

- [PostgreSQL ALTER COLUMN](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL NULL Handling](https://www.postgresql.org/docs/current/functions-conditional.html)
- Schema Contract: `docs/legacy-contracts/schema-contract-v2.txt`
