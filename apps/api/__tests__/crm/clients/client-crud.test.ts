/**
 * Client CRUD API Integration Tests
 *
 * Tests verify the client create, update, archive, and reactivate
 * command handlers with authentication, authorization, policy denial,
 * and guard failure scenarios.
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
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000004";
const TEST_USER_ID = "user_client_test";
const TEST_ORG_ID = "org_client_test";

const mockRunCommand = vi.fn();

function setupRuntimeMock() {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
}

describe("Client CRUD API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    setupRuntimeMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------- CREATE
  describe("POST /api/client/create", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest("http://localhost/api/client/create", {
        method: "POST",
        body: JSON.stringify({ name: "Test Client" }),
      });
      const response = await createClient(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest("http://localhost/api/client/create", {
        method: "POST",
        body: JSON.stringify({ name: "Test Client" }),
      });
      const response = await createClient(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("should create a client through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "client-001", name: "Acme Corp" },
        emittedEvents: [{ type: "ClientCreated" }],
      });

      const request = new NextRequest("http://localhost/api/client/create", {
        method: "POST",
        body: JSON.stringify({
          name: "Acme Corp",
          email: "contact@acme.com",
          phone: "+1-555-0100",
          type: "corporate",
        }),
      });
      const response = await createClient(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "client-001", name: "Acme Corp" });
      expect(body.events).toHaveLength(1);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({ name: "Acme Corp" }),
        { entityName: "Client" }
      );
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "RolePolicy" },
      });

      const request = new NextRequest("http://localhost/api/client/create", {
        method: "POST",
        body: JSON.stringify({ name: "Denied Client" }),
      });
      const response = await createClient(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("RolePolicy");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 1,
          formatted: "Duplicate client name",
        },
      });

      const request = new NextRequest("http://localhost/api/client/create", {
        method: "POST",
        body: JSON.stringify({ name: "Duplicate" }),
      });
      const response = await createClient(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 1 failed");
    });

    it("should return 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Missing required field: name",
      });

      const request = new NextRequest("http://localhost/api/client/create", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await createClient(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Missing required field: name");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime failure"));

      const request = new NextRequest("http://localhost/api/client/create", {
        method: "POST",
        body: JSON.stringify({ name: "Crash Client" }),
      });
      const response = await createClient(request);

      expect(response.status).toBe(500);
    });
  });

  // -------------------------------------------------------------- UPDATE
  describe("POST /api/client/update", () => {
    it("should update a client through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "client-001", name: "Updated Corp" },
        emittedEvents: [],
      });

      const request = new NextRequest("http://localhost/api/client/update", {
        method: "POST",
        body: JSON.stringify({
          id: "client-001",
          name: "Updated Corp",
          email: "new@acme.com",
        }),
      });
      const response = await updateClient(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        expect.objectContaining({ id: "client-001" }),
        { entityName: "Client" }
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest("http://localhost/api/client/update", {
        method: "POST",
        body: JSON.stringify({ id: "client-001" }),
      });
      const response = await updateClient(request);

      expect(response.status).toBe(401);
    });

    it("should return 403 on policy denial for update", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagerOnly" },
      });

      const request = new NextRequest("http://localhost/api/client/update", {
        method: "POST",
        body: JSON.stringify({ id: "client-001" }),
      });
      const response = await updateClient(request);

      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------- ARCHIVE
  describe("POST /api/client/archive", () => {
    it("should archive a client through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "client-001", status: "archived" },
        emittedEvents: [{ type: "ClientArchived" }],
      });

      const request = new NextRequest("http://localhost/api/client/archive", {
        method: "POST",
        body: JSON.stringify({ id: "client-001" }),
      });
      const response = await archiveClient(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "archive",
        expect.objectContaining({ id: "client-001" }),
        { entityName: "Client" }
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest("http://localhost/api/client/archive", {
        method: "POST",
        body: JSON.stringify({ id: "client-001" }),
      });
      const response = await archiveClient(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest("http://localhost/api/client/archive", {
        method: "POST",
        body: JSON.stringify({ id: "client-001" }),
      });
      const response = await archiveClient(request);

      expect(response.status).toBe(400);
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Unexpected"));

      const request = new NextRequest("http://localhost/api/client/archive", {
        method: "POST",
        body: JSON.stringify({ id: "client-001" }),
      });
      const response = await archiveClient(request);

      expect(response.status).toBe(500);
    });
  });

  // -------------------------------------------------------------- REACTIVATE
  describe("POST /api/client/reactivate", () => {
    it("should reactivate an archived client", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "client-001", status: "active" },
        emittedEvents: [{ type: "ClientReactivated" }],
      });

      const request = new NextRequest(
        "http://localhost/api/client/reactivate",
        {
          method: "POST",
          body: JSON.stringify({ id: "client-001" }),
        }
      );
      const response = await reactivateClient(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "reactivate",
        expect.objectContaining({ id: "client-001" }),
        { entityName: "Client" }
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/client/reactivate",
        {
          method: "POST",
          body: JSON.stringify({ id: "client-001" }),
        }
      );
      const response = await reactivateClient(request);

      expect(response.status).toBe(401);
    });

    it("should return 422 on guard failure (e.g. already active)", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Client is already active",
        },
      });

      const request = new NextRequest(
        "http://localhost/api/client/reactivate",
        {
          method: "POST",
          body: JSON.stringify({ id: "client-001" }),
        }
      );
      const response = await reactivateClient(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
    });
  });
});
