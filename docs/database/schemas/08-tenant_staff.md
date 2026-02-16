# Tenant Staff Schema

**Schema:** `tenant_staff`

## Purpose

The tenant_staff schema contains **staff scheduling, time tracking, and payroll** data for catering operations. This is the workforce management core where employees are hired, scheduled, tracked, and paid.

## Goals

1. **Employee Management**: Track employee information, locations, skills, certifications, and seniority
2. **Shift Scheduling**: Create and manage schedules with open shifts for pickup
3. **Time Tracking**: Capture clock-in/clock-out times with break tracking and approval workflows
4. **Payroll Processing**: Calculate payroll with regular/overtime hours, deductions, and period management
5. **Labor Budgeting**: Track labor budgets vs. actual spend with alerts
6. **Availability Management**: Track employee availability for fair scheduling
7. **Skill & Certification Tracking**: Maintain verified skills and certifications for compliance

## Tables

### `User` (mapped to `employees`)

Core employee record with employment details and compensation.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Employee identifier
- `email` (String): Employee email
- `firstName` (String): First name (default: "Test")
- `lastName` (String): Last name (default: "User")
- `role` (String): User role (default: "staff")
- `authUserId` (String?, Unique): Clerk authentication user ID
- `employeeNumber` (String?): Employee number for payroll
- `phone` (String?): Contact phone
- `employmentType` (EmploymentType): full_time, part_time, contractor, temp (default: full_time)
- `hourlyRate` (Decimal?): Hourly rate for hourly employees
- `salaryAnnual` (Decimal?): Annual salary for salaried employees
- `hireDate` (Date): Hire date (default: CURRENT_DATE)
- `terminationDate` (Date?): Termination date (if applicable)
- `isActive` (Boolean): Employment status (default: true)
- `avatarUrl` (String?): Profile picture URL
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`
- Unique: `(tenantId, id)`

**NAMING INCONSISTENCY:**
- Model name is `User` but table name is `employees`
- Creates confusion - is this a user or an employee?
- **Recommendation**: Rename model to `Employee` for clarity

---

### `Schedule`

Schedule container for a specific date with publish workflow.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Schedule identifier
- `locationId` (Uuid?, FK): References Location (tenant.locations)
- `schedule_date` (Date): Date of this schedule
- `status` (String): Schedule status (default: "draft")
- `published_at` (Timestamptz?): When schedule was published
- `published_by` (Uuid?): User who published the schedule
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`

**MISSING:**
- Foreign key to Location
- Indexes on `schedule_date`, `locationId`, `status` for queries

---

### `ScheduleShift`

Individual shift within a schedule assigned to an employee.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Shift identifier
- `scheduleId` (Uuid, FK): References Schedule
- `employeeId` (Uuid, FK): References User (employees)
- `locationId` (Uuid, FK): References Location (tenant.locations)
- `shift_start` (Timestamptz): Shift start time
- `shift_end` (Timestamptz): Shift end time
- `role_during_shift` (String?): Role for this shift (e.g., "chef", "server")
- `notes` (String?): Additional notes
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(employeeId)` - **MISSING tenantId prefix**
- Index: `(locationId)` - **MISSING tenantId prefix**

**MISSING:**
- Foreign keys to Schedule, User, Location
- Indexes on `scheduleId`, `shift_start`

---

### `open_shifts`

Unassigned shifts available for employee pickup.

**Columns:**
- `tenant_id` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Open shift identifier
- `schedule_id` (Uuid, FK): References Schedule
- `location_id` (Uuid, FK): References Location (tenant.locations)
- `shift_start` (Timestamptz): Shift start time
- `shift_end` (Timestamptz): Shift end time
- `role_during_shift` (String?): Role needed for this shift
- `notes` (String?): Additional notes
- `status` (String): Shift status (default: "open")
- `claimed_by` (Uuid?): Employee who claimed the shift
- `claimed_at` (Timestamptz?): When shift was claimed
- `assigned_shift_id` (Uuid?): References ScheduleShift once claimed
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**MISSING:**
- Foreign keys to Schedule, Location, User
- Indexes on `schedule_id`, `location_id`, `status`, `shift_start`

**NAMING INCONSISTENCY:**
- Table uses snake_case (`open_shifts`, `tenant_id`)
- Other staff tables use PascalCase with camelCase columns
- **Recommendation**: Rename to `OpenShift` for consistency

---

### `EmployeeLocation`

Junction table linking employees to their work locations.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `employeeId` (Uuid, FK): References User (employees)
- `locationId` (Uuid, FK): References Location (tenant.locations)
- `isPrimary` (Boolean): Is this the primary location? (default: false)
- `createdAt` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, employeeId, locationId)`
- Index: `(employeeId)` - **MISSING tenantId prefix**
- Index: `(locationId)` - **MISSING tenantId prefix**

