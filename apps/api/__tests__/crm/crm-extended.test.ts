/**
 * CRM Extended API Integration Tests
 * Tests: leads, client contacts, client interactions, client preferences
 *
 * All routes use the manifest command dispatcher pattern:
 *   requireCurrentUser -> runManifestCommand({ entity, command, body, user })
 *
 * Each route handler is tested for:
 *   - 401 for unauthenticated requests (InvariantError from requireCurrentUser)
 *   - 200 successful response with proper data shape
 *   - 403 policy denial
 *   - 422 guard failure
 *   - 400 generic command failure
 *   - 500 unexpected error
 *   - Tenant isolation (tenantId passed to runManifestCommand user context)
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

const dispatch = (entity: string, command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

const contactCreate = dispatch("ClientContact", "create");
const contactRemove = dispatch("ClientContact", "remove");
const contactSetPrimary = dispatch("ClientContact", "setPrimary");
const contactUpdate = dispatch("ClientContact", "update");
const interactionComplete = dispatch("ClientInteraction", "complete");
const interactionCreate = dispatch("ClientInteraction", "create");
const interactionUpdate = dispatch("ClientInteraction", "update");
const preferenceCreate = dispatch("ClientPreference", "create");
const preferenceRemove = dispatch("ClientPreference", "remove");
const preferenceUpdate = dispatch("ClientPreference", "update");
const leadArchive = dispatch("Lead", "archive");
const leadConvertToClient = dispatch("Lead", "convertToClient");
const leadCreate = dispatch("Lead", "create");
const leadDisqualify = dispatch("Lead", "disqualify");
const leadUpdate = dispatch("Lead", "update");

// Mock dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => ({
  invariant: (condition: unknown, message: string) => {
    if (!condition) {
      const err = new Error(message);
      err.name = "InvariantError";
      throw err;
    }
  },
  InvariantError: class InvariantError extends Error {},
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
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
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({
  logManifestIssue: vi.fn(),
}));

const { requireCurrentUser } = await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000020";
const TEST_USER_ID = "user_crm_extended";

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

describe("CRM Extended API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(TEST_CURRENT_USER as never);
    vi.mocked(runManifestCommand).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: { id: "test-id" },
          events: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ================================================================
  // LEADS
  // ================================================================
  describe("Lead Routes", () => {
    // ----------------------------------------------------- CREATE
    describe("POST /api/lead/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/lead/create", {
          name: "Test Lead",
          email: "lead@test.com",
        });
        const response = await leadCreate(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthenticated");
      });

      it("should return 401 when user not found", async () => {
        const authError = new Error("User not found");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/lead/create", {
          name: "Test Lead",
        });
        const response = await leadCreate(request);

        expect(response.status).toBe(401);
      });

      it("should create a lead through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "lead-001", name: "Acme Lead", status: "new" },
              events: [{ type: "LeadCreated" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/create", {
          name: "Acme Lead",
          email: "acme@lead.com",
          phone: "+1-555-0200",
          source: "website",
        });
        const response = await leadCreate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual({
          id: "lead-001",
          name: "Acme Lead",
          status: "new",
        });
        expect(body.events).toHaveLength(1);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "Lead",
            command: "create",
            body: expect.objectContaining({
              name: "Acme Lead",
              email: "acme@lead.com",
            }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should pass tenantId to runtime context for tenant isolation", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "lead-002" },
              events: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/create", {
          name: "Tenant Check",
        });
        await leadCreate(request);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Access denied by policy: SalesTeamOnly",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/create", {
          name: "Denied Lead",
        });
        const response = await leadCreate(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("SalesTeamOnly");
      });

      it("should return 422 on guard failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Guard 1 failed: Duplicate lead email",
            }),
            { status: 422, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/create", { name: "Dup" });
        const response = await leadCreate(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Guard 1 failed");
        expect(body.message).toContain("Duplicate lead email");
      });

      it("should return 400 on generic command failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Missing required field: name",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/create", {});
        const response = await leadCreate(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Missing required field: name");
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Runtime failure")
        );

        const request = makeRequest("/api/lead/create", { name: "Crash" });
        const response = await leadCreate(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- UPDATE
    describe("POST /api/lead/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/lead/update", { id: "lead-001" });
        const response = await leadUpdate(request);

        expect(response.status).toBe(401);
      });

      it("should update a lead through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "lead-001", name: "Updated Lead" },
              events: [{ type: "LeadUpdated" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/update", {
          id: "lead-001",
          name: "Updated Lead",
          status: "qualified",
        });
        const response = await leadUpdate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual({ id: "lead-001", name: "Updated Lead" });

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "Lead",
            command: "update",
            body: expect.objectContaining({
              id: "lead-001",
              name: "Updated Lead",
            }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(new Error("DB down"));

        const request = makeRequest("/api/lead/update", { id: "lead-001" });
        const response = await leadUpdate(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- ARCHIVE
    describe("POST /api/lead/archive", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/lead/archive", { id: "lead-001" });
        const response = await leadArchive(request);

        expect(response.status).toBe(401);
      });

      it("should archive a lead through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "lead-001", status: "archived" },
              events: [{ type: "LeadArchived" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/archive", { id: "lead-001" });
        const response = await leadArchive(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "Lead",
            command: "archive",
            body: expect.objectContaining({ id: "lead-001" }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Access denied by policy: ManagerOnly",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/archive", { id: "lead-001" });
        const response = await leadArchive(request);

        expect(response.status).toBe(403);
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Unexpected")
        );

        const request = makeRequest("/api/lead/archive", { id: "lead-001" });
        const response = await leadArchive(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- DISQUALIFY
    describe("POST /api/lead/disqualify", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/lead/disqualify", { id: "lead-003" });
        const response = await leadDisqualify(request);

        expect(response.status).toBe(401);
      });

      it("should disqualify a lead through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "lead-003", status: "disqualified" },
              events: [{ type: "LeadDisqualified" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/disqualify", {
          id: "lead-003",
          reason: "No budget",
        });
        const response = await leadDisqualify(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.status).toBe("disqualified");

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "Lead",
            command: "disqualify",
            body: expect.objectContaining({
              id: "lead-003",
              reason: "No budget",
            }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 422 on guard failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Guard 0 failed: Lead is already disqualified",
            }),
            { status: 422, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/disqualify", { id: "lead-003" });
        const response = await leadDisqualify(request);

        expect(response.status).toBe(422);
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(new Error("Crash"));

        const request = makeRequest("/api/lead/disqualify", { id: "lead-003" });
        const response = await leadDisqualify(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- CONVERT TO CLIENT
    describe("POST /api/lead/convert-to-client", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        const response = await leadConvertToClient(request);

        expect(response.status).toBe(401);
      });

      it("should convert a lead to client through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                leadId: "lead-004",
                clientId: "client-from-lead-004",
                status: "converted",
              },
              events: [
                { type: "LeadConvertedToClient" },
                { type: "ClientCreated" },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        const response = await leadConvertToClient(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.clientId).toBe("client-from-lead-004");
        expect(body.events).toHaveLength(2);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "Lead",
            command: "convertToClient",
            body: expect.objectContaining({ id: "lead-004" }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should pass tenantId to runtime for tenant isolation", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { leadId: "lead-004", clientId: "client-004" },
              events: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        await leadConvertToClient(request);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Access denied by policy: ConversionPolicy",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        const response = await leadConvertToClient(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("ConversionPolicy");
      });

      it("should return 400 on generic command failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Lead already converted",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        const response = await leadConvertToClient(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Lead already converted");
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Runtime failure")
        );

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        const response = await leadConvertToClient(request);

        expect(response.status).toBe(500);
      });
    });
  });

  // ================================================================
  // CLIENT CONTACTS
  // ================================================================
  describe("ClientContact Routes", () => {
    // ----------------------------------------------------- CREATE
    describe("POST /api/clientcontact/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/clientcontact/create", {
          clientId: "client-001",
          name: "John Doe",
          email: "john@test.com",
        });
        const response = await contactCreate(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthenticated");
      });

      it("should create a client contact through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "contact-001",
                clientId: "client-001",
                name: "Jane Smith",
                email: "jane@acme.com",
                isPrimary: false,
              },
              events: [{ type: "ClientContactCreated" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientcontact/create", {
          clientId: "client-001",
          name: "Jane Smith",
          email: "jane@acme.com",
          phone: "+1-555-0301",
          role: "Procurement Manager",
        });
        const response = await contactCreate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.name).toBe("Jane Smith");
        expect(body.result.clientId).toBe("client-001");

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ClientContact",
            command: "create",
            body: expect.objectContaining({
              clientId: "client-001",
              name: "Jane Smith",
            }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should pass tenantId to runtime for tenant isolation", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "contact-002" },
              events: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientcontact/create", {
          clientId: "client-001",
          name: "Tenant Isolation Check",
        });
        await contactCreate(request);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Access denied by policy: ContactLimit",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientcontact/create", {
          clientId: "client-001",
          name: "Excess Contact",
        });
        const response = await contactCreate(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("ContactLimit");
      });

      it("should return 422 on guard failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Guard 0 failed: Client does not exist",
            }),
            { status: 422, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientcontact/create", {
          clientId: "nonexistent",
          name: "Ghost Contact",
        });
        const response = await contactCreate(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Guard 0 failed");
      });

      it("should return 400 on generic command failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Missing required field: clientId",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientcontact/create", {
          name: "No Client",
        });
        const response = await contactCreate(request);

        expect(response.status).toBe(400);
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("DB failure")
        );

        const request = makeRequest("/api/clientcontact/create", {
          clientId: "client-001",
          name: "Crash",
        });
        const response = await contactCreate(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- UPDATE
    describe("POST /api/clientcontact/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/clientcontact/update", {
          id: "contact-001",
        });
        const response = await contactUpdate(request);

        expect(response.status).toBe(401);
      });

      it("should update a client contact through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "contact-001",
                name: "Updated Name",
                email: "new@test.com",
              },
              events: [{ type: "ClientContactUpdated" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientcontact/update", {
          id: "contact-001",
          name: "Updated Name",
          email: "new@test.com",
        });
        const response = await contactUpdate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ClientContact",
            command: "update",
            body: expect.objectContaining({
              id: "contact-001",
              name: "Updated Name",
            }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Unexpected")
        );

        const request = makeRequest("/api/clientcontact/update", {
          id: "contact-001",
        });
        const response = await contactUpdate(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- SET PRIMARY
    describe("POST /api/clientcontact/set-primary", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/clientcontact/set-primary", {
          id: "contact-001",
        });
        const response = await contactSetPrimary(request);

        expect(response.status).toBe(401);
      });

      it("should set a contact as primary through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "contact-001", isPrimary: true },
              events: [{ type: "ClientContactSetPrimary" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientcontact/set-primary", {
          id: "contact-001",
        });
        const response = await contactSetPrimary(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.isPrimary).toBe(true);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ClientContact",
            command: "setPrimary",
            body: expect.objectContaining({ id: "contact-001" }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Access denied by policy: PrimaryContactPolicy",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientcontact/set-primary", {
          id: "contact-001",
        });
        const response = await contactSetPrimary(request);

        expect(response.status).toBe(403);
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Unexpected")
        );

        const request = makeRequest("/api/clientcontact/set-primary", {
          id: "contact-001",
        });
        const response = await contactSetPrimary(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- REMOVE
    describe("POST /api/clientcontact/remove", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/clientcontact/remove", {
          id: "contact-001",
        });
        const response = await contactRemove(request);

        expect(response.status).toBe(401);
      });

      it("should remove a client contact through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "contact-001", removed: true },
              events: [{ type: "ClientContactRemoved" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientcontact/remove", {
          id: "contact-001",
        });
        const response = await contactRemove(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ClientContact",
            command: "remove",
            body: expect.objectContaining({ id: "contact-001" }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 422 on guard failure (e.g. cannot remove primary)", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Guard 0 failed: Cannot remove primary contact",
            }),
            { status: 422, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientcontact/remove", {
          id: "contact-001",
        });
        const response = await contactRemove(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Cannot remove primary contact");
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Unexpected")
        );

        const request = makeRequest("/api/clientcontact/remove", {
          id: "contact-001",
        });
        const response = await contactRemove(request);

        expect(response.status).toBe(500);
      });
    });
  });

  // ================================================================
  // CLIENT INTERACTIONS
  // ================================================================
  describe("ClientInteraction Routes", () => {
    // ----------------------------------------------------- CREATE
    describe("POST /api/clientinteraction/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/clientinteraction/create", {
          clientId: "client-001",
          type: "call",
          notes: "Discussed pricing",
        });
        const response = await interactionCreate(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthenticated");
      });

      it("should create a client interaction through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "interaction-001",
                clientId: "client-001",
                type: "email",
                notes: "Follow-up on proposal",
                status: "scheduled",
              },
              events: [{ type: "ClientInteractionCreated" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientinteraction/create", {
          clientId: "client-001",
          type: "email",
          notes: "Follow-up on proposal",
          scheduledAt: "2026-05-01T10:00:00Z",
        });
        const response = await interactionCreate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.type).toBe("email");
        expect(body.result.clientId).toBe("client-001");

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ClientInteraction",
            command: "create",
            body: expect.objectContaining({
              clientId: "client-001",
              type: "email",
            }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should pass tenantId to runtime for tenant isolation", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "interaction-002" },
              events: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientinteraction/create", {
          clientId: "client-001",
          type: "call",
        });
        await interactionCreate(request);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Access denied by policy: InteractionAccess",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientinteraction/create", {
          clientId: "client-001",
          type: "call",
        });
        const response = await interactionCreate(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("InteractionAccess");
      });

      it("should return 422 on guard failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Guard 0 failed: Invalid interaction type",
            }),
            { status: 422, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientinteraction/create", {
          clientId: "client-001",
          type: "invalid_type",
        });
        const response = await interactionCreate(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Invalid interaction type");
      });

      it("should return 400 on generic command failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Missing required field: clientId",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientinteraction/create", {
          type: "call",
        });
        const response = await interactionCreate(request);

        expect(response.status).toBe(400);
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Runtime failure")
        );

        const request = makeRequest("/api/clientinteraction/create", {
          clientId: "client-001",
          type: "call",
        });
        const response = await interactionCreate(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- UPDATE
    describe("POST /api/clientinteraction/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/clientinteraction/update", {
          id: "interaction-001",
        });
        const response = await interactionUpdate(request);

        expect(response.status).toBe(401);
      });

      it("should update a client interaction through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "interaction-001",
                notes: "Updated notes",
              },
              events: [{ type: "ClientInteractionUpdated" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientinteraction/update", {
          id: "interaction-001",
          notes: "Updated notes",
        });
        const response = await interactionUpdate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ClientInteraction",
            command: "update",
            body: expect.objectContaining({
              id: "interaction-001",
              notes: "Updated notes",
            }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Unexpected")
        );

        const request = makeRequest("/api/clientinteraction/update", {
          id: "interaction-001",
        });
        const response = await interactionUpdate(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- COMPLETE
    describe("POST /api/clientinteraction/complete", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "interaction-001",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(401);
      });

      it("should complete a client interaction through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "interaction-001",
                status: "completed",
                completedAt: "2026-04-29T15:30:00Z",
              },
              events: [{ type: "ClientInteractionCompleted" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "interaction-001",
          outcome: "positive",
          notes: "Client agreed to terms",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.status).toBe("completed");

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ClientInteraction",
            command: "complete",
            body: expect.objectContaining({
              id: "interaction-001",
              outcome: "positive",
            }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Access denied by policy: CompletionPolicy",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "interaction-001",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(403);
      });

      it("should return 422 on guard failure (e.g. already completed)", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Guard 0 failed: Interaction already completed",
            }),
            { status: 422, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "interaction-001",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("already completed");
      });

      it("should return 400 on generic command failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Interaction not found",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "nonexistent",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(400);
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Unexpected")
        );

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "interaction-001",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(500);
      });
    });
  });

  // ================================================================
  // CLIENT PREFERENCES
  // ================================================================
  describe("ClientPreference Routes", () => {
    // ----------------------------------------------------- CREATE
    describe("POST /api/clientpreference/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/clientpreference/create", {
          clientId: "client-001",
          category: "dietary",
          value: "vegetarian",
        });
        const response = await preferenceCreate(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthenticated");
      });

      it("should create a client preference through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "pref-001",
                clientId: "client-001",
                category: "dietary",
                value: "vegetarian",
              },
              events: [{ type: "ClientPreferenceCreated" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientpreference/create", {
          clientId: "client-001",
          category: "dietary",
          value: "vegetarian",
        });
        const response = await preferenceCreate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.category).toBe("dietary");
        expect(body.result.value).toBe("vegetarian");

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ClientPreference",
            command: "create",
            body: expect.objectContaining({
              clientId: "client-001",
              category: "dietary",
              value: "vegetarian",
            }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should pass tenantId to runtime for tenant isolation", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "pref-002" },
              events: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientpreference/create", {
          clientId: "client-001",
          category: "communication",
          value: "email",
        });
        await preferenceCreate(request);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Access denied by policy: PreferencePolicy",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientpreference/create", {
          clientId: "client-001",
          category: "dietary",
          value: "vegan",
        });
        const response = await preferenceCreate(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("PreferencePolicy");
      });

      it("should return 422 on guard failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Guard 0 failed: Duplicate preference for this category",
            }),
            { status: 422, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientpreference/create", {
          clientId: "client-001",
          category: "dietary",
          value: "duplicate",
        });
        const response = await preferenceCreate(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Duplicate preference");
      });

      it("should return 400 on generic command failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Missing required field: clientId",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientpreference/create", {
          category: "dietary",
        });
        const response = await preferenceCreate(request);

        expect(response.status).toBe(400);
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Runtime failure")
        );

        const request = makeRequest("/api/clientpreference/create", {
          clientId: "client-001",
          category: "dietary",
        });
        const response = await preferenceCreate(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- UPDATE
    describe("POST /api/clientpreference/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/clientpreference/update", {
          id: "pref-001",
        });
        const response = await preferenceUpdate(request);

        expect(response.status).toBe(401);
      });

      it("should update a client preference through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "pref-001", value: "vegan" },
              events: [{ type: "ClientPreferenceUpdated" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientpreference/update", {
          id: "pref-001",
          value: "vegan",
        });
        const response = await preferenceUpdate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.value).toBe("vegan");

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ClientPreference",
            command: "update",
            body: expect.objectContaining({ id: "pref-001", value: "vegan" }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 403 on policy denial", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Access denied by policy: PreferenceEditPolicy",
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientpreference/update", {
          id: "pref-001",
        });
        const response = await preferenceUpdate(request);

        expect(response.status).toBe(403);
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Unexpected")
        );

        const request = makeRequest("/api/clientpreference/update", {
          id: "pref-001",
        });
        const response = await preferenceUpdate(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- REMOVE
    describe("POST /api/clientpreference/remove", () => {
      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError);

        const request = makeRequest("/api/clientpreference/remove", {
          id: "pref-001",
        });
        const response = await preferenceRemove(request);

        expect(response.status).toBe(401);
      });

      it("should remove a client preference through manifest runtime", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "pref-001", removed: true },
              events: [{ type: "ClientPreferenceRemoved" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientpreference/remove", {
          id: "pref-001",
        });
        const response = await preferenceRemove(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ClientPreference",
            command: "remove",
            body: expect.objectContaining({ id: "pref-001" }),
            user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
          })
        );
      });

      it("should return 400 on generic command failure", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              message: "Preference not found",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        );

        const request = makeRequest("/api/clientpreference/remove", {
          id: "nonexistent",
        });
        const response = await preferenceRemove(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Preference not found");
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Unexpected")
        );

        const request = makeRequest("/api/clientpreference/remove", {
          id: "pref-001",
        });
        const response = await preferenceRemove(request);

        expect(response.status).toBe(500);
      });
    });
  });
});
