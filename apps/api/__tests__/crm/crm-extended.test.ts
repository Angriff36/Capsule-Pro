/**
 * CRM Extended API Integration Tests
 * Tests: leads, client contacts, client interactions, client preferences
 *
 * All routes use the generated manifest command handler pattern:
 *   auth -> getTenantIdForOrg -> createManifestRuntime -> runCommand
 *
 * Each route handler is tested for:
 *   - 401 for unauthenticated requests
 *   - 400 when tenant not found
 *   - 200 successful response with proper data shape
 *   - 403 policy denial
 *   - 422 guard failure
 *   - 400 generic command failure
 *   - 500 unexpected error
 *   - Tenant isolation (tenantId passed to runtime context)
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as contactCreate } from "@/app/api/clientcontact/create/route";
import { POST as contactRemove } from "@/app/api/clientcontact/remove/route";
import { POST as contactSetPrimary } from "@/app/api/clientcontact/set-primary/route";
import { POST as contactUpdate } from "@/app/api/clientcontact/update/route";
import { POST as interactionComplete } from "@/app/api/clientinteraction/complete/route";
import { POST as interactionCreate } from "@/app/api/clientinteraction/create/route";
import { POST as interactionUpdate } from "@/app/api/clientinteraction/update/route";
import { POST as preferenceCreate } from "@/app/api/clientpreference/create/route";
import { POST as preferenceRemove } from "@/app/api/clientpreference/remove/route";
import { POST as preferenceUpdate } from "@/app/api/clientpreference/update/route";
import { POST as leadArchive } from "@/app/api/lead/archive/route";
import { POST as leadConvertToClient } from "@/app/api/lead/convert-to-client/route";
import { POST as leadCreate } from "@/app/api/lead/create/route";
import { POST as leadDisqualify } from "@/app/api/lead/disqualify/route";
import { POST as leadUpdate } from "@/app/api/lead/update/route";

// Mock dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000020";
const TEST_USER_ID = "user_crm_extended";
const TEST_ORG_ID = "org_crm_extended";

const mockRunCommand = vi.fn();

function setupRuntimeMock() {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
}

function makeRequest(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeAuthenticatedRequest(path: string, body: unknown) {
  return { request: makeRequest(path, body) };
}

describe("CRM Extended API", () => {
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

  // ================================================================
  // LEADS
  // ================================================================
  describe("Lead Routes", () => {
    // ----------------------------------------------------- CREATE
    describe("POST /api/lead/create", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/lead/create", {
          name: "Test Lead",
          email: "lead@test.com",
        });
        const response = await leadCreate(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/lead/create", {
          name: "Test Lead",
        });
        const response = await leadCreate(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should create a lead through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "lead-001", name: "Acme Lead", status: "new" },
          emittedEvents: [{ type: "LeadCreated" }],
        });

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

        expect(mockRunCommand).toHaveBeenCalledWith(
          "create",
          expect.objectContaining({
            name: "Acme Lead",
            email: "acme@lead.com",
          }),
          { entityName: "Lead" }
        );
      });

      it("should pass tenantId to runtime context", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "lead-002" },
          emittedEvents: [],
        });

        const request = makeRequest("/api/lead/create", {
          name: "Tenant Check",
        });
        await leadCreate(request);

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          policyDenial: { policyName: "SalesTeamOnly" },
        });

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
        mockRunCommand.mockResolvedValue({
          success: false,
          guardFailure: {
            index: 1,
            formatted: "Duplicate lead email",
          },
        });

        const request = makeRequest("/api/lead/create", { name: "Dup" });
        const response = await leadCreate(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Guard 1 failed");
        expect(body.message).toContain("Duplicate lead email");
      });

      it("should return 400 on generic command failure", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          error: "Missing required field: name",
        });

        const request = makeRequest("/api/lead/create", {});
        const response = await leadCreate(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Missing required field: name");
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Runtime failure"));

        const request = makeRequest("/api/lead/create", { name: "Crash" });
        const response = await leadCreate(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- UPDATE
    describe("POST /api/lead/update", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/lead/update", { id: "lead-001" });
        const response = await leadUpdate(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/lead/update", { id: "lead-001" });
        const response = await leadUpdate(request);

        expect(response.status).toBe(400);
      });

      it("should update a lead through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "lead-001", name: "Updated Lead" },
          emittedEvents: [{ type: "LeadUpdated" }],
        });

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

        expect(mockRunCommand).toHaveBeenCalledWith(
          "update",
          expect.objectContaining({ id: "lead-001", name: "Updated Lead" }),
          { entityName: "Lead" }
        );
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("DB down"));

        const request = makeRequest("/api/lead/update", { id: "lead-001" });
        const response = await leadUpdate(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- ARCHIVE
    describe("POST /api/lead/archive", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/lead/archive", { id: "lead-001" });
        const response = await leadArchive(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/lead/archive", { id: "lead-001" });
        const response = await leadArchive(request);

        expect(response.status).toBe(400);
      });

      it("should archive a lead through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "lead-001", status: "archived" },
          emittedEvents: [{ type: "LeadArchived" }],
        });

        const request = makeRequest("/api/lead/archive", { id: "lead-001" });
        const response = await leadArchive(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(mockRunCommand).toHaveBeenCalledWith(
          "archive",
          expect.objectContaining({ id: "lead-001" }),
          { entityName: "Lead" }
        );
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          policyDenial: { policyName: "ManagerOnly" },
        });

        const request = makeRequest("/api/lead/archive", { id: "lead-001" });
        const response = await leadArchive(request);

        expect(response.status).toBe(403);
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Unexpected"));

        const request = makeRequest("/api/lead/archive", { id: "lead-001" });
        const response = await leadArchive(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- DISQUALIFY
    describe("POST /api/lead/disqualify", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/lead/disqualify", { id: "lead-003" });
        const response = await leadDisqualify(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/lead/disqualify", { id: "lead-003" });
        const response = await leadDisqualify(request);

        expect(response.status).toBe(400);
      });

      it("should disqualify a lead through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "lead-003", status: "disqualified" },
          emittedEvents: [{ type: "LeadDisqualified" }],
        });

        const request = makeRequest("/api/lead/disqualify", {
          id: "lead-003",
          reason: "No budget",
        });
        const response = await leadDisqualify(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.status).toBe("disqualified");

        expect(mockRunCommand).toHaveBeenCalledWith(
          "disqualify",
          expect.objectContaining({ id: "lead-003", reason: "No budget" }),
          { entityName: "Lead" }
        );
      });

      it("should return 422 on guard failure", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          guardFailure: {
            index: 0,
            formatted: "Lead is already disqualified",
          },
        });

        const request = makeRequest("/api/lead/disqualify", { id: "lead-003" });
        const response = await leadDisqualify(request);

        expect(response.status).toBe(422);
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Crash"));

        const request = makeRequest("/api/lead/disqualify", { id: "lead-003" });
        const response = await leadDisqualify(request);

        expect(response.status).toBe(500);
      });
    });

    // ----------------------------------------------------- CONVERT TO CLIENT
    describe("POST /api/lead/convert-to-client", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        const response = await leadConvertToClient(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        const response = await leadConvertToClient(request);

        expect(response.status).toBe(400);
      });

      it("should convert a lead to client through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: {
            leadId: "lead-004",
            clientId: "client-from-lead-004",
            status: "converted",
          },
          emittedEvents: [
            { type: "LeadConvertedToClient" },
            { type: "ClientCreated" },
          ],
        });

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        const response = await leadConvertToClient(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.clientId).toBe("client-from-lead-004");
        expect(body.events).toHaveLength(2);

        expect(mockRunCommand).toHaveBeenCalledWith(
          "convertToClient",
          expect.objectContaining({ id: "lead-004" }),
          { entityName: "Lead" }
        );
      });

      it("should pass tenantId to runtime for tenant isolation", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { leadId: "lead-004", clientId: "client-004" },
          emittedEvents: [],
        });

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        await leadConvertToClient(request);

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          policyDenial: { policyName: "ConversionPolicy" },
        });

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        const response = await leadConvertToClient(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("ConversionPolicy");
      });

      it("should return 400 on generic command failure", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          error: "Lead already converted",
        });

        const request = makeRequest("/api/lead/convert-to-client", {
          id: "lead-004",
        });
        const response = await leadConvertToClient(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Lead already converted");
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Runtime failure"));

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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/clientcontact/create", {
          clientId: "client-001",
          name: "John Doe",
          email: "john@test.com",
        });
        const response = await contactCreate(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/clientcontact/create", {
          clientId: "client-001",
          name: "John Doe",
        });
        const response = await contactCreate(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should create a client contact through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: {
            id: "contact-001",
            clientId: "client-001",
            name: "Jane Smith",
            email: "jane@acme.com",
            isPrimary: false,
          },
          emittedEvents: [{ type: "ClientContactCreated" }],
        });

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

        expect(mockRunCommand).toHaveBeenCalledWith(
          "create",
          expect.objectContaining({
            clientId: "client-001",
            name: "Jane Smith",
          }),
          { entityName: "ClientContact" }
        );
      });

      it("should pass tenantId to runtime for tenant isolation", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "contact-002" },
          emittedEvents: [],
        });

        const request = makeRequest("/api/clientcontact/create", {
          clientId: "client-001",
          name: "Tenant Isolation Check",
        });
        await contactCreate(request);

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          policyDenial: { policyName: "ContactLimit" },
        });

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
        mockRunCommand.mockResolvedValue({
          success: false,
          guardFailure: {
            index: 0,
            formatted: "Client does not exist",
          },
        });

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
        mockRunCommand.mockResolvedValue({
          success: false,
          error: "Missing required field: clientId",
        });

        const request = makeRequest("/api/clientcontact/create", {
          name: "No Client",
        });
        const response = await contactCreate(request);

        expect(response.status).toBe(400);
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("DB failure"));

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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/clientcontact/update", {
          id: "contact-001",
        });
        const response = await contactUpdate(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/clientcontact/update", {
          id: "contact-001",
        });
        const response = await contactUpdate(request);

        expect(response.status).toBe(400);
      });

      it("should update a client contact through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: {
            id: "contact-001",
            name: "Updated Name",
            email: "new@test.com",
          },
          emittedEvents: [{ type: "ClientContactUpdated" }],
        });

        const request = makeRequest("/api/clientcontact/update", {
          id: "contact-001",
          name: "Updated Name",
          email: "new@test.com",
        });
        const response = await contactUpdate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(mockRunCommand).toHaveBeenCalledWith(
          "update",
          expect.objectContaining({ id: "contact-001", name: "Updated Name" }),
          { entityName: "ClientContact" }
        );
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Unexpected"));

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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/clientcontact/set-primary", {
          id: "contact-001",
        });
        const response = await contactSetPrimary(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/clientcontact/set-primary", {
          id: "contact-001",
        });
        const response = await contactSetPrimary(request);

        expect(response.status).toBe(400);
      });

      it("should set a contact as primary through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "contact-001", isPrimary: true },
          emittedEvents: [{ type: "ClientContactSetPrimary" }],
        });

        const request = makeRequest("/api/clientcontact/set-primary", {
          id: "contact-001",
        });
        const response = await contactSetPrimary(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.isPrimary).toBe(true);

        expect(mockRunCommand).toHaveBeenCalledWith(
          "setPrimary",
          expect.objectContaining({ id: "contact-001" }),
          { entityName: "ClientContact" }
        );
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          policyDenial: { policyName: "PrimaryContactPolicy" },
        });

        const request = makeRequest("/api/clientcontact/set-primary", {
          id: "contact-001",
        });
        const response = await contactSetPrimary(request);

        expect(response.status).toBe(403);
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Unexpected"));

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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/clientcontact/remove", {
          id: "contact-001",
        });
        const response = await contactRemove(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/clientcontact/remove", {
          id: "contact-001",
        });
        const response = await contactRemove(request);

        expect(response.status).toBe(400);
      });

      it("should remove a client contact through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "contact-001", removed: true },
          emittedEvents: [{ type: "ClientContactRemoved" }],
        });

        const request = makeRequest("/api/clientcontact/remove", {
          id: "contact-001",
        });
        const response = await contactRemove(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(mockRunCommand).toHaveBeenCalledWith(
          "remove",
          expect.objectContaining({ id: "contact-001" }),
          { entityName: "ClientContact" }
        );
      });

      it("should return 422 on guard failure (e.g. cannot remove primary)", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          guardFailure: {
            index: 0,
            formatted: "Cannot remove primary contact",
          },
        });

        const request = makeRequest("/api/clientcontact/remove", {
          id: "contact-001",
        });
        const response = await contactRemove(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Cannot remove primary contact");
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Unexpected"));

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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/clientinteraction/create", {
          clientId: "client-001",
          type: "call",
          notes: "Discussed pricing",
        });
        const response = await interactionCreate(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/clientinteraction/create", {
          clientId: "client-001",
          type: "call",
        });
        const response = await interactionCreate(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should create a client interaction through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: {
            id: "interaction-001",
            clientId: "client-001",
            type: "email",
            notes: "Follow-up on proposal",
            status: "scheduled",
          },
          emittedEvents: [{ type: "ClientInteractionCreated" }],
        });

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

        expect(mockRunCommand).toHaveBeenCalledWith(
          "create",
          expect.objectContaining({
            clientId: "client-001",
            type: "email",
          }),
          { entityName: "ClientInteraction" }
        );
      });

      it("should pass tenantId to runtime for tenant isolation", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "interaction-002" },
          emittedEvents: [],
        });

        const request = makeRequest("/api/clientinteraction/create", {
          clientId: "client-001",
          type: "call",
        });
        await interactionCreate(request);

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          policyDenial: { policyName: "InteractionAccess" },
        });

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
        mockRunCommand.mockResolvedValue({
          success: false,
          guardFailure: {
            index: 0,
            formatted: "Invalid interaction type",
          },
        });

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
        mockRunCommand.mockResolvedValue({
          success: false,
          error: "Missing required field: clientId",
        });

        const request = makeRequest("/api/clientinteraction/create", {
          type: "call",
        });
        const response = await interactionCreate(request);

        expect(response.status).toBe(400);
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Runtime failure"));

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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/clientinteraction/update", {
          id: "interaction-001",
        });
        const response = await interactionUpdate(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/clientinteraction/update", {
          id: "interaction-001",
        });
        const response = await interactionUpdate(request);

        expect(response.status).toBe(400);
      });

      it("should update a client interaction through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: {
            id: "interaction-001",
            notes: "Updated notes",
          },
          emittedEvents: [{ type: "ClientInteractionUpdated" }],
        });

        const request = makeRequest("/api/clientinteraction/update", {
          id: "interaction-001",
          notes: "Updated notes",
        });
        const response = await interactionUpdate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(mockRunCommand).toHaveBeenCalledWith(
          "update",
          expect.objectContaining({
            id: "interaction-001",
            notes: "Updated notes",
          }),
          { entityName: "ClientInteraction" }
        );
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Unexpected"));

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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "interaction-001",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "interaction-001",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(400);
      });

      it("should complete a client interaction through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: {
            id: "interaction-001",
            status: "completed",
            completedAt: "2026-04-29T15:30:00Z",
          },
          emittedEvents: [{ type: "ClientInteractionCompleted" }],
        });

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

        expect(mockRunCommand).toHaveBeenCalledWith(
          "complete",
          expect.objectContaining({
            id: "interaction-001",
            outcome: "positive",
          }),
          { entityName: "ClientInteraction" }
        );
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          policyDenial: { policyName: "CompletionPolicy" },
        });

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "interaction-001",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(403);
      });

      it("should return 422 on guard failure (e.g. already completed)", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          guardFailure: {
            index: 0,
            formatted: "Interaction already completed",
          },
        });

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "interaction-001",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("already completed");
      });

      it("should return 400 on generic command failure", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          error: "Interaction not found",
        });

        const request = makeRequest("/api/clientinteraction/complete", {
          id: "nonexistent",
        });
        const response = await interactionComplete(request);

        expect(response.status).toBe(400);
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Unexpected"));

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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/clientpreference/create", {
          clientId: "client-001",
          category: "dietary",
          value: "vegetarian",
        });
        const response = await preferenceCreate(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/clientpreference/create", {
          clientId: "client-001",
          category: "dietary",
          value: "vegetarian",
        });
        const response = await preferenceCreate(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
      });

      it("should create a client preference through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: {
            id: "pref-001",
            clientId: "client-001",
            category: "dietary",
            value: "vegetarian",
          },
          emittedEvents: [{ type: "ClientPreferenceCreated" }],
        });

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

        expect(mockRunCommand).toHaveBeenCalledWith(
          "create",
          expect.objectContaining({
            clientId: "client-001",
            category: "dietary",
            value: "vegetarian",
          }),
          { entityName: "ClientPreference" }
        );
      });

      it("should pass tenantId to runtime for tenant isolation", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "pref-002" },
          emittedEvents: [],
        });

        const request = makeRequest("/api/clientpreference/create", {
          clientId: "client-001",
          category: "communication",
          value: "email",
        });
        await preferenceCreate(request);

        expect(createManifestRuntime).toHaveBeenCalledWith({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        });
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          policyDenial: { policyName: "PreferencePolicy" },
        });

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
        mockRunCommand.mockResolvedValue({
          success: false,
          guardFailure: {
            index: 0,
            formatted: "Duplicate preference for this category",
          },
        });

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
        mockRunCommand.mockResolvedValue({
          success: false,
          error: "Missing required field: clientId",
        });

        const request = makeRequest("/api/clientpreference/create", {
          category: "dietary",
        });
        const response = await preferenceCreate(request);

        expect(response.status).toBe(400);
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Runtime failure"));

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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/clientpreference/update", {
          id: "pref-001",
        });
        const response = await preferenceUpdate(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/clientpreference/update", {
          id: "pref-001",
        });
        const response = await preferenceUpdate(request);

        expect(response.status).toBe(400);
      });

      it("should update a client preference through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "pref-001", value: "vegan" },
          emittedEvents: [{ type: "ClientPreferenceUpdated" }],
        });

        const request = makeRequest("/api/clientpreference/update", {
          id: "pref-001",
          value: "vegan",
        });
        const response = await preferenceUpdate(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.value).toBe("vegan");

        expect(mockRunCommand).toHaveBeenCalledWith(
          "update",
          expect.objectContaining({ id: "pref-001", value: "vegan" }),
          { entityName: "ClientPreference" }
        );
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          policyDenial: { policyName: "PreferenceEditPolicy" },
        });

        const request = makeRequest("/api/clientpreference/update", {
          id: "pref-001",
        });
        const response = await preferenceUpdate(request);

        expect(response.status).toBe(403);
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Unexpected"));

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
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = makeRequest("/api/clientpreference/remove", {
          id: "pref-001",
        });
        const response = await preferenceRemove(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = makeRequest("/api/clientpreference/remove", {
          id: "pref-001",
        });
        const response = await preferenceRemove(request);

        expect(response.status).toBe(400);
      });

      it("should remove a client preference through manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "pref-001", removed: true },
          emittedEvents: [{ type: "ClientPreferenceRemoved" }],
        });

        const request = makeRequest("/api/clientpreference/remove", {
          id: "pref-001",
        });
        const response = await preferenceRemove(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(mockRunCommand).toHaveBeenCalledWith(
          "remove",
          expect.objectContaining({ id: "pref-001" }),
          { entityName: "ClientPreference" }
        );
      });

      it("should return 400 on generic command failure", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          error: "Preference not found",
        });

        const request = makeRequest("/api/clientpreference/remove", {
          id: "nonexistent",
        });
        const response = await preferenceRemove(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Preference not found");
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Unexpected"));

        const request = makeRequest("/api/clientpreference/remove", {
          id: "pref-001",
        });
        const response = await preferenceRemove(request);

        expect(response.status).toBe(500);
      });
    });
  });
});
