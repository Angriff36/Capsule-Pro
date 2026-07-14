/**
 * Inventory Depletion Estimation Service
 *
 * Analyzes upcoming events and historical usage to estimate inventory depletion dates.
 * Generates reorder alerts and confidence levels based on data coverage.
 */

import "server-only";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { invariant } from "./invariant";

// Types for forecasting
export interface ForecastRequest {
  horizonDays?: number; // Forecast horizon in days (default: 30)
  sku: string;
  tenantId: string;
}

export interface ForecastResult {
  confidence: "high" | "medium" | "low";
  currentStock: number;
  daysUntilDepletion: number | null;
  depletionDate: Date | null;
  forecast: Array<{
    date: Date;
    projectedStock: number;
    usage: number;
    eventId?: string;
    eventName?: string;
  }>;
  sku: string;
}

export interface ReorderSuggestionRequest {
  leadTimeDays?: number;
  safetyStockDays?: number;
  sku?: string; // If not provided, generates for all low-stock items
  tenantId: string;
}

export interface ReorderSuggestionResult {
  currentStock: number;
  justification: string;
  leadTimeDays: number;
  recommendedOrderQty: number;
  reorderPoint: number;
  sku: string;
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
  let stockLevel;
  try {
    stockLevel = await database.inventoryItem.findFirst({
      where: {
        tenantId,
        item_number: sku,
        deletedAt: null,
      },
    });
  } catch (dbError) {
    log.error(`[calculateDepletionForecast] DB error looking up SKU ${sku}`, {
      error: dbError,
    });
    // Return a safe zero-stock forecast rather than crashing
    return {
      sku,
      currentStock: 0,
      depletionDate: null,
      daysUntilDepletion: null,
      confidence: "low",
      forecast: [],
    };
  }

  const currentStock = stockLevel?.quantityOnHand
    ? Number(stockLevel.quantityOnHand)
    : 0;

  // Get the inventory item ID for historical queries
  const itemId = stockLevel?.id ?? "";

