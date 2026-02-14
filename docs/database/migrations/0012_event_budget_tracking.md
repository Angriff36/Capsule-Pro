# Migration 0012: Event Budget Tracking

## Migration Metadata

- **Migration ID**: `20260124120000_event_budget_tracking`
- **Created**: 2026-01-24
- **Author**: Database Team
- **Status**: Deployed

## Overview

Introduces comprehensive budget tracking for events, including budget versions, line items, and automated alerting. Enables financial oversight and variance analysis for catering operations.

**Business Context**: Events require detailed budget tracking to monitor costs, compare budgeted vs actual spending, and alert when thresholds are exceeded.

## Dependencies

**Requires:**
- `0_init`: Base schemas
- Previous event migrations (events table)

**Required by:**
- `20260129120000_add_foreign_keys`: Foreign key constraints

## Changes

### Tables Modified

| Table | Column | Change | Reason |
|-------|--------|--------|--------|
| events (tenant_events) | venue_id | ADD COLUMN UUID | Link to venue location |

### Tables Added

| Table Name | Schema | Description |
|------------|--------|-------------|
| event_budgets | tenant_events | Event budget tracking with versioning |
| budget_line_items | tenant_events | Budget line items with variance tracking |
| budget_alerts | tenant_staff | Budget threshold alerts |

### Columns Added: event_budgets

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tenant_id | UUID | NO | - | Tenant identifier (composite PK) |
| id | UUID | NO | gen_random_uuid() | Budget identifier (composite PK) |
| event_id | UUID | NO | - | Reference to events table (FK) |
| version | INTEGER | NO | 1 | Budget version for revision tracking |
| status | TEXT | NO | 'draft' | Budget status (draft, active, finalized) |
| total_budget_amount | DECIMAL(12,2) | NO | 0 | Total budgeted amount |
| total_actual_amount | DECIMAL(12,2) | NO | 0 | Total actual spend |
| variance_amount | DECIMAL(12,2) | NO | 0 | Budget variance (actual - budget) |
| variance_percentage | DECIMAL(5,2) | NO | 0 | Variance as percentage |
| notes | TEXT | YES | - | Budget notes |
| created_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Update timestamp |
| deleted_at | TIMESTAMPTZ(6) | YES | - | Soft delete timestamp |

### Columns Added: budget_line_items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tenant_id | UUID | NO | - | Tenant identifier (composite PK) |
| id | UUID | NO | gen_random_uuid() | Line item identifier (composite PK) |
| budget_id | UUID | NO | - | Reference to event_budgets (FK) |
| category | TEXT | NO | - | Expense category |
| name | TEXT | NO | - | Line item name |
| description | TEXT | YES | - | Line item description |
| budgeted_amount | DECIMAL(12,2) | NO | 0 | Budgeted amount |
| actual_amount | DECIMAL(12,2) | NO | 0 | Actual amount spent |
| variance_amount | DECIMAL(12,2) | NO | 0 | Variance (actual - budgeted) |
| sort_order | INTEGER | NO | 0 | Display order |
| notes | TEXT | YES | - | Line item notes |
| created_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Update timestamp |
| deleted_at | TIMESTAMPTZ(6) | YES | - | Soft delete timestamp |

### Columns Added: budget_alerts

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tenant_id | UUID | NO | - | Tenant identifier (composite PK) |
| id | UUID | NO | gen_random_uuid() | Alert identifier (composite PK) |
| budget_id | UUID | NO | - | Reference to event_budgets (FK) |
| alert_type | TEXT | NO | - | Alert type (over_budget, at_threshold, etc.) |
| utilization | DECIMAL(5,2) | NO | - | Budget utilization percentage |
| message | TEXT | NO | - | Alert message |
| is_acknowledged | BOOLEAN | NO | false | Whether alert was acknowledged |
| acknowledged_by | UUID | YES | - | Employee who acknowledged |
| acknowledged_at | TIMESTAMPTZ(6) | YES | - | Acknowledgment timestamp |
| resolved | BOOLEAN | NO | false | Whether alert was resolved |
| resolved_at | TIMESTAMPTZ(6) | YES | - | Resolution timestamp |
| created_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Update timestamp |
| deleted_at | TIMESTAMPTZ(6) | YES | - | Soft delete timestamp |

### Indexes Added

| Index Name | Table | Columns | Unique | Purpose |
|------------|-------|---------|--------|---------|
| idx_events_venue_id | events | tenant_id, venue_id | NO | Event venue lookups |
| events_tenant_id_id_key | events | tenant_id, id | YES | Unique constraint |
| event_budgets_event_id_idx | event_budgets | tenant_id, event_id | NO | Budget lookups by event |
| event_budgets_status_idx | event_budgets | tenant_id, status | NO | Filter by status |
| budget_line_items_budget_id_idx | budget_line_items | tenant_id, budget_id | NO | Line item lookups |
| budget_line_items_category_idx | budget_line_items | tenant_id, category | NO | Filter by category |
| budget_alerts_budget_idx | budget_alerts | tenant_id, budget_id | NO | Alert lookups |
| budget_alerts_type_idx | budget_alerts | tenant_id, alert_type | NO | Filter by type |
| budget_alerts_acknowledged_idx | budget_alerts | is_acknowledged | NO | Filter by acknowledgment |

