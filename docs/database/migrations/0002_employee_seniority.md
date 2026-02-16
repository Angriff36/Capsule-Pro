# Migration 0002_employee_seniority

## Date
2026-01-23 00:00:01

## Description
Adds employee seniority tracking to support role progression and rank-based features in the staff management module.

## Changes

### Table Created: `tenant_staff.employee_seniority`

#### Schema
```sql
CREATE TABLE "tenant_staff"."employee_seniority" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_seniority_pkey" PRIMARY KEY ("tenant_id","id")
);
```

#### Columns
- **tenant_id**: Tenant isolation (composite primary key)
- **id**: Unique identifier (UUID)
- **employee_id**: Reference to `tenant_staff.employees.id`
- **level**: Seniority level designation (TEXT)
  - Examples: "junior", "mid", "senior", "lead", "executive"
- **rank**: Numeric rank for sorting/comparison (INTEGER)
  - Lower numbers = junior, higher numbers = senior
  - Enables ordering: `ORDER BY rank DESC`
- **effective_at**: When this seniority becomes effective
  - Defaults to current timestamp
  - Supports future-dated promotions
- **created_at**: Record creation timestamp
- **updated_at**: Record update timestamp (auto-updated by trigger)
- **deleted_at**: Soft delete timestamp

### Indexes Created

#### employee_seniority_employee_idx
```sql
CREATE INDEX "employee_seniority_employee_idx"
ON "tenant_staff"."employee_seniority"("employee_id");
```
- Purpose: Fast lookup of all seniority records for an employee
- Use case: Retrieve promotion history

#### employee_seniority_current_idx
```sql
CREATE INDEX "employee_seniority_current_idx"
ON "tenant_staff"."employee_seniority"("tenant_id", "employee_id", "effective_at" DESC);
```
- Purpose: Find current seniority for an employee
- Use case: `ORDER BY effective_at DESC LIMIT 1`
- Pattern: Tenant-isolated query with composite index

## Business Logic

### Seniority Progression
This table supports:
1. **Promotion tracking**: Record each promotion/change
2. **Historical analysis**: See career progression over time
3. **Future-dated changes**: Schedule promotions in advance
4. **Multi-level hierarchy**: Support custom levels per tenant

### Query Patterns

#### Get Current Seniority
```sql
SELECT *
FROM tenant_staff.employee_seniority
WHERE employee_id = $1
  AND effective_at <= NOW()
  AND deleted_at IS NULL
ORDER BY effective_at DESC
LIMIT 1;
```

#### Get Seniority History
```sql
SELECT *
FROM tenant_staff.employee_seniority
WHERE employee_id = $1
  AND deleted_at IS NULL
ORDER BY effective_at DESC;
```

#### Check Future Promotions
```sql
SELECT *
FROM tenant_staff.employee_seniority
WHERE employee_id = $1
  AND effective_at > NOW()
  AND deleted_at IS NULL
ORDER BY effective_at ASC;
```

## Integration Points

### Related Tables
- **tenant_staff.employees**: `employee_id` references `employees.id`
- **tenant_admin.admin_roles**: May use seniority for role assignments
- **tenant_staff.schedule_shifts**: May use seniority for shift prioritization

### Potential Features
1. **Shift scheduling**: Senior staff get priority shifts
2. **Auto-assignment**: Route tasks to senior employees first
3. **Compensation**: Seniority-based pay scales
4. **Approval workflows**: Require senior approval for actions
5. **Reporting**: Seniority distribution analytics

## Data Integrity

### Constraints
- Composite primary key: `(tenant_id, id)`
- No foreign key to `employees.id` (allows historical records to survive employee deletion)
- Soft delete pattern: `deleted_at IS NULL` for active records

### Validation
- `level` is TEXT (no enum) - allows tenant-specific levels
- `rank` enables ordering without requiring level standardization
- `effective_at` can be future-dated for scheduled changes

## Migration Notes

### Dependencies
- Requires `tenant_staff` schema (from 0000_init)
- Requires `gen_random_uuid()` (from 0001_enable_pgcrypto)

### Rollback
```sql
DROP TABLE IF EXISTS "tenant_staff"."employee_seniority" CASCADE;
```
