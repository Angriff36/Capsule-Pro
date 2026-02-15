// Auto-generated Next.js command handler for KitchenTask.complete
// Generated from Manifest IR - DO NOT EDIT
// Writes MUST flow through runtime.runCommand() to enforce guards, policies, and constraints

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-adapters/route-helpers";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

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

    // Fetch user's role for policy evaluation
    const currentUser = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
    });

    if (!currentUser) {
      return manifestErrorResponse("User not found in database", 400);
    }

    const body = await request.json();
    const { id, userId: bodyUserId, ...commandArgs } = body;

    if (!id) {
      return manifestErrorResponse("Task ID is required", 400);
    }

    const effectiveUserId = bodyUserId || currentUser.id;

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "KitchenTask",
    });

    // Log state before running command for debugging
    const taskRecord = await database.kitchenTask.findFirst({
      where: { tenantId, id },
    });
    console.log("[kitchen-task/complete] Pre-command state:", {
      taskId: id,
      taskStatus: taskRecord?.status,
      effectiveUserId,
      userRole: currentUser.role,
      tenantId,
    });

    const result = await runtime.runCommand(
      "complete",
      { userId: effectiveUserId, ...commandArgs },
      {
        entityName: "KitchenTask",
        instanceId: id,
      }
    );

    if (!result.success) {
      console.error("[kitchen-task/complete] Command failed:", {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        taskStatus: taskRecord?.status,
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
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted} (task.status=${taskRecord?.status}, userId=${effectiveUserId})`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error("[kitchen-task/complete] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
