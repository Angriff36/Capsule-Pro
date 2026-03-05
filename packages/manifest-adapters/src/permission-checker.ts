/**
 * Permission Checker Service for RBAC
 *
 * Provides granular permission checking for roles with inheritance and override support.
 * Integrates with RolePolicy entities to check if a user's role has specific permissions.
 *
 * @packageDocumentation
 */

// Permission format: "<domain>.<entity>.<action>"
// Examples:
//   - "events.create" - can create events
//   - "inventory.read" - can read inventory
//   - "users.update" - can update users
//   - "settings.manage" - can manage settings
//   - "admin.ai_approve" - can approve AI plans

export type Permission = string;

export interface PermissionCheckOptions {
  /** The user's role (e.g., "admin", "manager", "staff", "kitchen_staff") */
  userRole: string;
  /** The permission to check (e.g., "events.create") */
  permission: Permission;
  /** Optional role policy data for direct checking (skips DB lookup) */
  rolePolicies?: RolePolicyData[];
}

export interface RolePolicyData {
  roleId: string;
  roleName: string;
  permissions: Permission[];
  isActive: boolean;
}

/**
 * Default role permissions for built-in roles.
 * These serve as the baseline permissions that can be extended via RolePolicy entities.
 */
const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    // Full access to everything
    "*",
  ],
  manager: [
    "users.read",
    "users.update",
    "events.create",
    "events.read",
    "events.update",
    "events.delete",
    "clients.create",
    "clients.read",
    "clients.update",
    "clients.delete",
    "inventory.read",
    "inventory.update",
    "kitchen.read",
    "kitchen.update",
    "scheduling.read",
    "scheduling.update",
    "reports.read",
    "settings.read",
    "settings.manage",
  ],
  kitchen_lead: [
    "kitchen.create",
    "kitchen.read",
    "kitchen.update",
    "inventory.read",
    "inventory.update",
    "recipes.read",
    "recipes.update",
    "prep_tasks.create",
    "prep_tasks.read",
    "prep_tasks.update",
    "prep_tasks.claim",
  ],
  kitchen_staff: [
    "kitchen.read",
    "inventory.read",
    "recipes.read",
    "prep_tasks.read",
    "prep_tasks.update",
    "prep_tasks.claim",
  ],
  staff: ["events.read", "scheduling.read", "tasks.read", "tasks.update"],
};

/**
 * Permission categories for grouping and UI display
 */
export const PERMISSION_CATEGORIES = {
  events: ["create", "read", "update", "delete", "approve", "cancel"],
  clients: ["create", "read", "update", "delete"],
  users: ["create", "read", "update", "delete", "manage_roles"],
  inventory: ["create", "read", "update", "delete", "adjust"],
  kitchen: ["create", "read", "update", "delete"],
  recipes: ["create", "read", "update", "delete", "scale"],
  prep_tasks: ["create", "read", "update", "delete", "claim"],
  scheduling: ["create", "read", "update", "delete", "publish"],
  reports: ["read", "export"],
  settings: ["read", "manage", "ai_approve"],
  commands: ["execute", "approve"],
} as const;

export type PermissionCategory = keyof typeof PERMISSION_CATEGORIES;
export type PermissionAction =
  (typeof PERMISSION_CATEGORIES)[keyof typeof PERMISSION_CATEGORIES][number];

/**
 * Parse a permission string into its components
 *
 * @example
 * parsePermission("events.create") -> { domain: "events", action: "create", full: "events.create" }
 * parsePermission("inventory.read") -> { domain: "inventory", action: "read", full: "inventory.read" }
 * parsePermission("admin.ai_approve") -> { domain: "admin", action: "ai_approve", full: "admin.ai_approve" }
 */
export function parsePermission(permission: Permission): {
  domain: string;
  action: string;
  full: Permission;
} {
  const parts = permission.split(".");
  if (parts.length < 2) {
    return { domain: "", action: permission, full: permission };
  }
  return {
    domain: parts[0],
    action: parts.slice(1).join("."),
    full: permission,
  };
}

/**
 * Build a permission string from domain and action
 */
export function buildPermission(domain: string, action: string): Permission {
  return `${domain}.${action}`;
}

/**
 * Check if a wildcard permission matches a specific permission
 *
 * @example
 * matchWildcard("*", "events.create") -> true
 * matchWildcard("events.*", "events.create") -> true
 * matchWildcard("events.create", "events.create") -> true
 * matchWildcard("events.delete", "events.create") -> false
 */
export function matchWildcard(
  pattern: Permission,
  permission: Permission
): boolean {
  if (pattern === "*") {
    return true;
  }

  const patternParts = pattern.split(".");
  const permissionParts = permission.split(".");

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    if (patternPart === "*") {
      return true;
    }
    if (permissionParts[i] !== patternPart) {
      return false;
    }
  }

  return patternParts.length === permissionParts.length;
}

