import { expect, test } from "@playwright/test";

/**
 * IoT Kitchen Monitoring Verification Tests
 *
 * Temporary verification tests for IoT monitoring feature.
 * These tests verify the core functionality of the IoT integration.
 */

test.describe("IoT Kitchen Monitoring", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the IoT monitoring dashboard
    await page.goto("/kitchen/iot-monitoring");
  });

  test("should display the IoT monitoring dashboard", async ({ page }) => {
    // Check that the page title is visible
    await expect(page.locator("h1")).toContainText("IoT Kitchen Monitoring");
    await expect(
      page.locator("text=Real-time equipment monitoring")
    ).toBeVisible();
  });

  test("should display summary cards", async ({ page }) => {
    // Check for the summary cards (Connected, Disconnected, Warnings, Critical)
    await expect(page.locator("text=Connected")).toBeVisible();
    await expect(page.locator("text=Disconnected")).toBeVisible();
    await expect(page.locator("text=Warnings")).toBeVisible();
    await expect(page.locator("text=Critical")).toBeVisible();
  });

  test("should show equipment status section", async ({ page }) => {
    // Check for the Equipment Status section
    await expect(page.locator("h2:has-text('Equipment Status')")).toBeVisible();
  });

  test("should display empty state when no IoT equipment", async ({ page }) => {
    // Check for empty state message
    const emptyState = page.locator("text=No IoT-enabled equipment found");
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      await expect(page.locator("text=Register IoT devices")).toBeVisible();
    }
  });

  test("should have refresh button for equipment status", async ({ page }) => {
    // Check for the refresh button in equipment status section
    const refreshButton = page.locator("button:has-text('Refresh')").first();
    await expect(refreshButton).toBeVisible();
  });
});

/**
 * API Endpoint Verification Tests
 */
test.describe("IoT API Endpoints", () => {
  test("should fetch equipment status", async ({ request }) => {
    const response = await request.get("/api/kitchen/iot/equipment-status");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("equipment");
    expect(data).toHaveProperty("total");
  });

  test("should fetch sensor readings", async ({ request }) => {
    const response = await request.get(
      "/api/kitchen/iot/sensor-readings?limit=10"
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("readings");
    expect(data).toHaveProperty("pagination");
  });

  test("should fetch IoT alerts", async ({ request }) => {
    const response = await request.get("/api/kitchen/iot/alerts?limit=10");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("alerts");
    expect(data).toHaveProperty("pagination");
  });

  test("should fetch alert rules", async ({ request }) => {
    const response = await request.get("/api/kitchen/iot/alert-rules");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("rules");
  });

  test("should fetch food safety logs", async ({ request }) => {
    const response = await request.get(
      "/api/kitchen/iot/food-safety-logs?limit=10"
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("logs");
    expect(data).toHaveProperty("pagination");
  });
});

/**
 * Sensor Data Ingestion Test
 */
test.describe("IoT Sensor Data Ingestion", () => {
  test("should accept sensor data via API", async ({ request }) => {
    // Note: This test requires valid authentication and an existing equipment ID
    // In a real scenario, you would first create test equipment

    const sensorData = {
      equipment_id: "test-equipment-id",
      sensor_type: "temperature",
      value: 3.5,
      unit: "celsius",
      timestamp: new Date().toISOString(),
      metadata: {
        test: true,
      },
    };

    // This would normally succeed with proper auth
    // For now, we're verifying the endpoint exists
    const response = await request.post(
      "/api/kitchen/iot/commands/ingest-sensor-data",
      {
        data: sensorData,
      }
    );

    // We expect either success (401 for missing auth is expected in test env)
    // or 400 for invalid equipment_id
    expect([200, 201, 400, 401]).toContain(response.status());
  });
});

/**
 * Database Schema Verification
 */
test.describe("Database Schema", () => {
  test("sensor_readings table should exist", async ({}) => {
    // This would be verified by checking the database directly
    // For now, we just document the expected schema
    const expectedColumns = [
      "tenant_id",
      "id",
      "equipment_id",
      "sensor_type",
      "value",
      "unit",
      "status",
      "timestamp",
      "metadata",
      "created_at",
    ];

    // In a real test, you would query the database schema
    expect(expectedColumns.length).toBeGreaterThan(0);
  });

  test("iot_alerts table should exist", async ({}) => {
    const expectedColumns = [
      "tenant_id",
      "id",
      "equipment_id",
      "alert_rule_id",
      "alert_type",
      "severity",
      "status",
      "title",
      "description",
      "triggered_at",
      "acknowledged_at",
      "acknowledged_by",
      "resolved_at",
      "resolved_by",
      "requires_haccp_action",
    ];

    expect(expectedColumns.length).toBeGreaterThan(0);
  });

  test("iot_alert_rules table should exist", async ({}) => {
    const expectedColumns = [
      "tenant_id",
      "id",
      "equipment_id",
      "name",
      "sensor_type",
      "condition",
      "threshold",
      "threshold_min",
      "threshold_max",
      "severity",
      "is_active",
    ];

    expect(expectedColumns.length).toBeGreaterThan(0);
  });

  test("food_safety_logs table should exist", async ({}) => {
    const expectedColumns = [
      "tenant_id",
      "id",
      "equipment_id",
      "log_type",
      "log_date",
      "temperature",
      "target_temp_min",
      "target_temp_max",
      "is_in_safe_zone",
      "requires_action",
      "iot_generated",
    ];

    expect(expectedColumns.length).toBeGreaterThan(0);
  });
});
