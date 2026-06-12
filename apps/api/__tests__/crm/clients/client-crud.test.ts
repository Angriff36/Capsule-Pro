/**
 * Client CRUD API Integration Tests
 *
 * Tests verify the client create, update, archive, and reactivate
 * command handlers with authentication, authorization, policy denial,
 * and guard failure scenarios.
 *
 * All routes use the manifest command dispatcher pattern:
 *   requireCurrentUser -> runManifestCommand({ entity, command, body, user })
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

const dispatch = (entity: string, command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

const archiveClient = dispatch("Client", "archive");
const createClient = dispatch("Client", "create");
const reactivateClient = dispatch("Client", "reactivate");
const updateClient = dispatch("Client", "update");

// Mock dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      ),
    manifestErrorResponse: (
      message: string | { error: string; diagnostics?: unknown[] },
      status: number
    ) =>
      NextResponse.json(
        typeof message === "string"
          ? { success: false, message }
          : {
              success: false,
              error: message.error,
              diagnostics: message.diagnostics ?? [],
            },
        { status }
      ),
  };
});
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class InvariantError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
  invariant: (condition: unknown, message: string) => {
    if (!condition) {
      const err = new Error(message);
      err.name = "InvariantError";
      throw err;
    }
  },
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const { requireCurrentUser } = await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000004";
const TEST_USER_ID = "user_client_test";
const _TEST_ORG_ID = "org_client_test";

const TEST_CURRENT_USER = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  role: "admin",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
};

function makeRequest(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeSuccessResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Client CRUD API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(TEST_CURRENT_USER as never);
    vi.mocked(runManifestCommand).mockResolvedValue(
      makeSuccessResponse({ result: { id: "test-id" }, events: [] })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------- CREATE
  describe("POST /api/client/create", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const authError = new Error("Unauthenticated");
      authError.name = "InvariantError";
      vi.mocked(requireCurrentUser).mockRejectedValue(authError);

      const request = makeRequest("/api/client/create", {
        name: "Test Client",
      });
      const response = await createClient(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it("should create a client through manifest runtime", async () => {
      const clientResult = { id: "client-001", name: "Acme Corp" };
      vi.mocked(runManifestCommand).mockResolvedValue(
        makeSuccessResponse({
          result: clientResult,
          events: [{ type: "ClientCreated" }],
        })
      );

      const request = makeRequest("/api/client/create", {
        name: "Acme Corp",
        email: "contact@acme.com",
        phone: "+1-555-0100",
        type: "corporate",
      });
      const response = await createClient(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual(clientResult);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Client",
          command: "create",
          body: expect.objectContaining({ name: "Acme Corp" }),
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Access denied: RolePolicy",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

      const request = makeRequest("/api/client/create", {
        name: "Denied Client",
      });
      const response = await createClient(request);

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Guard failed: Duplicate client name",
            diagnostics: [],
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

      const request = makeRequest("/api/client/create", { name: "Duplicate" });
      const response = await createClient(request);

      expect(response.status).toBe(422);
    });

    it("should return 400 on generic command failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Missing required field: name",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

      const request = makeRequest("/api/client/create", {});
      const response = await createClient(request);

      expect(response.status).toBe(400);
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime failure")
      );

      const request = makeRequest("/api/client/create", {
        name: "Crash Client",
      });
      const response = await createClient(request);

      expect(response.status).toBe(500);
    });
  });

  // -------------------------------------------------------------- UPDATE
  describe("POST /api/client/update", () => {
    it("should update a client through manifest runtime", async () => {
      const updated = { id: "client-001", name: "Updated Corp" };
      vi.mocked(runManifestCommand).mockResolvedValue(
        makeSuccessResponse({ result: updated, events: [] })
      );

      const request = makeRequest("/api/client/update", {
        id: "client-001",
        name: "Updated Corp",
        email: "new@acme.com",
      });
      const response = await updateClient(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Client",
          command: "update",
          body: expect.objectContaining({ id: "client-001" }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      const authError = new Error("Unauthenticated");
      authError.name = "InvariantError";
      vi.mocked(requireCurrentUser).mockRejectedValue(authError);

      const request = makeRequest("/api/client/update", { id: "client-001" });
      const response = await updateClient(request);

      expect(response.status).toBe(401);
    });

    it("should return 403 on policy denial for update", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Access denied: ManagerOnly",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

      const request = makeRequest("/api/client/update", { id: "client-001" });
      const response = await updateClient(request);

      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------- ARCHIVE
  describe("POST /api/client/archive", () => {
    it("should archive a client through manifest runtime", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        makeSuccessResponse({
          result: { id: "client-001", status: "archived" },
          events: [{ type: "ClientArchived" }],
        })
      );

      const request = makeRequest("/api/client/archive", { id: "client-001" });
      const response = await archiveClient(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Client",
          command: "archive",
          body: expect.objectContaining({ id: "client-001" }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      const authError = new Error("Unauthenticated");
      authError.name = "InvariantError";
      vi.mocked(requireCurrentUser).mockRejectedValue(authError);

      const request = makeRequest("/api/client/archive", { id: "client-001" });
      const response = await archiveClient(request);

      expect(response.status).toBe(401);
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(new Error("Unexpected"));

      const request = makeRequest("/api/client/archive", { id: "client-001" });
      const response = await archiveClient(request);

      expect(response.status).toBe(500);
    });
  });

  // -------------------------------------------------------------- REACTIVATE
  describe("POST /api/client/reactivate", () => {
    it("should reactivate an archived client", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        makeSuccessResponse({
          result: { id: "client-001", status: "active" },
          events: [{ type: "ClientReactivated" }],
        })
      );

      const request = makeRequest("/api/client/reactivate", {
        id: "client-001",
      });
      const response = await reactivateClient(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Client",
          command: "reactivate",
          body: expect.objectContaining({ id: "client-001" }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      const authError = new Error("Unauthenticated");
      authError.name = "InvariantError";
      vi.mocked(requireCurrentUser).mockRejectedValue(authError);

      const request = makeRequest("/api/client/reactivate", {
        id: "client-001",
      });
      const response = await reactivateClient(request);

      expect(response.status).toBe(401);
    });

    it("should return 422 on guard failure (e.g. already active)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Guard failed: Client is already active",
            diagnostics: [],
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

      const request = makeRequest("/api/client/reactivate", {
        id: "client-001",
      });
      const response = await reactivateClient(request);

      expect(response.status).toBe(422);
    });
  });
});
