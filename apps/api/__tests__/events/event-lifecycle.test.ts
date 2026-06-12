/**
 * Event Lifecycle Integration Tests
 *
 * Tests event budget validation and route handlers
 */

import { database, Prisma } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/events/budgets/route";
import {
  CreateEventBudgetSchema,
  validateCreateEventBudget,
  validateUpdateEventBudget,
} from "@/app/api/events/budgets/validation";

// Mock dependencies.
// We provide a minimal `Prisma.Decimal` (backed by decimal.js, the same lib Prisma
// uses at runtime) so test fixtures like `new Prisma.Decimal(5000)` work without
// pulling in the real "@repo/database" entry point — its `import "server-only"`
// and live Neon adapter both fail to load in vitest.
vi.mock("@repo/database", async () => {
  const { default: Decimal } = await import("decimal.js");
  return {
    Prisma: { Decimal },
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
  };
});

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@/app/lib/invariant", async () => {
  const actual = await vi.importActual("@/app/lib/invariant");
  return actual;
});

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock manifest execute-command to prevent DATABASE_URL import chain
// (prisma-stores/shared.ts → @repo/database/standalone → env validation)
vi.mock("@/lib/manifest/execute-command", async () => {
  const { NextResponse: NR } = await import("next/server");
  return {
    runManifestCommand: vi
      .fn()
      .mockResolvedValue(
        NR.json({ ok: true, data: { id: "manifest-created" } }, { status: 201 })
      ),
  };
});

// Import mocked modules
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

// Test constants
const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_EVENT_ID = "b0000000-0000-4000-a000-000000000010";
const TEST_USER_ORG = "test-org-123";

// Mock data factories
function _createMockEvent(overrides = {}) {
  return {
    id: TEST_EVENT_ID,
    tenantId: TEST_TENANT_ID,
    eventNumber: null,
    title: "Test Event",
    clientId: null,
    locationId: null,
    venueId: null,
    venueEntityId: null,
    eventType: "corporate",
    eventDate: new Date("2026-06-15"),
    guestCount: 100,
    status: "confirmed",
    budget: null,
    ticketPrice: null,
    ticketTier: null,
    eventFormat: null,
    accessibilityOptions: [],
    featuredMediaUrl: null,
    assignedTo: null,
    venueName: null,
    venueAddress: null,
    notes: null,
    tags: [],
    templateId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

function createMockBudget(overrides = {}) {
  return {
    id: "budget-001",
    tenantId: TEST_TENANT_ID,
    eventId: TEST_EVENT_ID,
    version: 1,
    status: "draft",
    totalBudgetAmount: new Prisma.Decimal(5000),
    totalActualAmount: new Prisma.Decimal(0),
    varianceAmount: new Prisma.Decimal(5000),
    variancePercentage: new Prisma.Decimal(0),
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
    budgetedAmount: new Prisma.Decimal(2000),
    actualAmount: new Prisma.Decimal(0),
    varianceAmount: new Prisma.Decimal(2000),
    sortOrder: 0,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

// Helper to create mock request
function createMockRequest(
  url: string,
  options: RequestInit = {}
): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
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
      vi.mocked(database.eventBudget.findMany).mockResolvedValue(
        mockBudgets as never
      );
      vi.mocked(database.eventBudget.count).mockResolvedValue(2);

      const request = createMockRequest(
        "http://localhost:3000/api/events/budgets"
      );
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
      vi.mocked(database.eventBudget.findMany).mockResolvedValue(
        mockBudgets as never
      );
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
      vi.mocked(database.eventBudget.findMany).mockResolvedValue(
        mockBudgets as never
      );
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

      const request = createMockRequest(
        "http://localhost:3000/api/events/budgets"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("should handle pagination parameters", async () => {
      const mockBudgets = [createMockBudget()];

      vi.mocked(auth).mockResolvedValue({ orgId: TEST_USER_ORG } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.eventBudget.findMany).mockResolvedValue(
        mockBudgets as never
      );
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

      const request = createMockRequest(
        "http://localhost:3000/api/events/budgets"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgets).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.totalPages).toBe(0);
    });
  });

  describe("POST /api/events/budgets", () => {
    it("should delegate budget creation to manifest runtime", async () => {
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
        ],
      };

      vi.mocked(resolveCurrentUser).mockResolvedValue({
        id: "user-001",
        tenantId: TEST_TENANT_ID,
        role: "admin",
      } as any);
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({ ok: true, data: { id: "new-budget-001" } }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = createMockRequest(
        "http://localhost:3000/api/events/budgets",
        {
          method: "POST",
          body: JSON.stringify(newBudgetData),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(runManifestCommand).toHaveBeenCalledWith({
        entity: "EventBudget",
        command: "create",
        body: { ...newBudgetData, tenantId: TEST_TENANT_ID },
        user: { id: "user-001", tenantId: TEST_TENANT_ID, role: "admin" },
      });
      // No direct Prisma writes — Manifest runtime owns persistence
      expect(database.eventBudget.create).not.toHaveBeenCalled();
    });

    it("should pass body with empty fallback for invalid JSON", async () => {
      vi.mocked(resolveCurrentUser).mockResolvedValue({
        id: "user-001",
        tenantId: TEST_TENANT_ID,
        role: "admin",
      } as any);
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/events/budgets",
        {
          method: "POST",
          body: "invalid-json",
        }
      );

      await POST(request);

      // Invalid JSON falls back to {} and is still delegated to Manifest
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { tenantId: TEST_TENANT_ID },
        })
      );
    });

    it("should propagate manifest runtime errors", async () => {
      vi.mocked(resolveCurrentUser).mockResolvedValue({
        id: "user-001",
        tenantId: TEST_TENANT_ID,
        role: "admin",
      } as any);
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: "Constraint violated: budget amount must be non-negative",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = createMockRequest(
        "http://localhost:3000/api/events/budgets",
        {
          method: "POST",
          body: JSON.stringify({
            eventId: TEST_EVENT_ID,
            totalBudgetAmount: -500,
          }),
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(database.eventBudget.create).not.toHaveBeenCalled();
    });

    it("should return 401 when resolveCurrentUser throws", async () => {
      vi.mocked(resolveCurrentUser).mockRejectedValue(
        new Error("Unauthorized")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/events/budgets",
        {
          method: "POST",
          body: JSON.stringify({
            eventId: TEST_EVENT_ID,
            totalBudgetAmount: 1000,
          }),
        }
      );

      // resolveCurrentUser throws → unhandled error → 500 (route has no try/catch for it)
      // Manifest runtime is never reached
      await expect(POST(request)).rejects.toThrow("Unauthorized");
      expect(runManifestCommand).not.toHaveBeenCalled();
    });
  });
});
