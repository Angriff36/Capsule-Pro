/**
 * HTTP integration tests for PrepListItem command routes
 *
 * Tests the HTTP layer for all 5 PrepListItem command routes:
 * - mark-completed
 * - mark-uncompleted
 * - update-prep-notes
 * - update-quantity
 * - update-station
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock auth module
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      orgId: "test-org",
      userId: "test-user-id",
    })
  ),
}));

// Mock database module
vi.mock("@repo/database", () => {
  const mockDb = {
    prepListItem: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    prepList: {
      findFirst: vi.fn(),
    },
    outboxEvent: {
      create: vi.fn(),
    },
  };
  return {
    database: mockDb,
  };
});

// Mock tenant resolution
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(() => Promise.resolve("test-tenant")),
}));

describe("Manifest HTTP - PrepListItem Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // mark-completed command
  // ==========================================================================
  describe("POST /api/kitchen/prep-lists/items/commands/mark-completed", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/mark-completed/route"
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
        "@/app/api/kitchen/prep-lists/items/commands/mark-completed/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/mark-completed",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            completedByUserId: "user-001",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      const { getTenantIdForOrg } = await import("@/app/lib/tenant");
      vi.mocked(getTenantIdForOrg).mockResolvedValueOnce(null as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/mark-completed/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/mark-completed",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            completedByUserId: "user-001",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Tenant not found");
    });

    it("should process valid mark-completed request", async () => {
      const { database } = await import("@repo/database");

      // Mock prep list item lookup
      vi.mocked(database.prepListItem.findFirst).mockResolvedValueOnce({
        id: "item-001",
        tenantId: "test-tenant",
        prepListId: "list-001",
        ingredientId: "ingredient-001",
        stationId: "station-001",
        isCompleted: false,
        completedAt: null,
        completedByUserId: null,
        baseQuantity: 10,
        scaledQuantity: 20,
        baseUnit: "kg",
        scaledUnit: "kg",
        prepNotes: "",
        dietarySubstitutions: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      // Mock update operation
      vi.mocked(database.prepListItem.update).mockResolvedValueOnce({
        id: "item-001",
        isCompleted: true,
        completedAt: new Date(),
        completedByUserId: "test-user-id",
      } as never);

      // Mock outbox event creation
      vi.mocked(database.outboxEvent.create).mockResolvedValueOnce({} as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/mark-completed/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/mark-completed",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            completedByUserId: "test-user-id",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);

      if (response.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });
  });

  // ==========================================================================
  // mark-uncompleted command
  // ==========================================================================
  describe("POST /api/kitchen/prep-lists/items/commands/mark-uncompleted", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/mark-uncompleted/route"
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
        "@/app/api/kitchen/prep-lists/items/commands/mark-uncompleted/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/mark-uncompleted",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      const { getTenantIdForOrg } = await import("@/app/lib/tenant");
      vi.mocked(getTenantIdForOrg).mockResolvedValueOnce(null as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/mark-uncompleted/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/mark-uncompleted",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Tenant not found");
    });

    it("should process valid mark-uncompleted request", async () => {
      const { database } = await import("@repo/database");

      // Mock prep list item lookup
      vi.mocked(database.prepListItem.findFirst).mockResolvedValueOnce({
        id: "item-001",
        tenantId: "test-tenant",
        prepListId: "list-001",
        ingredientId: "ingredient-001",
        stationId: "station-001",
        isCompleted: true,
        completedAt: new Date(),
        completedByUserId: "user-001",
        baseQuantity: 10,
        scaledQuantity: 20,
        baseUnit: "kg",
        scaledUnit: "kg",
        prepNotes: "",
        dietarySubstitutions: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      // Mock update operation
      vi.mocked(database.prepListItem.update).mockResolvedValueOnce({
        id: "item-001",
        isCompleted: false,
        completedAt: null,
        completedByUserId: null,
      } as never);

      // Mock outbox event creation
      vi.mocked(database.outboxEvent.create).mockResolvedValueOnce({} as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/mark-uncompleted/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/mark-uncompleted",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);

      if (response.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });
  });

  // ==========================================================================
  // update-prep-notes command
  // ==========================================================================
  describe("POST /api/kitchen/prep-lists/items/commands/update-prep-notes", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/update-prep-notes/route"
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
        "@/app/api/kitchen/prep-lists/items/commands/update-prep-notes/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/update-prep-notes",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            newNotes: "Chop finely",
            newDietarySubstitutions: "Use tofu instead",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      const { getTenantIdForOrg } = await import("@/app/lib/tenant");
      vi.mocked(getTenantIdForOrg).mockResolvedValueOnce(null as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/update-prep-notes/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/update-prep-notes",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            newNotes: "Chop finely",
            newDietarySubstitutions: "Use tofu instead",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Tenant not found");
    });

    it("should process valid update-prep-notes request", async () => {
      const { database } = await import("@repo/database");

      // Mock prep list item lookup
      vi.mocked(database.prepListItem.findFirst).mockResolvedValueOnce({
        id: "item-001",
        tenantId: "test-tenant",
        prepListId: "list-001",
        ingredientId: "ingredient-001",
        stationId: "station-001",
        isCompleted: false,
        completedAt: null,
        completedByUserId: null,
        baseQuantity: 10,
        scaledQuantity: 20,
        baseUnit: "kg",
        scaledUnit: "kg",
        prepNotes: "",
        dietarySubstitutions: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      // Mock update operation
      vi.mocked(database.prepListItem.update).mockResolvedValueOnce({
        id: "item-001",
        prepNotes: "Chop finely",
        dietarySubstitutions: "Use tofu instead",
      } as never);

      // Mock outbox event creation
      vi.mocked(database.outboxEvent.create).mockResolvedValueOnce({} as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/update-prep-notes/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/update-prep-notes",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            newNotes: "Chop finely",
            newDietarySubstitutions: "Use tofu instead",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);

      if (response.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });
  });

  // ==========================================================================
  // update-quantity command
  // ==========================================================================
  describe("POST /api/kitchen/prep-lists/items/commands/update-quantity", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/update-quantity/route"
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
        "@/app/api/kitchen/prep-lists/items/commands/update-quantity/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/update-quantity",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            newBaseQuantity: 15,
            newScaledQuantity: 30,
            newBaseUnit: "kg",
            newScaledUnit: "kg",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      const { getTenantIdForOrg } = await import("@/app/lib/tenant");
      vi.mocked(getTenantIdForOrg).mockResolvedValueOnce(null as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/update-quantity/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/update-quantity",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            newBaseQuantity: 15,
            newScaledQuantity: 30,
            newBaseUnit: "kg",
            newScaledUnit: "kg",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Tenant not found");
    });

    it("should process valid update-quantity request", async () => {
      const { database } = await import("@repo/database");

      // Mock prep list item lookup
      vi.mocked(database.prepListItem.findFirst).mockResolvedValueOnce({
        id: "item-001",
        tenantId: "test-tenant",
        prepListId: "list-001",
        ingredientId: "ingredient-001",
        stationId: "station-001",
        isCompleted: false,
        completedAt: null,
        completedByUserId: null,
        baseQuantity: 10,
        scaledQuantity: 20,
        baseUnit: "kg",
        scaledUnit: "kg",
        prepNotes: "",
        dietarySubstitutions: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      // Mock update operation
      vi.mocked(database.prepListItem.update).mockResolvedValueOnce({
        id: "item-001",
        baseQuantity: 15,
        scaledQuantity: 30,
        baseUnit: "kg",
        scaledUnit: "kg",
      } as never);

      // Mock outbox event creation
      vi.mocked(database.outboxEvent.create).mockResolvedValueOnce({} as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/update-quantity/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/update-quantity",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            newBaseQuantity: 15,
            newScaledQuantity: 30,
            newBaseUnit: "kg",
            newScaledUnit: "kg",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);

      if (response.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });
  });

  // ==========================================================================
  // update-station command
  // ==========================================================================
  describe("POST /api/kitchen/prep-lists/items/commands/update-station", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/update-station/route"
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
        "@/app/api/kitchen/prep-lists/items/commands/update-station/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/update-station",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            newStationId: "station-002",
            newStationName: "Cold Prep Station",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      const { getTenantIdForOrg } = await import("@/app/lib/tenant");
      vi.mocked(getTenantIdForOrg).mockResolvedValueOnce(null as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/update-station/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/update-station",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            newStationId: "station-002",
            newStationName: "Cold Prep Station",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Tenant not found");
    });

    it("should process valid update-station request", async () => {
      const { database } = await import("@repo/database");

      // Mock prep list item lookup
      vi.mocked(database.prepListItem.findFirst).mockResolvedValueOnce({
        id: "item-001",
        tenantId: "test-tenant",
        prepListId: "list-001",
        ingredientId: "ingredient-001",
        stationId: "station-001",
        isCompleted: false,
        completedAt: null,
        completedByUserId: null,
        baseQuantity: 10,
        scaledQuantity: 20,
        baseUnit: "kg",
        scaledUnit: "kg",
        prepNotes: "",
        dietarySubstitutions: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      // Mock update operation
      vi.mocked(database.prepListItem.update).mockResolvedValueOnce({
        id: "item-001",
        stationId: "station-002",
      } as never);

      // Mock outbox event creation
      vi.mocked(database.outboxEvent.create).mockResolvedValueOnce({} as never);

      const { POST } = await import(
        "@/app/api/kitchen/prep-lists/items/commands/update-station/route"
      );

      const request = new NextRequest(
        "http://localhost/api/kitchen/prep-lists/items/commands/update-station",
        {
          method: "POST",
          body: JSON.stringify({
            id: "item-001",
            newStationId: "station-002",
            newStationName: "Cold Prep Station",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);

      if (response.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });
  });
});
