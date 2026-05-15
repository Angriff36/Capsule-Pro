/**
 * POST /api/events/profitability/commands/recalculate
 * Recalculates an event profitability record based on current event data
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

interface RecalculateRequestBody {
  instanceId: string;
}

// ── Business-logic constants ──────────────────────────────────────────
// Extracted from hardcoded values per BUG-2 audit.
// These should eventually live in a manifest-driven config, but for now
// they're at least named and centrally changeable.

/** Cost estimation ratios applied to confirmed/completed catering orders */
const FOOD_COST_RATIO = 0.35;
const LABOR_COST_RATIO = 0.15;
const OVERHEAD_COST_RATIO = 0.05;

/** Budget line-item category classification keywords */
const FOOD_CATEGORY_KEYWORDS = ["food", "catering", "menu"];
const LABOR_CATEGORY_KEYWORDS = ["labor", "staff", "service"];
const OVERHEAD_CATEGORY_KEYWORDS = ["overhead", "facility", "equipment"];

/**
 * Calculate totals from budget line items
 */
async function calculateBudgetTotals(
  tenantId: string,
  eventId: string
): Promise<{
  budgetedRevenue: number;
  budgetedFoodCost: number;
  budgetedLaborCost: number;
  budgetedOverhead: number;
  budgetedTotalCost: number;
}> {
  // Get event budget with line items
  const eventBudget = await database.eventBudget.findFirst({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
    include: {
      lineItems: {
        where: { deletedAt: null },
      },
    },
  });

  // Get event to get budgeted revenue
  const event = await database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
    select: {
      budget: true,
    },
  });

  const budgetedRevenue = event?.budget ? Number(event.budget) : 0;

  if (!(eventBudget && eventBudget.lineItems.length)) {
    return {
      budgetedRevenue,
      budgetedFoodCost: 0,
      budgetedLaborCost: 0,
      budgetedOverhead: 0,
      budgetedTotalCost: 0,
    };
  }

  let budgetedFoodCost = 0;
  let budgetedLaborCost = 0;
  let budgetedOverhead = 0;

  for (const item of eventBudget.lineItems) {
    const amount = Number(item.budgetedAmount);
    const category = item.category.toLowerCase();

    if (FOOD_CATEGORY_KEYWORDS.some((kw) => category.includes(kw))) {
      budgetedFoodCost += amount;
    } else if (LABOR_CATEGORY_KEYWORDS.some((kw) => category.includes(kw))) {
      budgetedLaborCost += amount;
    } else if (OVERHEAD_CATEGORY_KEYWORDS.some((kw) => category.includes(kw))) {
      budgetedOverhead += amount;
    } else {
      // Default: food costs
      budgetedFoodCost += amount;
    }
  }

  const budgetedTotalCost =
    budgetedFoodCost + budgetedLaborCost + budgetedOverhead;

  return {
    budgetedRevenue,
    budgetedFoodCost,
    budgetedLaborCost,
    budgetedOverhead,
    budgetedTotalCost,
  };
}

/**
 * Calculate actual totals from catering orders
 */
async function calculateActualTotals(
  tenantId: string,
  eventId: string
): Promise<{
  actualRevenue: number;
  actualFoodCost: number;
  actualLaborCost: number;
  actualOverhead: number;
  actualTotalCost: number;
}> {
  // Get catering orders for this event (they represent actual revenue and costs)
  const cateringOrders = await database.cateringOrder.findMany({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
  });

  let actualRevenue = 0;
  let actualFoodCost = 0;
  let actualLaborCost = 0;
  let actualOverhead = 0;

  for (const order of cateringOrders) {
    // Order subtotal is the revenue
    actualRevenue += Number(order.subtotal_amount);

    // Estimated costs from order items
    if (
      order.order_status === "confirmed" ||
      order.order_status === "completed"
    ) {
      actualFoodCost += Number(order.subtotal_amount) * FOOD_COST_RATIO;
      actualLaborCost += Number(order.subtotal_amount) * LABOR_COST_RATIO;
      actualOverhead += Number(order.subtotal_amount) * OVERHEAD_COST_RATIO;
    }
  }

  const actualTotalCost = actualFoodCost + actualLaborCost + actualOverhead;

  return {
    actualRevenue,
    actualFoodCost,
    actualLaborCost,
    actualOverhead,
    actualTotalCost,
  };
}

/**
 * Calculate gross margin and percentages
 */
function calculateMargins(
  revenue: number,
  totalCost: number
): { grossMargin: number; grossMarginPct: number } {
  const grossMargin = revenue - totalCost;
  const grossMarginPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
  return { grossMargin, grossMarginPct };
}

/**
 * Calculate variance between budgeted and actual
 */
