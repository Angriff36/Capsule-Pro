// Auto-generated Next.js API detail route for BudgetAlert
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

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

    const budgetAlert = await database.budgetAlert.findUnique({
      where: {
        tenantId_id: { tenantId, id },
      },
    });

    if (!budgetAlert) {
      return manifestErrorResponse("BudgetAlert not found", 404);
    }

    return manifestSuccessResponse({ budgetAlert });
  } catch (error) {
    console.error("Error fetching budgetAlert:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