**MISSING:**
- Foreign keys to User, Location

**NAMING INCONSISTENCY:**
- Mixes camelCase (`tenantId`, `employeeId`) and snake_case (`updated_at`, `deleted_at`)
- **Recommendation**: Use consistent camelCase

---

### `TimeEntry`

Actual time worked by an employee (clock-in/clock-out).

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Time entry identifier
- `employeeId` (Uuid, FK): References User (employees)
- `locationId` (Uuid?, FK): References Location (tenant.locations)
- `shift_id` (Uuid?, FK): References ScheduleShift
- `clockIn` (Timestamptz): When employee clocked in
- `clockOut` (Timestamptz?): When employee clocked out
- `breakMinutes` (SmallInt): Break duration in minutes (default: 0)
- `notes` (String?): Additional notes
- `approved_by` (Uuid?): User who approved this time entry
- `approved_at` (Timestamptz?): When time entry was approved
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(employeeId)` - **MISSING tenantId prefix**

**MISSING:**
- Foreign keys to User, Location, ScheduleShift
- Indexes on `clockIn`, `locationId`, `approved_by`

**NAMING INCONSISTENCY:**
- Mixes camelCase and snake_case
- **Recommendation**: Use consistent camelCase (`deletedAt`, `shiftId`)

---

### `TimecardEditRequest`

Employee requests to edit their time entries (requires approval).

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Request identifier
- `timeEntryId` (Uuid, FK): References TimeEntry
- `employeeId` (Uuid, FK): References User (employees)
- `requestedClockIn` (Timestamptz?): Requested clock-in time
- `requestedClockOut` (Timestamptz?): Requested clock-out time
- `requestedBreakMinutes` (SmallInt?): Requested break duration
- `reason` (String): Reason for edit request
- `status` (String): Request status (default: "pending")
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`
- Unique: `(tenantId, timeEntryId)` - one request per time entry
- Index: `(employeeId)` - **MISSING tenantId prefix**

**MISSING:**
- Foreign keys to TimeEntry, User
- Indexes on `status`, `createdAt`

---

### `LaborBudget`

Labor budget tracking with location, event, or period scope.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Budget identifier
- `locationId` (Uuid?, FK): References Location (tenant.locations)
- `eventId` (Uuid?, FK): References Event (tenant_events)
- `name` (String): Budget name
- `description` (String?): Budget description
- `budgetType` (String): Type of budget (location, event, period)
- `periodStart` (Date?): Budget period start
- `periodEnd` (Date?): Budget period end
- `budgetTarget` (Decimal): Target budget amount
- `budgetUnit` (String): Unit of measurement (dollars, hours, FTEs)
- `actualSpend` (Decimal?): Actual spend to date
- `threshold80Pct` (Boolean): Alert at 80% threshold? (default: true)
- `threshold90Pct` (Boolean): Alert at 90% threshold? (default: true)
- `threshold100Pct` (Boolean): Alert at 100% threshold? (default: true)
- `alertEmails` (String[]): Emails to send alerts to
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)
- `alerts` → BudgetAlert[]

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(tenantId, locationId)`
- Index: `(tenantId, eventId)`
- Index: `(tenantId, periodStart, periodEnd)`

**MISSING:**
- Foreign keys to Location, Event

---

### `BudgetAlert`

Alerts triggered when labor budgets exceed thresholds.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Alert identifier
- `budgetId` (Uuid, FK): References LaborBudget
- `alertType` (String): Type of alert (80%, 90%, 100%)
- `utilization` (Decimal): Current budget utilization percentage
- `message` (String): Alert message
- `isAcknowledged` (Boolean): Has alert been acknowledged? (default: false)
- `acknowledgedBy` (Uuid?): User who acknowledged
- `acknowledgedAt` (Timestamptz?): When alert was acknowledged
- `resolved` (Boolean): Has alert been resolved? (default: false)
- `resolvedAt` (Timestamptz?): When alert was resolved
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)
- `budget` → EventBudget (tenant_events) via "BudgetAlerts"

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(tenantId, budgetId)`
- Index: `(tenantId, alertType)`
- Index: `(isAcknowledged)` - **MISSING tenantId prefix**

