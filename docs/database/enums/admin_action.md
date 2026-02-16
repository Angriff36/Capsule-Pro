# admin_action

> **First documented**: 2025-01-30
> **Last updated**: 2025-01-30
> **Last verified by**: spec-executor (T032)
> **Verification status**: ✅ Verified

## Overview

Defines the types of administrative actions performed by admin users, tracked in the admin audit trail for security and compliance purposes.

**Business Context**: Admin operations require comprehensive audit logging to track who did what, when, and to which entities. This enum categorizes all auditable admin actions.

**Key Use Cases**:
- Audit trail for security investigations
- Compliance reporting (SOC 2, HIPAA, etc.)
- Troubleshooting admin issues
- Analytics on admin activity patterns
- Alerting on suspicious admin actions

**Schema Location**: `tenant_admin` schema

## Schema Reference

```prisma
enum admin_action {
  login
  logout
  create
  update
  delete
  view
  permission_change
  role_change
  account_change
  security_change

  @@schema("tenant_admin")
}
```

**PostgreSQL Type**: `tenant_admin.admin_action`
**Database Location**: `tenant_admin` schema (tenant-scoped)
**Mutability**: Immutable (adding values requires migration)

## Values

| Value | Description | Example Use | Alert Level |
|-------|-------------|-------------|-------------|
| `login` | User authenticated to admin panel | Admin user logged in | Low |
| `logout` | User logged out of admin panel | Admin user logged out | Low |
| `create` | Created a new entity | Created new report, workflow, notification | Low |
| `update` | Modified existing entity | Updated report schedule, workflow steps | Low |
| `delete` | Deleted an entity | Deleted report, workflow, notification | Medium |
| `view` | Viewed sensitive data | Accessed admin audit trail, permissions | Low |
| `permission_change` | Modified permissions | Granted/revoked admin permissions | High |
| `role_change` | Modified user roles | Changed admin role for user | High |
| `account_change` | Modified account settings | Changed tier, limits, metadata | High |
| `security_change` | Modified security settings | Changed password policy, 2FA settings | Critical |

## Business Rules

1. **All Actions Logged**: Every admin action creates `admin_audit_trail` record
2. **Context Captured**:
   - Who: `adminUserId` (performed the action)
   - What: `action` (enum value)
   - Where: `entityType` (what was affected)
   - Which: `entityId` (specific record affected)
   - When: `createdAt` timestamp
   - Details: `changes` JSON (before/after for updates)

3. **Alert Thresholds**:
   - **Critical alerts**: `security_change` actions trigger immediate alerts
   - **High alerts**: `permission_change`, `role_change`, `account_change` trigger notifications
   - **Medium alerts**: `delete` actions on important entities
   - **Low alerts**: All other actions logged for audit

4. **Retention**: Audit records retained for 1+ year (compliance requirement)

## Usage in admin_audit_trail Model

```typescript
import { admin_action, admin_entity_type } from '@repo/database/generated'

// Log admin login
await database.adminAuditTrail.create({
  data: {
    tenantId,
    adminUserId: userId,
    action: admin_action.login,
    entityType: null,
    entityId: null,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent']
  }
})

// Log role change (high alert)
await database.adminAuditTrail.create({
  data: {
    tenantId,
    adminUserId: adminId,
    action: admin_action.role_change,
    entityType: admin_entity_type.admin_users,
    entityId: targetUserId,
    changes: {
      before: { role: 'staff_manager' },
      after: { role: 'tenant_admin' }
    }
  }
})

// Log security change (critical alert)
await database.adminAuditTrail.create({
  data: {
    tenantId,
    adminUserId: superadminId,
    action: admin_action.security_change,
    entityType: admin_entity_type.tenants,
    entityId: accountId,
    changes: {
      setting: 'two_factor_required',
      before: false,
      after: true
    }
  }
})

// Log deleted report (medium alert)
await database.adminAuditTrail.create({
  data: {
    tenantId,
    adminUserId: adminId,
    action: admin_action.delete,
    entityType: admin_entity_type.reports,
    entityId: reportId,
    changes: {
      reportName: 'Monthly Revenue Report',
      deletedAt: new Date()
    }
  }
})
```

## Common Queries

### Get recent critical security events
```typescript
const criticalEvents = await database.adminAuditTrail.findMany({
  where: {
    tenantId,
    action: admin_action.security_change
  },
  include: {
    adminUser: {
      select: { email: true, name: true }
    }
  },
  orderBy: { createdAt: 'desc' },
  take: 50
})
```

### Audit trail for specific entity
```typescript
const entityHistory = await database.adminAuditTrail.findMany({
  where: {
    tenantId,
    entityType: admin_entity_type.admin_users,
    entityId: targetUserId
  },
  orderBy: { createdAt: 'asc' }
})
```

### Alert on suspicious activity (multiple permission changes)
```typescript
const recentPermissionChanges = await database.adminAuditTrail.count({
  where: {
    tenantId,
    action: admin_action.permission_change,
    createdAt: {
      gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 min
    }
  }
})

if (recentPermissionChanges > 10) {
  alertSecurityTeam(`Unusual permission activity: ${recentPermissionChanges} changes in 15 min`)
}
```

### Compliance reporting (all admin actions in date range)
```typescript
const complianceReport = await database.adminAuditTrail.findMany({
  where: {
    tenantId,
    createdAt: {
      gte: reportingPeriodStart,
      lte: reportingPeriodEnd
    }
  },
  include: {
    adminUser: {
      select: { email: true }
    }
  },
  orderBy: [{ createdAt: 'asc' }]
})
```

## Alert Examples

### Critical Alert: Security Change
```typescript
if (action === admin_action.security_change) {
  await sendAlert({
    level: 'critical',
    title: 'Security Setting Modified',
    message: `${adminUser.email} changed security settings for ${entityType}:${entityId}`,
    actionRequired: true
  })
}
```

### High Alert: Role Change
```typescript
if (action === admin_action.role_change) {
  await notifyTeam({
    level: 'high',
    title: 'Admin Role Modified',
    message: `${adminUser.email} changed role for user ${entityId}`
  })
}
```

## Related Enums

- **[admin_entity_type](./admin_entity_type.md)** - Entity types affected by actions
- **[admin_role](./admin_role.md)** - Admin role levels

## Related Tables

- **[admin_audit_trail](../tables/tenant_admin/admin_audit_trail.md)** - Audit log storage
- **[admin_users](../tables/tenant_admin/admin_users.md)** - Admin user accounts
- Schema: [`tenant_admin`](../schemas/03-tenant_admin.md)

## See Also

- Compliance: SOC 2 audit trail requirements
- Security: Admin activity monitoring
- Integration: Alert system integration
