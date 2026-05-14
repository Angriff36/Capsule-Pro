/**
 * Inventory Item CRUD API Integration Tests
 *
 * Tests verify the inventory items list and create endpoints with pagination,
 * filters, and validation following the established patterns.
 */

import { database } from "@repo/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/inventory/items/route";
import {
  FSA_STATUSES,
  ITEM_CATEGORIES,
  type ItemCategory,
  UNITS_OF_MEASURE,
  type UnitOfMeasure,
} from "@/app/api/inventory/items/types";
import {
  validateCreateInventoryItemRequest,
  validateFSAStatus,
  validateItemCategory,
  validateNonNegativeNumber,
  validateUnitOfMeasure,
  validateUpdateInventoryItemRequest,
} from "@/app/api/inventory/items/validation";
import { InvariantError } from "@/app/lib/invariant";

// Mock dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest-command-handler", () => ({
  executeManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { executeManifestCommand } = await import(
  "@/lib/manifest-command-handler"
);

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "user_test123";
const TEST_ORG_ID = "org_test123";

/**
 * Mock inventory item factory
 */
function createMockInventoryItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-001",
    tenantId: TEST_TENANT_ID,
    item_number: "SKU-001",
    name: "Test Item",
    description: null,
    category: "produce",
    unitOfMeasure: "lb",
    unitCost: 5.99,
    quantityOnHand: 100,
    parLevel: 50,
    reorder_level: 20,
    supplierId: null,
    tags: [],
    fsa_status: "unknown",
    fsa_temp_logged: false,
    fsa_allergen_info: false,
    fsa_traceable: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

