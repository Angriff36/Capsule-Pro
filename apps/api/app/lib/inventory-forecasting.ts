/**
 * Inventory Depletion Forecasting Service
 *
 * Analyzes upcoming events to predict inventory usage and calculate depletion dates.
 * Generates reorder alerts and confidence levels for predictions.
 */

import "server-only";
import { database } from "@repo/database";
import { invariant } from "./invariant";

// Types for forecasting
export interface ForecastRequest {
  tenantId: string;
  sku: string;
  horizonDays?: number; // Forecast horizon in days (default: 30)
}

export interface ForecastResult {
  sku: string;
  currentStock: number;
  depletionDate: Date | null;
  daysUntilDepletion: number | null;
  confidence: "high" | "medium" | "low";
  forecast: Array<{
    date: Date;
    projectedStock: number;
    usage: number;
    eventId?: string;
    eventName?: string;
  }>;
}

export interface ReorderSuggestionRequest {
  tenantId: string;
  sku?: string; // If not provided, generates for all low-stock items
  leadTimeDays?: number;
  safetyStockDays?: number;
}

export interface ReorderSuggestionResult {
  sku: string;
  currentStock: number;
  reorderPoint: number;
  recommendedOrderQty: number;
  leadTimeDays: number;
  justification: string;
  urgency: "critical" | "warning" | "info";
}

/**
 * Calculate depletion forecast for an inventory item
 */
export async function calculateDepletionForecast(
  request: ForecastRequest
): Promise<ForecastResult> {
  const { tenantId, sku, horizonDays = 30 } = request;

  invariant(sku, "SKU is required for forecasting");

  // Get current stock level from InventoryItem
  // Note: SKU maps to item_number in the database
  const stockLevel = await database.inventoryItem.findFirst({
    where: {
      tenantId,
      item_number: sku,
      deletedAt: null,
    },
  });

  const currentStock = stockLevel?.quantityOnHand
    ? Number(stockLevel.quantityOnHand)
    : 0;

  // Get the inventory item ID for historical queries
  const itemId = stockLevel?.id ?? "";

  // Get projected usage combining historical data and upcoming events
  const projectedUsage = itemId
    ? await getProjectedUsage(tenantId, itemId, horizonDays)
    : await getProjectedUsageFromEventsOnly(tenantId, sku, horizonDays);

  // Generate forecast points
  const forecast: Array<{
    date: Date;
    projectedStock: number;
    usage: number;
    eventId?: string;
    eventName?: string;
  }> = [];

  let projectedStock = currentStock;
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Calculate depletion date
  let depletionDate: Date | null = null;
  let daysUntilDepletion: number | null = null;

  // Build forecast from projected usage data
  for (const projection of projectedUsage) {
    const dayUsage = projection.usage;
    projectedStock -= dayUsage;

    forecast.push({
      date: projection.date,
      projectedStock: Math.max(0, projectedStock),
      usage: dayUsage,
      eventId: projection.eventId,
      eventName: projection.eventName,
    });

    // Check if depleted
    if (depletionDate === null && projectedStock <= 0) {
      depletionDate = projection.date;
      const timeDiff =
        projection.date.getTime() - currentDate.getTime();
      daysUntilDepletion = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      projectedStock = 0; // Don't go negative
    }
  }

  // Determine confidence level based on data availability
  const confidence = await calculateConfidenceLevel(
    tenantId,
    itemId,
    currentStock,
    projectedUsage
  );

  return {
    sku,
    currentStock,
    depletionDate,
    daysUntilDepletion,
    confidence,
    forecast,
  };
}

/**
 * Generate reorder suggestions for inventory items
 */
export async function generateReorderSuggestions(
  request: ReorderSuggestionRequest
): Promise<ReorderSuggestionResult[]> {
  const { tenantId, sku, leadTimeDays = 7, safetyStockDays = 3 } = request;

  const suggestions: ReorderSuggestionResult[] = [];

  // Get items to check (specific SKU or all low-stock items)
  let skusToCheck: string[] = [];

  if (sku) {
    skusToCheck = [sku];
  } else {
    // Get all items below reorder point
    // Note: SKU maps to item_number, reorderLevel maps to reorder_level
    const lowStockItems = await database.inventoryItem.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        item_number: true,
        quantityOnHand: true,
        reorder_level: true,
      },
    });

    skusToCheck = lowStockItems
      .filter(
        (item) => Number(item.quantityOnHand) <= Number(item.reorder_level)
      )
      .map((item) => item.item_number);
  }

  for (const itemSku of skusToCheck) {
    const suggestion = await calculateReorderSuggestion({
      tenantId,
      sku: itemSku,
      leadTimeDays,
      safetyStockDays,
    });

    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}

