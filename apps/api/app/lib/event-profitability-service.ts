/**
 * Event Profitability Calculation Service
 *
 * Calculates actual vs. projected profitability per event including:
 * - Labor costs (from TimeEntry and EventStaffAssignment)
 * - Inventory usage (from InventoryTransaction and recipe costs)
 * - Overhead allocation (configurable percentage or fixed amount)
 * - Margin variance tracking
 *
 * GOVERNANCE NOTE:
 * This service is invoked by the EventProfitability.recalculate Manifest command.
 * All profitability updates must flow through the runtime to ensure proper
 * governance, policy enforcement, and event emission.
 */

import { Prisma } from "@repo/database";
import type { PrismaClient } from "@repo/database";

export interface EventProfitabilityInput {
  eventId: string;
  tenantId: string;
}

export interface EventCostBreakdown {
  // Food costs from inventory usage and recipe costs
  foodCost: {
    directInventoryUsage: number;
    recipeBasedCosts: number;
    wasteCost: number;
    total: number;
    breakdown: FoodCostItem[];
  };

  // Labor costs from time entries and staff assignments
  laborCost: {
    regularHours: number;
    overtimeHours: number;
    regularCost: number;
    overtimeCost: number;
    totalHours: number;
    totalCost: number;
    breakdown: LaborCostItem[];
  };

  // Overhead allocation
  overheadCost: {
    rentAllocation: number;
    utilitiesAllocation: number;
    equipmentAllocation: number;
    administrativeAllocation: number;
    total: number;
  };

  // Revenue
  revenue: {
    expectedRevenue: number;
    actualRevenue: number;
    adjustments: number;
    total: number;
  };
}

export interface FoodCostItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  source: "inventory" | "recipe" | "waste";
}

export interface LaborCostItem {
  employeeId: string;
  employeeName: string;
  role: string;
  hours: number;
  hourlyRate: number;
  overtimeHours: number;
  overtimeRate: number;
  totalCost: number;
}

export interface EventProfitabilityCalculationResult {
  eventId: string;
  tenantId: string;

  // Budgeted values
  budgetedRevenue: number;
  budgetedFoodCost: number;
  budgetedLaborCost: number;
  budgetedOverhead: number;
  budgetedTotalCost: number;
  budgetedGrossMargin: number;
  budgetedGrossMarginPct: number;

  // Actual values
  actualRevenue: number;
  actualFoodCost: number;
  actualLaborCost: number;
  actualOverhead: number;
  actualTotalCost: number;
  actualGrossMargin: number;
  actualGrossMarginPct: number;

  // Variances
  revenueVariance: number;
  foodCostVariance: number;
  laborCostVariance: number;
  totalCostVariance: number;
  marginVariancePct: number;

  // Detailed breakdown
  costBreakdown: EventCostBreakdown;

  // Analysis flags
  isProfitable: boolean;
  isOverBudget: boolean;
  varianceExplanations: string[];
}

export interface OverheadAllocationConfig {
  method: "percentage" | "fixed" | "hybrid";
  // For percentage method: percentage of revenue or total costs
  revenuePercentage?: number;
  costPercentage?: number;
  // For fixed method: fixed amount per event
  fixedAmount?: number;
  // For hybrid method: base fixed amount + percentage of costs above threshold
  baseAmount?: number;
  costThreshold?: number;
  variablePercentage?: number;
  // Category breakdown percentages (must sum to 1)
  categoryBreakdown?: {
    rent: number;
    utilities: number;
    equipment: number;
    administrative: number;
  };
}

const DEFAULT_OVERHEAD_CONFIG: OverheadAllocationConfig = {
  method: "percentage",
  costPercentage: 0.12, // 12% of total costs
  categoryBreakdown: {
    rent: 0.35,
    utilities: 0.20,
    equipment: 0.25,
    administrative: 0.20,
  },
};

/**
 * Calculate food costs for an event from multiple sources:
 * 1. Direct inventory transactions tagged to the event
 * 2. Recipe costs based on prep tasks for the event
 * 3. Waste entries
 */
