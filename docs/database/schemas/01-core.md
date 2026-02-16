# Core Schema

**Schema:** `core`

## Purpose

The core schema contains **shared reference data** and **type definitions** used across the entire Convoy platform. These are foundational types that transcend tenant boundaries and provide system-wide consistency.

## Goals

1. **Type Consistency**: Single source of truth for enums and types used across all tenant schemas
2. **Reference Data Management**: Centralized management of units, status types, and other shared lookup tables
3. **Audit Infrastructure**: Core tables for tracking changes across all schemas
4. **Flexible Workflows**: Status transition system that enables customizable workflows without code changes

## Tables

### `units`

Standard measurement units for the platform.

**Columns:**
- `id` (SmallInt, PK): Unique identifier
- `code` (String, Unique): Unit code (e.g., "kg", "lb", "cup")
- `name` (String): Singular name (e.g., "kilogram", "pound")
- `name_plural` (String): Plural name (e.g., "kilograms", "pounds")
- `unit_system` (UnitSystem): System of measurement (metric/imperial/custom)
- `unit_type` (UnitType): Type of unit (volume/weight/count/length/temperature/time)
- `is_base_unit` (Boolean): Whether this is the base unit for its type

**Usage:**
- Referenced by `unit_id` in tenant schemas for quantities, recipes, inventory
- Base units used for conversions via `unit_conversions`

**Examples:**
- `id: 1, code: "kg", name: "kilogram", unit_system: metric, unit_type: weight, is_base_unit: true`
- `id: 2, code: "lb", name: "pound", unit_system: imperial, unit_type: weight, is_base_unit: false`

---

### `unit_conversions`

Conversion factors between units.

**Columns:**
- `from_unit_id` (SmallInt, PK): Source unit ID
- `to_unit_id` (SmallInt, PK): Target unit ID
- `multiplier` (Decimal(20,10)): Conversion factor (to_unit = from_unit × multiplier)

**Usage:**
- Convert quantities between units (e.g., kg to lb)
- Enables flexible recipe scaling and inventory management

**Example:**
- `from_unit_id: 1, to_unit_id: 2, multiplier: 2.20462` (1 kg = 2.20462 lb)

---

### `status_types`

Flexible status type definitions for all domain entities.

**Columns:**
- `id` (SmallInt, PK): Unique identifier
- `category` (String): Category name (e.g., "event", "task", "shipment")
- `code` (String): Status code (e.g., "draft", "pending", "completed")
- `label` (String): Human-readable label
- `description` (String?, Optional): Detailed description
- `color_hex` (Char(7)?, Optional): UI color code (e.g., "#FF0000")
- `sort_order` (SmallInt): Display order (default: 0)
- `is_terminal` (Boolean): Whether this is a final state (default: false)
- `is_default` (Boolean): Whether this is the default status (default: false)
- `is_active` (Boolean): Whether this status is active (default: true)

**Unique Constraint:**
- `(category, code)` - Each status code is unique per category

**Usage:**
- Provides flexible status management without code changes
- UI can render status labels and colors dynamically
- Terminal states prevent further transitions

**Examples:**
- `category: "event", code: "draft", label: "Draft", color_hex: "#6B7280", is_terminal: false`
- `category: "event", code: "confirmed", label: "Confirmed", color_hex: "#10B981", is_terminal: false`
- `category: "event", code: "cancelled", label: "Cancelled", color_hex: "#EF4444", is_terminal: true`

---

### `status_transitions`

Valid state transitions and access control rules.

**Columns:**
- `id` (BigInt, PK): Auto-increment identifier
- `category` (String): Status category name
- `from_status_code` (String?, Optional): Current status (null = initial state)
- `to_status_code` (String): Target status
- `requires_role` (String[]): List of roles allowed to make this transition
- `is_automatic` (Boolean): Whether this transition happens automatically (default: false)

**Unique Constraint:**
- `(category, from_status_code, to_status_code)` - One rule per transition

**Usage:**
- Enforces business rules for status changes
- Controls who can make specific transitions
- Enables automatic transitions (e.g., draft → pending approval)

**Examples:**
- `category: "event", from_status_code: "draft", to_status_code: "confirmed", requires_role: ["admin", "manager"], is_automatic: false`
- `category: "event", from_status_code: "confirmed", to_status_code: "in_progress", requires_role: ["staff"], is_automatic: true`
- `category: "event", from_status_code: null, to_status_code: "draft", requires_role: ["admin", "manager"], is_automatic: false`

**Benefits:**
- Status workflows can be changed via database updates (no code deployment)
- Role-based access control at the state transition level
- Automatic transitions enable workflow automation

---

### `waste_reasons`

Predefined reasons for inventory waste entries.

**Columns:**
- `id` (SmallInt, PK): Auto-increment identifier
- `code` (String, Unique): Reason code (e.g., "spoiled", "expired", "error")
- `name` (String): Display name
- `description` (String?, Optional): Detailed explanation
- `colorHex` (Char(7)?, Optional): UI color code
- `isActive` (Boolean): Whether this reason is active (default: true)
- `sortOrder` (SmallInt): Display order (default: 0)

