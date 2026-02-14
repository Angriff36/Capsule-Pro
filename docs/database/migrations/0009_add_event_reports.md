# Migration 0008: Add Event Reports Table

## Migration Metadata

- **Migration ID**: `20260129120002_add_event_reports`
- **Created**: 2026-01-29
- **Author**: Database Team
- **Status**: Deployed

## Overview

Creates the `event_reports` table in the tenant_events schema to support post-event reporting and analytics. This enables generation of summary reports, performance metrics, and operational insights for catering events.

**Business Context**: After events complete, operations teams need comprehensive reports covering staffing, costs, execution quality, and lessons learned. This table stores report metadata and configuration.

## Dependencies

**Requires:**
- `0_init`: Base tenant_events schema
- Previous event migrations (Event table creation)

**Required by:**
- Application reporting features
- Analytics dashboards

## Changes

### Tables Added

| Table Name | Schema | Description |
|------------|--------|-------------|
| event_reports | tenant_events | Post-event reports with status tracking and auto-fill metrics |

### Columns Added: event_reports

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tenant_id | UUID | NO | - | Tenant identifier (composite PK) |
| id | UUID | NO | gen_random_uuid() | Report identifier (composite PK) |
| event_id | UUID | NO | - | Reference to events table (FK) |
| name | TEXT | NO | - | Report title/name |
| status | TEXT | NO | 'draft' | Report status (draft, in_progress, completed) |
| completion | INTEGER | NO | 0 | Completion percentage (0-100) |
| auto_fill_score | SMALLINT | YES | - | Auto-fill quality score |
| report_config | JSONB | YES | - | Report configuration and settings |
| created_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Record update timestamp |
| deleted_at | TIMESTAMPTZ(6) | YES | - | Soft delete timestamp |

### Indexes Added

| Index Name | Table | Columns | Unique | Purpose |
|------------|-------|---------|--------|---------|
| event_reports_event_id_idx | event_reports | event_id | NO | Query optimization for event lookups |

### Foreign Keys Added

| FK Name | Child Table | Parent Table | On Delete | Purpose |
|---------|-------------|--------------|-----------|---------|
| fk_event_reports_event | event_reports | events | CASCADE | Ensure report deleted with event |

### SQL Operations

```sql
-- Create event_reports table for tenant_events schema

CREATE TABLE tenant_events.event_reports (
    tenant_id       UUID NOT NULL,
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL,
    name            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft',
    completion      INTEGER NOT NULL DEFAULT 0,
    auto_fill_score SMALLINT,
    report_config   JSONB,
    created_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMPTZ(6),

    CONSTRAINT event_reports_pkey PRIMARY KEY (tenant_id, id)
);

CREATE INDEX event_reports_event_id_idx ON tenant_events.event_reports(event_id);

-- Add foreign key constraint for event_reports.event_id -> events(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_event_reports_event'
        AND table_schema = 'tenant_events'
    ) THEN
        ALTER TABLE tenant_events.event_reports
        ADD CONSTRAINT fk_event_reports_event
        FOREIGN KEY (tenant_id, event_id)
        REFERENCES tenant_events.events(tenant_id, id)
        ON DELETE CASCADE;
    END IF;
END $$;
```

## Rollback Plan

### Automated Rollback

```sql
-- Drop foreign key first
ALTER TABLE tenant_events.event_reports
DROP CONSTRAINT IF EXISTS fk_event_reports_event;

-- Drop index
DROP INDEX IF EXISTS tenant_events.event_reports_event_id_idx;

-- Drop table
DROP TABLE IF EXISTS tenant_events.event_reports CASCADE;
```

### Data Migration Impact

- **Rows affected**: 0 (new table)
- **Data loss risk**: NONE (new table only)
- **Rollback data needed**: NO

## Verification

### Post-Deployment Verification

```sql
-- Verify table created
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name = 'event_reports'
AND table_schema = 'tenant_events';

-- Verify columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'event_reports'
AND table_schema = 'tenant_events'
ORDER BY ordinal_position;

-- Verify primary key
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'event_reports'
AND table_schema = 'tenant_events';

-- Verify foreign key
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'event_reports'
AND tc.table_schema = 'tenant_events'
AND tc.constraint_type = 'FOREIGN KEY';

-- Verify index
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'tenant_events'
AND tablename = 'event_reports';
```

### Application Verification

- [ ] Application starts without errors
- [ ] Report creation works
- [ ] Event association functions correctly
- [ ] CASCADE delete works when event deleted
- [ ] JSONB config stores and retrieves correctly

## Performance Impact

### Expected Impact

- **Query performance**: NO CHANGE (new table)
- **Index maintenance**: LOW overhead (1 index on event_id)
- **Storage**: Minimal initial storage (new empty table)
- **JSONB operations**: FAST (PostgreSQL optimized JSONB)

### Mitigation

None required for new table.

## Security Considerations

- [x] RLS policies need to be applied (not included in this migration)
- [x] Tenant isolation enforced via composite primary key
- [x] Foreign key ensures data integrity
- [x] CASCADE delete prevents orphaned reports
- [x] Audit trail maintained (created_at, updated_at, deleted_at)

**Note**: RLS policies should be added in a follow-up migration.

## Breaking Changes

### API Changes

- [ ] NONE - New table only

### Data Access Changes

- [ ] NONE - New table only

### Migration Required

- [ ] NO - New table only

## Notes

**Design Decisions**:
- **Composite PK**: (tenant_id, id) for tenant isolation
- **CASCADE delete**: Reports automatically removed when event deleted
- **JSONB config**: Flexible report configuration without schema changes
- **Status enum**: TEXT for flexibility (can be extended without migration)
- **Auto-fill score**: Enables AI/automation features for report generation
- **Completion percentage**: Supports progress tracking

**Use Cases**:
1. **Post-Event Analysis**: Comprehensive operational reports
2. **Performance Metrics**: Staff efficiency, cost variance, timeline adherence
3. **Lessons Learned**: Document issues and improvements
4. **Client Reporting**: Professional summaries for event clients
5. **Operational Insights**: Trends across multiple events

**JSONB Config Structure** (application-defined):
```json
{
  "include_staffing": true,
  "include_financials": true,
  "include_timeline": true,
  "include_feedback": true,
  "custom_sections": [...],
  "template_id": "standard_post_event"
}
```

**Status Values** (application-enforced):
- `draft`: Initial creation
- `in_progress`: Being filled out
- `completed`: Ready for review/delivery
- `archived`: Historical record

## Related Issues

- Enables events module reporting features
- Supports analytics dashboard integration
- Part of post-event workflow automation

## References

- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html)
- Schema Contract: `docs/legacy-contracts/schema-contract-v2.txt`
