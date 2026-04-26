// Get single budget with spend breakdown and alerts
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
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { id } = await params;

    const budget = await database.procurementBudget.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: {
        alerts: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!budget) return manifestErrorResponse("Budget not found", 404);

    // If no category, return budget as-is with zero spend
    if (!budget.category) {
      return manifestSuccessResponse({
        budget: {
          id: budget.id,
          name: budget.name,
          description: budget.description,
          category: budget.category,
          fiscal_year: budget.fiscalYear,
          period_type: budget.periodType,
          period_start: budget.periodStart,
          period_end: budget.periodEnd,
          budget_amount: budget.budgetAmount.toNumber(),
          spent_amount: budget.spentAmount.toNumber(),
          committed_amount: budget.committedAmount.toNumber(),
          threshold_warning_pct: budget.thresholdWarningPct,
          threshold_critical_pct: budget.thresholdCriticalPct,
          status: budget.status,
          notes: budget.notes,
          created_at: budget.createdAt,
          updated_at: budget.updatedAt,
          deleted_at: budget.deletedAt,
        },
        spend: {
          totalSpent: 0,
          poCount: 0,
          committed: 0,
          remaining: budget.budgetAmount.toNumber(),
          utilizationPct: 0,
        },
        alerts: budget.alerts.map((a) => ({
          id: a.id,
          budget_id: a.budgetId,
          alert_type: a.alertType,
          utilization_pct: a.utilizationPct.toNumber(),
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
        monthlyBreakdown: [],
      });
    }

    // Get all inventory item IDs in this category
    const categoryItems = await database.inventoryItem.findMany({
      where: { tenantId, category: budget.category, deletedAt: null },
      select: { id: true },
    });
    const categoryItemIds = categoryItems.map((i) => i.id);

    // Build date filter for POs
    const poDateFilter: Record<string, unknown> = {};
    if (budget.periodStart) poDateFilter.gte = budget.periodStart;
    if (budget.periodEnd) poDateFilter.lte = budget.periodEnd;

    let totalSpent = 0;
    let poCount = 0;
    let committed = 0;
    let monthlyBreakdown: { month: string; amount: number; po_count: number }[] = [];

    if (categoryItemIds.length > 0) {
      // Actual spend: non-draft/cancelled POs
      const spendAgg = await database.purchaseOrderItem.aggregate({
        _sum: { totalCost: true },
        _count: { id: true },
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

      // Count distinct POs for actual spend
      const distinctPOs = await database.purchaseOrderItem.groupBy({
        by: ["purchaseOrderId"],
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
      poCount = distinctPOs.length;

      // Committed spend: draft/submitted/approved POs
      const committedAgg = await database.purchaseOrderItem.aggregate({
        _sum: { totalCost: true },
        where: {
          tenantId,
          deletedAt: null,
          itemId: { in: categoryItemIds },
          purchaseOrder: {
            tenantId,
            deletedAt: null,
            status: { in: ["draft", "submitted", "approved"] },
            ...(Object.keys(poDateFilter).length > 0
              ? { orderDate: poDateFilter }
              : {}),
          },
        },
      });
      committed = committedAgg._sum.totalCost?.toNumber() ?? 0;

      // Monthly breakdown: fetch POs and group in JS
      const poItemsForBreakdown = await database.purchaseOrderItem.findMany({
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
        select: {
          totalCost: true,
          purchaseOrder: {
            select: { id: true, orderDate: true },
          },
        },
      });

      // Group by month
      const monthMap = new Map<
        string,
        { amount: number; poIds: Set<string> }
      >();
      for (const poi of poItemsForBreakdown) {
        const d = poi.purchaseOrder.orderDate;
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const entry = monthMap.get(month) ?? { amount: 0, poIds: new Set() };
        entry.amount += poi.totalCost.toNumber();
        entry.poIds.add(poi.purchaseOrder.id);
        monthMap.set(month, entry);
      }
      monthlyBreakdown = Array.from(monthMap.entries())
        .map(([month, data]) => ({
          month,
          amount: data.amount,
          po_count: data.poIds.size,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }

    const budgetAmount = budget.budgetAmount.toNumber();

    return manifestSuccessResponse({
      budget: {
        id: budget.id,
        name: budget.name,
        description: budget.description,
        category: budget.category,
        fiscal_year: budget.fiscalYear,
        period_type: budget.periodType,
        period_start: budget.periodStart,
        period_end: budget.periodEnd,
        budget_amount: budgetAmount,
        spent_amount: budget.spentAmount.toNumber(),
        committed_amount: budget.committedAmount.toNumber(),
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
        poCount,
        committed,
        remaining: budgetAmount - totalSpent,
        utilizationPct:
          budgetAmount > 0
            ? Math.round((totalSpent / budgetAmount) * 10_000) / 100
            : 0,
      },
      alerts: budget.alerts.map((a) => ({
        id: a.id,
        budget_id: a.budgetId,
        alert_type: a.alertType,
        utilization_pct: a.utilizationPct.toNumber(),
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
      monthlyBreakdown,
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
