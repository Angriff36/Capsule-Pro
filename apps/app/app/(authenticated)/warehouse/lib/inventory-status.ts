/**
 * Inventory status calculation utilities for the warehouse dashboard.
 * Calculates stock health, days until reorder, and alert levels.
 */

import { invariant } from "@/app/lib/invariant";

export type StockHealthStatus = "healthy" | "low" | "critical" | "out_of_stock";

export interface InventoryItemStatus {
  status: StockHealthStatus;
  daysUntilReorder: number | null;
  percentageOfReorderLevel: number;
}

export interface StockHealthConfig {
  criticalThresholdPercent: number; // Below this % of reorder level = critical
  lowThresholdPercent: number; // Below this % of reorder level = low
}

const DEFAULT_CONFIG: StockHealthConfig = {
  criticalThresholdPercent: 50, // Below 50% of reorder level = critical
  lowThresholdPercent: 100, // At or below reorder level = low
};

/**
 * Calculate the stock health status for an inventory item.
 */
export function getStockHealthStatus(
  quantityOnHand: number,
  reorderLevel: number,
  config: StockHealthConfig = DEFAULT_CONFIG
): StockHealthStatus {
  invariant(quantityOnHand >= 0, "quantityOnHand cannot be negative");
  invariant(reorderLevel >= 0, "reorderLevel cannot be negative");

  if (quantityOnHand === 0) {
    return "out_of_stock";
  }

  if (reorderLevel === 0) {
    // If no reorder level is set, treat any stock as healthy
    return "healthy";
  }

  const percentOfReorder = (quantityOnHand / reorderLevel) * 100;

  if (percentOfReorder <= config.criticalThresholdPercent) {
    return "critical";
  }

  if (percentOfReorder <= config.lowThresholdPercent) {
    return "low";
  }

  return "healthy";
}

/**
 * Calculate estimated days until reorder is needed based on daily usage.
 */
export function calculateDaysUntilReorder(
  quantityOnHand: number,
  reorderLevel: number,
  dailyUsage: number
): number | null {
  invariant(quantityOnHand >= 0, "quantityOnHand cannot be negative");
  invariant(reorderLevel >= 0, "reorderLevel cannot be negative");
  invariant(dailyUsage >= 0, "dailyUsage cannot be negative");

  if (dailyUsage === 0) {
    return null; // Cannot estimate without usage data
  }

  const unitsUntilReorder = quantityOnHand - reorderLevel;

  if (unitsUntilReorder <= 0) {
    return 0; // Already at or below reorder level
  }

  return Math.floor(unitsUntilReorder / dailyUsage);
}

/**
 * Get the complete inventory status for an item.
 */
export function getInventoryItemStatus(
  quantityOnHand: number,
  reorderLevel: number,
  dailyUsage = 0,
  config: StockHealthConfig = DEFAULT_CONFIG
): InventoryItemStatus {
  const status = getStockHealthStatus(quantityOnHand, reorderLevel, config);
  const daysUntilReorder = calculateDaysUntilReorder(
    quantityOnHand,
    reorderLevel,
    dailyUsage
  );

  const percentageOfReorderLevel =
    reorderLevel > 0 ? (quantityOnHand / reorderLevel) * 100 : 100;

  return {
    status,
    daysUntilReorder,
    percentageOfReorderLevel: Math.round(percentageOfReorderLevel),
  };
}

/**
 * Badge variant mapping for stock health status.
 */
export const stockHealthBadgeVariants: Record<
  StockHealthStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  healthy: "default",
  low: "secondary",
  critical: "destructive",
  out_of_stock: "destructive",
};

/**
 * Human-readable labels for stock health status.
 */
export const stockHealthLabels: Record<StockHealthStatus, string> = {
  healthy: "Healthy",
  low: "Low Stock",
  critical: "Critical",
  out_of_stock: "Out of Stock",
};

/**
 * Calculate aggregate metrics for a set of inventory items.
 */
export function calculateInventoryMetrics(
  items: Array<{ quantityOnHand: number; reorderLevel: number }>
): {
  totalItems: number;
  healthyCount: number;
  lowCount: number;
  criticalCount: number;
  outOfStockCount: number;
  healthPercentage: number;
} {
  let healthyCount = 0;
  let lowCount = 0;
  let criticalCount = 0;
  let outOfStockCount = 0;

  for (const item of items) {
    const status = getStockHealthStatus(item.quantityOnHand, item.reorderLevel);
    switch (status) {
      case "healthy":
        healthyCount++;
        break;
      case "low":
        lowCount++;
        break;
      case "critical":
        criticalCount++;
        break;
      case "out_of_stock":
        outOfStockCount++;
        break;
      default: {
        const _exhaustive: never = status;
        throw new Error(`Unexpected status: ${_exhaustive}`);
      }
    }
  }

  const totalItems = items.length;
  const healthPercentage =
    totalItems > 0 ? Math.round((healthyCount / totalItems) * 100) : 100;

  return {
    totalItems,
    healthyCount,
    lowCount,
    criticalCount,
    outOfStockCount,
    healthPercentage,
  };
}
