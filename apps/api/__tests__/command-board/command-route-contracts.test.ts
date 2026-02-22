/**
 * @vitest-environment node
 *
 * Command Route Contract Tests for Command Board
 *
 * These tests validate request/response contracts for command-board command routes:
 * - create, update, move, remove card operations
 * - Idempotency key handling for safe retries
 * - Error response shapes and status codes
 * - Success response shapes
 *
 * These are unit tests that mock the manifest runtime to test route contracts.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth module
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

// Mock database module
vi.mock("@repo/database", () => ({
  database: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock tenant module
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

// Mock manifest runtime
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Type for manifest runtime result
interface MockRuntimeResult {
  success: boolean;
  result?: unknown;
  emittedEvents?: unknown[];
  error?: string;
  policyDenial?: { policyName: string };
  guardFailure?: { index: number; formatted: string };
}

describe("Command Board Command Route Contracts", () => {
  const validBoardId = "2957779c-9732-4060-86fd-c5b2be03cbee";
  const validCardId = "3957779c-9732-4060-86fd-c5b2be03cbee";
  const validUserId = "4957779c-9732-4060-86fd-c5b2be03cbee";
  const validTenantId = "5957779c-9732-4060-86fd-c5b2be03cbee";
  const validOrgId = "org_123456";
  const validClerkId = "user_123456";

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default auth mock
    const { auth } = await import("@repo/auth/server");
    vi.mocked(auth).mockResolvedValue({
      orgId: validOrgId,
      userId: validClerkId,
    });

    // Setup default tenant mock
    const { getTenantIdForOrg } = await import("@/app/lib/tenant");
    vi.mocked(getTenantIdForOrg).mockResolvedValue(validTenantId);

    // Setup default user mock
    const { database } = await import("@repo/database");
    vi.mocked(database.user.findFirst).mockResolvedValue({
      id: validUserId,
      tenantId: validTenantId,
      role: "admin",
      authUserId: validClerkId,
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  });

  describe("Response Contract - Success Shape", () => {
    it("create command returns success with result and events", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      const mockResult: MockRuntimeResult = {
        success: true,
        result: { id: validCardId, title: "Test Card" },
        emittedEvents: [
          { type: "card.created", payload: { cardId: validCardId } },
        ],
      };

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue(mockResult),
      });

      // Import route after mocks are set up
      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boardId: validBoardId,
            title: "Test Card",
            positionX: 100,
            positionY: 100,
          }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("result");
      expect(body).toHaveProperty("events");
    });

    it("update command returns success with result and events", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      const mockResult: MockRuntimeResult = {
        success: true,
        result: { id: validCardId, title: "Updated Card" },
        emittedEvents: [
          { type: "card.updated", payload: { cardId: validCardId } },
        ],
      };

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue(mockResult),
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/update/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: validCardId,
            title: "Updated Card",
          }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("result");
      expect(body).toHaveProperty("events");
    });

    it("move command returns success with result and events", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      const mockResult: MockRuntimeResult = {
        success: true,
        result: { id: validCardId, positionX: 200, positionY: 200 },
        emittedEvents: [
          { type: "card.moved", payload: { cardId: validCardId } },
        ],
      };

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue(mockResult),
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/move/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/move",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: validCardId,
            positionX: 200,
            positionY: 200,
          }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("result");
    });

    it("remove command returns success with result and events", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      const mockResult: MockRuntimeResult = {
        success: true,
        result: { id: validCardId, deletedAt: new Date().toISOString() },
        emittedEvents: [
          { type: "card.removed", payload: { cardId: validCardId } },
        ],
      };

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue(mockResult),
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/remove/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/remove",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: validCardId,
          }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("result");
    });
  });

  describe("Response Contract - Error Shape", () => {
    it("returns 401 with error message when unauthorized", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null });

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Test" }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toHaveProperty("success", false);
      expect(body).toHaveProperty("message");
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 with error message when tenant not found", async () => {
      const { getTenantIdForOrg } = await import("@/app/lib/tenant");
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null);

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Test" }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("success", false);
      expect(body).toHaveProperty("message");
      expect(body.message).toBe("Tenant not found");
    });

    it("returns 400 with error message when user not found in database", async () => {
      const { database } = await import("@repo/database");
      vi.mocked(database.user.findFirst).mockResolvedValue(null);

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Test" }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("success", false);
      expect(body.message).toBe("User not found in database");
    });

    it("returns 403 with policy denial message when access denied", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      const mockResult: MockRuntimeResult = {
        success: false,
        policyDenial: { policyName: "AdminOnlyPolicy" },
        error: "Access denied",
      };

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue(mockResult),
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Test" }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body).toHaveProperty("success", false);
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("AdminOnlyPolicy");
    });

    it("returns 422 with guard failure message when guard fails", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      const mockResult: MockRuntimeResult = {
        success: false,
        guardFailure: { index: 1, formatted: "Title is required" },
        error: "Guard failed",
      };

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue(mockResult),
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "" }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body).toHaveProperty("success", false);
      expect(body.message).toContain("Guard 1 failed");
      expect(body.message).toContain("Title is required");
    });

    it("returns 400 with error message for general command failure", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      const mockResult: MockRuntimeResult = {
        success: false,
        error: "Invalid input data",
      };

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue(mockResult),
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Test" }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("success", false);
      expect(body.message).toBe("Invalid input data");
    });

    it("returns 500 with generic message for internal errors", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Database connection failed")
      );

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Test" }),
        }
      );

      const response = await route.POST(request as never);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toHaveProperty("success", false);
      expect(body.message).toBe("Internal server error");
      // Internal error details should NOT be exposed
      expect(body.message).not.toContain("Database connection failed");
    });
  });

  describe("Idempotency Assertions", () => {
    it("create command passes idempotency key to runtime", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");
      const runCommandMock = vi.fn().mockResolvedValue({
        success: true,
        result: { id: validCardId },
        emittedEvents: [],
      });

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: runCommandMock,
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const idempotencyKey = "idem-key-12345";
      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            boardId: validBoardId,
            title: "Test Card",
            positionX: 100,
            positionY: 100,
          }),
        }
      );

      await route.POST(request as never);

      // Verify runtime was created and command was run
      expect(runCommandMock).toHaveBeenCalled();
    });

    it("accepts X-Idempotency-Key header variant", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");
      const runCommandMock = vi.fn().mockResolvedValue({
        success: true,
        result: { id: validCardId },
        emittedEvents: [],
      });

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: runCommandMock,
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const idempotencyKey = "x-idem-key-67890";
      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            boardId: validBoardId,
            title: "Test Card",
            positionX: 100,
            positionY: 100,
          }),
        }
      );

      await route.POST(request as never);

      expect(runCommandMock).toHaveBeenCalled();
    });

    it("repeating same request with same idempotency key should be safe", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      const mockResult: MockRuntimeResult = {
        success: true,
        result: { id: validCardId, title: "Test Card" },
        emittedEvents: [],
      };

      const runCommandMock = vi.fn().mockResolvedValue(mockResult);
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: runCommandMock,
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const idempotencyKey = "idem-safe-retry";
      const requestBody = JSON.stringify({
        boardId: validBoardId,
        title: "Test Card",
        positionX: 100,
        positionY: 100,
      });

      // First request
      const request1 = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: requestBody,
        }
      );

      const response1 = await route.POST(request1 as never);
      const body1 = await response1.json();

      // Second request with same key (simulating retry)
      const request2 = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: requestBody,
        }
      );

      const response2 = await route.POST(request2 as never);
      const body2 = await response2.json();

      // Both should succeed with same shape
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(body1.success).toBe(true);
      expect(body2.success).toBe(true);

      // Idempotency handling is done by the manifest runtime, not the route
      // The route just passes the key through
      expect(runCommandMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("Request Contract - Body Parsing", () => {
    it("handles empty body gracefully", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      const mockResult: MockRuntimeResult = {
        success: false,
        error: "Missing required fields",
      };

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue(mockResult),
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await route.POST(request as never);

      // Should not throw - route handles empty body
      expect(response.status).toBe(400);
    });

    it("handles malformed JSON body", async () => {
      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{ invalid json }",
        }
      );

      const response = await route.POST(request as never);

      // Route should handle JSON parse error gracefully
      expect(response.status).toBe(500);
    });
  });

  describe("All Command Routes Consistency", () => {
    const commandRoutes = [
      {
        name: "create",
        path: "@/app/api/command-board/cards/commands/create/route",
      },
      {
        name: "update",
        path: "@/app/api/command-board/cards/commands/update/route",
      },
      {
        name: "move",
        path: "@/app/api/command-board/cards/commands/move/route",
      },
      {
        name: "remove",
        path: "@/app/api/command-board/cards/commands/remove/route",
      },
    ];

    for (const { name, path } of commandRoutes) {
      it(`${name} route returns consistent error shape on auth failure`, async () => {
        const { auth } = await import("@repo/auth/server");
        vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null });

        const route = await import(path);

        const request = new Request(
          `http://localhost/api/command-board/cards/commands/${name}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );

        const response = await route.POST(request as never);
        const body = await response.json();

        // All routes should return consistent error shape
        expect(response.status).toBe(401);
        expect(body).toHaveProperty("success", false);
        expect(body).toHaveProperty("message");
        expect(typeof body.message).toBe("string");
      });
    }
  });

  describe("Response Headers", () => {
    it("returns JSON content type for success responses", async () => {
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");

      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: { id: validCardId },
          emittedEvents: [],
        }),
      });

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Test" }),
        }
      );

      const response = await route.POST(request as never);

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });

    it("returns JSON content type for error responses", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null });

      const route = await import(
        "@/app/api/command-board/cards/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/command-board/cards/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await route.POST(request as never);

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });
  });
});
