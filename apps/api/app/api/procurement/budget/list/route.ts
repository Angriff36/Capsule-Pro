// List procurement budgets with calculated spend and alerts
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

function mapBudgetToSnake(b: {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  fiscalYear: number;
  periodType: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  budgetAmount: { toNumber(): number };
  spentAmount: { toNumber(): number };
  committedAmount: { toNumber(): number };
  thresholdWarningPct: number;
  thresholdCriticalPct: number;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: b.id,
    name: b.name,
    description: b.description,
    category: b.category,
    fiscal_year: b.fiscalYear,
    period_type: b.periodType,
    period_start: b.periodStart,
    period_end: b.periodEnd,
    budget_amount: b.budgetAmount.toNumber(),
    spent_amount: b.spentAmount.toNumber(),
    committed_amount: b.committedAmount.toNumber(),
    threshold_warning_pct: b.thresholdWarningPct,
    threshold_critical_pct: b.thresholdCriticalPct,
    status: b.status,
    notes: b.notes,
    created_at: b.createdAt,
    updated_at: b.updatedAt,
    deleted_at: b.deletedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const fiscalYear = searchParams.get("fiscalYear");
    const status = searchParams.get("status") || "active";

    const whereClause: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (status !== "all") {
      whereClause.status = status;
    }
    if (fiscalYear) {
      whereClause.fiscalYear = Number.parseInt(fiscalYear);
    }

    const budgets = await database.procurementBudget.findMany({
      where: whereClause,
      orderBy: [{ category: { sort: "asc", nulls: "last" } }, { name: "asc" }],
      include: {
        alerts: {
          where: { isAcknowledged: false, deletedAt: null },
          select: { id: true },
        },
      },
    });

    const budgetsMapped = budgets.map((b) => ({
      ...mapBudgetToSnake(b),
      unacknowledged_alert_count: b.alerts.length,
    }));

    return manifestSuccessResponse({ budgets: budgetsMapped });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
