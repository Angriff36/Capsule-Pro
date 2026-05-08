// Auto-generated Next.js command handler for Event.create
// Generated from Manifest IR - DO NOT EDIT
// Writes MUST flow through runtime.runCommand() to enforce guards, policies, and constraints

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { log } from "@repo/observability/log";
import { recordEntityChange } from "@/app/lib/activity-feed-service";
import { dispatchWebhooks } from "@/app/lib/webhook-dispatch";

export const runtime = "nodejs";

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
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
    });

    if (!currentUser) {
      return manifestErrorResponse("User not found in database", 400);
    }

    const body = await request.json();

    log.info("[event/create] Executing command:", {
      entityName: "Event",
      command: "create",
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
    });

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "Event",
    });

    const result = await runtime.runCommand("create", body, {
      entityName: "Event",
    });

    if (!result.success) {
      log.error("[event/create] Command failed:", {
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

    recordEntityChange(
      tenantId,
      "Event",
      (result.result as Record<string, unknown>)?.id as string ?? "",
      "created",
      (body as Record<string, unknown>)?.title as string ?? (body as Record<string, unknown>)?.name as string ?? "Event",
      currentUser.id
    ).catch(() => {});

    const eventId = (result.result as Record<string, unknown>)?.id as string ?? "";
    dispatchWebhooks({
      tenantId,
      entityType: "Event",
      entityId: eventId,
      action: "created",
      data: { ...(result.result as Record<string, unknown>), title: (body as Record<string, unknown>)?.title ?? (body as Record<string, unknown>)?.name ?? "Event" },
    }).catch(() => {});

    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    log.error("[event/create] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
