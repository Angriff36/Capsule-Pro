/**
 * Permission Guard for Manifest Command Execution
 *
 * Provides integration between the permission checker and Manifest RuntimeEngine.
 * Intercepts command execution to verify the user has permission to execute
 * specific manifest commands.
 *
 * @packageDocumentation
 */
import type { RuntimeEngine } from "@angriff36/manifest";
import { type Permission, type RolePolicyData } from "./permission-checker.js";
/**
 * Map of manifest commands to permissions
 * Format: "Entity.command" -> "permission"
 *
 * Examples:
 *   "Event.create" -> "events.create"
 *   "PrepTask.claim" -> "prep_tasks.claim"
 *   "User.updateRole" -> "users.manage_roles"
 */
export declare const COMMAND_PERMISSION_MAP: Record<string, Permission>;
/**
 * Commands that require AI approval permission
 */
export declare const AI_APPROVAL_COMMANDS: Set<string>;
export interface PermissionGuardOptions {
    /** Whether to enforce permission checks (default: true) */
    enforce?: boolean;
    /** Custom command to permission mapping */
    commandPermissionMap?: Record<string, Permission>;
    /** Pre-loaded role policies (skips DB lookup if provided) */
    rolePolicies?: RolePolicyData[];
}
export declare class PermissionDeniedError extends Error {
    commandName: string;
    entityName: string | undefined;
    userRole: string;
    requiredPermission: Permission;
    constructor(commandName: string, entityName: string | undefined, userRole: string, requiredPermission: Permission);
}
export declare class AIApprovalRequiredError extends Error {
    commandName: string;
    entityName: string | undefined;
    constructor(commandName: string, entityName: string | undefined);
}
/**
 * Create a permission guard that wraps a RuntimeEngine
 *
 * The guard checks permissions before executing commands and can be used
 * to enforce RBAC policies at the manifest layer.
 */
export declare function createPermissionGuard(runtime: RuntimeEngine, options?: PermissionGuardOptions): RuntimeEngine;
/**
 * Load role policies from Prisma for a tenant
 *
 * This function should be called when setting up the runtime
 * to provide fresh permission data.
 */
export declare function loadRolePolicies(prisma: {
    rolePolicy: {
        findMany: (...args: unknown[]) => Promise<Array<{
            roleId: string;
            roleName: string;
            permissions: unknown;
            isActive: boolean;
        }>>;
    };
}, tenantId: string): Promise<RolePolicyData[]>;
/**
 * Invalidate permission cache for a tenant
 *
 * Call this after updating role policies to ensure fresh data is loaded.
 */
export declare function invalidatePermissionCache(tenantId?: string): void;
/**
 * Check if a user has permission to execute a specific command
 *
 * This is a standalone helper that can be used outside of the runtime
 * for UI permission checks and API route guards.
 */
export declare function canExecuteCommand(userRole: string, commandName: string, entityName: string | undefined, commandPermissionMap?: Record<string, Permission>, rolePolicies?: RolePolicyData[]): boolean;
/**
 * Get all permissions for a user role
 *
 * Combines default permissions with custom role policy permissions.
 */
export declare function getUserPermissions(userRole: string, rolePolicies?: RolePolicyData[]): Permission[];
/**
 * Filter commands that a user is allowed to execute
 *
 * Useful for UI components that need to show/hide command buttons.
 */
export declare function filterAuthorizedCommands(userRole: string, commands: Array<{
    name: string;
    entity?: string;
}>, rolePolicies?: RolePolicyData[]): Array<{
    name: string;
    entity?: string;
}>;
//# sourceMappingURL=permission-guard.d.ts.map