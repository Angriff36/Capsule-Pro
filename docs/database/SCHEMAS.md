# Database Schemas Overview

**Complete schema reference for the Convoy multi-tenant database**

## Schema Architecture

The Convoy database uses **9 PostgreSQL schemas** to organize domain-specific functionality:

```
┌─────────────────────────────────────────────────────────┐
│                    Database: convoy                      │
├─────────────────────────────────────────────────────────┤
│  core           - Types, enums, functions               │
│  platform       - Account, User (no tenant_id)          │
│  tenant         - Location, Employee (core tenant)      │
│  tenant_admin   - Admin, reporting, notifications       │
│  tenant_crm     - CRM: clients, leads, proposals        │
│  tenant_events  - Events, battle boards, imports         │
│  tenant_inventory - Inventory, POs, forecasts           │
│  tenant_kitchen - Kitchen tasks, prep, recipes          │
│  tenant_staff   - Scheduling, time tracking, shifts     │
└─────────────────────────────────────────────────────────┘
```

## Schema Details

### 1. `core` Schema

**Purpose**: Shared types, enums, and database functions

**Contains**:
- Type definitions
- Enum definitions
- Common database functions
- Utility views

**Characteristics**:
- No tables, only definitions
- Available to all schemas
- No tenant isolation (shared structures)

---

### 2. `platform` Schema

**Purpose**: Platform-level tables (multi-tenant system itself)

**Tables**:
- `Account` - Tenant accounts (subscription tier, limits)
- `User` - Platform users (authentication via Clerk)
- `Organization` - (if applicable)

**Characteristics**:
- **No `tenantId` column** - platform-level data
- One Account = One tenant
- Users belong to Accounts, which have Locations

**Key Relationships**:
```
Account (1) ──< (N) Location
Account (1) ──< (N) User
```

---

### 3. `tenant` Schema

**Purpose**: Core tenant tables shared across all domains

**Tables**:
- `Location` - Physical locations (kitchens, venues)
- `Employee` - Employee records
- `EmployeeLocation` - Employee ↔ Location mappings
- `CommandBoard` - Command boards (real-time collaboration)
- `CommandBoardCard` - Cards on command boards
- `TimelineTask` - Timeline tasks on boards

**Characteristics**:
- Has `tenantId` column
- Cross-cutting concerns (used by multiple modules)
- Foundation for other tenant schemas

**Key Relationships**:
```
Account (1) ──< (N) Location ──< (N) EmployeeLocation ──< (N) Employee
Location (1) ──< (N) KitchenTask
Location (1) ──< (N) Event
Location (1) ──< (N) Schedule
```

---

### 4. `tenant_kitchen` Schema

**Purpose**: Kitchen operations - tasks, prep lists, recipes

**Tables**:
- `KitchenTask` - Kitchen tasks (claims, progress tracking)
- `KitchenTaskClaim` - Task claims (who claimed what)
- `KitchenTaskProgress` - Progress updates (real-time)
- `PrepList` - Prep lists
- `PrepListItem` - Items on prep lists
- `PrepTask` - Prep tasks
- `Recipe` - Recipes
- `RecipeVersion` - Recipe versioning
- `RecipeIngredient` - Recipe ↔ Ingredient associations
- `Ingredient` - Ingredients
- `PrepMethod` - Preparation methods
- `Container` - Containers for prep
- `Dish` - Dishes (menu items)
- `Menu` - Menus
- `MenuDish` - Menu ↔ Dish associations
- `PrepComment` - Comments on prep

**Characteristics**:
- Has `tenantId` column
- High-frequency real-time updates (task claims, progress)
- Priority #1 for real-time features
- Location-scoped where applicable

**Key Relationships**:
```
Location (1) ──< (N) KitchenTask
KitchenTask (1) ──< (N) KitchenTaskClaim
KitchenTask (1) ──< (N) KitchenTaskProgress
Recipe (1) ──< (N) RecipeVersion ──< (N) RecipeIngredient ──> (1) Ingredient
Menu (1) ──< (N) MenuDish ──> (1) Dish
```

---

### 5. `tenant_events` Schema

**Purpose**: Event management, battle boards, imports

