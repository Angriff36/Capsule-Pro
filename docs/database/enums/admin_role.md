# admin_role

> **First documented**: 2025-01-30
> **Last updated**: 2025-01-30
> **Last verified by**: spec-executor (T032)
> **Verification status**: ✅ Verified

## Overview

Defines the hierarchy of administrative roles within the admin panel, determining what actions and entity types each role can access.

**Business Context**: Admin roles implement principle of least privilege - each role has specific permissions appropriate to their responsibility level.

**Key Use Cases**:
- Assign admin users to appropriate permission levels
- Enforce access controls in admin panel
- Filter available features based on user role
- Audit trail includes role context

**Schema Location**: `tenant_admin` schema

## Schema Reference

```prisma
enum admin_role {
  super_admin
  tenant_admin
  finance_manager
  operations_manager
  staff_manager
  read_only

  @@schema("tenant_admin")
}
```

**PostgreSQL Type**: `tenant_admin.admin_role`
**Database Location**: `tenant_admin` schema (tenant-scoped)
**Mutability**: Immutable (adding values requires migration)

## Values

| Value | Description | Access Level | Can Modify | Common Assignees |
|-------|-------------|--------------|------------|------------------|
| `super_admin` | Platform-level administrator | Full platform access | All entity types | Platform owners, CTO |
| `tenant_admin` | Tenant owner/admin | Full tenant access | Most entity types (not admin_roles) | Business owners, GMs |
| `finance_manager` | Financial reporting access | Finance features | Reports, financial data | CFO, accountants |
| `operations_manager` | Operations oversight | Operations features | Reports, operational data | Ops directors |
| `staff_manager` | Staff management access | HR/staff features | Users, roles, schedules | HR managers |
| `read_only` | View-only access | Read-only all features | None (view only) | Auditors, executives |

## Role Hierarchy

```
          ┌─────────────────┐
          │   super_admin   │  ← Platform level
          └────────┬────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
┌─────────────┐         ┌──────────────┐
│tenant_admin │         │finance_mgr   │  ← Tenant level
└──────┬──────┘         └──────────────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌──────────┐  ┌──────────────┐  ┌───────────┐
│ops_mgr   │  │staff_manager │  │read_only  │  ← Department level
└──────────┘  └──────────────┘  └───────────┘
```

## Role Permissions Matrix

### Entity Type Access

| Entity Type | super_admin | tenant_admin | finance_manager | operations_manager | staff_manager | read_only |
|-------------|-------------|--------------|-----------------|-------------------|---------------|-----------|
| **Admin Entities** |
| `admin_users` | ✅ CRUD | ⚠️ (non-super) | ❌ | ❌ | ❌ | 👁️ |
| `admin_roles` | ✅ CRUD | ❌ | ❌ | ❌ | ❌ | 👁️ |
| `admin_permissions` | ✅ CRUD | ❌ | ❌ | ❌ | ❌ | 👁️ |
| `admin_audit_trail` | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |
| **Staff Entities** |
| `users` | ✅ CRUD | ✅ CRUD | ❌ | ❌ | ✅ CRUD | 👁️ |
| `roles` | ✅ CRUD | ✅ CRUD | ❌ | ❌ | ✅ CRUD | 👁️ |
| **Tenant Entities** |
| `tenants` | ✅ CRUD | ❌ | ❌ | ❌ | ❌ | 👁️ |
| `settings` | ✅ CRUD | ✅ CRUD | ❌ | ⚠️ (ops only) | ❌ | 👁️ |
| **Reports** |
| `reports` | ✅ CRUD | ✅ CRUD | ✅ CRUD (finance) | ✅ CRUD (ops) | ✅ CRUD | 👁️ |

✅ = Full access
⚠️ = Limited access
❌ = No access
👁️ = Read-only

### Action Permissions

| Action | super_admin | tenant_admin | finance_manager | operations_manager | staff_manager | read_only |
|--------|-------------|--------------|-----------------|-------------------|---------------|-----------|
| `login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `create` | ✅ all | ✅ most | ✅ reports | ✅ reports | ✅ users | ❌ |
| `update` | ✅ all | ✅ most | ✅ reports | ✅ reports | ✅ users | ❌ |
| `delete` | ✅ all | ✅ most | ✅ reports | ✅ reports | ✅ users | ❌ |
| `view` | ✅ all | ✅ all | ✅ finance | ✅ ops | ✅ staff | ✅ all |
| `permission_change` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `role_change` | ✅ | ⚠️ (staff) | ❌ | ❌ | ❌ | ❌ |
| `account_change` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `security_change` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Business Rules

1. **Role Assignment**:
   - Only `super_admin` can assign `tenant_admin` role
   - `tenant_admin` can assign department manager roles
   - Users can only assign roles at or below their own level

2. **Privilege Escalation Prevention**:
   - Cannot modify your own role (requires peer/superior)
   - Cannot grant permissions you don't possess
   - Role changes logged and alerted

3. **Tenant Isolation**:
   - `super_admin` has cross-tenant access
   - All other roles restricted to their tenant
   - `tenant_admin` is highest role within tenant

4. **Read-Only Behavior**:
   - `read_only` role can view all reports and data
   - Cannot perform any write operations (blocked at application layer)
   - Cannot modify permissions, roles, or settings

## Usage in admin_users Model

```typescript
import { admin_role } from '@repo/database/generated'

