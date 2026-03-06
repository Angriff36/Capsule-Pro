/**
 * @vitest-environment node
 *
 * Vercel Log Ingestion Endpoint Tests
 *
 * Tests covering:
 * - Single log payload
 * - Batch payload
 * - Missing required field rejected
 * - Optional message accepted as absent
 * - Invalid signature rejected
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the observability logger
vi.mock("@repo/observability/log", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Store original env
const originalEnv = process.env;

// Helper to create a valid HMAC-SHA1 signature
function createSignature(rawBody: string, secret: string): string {
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha1", secret);
  hmac.update(rawBody);
  return hmac.digest("hex");
}

// Test constants
const TEST_SECRET = "test-drain-secret-12345";
const VALID_LOG_PAYLOAD = {
  id: "log_123",
  deploymentId: "dpl_abc123",
  source: "function",
  host: "my-app.vercel.app",
  timestamp: 1709673600000,
  projectId: "proj_xyz789",
  level: "info" as const,
  message: "Test log message",
};

const VALID_LOG_WITHOUT_MESSAGE = {
  id: "log_456",
  deploymentId: "dpl_abc123",
  source: "edge",
  host: "my-app.vercel.app",
  timestamp: 1709673601000,
  projectId: "proj_xyz789",
  level: "error" as const,
};

describe("Vercel Log Ingestion Endpoint", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, VERCEL_DRAIN_SIGNATURE_SECRET: TEST_SECRET };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe("Signature Verification", () => {
    it("should reject requests without x-vercel-signature header", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_LOG_PAYLOAD),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.message).toBe("Invalid or missing signature");
    });

    it("should reject requests with invalid signature", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const rawBody = JSON.stringify(VALID_LOG_PAYLOAD);
      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": "invalid_signature_here",
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.message).toBe("Invalid or missing signature");
    });

    it("should accept requests with valid HMAC-SHA1 signature", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const rawBody = JSON.stringify(VALID_LOG_PAYLOAD);
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.received).toBe(1);
      expect(body.rejected).toBe(0);
    });
  });

  describe("Single Log Payload", () => {
    it("should accept a valid single log payload", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const rawBody = JSON.stringify(VALID_LOG_PAYLOAD);
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.received).toBe(1);
      expect(body.rejected).toBe(0);
    });

    it("should handle all valid level values", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");
      const levels = ["info", "warning", "error"] as const;

      for (const level of levels) {
        vi.resetModules();

        const payload = { ...VALID_LOG_PAYLOAD, id: `log_${level}`, level };
        const rawBody = JSON.stringify(payload);
        const signature = createSignature(rawBody, TEST_SECRET);

        const request = new Request("http://localhost/api/vercel/logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-vercel-signature": signature,
          },
          body: rawBody,
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it("should handle all valid source values", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");
      const sources = ["build", "edge", "function", "lambda", "static", "external"];

      for (const source of sources) {
        vi.resetModules();

        const payload = { ...VALID_LOG_PAYLOAD, id: `log_${source}`, source };
        const rawBody = JSON.stringify(payload);
        const signature = createSignature(rawBody, TEST_SECRET);

        const request = new Request("http://localhost/api/vercel/logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-vercel-signature": signature,
          },
          body: rawBody,
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe("Batch Payload", () => {
    it("should accept an array of valid log payloads", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const batchPayload = [
        { ...VALID_LOG_PAYLOAD, id: "log_1" },
        { ...VALID_LOG_PAYLOAD, id: "log_2" },
        { ...VALID_LOG_PAYLOAD, id: "log_3" },
      ];

      const rawBody = JSON.stringify(batchPayload);
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.received).toBe(3);
      expect(body.rejected).toBe(0);
    });

    it("should partially accept batch with some invalid entries", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const batchPayload = [
        VALID_LOG_PAYLOAD,
        { ...VALID_LOG_PAYLOAD, id: "log_2", projectId: undefined }, // Missing projectId
        { ...VALID_LOG_PAYLOAD, id: "log_3" }, // Valid
      ];

      const rawBody = JSON.stringify(batchPayload);
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.received).toBe(2);
      expect(body.rejected).toBe(1);
      expect(body.validationErrors).toBeDefined();
      expect(body.validationErrors).toHaveLength(1);
    });
  });

  describe("Missing Required Field", () => {
    it("should reject payload missing id", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const invalidPayload = { ...VALID_LOG_PAYLOAD };
      delete (invalidPayload as Record<string, unknown>).id;

      const rawBody = JSON.stringify(invalidPayload);
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.message).toBe("No valid log payloads");
      expect(body.errors[0].errors).toContain(
        "id is required and must be a string"
      );
    });

    it("should reject payload missing deploymentId", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const invalidPayload = { ...VALID_LOG_PAYLOAD };
      delete (invalidPayload as Record<string, unknown>).deploymentId;

      const rawBody = JSON.stringify(invalidPayload);
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors[0].errors).toContain(
        "deploymentId is required and must be a string"
      );
    });

    it("should reject payload with invalid level", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const invalidPayload = { ...VALID_LOG_PAYLOAD, level: "debug" };

      const rawBody = JSON.stringify(invalidPayload);
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors[0].errors).toContain(
        "level must be one of: info, warning, error"
      );
    });

    it("should reject payload with invalid source", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const invalidPayload = { ...VALID_LOG_PAYLOAD, source: "invalid_source" };

      const rawBody = JSON.stringify(invalidPayload);
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.errors[0].errors[0]).toContain(
        "source must be one of:"
      );
    });
  });

  describe("Optional Message Field", () => {
    it("should accept payload without message field", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const rawBody = JSON.stringify(VALID_LOG_WITHOUT_MESSAGE);
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.received).toBe(1);
      expect(body.rejected).toBe(0);
    });

    it("should accept payload with message explicitly set to null", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const payloadWithNullMessage = {
        ...VALID_LOG_PAYLOAD,
        message: null,
      };

      const rawBody = JSON.stringify(payloadWithNullMessage);
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.received).toBe(1);
    });
  });

  describe("Invalid JSON", () => {
    it("should reject invalid JSON payload", async () => {
      const { POST } = await import("@/app/api/vercel/logs/route");

      const rawBody = "not valid json{{{";
      const signature = createSignature(rawBody, TEST_SECRET);

      const request = new Request("http://localhost/api/vercel/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-signature": signature,
        },
        body: rawBody,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.message).toBe("Invalid JSON payload");
    });
  });
});
