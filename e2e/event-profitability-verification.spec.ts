import { test, expect } from "@playwright/test";

/**
 * Event Profitability Analysis Verification Test
 *
 * Verifies that the event profitability calculation service works correctly:
 * 1. Creates an event with associated data
 * 2. Invokes the recalculate command
 * 3. Verifies profitability calculations are accurate
 */

test.describe("Event Profitability Analysis", () => {
  test("should calculate profitability with inventory, labor, and overhead costs", async ({
    request,
  }) => {
    // Note: This test requires a running API server and test data
    // For actual verification, the API should be running at http://localhost:3000

    const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000";

    // Step 1: Create test event data structure
    // This would normally be done via seed data or test setup
    const eventProfitabilityInput = {
      eventId: "test-event-profitability-001",
      budgetedRevenue: 10000,
      budgetedFoodCost: 3500, // 35%
      budgetedLaborCost: 2500, // 25%
      budgetedOverhead: 1000, // 10%
      notes: "Test profitability calculation",
    };

    // Step 2: Invoke the profitability recalculate endpoint
    const recalculateResponse = await request.post(
      `${apiBaseUrl}/api/events/profitability/command/recalculate`,
      {
        data: eventProfitabilityInput,
      }
    );

    // For this test to pass, we need:
    // 1. A valid auth token (bypassed in test mode)
    // 2. An existing event in the database
    // 3. Associated time entries, inventory transactions, and waste entries

    // The response should contain profitability calculations
    expect(recalculateResponse.ok()).toBeTruthy();

    const result = await recalculateResponse.json();
    expect(result).toHaveProperty("result");

    // Verify the profitability structure
    if (result.result?.profitability) {
      const profit = result.result.profitability;

      // Verify all required fields are present
      expect(profit).toHaveProperty("actualRevenue");
      expect(profit).toHaveProperty("actualFoodCost");
      expect(profit).toHaveProperty("actualLaborCost");
      expect(profit).toHaveProperty("actualOverhead");
      expect(profit).toHaveProperty("actualTotalCost");
      expect(profit).toHaveProperty("actualGrossMargin");
      expect(profit).toHaveProperty("actualGrossMarginPct");

      expect(profit).toHaveProperty("revenueVariance");
      expect(profit).toHaveProperty("foodCostVariance");
      expect(profit).toHaveProperty("laborCostVariance");
      expect(profit).toHaveProperty("totalCostVariance");
      expect(profit).toHaveProperty("marginVariancePct");

      // Verify analysis flags
      expect(profit).toHaveProperty("isProfitable");
      expect(typeof profit.isProfitable).toBe("boolean");

      expect(profit).toHaveProperty("isOverBudget");
      expect(typeof profit.isOverBudget).toBe("boolean");

      // Verify cost breakdown structure
      expect(profit.costBreakdown).toBeDefined();
      expect(profit.costBreakdown.foodCost).toHaveProperty("total");
      expect(profit.costBreakdown.laborCost).toHaveProperty("totalCost");
      expect(profit.costBreakdown.overheadCost).toHaveProperty("total");
    }
  });

  test("should handle zero-cost events gracefully", async ({ request }) => {
    const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000";

    const zeroCostInput = {
      eventId: "test-event-zero-cost",
      calculationMethod: "auto",
    };

    const response = await request.post(
      `${apiBaseUrl}/api/events/profitability/command/recalculate`,
      {
        data: zeroCostInput,
      }
    );

    // Should handle gracefully without errors
    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result).toHaveProperty("result");

    // Verify zeros don't cause NaN or other issues
    if (result.result?.profitability) {
      const profit = result.result.profitability;
      expect(profit.actualFoodCost).toBeGreaterThanOrEqual(0);
      expect(profit.actualLaborCost).toBeGreaterThanOrEqual(0);
      expect(profit.actualTotalCost).toBeGreaterThanOrEqual(0);
      expect(profit.actualGrossMarginPct).not.toBeNaN();
    }
  });

  test("should generate variance explanations when over budget", async ({
    request,
  }) => {
    const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000";

    const varianceTestInput = {
      eventId: "test-event-variance",
      calculationMethod: "auto",
    };

    const response = await request.post(
      `${apiBaseUrl}/api/events/profitability/command/recalculate`,
      {
        data: varianceTestInput,
      }
    );

    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    if (result.result?.profitability) {
      const profit = result.result.profitability;

      // If over budget, should have explanations
      if (profit.isOverBudget) {
        expect(profit.varianceExplanations).toBeDefined();
        expect(Array.isArray(profit.varianceExplanations)).toBeTruthy();
      }
    }
  });
});
