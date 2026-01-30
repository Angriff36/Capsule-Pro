# Migration 0004_labor_budget_tracking

## Date
2026-01-24 00:00:00

## Description
Adds labor budget tracking and alerting capabilities to monitor labor costs against budgets at the event, weekly, and monthly levels.

## Changes

### Part 1: Tables Created

#### Table: `tenant_staff.labor_budgets`

##### Schema
```sql
CREATE TABLE "tenant_staff"."labor_budgets" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID,
    "event_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "budget_type" TEXT NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "budget_target" NUMERIC(10,2) NOT NULL,
    "budget_unit" TEXT NOT NULL,
    "actual_spend" NUMERIC(10,2),
    "threshold_80_pct" BOOLEAN NOT NULL DEFAULT true,
    "threshold_90_pct" BOOLEAN NOT NULL DEFAULT true,
    "threshold_100_pct" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "override_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "labor_budgets_pkey" PRIMARY KEY ("tenant_id","id")
);
```

##### Columns
- **tenant_id**: Tenant isolation
- **id**: Unique identifier
- **location_id**: Optional location filter (for weekly/monthly budgets)
- **event_id**: Required for event budgets
- **name**: Budget name (e.g., "Q1 Labor Budget", "Wedding #123 Labor")
- **description**: Detailed description
- **budget_type**: 'event', 'week', or 'month'
- **period_start**: Budget period start (NULL for event budgets)
- **period_end**: Budget period end (NULL for event budgets)
- **budget_target**: Target amount (hours or dollars)
- **budget_unit**: 'hours' or 'dollars'
- **actual_spend**: Current actual spend (calculated)
- **threshold_80_pct**: Enable 80% alert
- **threshold_90_pct**: Enable 90% alert
- **threshold_100_pct**: Enable 100% alert
- **status**: 'active', 'paused', 'closed'
- **override_reason**: Reason for budget overrides
- **deleted_at**: Soft delete timestamp

##### Indexes
```sql
-- Location-scoped budgets
CREATE INDEX "labor_budgets_location_idx"
ON "tenant_staff"."labor_budgets"("tenant_id", "location_id");

-- Event-specific budgets
CREATE INDEX "labor_budgets_event_idx"
ON "tenant_staff"."labor_budgets"("tenant_id", "event_id");

-- Period-based queries
CREATE INDEX "labor_budgets_period_idx"
ON "tenant_staff"."labor_budgets"("tenant_id", "period_start", "period_end");
```

##### CHECK Constraints
```sql
-- Positive budget target
ALTER TABLE "tenant_staff"."labor_budgets"
ADD CONSTRAINT "labor_budgets_budget_target_positive"
CHECK ("budget_target" > 0);

-- Event type validation
ALTER TABLE "tenant_staff"."labor_budgets"
ADD CONSTRAINT "labor_budgets_event_type_validation"
CHECK (
    ("budget_type" = 'event' AND "event_id" IS NOT NULL) OR
    ("budget_type" IN ('week', 'month') AND "period_start" IS NOT NULL AND "period_end" IS NOT NULL)
);

-- Period end after start
ALTER TABLE "tenant_staff"."labor_budgets"
ADD CONSTRAINT "labor_budgets_period_end_after_start"
CHECK ("period_end" IS NULL OR "period_start" IS NULL OR "period_end" >= "period_start");
```

#### Table: `tenant_staff.budget_alerts`

##### Schema
```sql
CREATE TABLE "tenant_staff"."budget_alerts" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "budget_id" UUID NOT NULL,
    "alert_type" TEXT NOT NULL,
    "utilization" NUMERIC(5,2) NOT NULL,
    "message" TEXT NOT NULL,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_by" UUID,
    "acknowledged_at" TIMESTAMPTZ(6),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "budget_alerts_pkey" PRIMARY KEY ("tenant_id","id")
);
```

