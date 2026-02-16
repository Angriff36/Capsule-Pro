# UserRole

**Purpose**: Defines the permission level and access rights for users within a tenant

**Schema**: `core`
**PostgreSQL Name**: `user_role` (projected)
**Last Updated**: 2026-01-30

## Values

| Value | Description | Usage Context |
|-------|-------------|---------------|
| `owner` | Tenant owner with full access | Can manage billing, delete account, full control |
| `admin` | Administrative access | Can manage users, settings, most operations |
| `manager` | Management-level access | Can manage operations, reports, limited admin |
| `staff` | Basic user access | Standard employee with limited permissions |

## Business Context

The `UserRole` enum implements role-based access control (RBAC) for the Convoy platform:

### Permission Hierarchy

1. **owner** - Highest权限
   - Full access to all features
   - Billing and subscription management
   - Can delete tenant account
   - Can assign all roles

2. **admin** - Administrative access
   - User and role management
   - System configuration
   - Full operational access
   - Cannot manage billing or delete account

3. **manager** - Operational oversight
   - View and manage operations
   - Access to reports and analytics
   - Limited user management (view only)
   - Cannot modify system settings

4. **staff** - Standard user (default)
   - Basic application access
   - Can perform assigned job functions
   - Limited view of sensitive data
   - Cannot manage other users

## Usage

### In Models

**Note**: Currently defined as enum but stored as String in schema:

```prisma
model User {
  role String @default("staff")  // Should be: role UserRole @default(staff)
}
```

**Planned use**:
- `User.role` - Determines user permissions and access

### Default Values

- `User.role` defaults to `staff` - New users have basic access

## Validation

### Application-Level

- **Required**: All users must have a role
- **Minimum One Owner**: Each tenant must have at least one owner
- **Role Promotion**: Requires higher-privileged user approval
- **Self-Demotion**: Users cannot reduce their own role level

### Database-Level

- **PostgreSQL Enum**: Only defined values allowed (when migrated from String)
- **Default Value**: `staff` for new users
- **Check Constraint**: Should enforce at least one owner per tenant (TODO)

## Migration History

| Date | Migration | Change |
|------|-----------|--------|
| 2026-01-30 | Initial enum creation | Defined as enum in core schema |
| TBD | migrate_user_role_to_enum | Convert User.role from String to UserRole enum |

## Future Changes

- [ ] **URGENT**: Migrate `User.role` from String to UserRole enum
- [ ] Add role-specific permission matrix documentation
- [ ] Consider adding `viewer` role for read-only access
- [ ] Consider adding `guest` role for external collaborators

## Known Issues

⚠️ **Type Mismatch**: UserRole enum exists but is not used in the schema. The `User.role` field is defined as String, not UserRole. This is a **data integrity issue** that should be fixed:

```prisma
// Current (WRONG):
model User {
  role String @default("staff")
}

// Should be:
model User {
  role UserRole @default(staff)
}
```

**Impact**:
- No database-level validation of role values
- Can store invalid values like "superuser" or "moderator"
- Type safety lost at application layer

**Fix Required**:
1. Create migration to alter column type
2. Data migration to ensure all values are valid
3. Update application code to use enum

## Related

- **User Model**: Primary use case for role assignment
- **Authentication**: Roles integrated with Clerk auth
- **Authorization**: Middleware checks role permissions
- **Admin Module**: Admin roles separate from UserRole

## See Also

- [Prisma Schema](../../../packages/database/prisma/schema.prisma) - Line 2709
- [User Documentation](../tables/User.md) - User model documentation
- [Admin Role Documentation](./admin_role.md) - Admin-specific roles