**CRITICAL SCHEMA ERROR:**
- `BudgetAlert` is in `tenant_staff` schema but relates to `EventBudget` (tenant_events)
- Should be in `tenant_events` schema (belongs with budgets)
- Creates cross-schema dependency for no reason
- **Recommendation**: Move to `tenant_events` schema

**MISSING:**
- Foreign key to LaborBudget
- Indexes with tenantId prefix

---

### `payroll_periods`

Payroll period definitions (e.g., bi-weekly, monthly).

**Columns:**
- `tenant_id` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Payroll period identifier
- `period_start` (Date): Period start date
- `period_end` (Date): Period end date
- `status` (String): Period status (default: "open")
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**Indexes:**
- PK: `(tenant_id, id)`

**MISSING:**
- Indexes on `period_start`, `period_end`, `status`
- Exclusion constraint to prevent overlapping periods

**NAMING INCONSISTENCY:**
- Uses snake_case
- **Recommendation**: Rename to `PayrollPeriod`

---

### `payroll_runs`

Individual payroll runs within a payroll period.

**Columns:**
- `tenant_id` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Payroll run identifier
- `payroll_period_id` (Uuid, FK): References payroll_periods
- `run_date` (Timestamptz): When payroll was run (default: now())
- `status` (String): Payroll status (default: "pending")
- `total_gross` (Decimal): Total gross pay for all employees (default: 0)
- `total_deductions` (Decimal): Total deductions (default: 0)
- `total_net` (Decimal): Total net pay (default: 0)
- `approved_by` (Uuid?): User who approved payroll
- `approved_at` (Timestamptz?): When payroll was approved
- `paid_at` (Timestamptz?): When payroll was paid
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**Indexes:**
- PK: `(tenant_id, id)`

**MISSING:**
- Foreign key to payroll_periods
- Indexes on `payroll_period_id`, `run_date`, `status`

**NAMING INCONSISTENCY:**
- Uses snake_case
- **Recommendation**: Rename to `PayrollRun`

---

### `payroll_line_items`

Individual employee payroll entries within a payroll run.

**Columns:**
- `tenant_id` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Line item identifier
- `payroll_run_id` (Uuid, FK): References payroll_runs
- `employee_id` (Uuid, FK): References User (employees)
- `hours_regular` (Decimal): Regular hours worked (default: 0)
- `hours_overtime` (Decimal): Overtime hours worked (default: 0)
- `rate_regular` (Decimal): Regular hourly rate
- `rate_overtime` (Decimal): Overtime hourly rate
- `gross_pay` (Decimal): Gross pay before deductions
- `deductions` (Json): Deduction breakdown (taxes, benefits, etc.)
- `net_pay` (Decimal): Net pay after deductions
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**Indexes:**
- PK: `(tenant_id, id)`
- Index: `(employee_id)` - **MISSING tenantId prefix**

**MISSING:**
- Foreign keys to payroll_runs, User
- Indexes on `payroll_run_id`

**NAMING INCONSISTENCY:**
- Uses snake_case
- **Recommendation**: Rename to `PayrollLineItem`

---

### `employee_availability`

Employee availability by day of week for scheduling.

**Columns:**
- `tenant_id` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Availability record identifier
- `employee_id` (Uuid, FK): References User (employees)
- `day_of_week` (SmallInt): Day of week (0=Sunday, 6=Saturday)
- `start_time` (Time): Available start time
- `end_time` (Time): Available end time
- `is_available` (Boolean): Is employee available? (default: true)
- `effective_from` (Date): When availability starts (default: CURRENT_DATE)
- `effective_until` (Date?): When availability ends
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**Indexes:**
- PK: `(tenant_id, id)`
- Index: `(employee_id)` - **MISSING tenantId prefix**

**MISSING:**
- Foreign key to User
- Indexes on `day_of_week`, `effective_from`, `effective_until`
- Check constraint: `day_of_week BETWEEN 0 AND 6`
- Check constraint: `end_time > start_time`

**NAMING INCONSISTENCY:**
- Uses snake_case
- **Recommendation**: Rename to `EmployeeAvailability`

---

### `employee_certifications`

