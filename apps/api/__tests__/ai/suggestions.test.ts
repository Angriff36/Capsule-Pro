/**
 * Tests for AI Suggestions API
 * Covers ai-natural-language-commands and ai-context-aware-suggestions features
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    event: {
      findMany: vi.fn(),
    },
    dish: {
      findMany: vi.fn(),
    },
    prepTask: {
      findMany: vi.fn(),
    },
    inventoryAlert: {
      findMany: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
    },
    eventStaffAssignment: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

// Mock AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mocked-model"),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { generateText } from "ai";

// Import after mocks
import { GET } from "../../app/api/ai/suggestions/route";

// Use vi.mocked to get proper mock types
const mockAuth = vi.mocked(auth);
const mockGetTenantId = vi.mocked(getTenantIdForOrg);
const mockGenerateText = vi.mocked(generateText);

// Extract mocked functions from database
const mockEventFindMany = vi.mocked(database.event.findMany);
const mockDishFindMany = vi.mocked(database.dish.findMany);
const mockPrepTaskFindMany = vi.mocked(database.prepTask.findMany);
const mockInventoryAlertFindMany = vi.mocked(database.inventoryAlert.findMany);
const mockInventoryItemFindMany = vi.mocked(database.inventoryItem.findMany);
const mockEventStaffAssignmentFindMany = vi.mocked(database.eventStaffAssignment.findMany);
const mockQueryRaw = vi.mocked(database.$queryRaw);

describe("AI Suggestions API", () => {
  const mockTenantId = "test-tenant-id";
  const mockOrgId = "test-org-id";

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks - auth returns partial object for testing
    mockAuth.mockResolvedValue({ orgId: mockOrgId, userId: "test-user" } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetTenantId.mockResolvedValue(mockTenantId);

    // Mock database queries
    mockEventFindMany.mockResolvedValue([]);
    mockDishFindMany.mockResolvedValue([]);
    mockPrepTaskFindMany.mockResolvedValue([]);
    mockInventoryAlertFindMany.mockResolvedValue([]);
    mockInventoryItemFindMany.mockResolvedValue([]);
    mockEventStaffAssignmentFindMany.mockResolvedValue([]);
    mockQueryRaw.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue({ orgId: null, userId: null } as unknown as Awaited<ReturnType<typeof auth>>);

      const response = await GET(new Request("http://localhost/api/ai/suggestions"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("should return 401 when tenant not found", async () => {
      mockGetTenantId.mockResolvedValue(null as unknown as string);

      const response = await GET(new Request("http://localhost/api/ai/suggestions"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("No tenant found");
    });
  });

  describe("Parameter Validation", () => {
    it("should reject maxSuggestions < 1", async () => {
      const response = await GET(
        new Request("http://localhost/api/ai/suggestions?maxSuggestions=0")
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("maxSuggestions must be between 1 and 20");
    });

    it("should reject maxSuggestions > 20", async () => {
      const response = await GET(
        new Request("http://localhost/api/ai/suggestions?maxSuggestions=25")
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("maxSuggestions must be between 1 and 20");
    });

    it("should accept valid maxSuggestions", async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({ suggestions: [] }),
      } as Awaited<ReturnType<typeof generateText>>);

      const response = await GET(
        new Request("http://localhost/api/ai/suggestions?maxSuggestions=10")
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Context Data Gathering", () => {
    it("should fetch upcoming events", async () => {
      const mockEvents = [
        {
          id: "event-1",
          title: "Test Event",
          eventDate: new Date(Date.now() + 86400000), // Tomorrow
          guestCount: 100,
          venueName: "Test Venue",
          status: "confirmed",
          tenantId: mockTenantId,
          deletedAt: null,
        },
      ];

      mockEventFindMany.mockResolvedValue(mockEvents as unknown as Awaited<ReturnType<typeof database.event.findMany>>);
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({ suggestions: [] }),
      } as Awaited<ReturnType<typeof generateText>>);

      await GET(new Request("http://localhost/api/ai/suggestions"));

      expect(mockEventFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            deletedAt: null,
          }),
        })
      );
    });

    it("should fetch incomplete prep tasks", async () => {
      const mockTasks = [
        {
          id: "task-1",
          name: "Prep vegetables",
          status: "pending",
          dueByDate: new Date(),
          priority: "high",
          estimatedMinutes: 60,
          taskType: "prep",
          tenantId: mockTenantId,
          deletedAt: null,
        },
      ];

      mockPrepTaskFindMany.mockResolvedValue(mockTasks as unknown as Awaited<ReturnType<typeof database.prepTask.findMany>>);
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({ suggestions: [] }),
      } as Awaited<ReturnType<typeof generateText>>);

      await GET(new Request("http://localhost/api/ai/suggestions"));

      expect(mockPrepTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            status: { not: "completed" },
          }),
        })
      );
    });

    it("should fetch unresolved inventory alerts", async () => {
      mockInventoryAlertFindMany.mockResolvedValue([
        {
          id: "alert-1",
          alertType: "low_stock",
          itemId: "item-1",
          threshold_value: BigInt(10),
          triggered_at: new Date(),
          notes: "Low stock alert",
          tenantId: mockTenantId,
          resolved_at: null,
          deleted_at: null,
        },
      ] as unknown as Awaited<ReturnType<typeof database.inventoryAlert.findMany>>);

      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({ suggestions: [] }),
      } as Awaited<ReturnType<typeof generateText>>);

      await GET(new Request("http://localhost/api/ai/suggestions"));

      expect(mockInventoryAlertFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            resolved_at: null,
          }),
        })
      );
    });
  });

  describe("AI Suggestion Generation", () => {
    it("should generate AI suggestions with correct structure", async () => {
      const aiResponse = {
        suggestions: [
          {
            suggestionType: "task_assignment",
            category: "kitchen",
            priority: "high",
            title: "Assign prep task to available chef",
            description: "Prep vegetables task is pending and needs assignment",
            reasoning: "Task is due soon and no one is assigned",
            actionType: "navigate",
            actionPath: "/kitchen",
            estimatedImpact: "Ensure timely preparation",
          },
        ],
      };

      mockGenerateText.mockResolvedValue({
        text: JSON.stringify(aiResponse),
      } as Awaited<ReturnType<typeof generateText>>);

      const response = await GET(new Request("http://localhost/api/ai/suggestions"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toHaveLength(1);
      expect(data.suggestions[0]).toMatchObject({
        type: "deadline_alert",
        category: "kitchen",
        priority: "high",
        title: "Assign prep task to available chef",
        dismissed: false,
      });
    });

    it("should fallback to rule-based suggestions on AI failure", async () => {
      mockGenerateText.mockRejectedValue(new Error("AI service unavailable"));

      // Setup data for fallback suggestions
      mockPrepTaskFindMany.mockResolvedValue([
        {
          id: "task-1",
          name: "Urgent Task",
          status: "pending",
          dueByDate: new Date(Date.now() + 3600000), // 1 hour from now
          priority: "high",
          estimatedMinutes: 30,
          taskType: "prep",
          tenantId: mockTenantId,
          deletedAt: null,
        },
      ] as unknown as Awaited<ReturnType<typeof database.prepTask.findMany>>);

      const response = await GET(new Request("http://localhost/api/ai/suggestions"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions.length).toBeGreaterThan(0);
      expect(data.suggestions[0].category).toBeDefined();
      expect(data.suggestions[0].priority).toBeDefined();
    });
  });

  describe("Fallback Suggestions", () => {
    it("should generate urgent task suggestions for tasks due within 24 hours", async () => {
      mockGenerateText.mockRejectedValue(new Error("AI failed"));

      mockPrepTaskFindMany.mockResolvedValue([
        {
          id: "task-1",
          name: "Urgent Prep",
          status: "pending",
          dueByDate: new Date(Date.now() + 3600000), // 1 hour
          priority: "high",
          estimatedMinutes: 30,
          taskType: "prep",
          tenantId: mockTenantId,
          deletedAt: null,
        },
      ] as unknown as Awaited<ReturnType<typeof database.prepTask.findMany>>);

      const response = await GET(new Request("http://localhost/api/ai/suggestions"));
      const data = await response.json();

      const urgentSuggestion = data.suggestions.find(
        (s: { title: string }) => s.title.includes("urgent")
      );

      expect(urgentSuggestion).toBeDefined();
      expect(urgentSuggestion.priority).toBe("high");
    });

    it("should generate critical inventory alert suggestions", async () => {
      mockGenerateText.mockRejectedValue(new Error("AI failed"));

      mockInventoryAlertFindMany.mockResolvedValue([
        {
          id: "alert-1",
          alertType: "critical",
          itemId: "item-1",
          threshold_value: BigInt(5),
          triggered_at: new Date(),
          notes: "Critical shortage",
          tenantId: mockTenantId,
          resolved_at: null,
          deleted_at: null,
        },
      ] as unknown as Awaited<ReturnType<typeof database.inventoryAlert.findMany>>);

      mockInventoryItemFindMany.mockResolvedValue([
        { id: "item-1", name: "Olive Oil" },
      ] as unknown as Awaited<ReturnType<typeof database.inventoryItem.findMany>>);

      const response = await GET(new Request("http://localhost/api/ai/suggestions"));
      const data = await response.json();

      const inventorySuggestion = data.suggestions.find(
        (s: { category: string }) => s.category === "inventory"
      );

      expect(inventorySuggestion).toBeDefined();
      expect(inventorySuggestion.priority).toBe("high");
    });

    it("should generate capacity warning for high task volume", async () => {
      mockGenerateText.mockRejectedValue(new Error("AI failed"));

      // Create 15 incomplete tasks
      const tasks = Array.from({ length: 15 }, (_, i) => ({
        id: `task-${i}`,
        name: `Task ${i}`,
        status: "pending",
        dueByDate: new Date(Date.now() + 86400000),
        priority: "medium",
        estimatedMinutes: 30,
        taskType: "prep",
        tenantId: mockTenantId,
        deletedAt: null,
      }));

      mockPrepTaskFindMany.mockResolvedValue(tasks as unknown as Awaited<ReturnType<typeof database.prepTask.findMany>>);

      const response = await GET(new Request("http://localhost/api/ai/suggestions"));
      const data = await response.json();

      const capacitySuggestion = data.suggestions.find(
        (s: { title: string }) => s.title.includes("volume") || s.title.includes("capacity")
      );

      expect(capacitySuggestion).toBeDefined();
    });
  });

  describe("Response Structure", () => {
    it("should return correct response structure", async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({ suggestions: [] }),
      } as Awaited<ReturnType<typeof generateText>>);

      const response = await GET(new Request("http://localhost/api/ai/suggestions"));
      const data = await response.json();

      expect(data).toHaveProperty("suggestions");
      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("generatedAt");
      expect(data).toHaveProperty("context");
      expect(data.context).toHaveProperty("timeframe");
      expect(data.context).toHaveProperty("totalEvents");
      expect(data.context).toHaveProperty("incompleteTasks");
      expect(data.context).toHaveProperty("inventoryAlerts");
    });

    it("should respect timeframe parameter", async () => {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({ suggestions: [] }),
      } as Awaited<ReturnType<typeof generateText>>);

      await GET(
        new Request("http://localhost/api/ai/suggestions?timeframe=today")
      );

      // Verify the query was called (timeframe affects date range)
      expect(mockEventFindMany).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mockEventFindMany.mockRejectedValue(new Error("Database error"));

      const response = await GET(new Request("http://localhost/api/ai/suggestions"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe("Failed to generate suggestions");
    });

    it("should handle malformed AI response", async () => {
      mockGenerateText.mockResolvedValue({
        text: "invalid json",
      } as Awaited<ReturnType<typeof generateText>>);

      // Should fallback to rule-based suggestions
      const response = await GET(new Request("http://localhost/api/ai/suggestions"));

      expect(response.status).toBe(200);
    });
  });
});

describe("AI Suggestion Types", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ orgId: "org-1", userId: "user-1" } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetTenantId.mockResolvedValue("tenant-1");
    mockEventFindMany.mockResolvedValue([]);
    mockDishFindMany.mockResolvedValue([]);
    mockPrepTaskFindMany.mockResolvedValue([]);
    mockInventoryAlertFindMany.mockResolvedValue([]);
    mockInventoryItemFindMany.mockResolvedValue([]);
    mockEventStaffAssignmentFindMany.mockResolvedValue([]);
    mockQueryRaw.mockResolvedValue([]);
  });

  it("should map suggestion types correctly", async () => {
    const suggestionTypes = [
      "task_assignment",
      "task_creation",
      "deadline_adjustment",
      "resource_allocation",
      "capacity_alert",
      "inventory_alert",
      "optimization",
    ];

    for (const type of suggestionTypes) {
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify({
          suggestions: [
            {
              suggestionType: type,
              category: "kitchen",
              priority: "medium",
              title: `Test ${type}`,
              description: "Test description",
              reasoning: "Test reasoning",
              actionType: "navigate",
              actionPath: "/test",
            },
          ],
        }),
      } as Awaited<ReturnType<typeof generateText>>);

      const response = await GET(new Request("http://localhost/api/ai/suggestions"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions[0].type).toBeDefined();
    }
  });
});
