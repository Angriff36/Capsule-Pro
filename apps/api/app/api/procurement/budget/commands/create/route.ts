// Create a procurement budget
import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
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

    const result = await database.$queryRaw`
      INSERT INTO tenant_inventory.procurement_budgets (
        tenant_id, name, description, category, fiscal_year,
        period_type, period_start, period_end, budget_amount,
        threshold_warning_pct, threshold_critical_pct, notes
      ) VALUES (
        ${tenantId}::uuid, ${name}, ${description || null}, ${category || null},
        ${fiscalYear}::int,
        ${periodType || "annual"},
        ${periodStart || null}::date,
        ${periodEnd || null}::date,
        ${Number(budgetAmount)}::decimal(12,2),
        ${thresholdWarningPct || 80}::smallint,
        ${thresholdCriticalPct || 100}::smallint,
        ${notes || null}
      )
      RETURNING id, name, category, fiscal_year, budget_amount, status, created_at
    `;

    const budget = (result as any[])[0];
    if (!budget) return manifestErrorResponse("Failed to create budget", 500);

    return manifestSuccessResponse({ budget });
  } catch (error) {
    captureException(error);
    log.error("Error creating budget:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
