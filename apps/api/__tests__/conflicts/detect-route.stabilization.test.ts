/**
 * @vitest-environment node
 *
 * Conflict Detection API Route Stabilization Tests
 *
 * Tests cover:
 * - Empty/new boards returning valid empty responses
 * - Invalid UUID handling with safe typed error payloads
 * - Tenant mismatch paths returning safe typed error payloads
 * - All conflict types returning HTTP 200 with typed payload shape
 * - No raw SQL runtime errors for edge cases
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database before importing the route
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
    // Prisma ORM models used by conflict detectors
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
  // Mock Prisma namespace with sql, join, and empty helpers
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
      // Simple mock that returns an object recognizable as a Prisma.sql result
      return { sql: strings.join("?"), values };
    },
    join: (items: unknown[]) => {
      // Simple mock that returns items joined by comma
      return items.map((item) => String(item)).join(",");
    },
    empty: {
      // Prisma.empty is used for optional clauses in queries
      sql: "",
      values: [],
    },
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

import { auth } from "@repo/auth/server";
// Import after mocking
import { database } from "@repo/database";
import { POST } from "@/app/api/conflicts/detect/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const mockAuth = vi.mocked(auth) as any;
const mockGetTenantIdForOrg = vi.mocked(getTenantIdForOrg);
const mockQueryRaw = vi.mocked(database.$queryRaw);
const mockPrepTaskFindMany = vi.mocked(database.prepTask.findMany) as any;
const mockInventoryAlertFindMany = vi.mocked(
  database.inventoryAlert.findMany
) as any;
const mockInventoryItemFindMany = vi.mocked(
  database.inventoryItem.findMany
) as any;

describe("Conflict Detection API Route Stabilization", () => {
  const validTenantId = "550e8400-e29b-41d4-a716-446655440000";
  const validOrgId = "org_123456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication and tenant validation", () => {
    it("returns 401 with typed message when unauthenticated", async () => {
      mockAuth.mockResolvedValue({ orgId: null, userId: null } as never);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(401);
      expect(body).toHaveProperty("message");
      expect(body.message).toBe("Authentication required");
      expect(body).toHaveProperty("code", "AUTH_REQUIRED");
      expect(body).toHaveProperty("guidance");
      expect(body).not.toHaveProperty("error");
      expect(body).not.toHaveProperty("stack");
    });

    it("returns 404 with typed message when tenant not found", async () => {
      mockAuth.mockResolvedValue({
        orgId: validOrgId,
        userId: "user_123",
      } as never);
      mockGetTenantIdForOrg.mockResolvedValue(null as unknown as string);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(404);
      expect(body).toHaveProperty("message");
      expect(body.message).toBe("Tenant not found");
      expect(body).toHaveProperty("code", "TENANT_NOT_FOUND");
      expect(body).toHaveProperty("guidance");
      expect(body).not.toHaveProperty("error");
      expect(body).not.toHaveProperty("stack");
    });
  });

  describe("Empty/new board handling", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        orgId: validOrgId,
        userId: "user_123",
      } as never);
      mockGetTenantIdForOrg.mockResolvedValue(validTenantId);
    });

    it("returns 200 with empty conflicts array when no data exists", async () => {
      // All queries return empty arrays
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("conflicts");
      expect(body).toHaveProperty("summary");
      expect(body).toHaveProperty("analyzedAt");
      expect(Array.isArray(body.conflicts)).toBe(true);
      expect(body.conflicts).toHaveLength(0);
    });

    it("returns valid summary with zero counts for empty board", async () => {
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);

      const summary = body.summary as Record<string, any>;
      expect(summary.total).toBe(0);
      expect(summary.bySeverity).toEqual({
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      });
    });
  });

  describe("Request validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ orgId: validOrgId, userId: "user_123" });
      mockGetTenantIdForOrg.mockResolvedValue(validTenantId);
    });

    it("accepts empty request body and returns valid response", async () => {
      mockQueryRaw.mockResolvedValue([]);
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("accepts request with only timeRange", async () => {
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

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("accepts request with only entityTypes filter", async () => {
      mockQueryRaw.mockResolvedValue([]);
      // Note: entityTypes filter excludes timeline, so prepTask won't be called

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityTypes: ["scheduling", "staff"],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("handles malformed JSON body gracefully", async () => {
      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json",
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      // Should return typed 400 error, not 500
      expect(response.status).toBe(400);
      expect(body).toHaveProperty("message");
      expect(body).toHaveProperty("code", "INVALID_REQUEST");
      expect(body).toHaveProperty("guidance");
      // Should not leak raw error details
      expect(body).not.toHaveProperty("stack");
    });
  });

  describe("Conflict type responses", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ orgId: validOrgId, userId: "user_123" });
      mockGetTenantIdForOrg.mockResolvedValue(validTenantId);
    });

    it("returns valid typed payload for scheduling conflicts", async () => {
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

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityTypes: ["scheduling"] }),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(Array.isArray(body.conflicts)).toBe(true);
      expect(body.conflicts).toHaveLength(1);

      const conflict = (body.conflicts as Record<string, any>[])[0];
      expect(conflict).toHaveProperty("id");
      expect(conflict).toHaveProperty("type", "scheduling");
      expect(conflict).toHaveProperty("severity");
      expect(conflict).toHaveProperty("title");
      expect(conflict).toHaveProperty("description");
      expect(conflict).toHaveProperty("affectedEntities");
      expect(conflict).toHaveProperty("createdAt");
    });

    it("returns valid typed payload for inventory conflicts", async () => {
      // Inventory detector uses Prisma ORM (inventoryAlert + inventoryItem), not $queryRaw
      mockInventoryAlertFindMany.mockResolvedValueOnce([
        {
          id: "alert-1",
          itemId: "item-1",
          alertType: "critical",
          threshold_value: BigInt(10),
          triggered_at: new Date("2026-02-20"),
        },
      ]);
      mockInventoryItemFindMany.mockResolvedValueOnce([
        {
          id: "item-1",
          name: "Flour",
        },
      ]);
      mockQueryRaw.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityTypes: ["inventory"] }),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(Array.isArray(body.conflicts)).toBe(true);

      const conflict = (body.conflicts as Record<string, any>[])[0];
      expect(conflict.type).toBe("inventory");
    });

    it("returns valid typed payload for venue conflicts", async () => {
      // When entityTypes: ["venue"], only the venue detector runs
      // Set up mock to return venue data for the first (and only) query
      mockQueryRaw
        .mockResolvedValueOnce([
          {
            venue_id: "venue-1",
            venue_name: "Main Hall",
            event_date: new Date("2026-02-20"),
            event_count: 2,
            event_ids: ["event-1", "event-2"],
            event_titles: ["Event A", "Event B"],
          },
        ])
        .mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityTypes: ["venue"] }),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body.conflicts).toHaveLength(1);

      const conflict = (body.conflicts as Record<string, any>[])[0];
      expect(conflict.type).toBe("venue");
      expect(conflict).toHaveProperty("resolutionOptions");
    });

    it("returns valid typed payload for equipment conflicts", async () => {
      // Equipment conflict uses typed Prisma.sql with Prisma.join for status array
      mockQueryRaw
        .mockResolvedValueOnce([
          {
            equipment_name: "Stand Mixer",
            event_date: new Date("2026-02-20"),
            event_count: 2,
            event_ids: ["event-1", "event-2"],
            event_titles: ["Event A", "Event B"],
            station_ids: ["station-1"],
            station_names: ["Baking Station"],
          },
        ])
        .mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityTypes: ["equipment"] }),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body.conflicts).toHaveLength(1);

      const conflict = (body.conflicts as Record<string, any>[])[0];
      expect(conflict.type).toBe("equipment");
      expect(conflict).toHaveProperty("resolutionOptions");
      // Equipment conflict should have proper severity based on event_count
      expect(["high", "critical"]).toContain(conflict.severity);
    });

    it("returns valid typed payload for timeline conflicts", async () => {
      // Timeline detector uses Prisma ORM (prepTask.findMany), not $queryRaw
      mockPrepTaskFindMany.mockResolvedValueOnce([
        {
          id: "task-1",
          name: "Prep vegetables",
          dueByDate: new Date("2026-02-19"),
          priority: 2,
        },
      ]);
      // Other detectors use $queryRaw and return empty
      mockQueryRaw.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityTypes: ["timeline"] }),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body.conflicts).toHaveLength(1);

      const conflict = (body.conflicts as Record<string, any>[])[0];
      expect(conflict.type).toBe("timeline");
      expect(conflict.severity).toBe("critical"); // priority <= 2 is critical
    });

    it("returns valid typed payload for financial conflicts", async () => {
      mockQueryRaw
        .mockResolvedValueOnce([
          {
            event_id: "event-1",
            event_title: "Corporate Gala",
            budgeted_total_cost: "10000",
            budgeted_gross_margin_pct: "30",
            actual_gross_margin_pct: "15",
            cost_variance: "2000",
            margin_variance_pct: "-15",
          },
        ])
        .mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityTypes: ["financial"] }),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body.conflicts).toHaveLength(1);

      const conflict = (body.conflicts as Record<string, any>[])[0];
      expect(conflict.type).toBe("financial");
      // marginVariance < -10 is critical
      expect(conflict.severity).toBe("critical");
    });
  });

  describe("Error handling safety - partial results resilience", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ orgId: validOrgId, userId: "user_123" });
      mockGetTenantIdForOrg.mockResolvedValue(validTenantId);
    });

    it("returns HTTP 200 with warnings when database query fails (partial results)", async () => {
      // All detectors fail - should still return 200 with empty conflicts and warnings
      // Timeline detector uses Prisma ORM, others use $queryRaw
      mockQueryRaw.mockRejectedValue(new Error("Database connection failed"));
      mockPrepTaskFindMany.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      // Per P0 Item 3: single detector failure should NOT fail whole response
      // Returns HTTP 200 with partial results + warnings
      expect(response.status).toBe(200);
      expect(body).toHaveProperty("conflicts");
      expect(Array.isArray(body.conflicts)).toBe(true);
      expect(body).toHaveProperty("warnings");
      expect(Array.isArray(body.warnings)).toBe(true);
      // Should have warnings from all 7 failed detectors
      expect((body.warnings as unknown[]).length).toBe(7);
      // Should not expose raw error message in response
      expect(JSON.stringify(body)).not.toContain("Database connection failed");
    });

    it("returns partial results with warnings when some detectors fail", async () => {
      // First detector (scheduling) succeeds
      mockQueryRaw.mockResolvedValueOnce([
        {
          employee_id: "emp-1",
          employee_name: "John Doe",
          shift_count: 2,
          shift_date: new Date("2026-02-20"),
        },
      ]);
      // Second detector (staff) fails
      mockQueryRaw.mockRejectedValueOnce(new Error("Staff query failed"));
      // Remaining detectors return empty
      mockQueryRaw.mockResolvedValue([]);
      // Timeline detector succeeds (uses Prisma ORM)
      mockPrepTaskFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      // Should have 1 conflict from successful detector
      expect(body.conflicts).toHaveLength(1);
      // Should have warning from failed detector
      expect(body).toHaveProperty("warnings");
      const warnings = body.warnings as Array<{
        detectorType: string;
        message: string;
      }>;
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].detectorType).toBe("staff");
      expect(warnings[0].message).toContain("Unable to check");
    });

    it("returns partial results with warnings for SQL syntax errors", async () => {
      mockQueryRaw.mockRejectedValue(
        new Error('syntax error at or near "SELECT"')
      );
      mockPrepTaskFindMany.mockRejectedValue(
        new Error('syntax error at or near "SELECT"')
      );

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      // Should return 200 with warnings, not 500
      expect(response.status).toBe(200);
      expect(body).toHaveProperty("warnings");
      // Raw SQL error should not leak to response
      expect(JSON.stringify(body)).not.toContain("syntax error");
      expect(JSON.stringify(body)).not.toContain("SELECT");
    });

    it("returns partial results with warnings for permission denied errors", async () => {
      mockQueryRaw.mockRejectedValue(
        new Error("permission denied for table employees")
      );
      mockPrepTaskFindMany.mockRejectedValue(
        new Error("permission denied for table prep_tasks")
      );

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("warnings");
      // Raw error details should not leak
      expect(JSON.stringify(body)).not.toContain("permission denied");
      expect(JSON.stringify(body)).not.toContain("employees");
    });

    it("returns partial results with warnings for invalid input syntax (malformed UUID)", async () => {
      // This simulates what happens when tenantId is malformed
      mockQueryRaw.mockRejectedValue(
        new Error('invalid input syntax for type uuid: "not-a-uuid"')
      );
      mockPrepTaskFindMany.mockRejectedValue(
        new Error('invalid input syntax for type uuid: "not-a-uuid"')
      );

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("warnings");
      expect(JSON.stringify(body)).not.toContain("invalid input syntax");
      expect(JSON.stringify(body)).not.toContain("uuid");
    });

    it("returns partial results with warnings for relation does not exist errors", async () => {
      // Simulates missing table or schema
      mockQueryRaw.mockRejectedValue(
        new Error('relation "tenant_staff.schedule_shifts" does not exist')
      );
      mockPrepTaskFindMany.mockRejectedValue(
        new Error('relation "tenant_kitchen.prep_tasks" does not exist')
      );

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("warnings");
      expect(JSON.stringify(body)).not.toContain("relation");
      expect(JSON.stringify(body)).not.toContain("does not exist");
    });

    it("returns partial results with warnings for column does not exist errors", async () => {
      // Simulates schema drift or migration issues
      mockQueryRaw.mockRejectedValue(
        new Error('column "shift_start" does not exist')
      );
      mockPrepTaskFindMany.mockRejectedValue(
        new Error('column "due_by_date" does not exist')
      );

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("warnings");
      expect(JSON.stringify(body)).not.toContain("column");
      expect(JSON.stringify(body)).not.toContain("does not exist");
    });

    it("returns partial results with warnings for connection timeout errors", async () => {
      mockQueryRaw.mockRejectedValue(
        new Error("Connection terminated due to connection timeout")
      );
      mockPrepTaskFindMany.mockRejectedValue(
        new Error("Connection terminated due to connection timeout")
      );

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("warnings");
      expect(JSON.stringify(body)).not.toContain("Connection terminated");
      expect(JSON.stringify(body)).not.toContain("timeout");
    });

    it("returns partial results with warnings for deadlock detected errors", async () => {
      mockQueryRaw.mockRejectedValue(new Error("deadlock detected"));
      mockPrepTaskFindMany.mockRejectedValue(new Error("deadlock detected"));

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("warnings");
      expect(JSON.stringify(body)).not.toContain("deadlock");
    });

    it("returns partial results with warnings for UUID type coercion errors", async () => {
      // This tests the new ${tenantId}::uuid casting pattern
      mockQueryRaw.mockRejectedValue(
        new Error('invalid input syntax for type uuid: "malformed-uuid-string"')
      );
      mockPrepTaskFindMany.mockRejectedValue(
        new Error('invalid input syntax for type uuid: "malformed-uuid-string"')
      );

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("warnings");
      expect(JSON.stringify(body)).not.toContain("invalid input syntax");
      expect(JSON.stringify(body)).not.toContain("malformed-uuid");
    });

    it("returns partial results with warnings for type mismatch errors", async () => {
      // Simulates column type drift between code and schema
      mockQueryRaw.mockRejectedValue(
        new Error("operator does not exist: uuid = text")
      );
      mockPrepTaskFindMany.mockRejectedValue(
        new Error("operator does not exist: uuid = text")
      );

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("warnings");
      expect(JSON.stringify(body)).not.toContain("operator does not exist");
    });
  });

  describe("Summary accuracy", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ orgId: validOrgId, userId: "user_123" });
      mockGetTenantIdForOrg.mockResolvedValue(validTenantId);
    });

    it("correctly counts conflicts by severity", async () => {
      // Return 1 critical, 2 high, 1 medium scheduling conflicts
      mockQueryRaw.mockResolvedValueOnce([
        {
          employee_id: "emp-1",
          employee_name: "John",
          shift_count: 3,
          shift_date: new Date("2026-02-20"),
        },
        {
          employee_id: "emp-2",
          employee_name: "Jane",
          shift_count: 3,
          shift_date: new Date("2026-02-21"),
        },
        {
          employee_id: "emp-3",
          employee_name: "Bob",
          shift_count: 2,
          shift_date: new Date("2026-02-22"),
        },
        {
          employee_id: "emp-4",
          employee_name: "Alice",
          shift_count: 2,
          shift_date: new Date("2026-02-23"),
        },
      ]);
      mockQueryRaw.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityTypes: ["scheduling"] }),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);

      const summary = body.summary as Record<string, any>;
      // shift_count > 2 is critical, shift_count = 2 is high
      expect(summary.bySeverity).toMatchObject({
        critical: 2,
        high: 2,
        medium: 0,
        low: 0,
      });
    });

    it("correctly counts conflicts by type", async () => {
      mockAuth.mockResolvedValue({
        orgId: validOrgId,
        userId: "user_123",
      } as never);
      mockGetTenantIdForOrg.mockResolvedValue(validTenantId);

      // 2 scheduling conflicts (uses $queryRaw)
      mockQueryRaw.mockResolvedValueOnce([
        {
          employee_id: "emp-1",
          employee_name: "John",
          shift_count: 2,
          shift_date: new Date("2026-02-20"),
        },
        {
          employee_id: "emp-2",
          employee_name: "Jane",
          shift_count: 2,
          shift_date: new Date("2026-02-21"),
        },
      ]);
      // Other $queryRaw queries return empty
      mockQueryRaw.mockResolvedValue([]);

      // 1 inventory conflict (uses Prisma ORM: inventoryAlert + inventoryItem)
      mockInventoryAlertFindMany.mockResolvedValueOnce([
        {
          id: "alert-1",
          itemId: "item-1",
          alertType: "critical",
          threshold_value: BigInt(10),
          triggered_at: new Date("2026-02-20"),
        },
      ]);
      mockInventoryItemFindMany.mockResolvedValueOnce([
        {
          id: "item-1",
          name: "Flour",
        },
      ]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityTypes: ["scheduling", "inventory"] }),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);

      const summary = body.summary as Record<string, any>;
      expect(summary.byType.scheduling).toBe(2);
      expect(summary.byType.inventory).toBe(1);
      expect(summary.total).toBe(3);
    });
  });

  describe("Response shape validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ orgId: validOrgId, userId: "user_123" });
      mockGetTenantIdForOrg.mockResolvedValue(validTenantId);
    });

    it("returns all required fields in conflict object", async () => {
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
      // Inventory mocks return empty to avoid warnings
      mockInventoryAlertFindMany.mockResolvedValue([]);
      mockInventoryItemFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);

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

      // affectedEntities shape
      const entity = (conflict.affectedEntities as Record<string, any>[])[0];
      expect(entity).toHaveProperty("type");
      expect(entity).toHaveProperty("id");
      expect(entity).toHaveProperty("name");
    });
  });
});
