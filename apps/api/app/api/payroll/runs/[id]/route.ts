// Auto-generated Next.js API detail route for PayrollRun
// Generated from Manifest IR - DO NOT EDIT (GET handler auto-generated)
// PUT handler manually added for approve/reject flows

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected"],
  processing: ["completed", "failed"],
  completed: ["approved", "rejected"],
  approved: ["finalized"],
  rejected: ["pending"],
  finalized: ["paid"],
  paid: [],
  failed: ["pending"],
};

function isValidStatusTransition(current: string, next: string): boolean {
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed) return false;
  return allowed.includes(next);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    const payrollRun = await database.payroll_runs.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        deleted_at: null,
      },
    });

    if (!payrollRun) {
      return manifestErrorResponse("PayrollRun not found", 404);
    }

    return manifestSuccessResponse({ payrollRun });
  } catch (error) {
    log.error("Error fetching payrollRun:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus || typeof newStatus !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'status' field" },
        { status: 400 }
      );
    }

    // Fetch current run to validate transition
    const currentRun = await database.payroll_runs.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        deleted_at: null,
      },
    });

    if (!currentRun) {
      return manifestErrorResponse("PayrollRun not found", 404);
    }

    if (!isValidStatusTransition(currentRun.status, newStatus)) {
      return NextResponse.json(
        {
          error:
            "Invalid status transition: '" +
            currentRun.status +
            "' -> '" +
            newStatus +
            "'",
        },
        { status: 400 }
      );
    }

    const updatedRun = await database.$queryRaw<Array<Record<string, unknown>>>(
      Prisma.sql`
        UPDATE tenant_staff.payroll_runs
        SET
          status = ${newStatus}::text,
          updated_at = NOW(),
          approved_by = CASE WHEN ${newStatus} = 'approved' THEN ${userId}::uuid ELSE approved_by END,
          approved_at = CASE WHEN ${newStatus} = 'approved' THEN NOW() ELSE approved_at END
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid AND deleted_at IS NULL
        RETURNING *
      `
    );

    if (!updatedRun || updatedRun.length === 0) {
      return manifestErrorResponse("Failed to update PayrollRun", 500);
    }

    return manifestSuccessResponse({ payrollRun: updatedRun[0] });
  } catch (error) {
    captureException(error);
    log.error("Error updating payrollRun:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
