// Auto-generated Next.js API route for PayrollApprovalHistory
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
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

    const payrollApprovalHistorys =
      await database.payrollApprovalHistory.findMany({
        where: {
          tenant_id: tenantId,
        },
        orderBy: {
          performed_at: "desc",
        },
      });

    return manifestSuccessResponse({ payrollApprovalHistorys });
  } catch (error) {
    console.error("Error fetching payrollApprovalHistorys:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
