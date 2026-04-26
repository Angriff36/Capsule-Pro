// Update a procurement budget
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

    const body = await request.json();
    const {
      budgetId,
      name,
      description,
      category,
      fiscalYear,
      periodType,
      periodStart,
      periodEnd,
      budgetAmount,
      thresholdWarningPct,
      thresholdCriticalPct,
      status,
      notes,
    } = body;

    if (!budgetId) return manifestErrorResponse("budgetId is required", 400);

    const existing = await database.procurementBudget.findFirst({
      where: { tenantId, id: budgetId, deletedAt: null },
    });
    if (!existing) return manifestErrorResponse("Budget not found", 404);

    const budget = await database.procurementBudget.update({
      where: { tenantId_id: { tenantId, id: budgetId } },
      data: {
        name,
        description: description !== undefined ? description : null,
        category: category !== undefined ? category : null,
        fiscalYear: fiscalYear ? Number(fiscalYear) : existing.fiscalYear,
        periodType: periodType ?? "annual",
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        budgetAmount: budgetAmount ? Number(budgetAmount) : existing.budgetAmount,
        thresholdWarningPct: thresholdWarningPct ?? 80,
        thresholdCriticalPct: thresholdCriticalPct ?? 100,
        status: status ?? "active",
        notes: notes !== undefined ? notes : null,
      },
    });

    return manifestSuccessResponse({
      budget: {
        id: budget.id,
        name: budget.name,
        category: budget.category,
        fiscal_year: budget.fiscalYear,
        budget_amount: budget.budgetAmount.toNumber(),
        status: budget.status,
        updated_at: budget.updatedAt,
      },
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
