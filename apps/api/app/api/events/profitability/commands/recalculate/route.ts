/**
 * POST /api/events/profitability/commands/recalculate
 * Recalculates an event profitability record based on current event data.
 * Reads budget line items and catering orders (constitution §10 read path),
 * then dispatches through governed Manifest `recalculate` command.
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { manifestErrorResponse } from "@/lib/manifest-response";

interface RecalculateRequestBody {
  instanceId: string;
}

/**
 * Calculate budgeted totals from event budget line items (read path).
 */
async function calculateBudgetTotals(
  tenantId: string,
  eventId: string
): Promise<{
  budgetedRevenue: number;
  budgetedFoodCost: number;
  budgetedLaborCost: number;
  budgetedOverhead: number;
}> {
  const eventBudget = await database.eventBudget.findFirst({
    where: { tenantId, eventId, deletedAt: null },
    include: { budgetLineItems: { where: { deletedAt: null } } },
  });

  const event = await database.event.findUnique({
    where: { tenantId_id: { tenantId, id: eventId } },
    select: { budget: true },
  });

  const budgetedRevenue = event?.budget ? Number(event.budget) : 0;

  if (!(eventBudget?.budgetLineItems.length)) {
    return {
      budgetedRevenue,
      budgetedFoodCost: 0,
      budgetedLaborCost: 0,
      budgetedOverhead: 0,
    };
  }

  let budgetedFoodCost = 0;
  let budgetedLaborCost = 0;
  let budgetedOverhead = 0;

  for (const item of eventBudget.budgetLineItems) {
    const amount = Number(item.budgetedAmount);
    const category = item.category.toLowerCase();

    if (
      category.includes("food") ||
      category.includes("catering") ||
      category.includes("menu")
    ) {
      budgetedFoodCost += amount;
    } else if (
      category.includes("labor") ||
      category.includes("staff") ||
      category.includes("service")
    ) {
      budgetedLaborCost += amount;
    } else if (
      category.includes("overhead") ||
      category.includes("facility") ||
      category.includes("equipment")
    ) {
      budgetedOverhead += amount;
    } else {
      budgetedFoodCost += amount;
    }
  }

  return {
    budgetedRevenue,
    budgetedFoodCost,
    budgetedLaborCost,
    budgetedOverhead,
  };
}

/**
 * Calculate actual totals from catering orders (read path).
 */
async function calculateActualTotals(
  tenantId: string,
  eventId: string
): Promise<{
  actualRevenue: number;
  actualFoodCost: number;
  actualLaborCost: number;
  actualOverhead: number;
}> {
  const cateringOrders = await database.cateringOrder.findMany({
    where: { tenantId, eventId, deletedAt: null },
  });

  let actualRevenue = 0;
  let actualFoodCost = 0;
  let actualLaborCost = 0;
  let actualOverhead = 0;

  for (const order of cateringOrders) {
    actualRevenue += Number(order.subtotalAmount);
    if (
      order.orderStatus === "confirmed" ||
      order.orderStatus === "completed"
    ) {
      actualFoodCost += Number(order.subtotalAmount) * 0.35;
      actualLaborCost += Number(order.subtotalAmount) * 0.15;
      actualOverhead += Number(order.subtotalAmount) * 0.05;
    }
  }

  return { actualRevenue, actualFoodCost, actualLaborCost, actualOverhead };
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveCurrentUser(request);
    if (!user) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const body: RecalculateRequestBody = await request.json();
    const { instanceId: profitabilityId } = body;

    if (!profitabilityId) {
      return manifestErrorResponse(
        "Profitability ID (instanceId) is required",
        400
      );
    }

    // Verify the profitability record exists (read path, constitution §10)
    const profitability = await database.eventProfitability.findFirst({
      where: { id: profitabilityId, tenantId: user.tenantId, deletedAt: null },
    });

    if (!profitability) {
      return manifestErrorResponse("EventProfitability not found", 404);
    }

    // Compute fresh budgeted and actual values (reads, not governed writes)
    const budget = await calculateBudgetTotals(
      user.tenantId,
      profitability.eventId
    );
    const actuals = await calculateActualTotals(
      user.tenantId,
      profitability.eventId
    );

    // Dispatch governed write through Manifest runtime
    return runManifestCommand({
      entity: "EventProfitability",
      command: "recalculate",
      body: {
        id: profitabilityId,
        tenantId: user.tenantId,
        calculationMethod: "manual",
        budgetedRevenue: budget.budgetedRevenue,
        budgetedFoodCost: budget.budgetedFoodCost,
        budgetedLaborCost: budget.budgetedLaborCost,
        budgetedOverhead: budget.budgetedOverhead,
        actualRevenue: actuals.actualRevenue,
        actualFoodCost: actuals.actualFoodCost,
        actualLaborCost: actuals.actualLaborCost,
        actualOverhead: actuals.actualOverhead,
      },
      user,
    });
  } catch (error) {
    captureException(error);
    log.error("Error recalculating event profitability:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