/**
 * Helper: Get historical usage for an inventory item from transactions
 */
async function getHistoricalUsage(
  tenantId: string,
  itemId: string,
  daysToLookBack: number
): Promise<{ dailyAverage: number; dataPoints: number; variability: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysToLookBack);

  // Query inventory transactions for historical usage
  // Transaction types: 'use', 'waste', 'adjust' indicate consumption
  const transactions = await database.inventoryTransaction.findMany({
    where: {
      tenantId,
      itemId,
      transactionType: {
        in: ["use", "waste", "adjust"],
      },
      transaction_date: {
        gte: startDate,
        lte: today,
      },
    },
    select: {
      quantity: true,
      transaction_date: true,
    },
    orderBy: {
      transaction_date: "asc",
    },
  });

  if (transactions.length === 0) {
    return { dailyAverage: 0, dataPoints: 0, variability: 0 };
  }

  // Group by day and calculate daily usage
  const dailyUsage = new Map<string, number>();
  for (const t of transactions) {
    const dateKey = t.transaction_date.toISOString().split("T")[0];
    const currentUsage = dailyUsage.get(dateKey) ?? 0;
    dailyUsage.set(dateKey, currentUsage + Math.abs(Number(t.quantity)));
  }

  const dailyValues = Array.from(dailyUsage.values());
  const dataPoints = dailyValues.length;
  const totalUsage = dailyValues.reduce((sum, val) => sum + val, 0);
  const dailyAverage = totalUsage / daysToLookBack;

  // Calculate variability (standard deviation)
  let variability = 0;
  if (dataPoints > 1) {
    const mean = totalUsage / dataPoints;
    const variance =
      dailyValues.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
      dataPoints;
    variability = Math.sqrt(variance);
  }

  return { dailyAverage, dataPoints, variability };
}

/**
 * Helper: Get upcoming events that use an inventory item
 */
async function getUpcomingEventsUsingInventory(
  tenantId: string,
  _sku: string,
  horizonDays: number
): Promise<
  Array<{ eventId: string; eventName: string; startDate: Date; usage: number }>
> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const horizonDate = new Date(today);
  horizonDate.setDate(horizonDate.getDate() + horizonDays);

  // Query events that are happening in the horizon
  const events = await database.event.findMany({
    where: {
      tenantId,
      eventDate: {
        gte: today,
        lte: horizonDate,
      },
      deletedAt: null,
      status: {
        in: ["confirmed", "in_progress", "pending"],
      },
    },
    select: {
      id: true,
      title: true,
      eventDate: true,
      guestCount: true,
    },
  });

  // For each event, estimate usage of this SKU
  // This is a simplified calculation - in production, you'd use actual event menus
  const eventUsage: Array<{
    eventId: string;
    eventName: string;
    startDate: Date;
    usage: number;
  }> = events.map((event) => ({
    eventId: event.id,
    eventName: event.title || `Event ${event.id}`,
    startDate: event.eventDate,
    // Simplified usage calculation: 0.1 units per guest per event
    // In production, this would be based on actual menu items and recipes
    usage: Math.ceil((event.guestCount || 0) * 0.1),
  }));

  return eventUsage;
}

/**
 * Helper: Get projected usage combining historical data and upcoming events
 */
async function getProjectedUsage(
  tenantId: string,
  itemId: string,
  horizonDays: number
): Promise<
  Array<{ date: Date; usage: number; eventId?: string; eventName?: string }>
> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get historical daily average usage
  const historicalData = await getHistoricalUsage(
    tenantId,
    itemId,
    30 // Look back 30 days for historical pattern
  );

  // Get upcoming events
  const events = await getUpcomingEventsUsingInventory(
    tenantId,
    "",
    horizonDays
  );

  // Build projection: baseline historical usage + event-based spikes
  const projection: Array<{
    date: Date;
    usage: number;
    eventId?: string;
    eventName?: string;
  }> = [];

  for (let day = 0; day <= horizonDays; day++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + day);

    // Find events on this day
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.startDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === forecastDate.getTime();
    });

    // Baseline usage from historical data
    let dailyUsage = historicalData.dailyAverage;

    // Add event-based usage
    const eventUsage = dayEvents.reduce((sum, e) => sum + (e.usage || 0), 0);
    dailyUsage += eventUsage;

    projection.push({
      date: forecastDate,
      usage: Math.round(dailyUsage * 100) / 100, // Round to 2 decimal places
      eventId: dayEvents[0]?.eventId,
      eventName: dayEvents[0]?.eventName,
    });
  }

  return projection;
}

/**
 * Helper: Get projected usage from events only (fallback when no itemId)
 */
async function getProjectedUsageFromEventsOnly(
  tenantId: string,
  sku: string,
  horizonDays: number
): Promise<
  Array<{ date: Date; usage: number; eventId?: string; eventName?: string }>
> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get upcoming events
  const events = await getUpcomingEventsUsingInventory(
    tenantId,
    sku,
    horizonDays
  );

  // Build projection from events only
  const projection: Array<{
    date: Date;
    usage: number;
    eventId?: string;
    eventName?: string;
  }> = [];

  for (let day = 0; day <= horizonDays; day++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + day);

    // Find events on this day
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.startDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === forecastDate.getTime();
    });

    const dayUsage = dayEvents.reduce((sum, e) => sum + (e.usage || 0), 0);

    projection.push({
      date: forecastDate,
      usage: dayUsage,
      eventId: dayEvents[0]?.eventId,
      eventName: dayEvents[0]?.eventName,
    });
  }

  return projection;
}

/**
 * Helper: Calculate confidence level for forecast based on historical data
 */
async function calculateConfidenceLevel(
  tenantId: string,
  itemId: string,
  _currentStock: number,
  projectedUsage: Array<{ usage: number }>
): Promise<"high" | "medium" | "low"> {
  // Get historical data for confidence calculation
  const historicalData = await getHistoricalUsage(tenantId, itemId, 30);

  // High confidence: lots of historical data points and low variability
  // Medium confidence: some data or moderate variability
  // Low confidence: little data or high variability

  const { dataPoints, variability, dailyAverage } = historicalData;

  // Calculate coefficient of variation (CV)
  const cv = dailyAverage > 0 ? variability / dailyAverage : 1;

  // Confidence criteria based on data quality
  if (dataPoints >= 20 && cv < 0.3) {
    return "high";
  }
  if (dataPoints >= 10 || cv < 0.5) {
    return "medium";
  }
  return "low";
}

/**
 * Helper: Calculate reorder suggestion for a specific SKU
 */
async function calculateReorderSuggestion(
  request: ReorderSuggestionRequest
): Promise<ReorderSuggestionResult | null> {
  const { tenantId, sku, leadTimeDays = 7, safetyStockDays = 3 } = request;

  // Validate required SKU
  if (!sku) {
    return null;
  }

  // Get current stock and item info from InventoryItem
  // Note: SKU maps to item_number
  const stockLevel = await database.inventoryItem.findFirst({
    where: {
      tenantId,
      item_number: sku,
      deletedAt: null,
    },
  });

  if (!stockLevel) {
    return null;
  }

  const currentStock = Number(stockLevel.quantityOnHand);
  const reorderLevel = Number(stockLevel.reorder_level || 0);

  // Get forecast to determine depletion
  const forecast = await calculateDepletionForecast({
    tenantId,
    sku,
    horizonDays: leadTimeDays + safetyStockDays,
  });

  // Calculate recommended order quantity
  const daysUntilDepletion = forecast.daysUntilDepletion ?? 999;
  const avgDailyUsage =
    forecast.forecast.reduce((sum, f) => sum + f.usage, 0) /
    forecast.forecast.length;

  let recommendedOrderQty = 0;
  let justification = "";
  let urgency: "critical" | "warning" | "info" = "info";

  if (currentStock <= 0) {
    // Stock depleted - urgent
    urgency = "critical";
    recommendedOrderQty = Math.ceil(
      avgDailyUsage * (leadTimeDays + safetyStockDays) * 1.5
    );
    justification = `Stock is depleted (${sku}). Reorder immediately to cover lead time and safety stock.`;
  } else if (daysUntilDepletion <= leadTimeDays) {
    // Will deplete during lead time - urgent
    urgency = "critical";
    recommendedOrderQty = Math.ceil(
      avgDailyUsage * (leadTimeDays + safetyStockDays)
    );
    justification = `Stock will deplete in ${daysUntilDepletion} days, which is within the ${leadTimeDays}-day lead time.`;
  } else if (daysUntilDepletion <= leadTimeDays + safetyStockDays) {
    // Will deplete soon - warning
    urgency = "warning";
    recommendedOrderQty = Math.ceil(avgDailyUsage * safetyStockDays);
    justification = `Stock will deplete in ${daysUntilDepletion} days. Consider ordering to maintain safety stock.`;
  } else if (currentStock <= reorderLevel) {
    // Below reorder point - info
    urgency = "info";
    recommendedOrderQty = Math.ceil((reorderLevel - currentStock) * 1.2);
    justification = `Stock is at reorder level (${currentStock} / ${reorderLevel}).`;
  } else {
    // No immediate action needed
    return null;
  }

  return {
    sku,
    currentStock,
    reorderPoint: reorderLevel,
    recommendedOrderQty,
    leadTimeDays,
    justification,
    urgency,
  };
}

