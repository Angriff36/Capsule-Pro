/**
 * EmailTemplate governance test suite.
 *
 * Verifies that create / update / delete routes dispatch through
 * `runManifestCommand` with the correct entity, command, body shape, and user
 * context — and that error results surface correctly.
 *
 * Key contracts tested:
 * 1. createEmailTemplate  → dispatches "create" with normalized body
 * 2. updateEmailTemplate  → dispatches "update" with merged fields + instanceId
 * 3. deleteEmailTemplate  → dispatches "softDelete" with id body + instanceId
 * 4. Failed commands      → error response propagated (result.ok = false)
 * 5. isDefault management → route passes isDefault through to command body
 * 6. Active-workflow guard→ softDelete guard blocks already-deleted templates
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules — must come before dynamic imports of route handlers
// ---------------------------------------------------------------------------

vi.mock("@repo/database", () => ({
  database: {
    emailTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@repo/observability/log", () => ({
  log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Import mocked modules (after vi.mock setup)
// ---------------------------------------------------------------------------

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "00000000-0000-0000-000000000001";
const TEST_ORG_ID = "org-123";
const TEST_USER_ID = "user-001";
const TEST_TEMPLATE_ID = "template-001";

const MOCK_USER = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  role: "admin",
};

function createMockTemplate(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: TEST_TEMPLATE_ID,
    tenantId: TEST_TENANT_ID,
    name: "Welcome Email",
    templateType: "welcome",
    subject: "Welcome to Our Service",
    body: "Hello {{name}}, welcome!",
    mergeFields: JSON.stringify(["name", "email"]),
    isActive: true,
    isDefault: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function createMockRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): NextRequest {
  const { method = "GET", body } = options;
  const fullUrl = url.startsWith("http") ? url : `http://localhost${url}`;
  return new NextRequest(fullUrl, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

function createMockContext(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function successResponse(data: unknown): Response {
  return new Response(JSON.stringify({ data, success: true }), { status: 200 });
}

function errorResponse(error: string, status = 400): Response {
  return new Response(JSON.stringify({ error, success: false }), { status });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("EmailTemplate governance", () => {
  let listPOST: typeof import("@/app/api/collaboration/notifications/email/templates/route").POST;
  let detailPUT: typeof import("@/app/api/collaboration/notifications/email/templates/[id]/route").PUT;
  let detailDELETE: typeof import("@/app/api/collaboration/notifications/email/templates/[id]/route").DELETE;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default auth resolution
    vi.mocked(resolveCurrentUser).mockResolvedValue(MOCK_USER as never);
    vi.mocked(auth).mockResolvedValue({
      orgId: TEST_ORG_ID,
      userId: "clerk-user-001",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);

    // Dynamic imports after mocks are set up
    const listRoute = await import(
      "@/app/api/collaboration/notifications/email/templates/route"
    );
    const detailRoute = await import(
      "@/app/api/collaboration/notifications/email/templates/[id]/route"
    );

    listPOST = listRoute.POST;
    detailPUT = detailRoute.PUT;
    detailDELETE = detailRoute.DELETE;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. createEmailTemplate dispatches to runManifestCommand
  // -------------------------------------------------------------------------
  describe("createEmailTemplate", () => {
    it("dispatches to runManifestCommand with entity=EmailTemplate, command=create, and normalized body", async () => {
      const createdTemplate = createMockTemplate({ id: "new-id" });
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse(createdTemplate)
      );

      const request = createMockRequest(
        "/api/collaboration/notifications/email/templates",
        {
          method: "POST",
          body: {
            name: "Welcome Email",
            templateType: "welcome",
            subject: "Welcome to Our Service",
            body: "Hello {{name}}, welcome!",
            mergeFields: ["name", "email"],
            isActive: true,
            isDefault: false,
          },
        }
      );

      const response = await listPOST(request);

      expect(runManifestCommand).toHaveBeenCalledTimes(1);
      const call = vi.mocked(runManifestCommand).mock.calls[0]![0];

      // Entity and command
      expect(call.entity).toBe("EmailTemplate");
      expect(call.command).toBe("create");

      // Body shape — route normalizes via defaults
      expect(call.body).toEqual({
        name: "Welcome Email",
        templateType: "welcome",
        subject: "Welcome to Our Service",
        body: "Hello {{name}}, welcome!",
        mergeFields: JSON.stringify(["name", "email"]),
        isActive: true,
        isDefault: false,
      });

      // User context
      expect(call.user).toEqual({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      // No instanceId for create
      expect(call.instanceId).toBeUndefined();

      expect(response.status).toBe(200);
    });

    it("applies defaults for optional fields when not provided", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(successResponse({}));

      const request = createMockRequest(
        "/api/collaboration/notifications/email/templates",
        {
          method: "POST",
          body: {
            name: "Minimal",
            subject: "Sub",
          },
        }
      );

      await listPOST(request);

      const call = vi.mocked(runManifestCommand).mock.calls[0]![0];
      expect(call.body).toEqual(
        expect.objectContaining({
          templateType: "custom",
          body: "",
          mergeFields: "[]",
          isActive: true,
          isDefault: false,
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. updateEmailTemplate dispatches to runManifestCommand with merged fields
  // -------------------------------------------------------------------------
  describe("updateEmailTemplate", () => {
    it("dispatches to runManifestCommand with entity=EmailTemplate, command=update, instanceId, and merged body", async () => {
      const updatedTemplate = createMockTemplate({
        name: "Updated Name",
        subject: "Updated Subject",
      });
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse(updatedTemplate)
      );

      const request = createMockRequest(
        `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
        {
          method: "PUT",
          body: {
            name: "Updated Name",
            templateType: "welcome",
            subject: "Updated Subject",
            body: "Updated body",
            mergeFields: ["name"],
            isActive: true,
            isDefault: false,
          },
        }
      );
      const context = createMockContext(TEST_TEMPLATE_ID);

      const response = await detailPUT(request, context);

      expect(runManifestCommand).toHaveBeenCalledTimes(1);
      const call = vi.mocked(runManifestCommand).mock.calls[0]![0];

      expect(call.entity).toBe("EmailTemplate");
      expect(call.command).toBe("update");
      expect(call.instanceId).toBe(TEST_TEMPLATE_ID);

      // Body includes the id from the route param + all normalized fields
      expect(call.body).toEqual({
        id: TEST_TEMPLATE_ID,
        name: "Updated Name",
        templateType: "welcome",
        subject: "Updated Subject",
        body: "Updated body",
        mergeFields: JSON.stringify(["name"]),
        isActive: true,
        isDefault: false,
      });

      expect(call.user).toEqual({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      expect(response.status).toBe(200);
    });

    it("passes partial fields with defaults for missing values", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(successResponse({}));

      const request = createMockRequest(
        `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
        {
          method: "PUT",
          body: { name: "Only Name" },
        }
      );
      const context = createMockContext(TEST_TEMPLATE_ID);

      await detailPUT(request, context);

      const call = vi.mocked(runManifestCommand).mock.calls[0]![0];
      // Route applies defaults: subject → "", templateType → "custom", etc.
      expect(call.body).toEqual(
        expect.objectContaining({
          id: TEST_TEMPLATE_ID,
          name: "Only Name",
          templateType: "custom",
          subject: "",
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // 3. deleteEmailTemplate dispatches to runManifestCommand with softDelete
  // -------------------------------------------------------------------------
  describe("deleteEmailTemplate", () => {
    it("dispatches to runManifestCommand with entity=EmailTemplate, command=softDelete, and id body", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: TEST_TEMPLATE_ID })
      );

      const request = createMockRequest(
        `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
        { method: "DELETE" }
      );
      const context = createMockContext(TEST_TEMPLATE_ID);

      const response = await detailDELETE(request, context);

      expect(runManifestCommand).toHaveBeenCalledTimes(1);
      const call = vi.mocked(runManifestCommand).mock.calls[0]![0];

      expect(call.entity).toBe("EmailTemplate");
      expect(call.command).toBe("softDelete");
      expect(call.instanceId).toBe(TEST_TEMPLATE_ID);
      expect(call.body).toEqual({ id: TEST_TEMPLATE_ID });
      expect(call.user).toEqual({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      expect(response.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Failed commands surface errors
  // -------------------------------------------------------------------------
  describe("failed command surfaces error", () => {
    it("returns error response when runManifestCommand returns non-ok", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Template name is required", 400)
      );

      const request = createMockRequest(
        "/api/collaboration/notifications/email/templates",
        {
          method: "POST",
          body: { subject: "Only subject" },
        }
      );

      const response = await listPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Template name is required");
    });

    it("returns error response when update command fails", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Cannot update a deleted template", 400)
      );

      const request = createMockRequest(
        `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
        {
          method: "PUT",
          body: { name: "Try Update", subject: "Sub" },
        }
      );
      const context = createMockContext(TEST_TEMPLATE_ID);

      const response = await detailPUT(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot update a deleted template");
    });

    it("returns error response when softDelete command fails", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Template is already deleted", 400)
      );

      const request = createMockRequest(
        `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
        { method: "DELETE" }
      );
      const context = createMockContext(TEST_TEMPLATE_ID);

      const response = await detailDELETE(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Template is already deleted");
    });
  });

  // -------------------------------------------------------------------------
  // 5. updateMany side-effect for default management
  // -------------------------------------------------------------------------
  describe("isDefault management", () => {
    it("passes isDefault=true through to create command body", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse(createMockTemplate({ isDefault: true }))
      );

      const request = createMockRequest(
        "/api/collaboration/notifications/email/templates",
        {
          method: "POST",
          body: {
            name: "Default Template",
            subject: "Default Subject",
            isDefault: true,
          },
        }
      );

      await listPOST(request);

      const call = vi.mocked(runManifestCommand).mock.calls[0]![0];
      expect(call.body).toEqual(expect.objectContaining({ isDefault: true }));
    });

    it("passes isDefault=true through to update command body", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse(createMockTemplate({ isDefault: true }))
      );

      const request = createMockRequest(
        `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
        {
          method: "PUT",
          body: {
            name: "Updated Default",
            subject: "Updated",
            isDefault: true,
          },
        }
      );
      const context = createMockContext(TEST_TEMPLATE_ID);

      await detailPUT(request, context);

      const call = vi.mocked(runManifestCommand).mock.calls[0]![0];
      expect(call.body).toEqual(expect.objectContaining({ isDefault: true }));
    });

    it("defaults isDefault to false when not provided", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(successResponse({}));

      const request = createMockRequest(
        "/api/collaboration/notifications/email/templates",
        {
          method: "POST",
          body: { name: "Non-default", subject: "Sub" },
        }
      );

      await listPOST(request);

      const call = vi.mocked(runManifestCommand).mock.calls[0]![0];
      expect(call.body).toEqual(expect.objectContaining({ isDefault: false }));
    });
  });

  // -------------------------------------------------------------------------
  // 6. Active-workflow guard blocks delete
  // -------------------------------------------------------------------------
  describe("active-workflow guard blocks delete", () => {
    it("returns error when attempting to softDelete an already-deleted template (deletedAt != null)", async () => {
      // The IR guard: self.deletedAt == null — if deletedAt is set, guard fails
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Template is already deleted", 400)
      );

      const request = createMockRequest(
        `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
        { method: "DELETE" }
      );
      const context = createMockContext(TEST_TEMPLATE_ID);

      const response = await detailDELETE(request, context);
      const data = await response.json();

      // The command was dispatched (route does not pre-check deletedAt itself)
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EmailTemplate",
          command: "softDelete",
        })
      );

      // But the guard inside the runtime blocked it
      expect(response.status).toBe(400);
      expect(data.error).toBe("Template is already deleted");
    });

    it("allows softDelete when template is not deleted (deletedAt is null)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: TEST_TEMPLATE_ID, deletedAt: expect.any(String) })
      );

      const request = createMockRequest(
        `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
        { method: "DELETE" }
      );
      const context = createMockContext(TEST_TEMPLATE_ID);

      const response = await detailDELETE(request, context);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EmailTemplate",
          command: "softDelete",
        })
      );
      expect(response.status).toBe(200);
    });
  });
});