describe("Inventory Items CRUD API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default auth mock
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/inventory/items", () => {
    describe("authentication and authorization", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = new Request(
          "http://localhost/api/inventory/items?page=1&limit=20"
        );
        const response = await GET(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 404 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = new Request(
          "http://localhost/api/inventory/items?page=1&limit=20"
        );
        const response = await GET(request);

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });
    });

    describe("pagination", () => {
      it("should return paginated items for authenticated user", async () => {
        const mockItems = [
          createMockInventoryItem({ id: "item-1", item_number: "SKU-001" }),
          createMockInventoryItem({ id: "item-2", item_number: "SKU-002" }),
        ];

        vi.mocked(database.inventoryItem.count).mockResolvedValue(2);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue(
          mockItems as never
        );

        const request = new Request(
          "http://localhost/api/inventory/items?page=1&limit=20"
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const body = await response.json();

        expect(body.data).toHaveLength(2);
        expect(body.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        });
      });

      it("should respect page and limit parameters", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(50);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

        const request = new Request(
          "http://localhost/api/inventory/items?page=2&limit=10"
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 10,
            take: 10,
          })
        );
      });

      it("should enforce maximum limit of 100", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(200);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

        const request = new Request(
          "http://localhost/api/inventory/items?page=1&limit=500"
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 100,
          })
        );
      });

      it("should default to page 1 and limit 20", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(10);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

        const request = new Request("http://localhost/api/inventory/items");
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
            take: 20,
          })
        );
      });
    });

    describe("search filter", () => {
      it("should filter by search query on item_number and name", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(1);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({ item_number: "TEST-001", name: "Test" }),
        ] as never);

        const request = new Request(
          "http://localhost/api/inventory/items?search=TEST"
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                { item_number: { contains: "TEST", mode: "insensitive" } },
                { name: { contains: "TEST", mode: "insensitive" } },
              ],
            }),
          })
        );
      });
    });

    describe("category filter", () => {
      it("should filter by category", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(1);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({ category: "produce" }),
        ] as never);

        const request = new Request(
          "http://localhost/api/inventory/items?category=produce"
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              category: "produce",
            }),
          })
        );
      });

      it("should ignore invalid category values", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(1);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

        const request = new Request(
          "http://localhost/api/inventory/items?category=invalid_category"
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              category: expect.anything(),
            }),
          })
        );
      });
    });

    describe("stock status filter", () => {
      it("should filter by out_of_stock status", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(1);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({ quantityOnHand: 0 }),
        ] as never);

        const request = new Request(
          "http://localhost/api/inventory/items?stock_status=out_of_stock"
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              quantityOnHand: { equals: 0 },
            }),
          })
        );
      });

      it("should filter by in_stock status", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(1);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({ quantityOnHand: 100 }),
        ] as never);

        const request = new Request(
          "http://localhost/api/inventory/items?stock_status=in_stock"
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              quantityOnHand: { gt: 0 },
            }),
          })
        );
      });

      it("should calculate stock status based on quantity and reorder level", async () => {
        const mockItems = [
          createMockInventoryItem({
            quantityOnHand: 100,
            reorder_level: 20,
          }),
          createMockInventoryItem({
            quantityOnHand: 15,
            reorder_level: 20,
          }),
          createMockInventoryItem({ quantityOnHand: 0, reorder_level: 20 }),
        ];

        vi.mocked(database.inventoryItem.count).mockResolvedValue(3);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue(
          mockItems as never
        );

        const request = new Request("http://localhost/api/inventory/items");
        const response = await GET(request);
        const body = await response.json();

        expect(body.data[0].stock_status).toBe("in_stock");
        expect(body.data[1].stock_status).toBe("low_stock");
        expect(body.data[2].stock_status).toBe("out_of_stock");
      });
    });

    describe("supplier filter", () => {
      it("should filter by supplier_id", async () => {
        const supplierId = "supplier-123";
        vi.mocked(database.inventoryItem.count).mockResolvedValue(1);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({ supplierId }),
        ] as never);

        const request = new Request(
          `http://localhost/api/inventory/items?supplier_id=${supplierId}`
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              supplierId,
            }),
          })
        );
      });
    });

    describe("FSA status filter", () => {
      it("should filter by fsa_status", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(1);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({ fsa_status: "compliant" }),
        ] as never);

        const request = new Request(
          "http://localhost/api/inventory/items?fsa_status=compliant"
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              fsa_status: "compliant",
            }),
          })
        );
      });

      it("should ignore invalid fsa_status values", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(1);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

        const request = new Request(
          "http://localhost/api/inventory/items?fsa_status=invalid"
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              fsa_status: expect.anything(),
            }),
          })
        );
      });
    });

    describe("tags filter", () => {
      it("should filter by tags", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(1);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          createMockInventoryItem({ tags: ["organic", "local"] }),
        ] as never);

        const request = new Request(
          "http://localhost/api/inventory/items?tags=organic,local"
        );
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tags: { hasSome: ["organic", "local"] },
            }),
          })
        );
      });
    });

    describe("response format", () => {
      it("should return items with calculated fields", async () => {
        const mockItem = createMockInventoryItem({
          quantityOnHand: 100,
          unitCost: 5.99,
          reorder_level: 20,
        });

        vi.mocked(database.inventoryItem.count).mockResolvedValue(1);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
          mockItem,
        ] as never);

        const request = new Request("http://localhost/api/inventory/items");
        const response = await GET(request);
        const body = await response.json();

        expect(body.data[0]).toMatchObject({
          id: mockItem.id,
          item_number: mockItem.item_number,
          name: mockItem.name,
          stock_status: "in_stock",
          total_value: 599,
        });
      });

      it("should exclude soft-deleted items", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(0);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

        const request = new Request("http://localhost/api/inventory/items");
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              deletedAt: null,
            }),
          })
        );
      });

      it("should order by category and name", async () => {
        vi.mocked(database.inventoryItem.count).mockResolvedValue(0);
        vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

        const request = new Request("http://localhost/api/inventory/items");
        await GET(request);

        expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: [{ category: "asc" }, { name: "asc" }],
          })
        );
      });
    });

    describe("error handling", () => {
      it("should return 500 on database error", async () => {
        vi.mocked(database.inventoryItem.count).mockRejectedValue(
          new Error("Database error")
        );

        const request = new Request("http://localhost/api/inventory/items");
        const response = await GET(request);

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");
      });
    });
  });

  describe("POST /api/inventory/items", () => {
    it("should delegate to manifest command handler", async () => {
      const mockResponse = new Response(JSON.stringify({ id: "item-123" }), {
        status: 201,
      });
      vi.mocked(executeManifestCommand).mockResolvedValue(mockResponse);

      const request = new Request("http://localhost/api/inventory/items", {
        method: "POST",
        body: JSON.stringify({
          item_number: "SKU-001",
          name: "Test Item",
          category: "produce",
        }),
      });

      const response = await POST(request as never);

      expect(executeManifestCommand).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          entityName: "InventoryItem",
          commandName: "create",
        })
      );
      expect(response.status).toBe(201);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const mockResponse = new Response(
        JSON.stringify({ message: "Unauthorized" }),
        { status: 401 }
      );
      vi.mocked(executeManifestCommand).mockResolvedValue(mockResponse);

      const request = new Request("http://localhost/api/inventory/items", {
        method: "POST",
        body: JSON.stringify({
          item_number: "SKU-001",
          name: "Test Item",
        }),
      });

      const response = await POST(request as never);
      expect(response.status).toBe(401);
    });
  });
});