##### Columns
- **tenant_id**: Tenant isolation
- **id**: Unique identifier
- **budget_id**: Reference to labor_budgets.id
- **alert_type**: '80%', '90%', '100%', 'exceeded'
- **utilization**: Percentage (0-100+)
- **message**: Human-readable alert message
- **is_acknowledged**: User acknowledged flag
- **acknowledged_by**: Employee who acknowledged
- **acknowledged_at**: Acknowledgment timestamp
- **resolved**: Resolution status
- **resolved_at**: Resolution timestamp
- **deleted_at**: Soft delete

##### Indexes
```sql
-- Alerts by budget
CREATE INDEX "budget_alerts_budget_idx"
ON "tenant_staff"."budget_alerts"("tenant_id", "budget_id");

-- Alerts by type
CREATE INDEX "budget_alerts_type_idx"
ON "tenant_staff"."budget_alerts"("tenant_id", "alert_type");

-- Unacknowledged alerts
CREATE INDEX "budget_alerts_acknowledged_idx"
ON "tenant_staff"."budget_alerts"("is_acknowledged");
```

### Part 2: Row Level Security (RLS)

#### labor_budgets RLS Policies
```sql
-- Enable RLS
ALTER TABLE "tenant_staff"."labor_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."labor_budgets" FORCE ROW LEVEL SECURITY;

-- Select: Tenant isolation + soft delete
CREATE POLICY "labor_budgets_select" ON "tenant_staff"."labor_budgets"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

-- Insert: Tenant validation
CREATE POLICY "labor_budgets_insert" ON "tenant_staff"."labor_budgets"
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

-- Update: Tenant isolation + prevent tenant mutation
CREATE POLICY "labor_budgets_update" ON "tenant_staff"."labor_budgets"
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

-- Delete: Soft delete only (no hard deletes)
CREATE POLICY "labor_budgets_delete" ON "tenant_staff"."labor_budgets"
    FOR DELETE USING (false);

-- Service role: Full access
CREATE POLICY "labor_budgets_service" ON "tenant_staff"."labor_budgets"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
```

#### budget_alerts RLS Policies
```sql
-- Enable RLS
ALTER TABLE "tenant_staff"."budget_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_staff"."budget_alerts" FORCE ROW LEVEL SECURITY;

-- Same policy structure as labor_budgets
CREATE POLICY "budget_alerts_select" ON "tenant_staff"."budget_alerts"
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

-- (Insert, Update, Delete, Service policies follow same pattern)
```

### Part 3: Triggers

#### Timestamp Update Trigger
```sql
CREATE TRIGGER "labor_budgets_update_timestamp"
    BEFORE UPDATE ON "tenant_staff"."labor_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_update_timestamp"();
```
Automatically updates `updated_at` on row modification.

#### Tenant Mutation Prevention Trigger
```sql
CREATE TRIGGER "labor_budgets_prevent_tenant_mutation"
    BEFORE UPDATE ON "tenant_staff"."labor_budgets"
    FOR EACH ROW EXECUTE FUNCTION "core"."fn_prevent_tenant_mutation"();
```
Prevents changes to `tenant_id` after row creation.

#### (Same triggers for budget_alerts)

### Part 4: Real-time Support

```sql
-- REPLICA IDENTITY for change data capture
ALTER TABLE "tenant_staff"."labor_budgets" REPLICA IDENTITY FULL;
ALTER TABLE "tenant_staff"."budget_alerts" REPLICA IDENTITY FULL;
```
Enables detailed change tracking for real-time features via logical replication.

## Business Logic

### Budget Types

#### Event Budgets
- Tied to specific event (`event_id` required)
- `period_start`/`period_end` are NULL
- Tracks labor cost for single event
- Example: Wedding #123 labor budget: $5,000

#### Weekly Budgets
- `budget_type = 'week'`
- `period_start`/`period_end` define week
- Optional `location_id` for location-specific tracking
- Example: Week of Jan 1-7, 2026: $15,000

#### Monthly Budgets
- `budget_type = 'month'`
- `period_start`/`period_end` define month
- Optional `location_id` for location-specific tracking
- Example: January 2026: $60,000

