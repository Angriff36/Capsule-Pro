// List procurement budgets with calculated spend and alerts
// Converted from $queryRawUnsafe to Prisma ORM
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
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

    const searchParams = request.nextUrl.searchParams;
    const fiscalYear = searchParams.get("fiscalYear");
    const status = searchParams.get("status") || "active";

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };
    if (status !== "all") {
      where.status = status;
    }
    if (fiscalYear) {
      where.fiscalYear = Number.parseInt(fiscalYear, 10);
    }

    const budgets = await database.procurementBudget.findMany({
      where,
      include: {
        _count: {
          select: {
            procurementBudgetAlerts: {
              where: { isAcknowledged: false, deletedAt: null },
            },
          },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const shaped = budgets.map((b) => ({
      tenant_id: b.tenantId,
      id: b.id,
      name: b.name,
      description: b.description,
      category: b.category,
      fiscal_year: b.fiscalYear,
      period_type: b.periodType,
      period_start: b.periodStart,
      period_end: b.periodEnd,
      budget_amount: b.budgetAmount,
      spent_amount: b.spentAmount,
      committed_amount: b.committedAmount,
      threshold_warning_pct: b.thresholdWarningPct,
      threshold_critical_pct: b.thresholdCriticalPct,
      status: b.status,
      notes: b.notes,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
      deleted_at: b.deletedAt,
      unacknowledged_alert_count: b._count.procurementBudgetAlerts,
    }));

    return manifestSuccessResponse({ budgets: shaped });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