**Usage:**
- Standardized waste tracking across tenants
- Enables waste analytics and reporting
- UI can render reasons as selectable options

**Examples:**
- `code: "spoiled", name: "Spoiled", colorHex: "#EF4444"`
- `code: "expired", name: "Expired", colorHex: "#F59E0B"`
- `code: "prep_error", name: "Prep Error", colorHex: "#8B5CF6"`

---

### `audit_config`

Configuration for audit logging per table.

**Columns:**
- `table_schema` (String, PK): Schema name
- `table_name` (String, PK): Table name
- `audit_level` (String): Audit level (default: "full")
- `excluded_columns` (String[]): Columns to exclude from auditing

**Primary Key:**
- `(table_schema, table_name)` - One config per table

**Usage:**
- Controls which tables are audited and at what level
- Allows excluding sensitive columns (e.g., password hashes)
- Used by audit triggers to determine logging behavior

**Audit Levels:**
- `full`: Log all changes (before/after values)
- `minimal`: Log only that a change occurred
- `none`: No auditing

---

## Enums

### `ActionType`

Audit trail action types.

**Values:**
- `insert`: Record creation
- `update`: Record modification
- `delete`: Record deletion

**Usage:**
- Used in `audit_archive` table
- Tracked by audit triggers

---

### `EmploymentType`

Staff employment classification.

**Values:**
- `full_time`: Full-time employees
- `part_time`: Part-time employees
- `contractor`: Independent contractors
- `temp`: Temporary workers

**Usage:**
- Staff management and scheduling
- Benefits calculations

---

### `UnitSystem`

Measurement system classification.

**Values:**
- `metric`: Metric system (kg, L, m)
- `imperial`: Imperial system (lb, gal, ft)
- `custom`: Custom units specific to business needs

**Usage:**
- Filter units by system
- Display preferences per tenant

---

### `UnitType`

Physical quantity type classification.

**Values:**
- `volume`: Volume measurements (L, gal, cup)
- `weight`: Weight measurements (kg, lb, oz)
- `count`: Count measurements (piece, dozen)
- `length`: Length measurements (m, ft, in)
- `temperature`: Temperature (°C, °F)
- `time`: Duration (min, hr)

**Usage:**
- Group units by physical quantity
- Prevent invalid conversions (e.g., volume to weight)

---

### `KitchenTaskPriority`

Kitchen task urgency levels.

**Values:**
- `low`: Low priority tasks
- `medium`: Standard priority (default)
- `high`: Important tasks
- `urgent`: Critical tasks requiring immediate attention

**Usage:**
- Task sorting and filtering
- UI color coding (gray → green → orange → red)

---

### `KitchenTaskStatus`

Kitchen task workflow states.

**Values:**
- `open`: Task not yet started
- `in_progress`: Task actively being worked on
- `done`: Task completed
- `canceled`: Task cancelled (no longer needed)

**Usage:**
- Task workflow management
- Progress tracking
- Performance metrics (cycle time)

---

### `OutboxStatus`

Outbox pattern message delivery status.

**Values:**
- `pending`: Message awaiting delivery
- `published`: Message successfully delivered
- `failed`: Message delivery failed (will retry)

**Usage:**
- Real-time event publishing via Ably
- Exactly-once delivery guarantees
- Retry logic for failed messages

---

### `UserRole`

User role hierarchy within tenant.

**Values:**
- `owner`: Account owner (full access)
- `admin`: Administrator (full access except billing)
- `manager`: Manager (operational management)
- `staff`: Staff member (limited access)

**Usage:**
- Permission checks
- Feature access control
- UI element visibility

---

### `ShipmentStatus`

Supply chain shipment tracking states.

**Values:**
- `draft`: Shipment not yet finalized
- `scheduled`: Shipment scheduled for future date
- `preparing`: Shipment being prepared
- `in_transit`: Shipment en route to destination
- `delivered`: Shipment successfully delivered
- `returned`: Shipment returned to sender
- `cancelled`: Shipment cancelled

**Usage:**
- Supply chain tracking
- Inventory forecasting
- Delivery notifications

---

### `admin_action`

Admin audit trail action types (tenant_admin schema).

**Values:**
- `login`: User login
- `logout`: User logout
- `create`: Entity creation
- `update`: Entity modification
- `delete`: Entity deletion
- `view`: Entity viewed
- `permission_change`: Permission modified
- `role_change`: Role changed
- `account_change`: Account settings changed
- `security_change`: Security settings changed

**Usage:**
- Admin audit trail
- Security monitoring
- Compliance reporting

---

### `admin_entity_type`

Admin-audited entity types (tenant_admin schema).

**Values:**
- `admin_users`: Admin user records
- `admin_roles`: Admin role definitions
- `admin_permissions`: Admin permission assignments
- `admin_audit_trail`: Audit trail records
- `users`: Tenant users
- `roles`: Tenant roles
- `permissions`: Tenant permissions
- `tenants`: Tenant accounts
- `reports`: Report configurations
- `settings`: System settings

