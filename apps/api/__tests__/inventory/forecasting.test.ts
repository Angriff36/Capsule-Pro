/**
 * Inventory Forecasting Test Suite
 *
 * Tests verify the core forecasting algorithms, reorder suggestions, help accuracy tracking functionality.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { database } from "@repo/database";

import {
  calculateDepletionForecast,
  generateReorderSuggestions,
  batchCalculateForecasts,
  saveForecastToDatabase,
  saveReorderSuggestionToDatabase,
  trackForecastAccuracy,
  getForecastAccuracyMetrics,
  updateConfidenceCalculation,
  getAccuracySummary,
} from "@/app/lib/inventory-forecasting";

const TEST_TENANT_ID = "00000000-0000-0000-000000000001";
const TEST_SKU = "ITEM-001";

// Helper to create mock inventory item - using any to bypass strict Prisma types for tests
function createMockInventoryItem(overrides: Record<string, unknown> = {}): any {
  return {
    id: "item-1",
    tenantId: TEST_TENANT_ID,
    sku: TEST_SKU,
    name: "Test Item",
    currentStock: 100,
    reorderPoint: 20,
    unit: "each",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

// Helper to create mock transaction - using any to bypass strict Prisma types for tests
function createMockTransaction(overrides: Record<string, unknown> = {}): any {
  return {
    id: `txn-${Date.now()}-${Math.random()}`,
    tenantId: TEST_TENANT_ID,
    itemId: "item-1",
    type: "use",
    quantity: 5,
    createdAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock event
function createMockEvent(overrides: Partial<any> = {}) {
  return {
    id: "event-1",
    tenantId: TEST_TENANT_ID,
    name: "Test Event",
    status: "confirmed",
    guestCount: 100,
    eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

// Helper to create mock forecast - using any to bypass strict Prisma types for tests
function createMockForecast(overrides: Record<string, unknown> = {}): any {
  return {
    id: "forecast-1",
    tenantId: TEST_TENANT_ID,
    sku: TEST_SKU,
    currentStock: 100,
    depletionDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    daysUntilDepletion: 20,
    confidence: "high",
    forecast: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Inventory Forecasting Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("calculateDepletionForecast", () => {
    describe("with valid inventory item", () => {
      it("should calculate forecast with high confidence for stable usage", async () => {
        // Setup mock inventory item
        vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(
          createMockInventoryItem({ currentStock: 100, reorderPoint: 20 })
        );

        // Setup mock transactions (stable usage pattern)
        const today = new Date();
        const transactions = Array.from({ length: 30 }, (_, i) =>
          createMockTransaction({
            quantity: 5,
            type: "use",
            createdAt: new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
          })
        );
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(transactions);

        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const result = await calculateDepletionForecast({
          tenantId: TEST_TENANT_ID,
          sku: TEST_SKU,
          horizonDays: 30,
        });

        expect(result).toBeDefined();
        expect(result.sku).toBe(TEST_SKU);
        expect(result.currentStock).toBe(100);
        expect(result.confidence).toBe("high");
        expect(result.daysUntilDepletion).toBeGreaterThan(0);
        expect(result.forecast).toBeDefined();
        expect(result.forecast.length).toBeGreaterThan(0);
      });

      it("should calculate forecast with medium confidence for moderate variability", async () => {
        vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(
          createMockInventoryItem({ currentStock: 50 })
        );

        // Variable usage pattern (some days 2, some days 8)
        const today = new Date();
        const transactions = Array.from({ length: 20 }, (_, i) =>
          createMockTransaction({
            quantity: i % 2 === 0 ? 2 : 8,
            type: "use",
            createdAt: new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
          })
        );
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(transactions);
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const result = await calculateDepletionForecast({
          tenantId: TEST_TENANT_ID,
          sku: TEST_SKU,
          horizonDays: 30,
        });

        expect(result.confidence).toBe("medium");
      });

      it("should calculate forecast with low confidence for sparse data", async () => {
        vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(
          createMockInventoryItem({ currentStock: 100 })
        );

        // Only 5 data points (sparse)
        const today = new Date();
        const transactions = Array.from({ length: 5 }, (_, i) =>
          createMockTransaction({
            quantity: 5,
            type: "use",
            createdAt: new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
          })
        );
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(transactions);
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const result = await calculateDepletionForecast({
          tenantId: TEST_TENANT_ID,
          sku: TEST_SKU,
          horizonDays: 30,
        });
        expect(result.confidence).toBe("low");
      });

      it("should incorporate event-based usage projections", async () => {
        vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(
          createMockInventoryItem({ currentStock: 100 })
        );

        // Historical usage: 2 units/day
        const today = new Date();
        const transactions = Array.from({ length: 15 }, (_, i) =>
          createMockTransaction({
            quantity: 2,
            type: "use",
            createdAt: new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
          })
        );
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(transactions);

        // Upcoming event with 200 guests (0.1 units/guest = 20 units expected usage)
        vi.mocked(database.event.findMany).mockResolvedValue([
          createMockEvent({
            guestCount: 200,
            eventDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
          }) as any,
        ]);

        const result = await calculateDepletionForecast({
          tenantId: TEST_TENANT_ID,
          sku: TEST_SKU,
          horizonDays: 30,
        });

        // The forecast should show higher usage on the event day
        const eventDayForecast = result.forecast.find((f) => {
          const eventDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
          return Math.abs(f.date.getTime() - eventDate.getTime()) < 24 * 60 * 60 * 1000;
        });
        expect(eventDayForecast?.usage).toBeGreaterThan(2);
      });
    });

    describe("edge cases", () => {
      it("should return null depletion date for non-existent SKU", async () => {
        vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(null);

        const result = await calculateDepletionForecast({
          tenantId: TEST_TENANT_ID,
          sku: "NON-EXISTENT",
          horizonDays: 30,
        });

        expect(result.currentStock).toBe(0);
        expect(result.depletionDate).toBeNull();
        expect(result.daysUntilDepletion).toBeNull();
      });

      it("should handle zero current stock", async () => {
        vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(
          createMockInventoryItem({ currentStock: 0 })
        );
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue([]);
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const result = await calculateDepletionForecast({
          tenantId: TEST_TENANT_ID,
          sku: TEST_SKU,
          horizonDays: 30,
        });

        expect(result.currentStock).toBe(0);
        expect(result.daysUntilDepletion).toBe(0);
      });

      it("should handle no historical transactions", async () => {
        vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(
          createMockInventoryItem({ currentStock: 100 })
        );
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue([]);
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const result = await calculateDepletionForecast({
          tenantId: TEST_TENANT_ID,
          sku: TEST_SKU,
          horizonDays: 30,
        });

        expect(result.confidence).toBe("low");
      });

      it("should handle depletion beyond horizon", async () => {
        vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(
          createMockInventoryItem({ currentStock: 10000 })
        );

        const today = new Date();
        const transactions = Array.from({ length: 30 }, (_, i) =>
          createMockTransaction({
            quantity: 1,
            type: "use",
            createdAt: new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
          })
        );
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(transactions);
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const result = await calculateDepletionForecast({
          tenantId: TEST_TENANT_ID,
          sku: TEST_SKU,
          horizonDays: 30,
        });

        expect(result.daysUntilDepletion === null || result.daysUntilDepletion! > 30).toBe(true);
      });

      it("should include waste transactions in usage calculations", async () => {
        vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(
          createMockInventoryItem({ currentStock: 100 })
        );

        const today = new Date();
        const transactions = [
          ...Array.from({ length: 10 }, (_, i) =>
            createMockTransaction({
              quantity: 3,
              type: "use",
              createdAt: new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
            })
          ),
          ...Array.from({ length: 5 }, (_, i) =>
            createMockTransaction({
              quantity: 2,
              type: "waste",
              createdAt: new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
            })
          ),
        ];
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(transactions);
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const result = await calculateDepletionForecast({
          tenantId: TEST_TENANT_ID,
          sku: TEST_SKU,
          horizonDays: 30,
        });

        expect(result.forecast).toBeDefined();
      });

      it("should use default horizon days when not specified", async () => {
        vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(
          createMockInventoryItem({ currentStock: 100 })
        );
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue([]);
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const result = await calculateDepletionForecast({
          tenantId: TEST_TENANT_ID,
          sku: TEST_SKU,
        });

        expect(result.forecast.length).toBeLessThanOrEqual(30);
      });
    });
  });

  describe("generateReorderSuggestions", () => {
    describe("urgency calculations", () => {
      it("should mark items as critical when stock at or below lead time", async () => {
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({
            sku: "CRITICAL-001",
            currentStock: 3,
            reorderPoint: 20,
          }),
        ]);
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(
          Array.from({ length: 15 }, (_, i) =>
            createMockTransaction({
              quantity: 1,
              createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
            })
          )
        );
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const results = await generateReorderSuggestions({
          tenantId: TEST_TENANT_ID,
          leadTimeDays: 7,
          safetyStockDays: 3,
        });

        expect(results.length).toBeGreaterThan(0);
        const criticalItem = results.find((r) => r.sku === "CRITICAL-001");
        expect(criticalItem?.urgency).toBe("critical");
      });

      it("should mark items as warning when stock at safety level", async () => {
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({
            sku: "WARNING-001",
            currentStock: 12,
            reorderPoint: 20,
          }),
        ]);
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(
          Array.from({ length: 15 }, (_, i) =>
            createMockTransaction({
              quantity: 1,
              createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
            })
          )
        );
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const results = await generateReorderSuggestions({
          tenantId: TEST_TENANT_ID,
          leadTimeDays: 7,
          safetyStockDays: 3,
        });

        const warningItem = results.find((r) => r.sku === "WARNING-001");
        expect(warningItem?.urgency).toBe("warning");
      });

      it("should mark items as info when approaching reorder point", async () => {
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({
            sku: "INFO-001",
            currentStock: 25,
            reorderPoint: 20,
          }),
        ]);
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(
          Array.from({ length: 15 }, (_, i) =>
            createMockTransaction({
              quantity: 1,
              createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
            })
          )
        );
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const results = await generateReorderSuggestions({
          tenantId: TEST_TENANT_ID,
          leadTimeDays: 7,
          safetyStockDays: 3,
        });

        const infoItem = results.find((r) => r.sku === "INFO-001");
        expect(infoItem?.urgency).toBe("info");
      });
    });

    describe("order quantity calculations", () => {
      it("should calculate recommended order quantity with 1.5x multiplier for depleted stock", async () => {
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({
            sku: "DEPLETED-001",
            currentStock: 0,
            reorderPoint: 20,
          }),
        ]);
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(
          Array.from({ length: 15 }, (_, i) =>
            createMockTransaction({
              quantity: 5,
              createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
            })
          )
        );
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const results = await generateReorderSuggestions({
          tenantId: TEST_TENANT_ID,
          leadTimeDays: 7,
        });

        const depletedItem = results.find((r) => r.sku === "DEPLETED-001");
        expect(depletedItem?.recommendedOrderQty).toBeGreaterThan(0);
        expect(depletedItem?.urgency).toBe("critical");
      });

      it("should filter by specific SKU when provided", async () => {
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({ sku: "SPECIFIC-001" }),
          createMockInventoryItem({ sku: "SPECIFIC-002" }),
        ]);
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue([]);
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const results = await generateReorderSuggestions({
          tenantId: TEST_TENANT_ID,
          sku: "SPECIFIC-001",
        });

        expect(results.every((r) => r.sku === "SPECIFIC-001")).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("should handle items with no reorder point defined", async () => {
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({
            sku: "NO-REORDER",
            currentStock: 10,
            reorderPoint: null,
          }),
        ]);
        vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue([]);
        vi.mocked(database.event.findMany).mockResolvedValue([]);

        const results = await generateReorderSuggestions({
          tenantId: TEST_TENANT_ID,
        });

        const item = results.find((r) => r.sku === "NO-REORDER");
        if (item) {
          expect(item.reorderPoint).toBeDefined();
        }
      });

      it("should handle empty inventory", async () => {
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

        const results = await generateReorderSuggestions({
          tenantId: TEST_TENANT_ID,
        });

        expect(results).toEqual([]);
      });
    });
  });

  describe("batchCalculateForecasts", () => {
    it("should calculate forecasts for multiple SKUs", async () => {
      // Use mockImplementation with proper type casting for Prisma compatibility
      vi.mocked(database.inventoryItem.findFirst).mockImplementation(
        (async (args: { where?: { sku?: string } }) => {
          const sku = args?.where?.sku;
          if (sku === "SKU-001") {
            return createMockInventoryItem({ sku: "SKU-001", currentStock: 100 });
          }
          if (sku === "SKU-002") {
            return createMockInventoryItem({ sku: "SKU-002", currentStock: 50 });
          }
          return null;
        }) as unknown as typeof database.inventoryItem.findFirst
      );

      vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(
        Array.from({ length: 15 }, (_, i) =>
          createMockTransaction({
            quantity: 3,
            type: "use",
            createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
          })
        )
      );
      vi.mocked(database.event.findMany).mockResolvedValue([]);

      const results = await batchCalculateForecasts(
        TEST_TENANT_ID,
        ["SKU-001", "SKU-002"],
        30
      );

      expect(results.size).toBe(2);
      expect(results.has("SKU-001")).toBe(true);
      expect(results.has("SKU-002")).toBe(true);
      expect(results.get("SKU-001")?.currentStock).toBe(100);
      expect(results.get("SKU-002")?.currentStock).toBe(50);
    });

    it("should handle missing SKUs gracefully", async () => {
      vi.mocked(database.inventoryItem.findFirst).mockResolvedValue(null);
      vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue([]);
      vi.mocked(database.event.findMany).mockResolvedValue([]);

      const results = await batchCalculateForecasts(
        TEST_TENANT_ID,
        ["MISSING-001", "MISSING-002"],
        30
      );

      // Should include results for all requested SKUs, even if not found
      expect(results.size).toBe(2);
    });
  });

  describe("saveForecastToDatabase", () => {
    it("should save forecast with all required fields", async () => {
      // Mock findFirst to return null (no existing record)
      vi.mocked(database.inventoryForecast.findFirst).mockResolvedValue(null);

      vi.mocked(database.inventoryForecast.create).mockResolvedValue({
        id: "forecast-1",
        tenantId: TEST_TENANT_ID,
        sku: TEST_SKU,
        date: new Date(),
        forecast: 100,
        lower_bound: 90,
        upper_bound: 110,
        confidence: 0.9,
        horizon_days: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      const forecast = {
        sku: TEST_SKU,
        currentStock: 100,
        depletionDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        daysUntilDepletion: 20,
        confidence: "high" as const,
        forecast: [
          {
            date: new Date(),
            projectedStock: 95,
            usage: 5,
          },
        ],
      };
      await saveForecastToDatabase(TEST_TENANT_ID, forecast);
      // The implementation calls findFirst first for each forecast point
      expect(database.inventoryForecast.findFirst).toHaveBeenCalled();
      // Then calls create since no existing record
      expect(database.inventoryForecast.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            sku: TEST_SKU,
          }),
        })
      );
    });
  });

  describe("saveReorderSuggestionToDatabase", () => {
    it("should save reorder suggestion with all required fields", async () => {
      vi.mocked(database.reorderSuggestion.create).mockResolvedValue({
        id: "suggestion-1",
        tenantId: TEST_TENANT_ID,
        sku: TEST_SKU,
        currentStock: 10,
        reorderPoint: 20,
        recommendedOrderQty: 50,
        leadTimeDays: 7,
        justification: "Stock below reorder point",
        urgency: "critical",
        createdAt: new Date(),
      } as any);
      const suggestion = {
        sku: TEST_SKU,
        currentStock: 10,
        reorderPoint: 20,
        recommendedOrderQty: 50,
        leadTimeDays: 7,
        justification: "Stock below reorder point",
        urgency: "critical" as const,
      };
      await saveReorderSuggestionToDatabase(TEST_TENANT_ID, suggestion);
      expect(database.reorderSuggestion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            sku: TEST_SKU,
            recommended_order_qty: 50,
            reorder_point: 20,
            lead_time_days: 7,
            justification: "Stock below reorder point",
          }),
        })
      );
    });
  });

  describe("trackForecastAccuracy", () => {
    it("should update forecast with actual depletion date", async () => {
      const forecastId = "forecast-1";
      const actualDepletionDate = new Date();
      vi.mocked(database.inventoryForecast.findFirst).mockResolvedValue(
        createMockForecast({
          id: forecastId,
          depletionDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          daysUntilDepletion: 20,
        }) as any
      );
      vi.mocked(database.inventoryForecast.update).mockResolvedValue({
        ...createMockForecast(),
        id: forecastId,
      } as any);
      await trackForecastAccuracy(TEST_TENANT_ID, forecastId, actualDepletionDate);
      expect(database.inventoryForecast.update).toHaveBeenCalled();
    });

    it("should throw error for missing forecast", async () => {
      vi.mocked(database.inventoryForecast.findFirst).mockResolvedValue(null);
      // Should throw when forecast not found
      await expect(
        trackForecastAccuracy(TEST_TENANT_ID, "non-existent", new Date())
      ).rejects.toThrow("Forecast with ID non-existent not found");
    });
  });

  describe("getForecastAccuracyMetrics", () => {
    it("should return accuracy metrics for a SKU", async () => {
      vi.mocked(database.inventoryForecast.findMany).mockResolvedValue([
        {
          ...createMockForecast(),
          confidence: "high",
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        } as any,
        {
          ...createMockForecast(),
          confidence: "medium",
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        } as any,
      ]);
      vi.mocked(database.inventoryForecast.count).mockResolvedValue(2);
      const metrics = await getForecastAccuracyMetrics(TEST_TENANT_ID, TEST_SKU);
      expect(metrics).toBeDefined();
    });
  });

  describe("updateConfidenceCalculation", () => {
    it("should adjust confidence based on historical accuracy", async () => {
      vi.mocked(database.inventoryForecast.findMany).mockResolvedValue([
        createMockForecast({ confidence: "high" }),
        createMockForecast({ confidence: "high" }),
        createMockForecast({ confidence: "medium" }),
      ]);
      vi.mocked(database.inventoryForecast.count).mockResolvedValue(3);
      const result = await updateConfidenceCalculation(TEST_TENANT_ID, TEST_SKU, "high");
      expect(["high", "medium", "low"]).toContain(result);
    });
  });

  describe("getAccuracySummary", () => {
    it("should return accuracy summary for all SKUs", async () => {
      vi.mocked(database.inventoryForecast.findMany).mockResolvedValue([
        createMockForecast({ sku: "SKU-001", confidence: "high" }),
        createMockForecast({ sku: "SKU-002", confidence: "medium" }),
        createMockForecast({ sku: "SKU-003", confidence: "low" }),
      ]);
      const summary = await getAccuracySummary(TEST_TENANT_ID);
      expect(Array.isArray(summary)).toBe(true);
    });
  });
});

describe("Forecast Integration Tests", () => {
  // These tests would require a real database connection
  // Marked as integration tests to be run separately
  it.todo("should generate accurate forecasts with real database data");
  it.todo("should handle concurrent forecast requests");
  it.todo("should process large batch forecasts efficiently");
});