async function calculateFoodCosts(
  prisma: PrismaClient,
  eventId: string,
  tenantId: string
): Promise<EventCostBreakdown["foodCost"]> {
  // Get direct inventory usage for this event
  const inventoryUsage = await prisma.$queryRaw<
    Array<{
      ingredient_name: string;
      ingredient_id: string;
      quantity: string;
      unit_cost: string;
      total_cost: string;
      unit: string;
    }>
  >(
    Prisma.sql`
      SELECT
        ii.name as ingredient_name,
        ii.id as ingredient_id,
        SUM(it.quantity) as quantity,
        ii.unit_cost as unit_cost,
        SUM(it.quantity * ii.unit_cost) as total_cost,
        ii.unit as unit
      FROM tenant_inventory.inventory_transactions it
      JOIN tenant_inventory.inventory_items ii
        ON ii.tenant_id = it.tenant_id AND ii.id = it.inventory_item_id
      WHERE it.tenant_id = ${tenantId}
        AND it.reference_type = 'event'
        AND it.reference_id = ${eventId}
        AND it.transaction_type IN ('use', 'consume')
        AND it.deleted_at IS NULL
        AND ii.deleted_at IS NULL
      GROUP BY ii.id, ii.name, ii.unit_cost, ii.unit
    `
  );

  let directInventoryUsage = 0;
  const breakdown: FoodCostItem[] = [];

  for (const item of inventoryUsage) {
    const cost = Number(item.total_cost);
    directInventoryUsage += cost;
    breakdown.push({
      ingredientId: item.ingredient_id,
      ingredientName: item.ingredient_name,
      quantity: Number(item.quantity),
      unit: item.unit || "ea",
      unitCost: Number(item.unit_cost),
      totalCost: cost,
      source: "inventory",
    });
  }

  // Get recipe-based costs from prep tasks
  const recipeCosts = await prisma.$queryRaw<
    Array<{
      recipe_id: string;
      recipe_name: string;
      total_cost: string;
      quantity_multiplier: string;
    }>
  >(
    Prisma.sql`
      SELECT
        r.id as recipe_id,
        r.name as recipe_name,
        COALESCE(rv.total_cost, 0) * COALESCE(pt.quantity_total, 0) as total_cost,
        COALESCE(pt.quantity_total, 0) as quantity_multiplier
      FROM tenant_kitchen.prep_tasks pt
      JOIN tenant_kitchen.recipes r ON r.id = pt.dish_id
      LEFT JOIN tenant_kitchen.recipe_versions rv
        ON rv.recipe_id = r.id
        AND rv.version_number = (
          SELECT MAX(version_number)
          FROM tenant_kitchen.recipe_versions
          WHERE recipe_id = r.id
        )
      WHERE pt.tenant_id = ${tenantId}
        AND pt.event_id = ${eventId}
        AND pt.deleted_at IS NULL
        AND r.deleted_at IS NULL
    `
  );

  let recipeBasedCosts = 0;
  for (const recipe of recipeCosts) {
    const cost = Number(recipe.total_cost);
    recipeBasedCosts += cost;
    breakdown.push({
      ingredientId: recipe.recipe_id,
      ingredientName: `Recipe: ${recipe.recipe_name}`,
      quantity: Number(recipe.quantity_multiplier),
      unit: "batch",
      unitCost: Number(recipe.quantity_multiplier) > 0
        ? cost / Number(recipe.quantity_multiplier)
        : 0,
      totalCost: cost,
      source: "recipe",
    });
  }

  // Get waste entries for this event
  const wasteEntries = await prisma.$queryRaw<
    Array<{
      ingredient_id: string;
      ingredient_name: string;
      quantity: string;
      estimated_cost: string;
    }>
  >(
    Prisma.sql`
      SELECT
        i.id as ingredient_id,
        i.name as ingredient_name,
        SUM(we.quantity) as quantity,
        SUM(we.estimated_cost) as estimated_cost
      FROM tenant_kitchen.waste_entries we
      JOIN tenant_kitchen.ingredients i
        ON i.tenant_id = we.tenant_id AND i.id = we.ingredient_id
      WHERE we.tenant_id = ${tenantId}
        AND we.event_id = ${eventId}
        AND we.deleted_at IS NULL
        AND i.deleted_at IS NULL
      GROUP BY i.id, i.name
    `
  );

  let wasteCost = 0;
  for (const waste of wasteEntries) {
    const cost = Number(waste.estimated_cost);
    wasteCost += cost;
    breakdown.push({
      ingredientId: waste.ingredient_id,
      ingredientName: `Waste: ${waste.ingredient_name}`,
      quantity: Number(waste.quantity),
      unit: "waste",
      unitCost: 0,
      totalCost: cost,
      source: "waste",
    });
  }

  return {
    directInventoryUsage,
    recipeBasedCosts,
    wasteCost,
    total: directInventoryUsage + recipeBasedCosts + wasteCost,
    breakdown,
  };
}

