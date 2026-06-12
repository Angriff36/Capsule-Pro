// Get single budget with spend breakdown and alerts
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    const budget = await database.procurementBudget.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!budget) {
      return manifestErrorResponse("Budget not found", 404);
    }

    const category = budget.category;
    const pStart = budget.periodStart;
    const pEnd = budget.periodEnd;

    // Calculate actual spend from POs matching this budget's category and period
    // Uses $queryRaw tagged template for safe parameterized aggregation across 3-table join
    const spendResult = await database.$queryRaw<
      Array<{ total_spent: bigint; po_count: bigint }>
    >`
      SELECT
        COALESCE(SUM(po.total), 0)::decimal(12,2) as total_spent,
        COUNT(DISTINCT po.id)::int as po_count
      FROM tenant_inventory.purchase_orders po
      JOIN tenant_inventory.purchase_order_items poi ON poi.purchase_order_id = po.id AND poi.tenant_id = po.tenant_id
      JOIN tenant_inventory.inventory_items ii ON ii.id = poi.item_id AND ii.tenant_id = po.tenant_id
      WHERE po.tenant_id = ${tenantId}::uuid AND po.deleted_at IS NULL
        AND po.status NOT IN ('draft', 'cancelled')
        AND ii.category = ${category}
        AND (${pStart}::date IS NULL OR po.order_date >= ${pStart})
        AND (${pEnd}::date IS NULL OR po.order_date <= ${pEnd})
    `;

    const spend = spendResult[0] || { total_spent: 0n, po_count: 0n };

    // Committed spend (POs in draft/submitted/approved status)
    const committedResult = await database.$queryRaw<
      Array<{ committed: bigint }>
    >`
      SELECT
        COALESCE(SUM(po.total), 0)::decimal(12,2) as committed
      FROM tenant_inventory.purchase_orders po
      JOIN tenant_inventory.purchase_order_items poi ON poi.purchase_order_id = po.id AND poi.tenant_id = poi.tenant_id
      JOIN tenant_inventory.inventory_items ii ON ii.id = poi.item_id AND ii.tenant_id = po.tenant_id
      WHERE po.tenant_id = ${tenantId}::uuid AND po.deleted_at IS NULL
        AND po.status IN ('draft', 'submitted', 'approved')
        AND ii.category = ${category}
        AND (${pStart}::date IS NULL OR po.order_date >= ${pStart})
        AND (${pEnd}::date IS NULL OR po.order_date <= ${pEnd})
    `;

    const committed = Number(committedResult[0]?.committed ?? 0n);

    // Alerts — Prisma ORM
    const alerts = await database.procurementBudgetAlert.findMany({
      where: { tenantId, budgetId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Monthly spend breakdown
    const monthlyBreakdown = await database.$queryRaw<
      Array<{ month: string; amount: number; po_count: bigint }>
    >`
      SELECT
        TO_CHAR(po.order_date, 'YYYY-MM') as month,
        SUM(po.total)::decimal(12,2) as amount,
        COUNT(DISTINCT po.id)::int as po_count
      FROM tenant_inventory.purchase_orders po
      JOIN tenant_inventory.purchase_order_items poi ON poi.purchase_order_id = po.id AND poi.tenant_id = poi.tenant_id
      JOIN tenant_inventory.inventory_items ii ON ii.id = poi.item_id AND ii.tenant_id = po.tenant_id
      WHERE po.tenant_id = ${tenantId}::uuid AND po.deleted_at IS NULL
        AND po.status NOT IN ('draft', 'cancelled')
        AND ii.category = ${category}
        AND (${pStart}::date IS NULL OR po.order_date >= ${pStart})
        AND (${pEnd}::date IS NULL OR po.order_date <= ${pEnd})
      GROUP BY TO_CHAR(po.order_date, 'YYYY-MM')
      ORDER BY month
    `;

    const totalSpent = Number(spend.total_spent);
    const budgetAmount = Number(budget.budgetAmount);

    return manifestSuccessResponse({
      budget: {
        tenant_id: budget.tenantId,
        id: budget.id,
        name: budget.name,
        description: budget.description,
        category: budget.category,
        fiscal_year: budget.fiscalYear,
        period_type: budget.periodType,
        period_start: budget.periodStart,
        period_end: budget.periodEnd,
        budget_amount: budget.budgetAmount,
        spent_amount: budget.spentAmount,
        committed_amount: budget.committedAmount,
        threshold_warning_pct: budget.thresholdWarningPct,
        threshold_critical_pct: budget.thresholdCriticalPct,
        status: budget.status,
        notes: budget.notes,
        created_at: budget.createdAt,
        updated_at: budget.updatedAt,
        deleted_at: budget.deletedAt,
      },
      spend: {
        totalSpent,
        poCount: Number(spend.po_count),
        committed,
        remaining: budgetAmount - totalSpent,
        utilizationPct:
          budgetAmount > 0
            ? Math.round((totalSpent / budgetAmount) * 10_000) / 100
            : 0,
      },
      alerts: alerts.map((a) => ({
        tenant_id: a.tenantId,
        id: a.id,
        budget_id: a.budgetId,
        alert_type: a.alertType,
        utilization_pct: a.utilizationPct,
        message: a.message,
        is_acknowledged: a.isAcknowledged,
        acknowledged_by: a.acknowledgedBy,
        acknowledged_at: a.acknowledgedAt,
        resolved: a.resolved,
        resolved_at: a.resolvedAt,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
        deleted_at: a.deletedAt,
      })),
      monthlyBreakdown: monthlyBreakdown.map((m) => ({
        month: m.month,
        amount: Number(m.amount),
        po_count: Number(m.po_count),
      })),
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
