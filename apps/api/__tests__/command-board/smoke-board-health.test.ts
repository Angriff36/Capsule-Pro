/**
 * @vitest-environment node
 *
 * Command Board Health Smoke Test
 *
 * CI smoke test validating the core Command Board paths:
 * 1. Load board state (empty and seeded boards)
 * 2. Run conflict detection
 * 3. Verify typed payloads and no runtime errors
 *
 * This test ensures no runtime errors on test board fixtures and provides
 * CI confidence that the Command Board remains reliable.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database before importing
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
    commandBoard: {
      findFirst: vi.fn(),
    },
    boardProjection: {
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
  },
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join("?"),
      values,
    }),
    join: (items: unknown[]) => items.map((item) => String(item)).join(","),
    empty: { sql: "", values: [] },
  },
}));

// Mock auth
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

// Mock tenant
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { auth } from "@repo/auth/server";
// Import after mocking
import { database } from "@repo/database";
import { POST as conflictDetect } from "@/app/api/conflicts/detect/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const mockAuth = vi.mocked(auth) as any;
const mockGetTenantIdForOrg = vi.mocked(getTenantIdForOrg);
const mockQueryRaw = vi.mocked(database.$queryRaw);
const mockPrepTaskFindMany = vi.mocked(database.prepTask.findMany);

const VALID_TENANT_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_ORG_ID = "org_123456";
const VALID_BOARD_ID = "2957779c-9732-4060-86fd-c5b2be03cbee";
const VALID_USER_ID = "user_123456";

describe("Command Board Health Smoke Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Conflict detection - empty board", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        orgId: VALID_ORG_ID,
        userId: VALID_USER_ID,
      });
      mockGetTenantIdForOrg.mockResolvedValue(VALID_TENANT_ID);
    });

    it("returns valid response for empty board (no conflicts)", async () => {
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: VALID_BOARD_ID }),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body.conflicts).toEqual([]);
      expect(body.summary).toBeDefined();
      expect(body.summary.total).toBe(0);
    });

    it("empty board returns zero counts in summary", async () => {
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      const summary = body.summary as Record<string, any>;
      expect(summary.bySeverity).toEqual({
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      });
    });
  });

  describe("2. Conflict detection - seeded board", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        orgId: VALID_ORG_ID,
        userId: VALID_USER_ID,
      });
      mockGetTenantIdForOrg.mockResolvedValue(VALID_TENANT_ID);
    });

    it("returns valid response for seeded board with conflicts", async () => {
      // Scheduling conflict
      mockQueryRaw.mockResolvedValueOnce([
        {
          employee_id: "emp-1",
          employee_name: "John Doe",
          shift_count: 2,
          shift_date: new Date("2026-02-20"),
        },
      ]);
      // Other queries return empty
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: VALID_BOARD_ID }),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(Array.isArray(body.conflicts)).toBe(true);
      expect(body.conflicts.length).toBeGreaterThan(0);
      expect(body.summary.total).toBeGreaterThan(0);

      const conflict = (body.conflicts as Record<string, any>[])[0];
      expect(conflict.id).toBeDefined();
      expect(conflict.type).toBeDefined();
      expect(conflict.severity).toBeDefined();
      expect(conflict.title).toBeDefined();
      expect(conflict.description).toBeDefined();
      expect(conflict.affectedEntities).toBeDefined();
    });

    it("returns valid response for multiple conflict types", async () => {
      // Scheduling conflict
      mockQueryRaw.mockResolvedValueOnce([
        {
          employee_id: "emp-1",
          employee_name: "John Doe",
          shift_count: 2,
          shift_date: new Date("2026-02-20"),
        },
      ]);
      // Staff conflict (time-off)
      mockQueryRaw.mockResolvedValueOnce([
        {
          employee_id: "emp-2",
          employee_name: "Jane Smith",
          time_off_date: new Date("2026-02-21"),
          shift_count: 1,
        },
      ]);
      // Venue conflict
      mockQueryRaw.mockResolvedValueOnce([
        {
          venue_id: "venue-1",
          venue_name: "Main Hall",
          event_date: new Date("2026-02-20"),
          event_count: 2,
          event_ids: ["event-1", "event-2"],
          event_titles: ["Event A", "Event B"],
        },
      ]);
      // Remaining queries return empty
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      // At least scheduling should be present; inventory may fail due to mock
      expect(body.conflicts.length).toBeGreaterThanOrEqual(1);

      const types = new Set(
        (body.conflicts as Record<string, any>[]).map((c) => c.type)
      );
      expect(types.has("scheduling")).toBe(true);
    });
  });

  describe("3. Partial results resilience", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        orgId: VALID_ORG_ID,
        userId: VALID_USER_ID,
      });
      mockGetTenantIdForOrg.mockResolvedValue(VALID_TENANT_ID);
    });

    it("returns partial results with warnings when some detectors fail", async () => {
      // First detector succeeds
      mockQueryRaw.mockResolvedValueOnce([
        {
          employee_id: "emp-1",
          employee_name: "John Doe",
          shift_count: 2,
          shift_date: new Date("2026-02-20"),
        },
      ]);
      // Second detector fails
      mockQueryRaw.mockRejectedValueOnce(new Error("Timeout"));
      // Remaining return empty
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: VALID_BOARD_ID }),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      // Should return 200 with partial results, not 500
      expect(response.status).toBe(200);
      expect(body.conflicts.length).toBeGreaterThan(0);
      expect(body.warnings).toBeDefined();
      expect((body.warnings as unknown[]).length).toBeGreaterThan(0);
    });

    it("returns empty conflicts with warnings when all detectors fail", async () => {
      mockQueryRaw.mockRejectedValue(new Error("Database error"));
      mockPrepTaskFindMany.mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body.conflicts).toEqual([]);
      expect(body.warnings).toBeDefined();
      expect((body.warnings as unknown[]).length).toBe(7); // 7 detectors
    });
  });

  describe("4. Correlation ID propagation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        orgId: VALID_ORG_ID,
        userId: VALID_USER_ID,
      });
      mockGetTenantIdForOrg.mockResolvedValue(VALID_TENANT_ID);
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);
    });

    it("includes correlation ID in response headers", async () => {
      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": "smoke-test-correlation-123",
        },
        body: JSON.stringify({ boardId: VALID_BOARD_ID }),
      });

      const response = await conflictDetect(request);

      expect(response.headers.get("x-correlation-id")).toBe(
        "smoke-test-correlation-123"
      );
    });

    it("generates correlation ID if not provided", async () => {
      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await conflictDetect(request);

      const correlationId = response.headers.get("x-correlation-id");
      expect(correlationId).toBeDefined();
      expect(correlationId?.length).toBeGreaterThan(0);
    });
  });

  describe("5. Error handling safety", () => {
    it("returns safe error for unauthenticated requests", async () => {
      mockAuth.mockResolvedValue({ orgId: null, userId: null });

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId: VALID_BOARD_ID }),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(401);
      expect(body.code).toBe("AUTH_REQUIRED");
      expect(body.message).toBeDefined();
      expect(body.guidance).toBeDefined();
      // Should not expose internal details
      expect(body.message).not.toContain("SELECT");
      expect(body.message).not.toContain("database");
    });

    it("returns safe error for tenant not found", async () => {
      mockAuth.mockResolvedValue({
        orgId: VALID_ORG_ID,
        userId: VALID_USER_ID,
      });
      mockGetTenantIdForOrg.mockResolvedValue(null as never);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(404);
      expect(body.code).toBe("TENANT_NOT_FOUND");
      expect(body.guidance).toBeDefined();
    });

    it("returns safe error for malformed JSON body", async () => {
      mockAuth.mockResolvedValue({
        orgId: VALID_ORG_ID,
        userId: VALID_USER_ID,
      });
      mockGetTenantIdForOrg.mockResolvedValue(VALID_TENANT_ID);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json",
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(400);
      expect(body.code).toBe("INVALID_REQUEST");
      expect(body.guidance).toBeDefined();
    });
  });

  describe("6. Response shape validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        orgId: VALID_ORG_ID,
        userId: VALID_USER_ID,
      });
      mockGetTenantIdForOrg.mockResolvedValue(VALID_TENANT_ID);
    });

    it("conflict object has all required fields", async () => {
      mockQueryRaw.mockResolvedValueOnce([
        {
          employee_id: "emp-1",
          employee_name: "John Doe",
          shift_count: 2,
          shift_date: new Date("2026-02-20"),
        },
      ]);
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      const conflict = (body.conflicts as Record<string, any>[])[0];

      // Required fields
      expect(typeof conflict.id).toBe("string");
      expect(typeof conflict.type).toBe("string");
      expect(["low", "medium", "high", "critical"]).toContain(
        conflict.severity
      );
      expect(typeof conflict.title).toBe("string");
      expect(typeof conflict.description).toBe("string");
      expect(Array.isArray(conflict.affectedEntities)).toBe(true);
      expect(conflict.createdAt).toBeDefined();
      expect(typeof conflict.suggestedAction).toBe("string");

      // affectedEntities shape
      const entity = (conflict.affectedEntities as Record<string, any>[])[0];
      expect(entity).toHaveProperty("type");
      expect(entity).toHaveProperty("id");
      expect(entity).toHaveProperty("name");
    });

    it("summary object has all required fields", async () => {
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      const summary = body.summary as Record<string, any>;
      expect(typeof summary.total).toBe("number");
      expect(summary.bySeverity).toBeDefined();
      expect(summary.byType).toBeDefined();
      expect(body.analyzedAt).toBeDefined();
    });
  });

  describe("7. Time range filtering", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        orgId: VALID_ORG_ID,
        userId: VALID_USER_ID,
      });
      mockGetTenantIdForOrg.mockResolvedValue(VALID_TENANT_ID);
    });

    it("accepts valid timeRange parameter", async () => {
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeRange: {
            start: "2026-02-01T00:00:00Z",
            end: "2026-02-28T23:59:59Z",
          },
        }),
      });

      const response = await conflictDetect(request);
      expect(response.status).toBe(200);
    });

    it("rejects invalid timeRange (start after end)", async () => {
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeRange: {
            start: "2026-02-28T00:00:00Z",
            end: "2026-02-01T00:00:00Z",
          },
        }),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("8. Entity type filtering", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        orgId: VALID_ORG_ID,
        userId: VALID_USER_ID,
      });
      mockGetTenantIdForOrg.mockResolvedValue(VALID_TENANT_ID);
    });

    it("accepts valid entityTypes filter", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityTypes: ["scheduling", "timeline"],
        }),
      });

      const response = await conflictDetect(request);
      expect(response.status).toBe(200);
    });

    it("rejects invalid entityTypes", async () => {
      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityTypes: ["invalid_type"],
        }),
      });

      const response = await conflictDetect(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });
});