/**
 * Calculate labor costs for an event from:
 * 1. Time entries linked to the event (via EventStaffAssignment or direct linkage)
 * 2. EventStaffAssignment with rate calculations
 */
async function calculateLaborCosts(
  prisma: PrismaClient,
  eventId: string,
  tenantId: string
): Promise<EventCostBreakdown["laborCost"]> {
  // First, try to get EventStaffAssignment records for this event
  const staffAssignments = await prisma.$queryRaw<
    Array<{
      id: string;
      employee_id: string;
      first_name: string;
      last_name: string;
      role: string;
      hourly_rate: string;
      estimated_hours: string;
      actual_hours: string;
    }>
  >(
    Prisma.sql`
      SELECT
        esa.id,
        esa.employee_id,
        u.first_name,
        u.last_name,
        u.role,
        COALESCE(u.hourly_rate, 0) as hourly_rate,
        COALESCE(esa.estimated_hours, 0) as estimated_hours,
        COALESCE(esa.actual_hours, 0) as actual_hours
      FROM tenant_events.event_staff_assignments esa
      JOIN tenant_staff.employees u
        ON u.tenant_id = esa.tenant_id AND u.id = esa.employee_id
      WHERE esa.tenant_id = ${tenantId}
        AND esa.event_id = ${eventId}
        AND esa.deleted_at IS NULL
        AND u.deleted_at IS NULL
    `
  );

  // If we have staff assignments, use those
  if (staffAssignments.length > 0) {
    let regularHours = 0;
    let overtimeHours = 0;
    let regularCost = 0;
    let overtimeCost = 0;
    const breakdown: LaborCostItem[] = [];

    for (const assignment of staffAssignments) {
      const hours = Number(assignment.actual_hours) || Number(assignment.estimated_hours) || 0;
      const hourlyRate = Number(assignment.hourly_rate) || 0;
      const ot = Math.max(0, hours - 8); // Overtime after 8 hours
      const reg = Math.max(0, hours - ot);

      regularHours += reg;
      overtimeHours += ot;

      const regCost = reg * hourlyRate;
      const otCost = ot * hourlyRate * 1.5; // 1.5x for overtime

      regularCost += regCost;
      overtimeCost += otCost;

      breakdown.push({
        employeeId: assignment.employee_id,
        employeeName: `${assignment.first_name} ${assignment.last_name}`,
        role: assignment.role,
        hours,
        hourlyRate,
        overtimeHours: ot,
        overtimeRate: hourlyRate * 1.5,
        totalCost: regCost + otCost,
      });
    }

    return {
      regularHours,
      overtimeHours,
      regularCost,
      overtimeCost,
      totalHours: regularHours + overtimeHours,
      totalCost: regularCost + overtimeCost,
      breakdown,
    };
  }

  // Otherwise, try to derive from time entries on the event date/location
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { eventDate: true, locationId: true },
  });

  if (!event) {
    return {
      regularHours: 0,
      overtimeHours: 0,
      regularCost: 0,
      overtimeCost: 0,
      totalHours: 0,
      totalCost: 0,
      breakdown: [],
    };
  }

  // Get time entries for the event date and location
  const timeEntries = await prisma.$queryRaw<
    Array<{
      employee_id: string;
      first_name: string;
      last_name: string;
      role: string;
      hourly_rate: string;
      total_hours: string;
      total_overtime_hours: string;
    }>
  >(
    Prisma.sql`
      SELECT
        te.employee_id,
        u.first_name,
        u.last_name,
        u.role,
        COALESCE(u.hourly_rate, 0) as hourly_rate,
        SUM(
          CASE
            WHEN te.clock_out IS NOT NULL THEN
              EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600.0 -
              COALESCE(te.break_minutes, 0) / 60.0
            ELSE 0
          END
        ) as total_hours,
        SUM(
          CASE
            WHEN te.clock_out IS NOT NULL THEN
              GREATEST(0,
                EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600.0 -
                COALESCE(te.break_minutes, 0) / 60.0 - 8
              )
            ELSE 0
          END
        ) as total_overtime_hours
      FROM tenant_staff.time_entries te
      JOIN tenant_staff.employees u
        ON u.tenant_id = te.tenant_id AND u.id = te.employee_id
      WHERE te.tenant_id = ${tenantId}
        AND te.location_id = ${event.locationId}
        AND DATE(te.clock_in) = ${event.eventDate}
        AND te.deleted_at IS NULL
        AND u.deleted_at IS NULL
      GROUP BY te.employee_id, u.first_name, u.last_name, u.role, u.hourly_rate
    `
  );

  let regularHours = 0;
  let overtimeHours = 0;
  let regularCost = 0;
  let overtimeCost = 0;
  const breakdown: LaborCostItem[] = [];

  for (const entry of timeEntries) {
    const hours = Number(entry.total_hours);
    const ot = Number(entry.total_overtime_hours);
    const reg = hours - ot;
    const hourlyRate = Number(entry.hourly_rate) || 0;

    regularHours += reg;
    overtimeHours += ot;

    const regCost = reg * hourlyRate;
    const otCost = ot * hourlyRate * 1.5;

    regularCost += regCost;
    overtimeCost += otCost;

    breakdown.push({
      employeeId: entry.employee_id,
      employeeName: `${entry.first_name} ${entry.last_name}`,
      role: entry.role,
      hours,
      hourlyRate,
      overtimeHours: ot,
      overtimeRate: hourlyRate * 1.5,
      totalCost: regCost + otCost,
    });
  }

  return {
    regularHours,
    overtimeHours,
    regularCost,
    overtimeCost,
    totalHours: regularHours + overtimeHours,
    totalCost: regularCost + overtimeCost,
    breakdown,
  };
}

