# Database Enums

**Comprehensive documentation for all Convoy database enums**

Enums define the valid values for specific fields in the Convoy database, ensuring data consistency and enforcing business rules at the database level.

## Overview

Convoy uses PostgreSQL enums to constrain column values to a predefined set of options. These enums are defined in the `core` schema (unless otherwise noted) and are used across multiple schemas.

### Why Enums?

- **Type Safety**: Database enforces valid values
- **Consistency**: Same values used across all tables
- **Self-Documenting**: Valid values explicit in schema
- **Performance**: Efficient storage and indexing compared to strings

## Enum Categories

### Core System Enums

| Enum | Purpose | Schema |
|------|---------|--------|
| `ActionType` | Audit trail action types | `core` |
| `UserRole` | User role permissions | `core` |
| `OutboxStatus` | Outbox event processing status | `core` |

### Kitchen Operations Enums

| Enum | Purpose | Schema |
|------|---------|--------|
| `KitchenTaskPriority` | Task priority levels | `core` |
| `KitchenTaskStatus` | Task workflow states | `core` |

### Staff Management Enums

| Enum | Purpose | Schema |
|------|---------|--------|
| `EmploymentType` | Employee employment classification | `core` |

### Measurement & Units Enums

| Enum | Purpose | Schema |
|------|---------|--------|
| `UnitSystem` | Measurement system (metric/imperial) | `core` |
| `UnitType` | Unit category (volume/weight/etc) | `core` |

### Inventory Enums

| Enum | Purpose | Schema |
|------|---------|--------|
| `ShipmentStatus` | Shipment workflow states | `core` |

### Admin Module Enums

| Enum | Purpose | Schema |
|------|---------|--------|
| `admin_action` | Admin audit trail actions | `tenant_admin` |
| `admin_entity_type` | Admin-managed entity types | `tenant_admin` |
| `admin_role` | Admin user roles | `tenant_admin` |

## Quick Reference

### ActionType

Used in audit trails to track what type of operation occurred.

- `insert` - Record created
- `update` - Record modified
- `delete` - Record deleted

**Used in**: Audit tables, outbox events

---

### EmploymentType

Classifies employee employment arrangement.

- `full_time` - Full-time employee (default)
- `part_time` - Part-time employee
- `contractor` - Independent contractor
- `temp` - Temporary worker

**Used in**: `User.employmentType`

---

### UserRole

Defines user permission level within tenant.

- `owner` - Full access, billing management
- `admin` - Administrative access
- `manager` - Management access
- `staff` - Basic user access (default)

**Used in**: `User.role`

**Note**: Currently stored as String in schema, should be migrated to UserRole enum

---

### UnitSystem

Measurement system for units.

- `metric` - Metric system (liters, grams, Celsius)
- `imperial` - Imperial system (gallons, pounds, Fahrenheit)
- `custom` - Custom/unit-specific measurements

**Used in**: Unit definitions

---

### UnitType

Category of measurement unit.

- `volume` - Liquid volume (liters, gallons)
- `weight` - Mass/weight (grams, pounds)
- `count` - Integer quantities
- `length` - Distance (meters, feet)
- `temperature` - Temperature (Celsius, Fahrenheit)
- `time` - Duration (minutes, hours)

**Used in**: Unit definitions

---

### KitchenTaskPriority

Task urgency levels.

- `low` - Low priority
- `medium` - Normal priority (default)
- `high` - Important task
- `urgent` - Critical, immediate attention

**Used in**: `KitchenTask.priority`

---

### KitchenTaskStatus

Task workflow states.

- `open` - Task created, not started
- `in_progress` - Task actively being worked
- `done` - Task completed
- `canceled` - Task cancelled

**Used in**: `KitchenTask.status`

---

### OutboxStatus

Outbox event processing state.

- `pending` - Awaiting publication to real-time service
- `published` - Successfully published
- `failed` - Publication failed, needs retry

