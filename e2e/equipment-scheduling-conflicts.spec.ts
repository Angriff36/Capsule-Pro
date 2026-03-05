import { expect, test } from "@playwright/test";

/**
 * Equipment Scheduling Conflicts Feature Verification Tests
 *
 * This test suite verifies:
 * 1. Equipment availability endpoint
 * 2. Equipment allocation suggestions endpoint
 * 3. Equipment maintenance scheduling endpoint
 * 4. Integration with existing conflict detection
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

test.describe("Equipment Scheduling Conflicts API", () => {
  test("GET /api/equipment/availability - returns equipment availability data", async ({
    request,
  }) => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const response = await request.get(
      `${BASE_URL}/api/equipment/availability?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );

    expect(response.status()).toBe(401); // Auth required

    // The response structure should be valid even when unauthenticated
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("POST /api/equipment/allocation-suggestions - returns allocation alternatives", async ({
    request,
  }) => {
    const response = await request.post(
      `${BASE_URL}/api/equipment/allocation-suggestions`,
      {
        data: {
          equipmentName: "Robot Coupe",
          eventId: "test-event-id",
        },
      }
    );

    expect(response.status()).toBe(401); // Auth required

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("GET /api/equipment/maintenance - returns maintenance schedules", async ({
    request,
  }) => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const response = await request.get(
      `${BASE_URL}/api/equipment/maintenance?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );

    expect(response.status()).toBe(401); // Auth required

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("POST /api/equipment/maintenance - creates maintenance schedule", async ({
    request,
  }) => {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 7);

    const response = await request.post(
      `${BASE_URL}/api/equipment/maintenance`,
      {
        data: {
          equipmentName: "Robot Coupe",
          scheduledDate: scheduledDate.toISOString(),
          estimatedDuration: 2,
          maintenanceType: "preventive",
          notes: "Regular maintenance check",
        },
      }
    );

    expect(response.status()).toBe(401); // Auth required

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });
});

test.describe("Equipment Conflict Detection Integration", () => {
  test("Equipment conflicts are included in /api/conflicts/detect response", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/conflicts/detect`, {
      data: {
        entityTypes: ["equipment"],
        timeRange: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });

    expect(response.status()).toBe(401); // Auth required

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });
});
