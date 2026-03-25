/**
 * Permission Guard for Manifest Command Execution
 *
 * Provides integration between the permission checker and Manifest RuntimeEngine.
 * Intercepts command execution to verify the user has permission to execute
 * specific manifest commands.
 *
 * @packageDocumentation
 */
import { getPermissionsForRole, hasPermission, permissionCache, toRolePolicyData, } from "./permission-checker.js";
// ---------------------------------------------------------------------------
// Permission Mapping
// ---------------------------------------------------------------------------
/**
 * Map of manifest commands to permissions
 * Format: "Entity.command" -> "permission"
 *
 * Examples:
 *   "Event.create" -> "events.create"
 *   "PrepTask.claim" -> "prep_tasks.claim"
 *   "User.updateRole" -> "users.manage_roles"
 */
export const COMMAND_PERMISSION_MAP = {
    // Events
    "Event.create": "events.create",
    "Event.update": "events.update",
    "Event.delete": "events.delete",
    // Clients
    "Client.create": "clients.create",
    "Client.update": "clients.update",
    "Client.delete": "clients.delete",
    // Users
    "User.create": "users.create",
    "User.update": "users.update",
    "User.updateRole": "users.manage_roles",
    "User.deactivate": "users.delete",
    "User.terminate": "users.delete",
    // Inventory
    "InventoryItem.create": "inventory.create",
    "InventoryItem.update": "inventory.update",
    "InventoryItem.delete": "inventory.delete",
    "InventoryItem.adjust": "inventory.adjust",
    // Kitchen
    "Dish.create": "kitchen.create",
    "Dish.update": "kitchen.update",
    "Recipe.create": "recipes.create",
    "Recipe.update": "recipes.update",
    "Recipe.scale": "recipes.scale",
    // Prep Tasks
    "PrepTask.create": "prep_tasks.create",
    "PrepTask.update": "prep_tasks.update",
    "PrepTask.claim": "prep_tasks.claim",
    "PrepTask.delete": "prep_tasks.delete",
    // Settings
    "RolePolicy.update": "settings.manage",
    "RolePolicy.grant": "settings.manage",
    "RolePolicy.revoke": "settings.manage",
};
/**
 * Commands that require AI approval permission
 */
export const AI_APPROVAL_COMMANDS = new Set([
    // Commands that might be executed by AI agents
    "Event.create",
    "Event.update",
    "Menu.generate",
    "Schedule.optimize",
]);
// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------
export class PermissionDeniedError extends Error {
    commandName;
    entityName;
    userRole;
    requiredPermission;
    constructor(commandName, entityName, userRole, requiredPermission) {
        super(`Permission denied: Role '${userRole}' cannot execute '${commandName}'` +
            (entityName ? ` on entity '${entityName}'` : "") +
            `. Required permission: '${requiredPermission}'`);
        this.commandName = commandName;
        this.entityName = entityName;
        this.userRole = userRole;
        this.requiredPermission = requiredPermission;
        this.name = "PermissionDeniedError";
    }
}
export class AIApprovalRequiredError extends Error {
    commandName;
    entityName;
    constructor(commandName, entityName) {
        super(`AI approval required: Command '${commandName}'` +
            (entityName ? ` on entity '${entityName}'` : "") +
            ` requires 'settings.ai_approve' permission`);
        this.commandName = commandName;
        this.entityName = entityName;
        this.name = "AIApprovalRequiredError";
    }
}
// ---------------------------------------------------------------------------
// Permission Guard
// ---------------------------------------------------------------------------
/**
 * Create a permission guard that wraps a RuntimeEngine
 *
 * The guard checks permissions before executing commands and can be used
 * to enforce RBAC policies at the manifest layer.
 */