// Create super admin (platform level)
await database.adminUsers.create({
  data: {
    tenantId: platformTenantId,
    userId: userId,
    role: admin_role.super_admin,
    permissions: {
      create: [
        { entityType: 'admin_users', canCreate: true, canUpdate: true, canDelete: true },
        { entityType: 'admin_roles', canCreate: true, canUpdate: true, canDelete: true },
        // ... all entity types
      ]
    }
  }
})

// Create tenant admin
await database.adminUsers.create({
  data: {
    tenantId,
    userId: userId,
    role: admin_role.tenant_admin,
    permissions: {
      create: [
        { entityType: 'users', canCreate: true, canUpdate: true, canDelete: true },
        { entityType: 'reports', canCreate: true, canUpdate: true, canDelete: true },
        { entityType: 'settings', canCreate: true, canUpdate: true, canDelete: false },
        // ... but NOT admin_roles
      ]
    }
  }
})

// Create finance manager
await database.adminUsers.create({
  data: {
    tenantId,
    userId: userId,
    role: admin_role.finance_manager,
    permissions: {
      create: [
        { entityType: 'reports', canCreate: true, canUpdate: true, canDelete: true },
        // ... only finance-related entities
      ]
    }
  }
})

// Create read-only user
await database.adminUsers.create({
  data: {
    tenantId,
    userId: userId,
    role: admin_role.read_only,
    permissions: {
      create: [
        { entityType: 'reports', canCreate: false, canUpdate: false, canDelete: false, canView: true },
        { entityType: 'users', canCreate: false, canUpdate: false, canDelete: false, canView: true },
        // ... all entities set to view-only
      ]
    }
  }
})
```

## Common Queries

### Get all admins by role
```typescript
const tenantAdmins = await database.adminUsers.findMany({
  where: {
    tenantId,
    role: admin_role.tenant_admin
  },
  include: {
    user: {
      select: { name: true, email: true }
    }
  }
})
```

### Check if user has specific permission
```typescript
const adminUser = await database.adminUsers.findUnique({
  where: { id: adminUserId },
  include: {
    permissions: {
      where: {
        entityType: 'users',
        canDelete: true
      }
    }
  }
})

const canDeleteUsers = adminUser.permissions.length > 0
```

### Get role hierarchy for display
```typescript
const roleOrder = [
  admin_role.super_admin,
  admin_role.tenant_admin,
  admin_role.finance_manager,
  admin_role.operations_manager,
  admin_role.staff_manager,
  admin_role.read_only
]

const roleHierarchy = roleOrder.map((role, index) => ({
  role,
  level: index,
  displayName: role.replace('_', ' ').toUpperCase()
}))
```

## Role-Based Feature Access

### super_admin
- All tenant management features
- Admin user/role management (all levels)
- Platform settings and configuration
- Cross-tenant reporting
- Security settings

### tenant_admin
- Tenant settings and configuration
- Admin user management (department-level only)
- All operational reports
- Staff user management
- Role assignment (department-level only)

### finance_manager
- Financial reports and dashboards
- Budget and billing management
- Revenue and expense tracking
- Export financial data
- View-only access to operations

### operations_manager
- Operational reports and dashboards
- Inventory and production metrics
- Kitchen and event performance
- Staff scheduling oversight
- View-only access to finance

### staff_manager
- Staff user management (create, update, delete)
- Role assignment (staff roles only)
- Scheduling and timekeeping oversight
- Staff performance reports
- View-only access to other modules

### read_only
- View all reports and dashboards
- Export data (with watermark)
- No write permissions
- Audit trail access

## Related Enums

- **[admin_action](./admin_action.md)** - Actions available to roles
- **[admin_entity_type](./admin_entity_type.md)** - Entities roles can access

## Related Tables

- **[admin_users](../tables/tenant_admin/admin_users.md)** - Admin user accounts
- **[admin_permissions](../tables/tenant_admin/admin_permissions.md)** - Role permissions
- Schema: [`tenant_admin`](../schemas/03-tenant_admin.md)

## See Also

- Security: Role-based access control (RBAC)
- Compliance: Principle of least privilege