function calculateVariances(
  budgeted: {
    revenue: number;
    foodCost: number;
    laborCost: number;
    totalCost: number;
  },
  actual: {
    revenue: number;
    foodCost: number;
    laborCost: number;
    totalCost: number;
  }
): {
  revenueVariance: number;
  foodCostVariance: number;
  laborCostVariance: number;
  totalCostVariance: number;
  marginVariancePct: number;
} {
  const revenueVariance = budgeted.revenue - actual.revenue;
  const foodCostVariance = budgeted.foodCost - actual.foodCost;
  const laborCostVariance = budgeted.laborCost - actual.laborCost;
  const totalCostVariance = budgeted.totalCost - actual.totalCost;

  // Calculate margin variance percentage
  const budgetedMargin = budgeted.revenue - budgeted.totalCost;
  const actualMargin = actual.revenue - actual.totalCost;
  const marginVariancePct =
    budgeted.revenue > 0
      ? ((budgetedMargin - actualMargin) / budgeted.revenue) * 100
      : 0;

  return {
    revenueVariance,
    foodCostVariance,
    laborCostVariance,
    totalCostVariance,
    marginVariancePct,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body: RecalculateRequestBody = await request.json();
    const { instanceId: profitabilityId } = body;

    if (!profitabilityId) {
      return manifestErrorResponse(
        "Profitability ID (instanceId) is required",
        400
      );
    }

    // Get the existing profitability record
    const profitability = await database.eventProfitability.findFirst({
      where: {
        id: profitabilityId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!profitability) {
      return manifestErrorResponse("EventProfitability not found", 404);
    }

    // Calculate budgeted totals from event budget
    const budgetTotals = await calculateBudgetTotals(
      tenantId,
      profitability.eventId
    );

    // Calculate actual totals from catering orders
    const actualTotals = await calculateActualTotals(
      tenantId,
      profitability.eventId
    );

    // Calculate budgeted gross margin
    const budgetedMargins = calculateMargins(
      budgetTotals.budgetedRevenue,
      budgetTotals.budgetedTotalCost
    );

    // Calculate actual gross margin
    const actualMargins = calculateMargins(
      actualTotals.actualRevenue,
      actualTotals.actualTotalCost
    );

    // Calculate variances
    const variances = calculateVariances(
      {
        revenue: budgetTotals.budgetedRevenue,
        foodCost: budgetTotals.budgetedFoodCost,
        laborCost: budgetTotals.budgetedLaborCost,
        totalCost: budgetTotals.budgetedTotalCost,
      },
      {
        revenue: actualTotals.actualRevenue,
        foodCost: actualTotals.actualFoodCost,
        laborCost: actualTotals.actualLaborCost,
        totalCost: actualTotals.actualTotalCost,
      }
    );

    // Update the profitability record
    const updatedProfitability = await database.eventProfitability.update({
      where: {
        tenantId_id: {
          tenantId,
          id: profitabilityId,
        },
      },
      data: {
        budgetedRevenue: new Prisma.Decimal(budgetTotals.budgetedRevenue),
        budgetedFoodCost: new Prisma.Decimal(budgetTotals.budgetedFoodCost),
        budgetedLaborCost: new Prisma.Decimal(budgetTotals.budgetedLaborCost),
        budgetedOverhead: new Prisma.Decimal(budgetTotals.budgetedOverhead),
        budgetedTotalCost: new Prisma.Decimal(budgetTotals.budgetedTotalCost),
        budgetedGrossMargin: new Prisma.Decimal(budgetedMargins.grossMargin),
        budgetedGrossMarginPct: new Prisma.Decimal(
          budgetedMargins.grossMarginPct
        ),
        actualRevenue: new Prisma.Decimal(actualTotals.actualRevenue),
        actualFoodCost: new Prisma.Decimal(actualTotals.actualFoodCost),
        actualLaborCost: new Prisma.Decimal(actualTotals.actualLaborCost),
        actualOverhead: new Prisma.Decimal(actualTotals.actualOverhead),
        actualTotalCost: new Prisma.Decimal(actualTotals.actualTotalCost),
        actualGrossMargin: new Prisma.Decimal(actualMargins.grossMargin),
        actualGrossMarginPct: new Prisma.Decimal(actualMargins.grossMarginPct),
        revenueVariance: new Prisma.Decimal(variances.revenueVariance),
        foodCostVariance: new Prisma.Decimal(variances.foodCostVariance),
        laborCostVariance: new Prisma.Decimal(variances.laborCostVariance),
        totalCostVariance: new Prisma.Decimal(variances.totalCostVariance),
        marginVariancePct: new Prisma.Decimal(variances.marginVariancePct),
        calculatedAt: new Date(),
        calculationMethod: "manual",
        updatedAt: new Date(),
      },
    });

    log.info("Event profitability recalculated", {
      profitabilityId,
      eventId: profitability.eventId,
      tenantId,
      userId,
    });

    return manifestSuccessResponse({
      success: true,
      eventProfitability: updatedProfitability,
    });
  } catch (error) {
    captureException(error);
    log.error("Error recalculating event profitability:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