Employee certifications for compliance tracking.

**Columns:**
- `tenant_id` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Certification record identifier
- `employee_id` (Uuid, FK): References User (employees)
- `certification_type` (String): Type of certification (e.g., "food_safety")
- `certification_name` (String): Name of certification
- `issued_date` (Date): When certification was issued
- `expiry_date` (Date?): When certification expires
- `document_url` (String?): URL to certification document
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**Indexes:**
- PK: `(tenant_id, id)`
- Index: `(employee_id)` - **MISSING tenantId prefix**

**MISSING:**
- Foreign key to User
- Indexes on `expiry_date` for upcoming expiration alerts
- Check constraint: `expiry_date > issued_date`

**NAMING INCONSISTENCY:**
- Uses snake_case
- **Recommendation**: Rename to `EmployeeCertification`

---

### `employee_skills`

Employee skills with proficiency levels and verification.

**Columns:**
- `tenant_id` (Uuid, PK): Tenant identifier
- `employee_id` (Uuid, PK, FK): References User (employees)
- `skill_id` (Uuid, PK, FK): References skills
- `proficiency_level` (SmallInt): Skill level (1-5, default: 1)
- `verified_by` (Uuid?): User who verified this skill
- `verified_at` (Timestamptz?): When skill was verified
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp

**Indexes:**
- PK: `(tenant_id, employee_id, skill_id)`

**MISSING:**
- Foreign keys to User, skills
- Indexes on `skill_id`, `proficiency_level`

**NAMING INCONSISTENCY:**
- Uses snake_case
- **Recommendation**: Rename to `EmployeeSkill`

---

### `employee_seniority`

Employee seniority tracking with effective dates for historical accuracy.

**Columns:**
- `tenant_id` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Seniority record identifier
- `employee_id` (Uuid, FK): References User (employees)
- `level` (String): Seniority level (e.g., "junior", "senior")
- `rank` (Int): Numeric rank for sorting
- `effective_at` (Timestamptz): When seniority became effective (default: now())
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**Indexes:**
- PK: `(tenant_id, id)`
- Index: `(employee_id)` - **MISSING tenantId prefix**
- Index: `(tenant_id, employee_id, effective_at DESC)`: Get current seniority

**MISSING:**
- Foreign key to User
- Indexes on `level`, `rank`

**NAMING INCONSISTENCY:**
- Uses snake_case
- **Recommendation**: Rename to `EmployeeSeniority`

---

### `skills`

Skills library for employee skill assignments.

**Columns:**
- `tenant_id` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Skill identifier
- `name` (String): Skill name
- `category` (String?): Skill category (e.g., "culinary", "service")
- `description` (String?): Skill description
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**Indexes:**
- PK: `(tenant_id, id)`
- Unique: `(tenant_id, name)`: Skill names are unique per tenant

**NAMING INCONSISTENCY:**
- Uses snake_case
- **Recommendation**: Rename to `Skill`

---

## Rules

### Employee Management
- **Every employee must have a hire date** (default: CURRENT_DATE)
- **Employee numbers must be unique** (for payroll integration)
- **Termination date null means employee is active**
- **Employees can work at multiple locations** (via EmployeeLocation junction)

### Scheduling
- **Schedules have draft → published workflow**
- **Published schedules cannot be modified** (create new schedule instead)
- **Shifts require assigned employee, location, and times**
- **Open shifts can be claimed by any eligible employee**
- **Shifts cannot overlap for the same employee** (enforced at application layer)

### Time Tracking
- **Time entries require clock-in time** (clock-out can be null for active shifts)
- **Break minutes default to 0** (unpaid breaks)
- **Time entries must be approved before payroll** (approved_by, approved_at)
- **Time entries are immutable after payroll processing**
- **Timecard edit requests require approval** (status: pending → approved/denied)

### Payroll
- **Payroll periods must not overlap** (exclusion constraint needed)
- **Payroll runs are within a single payroll period**
- **Payroll line items calculate regular + overtime hours**
- **Deductions stored as JSON** (flexible structure per tenant)
- **Payroll runs require approval before payment** (approved_by, approved_at)

### Labor Budgeting
- **Budgets can be scoped to location, event, or period**
- **Alerts trigger at 80%, 90%, 100% thresholds** (configurable)
- **Alerts must be acknowledged** (isAcknowledged flag)
- **Budget alerts are in tenant_staff but relate to tenant_events** (SCHEMA ERROR)