**Tables**:
- `Event` - Events/catering jobs
- `BattleBoard` - Battle boards (event planning)
- `EventStaffAssignment` - Staff assigned to events
- `EventTimeline` - Event timelines
- `EventImport` - Event imports (CSV/PDF)
- `CateringOrder` - Catering orders
- `EventGuest` - Event guests
- `EventContract` - Event contracts
- `ContractSignature` - Contract signatures
- `EventReport` - Event reports
- `LaborBudget` - Labor budgeting
- `EventBudget` - Event budgeting
- `BudgetLineItem` - Budget line items
- `BudgetAlert` - Budget alerts
- `AllergenWarning` - Allergen warnings

**Characteristics**:
- Has `tenantId` column
- Medium-frequency real-time updates
- Priority #2 for real-time features
- Complex import workflows (TPP PDF, CSV)

**Key Relationships**:
```
Location (1) ──< (N) Event ──< (N) BattleBoard
Event (1) ──< (N) EventStaffAssignment ──> (1) Employee
Event (1) ──< (N) EventGuest
Event (1) ──< (N) EventContract ──< (N) ContractSignature
Event (1) ──< (N) EventReport
Event (1) ──< (N) EventBudget ──< (N) BudgetLineItem
```

---

### 6. `tenant_staff` Schema

**Purpose**: Staff scheduling, time tracking, availability

**Tables**:
- `Schedule` - Schedules
- `ScheduleShift` - Shifts within schedules
- `TimeEntry` - Time entries (clock in/out)
- `TimecardEditRequest` - Timecard edit requests
- `EmployeeLocation` - Employee ↔ Location mappings

**Characteristics**:
- Has `tenantId` column
- Lower-frequency real-time updates
- Priority #3 for real-time features
- Integration with GoodShuffle, Nowsta (future)

**Key Relationships**:
```
Location (1) ──< (N) Schedule ──< (N) ScheduleShift
Employee (1) ──< (N) TimeEntry
ScheduleShift (1) ──< (N) TimeEntry
```

---

### 7. `tenant_crm` Schema

**Purpose**: Customer relationship management

**Tables**:
- `Client` - Clients/companies
- `ClientContact` - Client contacts
- `ClientPreference` - Client preferences
- `Lead` - Leads
- `ClientInteraction` - Client interactions
- `Proposal` - Proposals
- `ProposalLineItem` - Proposal line items

**Characteristics**:
- Has `tenantId` column
- Tenant-wide (not location-scoped)
- Lower-frequency updates
- Integration with GoodShuffle (future)

**Key Relationships**:
```
Account (1) ──< (N) Client ──< (N) ClientContact
Client (1) ──< (N) Lead ──> (1) Event
Client (1) ──< (N) Proposal ──< (N) ProposalLineItem
```

---

### 8. `tenant_inventory` Schema

**Purpose**: Inventory management, purchasing, waste tracking

**Tables**:
- `InventoryItem` - Inventory items
- `InventoryTransaction` - Inventory transactions
- `InventorySupplier` - Suppliers
- `InventoryAlert` - Inventory alerts
- `InventoryStock` - Stock levels
- `InventoryForecast` - Forecasts
- `ForecastInput` - Forecast inputs
- `ReorderSuggestion` - Reorder suggestions
- `AlertsConfig` - Alerts configuration
- `CycleCountSession` - Cycle count sessions
- `CycleCountRecord` - Cycle count records
- `VarianceReport` - Variance reports
- `CycleCountAuditLog` - Cycle count audit logs
- `PurchaseOrder` - Purchase orders
- `PurchaseOrderItem` - Purchase order items
- `Shipment` - Shipments
- `ShipmentItem` - Shipment items
- `WasteEntry` - Waste entries

**Characteristics**:
- Has `tenantId` column
- Location-scoped
- Medium-frequency updates
- Complex forecasting logic

**Key Relationships**:
```
Location (1) ──< (N) InventoryItem
InventoryItem (1) ──< (N) InventoryTransaction
InventoryItem (1) ──< (N) InventoryStock
InventoryItem (1) ──< (N) WasteEntry
PurchaseOrder (1) ──< (N) PurchaseOrderItem ──> (1) InventoryItem
Shipment (1) ──< (N) ShipmentItem ──> (1) InventoryItem
```