/**
 * Calculate overhead allocation based on configurable method
 */
async function calculateOverhead(
  prisma: PrismaClient,
  eventId: string,
  tenantId: string,
  totalCosts: number,
  revenue: number,
  config: OverheadAllocationConfig = DEFAULT_OVERHEAD_CONFIG
): Promise<EventCostBreakdown["overheadCost"]> {
  let baseAllocation = 0;

  switch (config.method) {
    case "percentage":
      if (config.costPercentage) {
        baseAllocation = totalCosts * config.costPercentage;
      } else if (config.revenuePercentage) {
        baseAllocation = revenue * config.revenuePercentage;
      }
      break;

    case "fixed":
      baseAllocation = config.fixedAmount || 0;
      break;

    case "hybrid":
      baseAllocation = config.baseAmount || 0;
      if (config.costThreshold && config.variablePercentage) {
        const variableAmount = Math.max(0, totalCosts - config.costThreshold);
        baseAllocation += variableAmount * config.variablePercentage;
      }
      break;
  }

  // Break down by category
  const breakdown = config.categoryBreakdown || {
    rent: 0.35,
    utilities: 0.20,
    equipment: 0.25,
    administrative: 0.20,
  };

  return {
    rentAllocation: baseAllocation * breakdown.rent,
    utilitiesAllocation: baseAllocation * breakdown.utilities,
    equipmentAllocation: baseAllocation * breakdown.equipment,
    administrativeAllocation: baseAllocation * breakdown.administrative,
    total: baseAllocation,
  };
}

/**
 * Get event revenue from proposals, invoices, or event budget
 */
