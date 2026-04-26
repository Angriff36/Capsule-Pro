// Create a procurement budget
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
      notes,
    } = body;

    if (!name) return manifestErrorResponse("name is required", 400);
    if (!budgetAmount || Number(budgetAmount) <= 0)
      return manifestErrorResponse("budgetAmount must be positive", 400);
    if (!fiscalYear)
      return manifestErrorResponse("fiscalYear is required", 400);

    const budget = await database.procurementBudget.create({
      data: {
        tenantId,
        name,
        description: description || null,
        category: category || null,
        fiscalYear: Number(fiscalYear),
        periodType: periodType || "annual",
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        budgetAmount: Number(budgetAmount),
        thresholdWarningPct: thresholdWarningPct || 80,
        thresholdCriticalPct: thresholdCriticalPct || 100,
        notes: notes || null,
      },
    });

    if (!budget)
      return manifestErrorResponse("Failed to create budget", 500);

    return manifestSuccessResponse({
      budget: {
        id: budget.id,
        name: budget.name,
        category: budget.category,
        fiscal_year: budget.fiscalYear,
        budget_amount: budget.budgetAmount.toNumber(),
        status: budget.status,
        created_at: budget.createdAt,
      },
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
