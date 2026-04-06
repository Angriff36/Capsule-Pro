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

    const existing = await database.$queryRaw`
      SELECT id FROM tenant_inventory.procurement_budgets
      WHERE tenant_id = ${tenantId}::uuid AND id = ${budgetId}::uuid AND deleted_at IS NULL
    `;
    if (!(existing as any[]).length)
      return manifestErrorResponse("Budget not found", 404);

    const result = await database.$queryRaw`
      UPDATE tenant_inventory.procurement_budgets
      SET
        name = ${name},
        description = ${description !== undefined ? description : null},
        category = ${category !== undefined ? category : null},
        fiscal_year = ${fiscalYear ? fiscalYear : null}::int,
        period_type = ${periodType || "annual"},
        period_start = ${periodStart ? periodStart : null}::date,
        period_end = ${periodEnd ? periodEnd : null}::date,
        budget_amount = ${budgetAmount ? Number(budgetAmount) : null}::decimal(12,2),
        threshold_warning_pct = ${thresholdWarningPct || 80}::smallint,
        threshold_critical_pct = ${thresholdCriticalPct || 100}::smallint,
        status = ${status || "active"},
        notes = ${notes !== undefined ? notes : null},
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${budgetId}::uuid
      RETURNING id, name, category, fiscal_year, budget_amount, status, updated_at
    `;

    return manifestSuccessResponse({ budget: (result as any[])[0] });
  } catch (error) {
    captureException(error);
    console.error("Error updating budget:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
