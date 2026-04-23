/**
 * Event Lifecycle Integration Tests
 *
 * Tests event budget validation and route handlers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { database } from "@repo/database";
import { NextRequest } from "next/server";
import {
  validateCreateEventBudget,
  validateUpdateEventBudget,
  CreateEventBudgetSchema,
} from "@/app/api/events/budgets/validation";
import { GET, POST } from "@/app/api/events/budgets/route";

// Mock dependencies
vi.mock("@repo/database", () => ({
  database: {
    event: {
      findUnique: vi.fn(),
    },
    eventBudget: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    budgetLineItem: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/app/lib/invariant", async () => {
  const actual = await vi.importActual("@/app/lib/invariant");
  return actual;
});

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Import mocked modules
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Test constants
const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_EVENT_ID = "b0000000-0000-4000-a000-000000000010";
const TEST_USER_ORG = "test-org-123";

// Mock data factories
function createMockEvent(overrides = {}) {
  return {
    id: TEST_EVENT_ID,
    tenantId: TEST_TENANT_ID,
    title: "Test Event",
    eventType: "corporate",
    eventDate: new Date("2026-06-15"),
    guestCount: 100,
    status: "confirmed",
    ...overrides,
  };
}

function createMockBudget(overrides = {}) {
  return {
    id: "budget-001",
    tenantId: TEST_TENANT_ID,
    eventId: TEST_EVENT_ID,
    status: "draft",
    totalBudgetAmount: 5000,
    totalActualAmount: 0,
    varianceAmount: 5000,
    variancePercentage: 0,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    lineItems: [],
    ...overrides,
  };
}

function createMockLineItem(overrides = {}) {
  return {
    id: "line-item-001",
    tenantId: TEST_TENANT_ID,
    budgetId: "budget-001",
    category: "food",
    name: "Catering",
    description: null,
    budgetedAmount: 2000,
    actualAmount: 0,
    varianceAmount: 2000,
    sortOrder: 0,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

// Helper to create mock request
function createMockRequest(url: string, options: RequestInit = {}): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

describe("Event Budget Validation", () => {
  describe("CreateEventBudgetSchema", () => {
    it("should accept valid budget with line items", () => {
      const validData = {
        eventId: TEST_EVENT_ID,
        status: "draft" as const,
        totalBudgetAmount: 5000,
        notes: "Q4 Corporate Event Budget",
        lineItems: [
          {
            category: "food" as const,
            name: "Catering Services",
            description: "Main course and appetizers",
            budgetedAmount: 2000,
            sortOrder: 0,
          },
          {
            category: "beverage" as const,
            name: "Bar Service",
            budgetedAmount: 1000,
            sortOrder: 1,
          },
        ],
      };

      const result = CreateEventBudgetSchema.parse(validData);
      expect(result.eventId).toBe(TEST_EVENT_ID);
      expect(result.totalBudgetAmount).toBe(5000);
      expect(result.lineItems).toHaveLength(2);
    });

    it("should reject when line items total exceeds totalBudgetAmount", () => {
      const invalidData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 1000,
        lineItems: [
          {
            category: "food" as const,
            name: "Catering",
            budgetedAmount: 800,
          },
          {
            category: "beverage" as const,
            name: "Bar",
            budgetedAmount: 500,
          },
        ],
      };

      expect(() => CreateEventBudgetSchema.parse(invalidData)).toThrow(
        "Line item budgeted amounts cannot exceed the total budget amount"
      );
    });

    it("should allow zero totalBudgetAmount with line items (auto-calculate)", () => {
      const validData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 0,
        lineItems: [
          {
            category: "food" as const,
            name: "Catering",
            budgetedAmount: 2000,
          },
          {
            category: "labor" as const,
            name: "Staff",
            budgetedAmount: 1500,
          },
        ],
      };

      const result = CreateEventBudgetSchema.parse(validData);
      expect(result.totalBudgetAmount).toBe(0);
      expect(result.lineItems).toHaveLength(2);
    });

    it("should reject non-draft status with zero budget amount", () => {
      const invalidData = {
        eventId: TEST_EVENT_ID,
        status: "approved" as const,
        totalBudgetAmount: 0,
      };

      expect(() => CreateEventBudgetSchema.parse(invalidData)).toThrow(
        "Non-draft budgets must have a positive total budget amount"
      );
    });

    it("should accept draft status with zero budget amount", () => {
      const validData = {
        eventId: TEST_EVENT_ID,
        status: "draft" as const,
        totalBudgetAmount: 0,
      };

      const result = CreateEventBudgetSchema.parse(validData);
      expect(result.status).toBe("draft");
      expect(result.totalBudgetAmount).toBe(0);
    });

    it("should reject negative budget amounts", () => {
      const invalidData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: -500,
      };

      expect(() => CreateEventBudgetSchema.parse(invalidData)).toThrow(
        "Budget amount must be non-negative"
      );
    });

    it("should reject invalid eventId format (not UUID)", () => {
      const invalidData = {
        eventId: "not-a-valid-uuid",
        totalBudgetAmount: 1000,
      };

      expect(() => CreateEventBudgetSchema.parse(invalidData)).toThrow(
        "Invalid event ID format"
      );
    });

    it("should validate line item categories against enum", () => {
      const invalidData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 1000,
        lineItems: [
          {
            category: "invalid_category" as any,
            name: "Test Item",
            budgetedAmount: 500,
          },
        ],
      };

      expect(() => CreateEventBudgetSchema.parse(invalidData)).toThrow();
    });

    it("should reject empty line item names", () => {
      const invalidData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 1000,
        lineItems: [
          {
            category: "food" as const,
            name: "",
            budgetedAmount: 500,
          },
        ],
      };

      expect(() => CreateEventBudgetSchema.parse(invalidData)).toThrow(
        "Line item name is required"
      );
    });

    it("should default status to draft when not provided", () => {
      const validData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 1000,
      };

      const result = CreateEventBudgetSchema.parse(validData);
      expect(result.status).toBe("draft");
    });

    it("should default lineItems to empty array when not provided", () => {
      const validData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 1000,
      };

      const result = CreateEventBudgetSchema.parse(validData);
      expect(result.lineItems).toEqual([]);
    });

    it("should validate all budget category enum values", () => {
      const categories = [
        "food",
        "labor",
        "equipment",
        "rental",
        "transportation",
        "beverage",
        "decor",
        "entertainment",
        "service",
        "other",
      ] as const;

      for (const category of categories) {
        const validData = {
          eventId: TEST_EVENT_ID,
          totalBudgetAmount: 1000,
          lineItems: [
            {
              category,
              name: "Test Item",
              budgetedAmount: 500,
            },
          ],
        };

        const result = CreateEventBudgetSchema.parse(validData);
        expect(result.lineItems[0].category).toBe(category);
      }
    });
  });

  describe("validateCreateEventBudget function", () => {
    it("should parse valid data and return typed result", () => {
      const validData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 3000,
        lineItems: [
          {
            category: "food",
            name: "Catering",
            budgetedAmount: 2000,
          },
        ],
      };

      const result = validateCreateEventBudget(validData);
      expect(result.eventId).toBe(TEST_EVENT_ID);
      expect(result.totalBudgetAmount).toBe(3000);
      expect(result.lineItems).toHaveLength(1);
    });

    it("should throw ZodError for invalid data", () => {
      const invalidData = {
        eventId: "invalid",
        totalBudgetAmount: -100,
      };

      expect(() => validateCreateEventBudget(invalidData)).toThrow();
    });
  });

  describe("validateUpdateEventBudget function", () => {
    it("should parse valid update data", () => {
      const validData = {
        status: "approved" as const,
        totalBudgetAmount: 6000,
        notes: "Updated budget after client review",
      };

      const result = validateUpdateEventBudget(validData);
      expect(result.status).toBe("approved");
      expect(result.totalBudgetAmount).toBe(6000);
    });

    it("should reject empty update object", () => {
      const invalidData = {};

      expect(() => validateUpdateEventBudget(invalidData)).toThrow(
        "At least one field must be provided for update"
      );
    });

    it("should allow partial updates", () => {
      const validData = {
        status: "active" as const,
      };

      const result = validateUpdateEventBudget(validData);
      expect(result.status).toBe("active");
      expect(result.totalBudgetAmount).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });
});

describe("Event Budget API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/events/budgets", () => {
    it("should return paginated budgets with line items", async () => {
      const mockBudgets = [
        createMockBudget({
          id: "budget-001",
          lineItems: [
            createMockLineItem({ id: "line-001", name: "Catering" }),
            createMockLineItem({
              id: "line-002",
              name: "Bar Service",
              category: "beverage",
            }),
          ],
        }),
        createMockBudget({
          id: "budget-002",
          eventId: "event-002",
          lineItems: [],
        }),
      ];

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.eventBudget.findMany).mockResolvedValue(mockBudgets);
      vi.mocked(database.eventBudget.count).mockResolvedValue(2);

      const request = createMockRequest("http://localhost:3000/api/events/budgets");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgets).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(20);
      expect(data.totalPages).toBe(1);
      expect(data.budgets[0].lineItems).toHaveLength(2);
    });

    it("should filter by eventId", async () => {
      const mockBudgets = [createMockBudget()];

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.eventBudget.findMany).mockResolvedValue(mockBudgets);
      vi.mocked(database.eventBudget.count).mockResolvedValue(1);

      const request = createMockRequest(
        `http://localhost:3000/api/events/budgets?eventId=${TEST_EVENT_ID}`
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgets).toHaveLength(1);
      expect(database.eventBudget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ eventId: TEST_EVENT_ID }),
            ]),
          }),
        })
      );
    });

    it("should filter by status", async () => {
      const mockBudgets = [
        createMockBudget({ id: "budget-001", status: "approved" }),
      ];

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.eventBudget.findMany).mockResolvedValue(mockBudgets);
      vi.mocked(database.eventBudget.count).mockResolvedValue(1);

      const request = createMockRequest(
        "http://localhost:3000/api/events/budgets?status=approved"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgets).toHaveLength(1);
      expect(database.eventBudget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ status: "approved" }),
            ]),
          }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const request = createMockRequest("http://localhost:3000/api/events/budgets");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("should handle pagination parameters", async () => {
      const mockBudgets = [createMockBudget()];

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.eventBudget.findMany).mockResolvedValue(mockBudgets);
      vi.mocked(database.eventBudget.count).mockResolvedValue(50);

      const request = createMockRequest(
        "http://localhost:3000/api/events/budgets?page=2&limit=10"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.page).toBe(2);
      expect(data.limit).toBe(10);
      expect(data.totalPages).toBe(5);
      expect(database.eventBudget.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 10, // (page 2 - 1) * limit 10
        })
      );
    });

    it("should return empty array when no budgets found", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.eventBudget.findMany).mockResolvedValue([]);
      vi.mocked(database.eventBudget.count).mockResolvedValue(0);

      const request = createMockRequest("http://localhost:3000/api/events/budgets");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgets).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.totalPages).toBe(0);
    });
  });

  describe("POST /api/events/budgets", () => {
    it("should create budget with valid data and line items", async () => {
      const newBudgetData = {
        eventId: TEST_EVENT_ID,
        status: "draft",
        totalBudgetAmount: 5000,
        notes: "Initial budget draft",
        lineItems: [
          {
            category: "food",
            name: "Catering Services",
            budgetedAmount: 2000,
            sortOrder: 0,
          },
          {
            category: "beverage",
            name: "Bar Service",
            budgetedAmount: 1000,
            sortOrder: 1,
          },
        ],
      };

      const createdBudget = createMockBudget({
        id: "new-budget-001",
        totalBudgetAmount: 5000,
        lineItems: [
          createMockLineItem({
            id: "line-001",
            name: "Catering Services",
            budgetedAmount: 2000,
          }),
          createMockLineItem({
            id: "line-002",
            name: "Bar Service",
            category: "beverage",
            budgetedAmount: 1000,
          }),
        ],
      });

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.event.findUnique).mockResolvedValue(createMockEvent());
      vi.mocked(database.eventBudget.findFirst).mockResolvedValue(null);
      vi.mocked(database.$transaction).mockImplementation(async (fn: any) => fn(database));
      vi.mocked(database.eventBudget.create).mockResolvedValue({
        id: "new-budget-001",
        tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID,
        status: "draft",
        totalBudgetAmount: 5000,
        totalActualAmount: 0,
        varianceAmount: 5000,
        variancePercentage: 0,
        notes: "Initial budget draft",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);
      vi.mocked(database.budgetLineItem.createMany).mockResolvedValue({
        count: 2,
      } as any);
      vi.mocked(database.eventBudget.findUnique).mockResolvedValue(createdBudget);

      const request = createMockRequest("http://localhost:3000/api/events/budgets", {
        method: "POST",
        body: JSON.stringify(newBudgetData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("new-budget-001");
      expect(data.totalBudgetAmount).toBe(5000);
      expect(data.lineItems).toHaveLength(2);
      expect(database.eventBudget.create).toHaveBeenCalled();
      expect(database.budgetLineItem.createMany).toHaveBeenCalled();
    });

    it("should reject when event does not exist", async () => {
      const newBudgetData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 1000,
      };

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.event.findUnique).mockResolvedValue(null);

      const request = createMockRequest("http://localhost:3000/api/events/budgets", {
        method: "POST",
        body: JSON.stringify(newBudgetData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(database.eventBudget.create).not.toHaveBeenCalled();
    });

    it("should reject when budget already exists for event", async () => {
      const newBudgetData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 1000,
      };

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.event.findUnique).mockResolvedValue(createMockEvent());
      vi.mocked(database.eventBudget.findFirst).mockResolvedValue(
        createMockBudget()
      );

      const request = createMockRequest("http://localhost:3000/api/events/budgets", {
        method: "POST",
        body: JSON.stringify(newBudgetData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(database.eventBudget.create).not.toHaveBeenCalled();
    });

    it("should reject when line items exceed total budget", async () => {
      const newBudgetData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 1000,
        lineItems: [
          {
            category: "food",
            name: "Catering",
            budgetedAmount: 800,
          },
          {
            category: "beverage",
            name: "Bar",
            budgetedAmount: 500,
          },
        ],
      };

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);

      const request = createMockRequest("http://localhost:3000/api/events/budgets", {
        method: "POST",
        body: JSON.stringify(newBudgetData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(database.eventBudget.create).not.toHaveBeenCalled();
    });

    it("should auto-calculate total from line items when totalBudgetAmount is 0", async () => {
      const newBudgetData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 0,
        lineItems: [
          {
            category: "food",
            name: "Catering",
            budgetedAmount: 2000,
          },
          {
            category: "labor",
            name: "Staff",
            budgetedAmount: 1500,
          },
        ],
      };

      const createdBudget = createMockBudget({
        id: "new-budget-002",
        totalBudgetAmount: 3500, // Auto-calculated
        lineItems: [
          createMockLineItem({
            id: "line-001",
            name: "Catering",
            budgetedAmount: 2000,
          }),
          createMockLineItem({
            id: "line-002",
            name: "Staff",
            category: "labor",
            budgetedAmount: 1500,
          }),
        ],
      });

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.event.findUnique).mockResolvedValue(createMockEvent());
      vi.mocked(database.eventBudget.findFirst).mockResolvedValue(null);
      vi.mocked(database.$transaction).mockImplementation(async (fn: any) => fn(database));
      vi.mocked(database.eventBudget.create).mockResolvedValue({
        id: "new-budget-002",
        tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID,
        status: "draft",
        totalBudgetAmount: 3500,
        totalActualAmount: 0,
        varianceAmount: 3500,
        variancePercentage: 0,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);
      vi.mocked(database.budgetLineItem.createMany).mockResolvedValue({
        count: 2,
      } as any);
      vi.mocked(database.eventBudget.findUnique).mockResolvedValue(createdBudget);

      const request = createMockRequest("http://localhost:3000/api/events/budgets", {
        method: "POST",
        body: JSON.stringify(newBudgetData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.totalBudgetAmount).toBe(3500);
      expect(data.lineItems).toHaveLength(2);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as any);

      const request = createMockRequest("http://localhost:3000/api/events/budgets", {
        method: "POST",
        body: JSON.stringify({
          eventId: TEST_EVENT_ID,
          totalBudgetAmount: 1000,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("should create budget without line items", async () => {
      const newBudgetData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 2500,
      };

      const createdBudget = createMockBudget({
        id: "new-budget-003",
        totalBudgetAmount: 2500,
        lineItems: [],
      });

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.event.findUnique).mockResolvedValue(createMockEvent());
      vi.mocked(database.eventBudget.findFirst).mockResolvedValue(null);
      vi.mocked(database.$transaction).mockImplementation(async (fn: any) => fn(database));
      vi.mocked(database.eventBudget.create).mockResolvedValue({
        id: "new-budget-003",
        tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID,
        status: "draft",
        totalBudgetAmount: 2500,
        totalActualAmount: 0,
        varianceAmount: 2500,
        variancePercentage: 0,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any);
      vi.mocked(database.eventBudget.findUnique).mockResolvedValue(createdBudget);

      const request = createMockRequest("http://localhost:3000/api/events/budgets", {
        method: "POST",
        body: JSON.stringify(newBudgetData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe("new-budget-003");
      expect(data.totalBudgetAmount).toBe(2500);
      expect(data.lineItems).toEqual([]);
      expect(database.budgetLineItem.createMany).not.toHaveBeenCalled();
    });

    it("should handle invalid JSON body", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);

      const request = createMockRequest("http://localhost:3000/api/events/budgets", {
        method: "POST",
        body: "invalid-json",
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it("should validate negative line item amounts", async () => {
      const newBudgetData = {
        eventId: TEST_EVENT_ID,
        totalBudgetAmount: 1000,
        lineItems: [
          {
            category: "food",
            name: "Catering",
            budgetedAmount: -500,
          },
        ],
      };

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);

      const request = createMockRequest("http://localhost:3000/api/events/budgets", {
        method: "POST",
        body: JSON.stringify(newBudgetData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(database.eventBudget.create).not.toHaveBeenCalled();
    });
  });
});
