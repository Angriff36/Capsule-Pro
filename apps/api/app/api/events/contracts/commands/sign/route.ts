// Auto-generated Next.js command handler for EventContract.sign
// Generated from Manifest IR - DO NOT EDIT
// Writes MUST flow through runtime.runCommand() to enforce guards, policies, and constraints

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { recordEntityChange } from "@/app/lib/activity-feed-service";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { dispatchWebhooks } from "@/app/lib/webhook-dispatch";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { validateSignatureData } from "../../validation";

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

    const body: Record<string, unknown> = await request.json();
    validateSignatureData(body);

    log.info("[event-contract/sign] Executing command:", {
      entityName: "EventContract",
      command: "sign",
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
    });

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "EventContract",
    });

    const result = await runtime.runCommand("sign", body, {
      entityName: "EventContract",
    });

    if (!result.success) {
      log.error("[event-contract/sign] Command failed:", {
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
      "Contract",
      ((body as Record<string, unknown>)?.id as string) ??
        ((body as Record<string, unknown>)?.contractId as string) ??
        "",
      "signed",
      ((body as Record<string, unknown>)?.title as string) ??
        ((body as Record<string, unknown>)?.contractTitle as string) ??
        "Contract",
      currentUser.id
    ).catch(() => {});

    const contractId =
      ((body as Record<string, unknown>)?.id as string) ??
      ((body as Record<string, unknown>)?.contractId as string) ??
      "";
    dispatchWebhooks({
      tenantId,
      entityType: "Contract",
      entityId: contractId,
      action: "updated",
      data: {
        ...(result.result as Record<string, unknown>),
        contractId,
        signedBy: currentUser.id,
      },
    }).catch(() => {});

    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    log.error("[event-contract/sign] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