### Skills & Certifications
- **Skills have proficiency levels (1-5)**
- **Skills can be verified by another user** (verified_by, verified_at)
- **Certifications may have expiry dates** (require tracking for compliance)
- **Seniority is time-effective** (historical tracking via effective_at)

---

## Decisions

### Why Separate Schedule and TimeEntry Tables?

**Problem:**
- Schedules are planned (what SHOULD happen)
- Time entries are actual (what DID happen)
- Need to compare planned vs. actual for variance analysis

**Solution:**
- `Schedule` + `ScheduleShift`: Planned shifts
- `TimeEntry`: Actual hours worked
- Application layer compares scheduled shifts vs. time entries

**Benefits:**
- Can identify no-shows (scheduled but no time entry)
- Can identify unscheduled work (time entry without schedule)
- Enables variance analysis (scheduled hours vs. actual hours)
- Separate approval workflows (schedule publish vs. time entry approval)

**Trade-offs:**
- More complex queries (need to join both tables)
- Application must reconcile differences
- Risk of data inconsistency (shift changed but time entry not updated)

---

### Why Open Shifts Separate from ScheduleShift?

**Problem:**
- Need shifts that anyone can pick up
- Don't want to pre-assign to specific employee
- Need to track claiming workflow

**Solution:**
- `open_shifts`: Unassigned shifts available for pickup
- `open_shifts.status`: "open" → "claimed"
- `open_shifts.assigned_shift_id`: Links to ScheduleShift once claimed

**Benefits:**
- Clear separation between assigned and open shifts
- Claiming workflow built into data model
- Can track who claimed which shift and when

**Trade-offs:**
- Extra table to manage
- Need to convert open_shift to ScheduleShift when claimed
- Risk of orphaned open_shifts (claimed but no ScheduleShift created)

---

### Why Payroll in Separate Tables (Not Inline in TimeEntry)?

**Problem:**
- Payroll is a batch process (run periodically)
- Need to snapshot pay rates at time of payroll
- Payroll calculations are complex (overtime, deductions, taxes)
- Need to track payroll history (what was paid when)

**Solution:**
- `payroll_periods`: Payroll period definitions
- `payroll_runs`: Individual payroll executions
- `payroll_line_items`: Employee payroll breakdown

**Benefits:**
- Full audit trail of payroll processing
- Can recalculate payroll if rates change
- Supports retroactive payroll adjustments
- Clear separation between time tracking and payroll

**Trade-offs:**
- Extra complexity for simple use cases
- Need to run payroll batch process
- More storage (snapshotting data)

---

### Why BudgetAlert in tenant_staff (Not tenant_events)?

**PROBLEM - THIS IS A BUG:**

**Current State:**
- `BudgetAlert` table is in `tenant_staff` schema
- Relates to `EventBudget` (in `tenant_events` schema)
- Also relates to `LaborBudget` (in `tenant_staff` schema)

**Hypothesis:**
- Originally designed for LaborBudget alerts only
- Later reused for EventBudget alerts without schema migration

**Recommendation:**
1. **Split BudgetAlert into two tables:**
   - `LaborBudgetAlert` in `tenant_staff` (for LaborBudget)
   - `EventBudgetAlert` in `tenant_events` (for EventBudget)
2. **Create migration to split existing data**
3. **Update foreign keys in both budgets tables**

**Migration Strategy:**
1. Create `tenant_events.event_budget_alerts` table
2. Copy BudgetAlert records where budgetId references EventBudget
3. Copy BudgetAlert records where budgetId references LaborBudget to new `tenant_staff.labor_budget_alerts`
4. Update foreign keys in EventBudget and LaborBudget
5. Drop old `tenant_staff.budget_alerts` table

---

### Why Snake_Case for Some Tables (employee_skills, payroll_runs)?

**PROBLEM - INCONSISTENT NAMING:**

**Current State:**
- Some tables use PascalCase: `Schedule`, `ScheduleShift`, `TimeEntry`
- Some tables use snake_case: `employee_skills`, `payroll_runs`, `open_shifts`
- Mixed naming within same schema

**Recommendation:**
1. **Standardize on PascalCase** for consistency with other tenant schemas
2. **Rename all snake_case tables to PascalCase**
3. **Update all foreign key references**

