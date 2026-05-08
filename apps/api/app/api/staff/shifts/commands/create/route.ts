// Auto-generated Next.js command handler for ScheduleShift.create
// Generated from Manifest IR - DO NOT EDIT
// Writes MUST flow through runtime.runCommand() to enforce guards, policies, and constraints

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { triggerShiftAssignedSms } from "@repo/notifications";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { dispatchWebhooks } from "@/app/lib/webhook-dispatch";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

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

    log.info("[schedule-shift/create] Executing command:", {
      entityName: "ScheduleShift",
      command: "create",
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
    });

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "ScheduleShift",
    });

    const result = await runtime.runCommand("create", body, {
      entityName: "ScheduleShift",
    });

    if (!result.success) {
      log.error("[schedule-shift/create] Command failed:", {
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

    // Fire-and-forget SMS trigger for shift assignment (only if an employeeId was in the body)
    if (
      body.employeeId &&
      typeof body.shiftStart === "string" &&
      typeof body.shiftEnd === "string"
    ) {
      triggerShiftAssignedSms({
        tenantId,
        shiftId:
          ((result.result as Record<string, unknown>)?.id as string) ?? body.id,
        shiftDate: body.shiftStart.slice(0, 10),
        shiftStart: body.shiftStart,
        shiftEnd: body.shiftEnd,
        employeeId: body.employeeId as string,
        employeeName: (body.employeeName as string) ?? "",
        stationName: body.roleDuringShift as string | undefined,
      }).catch(() => {});
    }

    dispatchWebhooks({
      tenantId,
      entityType: "scheduleShift",
      entityId:
        ((result.result as Record<string, unknown>)?.id as string) ??
        body.id ??
        "",
      action: "created",
      data: result.result as Record<string, unknown>,
    }).catch(() => {});

    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    log.error("[schedule-shift/create] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