**Used in**: `OutboxEvent.status`

---

### ShipmentStatus

Shipment workflow states.

- `draft` - Shipment being prepared
- `scheduled` - Scheduled for pickup
- `preparing` - Being assembled
- `in_transit` - On the way
- `delivered` - Successfully delivered
- `returned` - Returned to sender
- `cancelled` - Shipment cancelled

**Used in**: `Shipment.status`

---

### admin_action

Actions performed by admin users.

- `login` - User logged in
- `logout` - User logged out
- `create` - Entity created
- `update` - Entity modified
- `delete` - Entity deleted
- `view` - Entity viewed
- `permission_change` - Permissions modified
- `role_change` - Role assignment changed
- `account_change` - Account settings modified
- `security_change` - Security settings modified

**Used in**: Admin audit trails

---

### admin_entity_type

Entity types managed by admin module.

- `admin_users` - Admin user accounts
- `admin_roles` - Admin role definitions
- `admin_permissions` - Permission definitions
- `admin_audit_trail` - Audit log itself
- `users` - Regular users
- `roles` - User roles
- `permissions` - User permissions
- `tenants` - Tenant accounts
- `reports` - Report definitions
- `settings` - System settings

**Used in**: Admin audit trails

---

### admin_role

Administrative user roles.

- `super_admin` - Full system access
- `tenant_admin` - Tenant-level administration
- `finance_manager` - Financial reporting access
- `operations_manager` - Operational oversight
- `staff_manager` - HR and staff management
- `read_only` - Read-only access

**Used in**: Admin user management

## Naming Conventions

### Database Names

PostgreSQL enum names use snake_case:
- `action_type` (not ActionType)
- `employment_type` (not EmploymentType)
- `kitchen_task_status` (not KitchenTaskStatus)

### Prisma Names

Prisma enum names use PascalCase:
- `ActionType` (maps to `action_type`)
- `EmploymentType` (maps to `employment_type`)
- `KitchenTaskStatus` (maps to `kitchen_task_status`)

### Enum Values

Enum values use lowercase snake_case:
- `full_time` (not FULL_TIME or FullTime)
- `in_progress` (not IN_PROGRESS or InProgress)

## Adding New Enums

When adding a new enum:

1. **Define in Prisma schema**:
   ```prisma
   enum MyEnum {
     value_one
     value_two
     value_three

     @@map("my_enum")
     @@schema("core")
   }
   ```

2. **Create migration**:
   ```bash
   pnpm db:check
   pnpm migrate
   ```
   If `db:check` fails, run:
   ```bash
   pnpm db:repair
   pnpm db:deploy
   ```

3. **Update documentation**:
   - Add entry to this README
   - Create dedicated enum doc: `MyEnum.md`
   - Include frontmatter metadata

4. **Update type checking**:
   - Regenerate Prisma client: `pnpm prisma:generate`
   - Update TypeScript types if needed

## Modifying Existing Enums

### Adding Values

```sql
-- In migration
ALTER TYPE my_enum ADD VALUE 'new_value' AFTER 'existing_value';
```

**Warning**: Adding values is generally safe, but ensure application code handles new values.

### Removing Values

**Warning**: Removing enum values requires:
1. Update all rows using the value to a different value
2. Drop dependent columns or constraints
3. Drop and recreate the enum

**Recommendation**: Deprecate values in application logic instead of removing.

## Known Issues

See [KNOWN_ISSUES.md](../KNOWN_ISSUES.md) for enum-specific issues:
- UserRole enum defined but not used in schema (String used instead)
- Some enums lack application-level validation

## See Also

- [Table Documentation](../tables/) - Tables using these enums
- [Schema Documentation](../schemas/) - Domain-specific schema docs
- [Prisma Schema](../../../packages/database/prisma/schema.prisma) - Source of truth
- [Migration Documentation](../migrations/) - Enum change history