**Migration Required:**
- `employee_availability` → `EmployeeAvailability`
- `employee_certifications` → `EmployeeCertification`
- `employee_skills` → `EmployeeSkill`
- `employee_seniority` → `EmployeeSeniority`
- `open_shifts` → `OpenShift`
- `payroll_periods` → `PayrollPeriod`
- `payroll_runs` → `PayrollRun`
- `payroll_line_items` → `PayrollLineItem`
- `skills` → `Skill`

---

## Relations

### Internal Relations (tenant_staff)

```
User (Employee) ──┬── (N) ScheduleShift
                  ├── (N) TimeEntry
                  ├── (N) TimecardEditRequest
                  ├── (N) EmployeeLocation
                  ├── (N) payroll_line_items
                  ├── (N) employee_availability
                  ├── (N) employee_certifications
                  ├── (N) employee_skills
                  └── (N) employee_seniority

Schedule ── (N) ScheduleShift
Schedule ── (N) open_shifts

open_shifts ── (1) ScheduleShift (when claimed)

TimeEntry ── (N) TimecardEditRequest

payroll_periods ── (N) payroll_runs ── (N) payroll_line_items

skills ── (N) employee_skills

LaborBudget ── (N) BudgetAlert
```

### Cross-Schema Relations

**tenant_staff → tenant:**
- `Schedule.locationId` → `Location.id`
- `ScheduleShift.locationId` → `Location.id`
- `open_shifts.location_id` → `Location.id`
- `EmployeeLocation.locationId` → `Location.id`
- `TimeEntry.locationId` → `Location.id`

**tenant_staff → tenant_events:**
- `LaborBudget.eventId` → `Event.id`
- `EventStaffAssignment.employeeId` → `User.id`
- `BudgetAlert.budgetId` → `EventBudget.id` (**WRONG SCHEMA**)

**tenant_staff → tenant_kitchen:**
- `KitchenTask.claims.employeeId` → `User.id`
- `KitchenTaskProgress.employeeId` → `User.id`

**tenant_staff → platform:**
- All tables have `tenantId` → `Account.id`

---

## Lifecycle

### Employee Hire Flow

```
1. User (Employee) record created
   - Set hireDate, employmentType, hourlyRate/salaryAnnual
   - isActive = true

2. EmployeeLocation records created
   - Link employee to one or more locations
   - One location marked as isPrimary = true

3. employee_skills records created
   - Add skills with proficiency levels
   - Optionally verify skills (verified_by, verified_at)

4. employee_certifications records created
   - Add certifications with expiry dates
   - Upload certification documents

5. employee_seniority record created
   - Set initial level and rank
   - effective_at = hireDate
```

### Scheduling Workflow

```
1. Schedule created
   - status = "draft"
   - Set schedule_date and locationId

2. ScheduleShift records created
   - Assign employeeId, locationId, shift_start, shift_end
   - Set role_during_shift (e.g., "chef", "server")

3. open_shifts created
   - For unfilled shifts
   - status = "open"

4. Schedule published
   - status = "published"
   - Set published_at and published_by

5. Employees claim open shifts
   - open_shifts.status = "claimed"
   - Set claimed_by and claimed_at
   - Create corresponding ScheduleShift

6. Schedule executed
   - Employees work their shifts
```

### Time Tracking Workflow

```
1. Employee clocks in
   - TimeEntry created with clockIn timestamp

2. Employee clocks out
   - TimeEntry updated with clockOut timestamp
   - Set break_minutes if applicable

3. Manager reviews time entries
   - Verify clock_in/clock_out accuracy
   - Approve time entries (approved_by, approved_at)

4. Employee requests edit (if needed)
   - TimecardEditRequest created
   - status = "pending"
   - Explain reason for edit

5. Manager approves/denies edit request
   - If approved: Update TimeEntry, set request status = "approved"
   - If denied: Set request status = "denied"

6. Time entries locked for payroll
   - Once payroll run created, TimeEntry immutable
```

### Payroll Processing Workflow

```
1. Payroll period created
   - Set period_start and period_end
   - status = "open"

2. Payroll run created
   - Link to payroll_period_id
   - status = "pending"
   - Calculate regular and overtime hours from TimeEntry

3. Payroll line items created
   - One per employee in payroll run
   - Calculate hours_regular, hours_overtime
   - Apply rate_regular, rate_overtime
   - Calculate gross_pay
   - Apply deductions (taxes, benefits, etc.)
   - Calculate net_pay

4. Payroll review
   - Manager reviews payroll run
   - Verify calculations

5. Payroll approved
   - Set approved_by and approved_at
   - status = "approved"

6. Payroll paid
   - Set paid_at timestamp
   - status = "paid"
   - Lock TimeEntry records (prevent edits)

7. Payroll period closed
   - status = "closed"
   - No further payroll runs allowed
```

