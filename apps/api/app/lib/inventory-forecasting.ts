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

interface EventUsage {
  eventId: string;
  eventName: string;
  startDate: Date;
  usage: number;
}

interface HistoricalUsage {
  dailyAverage: number;
  dataPoints: number;
  variability: number;
}

interface ProjectedUsagePoint {
  date: Date;
  eventId?: string;
  eventName?: string;
  usage: number;
}

/**
 * Structural stand-in for DecimalLike — the generated client returns Decimal
 * for numeric columns (quantityOnHand, quantity, reorder_level). Kept structural
 * (toNumber + toString, both of which DecimalLike implements) so this module
 * need not import the Prisma namespace purely for a type annotation. `Number()`
 * accepts it.
 */
interface DecimalLike {
  toNumber(): number;
  toString(): string;
}

/**
 * Pure fold over per-day transaction usage: sum |quantity| per ISO day,
 * dailyAverage = total / lookback window, stddev variability. Extracted from
 * the prior per-query getHistoricalUsage so the batch path can run it over
 * pre-fetched rows instead of one query per item. Byte-identical math.
 */
function computeHistoricalUsage(
  transactions: readonly {
    quantity: DecimalLike;
    transactionDate: Date;
  }[],
  daysToLookBack: number
): HistoricalUsage {
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
 * Pure projection: for each day in the horizon, baseline historical daily
 * average + event-driven usage. Identical to the prior getProjectedUsage loop.
 * When dailyAverage is 0 this equals the old events-only path, so the no-item
 * case is preserved without a separate branch.
 */
function buildProjectedUsage(
  historicalData: HistoricalUsage,
  events: readonly EventUsage[],
  horizonDays: number
): ProjectedUsagePoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const projection: ProjectedUsagePoint[] = [];

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
 * Walk a projection subtracting daily usage from stock; the first day
 * projected stock drops to <= 0 is the depletion date. Builds the per-day
 * forecast point array (projectedStock clamped to >= 0). Byte-identical to
 * the prior inline loop; shared by the single-SKU and batch paths.
 */
function buildForecastPoints(
  currentStock: number,
  projectedUsage: readonly ProjectedUsagePoint[]
): {
  forecast: ForecastResult["forecast"];
  depletionDate: Date | null;
  daysUntilDepletion: number | null;
} {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const forecast: ForecastResult["forecast"] = [];
  let projectedStock = currentStock;
  let depletionDate: Date | null = null;
  let daysUntilDepletion: number | null = null;

  for (const projection of projectedUsage) {
    projectedStock -= projection.usage;

    forecast.push({
      date: projection.date,
      projectedStock: Math.max(0, projectedStock),
      usage: projection.usage,
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

  return { forecast, depletionDate, daysUntilDepletion };
}

/**
 * Pure confidence classification from historical usage stats. Identical to the
 * prior calculateConfidenceLevel thresholds.
 */
function computeConfidence(
  historicalData: HistoricalUsage
): "high" | "medium" | "low" {
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
 * Calculate depletion forecast for an inventory item
 */
export async function calculateDepletionForecast(
  request: ForecastRequest
): Promise<ForecastResult> {
  const { tenantId, sku, horizonDays = 30 } = request;

  invariant(sku, "SKU is required for forecasting");

  // Get current stock level from InventoryItem
  // Note: SKU maps to item_number in the database
  let stockLevel: {
    id: string;
    quantityOnHand: DecimalLike | null;
  } | null;
  try {
    stockLevel = await database.inventoryItem.findFirst({
      where: {
        tenantId,
        item_number: sku,
        deletedAt: null,
      },
      select: { id: true, quantityOnHand: true },
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

  // Fetch historical usage (once) + tenant-wide events (once) in parallel.
  // The original fetched historical usage twice — once inside getProjectedUsage
  // and again inside calculateConfidenceLevel with identical args. Computing it
  // once and reusing for both projection and confidence halves the per-SKU read
  // cost; the pure helpers keep the math byte-identical.
  let historicalData: HistoricalUsage = {
    dailyAverage: 0,
    dataPoints: 0,
    variability: 0,
  };
  let events: EventUsage[] = [];
  try {
    const upcomingEvents = getUpcomingEventsUsingInventory(
      tenantId,
      horizonDays
    );
    if (itemId) {
      [historicalData, events] = await Promise.all([
        getHistoricalUsage(tenantId, itemId, 30),
        upcomingEvents,
      ]);
    } else {
      // No resolved item: dailyAverage stays 0, so buildProjectedUsage produces
      // the events-only projection the original returned for unknown SKUs.
      events = await upcomingEvents;
    }
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

  const projectedUsage = buildProjectedUsage(
    historicalData,
    events,
    horizonDays
  );
  const { forecast, depletionDate, daysUntilDepletion } = buildForecastPoints(
    currentStock,
    projectedUsage
  );

  // Determine confidence level based on data availability (pure — reuses the
  // already-fetched historical data, no second read)
  const confidence = computeConfidence(historicalData);

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
 *
 * Batches the forecast for every candidate SKU in ONE pass via
 * `batchCalculateForecasts` (3 constant reads) instead of forecasting each SKU
 * separately. The per-SKU reorder math is pure (`computeReorderSuggestion`) and
 * runs over the batched forecasts plus a single candidate findMany, so the whole
 * call is constant in DB rounds regardless of how many items are below reorder.
 */
export async function generateReorderSuggestions(
  request: ReorderSuggestionRequest
): Promise<ReorderSuggestionResult[]> {
  const { tenantId, sku, leadTimeDays = 7, safetyStockDays = 3 } = request;

  if (sku && !sku.trim()) {
    return [];
  }

  // Resolve candidate items + their stock/reorder level in ONE findMany. The
  // prior per-SKU path re-fetched each item inside `calculateReorderSuggestion`
  // (and a third time inside `calculateDepletionForecast`) — redundant once the
  // forecast is batched.
  let items: Array<{
    item_number: string | null;
    quantityOnHand: DecimalLike | null;
    reorder_level: DecimalLike | null;
  }>;
  try {
    items = await database.inventoryItem.findMany({
      where: {
        tenantId,
        ...(sku ? { item_number: sku.trim() } : {}),
        deletedAt: null,
      },
      select: {
        item_number: true,
        quantityOnHand: true,
        reorder_level: true,
      },
    });
  } catch (error) {
    log.error("[generateReorderSuggestions] Failed to query inventory items", {
      error,
    });
    return [];
  }

  // No-SKU mode pre-filters to low-stock items (as before) to keep the forecast
  // batch small; single-SKU mode checks the one requested item. First-wins per
  // item_number mirrors findFirst's "first match" if an item_number duplicates.
  const stockBySku = new Map<
    string,
    { quantityOnHand: DecimalLike | null; reorder_level: DecimalLike | null }
  >();
  const skusToCheck: string[] = [];
  for (const item of items) {
    const itemSku = item.item_number;
    if (!itemSku || itemSku.trim().length === 0 || stockBySku.has(itemSku)) {
      continue;
    }
    if (!sku && Number(item.quantityOnHand) > Number(item.reorder_level)) {
      continue;
    }
    stockBySku.set(itemSku, {
      quantityOnHand: item.quantityOnHand,
      reorder_level: item.reorder_level,
    });
    skusToCheck.push(itemSku);
  }

  if (skusToCheck.length === 0) {
    return [];
  }

  // Batch the forecast for ALL candidates in 3 constant reads (was up to ~4
  // reads PER SKU: per-SKU item lookup + forecast's item lookup + the
  // historical-usage read + the tenant-wide events read).
  const forecasts = await batchCalculateForecasts(
    tenantId,
    skusToCheck,
    leadTimeDays + safetyStockDays
  );

  const suggestions: ReorderSuggestionResult[] = [];
  for (const itemSku of skusToCheck) {
    const stock = stockBySku.get(itemSku);
    const forecast = forecasts.get(itemSku);
    if (!(stock && forecast)) {
      continue;
    }
    const suggestion = computeReorderSuggestion({
      sku: itemSku,
      currentStock: Number(stock.quantityOnHand),
      reorderLevel: Number(stock.reorder_level || 0),
      forecast,
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
): Promise<HistoricalUsage> {
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

  return computeHistoricalUsage(transactions, daysToLookBack);
}

/**
 * Helper: Get upcoming events that use an inventory item
 */
async function getUpcomingEventsUsingInventory(
  tenantId: string,
  horizonDays: number
): Promise<EventUsage[]> {
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
 * Pure reorder-suggestion math from a pre-fetched forecast + stock level.
 * Extracted from the prior per-SKU `calculateReorderSuggestion` (which did its
 * own findFirst + forecast fetch) so the batched `generateReorderSuggestions`
 * path can reuse it without a per-SKU DB read. Thresholds + justifications are
 * byte-identical to the original.
 */
function computeReorderSuggestion(args: {
  sku: string;
  currentStock: number;
  reorderLevel: number;
  forecast: ForecastResult;
  leadTimeDays: number;
  safetyStockDays: number;
}): ReorderSuggestionResult | null {
  const {
    sku,
    currentStock,
    reorderLevel,
    forecast,
    leadTimeDays,
    safetyStockDays,
  } = args;

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

  // Skip empties (mirrors the prior per-SKU guard) and de-dupe the lookup keys.
  const skusToForecast = skus.filter((sku) => sku && sku.trim().length > 0);
  if (skusToForecast.length === 0) {
    return new Map();
  }
  if (skusToForecast.length < skus.length) {
    log.warn("[batchCalculateForecasts] Skipping empty SKU(s)");
  }
  const lookupSkus = [...new Set(skusToForecast.map((sku) => sku.trim()))];

  // BATCH READ 1 — stock levels for EVERY requested SKU in ONE query (was one
  // findFirst PER SKU). first-wins mirrors findFirst's "first match" if an
  // item_number ever duplicates within a tenant.
  const items = await database.inventoryItem.findMany({
    where: {
      tenantId,
      item_number: { in: lookupSkus },
      deletedAt: null,
    },
    select: {
      id: true,
      item_number: true,
      quantityOnHand: true,
    },
  });
  const stockBySku = new Map<
    string,
    { id: string; quantityOnHand: DecimalLike | null }
  >();
  for (const item of items) {
    if (item.item_number && !stockBySku.has(item.item_number)) {
      stockBySku.set(item.item_number, {
        id: item.id,
        quantityOnHand: item.quantityOnHand,
      });
    }
  }

  // BATCH READ 2 — tenant-wide upcoming events. Identical for every SKU (the
  // prior per-SKU loop re-fetched the exact same set N times; the SKU param was
  // unused).
  const events = await getUpcomingEventsUsingInventory(tenantId, horizonDays);

  // BATCH READ 3 — historical transactions for ALL resolved items in ONE query
  // (was 2 queries PER SKU — once for projection, once for confidence, with
  // identical args). Grouped by itemId for the pure per-SKU fold.
  const itemIds = [...new Set([...stockBySku.values()].map((v) => v.id))];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  const transactionsByItem = new Map<
    string,
    { quantity: DecimalLike; transactionDate: Date }[]
  >();
  if (itemIds.length > 0) {
    const transactions = await database.inventoryTransaction.findMany({
      where: {
        tenantId,
        itemId: { in: itemIds },
        transactionType: { in: ["use", "waste", "adjust"] },
        transactionDate: {
          gte: startDate,
          lte: today,
        },
      },
      select: {
        quantity: true,
        transactionDate: true,
        itemId: true,
      },
    });
    for (const t of transactions) {
      const rows = transactionsByItem.get(t.itemId);
      if (rows) {
        rows.push({ quantity: t.quantity, transactionDate: t.transactionDate });
      } else {
        transactionsByItem.set(t.itemId, [
          { quantity: t.quantity, transactionDate: t.transactionDate },
        ]);
      }
    }
  }

  // Per-SKU pure computation over the shared Maps — NO further DB reads.
  // 1 + 4N reads collapse to 3 (items + events + transactions), independent of
  // SKU count; the per-SKU math is byte-identical to calculateDepletionForecast.
  const results = new Map<string, ForecastResult>();
  for (const sku of skusToForecast) {
    const trimmedSku = sku.trim();
    const stock = stockBySku.get(trimmedSku);
    const currentStock = stock?.quantityOnHand
      ? Number(stock.quantityOnHand)
      : 0;
    const itemId = stock?.id ?? "";

    // No resolved item ⇒ dailyAverage 0 ⇒ buildProjectedUsage yields the
    // events-only projection calculateDepletionForecast returned for unknown SKUs.
    const historicalData = itemId
      ? computeHistoricalUsage(transactionsByItem.get(itemId) ?? [], 30)
      : { dailyAverage: 0, dataPoints: 0, variability: 0 };

    const projectedUsage = buildProjectedUsage(
      historicalData,
      events,
      horizonDays
    );
    const { forecast, depletionDate, daysUntilDepletion } = buildForecastPoints(
      currentStock,
      projectedUsage
    );
    const confidence = computeConfidence(historicalData);

    // Key by the original (untrimmed) SKU to match the prior per-SKU loop; the
    // forecast.sku field carries the trimmed value calculateDepletionForecast used.
    results.set(sku, {
      sku: trimmedSku,
      currentStock,
      depletionDate,
      daysUntilDepletion,
      confidence,
      forecast,
    });
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

  // Save each forecast point. Each carries a distinct projectedQuantity, so
  // the writes cannot collapse into one updateMany/createMany — but every
  // point is an independent row (distinct id for updates, distinct date for
  // creates), so they fire in ONE concurrent wave instead of N serial
  // round-trips (~30 points/SKU → 1 wave). Raw Prisma (not governed) →
  // concurrent-safe; there is no $transaction here, so the partial-on-failure
  // semantics are unchanged by parallelizing.
  await Promise.all(
    points.map((point) => {
      const forecastValue = point.projectedStock;
      const existing = existingByDate.get(point.date.getTime());

      if (existing) {
        return database.inventoryForecast.update({
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
      }

      return database.inventoryForecast.create({
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
    })
  );
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
  // The accuracy-tracking columns (accuracy_tracked / error_days) do not exist
  // in the truthful schema (see trackForecastAccuracy / getForecastAccuracyMetrics),
  // so every SKU's accuracy metrics are zero — only totalForecasts (the per-SKU
  // row count) and sku vary. ONE groupBy replaces the prior N+1 (a distinct-sku
  // findMany + one count PER SKU via getForecastAccuracyMetrics).
  const groups = await database.inventoryForecast.groupBy({
    by: ["sku"],
    where: { tenantId },
    _count: { _all: true },
  });

  const metrics: ForecastAccuracyMetrics[] = groups.map((group) => ({
    sku: group.sku,
    totalForecasts: group._count._all,
    trackedForecasts: 0,
    averageErrorDays: 0,
    meanAbsolutePercentageError: 0,
    confidenceHighAccuracy: 0,
    confidenceMediumAccuracy: 0,
    confidenceLowAccuracy: 0,
  }));

  // Preserve the prior sort (trackedForecasts desc, then averageErrorDays asc).
  // All trackedForecasts/averageErrorDays are 0, so this is order-stable.
  metrics.sort((a, b) => {
    if (a.trackedForecasts !== b.trackedForecasts) {
      return b.trackedForecasts - a.trackedForecasts;
    }
    return a.averageErrorDays - b.averageErrorDays;
  });

  return metrics;
}