export function createPermissionGuard(runtime, options = {}) {
    const { enforce = true, commandPermissionMap = COMMAND_PERMISSION_MAP, rolePolicies = [], } = options;
    return new Proxy(runtime, {
        get(target, prop) {
            // Intercept runCommand calls
            if (prop === "runCommand") {
                return async (commandName, input, options = {}) => {
                    // Get user context
                    const context = target.getContext();
                    const user = context.user;
                    if (!(enforce && user?.role)) {
                        // No enforcement or no role info, proceed with original runtime
                        return target.runCommand(commandName, input, options);
                    }
                    // Check if this command requires permission
                    const commandKey = options.entityName
                        ? `${options.entityName}.${commandName}`
                        : commandName;
                    const requiredPermission = commandPermissionMap[commandKey];
                    if (!(requiredPermission || commandKey.startsWith("*"))) {
                        // No specific permission required, allow execution
                        return target.runCommand(commandName, input, options);
                    }
                    // Check AI approval requirement
                    if (AI_APPROVAL_COMMANDS.has(commandKey) &&
                        !hasPermission({
                            userRole: user.role,
                            permission: "settings.ai_approve",
                            rolePolicies,
                        })) {
                        return {
                            success: false,
                            error: new AIApprovalRequiredError(commandName, options.entityName).message,
                            emittedEvents: [],
                        };
                    }
                    // Check permission
                    if (requiredPermission &&
                        !hasPermission({
                            userRole: user.role,
                            permission: requiredPermission,
                            rolePolicies,
                        })) {
                        return {
                            success: false,
                            error: new PermissionDeniedError(commandName, options.entityName, user.role, requiredPermission).message,
                            emittedEvents: [],
                        };
                    }
                    // Permission granted, proceed with command execution
                    return target.runCommand(commandName, input, options);
                };
            }
            // Pass through all other properties/methods
            const value = target[prop];
            if (typeof value === "function") {
                return value.bind(target);
            }
            return value;
        },
    });
}
// ---------------------------------------------------------------------------
// Permission Loader
// ---------------------------------------------------------------------------
/**
 * Load role policies from Prisma for a tenant
 *
 * This function should be called when setting up the runtime
 * to provide fresh permission data.
 */
export async function loadRolePolicies(prisma, tenantId) {
    // Check cache first
    const cached = permissionCache.get(tenantId);
    if (cached) {
        return cached;
    }
    // Load from database
    const records = await prisma.rolePolicy.findMany({
        where: {
            tenantId,
            deletedAt: null,
            isActive: true,
        },
        select: {
            roleId: true,
            roleName: true,
            permissions: true,
            isActive: true,
        },
    });
    const policies = toRolePolicyData(records);
    // Cache the result
    permissionCache.set(tenantId, policies);
    return policies;
}
/**
 * Invalidate permission cache for a tenant
 *
 * Call this after updating role policies to ensure fresh data is loaded.
 */
export function invalidatePermissionCache(tenantId) {
    permissionCache.clear(tenantId);
}
// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
/**
 * Check if a user has permission to execute a specific command
 *
 * This is a standalone helper that can be used outside of the runtime
 * for UI permission checks and API route guards.
 */
export function canExecuteCommand(userRole, commandName, entityName, commandPermissionMap = COMMAND_PERMISSION_MAP, rolePolicies = []) {
    const commandKey = entityName ? `${entityName}.${commandName}` : commandName;
    const requiredPermission = commandPermissionMap[commandKey];
    // No specific permission required
    if (!requiredPermission) {
        return true;
    }
    return hasPermission({
        userRole,
        permission: requiredPermission,
        rolePolicies,
    });
}
/**
 * Get all permissions for a user role
 *
 * Combines default permissions with custom role policy permissions.
 */
export function getUserPermissions(userRole, rolePolicies = []) {
    return getPermissionsForRole({ userRole, rolePolicies });
}
/**
 * Filter commands that a user is allowed to execute
 *
 * Useful for UI components that need to show/hide command buttons.
 */
export function filterAuthorizedCommands(userRole, commands, rolePolicies = []) {
    return commands.filter((cmd) => canExecuteCommand(userRole, cmd.name, cmd.entity, COMMAND_PERMISSION_MAP, rolePolicies));
}