/**
 * Check if a role has a specific permission
 *
 * This checks:
 * 1. Wildcard permissions ("*")
 * 2. Exact permission matches
 * 3. Wildcard domain matches (e.g., "events.*" matches "events.create")
 *
 * @param options - Permission check options
 * @returns true if the role has the permission
 */
export function hasPermission(options: PermissionCheckOptions): boolean {
  const { userRole, permission, rolePolicies = [] } = options;

  // Get all permissions for the role (default + custom)
  const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];

  // Find custom permissions from RolePolicy data
  const customPermissions: Permission[] = [];
  for (const policy of rolePolicies) {
    if (policy.roleName === userRole && policy.isActive) {
      customPermissions.push(...policy.permissions);
    }
  }

  const allPermissions = [...defaultPermissions, ...customPermissions];

  // Check for wildcard permission
  for (const p of allPermissions) {
    if (matchWildcard(p, permission)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a role has any of the specified permissions
 *
 * @param options - Permission check options with multiple permissions
 * @returns true if the role has at least one of the permissions
 */
export function hasAnyPermission(
  options: Omit<PermissionCheckOptions, "permission"> & {
    permissions: Permission[];
  }
): boolean {
  return options.permissions.some((permission) =>
    hasPermission({ ...options, permission })
  );
}

/**
 * Check if a role has all of the specified permissions
 *
 * @param options - Permission check options with multiple permissions
 * @returns true if the role has all of the permissions
 */
export function hasAllPermissions(
  options: Omit<PermissionCheckOptions, "permission"> & {
    permissions: Permission[];
  }
): boolean {
  return options.permissions.every((permission) =>
    hasPermission({ ...options, permission })
  );
}

/**
 * Get all permissions for a role
 *
 * Combines default permissions with custom RolePolicy permissions
 */
export function getPermissionsForRole(options: {
  userRole: string;
  rolePolicies?: RolePolicyData[];
}): Permission[] {
  const { userRole, rolePolicies = [] } = options;

  const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
  const customPermissions: Permission[] = [];

  for (const policy of rolePolicies) {
    if (policy.roleName === userRole && policy.isActive) {
      customPermissions.push(...policy.permissions);
    }
  }

  // Dedupe while preserving order
  const seen = new Set<Permission>();
  const result: Permission[] = [];

  for (const perm of [...defaultPermissions, ...customPermissions]) {
    if (!seen.has(perm)) {
      seen.add(perm);
      result.push(perm);
    }
  }

  return result;
}

/**
 * Filter a list of permissions to only include those the role has
 *
 * @returns Array of permissions that the role possesses
 */
export function filterAuthorizedPermissions(options: {
  userRole: string;
  permissions: Permission[];
  rolePolicies?: RolePolicyData[];
}): Permission[] {
  const { userRole, permissions, rolePolicies } = options;
  return permissions.filter((permission) =>
    hasPermission({ userRole, permission, rolePolicies })
  );
}

/**
 * Get available permissions for UI display
 *
 * Returns a structured list of all available permissions organized by category
 */
export function getAvailablePermissions(): Record<
  PermissionCategory,
  { action: PermissionAction; permission: Permission; description: string }[]
> {
  const result: Record<
    PermissionCategory,
    { action: PermissionAction; permission: Permission; description: string }[]
  > = {} as any;

  for (const [category, actions] of Object.entries(PERMISSION_CATEGORIES)) {
    result[category as PermissionCategory] = actions.map((action) => ({
      action: action as PermissionAction,
      permission: buildPermission(category, action),
      description: `${category.charAt(0).toUpperCase() + category.slice(1)}: ${action}`,
    }));
  }

  return result;
}

/**
 * Permission cache for storing loaded role policies
 * In-memory cache with TTL for performance
 */
class PermissionCache {
  private cache = new Map<
    string,
    { data: RolePolicyData[]; expiresAt: number }
  >();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  set(tenantId: string, data: RolePolicyData[]): void {
    this.cache.set(tenantId, {
      data,
      expiresAt: Date.now() + this.TTL_MS,
    });
  }

  get(tenantId: string): RolePolicyData[] | null {
    const entry = this.cache.get(tenantId);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(tenantId);
      return null;
    }

    return entry.data;
  }

  clear(tenantId?: string): void {
    if (tenantId) {
      this.cache.delete(tenantId);
    } else {
      this.cache.clear();
    }
  }
}

export const permissionCache = new PermissionCache();

/**
 * Convert Prisma RolePolicy records to RolePolicyData format
 */
export function toRolePolicyData(
  records: Array<{
    roleId: string;
    roleName: string;
    permissions: unknown;
    isActive: boolean;
  }>
): RolePolicyData[] {
  return records.map((record) => ({
    roleId: record.roleId,
    roleName: record.roleName,
    permissions: parseJsonPermissions(record.permissions),
    isActive: record.isActive,
  }));
}

/**
 * Safely parse JSON permissions
 */
function parseJsonPermissions(value: unknown): Permission[] {
  if (Array.isArray(value)) {
    return value as Permission[];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON, return empty array
    }
  }

  return [];
}