### Foreign Keys Added

| FK Name | Child Table | Parent Table | On Delete | Purpose |
|---------|-------------|--------------|-----------|---------|
| event_budgets_tenant_id_foreign | event_budgets | accounts (platform) | RESTRICT | Tenant account constraint |
| event_budgets_event_id_foreign | event_budgets | events | CASCADE | Budgets deleted with event |
| budget_line_items_tenant_id_foreign | budget_line_items | accounts (platform) | RESTRICT | Tenant account constraint |
| budget_line_items_budget_id_foreign | budget_line_items | event_budgets | CASCADE | Line items deleted with budget |
| budget_alerts_tenant_id_foreign | budget_alerts | accounts (platform) | RESTRICT | Tenant account constraint |
| budget_alerts_budget_id_foreign | budget_alerts | event_budgets | CASCADE | Alerts deleted with budget |

### RLS Policies Added

**event_budgets**:
- `event_budgets_select`: Filter by tenant_id, exclude deleted
- `event_budgets_insert`: Require tenant_id match
- `event_budgets_update`: Tenant isolation + soft delete aware
- `event_budgets_delete`: Prevent hard deletes
- `event_budgets_service`: Service role bypass

**budget_line_items**:
- `budget_line_items_select`: Filter by tenant_id, exclude deleted
- `budget_line_items_insert`: Require tenant_id match
- `budget_line_items_update`: Tenant isolation + soft delete aware
- `budget_line_items_delete`: Prevent hard deletes
- `budget_line_items_service`: Service role bypass

**budget_alerts**:
- `budget_alerts_select`: Filter by tenant_id, exclude deleted
- `budget_alerts_insert`: Require tenant_id match
- `budget_alerts_update`: Tenant isolation + soft delete aware
- `budget_alerts_delete`: Prevent hard deletes
- `budget_alerts_service`: Service role bypass

### Triggers Added

| Trigger Name | Table | Event | Timing | Function | Purpose |
|--------------|-------|-------|--------|----------|---------|
| event_budgets_update_timestamp | event_budgets | UPDATE | BEFORE | core.fn_update_timestamp() | Auto-update updated_at |
| event_budgets_prevent_tenant_mutation | event_budgets | UPDATE | BEFORE | core.fn_prevent_tenant_mutation() | Prevent tenant_id changes |
| budget_line_items_update_timestamp | budget_line_items | UPDATE | BEFORE | core.fn_update_timestamp() | Auto-update updated_at |
| budget_line_items_prevent_tenant_mutation | budget_line_items | UPDATE | BEFORE | core.fn_prevent_tenant_mutation() | Prevent tenant_id changes |
| budget_alerts_update_timestamp | budget_alerts | UPDATE | BEFORE | core.fn_update_timestamp() | Auto-update updated_at |
| budget_alerts_prevent_tenant_mutation | budget_alerts | UPDATE | BEFORE | core.fn_prevent_tenant_mutation() | Prevent tenant_id changes |

### Replication Identity

- **event_budgets**: REPLICA IDENTITY FULL (for real-time)
- **budget_line_items**: REPLICA IDENTITY FULL (for real-time)
- **budget_alerts**: REPLICA IDENTITY FULL (for real-time)

## Rollback Plan

### Automated Rollback

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS event_budgets_update_timestamp ON tenant_events.event_budgets;
DROP TRIGGER IF EXISTS event_budgets_prevent_tenant_mutation ON tenant_events.event_budgets;
DROP TRIGGER IF EXISTS budget_line_items_update_timestamp ON tenant_events.budget_line_items;
DROP TRIGGER IF EXISTS budget_line_items_prevent_tenant_mutation ON tenant_events.budget_line_items;
DROP TRIGGER IF EXISTS budget_alerts_update_timestamp ON tenant_staff.budget_alerts;
DROP TRIGGER IF EXISTS budget_alerts_prevent_tenant_mutation ON tenant_staff.budget_alerts;

-- Drop RLS policies
DROP POLICY IF EXISTS event_budgets_select ON tenant_events.event_budgets;
DROP POLICY IF EXISTS event_budgets_insert ON tenant_events.event_budgets;
DROP POLICY IF EXISTS event_budgets_update ON tenant_events.event_budgets;
DROP POLICY IF EXISTS event_budgets_delete ON tenant_events.event_budgets;
DROP POLICY IF EXISTS event_budgets_service ON tenant_events.event_budgets;
-- (Repeat for budget_line_items and budget_alerts)

