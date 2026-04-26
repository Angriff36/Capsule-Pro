// Soft-delete a procurement budget
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { budgetId } = await request.json();
    if (!budgetId) return manifestErrorResponse("budgetId is required", 400);

    const existing = await database.procurementBudget.findFirst({
      where: { tenantId, id: budgetId, deletedAt: null },
    });
    if (!existing) return manifestErrorResponse("Budget not found", 404);

    const budget = await database.procurementBudget.update({
      where: { tenantId_id: { tenantId, id: budgetId } },
      data: { deletedAt: new Date() },
    });

    return manifestSuccessResponse({
      budget: { id: budget.id, name: budget.name },
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
