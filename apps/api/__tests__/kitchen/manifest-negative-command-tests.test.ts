/**
 * Negative Command Tests
 *
 * Tests that negative scenarios return proper 4xx responses with structured error:
 * - Missing required fields → 400
 * - Invalid status transitions → guard failure → 422
 * - Policy/guard failures → 403/422 with structured message
 * - No console noise on expected 4xx errors
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    },
    recipe: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    dish: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    menu: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    prepList: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    prepListItem: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    outboxEvent: {
      create: vi.fn(),
    },
    manifestState: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    idempotencyKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(mockDb)),
  };
  return {
    database: mockDb,
  };
});

// Mock manifest runtime
const mockRunCommand = vi.fn();
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(() =>
    Promise.resolve({
      runCommand: mockRunCommand,
    })
  ),
}));

// Mock getTenantIdForOrg
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn().mockResolvedValue({
    id: "test-user-id",
    tenantId: "test-tenant",
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  }),

  getTenantIdForOrg: vi.fn(() => Promise.resolve("test-tenant")),
}));

describe("Negative Command Tests - PrepTask Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Missing required field tests", () => {
    it("should return 400 when id field is missing", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Missing required field: id",
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "test-user-id",
            stationId: "station-a",
            // missing id
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ entity: "PrepTask", command: "claim" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe("string");
      expect(data.message.length).toBeGreaterThan(0);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should return 400 when body is empty", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Missing required field: id",
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ entity: "PrepTask", command: "claim" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe("string");
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("Guard failure tests", () => {
    it("should return 422 when guard fails (invalid status transition)", async () => {
      const { database } = await import("@repo/database");

      // Mock task exists so route doesn't short-circuit
      vi.mocked(database.prepTask.findFirst).mockResolvedValueOnce({
        id: "task-done-001",
        status: "done",
        tenantId: "test-tenant",
        eventId: "event-001",
        name: "Done Task",
        dueByDate: Date.now() + 86_400_000,
        priority: 3,
        quantityTotal: 10,
        quantityCompleted: 10,
        claimedBy: "test-user-id",
        claimedAt: Date.now() - 3_600_000,
        stationId: "station-a",
        taskType: "prep",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      mockRunCommand.mockResolvedValueOnce({
        success: false,
        guardFailure: {
          index: 1,
          formatted: "status must be 'open' to claim, got 'done'",
        },
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-done-001",
            userId: "test-user-id",
            stationId: "station-a",
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ entity: "PrepTask", command: "claim" }),
      });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Guard 1 failed");
      expect(data.message).toContain(
        "status must be 'open' to claim, got 'done'"
      );
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("Policy denial tests", () => {
    it("should return 403 when policy denies access", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        policyDenial: {
          policyName: "adminOnly",
          formatted: "User does not have admin role",
        },
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            id: "task-001",
            userId: "test-user-id",
            stationId: "station-a",
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ entity: "PrepTask", command: "claim" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Access denied");
      expect(data.message).toContain("adminOnly");
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("Response shape validation", () => {
    it("error responses should only have success and message fields", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Validation failed",
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ entity: "PrepTask", command: "claim" }),
      });
      const data = await response.json();

      // Should only have success and message, no extra fields
      const keys = Object.keys(data);
      expect(keys).toContain("success");
      expect(keys).toContain("message");
      expect(keys.length).toBe(2);
    });
  });

  describe("Console noise check", () => {
    it("should not log console.error for 400 responses", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Bad request",
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      await POST(request, {
        params: Promise.resolve({ entity: "PrepTask", command: "claim" }),
      });
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should not log console.error for 403 responses", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        policyDenial: {
          policyName: "adminOnly",
          formatted: "Denied",
        },
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "t" }),
        }
      );

      await POST(request, {
        params: Promise.resolve({ entity: "PrepTask", command: "claim" }),
      });
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should not log console.error for 422 responses", async () => {
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        guardFailure: { index: 0, formatted: "Guard failed" },
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "t" }),
        }
      );

      await POST(request, {
        params: Promise.resolve({ entity: "PrepTask", command: "claim" }),
      });
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
