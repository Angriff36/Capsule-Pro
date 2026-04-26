// Refresh budget spend and generate alerts for a single budget or all budgets
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

    // Get budgets to refresh
    const budgets = await database.procurementBudget.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: "active",
        ...(budgetId ? { id: budgetId } : {}),
      },
    });

    let alertsGenerated = 0;

    for (const budget of budgets) {
      if (!budget.category) continue;

      // Build date filter for purchase orders
      const poDateFilter: Record<string, unknown> = {};
      if (budget.periodStart) {
        poDateFilter.gte = budget.periodStart;
      }
      if (budget.periodEnd) {
        poDateFilter.lte = budget.periodEnd;
      }

      // Calculate actual spend via purchase orders in this category
      const categoryItems = await database.inventoryItem.findMany({
        where: { tenantId, category: budget.category, deletedAt: null },
        select: { id: true },
      });
      const categoryItemIds = categoryItems.map((i) => i.id);

      let totalSpent = 0;
      if (categoryItemIds.length > 0) {
        const spendAgg = await database.purchaseOrderItem.aggregate({
          _sum: { totalCost: true },
          where: {
            tenantId,
            deletedAt: null,
            itemId: { in: categoryItemIds },
            purchaseOrder: {
              tenantId,
              deletedAt: null,
              status: { notIn: ["draft", "cancelled"] },
              ...(Object.keys(poDateFilter).length > 0
                ? { orderDate: poDateFilter }
                : {}),
            },
          },
        });
        totalSpent = spendAgg._sum.totalCost?.toNumber() ?? 0;
      }

      const budgetAmount = budget.budgetAmount.toNumber();
      const utilizationPct =
        budgetAmount > 0
          ? Math.round((totalSpent / budgetAmount) * 10_000) / 100
          : 0;

      // Update budget with current spend
      await database.procurementBudget.update({
        where: { tenantId_id: { tenantId, id: budget.id } },
        data: { spentAmount: totalSpent },
      });

      // Generate alerts if thresholds crossed
      const warningPct = budget.thresholdWarningPct;
      const criticalPct = budget.thresholdCriticalPct;

      if (utilizationPct >= criticalPct) {
        const existingCritical =
          await database.procurementBudgetAlert.findFirst({
            where: {
              tenantId,
              budgetId: budget.id,
              alertType: "critical",
              utilizationPct: utilizationPct,
              isAcknowledged: false,
              deletedAt: null,
            },
          });
        if (!existingCritical) {
          await database.procurementBudgetAlert.create({
            data: {
              tenantId,
              budgetId: budget.id,
              alertType: "critical",
              utilizationPct: utilizationPct,
              message: `Budget "${budget.name}" has exceeded ${criticalPct}% (${utilizationPct}% utilized). Spent ${totalSpent.toFixed(2)} of ${budgetAmount.toFixed(2)}.`,
            },
          });
          alertsGenerated++;
        }
      } else if (utilizationPct >= warningPct) {
        const existingWarning =
          await database.procurementBudgetAlert.findFirst({
            where: {
              tenantId,
              budgetId: budget.id,
              alertType: "warning",
              utilizationPct: utilizationPct,
              isAcknowledged: false,
              deletedAt: null,
            },
          });
        if (!existingWarning) {
          await database.procurementBudgetAlert.create({
            data: {
              tenantId,
              budgetId: budget.id,
              alertType: "warning",
              utilizationPct: utilizationPct,
              message: `Budget "${budget.name}" has reached ${warningPct}% threshold (${utilizationPct}% utilized). Spent ${totalSpent.toFixed(2)} of ${budgetAmount.toFixed(2)}.`,
            },
          });
          alertsGenerated++;
        }
      }
    }

    return manifestSuccessResponse({
      budgetsRefreshed: budgets.length,
      alertsGenerated,
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
