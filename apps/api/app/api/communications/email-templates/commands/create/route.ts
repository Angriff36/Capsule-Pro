// Manifest command handler for EmailTemplate.create
// Updated: 2026-04-26 — Fixed: runCommand alone does not persist entities.
// The runtime engine's create command only evaluates guards/policies and emits
// events via mutate actions (no-ops without instanceId). Actual persistence
// requires calling createInstance() after the command succeeds.

import type { RuntimeEngine } from "@angriff36/manifest";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

/** Return a user-facing error response for a failed manifest command. */
function commandFailureResponse(
  result: {
    policyDenial?: { policyName: string };
    guardFailure?: { index: number; formatted: string };
    error?: string;
  },
  userRole: string | undefined
) {
  if (result.policyDenial) {
    return manifestErrorResponse(
      `Access denied: ${result.policyDenial.policyName} (role=${userRole})`,
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

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    // Resolve internal user from Clerk auth
    const currentUser = await database.user.findFirst({
      where: { AND: [{ tenantId }, { authUserId: clerkId }] },
    });
    if (!currentUser) {
      return manifestErrorResponse("User not found in database", 400);
    }

    const body = await request.json();
    log.info("[email-template/create] Executing command", {
      entityName: "EmailTemplate",
      command: "create",
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
    });

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "EmailTemplate",
    });

    // Step 1: Run the command through the manifest runtime to enforce
    // guards, policies, and constraints. This validates the input but
    // does NOT persist the entity (mutate actions are no-ops without instanceId).
    const result = await runtime.runCommand("create", body, {
      entityName: "EmailTemplate",
    });

    if (!result.success) {
      log.error("[email-template/create] Command failed", {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });
      return commandFailureResponse(result, currentUser.role);
    }

    // Step 2: Actually persist the entity via createInstance.
    const created = await persistEmailTemplate(runtime, tenantId, body);

    if (!created) {
      log.error(
        "[email-template/create] createInstance returned undefined — constraint violation or store error"
      );
      return manifestErrorResponse(
        "Failed to create email template. Check that all required fields are valid.",
        422
      );
    }

    return manifestSuccessResponse({
      result: created,
      events: result.emittedEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("[email-template/create] Error", {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    captureException(error);
    return manifestErrorResponse(
      message.includes("Invalid") || message.includes("required")
        ? message
        : "Internal server error",
      message.includes("Invalid") || message.includes("required") ? 400 : 500
    );
  }
}

/** Persist an EmailTemplate entity via the manifest runtime store. */
async function persistEmailTemplate(
  runtime: RuntimeEngine,
  tenantId: string,
  body: Record<string, unknown>
) {
  return await runtime.createInstance("EmailTemplate", { tenantId, ...body });
}
