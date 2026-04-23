// Refresh budget spend and generate alerts for a single budget or all budgets
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { captureException } from "@sentry/nextjs";
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
    const budgets = await database.$queryRawUnsafe(
      `
      SELECT * FROM tenant_inventory.procurement_budgets
      WHERE tenant_id = $1::uuid AND deleted_at IS NULL AND status = 'active'
        ${budgetId ? "AND id = $2::uuid" : ""}
    `,
      ...(budgetId ? [tenantId, budgetId] : [tenantId])
    );

    let alertsGenerated = 0;

    for (const budget of budgets as any[]) {
      if (!budget.category) continue;

      // Calculate actual spend
      const spendResult = await database.$queryRawUnsafe(
        `
        SELECT COALESCE(SUM(po.total), 0)::decimal(12,2) as total_spent
        FROM tenant_inventory.purchase_orders po
        JOIN tenant_inventory.purchase_order_items poi ON poi.purchase_order_id = po.id AND poi.tenant_id = po.tenant_id
        JOIN tenant_inventory.inventory_items ii ON ii.id = poi.item_id AND ii.tenant_id = poi.tenant_id
        WHERE po.tenant_id = $1::uuid AND po.deleted_at IS NULL
          AND po.status NOT IN ('draft', 'cancelled')
          AND ii.category = $2
          ${budget.period_start ? "AND po.order_date >= $3" : ""}
          ${budget.period_end ? "AND po.order_date <= $4" : ""}
      `,
        ...(budget.period_start && budget.period_end
          ? [tenantId, budget.category, budget.period_start, budget.period_end]
          : budget.period_start
            ? [tenantId, budget.category, budget.period_start]
            : [tenantId, budget.category])
      );

      const totalSpent = Number((spendResult as any[])[0]?.total_spent || 0);
      const budgetAmount = Number(budget.budget_amount);
      const utilizationPct =
        budgetAmount > 0
          ? Math.round((totalSpent / budgetAmount) * 10_000) / 100
          : 0;

      // Update budget with current spend
      await database.$queryRaw`
        UPDATE tenant_inventory.procurement_budgets
        SET spent_amount = ${totalSpent}::decimal(12,2), updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid AND id = ${budget.id}::uuid
      `;

      // Generate alerts if thresholds crossed
      const warningPct = Number(budget.threshold_warning_pct);
      const criticalPct = Number(budget.threshold_critical_pct);

      if (utilizationPct >= criticalPct) {
        const existingCritical = await database.$queryRaw`
          SELECT id FROM tenant_inventory.procurement_budget_alerts
          WHERE tenant_id = ${tenantId}::uuid AND budget_id = ${budget.id}::uuid
            AND alert_type = 'critical' AND utilization_pct = ${utilizationPct}::decimal(5,2)
            AND is_acknowledged = false AND deleted_at IS NULL
        `;
        if (!(existingCritical as any[]).length) {
          await database.$queryRaw`
            INSERT INTO tenant_inventory.procurement_budget_alerts
              (tenant_id, budget_id, alert_type, utilization_pct, message)
            VALUES (
              ${tenantId}::uuid, ${budget.id}::uuid, 'critical',
              ${utilizationPct}::decimal(5,2),
              ${`Budget "${budget.name}" has exceeded ${criticalPct}% (${utilizationPct}% utilized). Spent ${totalSpent.toFixed(2)} of ${budgetAmount.toFixed(2)}.`}
            )
          `;
          alertsGenerated++;
        }
      } else if (utilizationPct >= warningPct) {
        const existingWarning = await database.$queryRaw`
          SELECT id FROM tenant_inventory.procurement_budget_alerts
          WHERE tenant_id = ${tenantId}::uuid AND budget_id = ${budget.id}::uuid
            AND alert_type = 'warning' AND utilization_pct = ${utilizationPct}::decimal(5,2)
            AND is_acknowledged = false AND deleted_at IS NULL
        `;
        if (!(existingWarning as any[]).length) {
          await database.$queryRaw`
            INSERT INTO tenant_inventory.procurement_budget_alerts
              (tenant_id, budget_id, alert_type, utilization_pct, message)
            VALUES (
              ${tenantId}::uuid, ${budget.id}::uuid, 'warning',
              ${utilizationPct}::decimal(5,2),
              ${`Budget "${budget.name}" has reached ${warningPct}% threshold (${utilizationPct}% utilized). Spent ${totalSpent.toFixed(2)} of ${budgetAmount.toFixed(2)}.`}
            )
          `;
          alertsGenerated++;
        }
      }
    }

    return manifestSuccessResponse({
      budgetsRefreshed: (budgets as any[]).length,
      alertsGenerated,
    });
  } catch (error) {
    captureException(error);
    console.error("Error refreshing budgets:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