**Usage:**
- Audit trail filtering
- Entity-level access tracking

---

### `admin_role`

Admin role hierarchy (tenant_admin schema).

**Values:**
- `super_admin`: Platform-wide admin (all tenants)
- `tenant_admin`: Tenant administrator
- `finance_manager`: Financial operations manager
- `operations_manager`: Day-to-day operations manager
- `staff_manager`: HR and staff management
- `read_only`: Read-only access

**Usage:**
- Admin panel access control
- Permission inheritance
- UI element visibility

---

## Rules

### Enum Immutability
- **Once deployed, enum values NEVER change**
- Adding values is safe (new versions of app code handle them)
- Removing/rename values breaks existing data and deployments
- Always deprecate by adding new values and migrating data

### Status Management
- Use `status_types` table for flexible workflows (not hardcoded enums)
- Status transitions must be defined in `status_transitions`
- Always check `is_active` flag before using a status type
- Terminal states (`is_terminal: true`) cannot transition further

### Unit Conversions
- Always convert via base units (chain: A → base → B)
- Each `unit_type` has exactly one `is_base_unit: true`
- Conversion factor: `to_unit = from_unit × multiplier`

### Audit Configuration
- Default `audit_level: "full"` logs all changes
- Use `excluded_columns` to skip sensitive data (e.g., tokens)
- `audit_level: "none"` disables triggers for that table

---

## Decisions

### Why `status_types` table instead of hardcoded enums?

**Problem:**
- Hardcoded enums require code deployment to add statuses
- Different workflows need different status values
- UI colors and labels need to be customizable

**Solution:**
- Database-driven status definitions
- Transitions and access rules also in database
- UI can render statuses dynamically

**Benefits:**
- Add new statuses without code deployment
- Tenant-specific workflows via tenant_id filtering (future)
- Consistent UI rendering (colors, labels, icons)
- Terminal state enforcement at data level

**Trade-offs:**
- Slightly more complex queries (join status_types)
- Foreign key required (vs enum type safety)
- Need to seed reference data on deploy

---

## Relations

The core schema is **referenced by all tenant schemas**:

- `public.*` tables reference `units.id` for measurements
- `tenant_kitchen.*` references `waste_reasons.id` for waste tracking
- `tenant_events.*` uses `status_types` for event/workflow statuses
- `tenant_staff.*` uses `status_types` for employee/approval statuses
- `tenant_inventory.*` uses `units.id` for item quantities

**No circular dependencies** - core schema never references tenant schemas.

---

## Lifecycle

### Enum Values
1. **Design Phase**: Define enum values in schema.prisma
2. **Migration**: Run migration to add enum type to database
3. **Code Generation**: Prisma generates TypeScript types
4. **Usage**: App code uses enum values
5. **Lock-In**: Values become immutable after first production deployment

### Status Types
1. **Seed**: Initial statuses seeded via migration
2. **Runtime**: App queries `status_types` table
3. **Updates**: New statuses added via data migrations (not schema changes)
4. **Deprecation**: Old statuses set `is_active: false` (not deleted)

### Units
1. **Seed**: Standard units seeded via migration
2. **Conversions**: Base units and conversion factors seeded
3. **Extensibility**: Custom units can be added per tenant (future)

---

## Performance

### Enum Lookups
- Enums are **PostgreSQL types** (not tables)
- Zero query overhead (compiled into query plan)
- Type safety enforced at database level

### Status Type Queries
- Add index on `(category, is_active)` for filtering
- Cache in memory for UI rendering (rarely changes)
- Use `WHERE is_active = true` for all user-facing queries

### Unit Conversions
- Composite PK `(from_unit_id, to_unit_id)` indexed
- Conversion lookups are O(1) via PK
- Consider caching conversion matrix in memory

---

## TODOs

### High Priority
- [ ] Add index on `status_types(category, is_active)` for filtering
- [ ] Seed initial status types for events, tasks, shipments
- [ ] Document status workflow patterns (how to add new categories)

### Medium Priority
- [ ] Create admin UI for managing status_types and transitions
- [ ] Add API endpoints for status type CRUD (tenant-scoped)
- [ ] Implement status transition validation in application layer

### Low Priority
- [ ] Consider adding `icon_name` field to status_types for UI icons
- [ ] Add `requires_comment` boolean to status_transitions (force reason on transition)
- [ ] Create analytics dashboard for status transitions (bottleneck detection)

---

## Related Documentation

- [Schema Contract v2](../../legacy-contracts/schema-contract-v2.txt) - Core patterns and conventions
- [Schema Registry v2](../../legacy-contracts/schema-registry-v2.txt) - Table registry
- [Tenant Schemas](./02-public.md) - Public schema tables
- [Tenant Kitchen Schema](./03-tenant-kitchen.md) - Kitchen-specific tables