/**
 * Batch forecast calculation for multiple SKUs
 */
export async function batchCalculateForecasts(
  tenantId: string,
  skus: string[],
  horizonDays = 30
): Promise<Map<string, ForecastResult>> {
  invariant(tenantId, "tenantId is required");
  invariant(skus?.length, "skus is required");
  const results = new Map<string, ForecastResult>();

  for (const sku of skus) {
    try {
      const forecast = await calculateDepletionForecast({
        tenantId,
        sku,
        horizonDays,
      });
      results.set(sku, forecast);
    } catch (error) {
      console.error(`Failed to calculate forecast for SKU ${sku}:`, error);
      // Continue with other SKUs
    }
  }

  return results;
}

/**
 * Save forecast results to database
 * Note: Uses findFirst + create/update pattern since there's no unique constraint on tenantId+sku+date
 */
export async function saveForecastToDatabase(
  tenantId: string,
  forecast: ForecastResult
): Promise<void> {
  // Save each forecast point
  for (const point of forecast.forecast) {
    const existing = await database.inventoryForecast.findFirst({
      where: {
        tenantId,
        sku: forecast.sku,
        date: point.date,
      },
    });

    const forecastValue = point.projectedStock;
    const lowerBound = forecastValue * 0.9;
    const upperBound = forecastValue * 1.1;
    let confidenceValue: number;
    if (forecast.confidence === "high") {
      confidenceValue = 0.9;
    } else if (forecast.confidence === "medium") {
      confidenceValue = 0.6;
    } else {
      confidenceValue = 0.3;
    }

    if (existing) {
      await database.inventoryForecast.update({
        where: {
          tenantId_id: {
            tenantId,
            id: existing.id,
          },
        },
        data: {
          forecast: forecastValue,
          lower_bound: lowerBound,
          upper_bound: upperBound,
          confidence: confidenceValue,
          horizon_days: forecast.daysUntilDepletion ?? 30,
          last_updated: new Date(),
        },
      });
    } else {
      await database.inventoryForecast.create({
        data: {
          tenantId,
          sku: forecast.sku,
          date: point.date,
          forecast: forecastValue,
          lower_bound: lowerBound,
          upper_bound: upperBound,
          confidence: confidenceValue,
          horizon_days: forecast.daysUntilDepletion ?? 30,
        },
      });
    }
  }
}

/**
 * Save reorder suggestion to database
 */
export async function saveReorderSuggestionToDatabase(
  tenantId: string,
  suggestion: ReorderSuggestionResult
): Promise<void> {
  await database.reorderSuggestion.create({
    data: {
      tenantId,
      sku: suggestion.sku,
      recommended_order_qty: suggestion.recommendedOrderQty,
      reorder_point: suggestion.reorderPoint,
      safety_stock: suggestion.reorderPoint * 0.5, // 50% of reorder point
      lead_time_days: suggestion.leadTimeDays,
      justification: suggestion.justification,
    },
  });
}
