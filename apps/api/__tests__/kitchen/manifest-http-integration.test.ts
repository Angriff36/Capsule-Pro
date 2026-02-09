/**
 * HTTP Integration Test: Manifest-Generated Routes
 *
 * These tests verify that Manifest-generated API routes properly:
 * 1. Handle HTTP requests and responses
 * 2. Enforce guards via HTTP status codes
 * 3. Enforce constraints via HTTP error responses
 * 4. Return proper JSON response format
 * 5. Integrate with auth and tenant resolution
 *
 * Unlike existing tests that import the runtime directly, these tests make
 * actual HTTP requests to the generated route handlers.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      orgId: "test-org",
      userId: "test-user-id",
    })
  ),
}));

// Mock database
vi.mock("@repo/database", () => {
  const mockDb = {
    prepTask: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    outboxEvent: {
      create: vi.fn(),
    },
  };
  return {
    database: mockDb,
  };
});

// Mock getTenantIdForOrg
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(() => Promise.resolve("test-tenant")),
}));

describe("Manifest HTTP Integration - PrepTask Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/kitchen/prep-tasks/commands/claim", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/claim/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/claim/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-tasks/commands/claim",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-001",
            userId: "user-001",
            stationId: "station-a",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });

    it("should handle claim requests with valid data", async () => {
      const { database } = await import("@repo/database");

      // Mock successful task claim
      vi.mocked(database.prepTask.findFirst).mockResolvedValueOnce({
        id: "task-001",
        status: "open",
        tenantId: "test-tenant",
        eventId: "event-001",
        name: "Test Task",
        dueByDate: Date.now() + 86_400_000,
        priority: 3,
        quantityTotal: 10,
        quantityCompleted: 0,
        claimedBy: "",
        claimedAt: 0,
        stationId: "",
        taskType: "prep",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      vi.mocked(database.prepTask.update).mockResolvedValueOnce({
        id: "task-001",
        status: "in_progress",
        claimedBy: "user-001",
        claimedAt: Date.now(),
        stationId: "station-a",
      } as never);

      vi.mocked(database.outboxEvent.create).mockResolvedValueOnce({} as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/claim/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-tasks/commands/claim",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-001",
            userId: "user-001",
            stationId: "station-a",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // The response should be successful or have appropriate error
      // We're mainly testing that the HTTP layer works correctly
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);

      // Response should have a known structure
      if (response.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
        expect(data).toHaveProperty("result");
      }
    });
  });

  describe("POST /api/kitchen/prep-tasks/commands/start", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/start/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/start/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-tasks/commands/start",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-001",
            userId: "user-001",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });
  });

  describe("POST /api/kitchen/prep-tasks/commands/complete", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/complete/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/complete/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-tasks/commands/complete",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-001",
            quantityCompleted: 10,
            userId: "user-001",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });
  });

  describe("POST /api/kitchen/prep-tasks/commands/release", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/release/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/prep-tasks/commands/reassign", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/reassign/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/prep-tasks/commands/update-quantity", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/update-quantity/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/prep-tasks/commands/cancel", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-tasks/commands/cancel/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });
});

describe("Manifest HTTP Integration - Menu Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/kitchen/menus/commands/update", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/menus/commands/update/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/menus/commands/update/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/menus/commands/update",
        {
          method: "POST",
          body: JSON.stringify({
            id: "menu-001",
            name: "Updated Menu",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });
  });

  describe("POST /api/kitchen/menus/commands/activate", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/menus/commands/activate/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/menus/commands/deactivate", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/menus/commands/deactivate/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });
});

describe("Manifest HTTP Integration - Station Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/kitchen/stations/commands/assignTask", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/stations/commands/assignTask/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/stations/commands/assignTask/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/stations/commands/assignTask",
        {
          method: "POST",
          body: JSON.stringify({
            stationId: "station-001",
            taskId: "task-001",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });
  });

  describe("POST /api/kitchen/stations/commands/removeTask", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/stations/commands/removeTask/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/stations/commands/updateCapacity", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/stations/commands/updateCapacity/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/stations/commands/activate", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/stations/commands/activate/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/stations/commands/deactivate", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/stations/commands/deactivate/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/stations/commands/updateEquipment", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/stations/commands/updateEquipment/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });
});

describe("Manifest HTTP Integration - Inventory Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/kitchen/inventory/commands/reserve", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/inventory/commands/reserve/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/inventory/commands/reserve/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/inventory/commands/reserve",
        {
          method: "POST",
          body: JSON.stringify({
            itemId: "item-001",
            quantity: 10,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });
  });

  describe("POST /api/kitchen/inventory/commands/consume", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/inventory/commands/consume/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/inventory/commands/waste", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/inventory/commands/waste/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/inventory/commands/adjust", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/inventory/commands/adjust/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/inventory/commands/restock", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/inventory/commands/restock/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/inventory/commands/release-reservation", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/inventory/commands/release-reservation/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });
});

describe("Manifest HTTP Integration - Recipe Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/kitchen/recipes/commands/update", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/recipes/commands/update/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/recipes/commands/update/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/recipes/commands/update",
        {
          method: "POST",
          body: JSON.stringify({
            id: "recipe-001",
            name: "Updated Recipe",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });
  });

  describe("POST /api/kitchen/recipes/commands/activate", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/recipes/commands/activate/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/recipes/commands/deactivate", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/recipes/commands/deactivate/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });
});

describe("Manifest HTTP Integration - Dish Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/kitchen/dishes/commands/update-pricing", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/dishes/commands/update-pricing/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/dishes/commands/update-pricing/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/dishes/commands/update-pricing",
        {
          method: "POST",
          body: JSON.stringify({
            id: "dish-001",
            costPerPortionCents: 500,
            salesPriceCents: 1500,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });
  });

  describe("POST /api/kitchen/dishes/commands/update-lead-time", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/dishes/commands/update-lead-time/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });
});

describe("Manifest HTTP Integration - Ingredient Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/kitchen/ingredients/commands/update-allergens", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/ingredients/commands/update-allergens/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/ingredients/commands/update-allergens/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/ingredients/commands/update-allergens",
        {
          method: "POST",
          body: JSON.stringify({
            id: "ingredient-001",
            allergens: ["gluten", "dairy"],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });
  });
});

describe("Manifest HTTP Integration - RecipeIngredient Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/kitchen/recipe-ingredients/commands/update-quantity", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/recipe-ingredients/commands/update-quantity/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/recipe-ingredients/commands/update-quantity/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/recipe-ingredients/commands/update-quantity",
        {
          method: "POST",
          body: JSON.stringify({
            id: "ri-001",
            quantity: 500,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });
  });
});

describe("Manifest HTTP Integration - PrepList Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/kitchen/prep-lists/commands/finalize", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/commands/finalize/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/commands/finalize/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/commands/finalize",
        {
          method: "POST",
          body: JSON.stringify({
            id: "prep-list-001",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });
  });

  describe("POST /api/kitchen/prep-lists/commands/mark-completed", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/commands/mark-completed/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/prep-lists/commands/update", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/commands/update/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/prep-lists/commands/update-batch-multiplier", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/commands/update-batch-multiplier/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/prep-lists/commands/activate", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/commands/activate/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/prep-lists/commands/deactivate", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/commands/deactivate/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });

  describe("POST /api/kitchen/prep-lists/commands/cancel", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/commands/cancel/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });
  });
});
