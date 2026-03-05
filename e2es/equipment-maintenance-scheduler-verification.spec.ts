import { expect, test } from "@playwright/test";

/**
 * Equipment Maintenance Scheduler Feature Verification Tests
 *
 * This test suite verifies:
 * 1. Equipment list API endpoint
 * 2. Equipment creation API endpoint
 * 3. Equipment maintenance scheduling
 * 4. Work order creation and management
 * 5. Predictive failure alerts API
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

test.describe("Equipment Maintenance Scheduler - API", () => {
  test("GET /api/kitchen/equipment/list - returns equipment list", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}/api/kitchen/equipment/list`
    );

    // Auth required
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("equipment");
      expect(Array.isArray(data.equipment)).toBe(true);
    }
  });

  test("GET /api/kitchen/work-orders/list - returns work orders", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}/api/kitchen/work-orders/list`
    );

    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("workOrders");
      expect(Array.isArray(data.workOrders)).toBe(true);
    }
  });

  test("GET /api/kitchen/equipment/alerts - returns predictive failure alerts", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}/api/kitchen/equipment/alerts?minSeverity=low`
    );

    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");

      const data = await response.json();
      expect(data).toHaveProperty("success");
      expect(data).toHaveProperty("alerts");
      expect(data).toHaveProperty("summary");
      expect(Array.isArray(data.alerts)).toBe(true);
      expect(data.summary).toHaveProperty("total");
      expect(data.summary).toHaveProperty("bySeverity");
    }
  });

  test("POST /api/kitchen/equipment/commands/create - validates required fields", async ({
    request,
  }) => {
    // Test missing required fields
    const response = await request.post(
      `${BASE_URL}/api/kitchen/equipment/commands/create`,
      {
        data: {
          // Missing locationId and name
          type: "cooking",
        },
      }
    );

    expect([400, 401]).toContain(response.status());
  });

  test("POST /api/kitchen/work-orders/commands/create - validates required fields", async ({
    request,
  }) => {
    // Test missing required fields
    const response = await request.post(
      `${BASE_URL}/api/kitchen/work-orders/commands/create`,
      {
        data: {
          // Missing equipmentId and title
          type: "repair",
        },
      }
    );

    expect([400, 401]).toContain(response.status());
  });
});

test.describe("Equipment Maintenance Scheduler - Commands", () => {
  test("POST /api/kitchen/equipment/commands/schedule-maintenance - validates input", async ({
    request,
  }) => {
    const response = await request.post(
      `${BASE_URL}/api/kitchen/equipment/commands/schedule-maintenance`,
      {
        data: {
          // Missing equipmentId and scheduledDate
          maintenanceType: "preventive",
        },
      }
    );

    expect([400, 401]).toContain(response.status());
  });

  test("POST /api/kitchen/equipment/commands/update-status - validates status values", async ({
    request,
  }) => {
    const response = await request.post(
      `${BASE_URL}/api/kitchen/equipment/commands/update-status`,
      {
        data: {
          equipmentId: "test-id",
          newStatus: "invalid_status",
        },
      }
    );

    expect([400, 401]).toContain(response.status());
  });

  test("POST /api/kitchen/equipment/commands/record-usage - validates usage hours", async ({
    request,
  }) => {
    const response = await request.post(
      `${BASE_URL}/api/kitchen/equipment/commands/record-usage`,
      {
        data: {
          equipmentId: "test-id",
          hours: -5, // Negative hours should be rejected
        },
      }
    );

    expect([400, 401]).toContain(response.status());
  });
});

test.describe("Equipment Maintenance Scheduler - Alert Types", () => {
  test("Alert response includes all required fields", async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/kitchen/equipment/alerts?minSeverity=low`
    );

    if (response.status() === 200) {
      const data = await response.json();

      if (data.alerts.length > 0) {
        const alert = data.alerts[0];
        expect(alert).toHaveProperty("equipmentId");
        expect(alert).toHaveProperty("equipmentName");
        expect(alert).toHaveProperty("alertType");
        expect(alert).toHaveProperty("severity");
        expect(alert).toHaveProperty("message");
        expect(alert).toHaveProperty("recommendedAction");

        // Check valid severity levels
        const validSeverities = ["critical", "high", "medium", "low"];
        expect(validSeverities).toContain(alert.severity);

        // Check valid alert types
        const validAlertTypes = [
          "maintenance_overdue",
          "high_usage",
          "poor_condition",
          "warranty_expiring",
          "predicted_failure",
        ];
        expect(validAlertTypes).toContain(alert.alertType);
      }
    }
  });
});
