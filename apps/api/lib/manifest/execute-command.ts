/**
 * Shared lower-level manifest command executor.
 *
 * This module provides `runManifestCommand` — the single function that
 * validates a (entity, command) pair against the canonical merged command
 * registry, resolves kebab-case URL command slugs to camelCase Manifest
 * command names, creates a Manifest runtime, executes the command, and
 * returns a normalized Response.
 *
 * Callers (the dynamic dispatcher, domain REST adapters) must already be
 * authenticated — this helper does NOT resolve auth/tenant.  It accepts
 * pre-resolved user context directly.
 *
 * All mutations MUST flow through this helper (or the higher-level
 * executeManifestCommand handler) to enforce manifest invariants.
 * Direct Prisma writes bypass guards, policies, and event emission.
 *
 * @packageDocumentation
 */

import { captureException } from "@sentry/nextjs";
import { resolveCommand } from "@/lib/manifest/command-resolver";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal user shape that runManifestCommand requires. */
export interface ManifestUserContext {
  id: string;
  tenantId: string;
  role: string;
}

/** Parameters for runManifestCommand. */
export interface RunManifestCommandParams {
  /** Manifest entity name (e.g. "PrepTask", "Event"). */
  entity: string;
  /** Manifest command name or kebab-case URL slug (e.g. "create", "soft-delete"). */
  command: string;
  /** Command payload — the body passed to the command handler. */
  body: Record<string, unknown>;
  /** Pre-resolved user context (auth + tenant already resolved). */
  user: ManifestUserContext;
  /**
   * Optional instance ID for non-create commands.
   * The runtime uses it as instanceId so it targets the correct entity.
   */
  instanceId?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a Manifest command through the runtime engine.
 *
 * This is the canonical codepath for server-side command execution
 * when auth/tenant resolution has already been performed by the caller.
 * It:
 *
 * 1. Resolves the command slug (exact or kebab→camel) against the merged registry.
 * 2. Builds a Manifest runtime with the supplied user context.
 * 3. Calls {@link RuntimeEngine.runCommand} with the canonical command name.
 * 4. Returns a normalized JSON Response (success or error).
 *
 * @example
 * ```typescript
 * // In the dynamic dispatcher:
 * const currentUser = await requireCurrentUser();
 * const body = await request.json();
 * return runManifestCommand({
 *   entity: "PrepTask",
 *   command: "claim",
 *   body,
 *   user: { id: currentUser.id, tenantId: currentUser.tenantId, role: currentUser.role },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // In a domain REST adapter (auth already done):
 * export async function DELETE(request, { params }) {
 *   const currentUser = await requireCurrentUser();
 *   const { id } = await params;
 *   return runManifestCommand({
 *     entity: "RateLimitConfig",
 *     command: "softDelete",
 *     body: { id },
 *     user: { id: currentUser.id, tenantId: currentUser.tenantId, role: currentUser.role },
 *     instanceId: id,
 *   });
 * }
 * ```
 */
export async function runManifestCommand(
  params: RunManifestCommandParams
): Promise<Response> {
  const { entity, command: commandSlug, body, user, instanceId } = params;

  try {
    // 1. Resolve command slug → canonical camelCase command name
    const resolved = resolveCommand(entity, commandSlug);
    if (!resolved) {
      return manifestErrorResponse(
        `Unknown command: ${entity}.${commandSlug}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    const command = resolved.command;

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      slug: commandSlug,
      userId: user.id,
      userRole: user.role,
      tenantId: user.tenantId,
      bodyKeys: Object.keys(body),
    });

    // 2. Create runtime
    const runtime = await createManifestRuntime({
      user: {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
      entityName: entity,
    });

    // 3. Execute command with resolved canonical name
    const result = await runtime.runCommand(command, body, {
      entityName: entity,
      ...(instanceId ? { instanceId } : {}),
    });

    // 4. Handle failures
    if (!result.success) {
      console.error(`[manifest/${entity}/${command}] Failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: user.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${user.role})`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    // 5. Success
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error(`[manifest/${entity}/${commandSlug}] Error:`, error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

/** Canonical alias for audit-routes tooling compliance. Identical to runManifestCommand. */
export const runCommand = runManifestCommand;
