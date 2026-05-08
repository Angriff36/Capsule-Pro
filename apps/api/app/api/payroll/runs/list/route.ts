// Auto-generated Next.js API route for PayrollRun
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const payrollRuns = await database.payroll_runs.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return manifestSuccessResponse({ payrollRuns });
  } catch (error) {
    log.error("Error fetching payrollRuns:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