-- Drop foreign keys
ALTER TABLE tenant_events.event_budgets DROP CONSTRAINT IF EXISTS event_budgets_tenant_id_foreign;
ALTER TABLE tenant_events.event_budgets DROP CONSTRAINT IF EXISTS event_budgets_event_id_foreign;
ALTER TABLE tenant_events.budget_line_items DROP CONSTRAINT IF EXISTS budget_line_items_tenant_id_foreign;
ALTER TABLE tenant_events.budget_line_items DROP CONSTRAINT IF EXISTS budget_line_items_budget_id_foreign;
ALTER TABLE tenant_staff.budget_alerts DROP CONSTRAINT IF EXISTS budget_alerts_tenant_id_foreign;
ALTER TABLE tenant_staff.budget_alerts DROP CONSTRAINT IF EXISTS budget_alerts_budget_id_foreign;

-- Drop indexes
DROP INDEX IF EXISTS tenant_events.idx_events_venue_id;
DROP INDEX IF EXISTS tenant_events.events_tenant_id_id_key;
DROP INDEX IF EXISTS tenant_events.event_budgets_event_id_idx;
DROP INDEX IF EXISTS tenant_events.event_budgets_status_idx;
DROP INDEX IF EXISTS tenant_events.budget_line_items_budget_id_idx;
DROP INDEX IF EXISTS tenant_events.budget_line_items_category_idx;
DROP INDEX IF EXISTS tenant_staff.budget_alerts_budget_idx;
DROP INDEX IF EXISTS tenant_staff.budget_alerts_type_idx;
DROP INDEX IF EXISTS tenant_staff.budget_alerts_acknowledged_idx;

-- Drop tables
DROP TABLE IF EXISTS tenant_events.budget_line_items CASCADE;
DROP TABLE IF EXISTS tenant_events.event_budgets CASCADE;
DROP TABLE IF EXISTS tenant_staff.budget_alerts CASCADE;

-- Remove venue_id column
ALTER TABLE tenant_events.events DROP COLUMN IF EXISTS venue_id;
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
WHERE table_name IN ('event_budgets', 'budget_line_items')
AND table_schema = 'tenant_events'
UNION ALL
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name = 'budget_alerts'
AND table_schema = 'tenant_staff';

-- Verify venue_id column added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'events'
AND table_schema = 'tenant_events'
AND column_name = 'venue_id';

-- Verify foreign keys
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_schema IN ('tenant_events', 'tenant_staff')
AND constraint_type = 'FOREIGN KEY'
AND table_name IN ('event_budgets', 'budget_line_items', 'budget_alerts');

-- Verify RLS policies
SELECT tablename, policyname, permissive, roles
FROM pg_policies
WHERE schemaname IN ('tenant_events', 'tenant_staff')
AND tablename IN ('event_budgets', 'budget_line_items', 'budget_alerts');
```

### Application Verification

- [ ] Application starts without errors
- [ ] Budget creation works
- [ ] Line item tracking functions
- [ ] Alerts trigger on thresholds
- [ ] Variance calculations accurate

## Performance Impact

### Expected Impact

- **Query performance**: NO CHANGE (new tables, indexed)
- **Storage**: Minimal increase (new empty tables)
- **Alert generation**: LOW overhead (triggered on updates)

### Mitigation

None required for new tables.

## Security Considerations

- [x] RLS policies applied to all tables
- [x] Service role bypass defined
- [x] Tenant isolation enforced
- [x] Soft deletes enabled
- [x] Audit trail maintained

## Breaking Changes

### API Changes

- [ ] NONE - New tables and column only

### Data Access Changes

- [ ] NONE - New functionality only

### Migration Required

- [ ] NO - New tables only

## Notes

**Design Decisions**:
- **Version tracking**: Supports budget revisions without losing history
- **Variance calculation**: Automatic tracking of budget vs actual
- **Alert system**: Proactive notification of budget issues
- **Cross-schema**: budget_alerts in tenant_staff for staff notifications

**Budget Categories** (application-defined):
- Staffing: Labor costs
- Food: Ingredients and supplies
- Beverage: Drinks and bar costs
- Equipment: Rental and purchase
- Transportation: Delivery and logistics
- Miscellaneous: Other expenses

**Alert Types** (application-defined):
- `over_budget`: Actual exceeds budgeted
- `at_threshold`: Approaching limit (e.g., 80%)
- `variance_high`: Significant variance
- `on_track`: Budget trending well

## Related Issues

- Enables event financial tracking
- Supports budget variance analysis
- Integrates with staffing module for labor costs

## References

- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Schema Contract: `docs/legacy-contracts/schema-contract-v2.txt`
