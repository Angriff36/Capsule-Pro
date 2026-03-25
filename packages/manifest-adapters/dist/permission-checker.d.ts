/**
 * Permission Checker Service for RBAC
 *
 * Provides granular permission checking for roles with inheritance and override support.
 * Integrates with RolePolicy entities to check if a user's role has specific permissions.
 *
 * @packageDocumentation
 */
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
 * Permission categories for grouping and UI display
 */
export declare const PERMISSION_CATEGORIES: {
    readonly events: readonly ["create", "read", "update", "delete", "approve", "cancel"];
    readonly clients: readonly ["create", "read", "update", "delete"];
    readonly users: readonly ["create", "read", "update", "delete", "manage_roles"];
    readonly inventory: readonly ["create", "read", "update", "delete", "adjust"];
    readonly kitchen: readonly ["create", "read", "update", "delete"];
    readonly recipes: readonly ["create", "read", "update", "delete", "scale"];
    readonly prep_tasks: readonly ["create", "read", "update", "delete", "claim"];
    readonly scheduling: readonly ["create", "read", "update", "delete", "publish"];
    readonly reports: readonly ["read", "export"];
    readonly settings: readonly ["read", "manage", "ai_approve"];
    readonly commands: readonly ["execute", "approve"];
};
export type PermissionCategory = keyof typeof PERMISSION_CATEGORIES;
export type PermissionAction = (typeof PERMISSION_CATEGORIES)[keyof typeof PERMISSION_CATEGORIES][number];
/**
 * Parse a permission string into its components
 *
 * @example
 * parsePermission("events.create") -> { domain: "events", action: "create", full: "events.create" }
 * parsePermission("inventory.read") -> { domain: "inventory", action: "read", full: "inventory.read" }
 * parsePermission("admin.ai_approve") -> { domain: "admin", action: "ai_approve", full: "admin.ai_approve" }
 */
export declare function parsePermission(permission: Permission): {
    domain: string;
    action: string;
    full: Permission;
};
/**
 * Build a permission string from domain and action
 */
export declare function buildPermission(domain: string, action: string): Permission;
/**
 * Check if a wildcard permission matches a specific permission
 *
 * @example
 * matchWildcard("*", "events.create") -> true
 * matchWildcard("events.*", "events.create") -> true
 * matchWildcard("events.create", "events.create") -> true
 * matchWildcard("events.delete", "events.create") -> false
 */
export declare function matchWildcard(pattern: Permission, permission: Permission): boolean;
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
export declare function hasPermission(options: PermissionCheckOptions): boolean;
/**
 * Check if a role has any of the specified permissions
 *
 * @param options - Permission check options with multiple permissions
 * @returns true if the role has at least one of the permissions
 */
export declare function hasAnyPermission(options: Omit<PermissionCheckOptions, "permission"> & {
    permissions: Permission[];
}): boolean;
/**
 * Check if a role has all of the specified permissions
 *
 * @param options - Permission check options with multiple permissions
 * @returns true if the role has all of the permissions
 */
export declare function hasAllPermissions(options: Omit<PermissionCheckOptions, "permission"> & {
    permissions: Permission[];
}): boolean;
/**
 * Get all permissions for a role
 *
 * Combines default permissions with custom RolePolicy permissions
 */
export declare function getPermissionsForRole(options: {
    userRole: string;
    rolePolicies?: RolePolicyData[];
}): Permission[];
/**
 * Filter a list of permissions to only include those the role has
 *
 * @returns Array of permissions that the role possesses
 */
export declare function filterAuthorizedPermissions(options: {
    userRole: string;
    permissions: Permission[];
    rolePolicies?: RolePolicyData[];
}): Permission[];
/**
 * Get available permissions for UI display
 *
 * Returns a structured list of all available permissions organized by category
 */
export declare function getAvailablePermissions(): Record<PermissionCategory, {
    action: PermissionAction;
    permission: Permission;
    description: string;
}[]>;
/**
 * Permission cache for storing loaded role policies
 * In-memory cache with TTL for performance
 */
declare class PermissionCache {
    private cache;
    private readonly TTL_MS;
    set(tenantId: string, data: RolePolicyData[]): void;
    get(tenantId: string): RolePolicyData[] | null;
    clear(tenantId?: string): void;
}
export declare const permissionCache: PermissionCache;
/**
 * Convert Prisma RolePolicy records to RolePolicyData format
 */
export declare function toRolePolicyData(records: Array<{
    roleId: string;
    roleName: string;
    permissions: unknown;
    isActive: boolean;
}>): RolePolicyData[];
export {};
//# sourceMappingURL=permission-checker.d.ts.map