### Labor Budgeting Workflow

```
1. LaborBudget created
   - Set budgetType (location, event, period)
   - Set budgetTarget and budgetUnit
   - Set thresholds (80%, 90%, 100%)

2. Budget alerts configured
   - Set threshold80Pct, threshold90Pct, threshold100Pct
   - Add alertEmails

3. Actual spend tracked
   - Update actualSpend as costs incurred
   - Calculate utilization = (actualSpend / budgetTarget) * 100

4. Alerts triggered
   - BudgetAlert created when thresholds exceeded
   - Send emails to alertEmails
   - Set isAcknowledged = false

5. Alerts acknowledged
   - Manager acknowledges alerts
   - Set acknowledgedBy and acknowledgedAt
   - Set isAcknowledged = true

6. Alerts resolved
   - Take action to reduce spend or increase budget
   - Set resolved = true
   - Set resolvedAt
```

---

## Performance

### Hot Paths

**Payroll Calculation Queries:**
- Calculate hours worked per employee for period
- **Index needed**: `(tenantId, employeeId, clockIn)`
- **Query pattern**: `WHERE clockIn >= ? AND clockIn <= ? AND employeeId = ?`
- **Current**: Only `(employeeId)` indexed - **MISSING tenantId prefix**

**Schedule Availability Queries:**
- Find employees available for a shift
- **Index needed**: `(tenantId, employee_id, day_of_week, effective_from, effective_until)`
- **Query pattern**: Complex join with employee_availability
- **Current**: Only `(employee_id)` indexed - **MISSING tenantId prefix**

**Open Shift Pickup Queries:**
- Find open shifts by location and date
- **Index needed**: `(tenantId, location_id, status, shift_start)`
- **Query pattern**: `WHERE location_id = ? AND status = 'open' AND shift_start >= ?`
- **Current**: No indexes on location_id, status, shift_start

**Certification Expiration Queries:**
- Find expiring certifications for compliance alerts
- **Index needed**: `(tenantId, employee_id, expiry_date)`
- **Query pattern**: `WHERE expiry_date <= ? AND expiry_date >= ?`
- **Current**: Only `(employee_id)` indexed - **MISSING tenantId prefix**

### Missing Indexes

**Critical:**
- `ScheduleShift`: `(tenantId, scheduleId, employeeId)` for schedule queries
- `TimeEntry`: `(tenantId, employeeId, clockIn)` for payroll calculations
- `TimeEntry`: `(tenantId, locationId, clockIn)` for location time tracking
- `open_shifts`: `(tenantId, location_id, status, shift_start)` for pickup queries
- `payroll_line_items`: `(tenantId, payroll_run_id, employee_id)` for payroll queries
- `employee_availability`: `(tenantId, employee_id, day_of_week)` for availability checks
- `employee_certifications`: `(tenantId, employee_id, expiry_date)` for expiration alerts

**Secondary:**
- All indexes should include `tenantId` prefix
- `TimecardEditRequest`: `(tenantId, status, createdAt)` for approval workflow
- `BudgetAlert`: `(tenantId, isAcknowledged, createdAt)` for alert dashboard
- `employee_seniority`: `(tenantId, level, rank)` for seniority queries

---

## TODOs

### Critical Priority

- [ ] **FIX BudgetAlert schema location**
  - [ ] Currently in tenant_staff but relates to EventBudget (tenant_events)
  - [ ] Split into LaborBudgetAlert (tenant_staff) and EventBudgetAlert (tenant_events)
  - [ ] Create migration to split data
  - [ ] Update foreign keys in both budget tables

- [ ] **FIX naming inconsistency**
  - [ ] Rename all snake_case tables to PascalCase
  - [ ] Update all foreign key references
  - [ ] Migration affects 8 tables

- [ ] **FIX User model name**
  - [ ] Rename `User` model to `Employee`
  - [ ] Table name is already `employees`
  - [ ] Reduces confusion between users and employees

