/**
 * Kitchen Operations Rules Engine Verification Test
 *
 * Temporary test to verify the rules engine works correctly.
 * This test should be deleted after successful verification.
 */

import { expect, test } from "@playwright/test";

test.describe("Kitchen Operations Rules Engine", () => {
  test("should validate rules engine API endpoint returns configuration", async ({
    request,
  }) => {
    const response = await request.get("/api/kitchen/rules-engine/config");

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.config).toBeDefined();
    expect(data.config.enabled).toBe(true);
  });

  test("should validate prep task operation against rules", async ({
    request,
  }) => {
    const response = await request.post("/api/kitchen/rules-engine/validate", {
      data: {
        entityType: "PrepTask",
        entityId: "test-task-123",
        command: "claim",
        params: {
          userId: "test-user",
          stationId: "test-station",
        },
        currentState: {
          status: "open",
          recipeActive: true,
          stationId: "",
          claimedBy: "",
          allergens: [],
        },
        relatedData: [],
      },
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.allowed).toBeDefined();
    expect(data.results).toBeInstanceOf(Array);
  });

  test("should block operation when station is at capacity", async ({
    request,
  }) => {
    const response = await request.post("/api/kitchen/rules-engine/validate", {
      data: {
        entityType: "PrepTask",
        entityId: "test-task-capacity",
        command: "claim",
        params: {
          userId: "test-user",
          stationId: "full-station",
        },
        currentState: {
          status: "open",
          recipeActive: true,
          stationId: "full-station",
          claimedBy: "",
          allergens: [],
        },
        relatedData: [
          {
            type: "Station",
            id: "full-station",
            data: {
              capacitySimultaneousTasks: 2,
              currentTaskCount: 2,
              isActive: true,
            },
          },
        ],
      },
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.results).toBeInstanceOf(Array);

    // Should have a capacity-related rule result
    const capacityRule = data.results.find(
      (r: any) => r.ruleId === "station-capacity"
    );
    expect(capacityRule).toBeDefined();
  });

  test("should warn about allergens when present", async ({ request }) => {
    const response = await request.post("/api/kitchen/rules-engine/validate", {
      data: {
        entityType: "PrepTask",
        entityId: "test-task-allergens",
        command: "claim",
        params: {
          userId: "test-user",
          stationId: "test-station",
        },
        currentState: {
          status: "open",
          recipeActive: true,
          stationId: "test-station",
          claimedBy: "",
          allergens: ["nuts", "dairy"],
          allergenAcknowledged: false,
        },
        relatedData: [],
      },
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.results).toBeInstanceOf(Array);

    // Should have allergen acknowledgment rule result
    const allergenRule = data.results.find(
      (r: any) => r.ruleId === "allergen-acknowledgment"
    );
    expect(allergenRule).toBeDefined();
    expect(allergenRule.passed).toBe(false);
    expect(allergenRule.severity).toBe("warning");
  });

  test("should validate workflow transitions", async ({ request }) => {
    // Test invalid transition from 'done' to 'in_progress'
    const response = await request.post("/api/kitchen/rules-engine/validate", {
      data: {
        entityType: "PrepTask",
        entityId: "test-task-transition",
        command: "updateStatus",
        params: {
          status: "in_progress",
        },
        currentState: {
          status: "done",
          recipeActive: true,
        },
        relatedData: [],
      },
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.success).toBe(true);

    // Should have workflow transition rule result
    const transitionRule = data.results.find(
      (r: any) => r.ruleId === "workflow-transition"
    );
    expect(transitionRule).toBeDefined();
    expect(transitionRule.passed).toBe(false);
  });

  test("should validate equipment requirements", async ({ request }) => {
    const response = await request.post("/api/kitchen/rules-engine/validate", {
      data: {
        entityType: "PrepTask",
        entityId: "test-task-equipment",
        command: "claim",
        params: {
          userId: "test-user",
          stationId: "test-station",
        },
        currentState: {
          status: "open",
          recipeActive: true,
          stationId: "test-station",
          claimedBy: "",
          equipmentRequired: ["mixer", "oven"],
          allergens: [],
        },
        relatedData: [
          {
            type: "Station",
            id: "test-station",
            data: {
              equipmentList: "refrigerator,prep table",
              capacitySimultaneousTasks: 2,
              currentTaskCount: 0,
              isActive: true,
            },
          },
        ],
      },
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.success).toBe(true);

    // Should have equipment rule result
    const equipmentRule = data.results.find(
      (r: any) => r.ruleId === "station-equipment"
    );
    expect(equipmentRule).toBeDefined();
    expect(equipmentRule.passed).toBe(false);
  });
});