  // Get projected usage combining historical data and upcoming events
  let projectedUsage;
  try {
    projectedUsage = itemId
      ? await getProjectedUsage(tenantId, itemId, horizonDays)
      : await getProjectedUsageFromEventsOnly(tenantId, sku, horizonDays);
  } catch (usageError) {
    log.error(
      `[calculateDepletionForecast] Error getting projected usage for SKU ${sku}`,
      { error: usageError }
    );
    // Return forecast with current stock but no usage projection
    return {
      sku,
      currentStock,
      depletionDate: currentStock > 0 ? null : new Date(),
      daysUntilDepletion: currentStock > 0 ? null : 0,
      confidence: "low",
      forecast: [],
    };
  }

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
      const timeDiff = projection.date.getTime() - currentDate.getTime();
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
    if (!sku.trim()) {
      return suggestions;
    }
    skusToCheck = [sku.trim()];
  } else {
    try {
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
          (item) =>
            item.item_number &&
            item.item_number.trim().length > 0 &&
            Number(item.quantityOnHand) <= Number(item.reorder_level)
        )
        .map((item) => item.item_number);
    } catch (error) {
      log.error(
        "[generateReorderSuggestions] Failed to query inventory items",
        { error }
      );
      return suggestions;
    }
  }

  for (const itemSku of skusToCheck) {
    try {
      const suggestion = await calculateReorderSuggestion({
        tenantId,
        sku: itemSku,
        leadTimeDays,
        safetyStockDays,
      });

      if (suggestion) {
        suggestions.push(suggestion);
      }
    } catch (error) {
      log.error(`[generateReorderSuggestions] Failed for SKU ${itemSku}`, {
        error,
      });
      // Continue with other SKUs
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
      transactionDate: {
        gte: startDate,
        lte: today,
      },
    },
    select: {
      quantity: true,
      transactionDate: true,
    },
    orderBy: {
      transactionDate: "asc",
    },
  });

  if (transactions.length === 0) {
    return { dailyAverage: 0, dataPoints: 0, variability: 0 };
  }

  // Group by day and calculate daily usage
  const dailyUsage = new Map<string, number>();
  for (const t of transactions) {
    const dateKey = t.transactionDate.toISOString().split("T")[0];
    if (!dateKey) {
      continue;
    }
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
      dailyValues.reduce((sum, val) => sum + (val - mean) ** 2, 0) / dataPoints;
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
  // This is a simplified calculation based on guest count
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
  _projectedUsage: Array<{ usage: number }>
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
  let stockLevel;
  try {
    stockLevel = await database.inventoryItem.findFirst({
      where: {
        tenantId,
        item_number: sku,
        deletedAt: null,
      },
    });
  } catch (dbError) {
    log.error(`[calculateReorderSuggestion] DB error looking up SKU ${sku}`, {
      error: dbError,
    });
    return null;
  }

  if (!stockLevel) {
    return null;
  }

  const currentStock = Number(stockLevel.quantityOnHand);
  const reorderLevel = Number(stockLevel.reorder_level || 0);

  // Get forecast to determine depletion
  let forecast;
  try {
    forecast = await calculateDepletionForecast({
      tenantId,
      sku,
      horizonDays: leadTimeDays + safetyStockDays,
    });
  } catch (forecastError) {
    log.error(`[calculateReorderSuggestion] Forecast failed for SKU ${sku}`, {
      error: forecastError,
    });
    // Return null — we can't make a suggestion without forecast data
    return null;
  }

  // Calculate recommended order quantity
  const daysUntilDepletion = forecast.daysUntilDepletion ?? 999;
  const avgDailyUsage =
    forecast.forecast.length > 0
      ? forecast.forecast.reduce((sum, f) => sum + f.usage, 0) /
        forecast.forecast.length
      : 0;

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

  if (!skus || skus.length === 0) {
    return new Map();
  }

  const results = new Map<string, ForecastResult>();

  for (const sku of skus) {
    // Skip empty/null SKUs
    if (!sku || sku.trim().length === 0) {
      log.warn("[batchCalculateForecasts] Skipping empty SKU");
      continue;
    }

    try {
      const forecast = await calculateDepletionForecast({
        tenantId,
        sku: sku.trim(),
        horizonDays,
      });
      results.set(sku, forecast);
    } catch (error) {
      log.error(`Failed to calculate forecast for SKU ${sku}`, { error });
      // Continue with other SKUs — don't let one failure crash the batch
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
  // Resolve the inventory item — the schema requires inventoryItemId on
  // forecasts. Note: SKU maps to item_number in the database.
  const item = await database.inventoryItem.findFirst({
    where: {
      tenantId,
      item_number: forecast.sku,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!item) {
    throw new Error(`Inventory item with SKU ${forecast.sku} not found`);
  }

  // Preload ALL existing forecast rows for this SKU+dates in ONE query
  // (was one findFirst PER point — N sequential reads). Forecast points
  // carry unique dates (one per day-offset in getProjectedUsage), so each
  // date maps to at most one row; first-wins mirrors findFirst's "first
  // match" when duplicate-date rows exist (there is no unique constraint on
  // tenantId+sku+date).
  const points = forecast.forecast;
  const existingByDate = new Map<number, { id: string }>();
  if (points.length > 0) {
    const existingRows = await database.inventoryForecast.findMany({
      where: {
        tenantId,
        sku: forecast.sku,
        date: { in: points.map((p) => p.date) },
      },
      select: { id: true, date: true },
    });
    for (const row of existingRows) {
      const key = row.date.getTime();
      if (!existingByDate.has(key)) {
        existingByDate.set(key, { id: row.id });
      }
    }
  }

  // confidence is constant across all points for this forecast
  const confidenceValue =
    forecast.confidence === "high"
      ? 0.9
      : forecast.confidence === "medium"
        ? 0.6
        : 0.3;

  // Save each forecast point. Writes stay per-point — each carries a
  // distinct projectedQuantity, so the updates cannot be collapsed into one
  // call.
  for (const point of points) {
    const forecastValue = point.projectedStock;
    const existing = existingByDate.get(point.date.getTime());

    if (existing) {
      await database.inventoryForecast.update({
        where: {
          tenantId_id: {
            tenantId,
            id: existing.id,
          },
        },
        data: {
          forecastDate: point.date,
          projectedQuantity: forecastValue,
          confidence: confidenceValue,
        },
      });
    } else {
      await database.inventoryForecast.create({
        data: {
          tenantId,
          sku: forecast.sku,
          inventoryItemId: item.id,
          date: point.date,
          forecastDate: point.date,
          projectedQuantity: forecastValue,
          confidence: confidenceValue,
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
  // Resolve the inventory item — the schema requires inventoryItemId on
  // reorder suggestions. Note: SKU maps to item_number in the database.
  const item = await database.inventoryItem.findFirst({
    where: {
      tenantId,
      item_number: suggestion.sku,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!item) {
    throw new Error(`Inventory item with SKU ${suggestion.sku} not found`);
  }

  await database.reorderSuggestion.create({
    data: {
      tenantId,
      sku: suggestion.sku,
      inventoryItemId: item.id,
      suggestedQuantity: suggestion.recommendedOrderQty,
      reason: suggestion.justification,
    },
  });
}

/**
 * Accuracy Tracking Types
 */
export interface ForecastAccuracyMetrics {
  averageErrorDays: number;
  confidenceHighAccuracy: number;
  confidenceLowAccuracy: number;
  confidenceMediumAccuracy: number;
  meanAbsolutePercentageError: number;
  sku: string;
  totalForecasts: number;
  trackedForecasts: number;
}

/**
 * Track forecast accuracy by recording actual depletion date
 */
export async function trackForecastAccuracy(
  tenantId: string,
  forecastId: string,
  actualDepletionDate: Date
): Promise<void> {
  // Find the forecast
  const forecast = await database.inventoryForecast.findFirst({
    where: {
      tenantId,
      id: forecastId,
    },
  });

  if (!forecast) {
    throw new Error(`Forecast with ID ${forecastId} not found`);
  }

  // Calculate error in days
  const forecastDate = new Date(forecast.date);
  const actualDate = new Date(actualDepletionDate);
  const errorDays = Math.floor(
    (actualDate.getTime() - forecastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // The inventory_forecasts table has no accuracy-tracking columns
  // (actual_depletion_date / error_days / accuracy_tracked do not exist in
  // the truthful schema), so record the outcome in logs only.
  log.info(
    `[trackForecastAccuracy] Actual depletion recorded for forecast ${forecastId}`,
    {
      tenantId,
      forecastId,
      actualDepletionDate: actualDate.toISOString(),
      errorDays,
    }
  );
}

/**
 * Get forecast accuracy metrics for a specific SKU
 */
export async function getForecastAccuracyMetrics(
  tenantId: string,
  sku: string
): Promise<ForecastAccuracyMetrics> {
  // The accuracy-tracking columns (accuracy_tracked / error_days) do not
  // exist in the truthful schema (see trackForecastAccuracy above), so no
  // forecasts can be "tracked" — report totals with zeroed accuracy metrics.
  const forecasts: Array<{ error_days: number | null; confidence: unknown }> =
    [];

  const totalForecasts = await database.inventoryForecast.count({
    where: {
      tenantId,
      sku,
    },
  });

  const trackedForecasts = forecasts.length;

  if (trackedForecasts === 0) {
    return {
      sku,
      totalForecasts,
      trackedForecasts: 0,
      averageErrorDays: 0,
      meanAbsolutePercentageError: 0,
      confidenceHighAccuracy: 0,
      confidenceMediumAccuracy: 0,
      confidenceLowAccuracy: 0,
    };
  }

  // Calculate average error in days
  const totalError = forecasts.reduce((sum, f) => sum + (f.error_days ?? 0), 0);
  const averageErrorDays = Math.abs(totalError / trackedForecasts);

  // Calculate Mean Absolute Percentage Error (MAPE)
  // MAPE = (|Actual - Forecast| / |Actual|) * 100
  // Since we only have error_days, we'll use it as a proxy
  const meanAbsolutePercentageError = (averageErrorDays / 30) * 100; // Assuming 30-day baseline

  // Calculate accuracy by confidence level
  let confidenceHighCount = 0;
  let confidenceHighError = 0;
  let confidenceMediumCount = 0;
  let confidenceMediumError = 0;
  let confidenceLowCount = 0;
  let confidenceLowError = 0;

  for (const forecast of forecasts) {
    const confidenceValue = Number(forecast.confidence);
    const error = Math.abs(forecast.error_days ?? 0);

    if (confidenceValue >= 0.7) {
      confidenceHighCount++;
      confidenceHighError += error;
    } else if (confidenceValue >= 0.4) {
      confidenceMediumCount++;
      confidenceMediumError += error;
    } else {
      confidenceLowCount++;
      confidenceLowError += error;
    }
  }

  const confidenceHighAccuracy =
    confidenceHighCount > 0
      ? Math.max(0, 100 - confidenceHighError / confidenceHighCount)
      : 0;
  const confidenceMediumAccuracy =
    confidenceMediumCount > 0
      ? Math.max(0, 100 - confidenceMediumError / confidenceMediumCount)
      : 0;
  const confidenceLowAccuracy =
    confidenceLowCount > 0
      ? Math.max(0, 100 - confidenceLowError / confidenceLowCount)
      : 0;

  return {
    sku,
    totalForecasts,
    trackedForecasts,
    averageErrorDays,
    meanAbsolutePercentageError,
    confidenceHighAccuracy,
    confidenceMediumAccuracy,
    confidenceLowAccuracy,
  };
}

/**
 * Update confidence calculation based on historical accuracy
 * Returns adjusted confidence level based on past performance
 */
export async function updateConfidenceCalculation(
  tenantId: string,
  sku: string,
  initialConfidence: "high" | "medium" | "low"
): Promise<"high" | "medium" | "low"> {
  // Get accuracy metrics
  const metrics = await getForecastAccuracyMetrics(tenantId, sku);

  // If we don't have enough tracked data, return initial confidence
  if (metrics.trackedForecasts < 5) {
    return initialConfidence;
  }

  // Calculate weighted confidence based on historical accuracy
  const accuracyWeight = 0.3; // Weight for historical accuracy
  const initialWeight = 0.7; // Weight for initial calculation

  let confidenceScore: number;

  switch (initialConfidence) {
    case "high":
      confidenceScore = 0.9;
      break;
    case "medium":
      confidenceScore = 0.6;
      break;
    case "low":
      confidenceScore = 0.3;
      break;
    default:
      confidenceScore = 0.5;
      break;
  }

  // Calculate average accuracy across all confidence levels
  const avgAccuracy =
    (metrics.confidenceHighAccuracy * 2 +
      metrics.confidenceMediumAccuracy +
      metrics.confidenceLowAccuracy * 0.5) /
    3.5;

  // Adjust confidence score based on historical accuracy
  const adjustedScore =
    confidenceScore * initialWeight + (avgAccuracy / 100) * accuracyWeight;

  // Convert back to confidence level
  if (adjustedScore >= 0.7) {
    return "high";
  }
  if (adjustedScore >= 0.4) {
    return "medium";
  }
  return "low";
}

/**
 * Get forecast accuracy summary for all items
 */
export async function getAccuracySummary(
  tenantId: string
): Promise<ForecastAccuracyMetrics[]> {
  // Get all SKUs with forecasts
  const skus = await database.inventoryForecast.findMany({
    where: {
      tenantId,
    },
    select: {
      sku: true,
    },
    distinct: ["sku"],
  });

  const metrics: ForecastAccuracyMetrics[] = [];

  for (const { sku } of skus) {
    const skuMetrics = await getForecastAccuracyMetrics(tenantId, sku);
    metrics.push(skuMetrics);
  }

  // Sort by tracked forecasts descending, then by error ascending
  metrics.sort((a, b) => {
    if (a.trackedForecasts !== b.trackedForecasts) {
      return b.trackedForecasts - a.trackedForecasts;
    }
    return a.averageErrorDays - b.averageErrorDays;
  });

  return metrics;
}
