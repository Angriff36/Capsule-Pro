/**
 * RBAC Middleware for Manifest Command Execution
 *
 * Replaces the Proxy-based `createPermissionGuard` with Manifest-native
 * middleware that runs inside the engine lifecycle at the `before-guard` hook.
 *
 * Why middleware instead of Proxy:
 * - Runs INSIDE the Manifest lifecycle (after policies, before guards)
 * - Composable with other middleware (audit, identity, telemetry)
 * - Has access to the full eval context
 * - No nested Proxy chains
 * - Consistent with Manifest's extensibility model
 *
 * @packageDocumentation
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
} from "@angriff36/manifest";
import {
  AI_APPROVAL_COMMANDS,
  COMMAND_PERMISSION_MAP,
  PermissionDeniedError,
  AIApprovalRequiredError,
} from "../permission-guard";
import { hasPermission, type RolePolicyData, type Permission } from "../permission-checker";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface RbacMiddlewareOptions {
  /** Pre-loaded role policies (loaded at factory time) */
  rolePolicies: RolePolicyData[];
  /** Custom command-to-permission mapping (defaults to COMMAND_PERMISSION_MAP) */
  commandPermissionMap?: Record<string, Permission>;
  /** Commands requiring additional AI approval permission */
  aiApprovalCommands?: Set<string>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an RBAC middleware that enforces command-level permissions.
 *
 * Fires at the `before-guard` lifecycle hook — after entity-level policies
 * have been evaluated but before command guards. This means:
 * 1. Entity access control (policies) runs first
 * 2. Command-level authorization (this middleware) runs second
 * 3. Business rule validation (guards) runs third
 *
 * Denied commands are short-circuited with a `CommandResult` indicating failure,
 * identical to the legacy Proxy-based permission guard behavior.
 */
export function createRbacMiddleware(options: RbacMiddlewareOptions): Middleware {
  const {
    rolePolicies,
    commandPermissionMap = COMMAND_PERMISSION_MAP,
    aiApprovalCommands = AI_APPROVAL_COMMANDS,
  } = options;

  return {
    hooks: ["before-guard"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Extract user from the runtime context injected by the factory.
      // The factory resolves the role before engine construction, so
      // ctx.runtimeContext.user always has { id, tenantId, role? }.
      const user = ctx.runtimeContext?.user as
        | { id?: string; tenantId?: string; role?: string }
        | undefined;

      // Bypass: no role information -> allow (same as legacy Proxy).
      // When the factory cannot resolve a role (e.g. system/internal calls),
      // the command proceeds without RBAC checks.
      if (!user?.role) {
        return {};
      }

      // Build the command key used for permission lookup.
      // Format: "Entity.command" or just "command" for unscoped commands.
      const commandKey = ctx.entityName
        ? `${ctx.entityName}.${ctx.command.name}`
        : ctx.command.name;

      // Look up required permission for this command.
      const requiredPermission = commandPermissionMap[commandKey];

      // Bypass: no mapping for this command -> allow by default.
      // Only explicitly mapped commands are gated. This preserves the current
      // allow-by-default behavior for the ~180/189 unmapped entities.
      // (Task 9.9 will tighten this to deny-by-default.)
      if (!requiredPermission && !commandKey.startsWith("*")) {
        return {};
      }

      // Check AI approval requirement.
      // Some commands (e.g. Event.create, Menu.generate) require an additional
      // "settings.ai_approve" permission when executed by AI agents.
      if (
        aiApprovalCommands.has(commandKey) &&
        !hasPermission({
          userRole: user.role,
          permission: "settings.ai_approve",
          rolePolicies,
        })
      ) {
        return {
          shortCircuit: true,
          result: {
            success: false,
            error: new AIApprovalRequiredError(
              ctx.command.name,
              ctx.entityName
            ).message,
            emittedEvents: [],
          } satisfies CommandResult,
        };
      }

      // Check the required permission against user's role policies.
      if (
        requiredPermission &&
        !hasPermission({
          userRole: user.role,
          permission: requiredPermission,
          rolePolicies,
        })
      ) {
        return {
          shortCircuit: true,
          result: {
            success: false,
            error: new PermissionDeniedError(
              ctx.command.name,
              ctx.entityName,
              user.role,
              requiredPermission
            ).message,
            emittedEvents: [],
          } satisfies CommandResult,
        };
      }

      // Permission granted — continue with normal command execution.
      return {};
    },
  };
}
