/**
 * Permission Checker Service for RBAC
 *
 * Provides granular permission checking for roles with inheritance and override support.
 * Integrates with RolePolicy entities to check if a user's role has specific permissions.
 *
 * @packageDocumentation
 */
/**
 * Default role permissions for built-in roles.
 * These serve as the baseline permissions that can be extended via RolePolicy entities.
 */
const DEFAULT_ROLE_PERMISSIONS = {
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
};
/**
 * Parse a permission string into its components
 *
 * @example
 * parsePermission("events.create") -> { domain: "events", action: "create", full: "events.create" }
 * parsePermission("inventory.read") -> { domain: "inventory", action: "read", full: "inventory.read" }
 * parsePermission("admin.ai_approve") -> { domain: "admin", action: "ai_approve", full: "admin.ai_approve" }
 */
export function parsePermission(permission) {
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
export function buildPermission(domain, action) {
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
export function matchWildcard(pattern, permission) {
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
export function hasPermission(options) {
    const { userRole, permission, rolePolicies = [] } = options;
    // Get all permissions for the role (default + custom)
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
    // Find custom permissions from RolePolicy data
    const customPermissions = [];
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
export function hasAnyPermission(options) {
    return options.permissions.some((permission) => hasPermission({ ...options, permission }));
}
/**
 * Check if a role has all of the specified permissions
 *
 * @param options - Permission check options with multiple permissions
 * @returns true if the role has all of the permissions
 */
export function hasAllPermissions(options) {
    return options.permissions.every((permission) => hasPermission({ ...options, permission }));
}
/**
 * Get all permissions for a role
 *
 * Combines default permissions with custom RolePolicy permissions
 */
export function getPermissionsForRole(options) {
    const { userRole, rolePolicies = [] } = options;
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
    const customPermissions = [];
    for (const policy of rolePolicies) {
        if (policy.roleName === userRole && policy.isActive) {
            customPermissions.push(...policy.permissions);
        }
    }
    // Dedupe while preserving order
    const seen = new Set();
    const result = [];
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
export function filterAuthorizedPermissions(options) {
    const { userRole, permissions, rolePolicies } = options;
    return permissions.filter((permission) => hasPermission({ userRole, permission, rolePolicies }));
}
/**
 * Get available permissions for UI display
 *
 * Returns a structured list of all available permissions organized by category
 */
export function getAvailablePermissions() {
    const result = {};
    for (const [category, actions] of Object.entries(PERMISSION_CATEGORIES)) {
        result[category] = actions.map((action) => ({
            action: action,
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
    cache = new Map();
    TTL_MS = 5 * 60 * 1000; // 5 minutes
    set(tenantId, data) {
        this.cache.set(tenantId, {
            data,
            expiresAt: Date.now() + this.TTL_MS,
        });
    }
    get(tenantId) {
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
    clear(tenantId) {
        if (tenantId) {
            this.cache.delete(tenantId);
        }
        else {
            this.cache.clear();
        }
    }
}
export const permissionCache = new PermissionCache();
/**
 * Convert Prisma RolePolicy records to RolePolicyData format
 */
export function toRolePolicyData(records) {
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
function parseJsonPermissions(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
        catch {
            // Invalid JSON, return empty array
        }
    }
    return [];
}
