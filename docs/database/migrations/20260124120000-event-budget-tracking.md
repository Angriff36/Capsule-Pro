# Migration: Event Budget Tracking

**Migration ID:** `20260124120000_event_budget_tracking`
**Date Applied:** 2025-01-24
**Schema:** `tenant_events`, `tenant_staff`
**Type:** Feature Addition

## Overview

This migration implements a comprehensive event budget tracking system, enabling financial management for catering events including budget creation, line item tracking, variance analysis, and alerting capabilities.

## Changes

### 1. Events Table Enhancement

**Schema:** `tenant_events.events`

**Added Column:**
- `venue_id` (UUID, nullable) - Links event to a specific venue

**Indexes Added:**
- `idx_events_venue_id` on `(tenant_id, venue_id)` - Optimizes venue-based queries
- `events_tenant_id_id_key` UNIQUE on `(tenant_id, id)` - Ensures uniqueness across tenants

### 2. Event Budgets Table

**Schema:** `tenant_events.event_budgets`

**Purpose:** Primary budget tracking for events, storing overall budget figures and variance calculations.

**Columns:**
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `tenant_id` | UUID | NOT NULL | Multi-tenant identifier (composite PK) |
| `id` | UUID | gen_random_uuid() | Primary key (composite PK) |
| `event_id` | UUID | NOT NULL | FK to events table |
| `version` | INTEGER | 1 | Optimistic locking for budget revisions |
| `status` | TEXT | 'draft' | Budget status (draft, approved, finalized, etc.) |
| `total_budget_amount` | DECIMAL(12,2) | 0 | Total budgeted amount |
| `total_actual_amount` | DECIMAL(12,2) | 0 | Total actual spend |
| `variance_amount` | DECIMAL(12,2) | 0 | Budget vs actual difference |
| `variance_percentage` | DECIMAL(5,2) | 0 | Variance as percentage |
| `notes` | TEXT | nullable | Additional budget notes |
| `created_at` | TIMESTAMPTZ | CURRENT_TIMESTAMP | Audit timestamp |
| `updated_at` | TIMESTAMPTZ | CURRENT_TIMESTAMP | Audit timestamp |
| `deleted_at` | TIMESTAMPTZ | nullable | Soft delete marker |

**Indexes:**
- `event_budgets_event_id_idx` on `(tenant_id, event_id)` - Event lookup optimization
- `event_budgets_status_idx` on `(tenant_id, status)` - Status filtering optimization

**Primary Key:** Composite `(tenant_id, id)`

### 3. Budget Line Items Table

**Schema:** `tenant_events.budget_line_items`

**Purpose:** Detailed breakdown of budgets into categorized line items with individual tracking.

**Columns:**
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `tenant_id` | UUID | NOT NULL | Multi-tenant identifier (composite PK) |
| `id` | UUID | gen_random_uuid() | Primary key (composite PK) |
| `budget_id` | UUID | NOT NULL | FK to event_budgets |
| `category` | TEXT | NOT NULL | Budget category (e.g., "Food", "Labor", "Equipment") |
| `name` | TEXT | NOT NULL | Line item name |
| `description` | TEXT | nullable | Detailed description |
| `budgeted_amount` | DECIMAL(12,2) | 0 | Expected cost |
| `actual_amount` | DECIMAL(12,2) | 0 | Actual cost |
| `variance_amount` | DECIMAL(12,2) | 0 | Budget vs actual difference |
| `sort_order` | INTEGER | 0 | Display ordering |
| `notes` | TEXT | nullable | Additional notes |
| `created_at` | TIMESTAMPTZ | CURRENT_TIMESTAMP | Audit timestamp |
| `updated_at` | TIMESTAMPTZ | CURRENT_TIMESTAMP | Audit timestamp |
| `deleted_at` | TIMESTAMPTZ | nullable | Soft delete marker |

**Indexes:**
- `budget_line_items_budget_id_idx` on `(tenant_id, budget_id)` - Budget lookup optimization
- `budget_line_items_category_idx` on `(tenant_id, category)` - Category filtering optimization

**Primary Key:** Composite `(tenant_id, id)`

### 4. Budget Alerts Table

**Schema:** `tenant_staff.budget_alerts`

**Purpose:** Automated alerting system for budget overruns, thresholds, and exceptions.

