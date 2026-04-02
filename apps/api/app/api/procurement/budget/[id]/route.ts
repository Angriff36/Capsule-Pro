// Get single budget with spend breakdown and alerts
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { id } = await params;

    const budgets = await database.$queryRawUnsafe(`
      SELECT * FROM tenant_inventory.procurement_budgets
      WHERE tenant_id = $1::uuid AND id = $2::uuid AND deleted_at IS NULL
    `, tenantId, id);

    if (!(budgets as any[]).length) return manifestErrorResponse("Budget not found", 404);
    const budget = (budgets as any[])[0];

    // Calculate actual spend from POs matching this budget's category and period
    const spendResult = await database.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(po.total), 0)::decimal(12,2) as total_spent,
        COUNT(DISTINCT po.id)::int as po_count
      FROM tenant_inventory.purchase_orders po
      JOIN tenant_inventory.purchase_order_items poi ON poi.purchase_order_id = po.id AND poi.tenant_id = po.tenant_id
      JOIN tenant_inventory.inventory_items ii ON ii.id = poi.item_id AND ii.tenant_id = poi.tenant_id
      WHERE po.tenant_id = $1::uuid AND po.deleted_at IS NULL
        AND po.status NOT IN ('draft', 'cancelled')
        AND ii.category = $2
        ${budget.period_start ? "AND po.order_date >= $3" : ""}
        ${budget.period_end ? "AND po.order_date <= $4" : ""}
    `, budget.period_start && budget.period_end
      ? [tenantId, budget.category, budget.period_start, budget.period_end]
      : budget.period_start
        ? [tenantId, budget.category, budget.period_start]
        : [tenantId, budget.category]
    );

    const spend = (spendResult as any[])[0] || { total_spent: 0, po_count: 0 };

    // Committed spend (POs in draft/submitted/approved status)
    const committedResult = await database.$queryRawUnsafe(`
      SELECT
        COALESCE(SUM(po.total), 0)::decimal(12,2) as committed
      FROM tenant_inventory.purchase_orders po
      JOIN tenant_inventory.purchase_order_items poi ON poi.purchase_order_id = po.id AND poi.tenant_id = po.tenant_id
      JOIN tenant_inventory.inventory_items ii ON ii.id = poi.item_id AND ii.tenant_id = poi.tenant_id
      WHERE po.tenant_id = $1::uuid AND po.deleted_at IS NULL
        AND po.status IN ('draft', 'submitted', 'approved')
        AND ii.category = $2
        ${budget.period_start ? "AND po.order_date >= $3" : ""}
        ${budget.period_end ? "AND po.order_date <= $4" : ""}
    `, budget.period_start && budget.period_end
      ? [tenantId, budget.category, budget.period_start, budget.period_end]
      : budget.period_start
        ? [tenantId, budget.category, budget.period_start]
        : [tenantId, budget.category]
    );

    const committed = (committedResult as any[])[0]?.committed || 0;

    // Alerts
    const alerts = await database.$queryRawUnsafe(`
      SELECT * FROM tenant_inventory.procurement_budget_alerts
      WHERE tenant_id = $1::uuid AND budget_id = $2::uuid AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `, tenantId, id);

    // Monthly spend breakdown for the budget period
    const monthlyBreakdown = await database.$queryRawUnsafe(`
      SELECT
        TO_CHAR(po.order_date, 'YYYY-MM') as month,
        SUM(po.total)::decimal(12,2) as amount,
        COUNT(DISTINCT po.id)::int as po_count
      FROM tenant_inventory.purchase_orders po
      JOIN tenant_inventory.purchase_order_items poi ON poi.purchase_order_id = po.id AND poi.tenant_id = po.tenant_id
      JOIN tenant_inventory.inventory_items ii ON ii.id = poi.item_id AND ii.tenant_id = poi.tenant_id
      WHERE po.tenant_id = $1::uuid AND po.deleted_at IS NULL
        AND po.status NOT IN ('draft', 'cancelled')
        AND ii.category = $2
        ${budget.period_start ? "AND po.order_date >= $3" : ""}
        ${budget.period_end ? "AND po.order_date <= $4" : ""}
      GROUP BY TO_CHAR(po.order_date, 'YYYY-MM')
      ORDER BY month
    `, budget.period_start && budget.period_end
      ? [tenantId, budget.category, budget.period_start, budget.period_end]
      : budget.period_start
        ? [tenantId, budget.category, budget.period_start]
        : [tenantId, budget.category]
    );

    return manifestSuccessResponse({
      budget,
      spend: {
        totalSpent: Number(spend.total_spent),
        poCount: spend.po_count,
        committed: Number(committed),
        remaining: Number(budget.budget_amount) - Number(spend.total_spent),
        utilizationPct: budget.budget_amount > 0
          ? Math.round((Number(spend.total_spent) / Number(budget.budget_amount)) * 10000) / 100
          : 0,
      },
      alerts,
      monthlyBreakdown,
    });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
