/**
 * Tests for correlation ID propagation in conflict detection API
 *
 * These tests verify that:
 * - Correlation IDs are generated when not provided
 * - Correlation IDs are extracted from headers when provided
 * - Correlation IDs are included in error responses
 * - Correlation IDs are returned in response headers
 * - Logs include correlation IDs (via mock assertions)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before imports
const mockAuth = vi.fn();
const mockGetTenantIdForOrg = vi.fn();
const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock("@repo/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mockGetTenantIdForOrg,
}));

vi.mock("@repo/observability/log", () => ({
  log: mockLog,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock database with empty results to avoid SQL execution
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn().mockResolvedValue([]),
    prepTask: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    inventoryAlert: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    inventoryItem: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
    join: (arr: unknown[]) => arr,
  },
}));

describe("Conflict Detection API - Correlation ID", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ orgId: "org-123", userId: "user-123" });
    mockGetTenantIdForOrg.mockResolvedValue("tenant-123");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Correlation ID generation and extraction", () => {
    it("should generate a correlation ID when not provided in request", async () => {
      const { POST } = await import("@/app/api/conflicts/detect/route");

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      // Check that correlation ID header is set in response
      const correlationId = response.headers.get("x-correlation-id");
      expect(correlationId).toBeDefined();
      expect(correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      // Check that log.info was called with correlationId
      expect(mockLog.info).toHaveBeenCalledWith(
        "[conflicts/detect] Starting conflict detection",
        expect.objectContaining({
          correlationId,
          route: "conflicts-detect",
        })
      );
    });

    it("should use provided correlation ID from x-correlation-id header", async () => {
      const { POST } = await import("@/app/api/conflicts/detect/route");

      const providedCorrelationId = "provided-correlation-id-12345";
      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": providedCorrelationId,
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      // Check that the provided correlation ID is used
      const responseCorrelationId = response.headers.get("x-correlation-id");
      expect(responseCorrelationId).toBe(providedCorrelationId);

      // Check that log was called with the provided correlationId
      expect(mockLog.info).toHaveBeenCalledWith(
        "[conflicts/detect] Starting conflict detection",
        expect.objectContaining({
          correlationId: providedCorrelationId,
          route: "conflicts-detect",
        })
      );
    });

    it("should include correlation ID in start and completion logs", async () => {
      const { POST } = await import("@/app/api/conflicts/detect/route");

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      await POST(request);

      // Both info logs should have correlationId
      const infoCalls = mockLog.info.mock.calls;
      expect(infoCalls.length).toBe(2); // start and completion

      const startLog = infoCalls[0];
      const completionLog = infoCalls[1];

      expect(startLog[1]).toHaveProperty("correlationId");
      expect(completionLog[1]).toHaveProperty("correlationId");
      expect(startLog[1].correlationId).toBe(completionLog[1].correlationId);
    });
  });

  describe("Correlation ID in error responses", () => {
    it("should include correlation ID in unauthorized error response", async () => {
      mockAuth.mockResolvedValue({ orgId: null, userId: null });

      const { POST } = await import("@/app/api/conflicts/detect/route");

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(401);
      expect(body).toHaveProperty("correlationId");
      expect(body.code).toBe("AUTH_REQUIRED");

      // Should also log with correlation ID
      expect(mockLog.warn).toHaveBeenCalledWith(
        "[conflicts/detect] Unauthorized request",
        expect.objectContaining({
          correlationId: body.correlationId,
          errorCode: "AUTH_REQUIRED",
        })
      );
    });

    it("should include correlation ID in tenant not found error response", async () => {
      mockGetTenantIdForOrg.mockResolvedValue(null);

      const { POST } = await import("@/app/api/conflicts/detect/route");

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(404);
      expect(body).toHaveProperty("correlationId");
      expect(body.code).toBe("TENANT_NOT_FOUND");
    });

    it("should include correlation ID in validation error response", async () => {
      const { POST } = await import("@/app/api/conflicts/detect/route");

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeRange: { start: "invalid-date", end: "2024-01-01" },
        }),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("correlationId");
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should include correlation ID in invalid JSON error response", async () => {
      const { POST } = await import("@/app/api/conflicts/detect/route");

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json",
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(400);
      expect(body).toHaveProperty("correlationId");
      expect(body.code).toBe("INVALID_REQUEST");
    });
  });

  describe("Correlation ID propagation with provided ID", () => {
    it("should propagate client-provided correlation ID through entire request lifecycle", async () => {
      const { POST } = await import("@/app/api/conflicts/detect/route");

      const clientCorrelationId = "client-request-abc-123";
      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": clientCorrelationId,
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const _body = (await response.json()) as Record<string, unknown>;

      // Response header should have the same correlation ID
      expect(response.headers.get("x-correlation-id")).toBe(
        clientCorrelationId
      );

      // All logs should use the same correlation ID
      const allCalls = [
        ...mockLog.info.mock.calls,
        ...mockLog.warn.mock.calls,
        ...mockLog.error.mock.calls,
      ];

      for (const call of allCalls) {
        if (call[1] && typeof call[1] === "object") {
          expect(call[1]).toHaveProperty("correlationId", clientCorrelationId);
        }
      }
    });
  });

  describe("Error codes normalization", () => {
    it("should use AUTH_REQUIRED for missing auth", async () => {
      mockAuth.mockResolvedValue({ orgId: null, userId: null });

      const { POST } = await import("@/app/api/conflicts/detect/route");

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, unknown>;

      expect(body.code).toBe("AUTH_REQUIRED");
    });

    it("should use TENANT_NOT_FOUND for missing tenant", async () => {
      mockGetTenantIdForOrg.mockResolvedValue(null);

      const { POST } = await import("@/app/api/conflicts/detect/route");

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, unknown>;

      expect(body.code).toBe("TENANT_NOT_FOUND");
    });

    it("should use VALIDATION_ERROR for invalid timeRange", async () => {
      const { POST } = await import("@/app/api/conflicts/detect/route");

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeRange: { start: "2024-01-10", end: "2024-01-01" }, // end before start
        }),
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, unknown>;

      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("should use INVALID_REQUEST for malformed JSON", async () => {
      const { POST } = await import("@/app/api/conflicts/detect/route");

      const request = new Request("http://localhost/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not valid",
      });

      const response = await POST(request);
      const body = (await response.json()) as Record<string, unknown>;

      expect(body.code).toBe("INVALID_REQUEST");
    });
  });
});