---

### 9. `tenant_admin` Schema

**Purpose**: Admin functions, reporting, workflows, notifications

**Tables**:
- `Report` - Reports
- `Workflow` - Workflows
- `Notification` - Notifications
- `OutboxEvent` - Outbox pattern for real-time events

**Characteristics**:
- Has `tenantId` column (except OutboxEvent)
- Cross-cutting concerns
- Lower-frequency updates
- OutboxEvent critical for real-time features

**Key Relationships**:
```
OutboxEvent (1) ──< (N) [published to Ably]
Account (1) ──< (N) Workflow
Account (1) ──< (N) Report
```

---

## Cross-Schema Relationships

### Common Patterns

1. **Account → Location → Employees**
   - Platform.Account creates tenant isolation
   - tenant.Location represents physical kitchens/venues
   - tenant.Employee works at locations

2. **Location → Domain Tables**
   - Most tenant tables have `locationId` FK to `tenant.Location`
   - Scopes data to specific kitchen/venue

3. **Events ↔ CRM**
   - tenant_events.Event can reference tenant_crm.Lead
   - Events generate from leads

4. **Events ↔ Staff**
   - tenant_events.EventStaffAssignment ↔ tenant_staff.Employee
   - Staff assigned to events

5. **Kitchen ↔ Events**
   - tenant_kitchen.Recipe/Dish used in tenant_events.Event
   - Event menu drives kitchen prep

### Foreign Key Strategies

**Same-Schema FKs**:
- Standard `@relation` attributes
- Cascade deletes where appropriate
- Indexed for performance

**Cross-Schema FKs**:
- Use explicit `@relation` with schema references
- Example: Event (tenant_events) → Lead (tenant_crm)
- Ensure both schemas exist before migration

---

## Schema Usage Priority

### Real-Time Feature Priority

1. **Priority #1**: `tenant_kitchen`
   - KitchenTask claims/progress
   - Highest frequency updates
   - Critical for operations

2. **Priority #2**: `tenant_events`
   - Battle board updates
   - Event timeline changes
   - Medium frequency

3. **Priority #3**: `tenant_staff`
   - Schedule changes
   - Time entry updates
   - Lower frequency

### Development Priority

1. **Phase 1**: Platform + Tenant (core)
2. **Phase 2**: Kitchen (highest business value)
3. **Phase 3**: Events (TPP import, battle boards)
4. **Phase 4**: Staff (scheduling, time tracking)
5. **Phase 5**: CRM + Inventory + Admin

---

## Schema Conventions

### Naming Conventions

- **Tables**: `PascalCase` (e.g., `KitchenTask`, `EventImport`)
- **Columns**: `camelCase` (e.g., `tenantId`, `createdAt`)
- **Indexes**: Implicit via `@@index()` attributes
- **Maps**: `@map("snake_case")` for PostgreSQL snake_case

### Column Patterns

Every tenant table includes:
- `id`: UUID primary key
- `tenantId`: UUID foreign key to Account
- `createdAt`: Timestamptz with default
- `updatedAt`: Timestamptz with default and @updatedAt
- `deletedAt`: Timestamptz nullable (soft delete)

### Index Patterns

Standard indexes:
- `@@index([tenantId, deletedAt])` - Tenant queries with soft deletes
- `@@index([locationId])` - Location-scoped queries
- `@@index([tenantId, status])` - Status-filtered queries
- `@@index([createdAt])` - Time-based queries

---

## Migration History

See `docs/database/migrations/` for detailed migration documentation.

Key migrations:
- Initial schema with multi-tenant structure
- Event budget tracking (2025-01-24)
- Menu model additions (attempted, rolled back)
- Foreign key fixes (2025-01-29)
- Event reports model (2025-01-29)

---

## See Also

- **Table Documentation**: `docs/database/tables/`
- **Enum Documentation**: `docs/database/enums/`
- **Migration Documentation**: `docs/database/migrations/`
- **Prisma Schema**: `packages/database/prisma/schema.prisma`
- **Schema Contract**: `docs/legacy-contracts/schema-contract-v2.txt`