**Columns:**
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `tenant_id` | UUID | NOT NULL | Multi-tenant identifier (composite PK) |
| `id` | UUID | gen_random_uuid() | Primary key (composite PK) |
| `budget_id` | UUID | NOT NULL | FK to event_budgets |
| `alert_type` | TEXT | NOT NULL | Alert type (over_budget, warning, threshold_exceeded) |
| `utilization` | DECIMAL(5,2) | NOT NULL | Budget utilization percentage |
| `message` | TEXT | NOT NULL | Alert message |
| `is_acknowledged` | BOOLEAN | false | User acknowledgment status |
| `acknowledged_by` | UUID | nullable | User who acknowledged |
| `acknowledged_at` | TIMESTAMPTZ | nullable | Acknowledgment timestamp |
| `resolved` | BOOLEAN | false | Resolution status |
| `resolved_at` | TIMESTAMPTZ | nullable | Resolution timestamp |
| `created_at` | TIMESTAMPTZ | CURRENT_TIMESTAMP | Audit timestamp |
| `updated_at` | TIMESTAMPTZ | CURRENT_TIMESTAMP | Audit timestamp |
| `deleted_at` | TIMESTAMPTZ | nullable | Soft delete marker |

**Indexes:**
- `budget_alerts_budget_idx` on `(tenant_id, budget_id)` - Budget lookup optimization
- `budget_alerts_type_idx` on `(tenant_id, alert_type)` - Alert type filtering
- `budget_alerts_acknowledged_idx` on `(is_acknowledged)` - Acknowledgment status filtering

**Primary Key:** Composite `(tenant_id, id)`

**Note:** Located in `tenant_staff` schema (not `tenant_events`) for broader accessibility across staff workflows.

## Foreign Key Constraints

### Event Budgets
```sql
-- Tenant constraint
ALTER TABLE "tenant_events"."event_budgets"
ADD CONSTRAINT "event_budgets_tenant_id_foreign"
FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id")
ON DELETE RESTRICT;

-- Event relationship
ALTER TABLE "tenant_events"."event_budgets"
ADD CONSTRAINT "event_budgets_event_tenant_id_event_id_foreign"
FOREIGN KEY ("tenant_id","event_id")
REFERENCES "tenant_events"."events"("tenant_id","id")
ON DELETE CASCADE;
```

**Impact:** Deleting an event cascades to delete all associated budgets.

### Budget Line Items
```sql
-- Tenant constraint
ALTER TABLE "tenant_events"."budget_line_items"
ADD CONSTRAINT "budget_line_items_tenant_id_foreign"
FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id")
ON DELETE RESTRICT;

-- Budget relationship
ALTER TABLE "tenant_events"."budget_line_items"
ADD CONSTRAINT "budget_line_items_tenant_id_budget_id_foreign"
FOREIGN KEY ("tenant_id","budget_id")
REFERENCES "tenant_events"."event_budgets"("tenant_id","id")
ON DELETE CASCADE;
```

**Impact:** Deleting a budget cascades to delete all associated line items.

### Budget Alerts
```sql
-- Tenant constraint
ALTER TABLE "tenant_staff"."budget_alerts"
ADD CONSTRAINT "budget_alerts_tenant_id_foreign"
FOREIGN KEY ("tenant_id") REFERENCES "platform"."accounts"("id")
ON DELETE RESTRICT;

-- Budget relationship
ALTER TABLE "tenant_staff"."budget_alerts"
ADD CONSTRAINT "budget_alerts_tenant_id_budget_id_foreign"
FOREIGN KEY ("tenant_id","budget_id")
REFERENCES "tenant_events"."event_budgets"("tenant_id","id")
ON DELETE CASCADE;
```

**Impact:** Deleting a budget cascades to delete all associated alerts.

## Row-Level Security (RLS) Policies

All tables enforce tenant isolation via RLS policies using JWT-based authentication.

### Policy Pattern (Applied to All Tables)

**Select Policy:**
- Allows reading records where `tenant_id` matches JWT
- Excludes soft-deleted records (`deleted_at IS NULL`)

**Insert Policy:**
- Allows inserts when `tenant_id` matches JWT
- Requires non-null `tenant_id`

**Update Policy:**
- Allows updates when `tenant_id` matches JWT
- Only on non-deleted records
- Validates `tenant_id` remains unchanged

**Delete Policy:**
- **Disabled** (`USING (false)`) - Deletion not permitted via RLS
- Soft deletes should be used instead (set `deleted_at`)

**Service Role Policy:**
- Grants full access to service_role
- Bypasses tenant restrictions for background jobs

### Triggers

Each table has two automatic triggers:

1. **`fn_update_timestamp()`** - Auto-updates `updated_at` on row modification
2. **`fn_prevent_tenant_mutation()`** - Prevents changing `tenant_id` on updates

These triggers are from the core schema and enforce data integrity.

### Replica Identity

All tables configured with `REPLICA IDENTITY FULL` for real-time replication support (enables Ably integration via outbox pattern).

## Data Integrity Features

### Multi-Tenancy
- Composite primary keys on `(tenant_id, id)` ensure tenant isolation
- All indexes include `tenant_id` for query optimization
- RLS policies enforce tenant boundaries at database level

### Soft Deletes
- `deleted_at` timestamp enables soft delete pattern
- RLS policies automatically filter deleted records
- Supports data recovery and audit trails

### Audit Trail
- `created_at` and `updated_at` timestamps on all tables
- Automatic timestamp updates via triggers
- Complete history of budget modifications

