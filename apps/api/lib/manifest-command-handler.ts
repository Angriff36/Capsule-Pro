/**
 * Generic manifest command handler for Next.js API routes.
 *
 * This module provides a reusable handler that:
 * 1. Authenticates + resolves tenant + looks up (or auto-provisions) the user
 * 2. Creates a manifest runtime
 * 3. Executes the command through the runtime (guards, constraints, policies, events)
 * 4. Returns a standardized response
 *
 * All mutations MUST flow through this handler to enforce manifest invariants.
 * Direct Prisma writes bypass guards, policies, and event emission.
 *
 * @packageDocumentation
 */

import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-adapters/route-helpers";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

/**
 * Options for executing a manifest command.
 */
interface ManifestCommandOptions {
  /** The entity name (e.g., "CateringOrder", "Shipment") */
  entityName: string;
  /** The command name (e.g., "create", "startPrep") */
  commandName: string;
  /**
   * Optional body transformer. Receives the raw request body and returns
   * the payload to pass to runCommand. Use this to merge URL params,
   * rename fields, or add computed values.
   */
  transformBody?: (
    body: Record<string, unknown>,
    context: {
      userId: string;
      tenantId: string;
      role: string;
      params?: Record<string, string>;
    }
  ) => Record<string, unknown>;
  /**
   * Optional URL params (e.g., from [id] segments).
   * These are passed to the body transformer.
   */
  params?: Record<string, string>;
}

/**
 * Execute a manifest command from a Next.js API route handler.
 *
 * This is the single entry point for all manifest-backed mutations.
 * It handles auth, tenant resolution, user lookup, runtime creation,
 * command execution, error formatting, and response generation.
 *
 * @example
 * ```typescript
 * // In a route.ts file:
 * export async function POST(request: NextRequest) {
 *   return executeManifestCommand(request, {
 *     entityName: "CateringOrder",
 *     commandName: "startPrep",
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With body transformation (e.g., injecting URL params):
 * export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
 *   const { id } = await context.params;
 *   return executeManifestCommand(request, {
 *     entityName: "Shipment",
 *     commandName: "ship",
 *     params: { id },
 *     transformBody: (body, ctx) => ({ ...body, id, userId: ctx.userId }),
 *   });
 * }
 * ```
 */
export async function executeManifestCommand(
  request: NextRequest,
  options: ManifestCommandOptions
): Promise<Response> {
  const { entityName, commandName, transformBody, params } = options;
  const logPrefix = `[${entityName}/${commandName}]`;

  try {
    // 1–3. Authenticate, resolve tenant, and look up (or auto-provision) user
    const currentUser = await requireCurrentUser();

    // 4. Parse request body
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK for some commands (e.g., finalize, cancel)
    }

    // 5. Transform body if needed
    const commandPayload = transformBody
      ? transformBody(body, {
          userId: currentUser.id,
          tenantId: currentUser.tenantId,
          role: currentUser.role,
          params,
        })
      : body;

    console.log(`${logPrefix} Executing command:`, {
      entityName,
      command: commandName,
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
    });

    // 6. Create runtime and execute command
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName,
    });

    // Extract idempotency key from header (if provided).
    // When present, retried commands with the same key return the cached result
    // without re-execution — preventing duplicate side effects.
    const idempotencyKey =
      request.headers.get("Idempotency-Key") ??
      request.headers.get("X-Idempotency-Key") ??
      undefined;

    const result = await runtime.runCommand(commandName, commandPayload, {
      entityName,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });

    // 7. Handle failures
    if (!result.success) {
      console.error(`${logPrefix} Command failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
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

    // 8. Success
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    // InvariantError from requireCurrentUser means auth or tenant resolution failed
    if (error instanceof Error && error.name === "InvariantError") {
      console.error(`${logPrefix} Auth/tenant error:`, error.message);
      return manifestErrorResponse("Unauthorized", 401);
    }

    console.error(`${logPrefix} Error:`, error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
