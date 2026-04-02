// Auto-generated Next.js API route for PayrollPeriod
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { auth } from "@repo/auth/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const payrollPeriods = await database.payroll_periods.findFirst({
      where: {
        id,
        tenant_id: tenantId,
      },
    });

    if (!payrollPeriods) {
      return manifestErrorResponse("Not found", 404);
    }

    return manifestSuccessResponse({ payrollPeriods });
  } catch (error) {
    console.error("Error fetching payrollPeriods:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
