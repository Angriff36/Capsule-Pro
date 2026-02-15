import { describe, expect, it } from "vitest";
import {
  calculateDaysUntilReorder,
  calculateInventoryMetrics,
  getInventoryItemStatus,
  getStockHealthStatus,
  stockHealthBadgeVariants,
  stockHealthLabels,
} from "../app/(authenticated)/warehouse/lib/inventory-status";

describe("getStockHealthStatus", () => {
  it("returns 'out_of_stock' when quantity is 0", () => {
    expect(getStockHealthStatus(0, 100)).toBe("out_of_stock");
    expect(getStockHealthStatus(0, 0)).toBe("out_of_stock");
  });

  it("returns 'healthy' when no reorder level is set", () => {
    expect(getStockHealthStatus(50, 0)).toBe("healthy");
    expect(getStockHealthStatus(1, 0)).toBe("healthy");
  });

  it("returns 'critical' when stock is below 50% of reorder level", () => {
    expect(getStockHealthStatus(40, 100)).toBe("critical");
    expect(getStockHealthStatus(49, 100)).toBe("critical");
  });

  it("returns 'low' when stock is at or below reorder level but above critical", () => {
    // 51% is above critical (50%) but below or at reorder level (100%)
    expect(getStockHealthStatus(51, 100)).toBe("low");
    expect(getStockHealthStatus(75, 100)).toBe("low");
    expect(getStockHealthStatus(100, 100)).toBe("low");
  });

  it("returns 'healthy' when stock is above reorder level", () => {
    expect(getStockHealthStatus(150, 100)).toBe("healthy");
    expect(getStockHealthStatus(101, 100)).toBe("healthy");
  });

  it("throws for negative quantities", () => {
    expect(() => getStockHealthStatus(-1, 100)).toThrow(
      "quantityOnHand cannot be negative"
    );
  });

  it("throws for negative reorder level", () => {
    expect(() => getStockHealthStatus(100, -1)).toThrow(
      "reorderLevel cannot be negative"
    );
  });

  it("respects custom config thresholds", () => {
    const config = { criticalThresholdPercent: 25, lowThresholdPercent: 75 };
    // 20% of 100 = 20, which is below 25% critical threshold
    expect(getStockHealthStatus(20, 100, config)).toBe("critical");
    // 50% of 100 = 50, which is below 75% low threshold but above 25% critical
    expect(getStockHealthStatus(50, 100, config)).toBe("low");
    // 80% of 100 = 80, which is above 75% low threshold
    expect(getStockHealthStatus(80, 100, config)).toBe("healthy");
  });
});

describe("calculateDaysUntilReorder", () => {
  it("returns null when daily usage is 0", () => {
    expect(calculateDaysUntilReorder(100, 50, 0)).toBeNull();
  });

  it("returns 0 when already at or below reorder level", () => {
    expect(calculateDaysUntilReorder(50, 100, 10)).toBe(0);
    expect(calculateDaysUntilReorder(100, 100, 10)).toBe(0);
  });

  it("calculates days correctly when above reorder level", () => {
    // 150 on hand, 50 reorder, 10/day usage = (150-50)/10 = 10 days
    expect(calculateDaysUntilReorder(150, 50, 10)).toBe(10);
    // 200 on hand, 50 reorder, 25/day usage = (200-50)/25 = 6 days
    expect(calculateDaysUntilReorder(200, 50, 25)).toBe(6);
  });

  it("floors fractional days", () => {
    // 155 on hand, 50 reorder, 10/day usage = (155-50)/10 = 10.5 -> 10 days
    expect(calculateDaysUntilReorder(155, 50, 10)).toBe(10);
  });

  it("throws for negative values", () => {
    expect(() => calculateDaysUntilReorder(-1, 50, 10)).toThrow(
      "quantityOnHand cannot be negative"
    );
    expect(() => calculateDaysUntilReorder(100, -1, 10)).toThrow(
      "reorderLevel cannot be negative"
    );
    expect(() => calculateDaysUntilReorder(100, 50, -1)).toThrow(
      "dailyUsage cannot be negative"
    );
  });
});

describe("getInventoryItemStatus", () => {
  it("returns complete status object", () => {
    const status = getInventoryItemStatus(150, 100, 10);
    expect(status).toEqual({
      status: "healthy",
      daysUntilReorder: 5,
      percentageOfReorderLevel: 150,
    });
  });

  it("handles zero daily usage", () => {
    // 50% is exactly at critical threshold, so status is critical
    const status = getInventoryItemStatus(50, 100, 0);
    expect(status.daysUntilReorder).toBeNull();
    expect(status.status).toBe("critical");
  });

  it("handles zero reorder level", () => {
    const status = getInventoryItemStatus(50, 0);
    expect(status.status).toBe("healthy");
    expect(status.percentageOfReorderLevel).toBe(100);
  });

  it("rounds percentage", () => {
    const status = getInventoryItemStatus(33, 100);
    expect(status.percentageOfReorderLevel).toBe(33);
  });
});

describe("calculateInventoryMetrics", () => {
  it("calculates correct counts for mixed inventory", () => {
    const items = [
      { quantityOnHand: 0, reorderLevel: 100 }, // out_of_stock
      { quantityOnHand: 25, reorderLevel: 100 }, // critical
      { quantityOnHand: 75, reorderLevel: 100 }, // low
      { quantityOnHand: 150, reorderLevel: 100 }, // healthy
      { quantityOnHand: 200, reorderLevel: 100 }, // healthy
    ];

    const metrics = calculateInventoryMetrics(items);

    expect(metrics.totalItems).toBe(5);
    expect(metrics.outOfStockCount).toBe(1);
    expect(metrics.criticalCount).toBe(1);
    expect(metrics.lowCount).toBe(1);
    expect(metrics.healthyCount).toBe(2);
    expect(metrics.healthPercentage).toBe(40); // 2/5 = 40%
  });

  it("handles empty inventory", () => {
    const metrics = calculateInventoryMetrics([]);

    expect(metrics.totalItems).toBe(0);
    expect(metrics.healthPercentage).toBe(100);
  });

  it("handles all healthy inventory", () => {
    const items = [
      { quantityOnHand: 150, reorderLevel: 100 },
      { quantityOnHand: 200, reorderLevel: 100 },
    ];

    const metrics = calculateInventoryMetrics(items);

    expect(metrics.healthPercentage).toBe(100);
    expect(metrics.healthyCount).toBe(2);
  });
});

describe("stockHealthBadgeVariants", () => {
  it("maps all statuses to valid badge variants", () => {
    expect(stockHealthBadgeVariants.healthy).toBe("default");
    expect(stockHealthBadgeVariants.low).toBe("secondary");
    expect(stockHealthBadgeVariants.critical).toBe("destructive");
    expect(stockHealthBadgeVariants.out_of_stock).toBe("destructive");
  });
});

describe("stockHealthLabels", () => {
  it("provides human-readable labels for all statuses", () => {
    expect(stockHealthLabels.healthy).toBe("Healthy");
    expect(stockHealthLabels.low).toBe("Low Stock");
    expect(stockHealthLabels.critical).toBe("Critical");
    expect(stockHealthLabels.out_of_stock).toBe("Out of Stock");
  });
});
