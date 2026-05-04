// Refresh budget spend and generate alerts for a single budget or all budgets
// Converted from $queryRawUnsafe to Prisma ORM + $queryRaw tagged templates
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { log } from "@repo/observability/log";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { budgetId } = await request.json();

    // Get budgets to refresh — Prisma ORM
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
      status: "active",
    };
    if (budgetId) {
      where.id = budgetId;
    }

    const budgets = await database.procurementBudget.findMany({ where });

    let alertsGenerated = 0;

    for (const budget of budgets) {
      if (!budget.category) continue;

      // Calculate actual spend — $queryRaw tagged template for safe 3-table aggregation
      const spendResult = await database.$queryRaw<
        Array<{ total_spent: bigint }>
      >`
        SELECT COALESCE(SUM(po.total), 0)::decimal(12,2) as total_spent
        FROM tenant_inventory.purchase_orders po
        JOIN tenant_inventory.purchase_order_items poi ON poi.purchase_order_id = po.id AND poi.tenant_id = po.tenant_id
        JOIN tenant_inventory.inventory_items ii ON ii.id = poi.item_id AND ii.tenant_id = po.tenant_id
        WHERE po.tenant_id = ${tenantId}::uuid AND po.deleted_at IS NULL
          AND po.status NOT IN ('draft', 'cancelled')
          AND ii.category = ${budget.category}
          AND (${budget.periodStart}::date IS NULL OR po.order_date >= ${budget.periodStart})
          AND (${budget.periodEnd}::date IS NULL OR po.order_date <= ${budget.periodEnd})
      `;

      const totalSpent = Number(spendResult[0]?.total_spent ?? 0n);
      const budgetAmount = Number(budget.budgetAmount);
      const utilizationPct =
        budgetAmount > 0
          ? Math.round((totalSpent / budgetAmount) * 10_000) / 100
          : 0;

      // Update budget with current spend — Prisma ORM
      await database.procurementBudget.update({
        where: { tenantId_id: { tenantId, id: budget.id } },
        data: { spentAmount: totalSpent },
      });

      // Generate alerts if thresholds crossed
      const warningPct = Number(budget.thresholdWarningPct);
      const criticalPct = Number(budget.thresholdCriticalPct);

      if (utilizationPct >= criticalPct) {
        const existingCritical =
          await database.procurementBudgetAlert.findFirst({
            where: {
              tenantId,
              budgetId: budget.id,
              alertType: "critical",
              utilizationPct,
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
              utilizationPct,
              message: `Budget "${budget.name}" has exceeded ${criticalPct}% (${utilizationPct}% utilized). Spent ${totalSpent.toFixed(2)} of ${budgetAmount.toFixed(2)}.`,
            },
          });
          alertsGenerated++;
        }
      } else if (utilizationPct >= warningPct) {
        const existingWarning = await database.procurementBudgetAlert.findFirst(
          {
            where: {
              tenantId,
              budgetId: budget.id,
              alertType: "warning",
              utilizationPct,
              isAcknowledged: false,
              deletedAt: null,
            },
          }
        );
        if (!existingWarning) {
          await database.procurementBudgetAlert.create({
            data: {
              tenantId,
              budgetId: budget.id,
              alertType: "warning",
              utilizationPct,
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
    log.error("Error refreshing budgets:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
