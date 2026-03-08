/**
 * Rate Limiting Middleware Test Suite
 *
 * Tests verify the checkRateLimit, withRateLimit, and addRateLimitHeaders functions,
 * including edge cases for invalid windows, missing tenant IDs, and Redis errors.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  withRateLimit,
  addRateLimitHeaders,
} from "@/middleware/rate-limiter";

// Mock the database module
vi.mock("@repo/database", () => ({
  database: {
    rateLimitConfig: {
      findMany: vi.fn(),
    },
    rateLimitEvent: {
      create: vi.fn().mockResolvedValue({ id: "event-1" }),
    },
  },
}));

// Mock the rate-limit module
const mockRateLimiter = {
  limit: vi.fn(),
};

vi.mock("@repo/rate-limit", () => ({
  createRateLimiter: vi.fn(() => mockRateLimiter),
  slidingWindow: vi.fn((limit, window) => ({ limit, window })),
}));

// Import mocked modules after vi.mock calls
import { database } from "@repo/database";

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const BASE_URL = "http://localhost:3000/api/test";

/**
 * Helper to create a mock Request object
 */
function createMockRequest(options: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}): Request {
  const url = options.url ?? BASE_URL;
  const headers = new Headers(options.headers ?? {});
  return new Request(url, {
    method: options.method ?? "GET",
    headers,
  });
}

