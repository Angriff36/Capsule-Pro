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

  // Get current stock level
  const stockLevel = await database.inventoryStock.findFirst({
    where: {
      tenantId,
      sku,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  });

  const currentStock = stockLevel?.quantity ?? 0;

  // Get upcoming events that use this inventory item
  const events = await getUpcomingEventsUsingInventory(tenantId, sku, horizonDays);

  // Calculate daily usage pattern
  const dailyUsage = calculateDailyUsage(events, currentStock);

  // Generate forecast points
  const forecast: Array<{
    date: Date;
    projectedStock: number;
    usage: number;
    eventId?: string;
    eventName?: string;
  }> = [];

  let projectedStock = currentStock;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Calculate depletion date
  let depletionDate: Date | null = null;
  let daysUntilDepletion: number | null = null;

  for (let day = 0; day <= horizonDays; day++) {
    const forecastDate = new Date(currentDate);
    forecastDate.setDate(forecastDate.getDate() + day);

    // Find events on this day
    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.startDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === forecastDate.getTime();
    });

    const dayUsage = dayEvents.reduce((sum, event) => sum + (event.usage || 0), 0);
    projectedStock -= dayUsage;

    forecast.push({
      date: forecastDate,
      projectedStock: Math.max(0, projectedStock),
      usage: dayUsage,
      eventId: dayEvents[0]?.eventId,
      eventName: dayEvents[0]?.eventName,
    });

    // Check if depleted
    if (depletionDate === null && projectedStock <= 0) {
      depletionDate = forecastDate;
      daysUntilDepletion = day;
      projectedStock = 0; // Don't go negative
    }
  }

  // Determine confidence level
  const confidence = calculateConfidenceLevel(currentStock, events, horizonDays);

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
    const lowStockItems = await database.inventoryStock.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
    });

    skusToCheck = lowStockItems
      .filter((item) => item.quantity <= (item.reorderLevel || 0))
      .map((item) => item.sku);
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
 * Helper: Get upcoming events that use an inventory item
 */
async function getUpcomingEventsUsingInventory(
  tenantId: string,
  sku: string,
  horizonDays: number
): Promise<Array<{ eventId: string; eventName: string; startDate: Date; usage: number }>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const horizonDate = new Date(today);
  horizonDate.setDate(horizonDate.getDate() + horizonDays);

  // Query events that are happening in the horizon
  const events = await database.event.findMany({
    where: {
      tenantId,
      startDate: {
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
      startDate: true,
      guestCount: true,
    },
  });

  // For each event, estimate usage of this SKU
  // This is a simplified calculation - in production, you'd use actual event menus
  const eventUsage: Array<{ eventId: string; eventName: string; startDate: Date; usage: number }> =
    events.map((event) => ({
      eventId: event.id,
      eventName: event.title || `Event ${event.id}`,
      startDate: event.startDate,
      // Simplified usage calculation: 0.1 units per guest per event
      // In production, this would be based on actual menu items and recipes
      usage: Math.ceil((event.guestCount || 0) * 0.1),
    }));

  return eventUsage;
}

/**
 * Helper: Calculate daily usage pattern
 */
function calculateDailyUsage(
  events: Array<{ startDate: Date; usage: number }>,
  currentStock: number
): number {
  if (events.length === 0) {
    return 0;
  }

  const totalUsage = events.reduce((sum, event) => sum + event.usage, 0);
  return totalUsage / Math.max(1, events.length);
}

/**
 * Helper: Calculate confidence level for forecast
 */
function calculateConfidenceLevel(
  currentStock: number,
  events: Array<{ usage: number }>,
  horizonDays: number
): "high" | "medium" | "low" {
  // High confidence: lots of historical data, stable usage pattern
  // Medium confidence: some data, some variability
  // Low confidence: little data, high variability

  const dataPoints = events.length;
  const totalUsage = events.reduce((sum, e) => sum + e.usage, 0);
  const avgUsage = dataPoints > 0 ? totalUsage / dataPoints : 0;

  // Calculate variability (standard deviation)
  const variance =
    dataPoints > 1
      ? events.reduce((sum, e) => sum + Math.pow(e.usage - avgUsage, 2), 0) / dataPoints
      : 0;
  const variability = Math.sqrt(variance);

  // Confidence criteria
  if (dataPoints >= 10 && variability < avgUsage * 0.2) {
    return "high";
  } else if (dataPoints >= 5 || variability < avgUsage * 0.5) {
    return "medium";
  } else {
    return "low";
  }
}

/**
 * Helper: Calculate reorder suggestion for a specific SKU
 */
async function calculateReorderSuggestion(
  request: ReorderSuggestionRequest
): Promise<ReorderSuggestionResult | null> {
  const { tenantId, sku, leadTimeDays, safetyStockDays } = request;

  // Get current stock and item info
  const stockLevel = await database.inventoryStock.findFirst({
    where: {
      tenantId,
      sku,
      deletedAt: null,
    },
  });

  if (!stockLevel) {
    return null;
  }

  const currentStock = stockLevel.quantity;
  const reorderLevel = stockLevel.reorderLevel || 0;

  // Get forecast to determine depletion
  const forecast = await calculateDepletionForecast({
    tenantId,
    sku,
    horizonDays: leadTimeDays + safetyStockDays,
  });

  // Calculate recommended order quantity
  const daysUntilDepletion = forecast.daysUntilDepletion ?? 999;
  const avgDailyUsage = forecast.forecast.reduce((sum, f) => sum + f.usage, 0) / forecast.forecast.length;

  let recommendedOrderQty = 0;
  let justification = "";
  let urgency: "critical" | "warning" | "info" = "info";

  if (currentStock <= 0) {
    // Stock depleted - urgent
    urgency = "critical";
    recommendedOrderQty = Math.ceil(avgDailyUsage * (leadTimeDays + safetyStockDays) * 1.5);
    justification = `Stock is depleted (${sku}). Reorder immediately to cover lead time and safety stock.`;
  } else if (daysUntilDepletion <= leadTimeDays) {
    // Will deplete during lead time - urgent
    urgency = "critical";
    recommendedOrderQty = Math.ceil(avgDailyUsage * (leadTimeDays + safetyStockDays));
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
  horizonDays: number = 30
): Promise<Map<string, ForecastResult>> {
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
 */
export async function saveForecastToDatabase(
  tenantId: string,
  forecast: ForecastResult
): Promise<void> {
  // Save each forecast point
  for (const point of forecast.forecast) {
    await database.inventoryForecast.upsert({
      where: {
        tenantId_sku_date: {
          tenantId,
          sku: forecast.sku,
          date: point.date,
        },
      },
      create: {
        tenantId,
        sku: forecast.sku,
        date: point.date,
        forecast: point.projectedStock,
        lower_bound: point.projectedStock * 0.9, // 90% confidence
        upper_bound: point.projectedStock * 1.1, // 110% confidence
        confidence: forecast.confidence === "high" ? 0.9 : forecast.confidence === "medium" ? 0.6 : 0.3,
        horizon_days: forecast.daysUntilDepletion ?? 30,
      },
      update: {
        forecast: point.projectedStock,
        lower_bound: point.projectedStock * 0.9,
        upper_bound: point.projectedStock * 1.1,
        confidence: forecast.confidence === "high" ? 0.9 : forecast.confidence === "medium" ? 0.6 : 0.3,
        horizon_days: forecast.daysUntilDepletion ?? 30,
        last_updated: new Date(),
      },
    });
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