async function calculateRevenue(
  prisma: PrismaClient,
  eventId: string,
  tenantId: string
): Promise<EventCostBreakdown["revenue"]> {
  // Try to get actual revenue from invoices
  const invoiceResult = await prisma.$queryRaw<
    Array<{ total_revenue: string }>
  >(
    Prisma.sql`
      SELECT COALESCE(SUM(amount_paid), 0) as total_revenue
      FROM tenant_accounting.invoices
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
    `
  );

  const actualRevenue = Number(invoiceResult[0]?.total_revenue || 0);

  // Get expected revenue from proposal or event budget
  const proposalResult = await prisma.$queryRaw<
    Array<{ expected_revenue: string }>
  >(
    Prisma.sql`
      SELECT COALESCE(total, 0) as expected_revenue
      FROM tenant_crm.proposals
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND status IN ('accepted', 'signed')
        AND deleted_at IS NULL
      ORDER BY accepted_at DESC
      LIMIT 1
    `
  );

  let expectedRevenue = Number(proposalResult[0]?.expected_revenue || 0);

  // Fallback to event budget/ticket price * guest count
  if (expectedRevenue === 0) {
    const eventResult = await prisma.$queryRaw<
      Array<{ budget: string; ticket_price: string; guest_count: number }>
    >(
      Prisma.sql`
        SELECT budget, ticket_price, guest_count
        FROM tenant_events.events
        WHERE tenant_id = ${tenantId}
          AND id = ${eventId}
          AND deleted_at IS NULL
      `
    );

    if (eventResult[0]) {
      const budget = Number(eventResult[0].budget || 0);
      const ticketPrice = Number(eventResult[0].ticket_price || 0);
      const guestCount = eventResult[0].guest_count || 0;

      if (ticketPrice > 0 && guestCount > 0) {
        expectedRevenue = ticketPrice * guestCount;
      } else {
        expectedRevenue = budget;
      }
    }
  }

  // Use actual revenue if available, otherwise expected
  const total = actualRevenue > 0 ? actualRevenue : expectedRevenue;

  return {
    expectedRevenue,
    actualRevenue,
    adjustments: 0,
    total,
  };
}

/**
 * Main entry point: Calculate full event profitability
 */
export async function calculateEventProfitability(
  prisma: PrismaClient,
  input: EventProfitabilityInput,
  overheadConfig?: OverheadAllocationConfig
): Promise<EventProfitabilityCalculationResult> {
  const { eventId, tenantId } = input;

  // Get existing budgeted values from EventProfitability record
  const existingProfitability = await prisma.eventProfitability.findFirst({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
  });

  const budgetedRevenue = existingProfitability
    ? Number(existingProfitability.budgetedRevenue)
    : 0;
  const budgetedFoodCost = existingProfitability
    ? Number(existingProfitability.budgetedFoodCost)
    : 0;
  const budgetedLaborCost = existingProfitability
    ? Number(existingProfitability.budgetedLaborCost)
    : 0;
  const budgetedOverhead = existingProfitability
    ? Number(existingProfitability.budgetedOverhead)
    : 0;
  const budgetedTotalCost = existingProfitability
    ? Number(existingProfitability.budgetedTotalCost)
    : 0;
  const budgetedGrossMargin = existingProfitability
    ? Number(existingProfitability.budgetedGrossMargin)
    : 0;
  const budgetedGrossMarginPct = existingProfitability
    ? Number(existingProfitability.budgetedGrossMarginPct)
    : 0;

  // Calculate actual values
  const foodCost = await calculateFoodCosts(prisma, eventId, tenantId);
  const laborCost = await calculateLaborCosts(prisma, eventId, tenantId);
  const revenue = await calculateRevenue(prisma, eventId, tenantId);

  const totalDirectCosts = foodCost.total + laborCost.totalCost;
  const overheadCost = await calculateOverhead(
    prisma,
    eventId,
    tenantId,
    totalDirectCosts,
    revenue.total,
    overheadConfig
  );

  const actualRevenue = revenue.total;
  const actualFoodCost = foodCost.total;
  const actualLaborCost = laborCost.totalCost;
  const actualOverhead = overheadCost.total;
  const actualTotalCost = actualFoodCost + actualLaborCost + actualOverhead;
  const actualGrossMargin = actualRevenue - actualTotalCost;
  const actualGrossMarginPct =
    actualRevenue > 0 ? (actualGrossMargin / actualRevenue) * 100 : 0;

  // Calculate variances
  const revenueVariance = actualRevenue - budgetedRevenue;
  const foodCostVariance = actualFoodCost - budgetedFoodCost;
  const laborCostVariance = actualLaborCost - budgetedLaborCost;
  const totalCostVariance = actualTotalCost - budgetedTotalCost;
  const marginVariancePct = actualGrossMarginPct - budgetedGrossMarginPct;

  // Analysis flags
  const isProfitable = actualGrossMargin > 0;
  const isOverBudget = totalCostVariance > 0;

  // Generate variance explanations
  const varianceExplanations: string[] = [];
  if (foodCostVariance > 0 && Math.abs(foodCostVariance / budgetedFoodCost) > 0.1) {
    const pct = ((foodCostVariance / budgetedFoodCost) * 100).toFixed(1);
    varianceExplanations.push(`Food cost ${pct}% over budget`);
  }
  if (laborCostVariance > 0 && Math.abs(laborCostVariance / budgetedLaborCost) > 0.1) {
    const pct = ((laborCostVariance / budgetedLaborCost) * 100).toFixed(1);
    varianceExplanations.push(`Labor cost ${pct}% over budget`);
  }
  if (revenueVariance < 0 && Math.abs(revenueVariance / budgetedRevenue) > 0.05) {
    const pct = ((revenueVariance / budgetedRevenue) * 100).toFixed(1);
    varianceExplanations.push(`Revenue ${pct}% below budget`);
  }

  return {
    eventId,
    tenantId,

    // Budgeted values
    budgetedRevenue,
    budgetedFoodCost,
    budgetedLaborCost,
    budgetedOverhead,
    budgetedTotalCost,
    budgetedGrossMargin,
    budgetedGrossMarginPct,

    // Actual values
    actualRevenue,
    actualFoodCost,
    actualLaborCost,
    actualOverhead,
    actualTotalCost,
    actualGrossMargin,
    actualGrossMarginPct,

    // Variances
    revenueVariance,
    foodCostVariance,
    laborCostVariance,
    totalCostVariance,
    marginVariancePct,

    // Detailed breakdown
    costBreakdown: {
      foodCost,
      laborCost,
      overheadCost,
      revenue,
    },

    // Analysis flags
    isProfitable,
    isOverBudget,
    varianceExplanations,
  };
}