### Optimistic Locking
- `version` column on `event_budgets` prevents concurrent modification conflicts
- Application layer should increment version on updates

### Cascade Deletion
- Event deletion → Budget deletion (CASCADE)
- Budget deletion → Line items deletion (CASCADE)
- Budget deletion → Alerts deletion (CASCADE)
- Tenant deletion prohibited (RESTRICT)

## Rollback Plan

**WARNING:** Rollback will result in **DATA LOSS** for all budget tracking data.

### Steps to Rollback

1. **Drop RLS Policies and Triggers:**
```sql
-- Drop triggers
DROP TRIGGER IF EXISTS "event_budgets_update_timestamp" ON "tenant_events"."event_budgets";
DROP TRIGGER IF EXISTS "event_budgets_prevent_tenant_mutation" ON "tenant_events"."event_budgets";
DROP TRIGGER IF EXISTS "budget_line_items_update_timestamp" ON "tenant_events"."budget_line_items";
DROP TRIGGER IF EXISTS "budget_line_items_prevent_tenant_mutation" ON "tenant_events"."budget_line_items";
DROP TRIGGER IF EXISTS "budget_alerts_update_timestamp" ON "tenant_staff"."budget_alerts";
DROP TRIGGER IF EXISTS "budget_alerts_prevent_tenant_mutation" ON "tenant_staff"."budget_alerts";

-- RLS policies automatically dropped with tables
```

2. **Drop Tables (order respects dependencies):**
```sql
-- Drop budget_alerts first (no dependents)
DROP TABLE IF EXISTS "tenant_staff"."budget_alerts" CASCADE;

-- Drop budget_line_items
DROP TABLE IF EXISTS "tenant_events"."budget_line_items" CASCADE;

-- Drop event_budgets (no dependents after above)
DROP TABLE IF EXISTS "tenant_events"."event_budgets" CASCADE;
```

3. **Remove Events Table Changes:**
```sql
-- Remove indexes
DROP INDEX IF EXISTS "tenant_events"."idx_events_venue_id";
DROP INDEX IF EXISTS "tenant_events"."events_tenant_id_id_key";

-- Remove venue_id column
ALTER TABLE "tenant_events"."events" DROP COLUMN IF EXISTS "venue_id";
```

4. **Verify Cleanup:**
```sql
-- Confirm tables removed
SELECT table_name FROM information_schema.tables
WHERE table_schema IN ('tenant_events', 'tenant_staff')
AND table_name LIKE '%budget%';

-- Should return: (0 rows)
```

### Data Loss Warning

After rollback:
- All budget records lost permanently
- All line item records lost permanently
- All alert history lost permanently
- Venue associations on events lost

**Recommendation:** Export budget data to CSV before rollback if needed for audit purposes.

## Application Considerations

### Version Field Usage
The `version` column on `event_budgets` supports optimistic locking:
1. Read budget with version N
2. Modify data
3. Update with WHERE version = N
4. If no rows updated, another user modified the budget - reload and retry

### Status Workflow
Suggested budget status workflow:
- `draft` - Initial budget creation
- `review` - Under review by manager
- `approved` - Approved for execution
- `active` - Event in progress, tracking actuals
- `finalized` - Event complete, actuals locked
- `archived` - Historical reference

### Alert Types
Suggested `alert_type` values:
- `over_budget` - Actual exceeds budgeted amount
- `threshold_warning` - Approaching budget limit (e.g., 80% utilized)
- `threshold_exceeded` - Past configured threshold
- `variance_high` - Variance exceeds acceptable percentage
- `line_item_overrun` - Specific line item exceeds budget

### Categories
Suggested `category` values for line items:
- `Food & Beverage`
- `Labor`
- `Equipment Rental`
- `Venue`
- `Transportation`
- `Decor & Florals`
- `Entertainment`
- `Miscellaneous`

## Dependencies

### Schema Dependencies
- Requires `platform.accounts` table (tenant reference)
- Requires `tenant_events.events` table
- Requires `core.fn_update_timestamp()` function
- Requires `core.fn_prevent_tenant_mutation()` function
- Requires `auth.jwt()` function (Clerk integration)

### Application Dependencies
- Events module must be functional
- Tenant context must be established
- JWT authentication required for RLS

## Related Features

This migration enables:
1. **Event Profitability Analytics** - Compare budget vs actual across events
2. **Financial Reporting** - Generate P&L reports per event
3. **Budget Approval Workflows** - Multi-stage approval process
4. **Real-time Alerting** - Notify staff of budget concerns via Ably
5. **Historical Analysis** - Track budgeting accuracy over time

## Future Enhancements

Potential follow-up migrations:
1. Budget templates for recurring event types
2. Currency support for international events
3. Budget approval workflow tables
4. Automated variance analysis reporting
5. Integration with accounting systems (export)
6. Forecasting based on historical data
