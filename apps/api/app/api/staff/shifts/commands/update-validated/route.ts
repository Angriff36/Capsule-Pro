// Validated shift update route
// Wraps manifest runtime with cross-entity validation for overlaps, overtime, and certifications
// Returns structured ConstraintOutcome results per spec

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { validateShift } from "../../validation";

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

    // For update, we need the shift ID to exclude from overlap check
    const shiftId = body.id;
    if (!shiftId) {
      return manifestErrorResponse("Shift ID is required for update", 400);
    }

    // Get the existing shift to get scheduleId if not provided
    const existingShift = await database.$queryRaw<
      Array<{ schedule_id: string }>
    >(
      Prisma.sql`
        SELECT schedule_id
        FROM tenant_staff.schedule_shifts
        WHERE tenant_id = ${tenantId}
          AND id = ${shiftId}
          AND deleted_at IS NULL
      `
    );

    if (!existingShift[0]) {
      return manifestErrorResponse("Shift not found", 404);
    }

    // Validate shift before manifest runtime
    const validation = await validateShift(
      tenantId,
      {
        scheduleId: body.scheduleId || existingShift[0].schedule_id,
        employeeId: body.employeeId,
        shiftStart: body.shiftStart,
        shiftEnd: body.shiftEnd,
        roleDuringShift: body.roleDuringShift,
      },
      shiftId // Exclude current shift from overlap check
    );

    if (!validation.valid) {
      console.error("[schedule-shift/update-validated] Validation failed:", {
        code: (validation.error as any)?.code,
        message: (validation.error as any)?.message,
      });
      return validation.error;
    }

    console.log("[schedule-shift/update-validated] Executing command:", {
      entityName: "ScheduleShift",
      command: "update",
      shiftId,
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
      warnings: {
        overtime:
          validation.overtime.severity === "WARN"
            ? validation.overtime.message
            : null,
      },
    });

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "ScheduleShift",
    });

    const result = await runtime.runCommand("update", body, {
      entityName: "ScheduleShift",
      instanceId: shiftId,
    });

    if (!result.success) {
      console.error("[schedule-shift/update-validated] Command failed:", {
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

    // Include validation warnings in response
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
      warnings:
        validation.overtime.severity === "WARN"
          ? [
              {
                code: "overtime_warning",
                message: validation.overtime.message,
                details: {
                  currentWeekHours: validation.overtime.currentWeekHours,
                  projectedHours: validation.overtime.projectedHours,
                },
              },
            ]
          : [],
    });
  } catch (error) {
    console.error("[schedule-shift/update-validated] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
