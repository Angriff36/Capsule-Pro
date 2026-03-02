"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type {
  FinancialHealthStatus,
  ResolvedFinancialProjection,
} from "../types/entities";

// ============================================================================
// Financial Projection Derivation
// ============================================================================
// Derives financial projection nodes from event budget data.
// Aggregates financial metrics for events on the board and creates
// projection nodes that can be displayed alongside operational entities.
// ============================================================================

/** Reference to a projection on the board */
interface ProjectionRef {
  id: string;
  entityType: string;
  entityId: string;
}

/** Event data for financial aggregation */
interface EventFinancialData {
  eventId: string;
  eventDate: Date | null;
  guestCount: number | null;
  budget: number | null;
}

/** Result of financial projection derivation */
export interface DeriveFinancialProjectionsResult {
  success: boolean;
  projections?: ResolvedFinancialProjection[];
  error?: string;
}

/**
 * Determine health status based on gross profit margin.
 * - healthy: margin >= 30%
 * - warning: margin >= 20% and < 30%
 * - critical: margin < 20%
 * - unknown: no data
 */
function determineHealthStatus(margin: number): FinancialHealthStatus {
  if (margin >= 30) {
    return "healthy";
  }
  if (margin >= 20) {
    return "warning";
  }
  return "critical";
}

/**
 * Get the time period label for a date.
 * Returns "YYYY-MM" format for monthly aggregation.
 */
function getPeriodLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Estimate costs from budget using industry-standard ratios.
 * For catering/events, food cost typically runs 28-35%, labor 25-30%, overhead 10-15%.
 * We use conservative estimates: 30% food, 25% labor, 10% overhead = 65% total cost ratio.
 */
function estimateCostsFromBudget(budget: number): {
  foodCost: number;
  laborCost: number;
  otherCost: number;
  totalCost: number;
} {
  const foodCost = budget * 0.3;
  const laborCost = budget * 0.25;
  const otherCost = budget * 0.1;
  const totalCost = foodCost + laborCost + otherCost;
  return { foodCost, laborCost, otherCost, totalCost };
}

/**
 * Derives financial projections from events on the board.
 *
 * For events with budget data, this creates aggregated financial
 * projection nodes that show revenue, costs, and margin metrics.
 * Costs are estimated using industry-standard ratios when detailed
 * profitability data is not available.
 *
 * Aggregation is by month to keep projections manageable.
 */
export async function deriveFinancialProjections(
  projections: ProjectionRef[]
): Promise<DeriveFinancialProjectionsResult> {
  try {
    const tenantId = await requireTenantId();

    // Get all event projections
    const eventProjections = projections.filter(
      (p) => p.entityType === "event"
    );

    if (eventProjections.length === 0) {
      return { success: true, projections: [] };
    }

    const eventIds = eventProjections.map((p) => p.entityId);

    // Query events with their budget data
    const events = await database.event.findMany({
      where: {
        tenantId,
        id: { in: eventIds },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        guestCount: true,
        budget: true,
      },
    });

    if (events.length === 0) {
      return { success: true, projections: [] };
    }

    // Group events by period (month)
    const byPeriod = new Map<string, EventFinancialData[]>();

    for (const event of events) {
      if (!event.eventDate) {
        continue;
      }

      const period = getPeriodLabel(event.eventDate);
      const existing = byPeriod.get(period) ?? [];
      existing.push({
        eventId: event.id,
        eventDate: event.eventDate,
        guestCount: event.guestCount,
        budget: event.budget ? Number(event.budget) : null,
      });
      byPeriod.set(period, existing);
    }

    // Create financial projections for each period
    const financialProjections: ResolvedFinancialProjection[] = [];

    for (const [period, periodEvents] of byPeriod.entries()) {
      let totalRevenue = 0;
      let totalCosts = 0;
      let totalFoodCost = 0;
      let totalLaborCost = 0;
      let totalOtherCost = 0;
      let totalGuests = 0;
      const sourceEventIds: string[] = [];

      for (const event of periodEvents) {
        sourceEventIds.push(event.eventId);

        if (event.guestCount) {
          totalGuests += event.guestCount;
        }

        // Use budget as revenue estimate and derive costs
        if (event.budget) {
          const revenue = event.budget;
          const costs = estimateCostsFromBudget(event.budget);

          totalRevenue += revenue;
          totalCosts += costs.totalCost;
          totalFoodCost += costs.foodCost;
          totalLaborCost += costs.laborCost;
          totalOtherCost += costs.otherCost;
        }
      }

      // Skip periods with no financial data
      if (totalRevenue === 0) {
        continue;
      }

      // Calculate gross profit and margin
      const grossProfit = totalRevenue - totalCosts;
      const grossProfitMargin =
        totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      // Create projection ID based on period (deterministic)
      const projectionId = `financial-${period}-${tenantId.slice(0, 8)}`;

      financialProjections.push({
        id: projectionId,
        title: `Financial Projection - ${period}`,
        period,
        projectedRevenue: totalRevenue,
        projectedCosts: totalCosts,
        grossProfit,
        grossProfitMargin,
        eventCount: periodEvents.length,
        totalGuests: totalGuests > 0 ? totalGuests : null,
        healthStatus: determineHealthStatus(grossProfitMargin),
        breakdown:
          totalFoodCost > 0 || totalLaborCost > 0 || totalOtherCost > 0
            ? {
                foodCost: totalFoodCost,
                laborCost: totalLaborCost,
                otherCost: totalOtherCost,
              }
            : undefined,
        sourceEventIds,
      });
    }

    // Sort by period (most recent first)
    financialProjections.sort((a, b) => b.period.localeCompare(a.period));

    return { success: true, projections: financialProjections };
  } catch (error) {
    console.error(
      "[derive-financial-projections] Failed to derive projections:",
      error
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to derive financial projections",
    };
  }
}

/**
 * Get event IDs that contribute to a financial projection.
 * Used for deriving connections between financial projections and events.
 */
export function getSourceEventIds(
  projection: ResolvedFinancialProjection
): string[] {
  return projection.sourceEventIds;
}