- [ ] **Add missing foreign keys**
  - [ ] Schedule.locationId → Location.id
  - [ ] ScheduleShift.scheduleId → Schedule.id
  - [ ] ScheduleShift.employeeId → User.id
  - [ ] ScheduleShift.locationId → Location.id
  - [ ] open_shifts.schedule_id → Schedule.id
  - [ ] open_shifts.location_id → Location.id
  - [ ] open_shifts.assigned_shift_id → ScheduleShift.id
  - [ ] EmployeeLocation.employeeId → User.id
  - [ ] EmployeeLocation.locationId → Location.id
  - [ ] TimeEntry.employeeId → User.id
  - [ ] TimeEntry.locationId → Location.id
  - [ ] TimeEntry.shift_id → ScheduleShift.id
  - [ ] TimecardEditRequest.timeEntryId → TimeEntry.id
  - [ ] TimecardEditRequest.employeeId → User.id
  - [ ] LaborBudget.locationId → Location.id
  - [ ] LaborBudget.eventId → Event.id
  - [ ] BudgetAlert.budgetId → LaborBudget.id (after split)
  - [ ] payroll_runs.payroll_period_id → payroll_periods.id
  - [ ] payroll_line_items.payroll_run_id → payroll_runs.id
  - [ ] payroll_line_items.employee_id → User.id
  - [ ] employee_availability.employee_id → User.id
  - [ ] employee_certifications.employee_id → User.id
  - [ ] employee_skills.employee_id → User.id
  - [ ] employee_skills.skill_id → skills.id
  - [ ] employee_seniority.employee_id → User.id

- [ ] **Add missing indexes (see Performance section)**
  - [ ] All tenant-prefixed composite indexes
  - [ ] Indexes for hot path queries

### High Priority

- [ ] **Add exclusion constraint for payroll periods**
  - [ ] Prevent overlapping periods within same tenant
  - [ ] Use PostgreSQL EXCLUSION constraint

- [ ] **Add check constraints**
  - [ ] employee_availability: `day_of_week BETWEEN 0 AND 6`
  - [ ] employee_availability: `end_time > start_time`
  - [ ] employee_certifications: `expiry_date > issued_date`
  - [ ] employee_seniority: `rank >= 0`

- [ ] **Add database constraints**
  - [ ] EmployeeLocation: Only one `isPrimary = true` per employee per tenant
  - [ ] TimeEntry: `clockOut > clockIn`
  - [ ] TimeEntry: `breakMinutes >= 0`
  - [ ] payroll_line_items: `hours_regular >= 0`, `hours_overtime >= 0`

### Medium Priority

- [ ] **Improve payroll calculation**
  - [ ] Consider database trigger to auto-calculate on TimeEntry insert/update
  - [ ] Or use materialized view for payroll aggregation
  - [ ] Document calculation method in code

- [ ] **Add time entry validation**
  - [ ] Prevent overlapping time entries for same employee
  - [ ] Enforce at database level with exclusion constraint
  - [ ] Or enforce at application layer

- [ ] **Add seniority history tracking**
  - [ ] Query for current seniority: `ORDER BY effective_at DESC LIMIT 1`
  - [ ] Consider materialized view for current seniority per employee

### Low Priority

- [ ] **Add skill library management**
  - [ ] Seed common skills (culinary, service, management)
  - [ ] Allow tenants to create custom skills
  - [ ] Skill categories for better organization

- [ ] **Add certification alerting**
  - [ ] Alert 30 days before certification expires
  - [ ] Alert on expiry date
  - [ ] Block employees with expired certifications from scheduling

- [ ] **Improve open shift claiming**
  - [ ] Add claimed_by uniqueness constraint (one claim per shift)
  - [ ] Add claim expiration (unclaim after X minutes)
  - [ ] Audit trail of claim/unclaim history

---

## Related Documentation

- [Schema Contract v2](../../legacy-contracts/schema-contract-v2.txt) - Core patterns and conventions
- [Schema Registry v2](../../legacy-contracts/schema-registry-v2.txt) - Table registry
- [Platform Schema](./00-platform.md) - Account and platform tables
- [Core Schema](./01-core.md) - Shared enums and types
- [Tenant Schema](./02-tenant.md) - Shared tenant entities
- [Tenant Events Schema](./05-tenant_events.md) - Events and budgeting
- [Tenant Kitchen Schema](./07-tenant_kitchen.md) - Kitchen tasks