/**
 * Update EventProfitability record with calculated values
 *
 * NOTE: This should be called from within the Manifest runtime command handler
 * to ensure proper governance and event emission.
 */
export async function updateEventProfitabilityRecord(
  prisma: PrismaClient,
  result: EventProfitabilityCalculationResult
): Promise<void> {
  const existing = await prisma.eventProfitability.findFirst({
    where: {
      tenantId: result.tenantId,
      eventId: result.eventId,
      deletedAt: null,
    },
  });

  const data = {
    budgetedRevenue: result.budgetedRevenue,
    budgetedFoodCost: result.budgetedFoodCost,
    budgetedLaborCost: result.budgetedLaborCost,
    budgetedOverhead: result.budgetedOverhead,
    budgetedTotalCost: result.budgetedTotalCost,
    budgetedGrossMargin: result.budgetedGrossMargin,
    budgetedGrossMarginPct: result.budgetedGrossMarginPct,

    actualRevenue: result.actualRevenue,
    actualFoodCost: result.actualFoodCost,
    actualLaborCost: result.actualLaborCost,
    actualOverhead: result.actualOverhead,
    actualTotalCost: result.actualTotalCost,
    actualGrossMargin: result.actualGrossMargin,
    actualGrossMarginPct: result.actualGrossMarginPct,

    revenueVariance: result.revenueVariance,
    foodCostVariance: result.foodCostVariance,
    laborCostVariance: result.laborCostVariance,
    totalCostVariance: result.totalCostVariance,
    marginVariancePct: result.marginVariancePct,

    calculatedAt: new Date(),
    calculationMethod: "auto",
    notes: result.varianceExplanations.join("; "),
    updatedAt: new Date(),
  };

  if (existing) {
    await prisma.eventProfitability.update({
      where: {
        tenantId_id: {
          tenantId: result.tenantId,
          id: existing.id,
        },
      },
      data,
    });
  } else {
    await prisma.eventProfitability.create({
      data: {
        ...data,
        tenantId: result.tenantId,
        eventId: result.eventId,
      },
    });
  }
}

/**
 * Batch recalculate profitability for multiple events
 */
export async function batchRecalculateEventProfitability(
  prisma: PrismaClient,
  tenantId: string,
  eventIds: string[],
  overheadConfig?: OverheadAllocationConfig
): Promise<{
  successful: string[];
  failed: Array<{ eventId: string; error: string }>;
}> {
  const successful: string[] = [];
  const failed: Array<{ eventId: string; error: string }> = [];

  for (const eventId of eventIds) {
    try {
      const result = await calculateEventProfitability(
        prisma,
        { eventId, tenantId },
        overheadConfig
      );
      await updateEventProfitabilityRecord(prisma, result);
      successful.push(eventId);
    } catch (error) {
      failed.push({
        eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { successful, failed };
}