describe("Inventory Item Validation", () => {
  describe("validateCreateInventoryItemRequest", () => {
    it("should accept valid create request", () => {
      const validRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        category: "produce",
        unit_of_measure: "lb",
        unit_cost: 5.99,
        quantity_on_hand: 100,
        par_level: 50,
        reorder_level: 20,
        fsa_status: "compliant",
        fsa_temp_logged: true,
        fsa_allergen_info: false,
        fsa_traceable: true,
        tags: ["organic", "local"],
      };

      expect(() =>
        validateCreateInventoryItemRequest(validRequest)
      ).not.toThrow();
    });

    it("should accept minimal valid request", () => {
      const minimalRequest = {
        item_number: "SKU-001",
        name: "Test Item",
      };

      expect(() =>
        validateCreateInventoryItemRequest(minimalRequest)
      ).not.toThrow();
    });

    it("should reject missing item_number", () => {
      const invalidRequest = {
        name: "Test Item",
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "item_number is required"
      );
    });

    it("should reject missing name", () => {
      const invalidRequest = {
        item_number: "SKU-001",
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "name is required"
      );
    });

    it("should reject negative unit_cost", () => {
      const invalidRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        unit_cost: -5.99,
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "unit_cost must be a non-negative number"
      );
    });

    it("should reject negative par_level", () => {
      const invalidRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        par_level: -10,
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "par_level must be a non-negative number"
      );
    });

    it("should reject negative reorder_level", () => {
      const invalidRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        reorder_level: -5,
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "reorder_level must be a non-negative number"
      );
    });

    it("should reject negative quantity_on_hand", () => {
      const invalidRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        quantity_on_hand: -50,
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "quantity_on_hand must be a non-negative number"
      );
    });

    it("should reject invalid unit_of_measure", () => {
      const invalidRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        unit_of_measure: "bushel",
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "Invalid unit of measure"
      );
    });

    it("should reject invalid category", () => {
      const invalidRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        category: "invalid_category",
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "Invalid category"
      );
    });

    it("should accept valid FSA status values", () => {
      for (const status of FSA_STATUSES) {
        const validRequest = {
          item_number: "SKU-001",
          name: "Test Item",
          fsa_status: status,
        };

        expect(() =>
          validateCreateInventoryItemRequest(validRequest)
        ).not.toThrow();
      }
    });

    it("should reject invalid FSA status", () => {
      const invalidRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        fsa_status: "invalid_status",
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "Invalid FSA status"
      );
    });

    it("should reject non-boolean fsa_temp_logged", () => {
      const invalidRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        fsa_temp_logged: "yes",
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "fsa_temp_logged must be a boolean"
      );
    });

    it("should reject non-boolean fsa_allergen_info", () => {
      const invalidRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        fsa_allergen_info: 1,
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "fsa_allergen_info must be a boolean"
      );
    });

    it("should reject non-array tags", () => {
      const invalidRequest = {
        item_number: "SKU-001",
        name: "Test Item",
        tags: "organic",
      };

      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(invalidRequest)).toThrow(
        "tags must be an array"
      );
    });

    it("should reject null or undefined request body", () => {
      expect(() => validateCreateInventoryItemRequest(null)).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(null)).toThrow(
        "Request body is required"
      );

      expect(() => validateCreateInventoryItemRequest(undefined)).toThrow(
        InvariantError
      );
    });

    it("should reject non-object request body", () => {
      expect(() => validateCreateInventoryItemRequest("string")).toThrow(
        InvariantError
      );
      expect(() => validateCreateInventoryItemRequest(123)).toThrow(
        InvariantError
      );
    });
  });

  describe("validateUpdateInventoryItemRequest", () => {
    it("should accept valid partial update", () => {
      const validUpdate = {
        name: "Updated Name",
        unit_cost: 6.99,
      };

      expect(() =>
        validateUpdateInventoryItemRequest(validUpdate)
      ).not.toThrow();
    });

    it("should accept single field update", () => {
      const validUpdate = {
        quantity_on_hand: 50,
      };

      expect(() =>
        validateUpdateInventoryItemRequest(validUpdate)
      ).not.toThrow();
    });

    it("should reject empty update", () => {
      const emptyUpdate = {};

      expect(() => validateUpdateInventoryItemRequest(emptyUpdate)).toThrow(
        InvariantError
      );
      expect(() => validateUpdateInventoryItemRequest(emptyUpdate)).toThrow(
        "At least one field must be provided"
      );
    });

    it("should reject negative reorder_level", () => {
      const invalidUpdate = {
        reorder_level: -10,
      };

      expect(() => validateUpdateInventoryItemRequest(invalidUpdate)).toThrow(
        InvariantError
      );
      expect(() => validateUpdateInventoryItemRequest(invalidUpdate)).toThrow(
        "reorder_level must be a non-negative number"
      );
    });

    it("should reject invalid unit_of_measure", () => {
      const invalidUpdate = {
        unit_of_measure: "invalid_unit",
      };

      expect(() => validateUpdateInventoryItemRequest(invalidUpdate)).toThrow(
        InvariantError
      );
      expect(() => validateUpdateInventoryItemRequest(invalidUpdate)).toThrow(
        "Invalid unit of measure"
      );
    });

    it("should reject invalid category", () => {
      const invalidUpdate = {
        category: "invalid_category",
      };

      expect(() => validateUpdateInventoryItemRequest(invalidUpdate)).toThrow(
        InvariantError
      );
      expect(() => validateUpdateInventoryItemRequest(invalidUpdate)).toThrow(
        "Invalid category"
      );
    });

    it("should reject invalid FSA status", () => {
      const invalidUpdate = {
        fsa_status: "invalid_status",
      };

      expect(() => validateUpdateInventoryItemRequest(invalidUpdate)).toThrow(
        InvariantError
      );
      expect(() => validateUpdateInventoryItemRequest(invalidUpdate)).toThrow(
        "Invalid FSA status"
      );
    });

    it("should accept all valid FSA statuses", () => {
      for (const status of FSA_STATUSES) {
        const validUpdate = {
          fsa_status: status,
        };

        expect(() =>
          validateUpdateInventoryItemRequest(validUpdate)
        ).not.toThrow();
      }
    });

    it("should accept null or undefined for optional fields", () => {
      const validUpdate = {
        description: null,
        supplier_id: null,
      };

      expect(() =>
        validateUpdateInventoryItemRequest(validUpdate)
      ).not.toThrow();
    });

    it("should reject non-array tags", () => {
      const invalidUpdate = {
        tags: "organic",
      };

      expect(() => validateUpdateInventoryItemRequest(invalidUpdate)).toThrow(
        InvariantError
      );
      expect(() => validateUpdateInventoryItemRequest(invalidUpdate)).toThrow(
        "tags must be an array"
      );
    });
  });

  describe("validateUnitOfMeasure", () => {
    it("should accept valid units", () => {
      const validUnits: UnitOfMeasure[] = [
        "each",
        "lb",
        "oz",
        "kg",
        "g",
        "gal",
        "l",
        "ml",
      ];

      for (const unit of validUnits) {
        expect(() => validateUnitOfMeasure(unit)).not.toThrow();
      }
    });

    it("should accept all defined units of measure", () => {
      for (const unit of UNITS_OF_MEASURE) {
        expect(() => validateUnitOfMeasure(unit)).not.toThrow();
      }
    });

    it("should reject invalid units", () => {
      expect(() => validateUnitOfMeasure("bushel")).toThrow(InvariantError);
      expect(() => validateUnitOfMeasure("bushel")).toThrow(
        "Invalid unit of measure"
      );
    });

    it("should accept null/undefined (optional)", () => {
      expect(() => validateUnitOfMeasure(null)).not.toThrow();
      expect(() => validateUnitOfMeasure(undefined)).not.toThrow();
    });
  });

  describe("validateItemCategory", () => {
    it("should accept valid categories", () => {
      const validCategories: ItemCategory[] = [
        "produce",
        "meat",
        "dairy",
        "frozen",
        "dry_goods",
      ];

      for (const category of validCategories) {
        expect(() => validateItemCategory(category)).not.toThrow();
      }
    });

    it("should accept all defined item categories", () => {
      for (const category of ITEM_CATEGORIES) {
        expect(() => validateItemCategory(category)).not.toThrow();
      }
    });

    it("should reject invalid categories", () => {
      expect(() => validateItemCategory("invalid")).toThrow(InvariantError);
      expect(() => validateItemCategory("invalid")).toThrow("Invalid category");
    });

    it("should reject null/undefined", () => {
      expect(() => validateItemCategory(null)).toThrow(InvariantError);
      expect(() => validateItemCategory(null)).toThrow("Category is required");

      expect(() => validateItemCategory(undefined)).toThrow(InvariantError);
    });
  });

  describe("validateFSAStatus", () => {
    it("should accept all valid FSA status values", () => {
      for (const status of FSA_STATUSES) {
        expect(() => validateFSAStatus(status)).not.toThrow();
      }
    });

    it("should reject invalid FSA status", () => {
      expect(() => validateFSAStatus("invalid")).toThrow(InvariantError);
      expect(() => validateFSAStatus("invalid")).toThrow("Invalid FSA status");
    });

    it("should accept null/undefined (optional)", () => {
      expect(() => validateFSAStatus(null)).not.toThrow();
      expect(() => validateFSAStatus(undefined)).not.toThrow();
    });
  });

  describe("validateNonNegativeNumber", () => {
    it("should accept zero", () => {
      expect(() => validateNonNegativeNumber(0, "test_field")).not.toThrow();
    });

    it("should accept positive numbers", () => {
      expect(() => validateNonNegativeNumber(5, "test_field")).not.toThrow();
      expect(() =>
        validateNonNegativeNumber(99.99, "test_field")
      ).not.toThrow();
      expect(() => validateNonNegativeNumber(1000, "test_field")).not.toThrow();
    });

    it("should reject negative numbers", () => {
      expect(() => validateNonNegativeNumber(-1, "test_field")).toThrow(
        InvariantError
      );
      expect(() => validateNonNegativeNumber(-1, "test_field")).toThrow(
        "test_field must be a non-negative number"
      );
    });

    it("should reject NaN", () => {
      expect(() => validateNonNegativeNumber(Number.NaN, "test_field")).toThrow(
        InvariantError
      );
    });

    it("should accept null/undefined (optional)", () => {
      expect(() => validateNonNegativeNumber(null, "test_field")).not.toThrow();
      expect(() =>
        validateNonNegativeNumber(undefined, "test_field")
      ).not.toThrow();
    });

    it("should reject non-numeric strings", () => {
      expect(() => validateNonNegativeNumber("abc", "test_field")).toThrow(
        InvariantError
      );
    });

    it("should accept numeric strings", () => {
      expect(() => validateNonNegativeNumber("5", "test_field")).not.toThrow();
    });
  });
});
