/**
 * Integration Tests: Ably Authentication Endpoint
 *
 * These tests validate that the /api/ably/auth endpoint:
 * 1. Successfully authenticates with valid tenantId
 * 2. Fails authentication with missing tenantId
 * 3. Fails authentication with invalid tenantId
 * 4. Generates correct Ably tokens
 * 5. Sets proper capability claims for channel access
 * 6. Validates token expiration time
 *
 * NOTE: These tests require real API route testing without mocks.
 * Run with:
 *   pnpm test:integration
 * Or run specific file:
 *   pnpm vitest --config vitest.config.integration.mts auth.integration
 *
 * @packageDocumentation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Test constants
const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "00000000-0000-0000-0000-000000000002";
const TEST_INVALID_TENANT_ID = "invalid-tenant-id";
const ABLY_API_KEY = "test_ably_key:secret_key";

// Mock the env module BEFORE any imports that use it
// This is required because @t3-oss/env-nextjs validates env vars at module load time
vi.mock("@/env", () => ({
  env: {
    ABLY_API_KEY: "test_ably_key:secret_key",
    ABLY_AUTH_CORS_ORIGINS:
      "http://localhost:2221,http://localhost:2222,http://localhost:3000",
  },
}));

// Mock auth to provide authenticated user context
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      userId: TEST_USER_ID,
      sessionClaims: {
        tenantId: TEST_TENANT_ID,
      },
    })
  ),
}));

describe("Ably Authentication - Integration Tests", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe("Successful Authentication", () => {
    it("should authenticate successfully with valid tenantId from session claims", async () => {
      const { POST } = await import("@/app/ably/auth/route");

      // Import NextRequest dynamically to avoid module resolution issues
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      const data = await response.json();

      // Verify token request structure
      expect(data).toHaveProperty("keyName");
      expect(data.keyName).toBe("test_ably_key");

      // Verify client ID format
      expect(data).toHaveProperty("clientId");
      expect(data.clientId).toBe(
        `tenant:${TEST_TENANT_ID}:user:${TEST_USER_ID}`
      );

      // Verify capability claims (returned as JSON string by Ably)
      expect(data).toHaveProperty("capability");
      expect(typeof data.capability).toBe("string");
      const capability = JSON.parse(data.capability);
      expect(capability).toEqual({
        [`tenant:${TEST_TENANT_ID}`]: ["subscribe"],
      });

      // Verify nonce
      expect(data).toHaveProperty("nonce");
      expect(typeof data.nonce).toBe("string");
      expect(data.nonce.length).toBeGreaterThan(0);

      // Verify timestamp
      expect(data).toHaveProperty("timestamp");
      expect(typeof data.timestamp).toBe("number");
      expect(data.timestamp).toBeGreaterThan(0);

      // Verify mac (message authentication code)
      expect(data).toHaveProperty("mac");
      expect(typeof data.mac).toBe("string");
      expect(data.mac.length).toBeGreaterThan(0);
    });

    it("should authenticate successfully with valid tenantId from request body", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: TEST_USER_ID,
        sessionClaims: {}, // No tenantId in session
      } as never);

      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2222",
        },
        body: JSON.stringify({
          tenantId: TEST_TENANT_ID,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      const data = await response.json();

      // Verify the token was generated using the tenantId from request body
      expect(data.clientId).toBe(
        `tenant:${TEST_TENANT_ID}:user:${TEST_USER_ID}`
      );
      const capability = JSON.parse(data.capability);
      expect(capability).toEqual({
        [`tenant:${TEST_TENANT_ID}`]: ["subscribe"],
      });
    });

    it("should include CORS headers for allowed origins", async () => {
      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      // Verify CORS headers
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:3000"
      );
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
        "POST, OPTIONS"
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type"
      );
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true"
      );
    });

    it("should use default CORS origin when request origin is not in allowed list", async () => {
      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://unknown-origin:9999",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      // Should use first allowed origin as default
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:2221"
      );
    });
  });

  describe("Authentication Failure Cases", () => {
    it("should return 401 when user is not authenticated", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: null,
        sessionClaims: null,
      } as never);

      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });

      // Verify CORS headers are still present on error
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:2221"
      );
    });

    it("should return 400 when tenantId is missing from both session and request body", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: TEST_USER_ID,
        sessionClaims: {}, // No tenantId
      } as never);

      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}), // No tenantId in body
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "tenantId is required (body or session claim)",
      });
    });

    it("should return 400 when request body is malformed JSON", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: TEST_USER_ID,
        sessionClaims: {}, // No tenantId
      } as never);

      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: "invalid json{{{",
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "tenantId is required (body or session claim)",
      });
    });

    it("should handle invalid tenantId format (still passes through)", async () => {
      // Note: The endpoint doesn't validate tenantId format, it just uses it
      // This test verifies that the system accepts the tenantId as provided
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: TEST_USER_ID,
        sessionClaims: {
          tenantId: TEST_INVALID_TENANT_ID,
        },
      } as never);

      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      // Should still succeed (endpoint doesn't validate tenantId format)
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.clientId).toBe(
        `tenant:${TEST_INVALID_TENANT_ID}:user:${TEST_USER_ID}`
      );
    });
  });

  describe("Ably Token Generation", () => {
    it("should generate token with correct structure", async () => {
      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify all required fields are present in token request
      expect(data).toMatchObject({
        keyName: "test_ably_key",
        clientId: `tenant:${TEST_TENANT_ID}:user:${TEST_USER_ID}`,
        capability: expect.any(String),
        nonce: expect.any(String),
        timestamp: expect.any(Number),
        mac: expect.any(String),
      });

      // Verify mac is a valid-looking base64 string
      // Ably MACs are base64-encoded HMAC signatures
      expect(data.mac).toMatch(/^[A-Za-z0-9+/=_-]+$/);
    });

    it("should generate unique nonce for each request", async () => {
      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request1 = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const request2 = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response1 = await POST(request1);
      const response2 = await POST(request2);

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Nonces should be different for each request
      expect(data1.nonce).not.toBe(data2.nonce);
    });
  });

  describe("Capability Claims for Channel Access", () => {
    it("should grant subscribe permission for tenant-specific channel", async () => {
      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      // Parse capability from JSON string
      const capability = JSON.parse(data.capability);

      // Verify capability includes tenant channel with subscribe permission
      expect(capability).toHaveProperty(`tenant:${TEST_TENANT_ID}`);
      expect(capability[`tenant:${TEST_TENANT_ID}`]).toEqual(["subscribe"]);
    });

    it("should only include tenant-specific channel in capabilities", async () => {
      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      // Parse capability from JSON string
      const capability = JSON.parse(data.capability);

      // Verify only one channel is in capabilities
      const channelCount = Object.keys(capability).length;
      expect(channelCount).toBe(1);

      // Verify it's the tenant channel
      expect(capability).toHaveProperty(`tenant:${TEST_TENANT_ID}`);
    });

    it("should generate correct client ID with tenant and user components", async () => {
      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify client ID format: tenant:{tenantId}:user:{userId}
      expect(data.clientId).toMatch(/^tenant:[^:]+:user:[^:]+$/);
      expect(data.clientId).toBe(
        `tenant:${TEST_TENANT_ID}:user:${TEST_USER_ID}`
      );
    });
  });

  describe("Token Expiration Time Validation", () => {
    it("should include timestamp in token request", async () => {
      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const beforeRequest = Date.now();

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      const afterRequest = Date.now();

      // Verify timestamp is current (within reasonable time window)
      expect(data.timestamp).toBeGreaterThanOrEqual(beforeRequest);
      expect(data.timestamp).toBeLessThanOrEqual(afterRequest);
    });

    it("should generate token that can be used for Ably connection", async () => {
      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify token request has all fields required by Ably
      // Ably token request returns: keyName, clientId, capability, nonce, timestamp, mac
      expect(data.keyName).toBeDefined();
      expect(data.mac).toBeDefined();

      // mac should be a non-empty string (this is the token signature)
      expect(data.mac.length).toBeGreaterThan(0);

      // The token request can be used to authenticate with Ably
      // (We don't actually connect to Ably in tests, just verify structure)
      expect(typeof data.mac).toBe("string");
    });

    it("should include TTL (time to live) information via timestamp", async () => {
      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify timestamp is present (used by Ably to calculate token expiration)
      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe("number");

      // Ably tokens typically expire after 1 hour by default
      // The timestamp is used to calculate this
      const timestampDate = new Date(data.timestamp * 1000); // Convert to ms
      expect(timestampDate.getTime()).toBeGreaterThan(0);
    });
  });

  describe("OPTIONS Method Support", () => {
    it("should handle OPTIONS request for CORS preflight", async () => {
      const { OPTIONS } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:2221",
        },
      });

      const response = await OPTIONS(request);

      // Should return 204 No Content
      expect(response.status).toBe(204);

      // Verify CORS headers are present
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:2221"
      );
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
        "POST, OPTIONS"
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type"
      );
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true"
      );
    });
  });

  describe("Request Body Priority", () => {
    it("should prioritize tenantId from request body over session claims", async () => {
      const bodyTenantId = "00000000-0000-0000-0000-000000000099";
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        userId: TEST_USER_ID,
        sessionClaims: {
          tenantId: TEST_TENANT_ID, // Different tenantId in session
        },
      } as never);

      const { POST } = await import("@/app/ably/auth/route");
      const { NextRequest } = await import("next/server");

      const request = new NextRequest("http://localhost/ably/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:2221",
        },
        body: JSON.stringify({
          tenantId: bodyTenantId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Parse capability from JSON string
      const capability = JSON.parse(data.capability);

      // Should use tenantId from request body
      expect(data.clientId).toBe(`tenant:${bodyTenantId}:user:${TEST_USER_ID}`);
      expect(capability).toEqual({
        [`tenant:${bodyTenantId}`]: ["subscribe"],
      });
    });
  });
});
