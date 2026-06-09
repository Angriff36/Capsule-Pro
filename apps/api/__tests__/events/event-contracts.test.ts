/**
 * Event Contract Command Route Tests
 *
 * Tests the 8 manifest command handlers for EventContract via the dispatcher:
 *   - create, update, cancel, expire, send, sign, markViewed, softDelete
 *
 * Validates auth gating (401), command dispatch success (200),
 * policy denial (403), guard failure (422), general command failure (400),
 * and internal error handling (500).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json(
        { success: true, ...(typeof data === "object" && data !== null ? data : { data }) },
        { status }
      ),
    manifestErrorResponse: (message: string | { error: string; diagnostics?: unknown[] }, status: number) =>
      NextResponse.json(
        typeof message === "string"
          ? { success: false, message }
          : { success: false, error: message.error, diagnostics: message.diagnostics ?? [] },
        { status }
      ),
  };
});
vi.mock("@/lib/manifest/execute-command", () => ({ runManifestCommand: vi.fn() }));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class InvariantError extends Error {
    constructor(message: string) { super(message); this.name = "InvariantError"; }
  },
  invariant: (condition: unknown, message: string) => {
    if (!condition) { const err = new Error(message); err.name = "InvariantError"; throw err; }
  },
}));

import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";
const { requireCurrentUser } = await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

function createHandler(command: string) {
  return async (req: NextRequest) =>
    manifestDispatch(req, { params: Promise.resolve({ entity: "EventContract", command }) });
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user_test_contract";
const TEST_EVENT_ID = "e0000000-0000-4000-a000-000000000001";
const TEST_CLIENT_ID = "c0000000-0000-4000-a000-000000000001";
const TEST_CONTRACT_ID = "d0000000-0000-4000-a000-000000000001";

const TEST_CURRENT_USER = {
  id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin",
  email: "test@test.com", firstName: "Test", lastName: "User",
};

function createMockRequest(url: string, options: RequestInit = {}): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

function fail(status: number, message: string) {
  return new Response(JSON.stringify({ success: false, message }), {
    status, headers: { "Content-Type": "application/json" },
  });
}

function authError(msg = "Unauthenticated") {
  const err = new Error(msg);
  err.name = "InvariantError";
  return err;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EventContract Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(TEST_CURRENT_USER as never);
    vi.mocked(runManifestCommand).mockResolvedValue(ok({ result: { id: "test-id" }, events: [] }));
  });

  afterEach(() => { vi.restoreAllMocks(); });

  // ========================================================================= Auth gating
  describe("Authentication gating", () => {
    it("create returns 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(authError());
      const POST = createHandler("create");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/create", {
        method: "POST", body: JSON.stringify({ eventId: TEST_EVENT_ID }),
      }));
      expect(res.status).toBe(401);
    });

    it("update returns 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(authError());
      const POST = createHandler("update");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/update", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID }),
      }));
      expect(res.status).toBe(401);
    });

    it("sign returns 401 when unauthenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(authError());
      const POST = createHandler("sign");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/sign", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID }),
      }));
      expect(res.status).toBe(401);
    });
  });

  // ========================================================================= Successful commands
  describe("POST /api/eventcontract/create -- success", () => {
    it("creates a contract and returns 200", async () => {
      const contract = {
        id: TEST_CONTRACT_ID, tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID, clientId: TEST_CLIENT_ID,
        contractNumber: "CTR-2026-001", title: "Annual Gala Agreement",
        status: "draft",
      };
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: contract, events: [{ type: "ContractCreated" }] })
      );

      const POST = createHandler("create");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/create", {
        method: "POST",
        body: JSON.stringify({
          eventId: TEST_EVENT_ID, clientId: TEST_CLIENT_ID,
          contractNumber: "CTR-2026-001", title: "Annual Gala Agreement",
        }),
      }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_CONTRACT_ID);

      expect(runManifestCommand).toHaveBeenCalledWith(expect.objectContaining({
        entity: "EventContract", command: "create",
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
      }));
    });
  });

  describe("POST /api/eventcontract/update -- success", () => {
    it("updates a contract and returns 200", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: { id: TEST_CONTRACT_ID, title: "Updated", status: "sent" }, events: [] })
      );

      const POST = createHandler("update");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/update", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID, title: "Updated" }),
      }));

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(expect.objectContaining({
        entity: "EventContract", command: "update",
      }));
    });
  });

  describe("POST /api/eventcontract/send -- success", () => {
    it("sends a contract and returns 200", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: { id: TEST_CONTRACT_ID, status: "sent" }, events: [{ type: "ContractSent" }] })
      );

      const POST = createHandler("send");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/send", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID }),
      }));

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(expect.objectContaining({ command: "send" }));
    });
  });

  describe("POST /api/eventcontract/sign -- success", () => {
    it("signs a contract and returns 200", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: { id: TEST_CONTRACT_ID, status: "signed" }, events: [{ type: "ContractSigned" }] })
      );

      const POST = createHandler("sign");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/sign", {
        method: "POST",
        body: JSON.stringify({ id: TEST_CONTRACT_ID, signerName: "Jane Doe", signerEmail: "jane@example.com" }),
      }));

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(expect.objectContaining({ command: "sign" }));
    });
  });

  describe("POST /api/eventcontract/cancel -- success", () => {
    it("cancels a contract and returns 200", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: { id: TEST_CONTRACT_ID, status: "cancelled" }, events: [] })
      );

      const POST = createHandler("cancel");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/cancel", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID, reason: "Client request" }),
      }));

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(expect.objectContaining({ command: "cancel" }));
    });
  });

  describe("POST /api/eventcontract/expire -- success", () => {
    it("expires a contract and returns 200", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: { id: TEST_CONTRACT_ID, status: "expired" }, events: [] })
      );

      const POST = createHandler("expire");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/expire", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID }),
      }));

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(expect.objectContaining({ command: "expire" }));
    });
  });

  describe("POST /api/eventcontract/markViewed -- success", () => {
    it("marks contract as viewed and returns 200", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: { id: TEST_CONTRACT_ID, status: "viewed" }, events: [] })
      );

      const POST = createHandler("markViewed");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/mark-viewed", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID }),
      }));

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(expect.objectContaining({ command: "markViewed" }));
    });
  });

  describe("POST /api/eventcontract/softDelete -- success", () => {
    it("soft-deletes a contract and returns 200", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: { id: TEST_CONTRACT_ID, deletedAt: "2026-02-01" }, events: [] })
      );

      const POST = createHandler("softDelete");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/soft-delete", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID }),
      }));

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(expect.objectContaining({ command: "softDelete" }));
    });
  });

  // ========================================================================= Policy denial
  describe("Policy denial (403)", () => {
    it("returns 403 when policy denies access on create", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(fail(403, "Access denied: contractManagerOnly"));

      const POST = createHandler("create");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/create", {
        method: "POST", body: JSON.stringify({ eventId: TEST_EVENT_ID, clientId: TEST_CLIENT_ID }),
      }));

      expect(res.status).toBe(403);
    });

    it("returns 403 when policy denies sign access", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(fail(403, "Access denied: authorizedSignerOnly"));

      const POST = createHandler("sign");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/sign", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID }),
      }));

      expect(res.status).toBe(403);
    });
  });

  // ========================================================================= Guard failure
  describe("Guard failure (422)", () => {
    it("returns 422 when guard rejects on send", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(fail(422, "Guard failed: wrong status"));

      const POST = createHandler("send");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/send", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID }),
      }));

      expect(res.status).toBe(422);
    });

    it("returns 422 when guard rejects on cancel", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(fail(422, "Guard failed: cannot cancel signed"));

      const POST = createHandler("cancel");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/cancel", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID }),
      }));

      expect(res.status).toBe(422);
    });
  });

  // ========================================================================= Command failure
  describe("General command failure (400)", () => {
    it("returns 400 with error message", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(fail(400, "Contract not found"));

      const POST = createHandler("update");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/update", {
        method: "POST", body: JSON.stringify({ id: TEST_CONTRACT_ID, title: "New Title" }),
      }));

      expect(res.status).toBe(400);
    });
  });

  // ========================================================================= Internal error
  describe("Internal server error (500)", () => {
    it("returns 500 when runtime throws an exception", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(new Error("Database connection lost"));

      const POST = createHandler("create");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/create", {
        method: "POST", body: JSON.stringify({ eventId: TEST_EVENT_ID }),
      }));

      expect(res.status).toBe(500);
    });

    it("swallows malformed JSON body (dispatcher uses catch)", async () => {
      const POST = createHandler("create");
      const res = await POST(createMockRequest("http://localhost:3000/api/eventcontract/create", {
        method: "POST", body: "not-valid-json{{{",
      }));

      // Dispatcher uses request.json().catch(() => ({})) so invalid JSON becomes empty body
      expect(res.status).toBe(200);
    });
  });

  // ========================================================================= Tenant isolation
  describe("Tenant isolation", () => {
    it("passes user context with tenantId to runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: { id: TEST_CONTRACT_ID }, events: [] })
      );

      const POST = createHandler("create");
      await POST(createMockRequest("http://localhost:3000/api/eventcontract/create", {
        method: "POST", body: JSON.stringify({ eventId: TEST_EVENT_ID }),
      }));

      expect(runManifestCommand).toHaveBeenCalledWith(expect.objectContaining({
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
      }));
    });
  });
});
