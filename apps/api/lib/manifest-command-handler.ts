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

import { randomUUID } from "node:crypto";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-runtime/route-helpers";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { dispatchWebhooks } from "@/app/lib/webhook-dispatch";
import { logManifestIssue } from "@/lib/manifest/issue-log";
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
    // Supports both Clerk session auth and API key Bearer token auth.
    const currentUser = await resolveCurrentUser(request);

    // 4. Parse request body
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK for some commands (e.g., finalize, cancel)
    }

    // 5. Transform body if needed
    let commandPayload = transformBody
      ? transformBody(body, {
          userId: currentUser.id,
          tenantId: currentUser.tenantId,
          role: currentUser.role,
          params,
        })
      : body;

    log.info(`${logPrefix} Executing command`, {
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

    let createInstanceId: string | undefined;
    if (commandName === "create") {
      const id =
        typeof commandPayload.id === "string" && commandPayload.id.length > 0
          ? commandPayload.id
          : randomUUID();
      const seeded = await runtime.createInstance(entityName, { id });
      if (!seeded) {
        return manifestErrorResponse(
          "Failed to initialize entity instance for create",
          500
        );
      }
      commandPayload = { ...commandPayload, id };
      createInstanceId = id;
    }

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
      ...(createInstanceId
        ? { instanceId: createInstanceId }
        : commandName !== "create" && (commandPayload.id ?? params?.id)
          ? { instanceId: String(commandPayload.id ?? params?.id) }
          : {}),
    });

    // 7. Handle failures (issue-log telemetry records details centrally)
    if (!result.success) {
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

    // 8. Success — fire-and-forget webhook dispatch
    const entityId = String(
      (result.result as Record<string, unknown>)?.id ??
        createInstanceId ??
        commandPayload.id ??
        params?.id ??
        ""
    );
    const webhookAction =
      commandName === "create"
        ? ("created" as const)
        : commandName === "delete" ||
            commandName === "softDelete" ||
            commandName === "cancel"
          ? ("deleted" as const)
          : ("updated" as const);
    dispatchWebhooks({
      tenantId: currentUser.tenantId,
      entityType: entityName,
      entityId,
      action: webhookAction,
      data: {
        ...((result.result as Record<string, unknown>) ?? {}),
        commandName,
      },
    }).catch(() => {});

    let successResult = result.result;
    if (commandName === "create" && createInstanceId) {
      if (
        !(
          typeof successResult === "object" &&
          successResult !== null &&
          typeof (successResult as Record<string, unknown>).id === "string"
        )
      ) {
        const instance = await runtime.getInstance(
          entityName,
          createInstanceId
        );
        successResult = instance ?? { id: createInstanceId };
      }
    }

    return manifestSuccessResponse({
      result: successResult,
      events: result.emittedEvents,
    });
  } catch (error) {
    // InvariantError from requireCurrentUser means auth or tenant resolution failed
    if (error instanceof Error && error.name === "InvariantError") {
      logManifestIssue({
        kind: "auth_error",
        entity: entityName,
        command: commandName,
        httpStatus: 401,
        message: error.message,
      });
      return manifestErrorResponse("Unauthorized", 401);
    }

    // API key scope or authentication errors
    if (
      error instanceof Error &&
      error.message.startsWith("Insufficient permissions")
    ) {
      return manifestErrorResponse(error.message, 403);
    }
    if (error instanceof Error && error.message === "Invalid API key") {
      return manifestErrorResponse("Invalid API key", 401);
    }
    if (
      error instanceof Error &&
      error.message.includes("API key creator not found")
    ) {
      return manifestErrorResponse(error.message, 401);
    }

    logManifestIssue({
      kind: "runtime_error",
      entity: entityName,
      command: commandName,
      httpStatus: 500,
      message: error instanceof Error ? error.message : "Internal server error",
      details: {
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