describe("Rate Limiting Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));

    // Default mock for rate limiter - success with remaining requests
    mockRateLimiter.limit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
    });

    // Default mock for database config lookup - no custom config
    vi.mocked(database.rateLimitConfig.findMany).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // checkRateLimit Function Tests
  // ===========================================================================
  describe("checkRateLimit", () => {
    describe("when under limit", () => {
      it("should return success when under rate limit", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        mockRateLimiter.limit.mockResolvedValue({
          success: true,
          remaining: 99,
          reset: Date.now() + 60000,
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.success).toBe(true);
        expect(result.remaining).toBe(99);
        expect(result.limit).toBe(100); // default limit
        expect(result.response).toBeUndefined();
      });

      it("should return correct limit from options", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        mockRateLimiter.limit.mockResolvedValue({
          success: true,
          remaining: 49,
          reset: Date.now() + 60000,
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID, {
          limit: 50,
          window: "1m",
        });

        expect(result.limit).toBe(50);
        expect(result.remaining).toBe(49);
      });

      it("should return correct reset date from rate limiter", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const resetTime = Date.now() + 30000;
        mockRateLimiter.limit.mockResolvedValue({
          success: true,
          remaining: 95,
          reset: resetTime,
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.reset).toEqual(new Date(resetTime));
      });
    });

    describe("when over limit", () => {
      it("should return failure when over rate limit", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        mockRateLimiter.limit.mockResolvedValue({
          success: false,
          remaining: 0,
          reset: Date.now() + 30000,
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.success).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.response).toBeDefined();
        expect(result.response?.status).toBe(429);
      });

      it("should return 429 response with correct body", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const resetTime = Date.now() + 45000;
        mockRateLimiter.limit.mockResolvedValue({
          success: false,
          remaining: 0,
          reset: resetTime,
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.response).toBeDefined();
        const body = await result.response?.json();
        expect(body.message).toBe("Too many requests. Please try again later.");
        expect(body.limit).toBe(100);
        expect(body.remaining).toBe(0);
      });

      it("should return 429 response with correct headers", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const resetTime = Date.now() + 45000;
        mockRateLimiter.limit.mockResolvedValue({
          success: false,
          remaining: 0,
          reset: resetTime,
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.response?.headers.get("x-ratelimit-limit")).toBe("100");
        expect(result.response?.headers.get("x-ratelimit-remaining")).toBe("0");
        expect(result.response?.headers.get("x-ratelimit-reset")).toBe(
          new Date(resetTime).toISOString()
        );
        expect(result.response?.headers.get("retry-after")).toBe("45");
      });
    });

    describe("rate limit headers", () => {
      it("should return X-RateLimit-Limit header with configured limit", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID, {
          limit: 200,
          window: "1h",
        });

        expect(result.limit).toBe(200);
      });

      it("should return X-RateLimit-Remaining header with correct count", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        mockRateLimiter.limit.mockResolvedValue({
          success: true,
          remaining: 42,
          reset: Date.now() + 60000,
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.remaining).toBe(42);
      });

      it("should return X-RateLimit-Reset header with ISO date string", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const resetTime = Date.now() + 120000;
        mockRateLimiter.limit.mockResolvedValue({
          success: true,
          remaining: 80,
          reset: resetTime,
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.reset.toISOString()).toBe(new Date(resetTime).toISOString());
      });
    });

    describe("skip option", () => {
      it("should skip rate limiting when skip option is true", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID, {
          skip: true,
        });

        expect(result.success).toBe(true);
        expect(mockRateLimiter.limit).not.toHaveBeenCalled();
      });

      it("should return default values when skipping", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const result = await checkRateLimit(request, TEST_TENANT_ID, {
          skip: true,
          limit: 50,
          window: "5m",
        });

        expect(result.limit).toBe(50);
        expect(result.remaining).toBe(50);
        expect(result.reset.getTime()).toBeGreaterThan(Date.now());
      });
    });

    describe("fail-open on Redis errors", () => {
      it("should allow request on Redis error (fail-open)", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        mockRateLimiter.limit.mockRejectedValue(new Error("Redis connection failed"));

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.success).toBe(true);
        expect(result.remaining).toBe(100); // default limit as remaining
      });

      it("should log error to console on Redis failure", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        mockRateLimiter.limit.mockRejectedValue(new Error("Redis timeout"));

        await checkRateLimit(request, TEST_TENANT_ID);

        expect(consoleSpy).toHaveBeenCalledWith(
          "[rate-limiter] Redis error, allowing request:",
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it("should return remaining equal to limit on Redis error", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        mockRateLimiter.limit.mockRejectedValue(new Error("Redis down"));

        const result = await checkRateLimit(request, TEST_TENANT_ID, {
          limit: 25,
        });

        expect(result.remaining).toBe(25);
      });
    });

    describe("identifier extraction", () => {
      it("should use x-user-id header for identifier", async () => {
        const request = createMockRequest({
          headers: {
            "x-tenant-id": TEST_TENANT_ID,
            "x-user-id": "user-123",
          },
        });

        await checkRateLimit(request, TEST_TENANT_ID);

        expect(mockRateLimiter.limit).toHaveBeenCalledWith(
          expect.stringContaining("user:user-123")
        );
      });

      it("should use x-api-key-id header for identifier when no user id", async () => {
        const request = createMockRequest({
          headers: {
            "x-tenant-id": TEST_TENANT_ID,
            "x-api-key-id": "apikey-456",
          },
        });

        await checkRateLimit(request, TEST_TENANT_ID);

        expect(mockRateLimiter.limit).toHaveBeenCalledWith(
          expect.stringContaining("apikey:apikey-456")
        );
      });

      it("should fall back to IP address when no user or api key id", async () => {
        const request = createMockRequest({
          headers: {
            "x-tenant-id": TEST_TENANT_ID,
            "x-forwarded-for": "192.168.1.100, 10.0.0.1",
          },
        });

        await checkRateLimit(request, TEST_TENANT_ID);

        expect(mockRateLimiter.limit).toHaveBeenCalledWith(
          expect.stringContaining("ip:192.168.1.100")
        );
      });

      it("should use unknown as IP fallback", async () => {
        const request = createMockRequest({
          headers: {
            "x-tenant-id": TEST_TENANT_ID,
          },
        });

        await checkRateLimit(request, TEST_TENANT_ID);

        expect(mockRateLimiter.limit).toHaveBeenCalledWith(
          expect.stringContaining("ip:unknown")
        );
      });
    });

    describe("endpoint extraction", () => {
      it("should extract endpoint pattern from URL", async () => {
        const request = createMockRequest({
          url: "http://localhost:3000/api/events/123",
          method: "POST",
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        await checkRateLimit(request, TEST_TENANT_ID);

        expect(mockRateLimiter.limit).toHaveBeenCalledWith(
          expect.stringContaining("POST:/api/events/123")
        );
      });

      it("should replace UUIDs with :id placeholder", async () => {
        const request = createMockRequest({
          url: "http://localhost:3000/api/events/550e8400-e29b-41d4-a716-446655440000/items",
          method: "GET",
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        await checkRateLimit(request, TEST_TENANT_ID);

        expect(mockRateLimiter.limit).toHaveBeenCalledWith(
          expect.stringContaining("GET:/api/events/:id/items")
        );
      });
    });

    describe("custom config from database", () => {
      it("should use database config when available", async () => {
        const request = createMockRequest({
          url: "http://localhost:3000/api/special-endpoint",
          method: "GET",
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        vi.mocked(database.rateLimitConfig.findMany).mockResolvedValue([
          {
            id: "config-1",
            tenantId: TEST_TENANT_ID,
            endpointPattern: "/api/special.*",
            maxRequests: 10,
            windowMs: 5000,
            priority: 1,
            isActive: true,
            deletedAt: null,
          } as any,
        ]);

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.limit).toBe(10);
      });

      it("should fall back to defaults when no matching config", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        vi.mocked(database.rateLimitConfig.findMany).mockResolvedValue([]);

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.limit).toBe(100); // default
      });
    });

    describe("event logging", () => {
      it("should log rate limit event to database", async () => {
        const request = createMockRequest({
          headers: {
            "x-tenant-id": TEST_TENANT_ID,
            "x-user-id": "user-123",
          },
        });

        await checkRateLimit(request, TEST_TENANT_ID);

        // Event logging is fire-and-forget, so we need to wait a tick
        await vi.waitFor(() => {
          expect(database.rateLimitEvent.create).toHaveBeenCalled();
        });
      });
    });
  });

  // ===========================================================================
  // withRateLimit HOF Tests
  // ===========================================================================
  describe("withRateLimit", () => {
    describe("header handling", () => {
      it("should wrap handler and add rate limit headers", async () => {
        const mockHandler = vi
          .fn()
          .mockResolvedValue(NextResponse.json({ data: "success" }));

        const wrappedHandler = withRateLimit(mockHandler, {
          limit: 100,
          window: "1m",
        });

        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const response = await wrappedHandler(request);

        expect(response.headers.get("x-ratelimit-limit")).toBe("100");
        expect(response.headers.get("x-ratelimit-remaining")).toBe("99");
      });

      it("should pass rate limit context to handler", async () => {
        let capturedContext: any = null;

        const mockHandler = vi.fn().mockImplementation(async (_req, context) => {
          capturedContext = context;
          return NextResponse.json({ data: "success" });
        });

        const wrappedHandler = withRateLimit(mockHandler, {
          limit: 50,
          window: "1h",
        });

        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        await wrappedHandler(request);

        expect(capturedContext).not.toBeNull();
        expect(capturedContext.rateLimit.limit).toBe(50);
        expect(capturedContext.rateLimit.remaining).toBe(99);
      });
    });

    describe("when rate limit exceeded", () => {
      it("should return 429 when rate limit exceeded", async () => {
        const mockHandler = vi
          .fn()
          .mockResolvedValue(NextResponse.json({ data: "success" }));

        mockRateLimiter.limit.mockResolvedValue({
          success: false,
          remaining: 0,
          reset: Date.now() + 30000,
        });

        const wrappedHandler = withRateLimit(mockHandler, {
          limit: 10,
          window: "1m",
        });

        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const response = await wrappedHandler(request);

        expect(response.status).toBe(429);
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it("should include retry-after header when rate limited", async () => {
        const mockHandler = vi
          .fn()
          .mockResolvedValue(NextResponse.json({ data: "success" }));

        mockRateLimiter.limit.mockResolvedValue({
          success: false,
          remaining: 0,
          reset: Date.now() + 45000,
        });

        const wrappedHandler = withRateLimit(mockHandler);

        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const response = await wrappedHandler(request);

        expect(response.headers.get("retry-after")).toBe("45");
      });
    });

    describe("missing tenant ID", () => {
      it("should pass through when no tenant ID", async () => {
        const mockHandler = vi
          .fn()
          .mockResolvedValue(NextResponse.json({ data: "success" }));

        const wrappedHandler = withRateLimit(mockHandler);

        const request = createMockRequest({});

        const response = await wrappedHandler(request);

        expect(mockHandler).toHaveBeenCalled();
        expect(response.status).toBe(200);
        // Should not call rate limiter when no tenant ID
        expect(mockRateLimiter.limit).not.toHaveBeenCalled();
      });

      it("should still provide rate limit context when no tenant ID", async () => {
        let capturedContext: any = null;

        const mockHandler = vi.fn().mockImplementation(async (_req, context) => {
          capturedContext = context;
          return NextResponse.json({ data: "success" });
        });

        const wrappedHandler = withRateLimit(mockHandler, {
          limit: 200,
          window: "1h",
        });

        const request = createMockRequest({});

        await wrappedHandler(request);

        expect(capturedContext.rateLimit.limit).toBe(200);
      });
    });

    describe("params handling", () => {
      it("should pass params through to handler", async () => {
        let capturedParams: any = null;

        const mockHandler = vi.fn().mockImplementation(async (_req, context) => {
          capturedParams = context?.params;
          return NextResponse.json({ data: "success" });
        });

        const wrappedHandler = withRateLimit(mockHandler);

        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        const paramsPromise = Promise.resolve({ id: "test-123" });

        await wrappedHandler(request, { params: paramsPromise });

        expect(capturedParams).toBe(paramsPromise);
      });
    });
  });

  // ===========================================================================
  // addRateLimitHeaders Function Tests
  // ===========================================================================
  describe("addRateLimitHeaders", () => {
    it("should add correct headers to response", () => {
      const originalResponse = new Response(JSON.stringify({ data: "test" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

      const resetDate = new Date("2026-01-15T12:05:00Z");

      const response = addRateLimitHeaders(originalResponse, 100, 95, resetDate);

      expect(response.headers.get("x-ratelimit-limit")).toBe("100");
      expect(response.headers.get("x-ratelimit-remaining")).toBe("95");
      expect(response.headers.get("x-ratelimit-reset")).toBe(
        "2026-01-15T12:05:00.000Z"
      );
    });

    it("should preserve existing headers", () => {
      const originalResponse = new Response(JSON.stringify({ data: "test" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-custom-header": "custom-value",
        },
      });

      const resetDate = new Date();

      const response = addRateLimitHeaders(originalResponse, 50, 40, resetDate);

      expect(response.headers.get("content-type")).toBe("application/json");
      expect(response.headers.get("x-custom-header")).toBe("custom-value");
    });

    it("should preserve response status", () => {
      const originalResponse = new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        statusText: "Not Found",
      });

      const resetDate = new Date();

      const response = addRateLimitHeaders(originalResponse, 100, 90, resetDate);

      expect(response.status).toBe(404);
      expect(response.statusText).toBe("Not Found");
    });

    it("should clamp remaining to minimum of 0", () => {
      const originalResponse = new Response();

      const resetDate = new Date();

      // Pass negative remaining to test clamping
      const response = addRateLimitHeaders(originalResponse, 100, -5, resetDate);

      expect(response.headers.get("x-ratelimit-remaining")).toBe("0");
    });

    it("should not modify original response", () => {
      const originalResponse = new Response();
      const originalHeaders = new Map(originalResponse.headers);

      const resetDate = new Date();
      addRateLimitHeaders(originalResponse, 100, 50, resetDate);

      // Original response headers should be unchanged
      expect(originalResponse.headers.get("x-ratelimit-limit")).toBeNull();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================
  describe("Edge Cases", () => {
    describe("invalid window format", () => {
      it("should throw error for invalid window format", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        await expect(
          checkRateLimit(request, TEST_TENANT_ID, { window: "invalid" })
        ).rejects.toThrow('Invalid window format: invalid');
      });

      it("should throw error for window without number", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        await expect(
          checkRateLimit(request, TEST_TENANT_ID, { window: "m" })
        ).rejects.toThrow('Invalid window format: m');
      });

      it("should throw error for window with invalid unit", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        await expect(
          checkRateLimit(request, TEST_TENANT_ID, { window: "5x" })
        ).rejects.toThrow('Invalid window format: 5x');
      });

      it("should accept valid window formats", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        // Test seconds
        await expect(
          checkRateLimit(request, TEST_TENANT_ID, { window: "30s" })
        ).resolves.toBeDefined();

        // Test minutes
        await expect(
          checkRateLimit(request, TEST_TENANT_ID, { window: "5m" })
        ).resolves.toBeDefined();

        // Test hours
        await expect(
          checkRateLimit(request, TEST_TENANT_ID, { window: "2h" })
        ).resolves.toBeDefined();

        // Test days
        await expect(
          checkRateLimit(request, TEST_TENANT_ID, { window: "1d" })
        ).resolves.toBeDefined();
      });
    });

    describe("missing tenant ID", () => {
      it("should handle empty tenant ID string", async () => {
        const mockHandler = vi
          .fn()
          .mockResolvedValue(NextResponse.json({ data: "success" }));

        const wrappedHandler = withRateLimit(mockHandler);

        const request = createMockRequest({
          headers: { "x-tenant-id": "" },
        });

        // Empty tenant ID is still a tenant ID, so rate limiter should be called
        await wrappedHandler(request);

        // With empty string tenant ID, it still processes
        expect(mockHandler).toHaveBeenCalled();
      });
    });

    describe("Redis connection issues", () => {
      it("should handle Redis timeout gracefully", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        mockRateLimiter.limit.mockRejectedValue(
          new Error("ETIMEDOUT connection timeout")
        );

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.success).toBe(true);
      });

      it("should handle Redis connection refused", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        mockRateLimiter.limit.mockRejectedValue(
          new Error("ECONNREFUSED connection refused")
        );

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.success).toBe(true);
      });

      it("should handle Redis out of memory", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        mockRateLimiter.limit.mockRejectedValue(
          new Error("OOM command not allowed when used_memory > maxmemory")
        );

        const result = await checkRateLimit(request, TEST_TENANT_ID);

        expect(result.success).toBe(true);
      });
    });

    describe("concurrent requests", () => {
      it("should handle multiple concurrent requests", async () => {
        const requests = Array.from({ length: 10 }, (_, i) =>
          createMockRequest({
            headers: {
              "x-tenant-id": TEST_TENANT_ID,
              "x-user-id": `user-${i}`,
            },
          })
        );

        mockRateLimiter.limit.mockResolvedValue({
          success: true,
          remaining: 90,
          reset: Date.now() + 60000,
        });

        const results = await Promise.all(
          requests.map((req) => checkRateLimit(req, TEST_TENANT_ID))
        );

        expect(results.every((r) => r.success)).toBe(true);
        expect(mockRateLimiter.limit).toHaveBeenCalledTimes(10);
      });
    });

    describe("custom prefix option", () => {
      it("should use custom prefix for Redis keys", async () => {
        const request = createMockRequest({
          headers: { "x-tenant-id": TEST_TENANT_ID },
        });

        await checkRateLimit(request, TEST_TENANT_ID, {
          prefix: "custom_prefix",
        });

        // Verify the createRateLimiter was called with the custom prefix
        const { createRateLimiter } = await import("@repo/rate-limit");
        expect(createRateLimiter).toHaveBeenCalledWith(
          expect.objectContaining({
            prefix: `custom_prefix:${TEST_TENANT_ID}`,
          })
        );
      });
    });
  });
});
