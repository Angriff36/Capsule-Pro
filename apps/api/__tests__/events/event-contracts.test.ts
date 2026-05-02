/**
 * Event Contract Command Route Tests
 *
 * Tests the 8 generated manifest command handlers for EventContract:
 *   - create, update, cancel, expire, send, sign, markViewed, softDelete
 *
 * Validates auth gating (401), tenant resolution (400), command dispatch
 * success (200), policy denial (403), guard failure (422), general command
 * failure (400), and internal error handling (500).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — all route handlers share the same dependency surface
// ---------------------------------------------------------------------------

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// The manifest runtime is the command gateway; we mock its factory so each
// test can program the mock runCommand return value.
const mockRunCommand = vi.fn();
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(() =>
    Promise.resolve({ runCommand: mockRunCommand })
  ),
}));

// Import mocked modules after vi.mock setup
const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user_test_contract";
const TEST_ORG_ID = "org_test_contract";
const TEST_EVENT_ID = "e0000000-0000-4000-a000-000000000001";
const TEST_CLIENT_ID = "c0000000-0000-4000-a000-000000000001";
const TEST_CONTRACT_ID = "d0000000-0000-4000-a000-000000000001";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function setupAuth() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

function setupUnauthenticated() {
  vi.mocked(auth).mockResolvedValue({
    orgId: null,
    userId: null,
  } as never);
}

function setupNoTenant() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
}

/** Minimal contract shape matching the EventContract Prisma model */
function createMockContract(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TEST_TENANT_ID,
    id: TEST_CONTRACT_ID,
    eventId: TEST_EVENT_ID,
    clientId: TEST_CLIENT_ID,
    contractNumber: "CTR-2026-001",
    title: "Annual Gala Agreement",
    status: "draft",
    documentUrl: "https://example.com/contract.pdf",
    documentType: "pdf",
    notes: "Standard terms and conditions",
    signingToken: null,
    expiresAt: new Date("2026-12-31"),
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    deletedAt: null,
    signatures: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("EventContract Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Auth gating — every route must reject unauthenticated requests with 401
  // =========================================================================

  describe("Authentication gating", () => {
    it("create returns 401 when unauthenticated", async () => {
      setupUnauthenticated();
      const { POST } = await import("@/app/api/eventcontract/create/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("update returns 401 when unauthenticated", async () => {
      setupUnauthenticated();
      const { POST } = await import("@/app/api/eventcontract/update/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/update",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );
      const res = await POST(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("sign returns 401 when unauthenticated", async () => {
      setupUnauthenticated();
      const { POST } = await import("@/app/api/eventcontract/sign/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/sign",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // Tenant resolution — missing tenant must return 400
  // =========================================================================

  describe("Tenant resolution", () => {
    it("create returns 400 when tenant not found", async () => {
      setupNoTenant();
      const { POST } = await import("@/app/api/eventcontract/create/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("cancel returns 400 when tenant not found", async () => {
      setupNoTenant();
      const { POST } = await import("@/app/api/eventcontract/cancel/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/cancel",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Tenant not found");
    });
  });

  // =========================================================================
  // Successful command execution
  // =========================================================================

  describe("POST /api/eventcontract/create — success", () => {
    it("creates a contract and returns 200 with result and events", async () => {
      setupAuth();
      const contract = createMockContract();
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: contract,
        emittedEvents: [
          { type: "ContractCreated", payload: { id: TEST_CONTRACT_ID } },
        ],
      });

      const { POST } = await import("@/app/api/eventcontract/create/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/create",
        {
          method: "POST",
          body: JSON.stringify({
            eventId: TEST_EVENT_ID,
            clientId: TEST_CLIENT_ID,
            contractNumber: "CTR-2026-001",
            title: "Annual Gala Agreement",
            documentUrl: "https://example.com/contract.pdf",
            documentType: "pdf",
            notes: "Standard terms",
            expiresAt: Date.now(),
          }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_CONTRACT_ID);
      expect(body.result.status).toBe("draft");
      expect(body.events).toHaveLength(1);
      expect(body.events[0].type).toBe("ContractCreated");

      // Verify runtime was called with correct entity name and user context
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.any(Object),
        {
          entityName: "EventContract",
        }
      );
    });
  });

  describe("POST /api/eventcontract/update — success", () => {
    it("updates a contract and returns 200", async () => {
      setupAuth();
      const updated = createMockContract({
        title: "Updated Gala Agreement",
        status: "sent",
      });
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: updated,
        emittedEvents: [],
      });

      const { POST } = await import("@/app/api/eventcontract/update/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/update",
        {
          method: "POST",
          body: JSON.stringify({
            id: TEST_CONTRACT_ID,
            title: "Updated Gala Agreement",
          }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.title).toBe("Updated Gala Agreement");
      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        expect.any(Object),
        {
          entityName: "EventContract",
        }
      );
    });
  });

  describe("POST /api/eventcontract/send — success", () => {
    it("sends a contract and returns 200", async () => {
      setupAuth();
      const sent = createMockContract({ status: "sent" });
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: sent,
        emittedEvents: [
          { type: "ContractSent", payload: { id: TEST_CONTRACT_ID } },
        ],
      });

      const { POST } = await import("@/app/api/eventcontract/send/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/send",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("sent");
      expect(mockRunCommand).toHaveBeenCalledWith("send", expect.any(Object), {
        entityName: "EventContract",
      });
    });
  });

  describe("POST /api/eventcontract/sign — success", () => {
    it("signs a contract and returns 200", async () => {
      setupAuth();
      const signed = createMockContract({ status: "signed" });
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: signed,
        emittedEvents: [
          { type: "ContractSigned", payload: { id: TEST_CONTRACT_ID } },
        ],
      });

      const { POST } = await import("@/app/api/eventcontract/sign/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/sign",
        {
          method: "POST",
          body: JSON.stringify({
            id: TEST_CONTRACT_ID,
            signerName: "Jane Doe",
            signerEmail: "jane@example.com",
            signatureData: "base64signature",
          }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("signed");
      expect(mockRunCommand).toHaveBeenCalledWith("sign", expect.any(Object), {
        entityName: "EventContract",
      });
    });
  });

  describe("POST /api/eventcontract/cancel — success", () => {
    it("cancels a contract and returns 200", async () => {
      setupAuth();
      const cancelled = createMockContract({ status: "cancelled" });
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: cancelled,
        emittedEvents: [],
      });

      const { POST } = await import("@/app/api/eventcontract/cancel/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/cancel",
        {
          method: "POST",
          body: JSON.stringify({
            id: TEST_CONTRACT_ID,
            reason: "Client request",
          }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("cancelled");
      expect(mockRunCommand).toHaveBeenCalledWith(
        "cancel",
        expect.any(Object),
        {
          entityName: "EventContract",
        }
      );
    });
  });

  describe("POST /api/eventcontract/expire — success", () => {
    it("expires a contract and returns 200", async () => {
      setupAuth();
      const expired = createMockContract({ status: "expired" });
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: expired,
        emittedEvents: [],
      });

      const { POST } = await import("@/app/api/eventcontract/expire/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/expire",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("expired");
      expect(mockRunCommand).toHaveBeenCalledWith(
        "expire",
        expect.any(Object),
        {
          entityName: "EventContract",
        }
      );
    });
  });

  describe("POST /api/eventcontract/mark-viewed — success", () => {
    it("marks contract as viewed and returns 200", async () => {
      setupAuth();
      const viewed = createMockContract({ status: "viewed" });
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: viewed,
        emittedEvents: [],
      });

      const { POST } = await import(
        "@/app/api/eventcontract/mark-viewed/route"
      );
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/mark-viewed",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("viewed");
      expect(mockRunCommand).toHaveBeenCalledWith(
        "markViewed",
        expect.any(Object),
        {
          entityName: "EventContract",
        }
      );
    });
  });

  describe("POST /api/eventcontract/soft-delete — success", () => {
    it("soft-deletes a contract and returns 200", async () => {
      setupAuth();
      const deleted = createMockContract({
        deletedAt: new Date("2026-02-01"),
      });
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: deleted,
        emittedEvents: [],
      });

      const { POST } = await import(
        "@/app/api/eventcontract/soft-delete/route"
      );
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/soft-delete",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.deletedAt).not.toBeNull();
      expect(mockRunCommand).toHaveBeenCalledWith(
        "softDelete",
        expect.any(Object),
        {
          entityName: "EventContract",
        }
      );
    });
  });

  // =========================================================================
  // Policy denial — 403
  // =========================================================================

  describe("Policy denial (403)", () => {
    it("returns 403 when policy denies access on create", async () => {
      setupAuth();
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        policyDenial: {
          policyName: "contractManagerOnly",
          formatted: "User does not have contract manager role",
        },
      });

      const { POST } = await import("@/app/api/eventcontract/create/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/create",
        {
          method: "POST",
          body: JSON.stringify({
            eventId: TEST_EVENT_ID,
            clientId: TEST_CLIENT_ID,
          }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("contractManagerOnly");
    });

    it("returns 403 when policy denies sign access", async () => {
      setupAuth();
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        policyDenial: {
          policyName: "authorizedSignerOnly",
          formatted: "Not an authorized signer",
        },
      });

      const { POST } = await import("@/app/api/eventcontract/sign/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/sign",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("authorizedSignerOnly");
    });
  });

  // =========================================================================
  // Guard failure — 422
  // =========================================================================

  describe("Guard failure (422)", () => {
    it("returns 422 when guard rejects on send (wrong status)", async () => {
      setupAuth();
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "status must be 'draft' to send, got 'signed'",
        },
      });

      const { POST } = await import("@/app/api/eventcontract/send/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/send",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(422);
      expect(body.success).toBe(false);
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("status must be 'draft' to send");
    });

    it("returns 422 when guard rejects on cancel", async () => {
      setupAuth();
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        guardFailure: {
          index: 1,
          formatted: "cannot cancel a signed contract",
        },
      });

      const { POST } = await import("@/app/api/eventcontract/cancel/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/cancel",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(422);
      expect(body.success).toBe(false);
      expect(body.message).toContain("Guard 1 failed");
    });
  });

  // =========================================================================
  // General command failure — 400
  // =========================================================================

  describe("General command failure (400)", () => {
    it("returns 400 with error message when command fails without policy/guard", async () => {
      setupAuth();
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Contract not found",
      });

      const { POST } = await import("@/app/api/eventcontract/update/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/update",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID, title: "New Title" }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Contract not found");
    });

    it("returns 400 with default message when error is null", async () => {
      setupAuth();
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: null,
      });

      const { POST } = await import("@/app/api/eventcontract/expire/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/expire",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Command failed");
    });
  });

  // =========================================================================
  // Internal server error — 500
  // =========================================================================

  describe("Internal server error (500)", () => {
    it("returns 500 when runtime throws an exception", async () => {
      setupAuth();
      mockRunCommand.mockRejectedValueOnce(
        new Error("Database connection lost")
      );

      const { POST } = await import("@/app/api/eventcontract/create/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });

    it("returns 500 when request.json() throws (invalid body)", async () => {
      setupAuth();

      const { POST } = await import("@/app/api/eventcontract/create/route");
      // Pass non-JSON body to trigger parse error
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/create",
        {
          method: "POST",
          body: "not-valid-json{{{",
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // =========================================================================
  // Runtime context — verify tenant and user are passed correctly
  // =========================================================================

  describe("Runtime context", () => {
    it("passes user id and tenant id to createManifestRuntime", async () => {
      setupAuth();
      const { createManifestRuntime } = await import("@/lib/manifest-runtime");
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: createMockContract(),
        emittedEvents: [],
      });

      const { POST } = await import("@/app/api/eventcontract/create/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      await POST(req);

      expect(vi.mocked(createManifestRuntime)).toHaveBeenCalledWith({
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
      });
    });
  });

  // =========================================================================
  // Response shape validation
  // =========================================================================

  describe("Response shape", () => {
    it("success response includes success, result, and events", async () => {
      setupAuth();
      const contract = createMockContract();
      mockRunCommand.mockResolvedValueOnce({
        success: true,
        result: contract,
        emittedEvents: [{ type: "ContractCreated" }],
      });

      const { POST } = await import("@/app/api/eventcontract/create/route");
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.result).toBeDefined();
      expect(body.events).toBeDefined();
      expect(Array.isArray(body.events)).toBe(true);
    });

    it("error response contains only success and message keys", async () => {
      setupAuth();
      mockRunCommand.mockResolvedValueOnce({
        success: false,
        error: "Something went wrong",
      });

      const { POST } = await import(
        "@/app/api/eventcontract/mark-viewed/route"
      );
      const req = createMockRequest(
        "http://localhost:3000/api/eventcontract/mark-viewed",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_CONTRACT_ID }),
        }
      );

      const res = await POST(req);
      const body = await res.json();

      const keys = Object.keys(body);
      expect(keys).toContain("success");
      expect(keys).toContain("message");
      expect(keys.length).toBe(2);
    });
  });
});