### Alert Thresholds

Three alert levels:
1. **80%**: Warning - approaching budget limit
2. **90%**: Critical - near budget limit
3. **100%**: Exceeded - over budget

Each threshold can be toggled via:
- `threshold_80_pct`
- `threshold_90_pct`
- `threshold_100_pct`

### Budget Units

Two types of budget tracking:
1. **Hours**: Tracks labor hours
   - `budget_unit = 'hours'`
   - Compares against `time_entries` hours
2. **Dollars**: Tracks labor cost
   - `budget_unit = 'dollars'`
   - Compares against `hours * hourly_rate`

## Query Examples

### Check Budget Utilization
```sql
SELECT
    lb.name,
    lb.budget_target,
    lb.actual_spend,
    (lb.actual_spend / lb.budget_target * 100) AS utilization_pct,
    lb.status
FROM tenant_staff.labor_budgets lb
WHERE lb.tenant_id = $1
  AND lb.deleted_at IS NULL
  AND lb.status = 'active';
```

### Get Active Alerts
```sql
SELECT
    ba.alert_type,
    ba.utilization,
    ba.message,
    ba.created_at,
    lb.name AS budget_name
FROM tenant_staff.budget_alerts ba
JOIN tenant_staff.labor_budgets lb ON ba.budget_id = lb.id
WHERE ba.tenant_id = $1
  AND ba.deleted_at IS NULL
  AND ba.is_acknowledged = false
ORDER BY ba.utilization DESC;
```

### Update Actual Spend (Trigger or Job)
```sql
UPDATE tenant_staff.labor_budgets lb
SET actual_spend = (
    SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (te.clock_out - te.clock_in))/3600
        * e.hourly_rate
    ), 0)
    FROM tenant_staff.time_entries te
    JOIN tenant_staff.employees e ON te.employee_id = e.id
    WHERE e.tenant_id = lb.tenant_id
      AND te.clock_in >= lb.period_start
      AND te.clock_in < lb.period_end
      AND te.deleted_at IS NULL
)
WHERE lb.id = $1;
```

## Integration Points

### Related Tables
- **tenant_staff.time_entries**: Source for actual hours
- **tenant_staff.employees**: Source for hourly rates
- **tenant_events.events**: Event budget references
- **tenant.locations**: Location-based budgets

### Potential Features
1. **Real-time alerts**: Push notifications when thresholds exceeded
2. **Budget vs actuals reporting**: Variance analysis
3. **Forecasting**: Predict overspend based on current rate
4. **Approval workflows**: Require approval for budget overrides
5. **Historical trends**: Compare current period to previous periods

## Data Integrity

### Foreign Key Relationships
- `location_id` → `tenant.locations.id` (optional)
- `event_id` → `tenant_events.events.id` (conditional)
- `budget_id` (alerts) → `labor_budgets.id` (required)
- `acknowledged_by` → `tenant_staff.employees.id` (optional)

### Validation
- CHECK constraint ensures positive budget targets
- CHECK constraint validates budget_type + field combinations
- CHECK constraint ensures period_end ≥ period_start
- RLS policies enforce tenant isolation
- Soft delete pattern prevents data loss

## Migration Notes

### Dependencies
- Requires `tenant_staff` schema (from 0000_init)
- Requires `core.fn_update_timestamp()` function (from 0000_init)
- Requires `core.fn_prevent_tenant_mutation()` function (from 0000_init)
- Requires `auth.jwt()` stub function (from 0000_init)

### Rollback
```sql
DROP TABLE IF EXISTS "tenant_staff"."budget_alerts" CASCADE;
DROP TABLE IF EXISTS "tenant_staff"."labor_budgets" CASCADE;
```

### Future Enhancements
- Add budget categories (e.g., prep, service, cleanup)
- Support for department-level budgets
- Budget transfer between events/periods
- Automated budget creation based on history
- Integration with payroll system
- Multi-currency support
