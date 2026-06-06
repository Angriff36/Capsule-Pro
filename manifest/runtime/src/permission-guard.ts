/**
 * Permission mapping, RBAC errors, and role-policy loading for Manifest
 * command execution.
 *
 * Command-level RBAC enforcement now lives in `createRbacMiddleware`
 * (middleware/rbac-middleware.ts), which runs inside the Manifest engine
 * lifecycle at the `before-guard` hook and consumes `COMMAND_PERMISSION_MAP`,
 * `AI_APPROVAL_COMMANDS`, and the error classes defined here. This module is the
 * shared source of that mapping plus the role-policy loader/cache and the
 * standalone UI/route permission helpers.
 *
 * @packageDocumentation
 */

import {
  getPermissionsForRole,
  hasPermission,
  type Permission,
  permissionCache,
  type RolePolicyData,
  toRolePolicyData,
} from "./permission-checker";

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
export const COMMAND_PERMISSION_MAP: Record<string, Permission> = {
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

  // Payments
  "Payment.process": "payments.process",
  "Payment.refund": "payments.refund",
  "Invoice.applyPayment": "payments.process",
  "Invoice.markAsPaid": "payments.process",

  // Settings
  "RolePolicy.update": "settings.manage",
  "RolePolicy.grant": "settings.manage",
  "RolePolicy.revoke": "settings.manage",
};

/**
 * Commands that require AI approval permission
 */
export const AI_APPROVAL_COMMANDS = new Set<string>([
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
  constructor(
    public commandName: string,
    public entityName: string | undefined,
    public userRole: string,
    public requiredPermission: Permission
  ) {
    super(
      `Permission denied: Role '${userRole}' cannot execute '${commandName}'` +
        (entityName ? ` on entity '${entityName}'` : "") +
        `. Required permission: '${requiredPermission}'`
    );
    this.name = "PermissionDeniedError";
  }
}

export class AIApprovalRequiredError extends Error {
  constructor(
    public commandName: string,
    public entityName: string | undefined
  ) {
    super(
      `AI approval required: Command '${commandName}'` +
        (entityName ? ` on entity '${entityName}'` : "") +
        ` requires 'settings.ai_approve' permission`
    );
    this.name = "AIApprovalRequiredError";
  }
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
export async function loadRolePolicies(
  prisma: {
    rolePolicy: {
      findMany: (...args: unknown[]) => Promise<
        Array<{
          roleId: string;
          roleName: string;
          permissions: unknown;
          isActive: boolean;
        }>
      >;
    };
  },
  tenantId: string
): Promise<RolePolicyData[]> {
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
  } as unknown);

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
export function invalidatePermissionCache(tenantId?: string): void {
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
export function canExecuteCommand(
  userRole: string,
  commandName: string,
  entityName: string | undefined,
  commandPermissionMap: Record<string, Permission> = COMMAND_PERMISSION_MAP,
  rolePolicies: RolePolicyData[] = []
): boolean {
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
export function getUserPermissions(
  userRole: string,
  rolePolicies: RolePolicyData[] = []
): Permission[] {
  return getPermissionsForRole({ userRole, rolePolicies });
}

/**
 * Filter commands that a user is allowed to execute
 *
 * Useful for UI components that need to show/hide command buttons.
 */
export function filterAuthorizedCommands(
  userRole: string,
  commands: Array<{ name: string; entity?: string }>,
  rolePolicies: RolePolicyData[] = []
): Array<{ name: string; entity?: string }> {
  return commands.filter((cmd) =>
    canExecuteCommand(
      userRole,
      cmd.name,
      cmd.entity,
      COMMAND_PERMISSION_MAP,
      rolePolicies
    )
  );
}
