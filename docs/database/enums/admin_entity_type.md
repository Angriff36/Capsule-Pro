# admin_entity_type

> **First documented**: 2025-01-30
> **Last updated**: 2025-01-30
> **Last verified by**: spec-executor (T032)
> **Verification status**: ✅ Verified

## Overview

Defines the entity types that can be affected by administrative actions, used in conjunction with `admin_action` to track what was changed in the audit trail.

**Business Context**: Admin actions need to specify which entity type was affected (users, roles, reports, etc.) for meaningful audit trails and compliance reporting.

**Key Use Cases**:
- Categorize audit trail entries by entity type
- Filter audit logs by entity (e.g., show all report changes)
- Enforce permissions (some roles can't modify certain entity types)
- Analytics on which entity types are most frequently modified

**Schema Location**: `tenant_admin` schema

## Schema Reference

```prisma
enum admin_entity_type {
  admin_users
  admin_roles
  admin_permissions
  admin_audit_trail
  users
  roles
  permissions
  tenants
  reports
  settings

  @@schema("tenant_admin")
}
```

**PostgreSQL Type**: `tenant_admin.admin_entity_type`
**Database Location**: `tenant_admin` schema (tenant-scoped)
**Mutability**: Immutable (adding values requires migration)

## Values

| Value | Description | Related Table | Example Actions |
|-------|-------------|---------------|-----------------|
| `admin_users` | Admin user accounts | `admin_users` | create, update, delete, role_change |
| `admin_roles` | Admin role definitions | `admin_roles` | create, update, delete |
| `admin_permissions` | Admin permission assignments | `admin_permissions` | create, update, delete, permission_change |
| `admin_audit_trail` | Audit log entries | `admin_audit_trail` | view (read-only access) |
| `users` | Regular staff users (tenant_staff) | `User` | create, update, delete, view |
| `roles` | Staff role definitions (tenant_staff) | `Role` | create, update, delete |
| `permissions` | Staff permissions (tenant_staff) | `admin_permissions` | create, update, delete |
| `tenants` | Tenant/account settings | `Account`, `Tenant` | update, account_change |
| `reports` | Admin reports and schedules | `Report`, `report_schedules` | create, update, delete, view |
| `settings` | Tenant-wide settings | `settings` | update, view |

## Entity Categories

### Admin-Specific Entities
These exist only in `tenant_admin` schema:
- `admin_users` - Admin panel user accounts
- `admin_roles` - Admin role definitions
- `admin_permissions` - Admin permission assignments
- `admin_audit_trail` - Audit log (view only)

### Tenant Staff Entities
From `tenant_staff` schema:
- `users` - Regular staff user accounts
- `roles` - Staff role definitions
- `permissions` - Staff permission assignments

### Platform Entities
From `platform` schema:
- `tenants` - Account and tenant settings

### Operational Entities
Configured and managed by admin:
- `reports` - Reports and schedules
- `settings` - Tenant-wide configuration

## Business Rules

1. **Usage with admin_action**:
   - `entityType` required for most actions (except login/logout)
   - Combines with `entityId` to identify specific affected record
   - `admin_audit_trail` entity type is view-only (prevent tampering)

2. **Permission Boundaries**:
   - Some roles can modify `users` but not `admin_users`
   - `super_admin` can modify all entity types
   - `read_only` can only `view` entity types

3. **Cascade Deletes**:
   - Deleting `admin_roles` affects `admin_permissions`
   - Deleting `reports` affects `report_schedules`
   - Audit trail records retain references even if entity deleted

## Usage in admin_audit_trail Model

```typescript
import { admin_action, admin_entity_type } from '@repo/database/generated'

// Log admin user modification
await database.adminAuditTrail.create({
  data: {
    tenantId,
    adminUserId: currentUserId,
    action: admin_action.update,
    entityType: admin_entity_type.admin_users,
    entityId: targetUserId,
    changes: {
      before: { name: 'John Doe', email: 'john@example.com' },
      after: { name: 'John Smith', email: 'john.smith@example.com' }
    }
  }
})

// Log role deletion
await database.adminAuditTrail.create({
  data: {
    tenantId,
    adminUserId: adminId,
    action: admin_action.delete,
    entityType: admin_entity_type.admin_roles,
    entityId: roleId,
    changes: {
      deletedRole: { name: 'deprecated_role', displayName: 'Deprecated Role' }
    }
  }
})

// Log report creation
await database.adminAuditTrail.create({
  data: {
    tenantId,
    adminUserId: adminId,
    action: admin_action.create,
    entityType: admin_entity_type.reports,
    entityId: newReportId,
    changes: {
      reportName: 'Weekly Revenue Summary',
      reportType: 'financial',
      schedule: 'weekly'
    }
  }
})

// Log account settings change (high alert)
await database.adminAuditTrail.create({
  data: {
    tenantId,
    adminUserId: superadminId,
    action: admin_action.account_change,
    entityType: admin_entity_type.tenants,
    entityId: accountId,
    changes: {
      before: { tier: 'basic', monthlySpendLimit: 1000 },
      after: { tier: 'premium', monthlySpendLimit: 5000 }
    }
  }
})
```

## Common Queries

### Get audit history for specific admin user
```typescript
const userHistory = await database.adminAuditTrail.findMany({
  where: {
    tenantId,
    entityType: admin_entity_type.admin_users,
    entityId: targetUserId
  },
  orderBy: { createdAt: 'desc' }
})
```

### Get all changes to reports
```typescript
const reportChanges = await database.adminAuditTrail.findMany({
  where: {
    tenantId,
    entityType: admin_entity_type.reports,
    action: { in: [admin_action.create, admin_action.update, admin_action.delete] }
  },
  include: {
    adminUser: { select: { name: true, email: true } }
  }
})
```

### Get permission changes (high security)
```typescript
const permissionChanges = await database.adminAuditTrail.findMany({
  where: {
    tenantId,
    entityType: admin_entity_type.admin_permissions,
    action: admin_action.permission_change
  },
  orderBy: { createdAt: 'desc' },
  take: 100
})
```

### Get settings modifications
```typescript
const settingsChanges = await database.adminAuditTrail.findMany({
  where: {
    tenantId,
    entityType: admin_entity_type.settings,
    action: admin_action.update
  }
})
```

## Entity Type Permissions Matrix

| Entity Type | super_admin | tenant_admin | finance_manager | operations_manager | staff_manager | read_only |
|-------------|-------------|--------------|-----------------|-------------------|---------------|-----------|
| `admin_users` | ✅ | ⚠️ (non-super) | ❌ | ❌ | ❌ | 👁️ |
| `admin_roles` | ✅ | ❌ | ❌ | ❌ | ❌ | 👁️ |
| `admin_permissions` | ✅ | ❌ | ❌ | ❌ | ❌ | 👁️ |
| `admin_audit_trail` | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |
| `users` | ✅ | ✅ | ❌ | ❌ | ✅ | 👁️ |
| `roles` | ✅ | ✅ | ❌ | ❌ | ✅ | 👁️ |
| `permissions` | ✅ | ✅ | ❌ | ❌ | ✅ | 👁️ |
| `tenants` | ✅ | ❌ | ❌ | ❌ | ❌ | 👁️ |
| `reports` | ✅ | ✅ | ✅ | ✅ | ✅ | 👁️ |
| `settings` | ✅ | ✅ | ❌ | ⚠️ (limited) | ❌ | 👁️ |

✅ = Full access
⚠️ = Limited access
❌ = No access
👁️ = Read-only

## Related Enums

- **[admin_action](./admin_action.md)** - Actions performed on entities
- **[admin_role](./admin_role.md)** - Admin role definitions

## Related Tables

- **[admin_audit_trail](../tables/tenant_admin/admin_audit_trail.md)** - Audit log storage
- Schema: [`tenant_admin`](../schemas/03-tenant_admin.md)

## See Also

- Security: Permission matrix by role
- Compliance: Entity type access controls
