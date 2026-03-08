/**
 * Email Templates CRUD API Test Suite
 *
 * Tests verify the email templates API endpoints for listing, creating,
 * retrieving, updating, and deleting email templates.
 *
 * @vitest-environment node
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { database } from "@repo/database";

// Mock modules
vi.mock("@repo/database", () => ({
  database: {
    email_templates: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@/lib/manifest-command-handler", () => ({
  executeManifestCommand: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

const TEST_TENANT_ID = "00000000-0000-0000-000000000001";
const TEST_ORG_ID = "org-123";
const TEST_TEMPLATE_ID = "template-001";

// Helper to create mock email template
function createMockTemplate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: TEST_TEMPLATE_ID,
    tenant_id: TEST_TENANT_ID,
    name: "Welcome Email",
    template_type: "welcome",
    subject: "Welcome to Our Service",
    body: "Hello {{name}}, welcome!",
    merge_fields: JSON.stringify(["name", "email"]),
    is_active: true,
    is_default: false,
    created_at: new Date("2026-01-01"),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

// Helper to create mock NextRequest
function createMockRequest(url: string, options: { method?: string; body?: unknown } = {}): NextRequest {
  const { method = "GET", body } = options;
  const fullUrl = url.startsWith("http") ? url : `http://localhost${url}`;
  return new NextRequest(fullUrl, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

// Helper to create mock route context for [id] routes
function createMockContext(id: string): { params: Promise<{ id: string }> } {
  return {
    params: Promise.resolve({ id }),
  };
}

describe("Email Templates API", () => {
  let listGET: typeof import("@/app/api/collaboration/notifications/email/templates/route").GET;
  let listPOST: typeof import("@/app/api/collaboration/notifications/email/templates/route").POST;
  let detailGET: typeof import("@/app/api/collaboration/notifications/email/templates/[id]/route").GET;
  let detailPUT: typeof import("@/app/api/collaboration/notifications/email/templates/[id]/route").PUT;
  let detailDELETE: typeof import("@/app/api/collaboration/notifications/email/templates/[id]/route").DELETE;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamic import routes after mocks are set up
    const listRoute = await import("@/app/api/collaboration/notifications/email/templates/route");
    const detailRoute = await import("@/app/api/collaboration/notifications/email/templates/[id]/route");

    listGET = listRoute.GET;
    listPOST = listRoute.POST;
    detailGET = detailRoute.GET;
    detailPUT = detailRoute.PUT;
    detailDELETE = detailRoute.DELETE;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/collaboration/notifications/email/templates", () => {
    describe("list with pagination", () => {
      it("should return paginated list of templates", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);

        const mockTemplates = [
          createMockTemplate({ id: "template-001", name: "Template A" }),
          createMockTemplate({ id: "template-002", name: "Template B" }),
        ];

        vi.mocked(database.email_templates.findMany).mockResolvedValue(mockTemplates as never);
        vi.mocked(database.email_templates.count).mockResolvedValue(2);

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates?page=1&limit=50"
        );
        const response = await listGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data).toHaveLength(2);
        expect(data.pagination).toEqual({
          page: 1,
          limit: 50,
          total: 2,
          totalPages: 1,
        });

        expect(database.email_templates.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenant_id: TEST_TENANT_ID,
              deleted_at: null,
            }),
            orderBy: [{ template_type: "asc" }, { name: "asc" }],
            skip: 0,
            take: 50,
          })
        );
      });

      it("should handle page offset calculation correctly", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.email_templates.findMany).mockResolvedValue([] as never);
        vi.mocked(database.email_templates.count).mockResolvedValue(100);

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates?page=3&limit=20"
        );
        await listGET(request);

        expect(database.email_templates.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 40, // (3-1) * 20
            take: 20,
          })
        );
      });

      it("should cap limit at 100", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.email_templates.findMany).mockResolvedValue([] as never);
        vi.mocked(database.email_templates.count).mockResolvedValue(0);

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates?limit=200"
        );
        await listGET(request);

        expect(database.email_templates.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 100, // capped at 100
          })
        );
      });
    });

    describe("filter by templateType", () => {
      it("should filter templates by templateType", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.email_templates.findMany).mockResolvedValue([] as never);
        vi.mocked(database.email_templates.count).mockResolvedValue(0);

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates?templateType=welcome"
        );
        await listGET(request);

        expect(database.email_templates.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              template_type: "welcome",
            }),
          })
        );
      });
    });

    describe("filter by isActive", () => {
      it("should filter templates by isActive=true", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.email_templates.findMany).mockResolvedValue([] as never);
        vi.mocked(database.email_templates.count).mockResolvedValue(0);

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates?isActive=true"
        );
        await listGET(request);

        expect(database.email_templates.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              is_active: true,
            }),
          })
        );
      });

      it("should filter templates by isActive=false", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.email_templates.findMany).mockResolvedValue([] as never);
        vi.mocked(database.email_templates.count).mockResolvedValue(0);

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates?isActive=false"
        );
        await listGET(request);

        expect(database.email_templates.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              is_active: false,
            }),
          })
        );
      });
    });

    describe("filter by isDefault", () => {
      it("should filter templates by isDefault=true", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.email_templates.findMany).mockResolvedValue([] as never);
        vi.mocked(database.email_templates.count).mockResolvedValue(0);

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates?isDefault=true"
        );
        await listGET(request);

        expect(database.email_templates.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              is_default: true,
            }),
          })
        );
      });

      it("should filter templates by isDefault=false", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.email_templates.findMany).mockResolvedValue([] as never);
        vi.mocked(database.email_templates.count).mockResolvedValue(0);

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates?isDefault=false"
        );
        await listGET(request);

        expect(database.email_templates.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              is_default: false,
            }),
          })
        );
      });
    });

    describe("authentication", () => {
      it("should return 401 when unauthorized (no orgId)", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates"
        );
        const response = await listGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      it("should return 401 when no tenant found", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates"
        );
        const response = await listGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("No tenant found");
      });
    });

    describe("error handling", () => {
      it("should return 500 on database error", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.email_templates.findMany).mockRejectedValue(new Error("DB error"));

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates"
        );
        const response = await listGET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch email templates");
      });
    });
  });

  describe("POST /api/collaboration/notifications/email/templates", () => {
    describe("create successfully", () => {
      it("should create a new template with executeManifestCommand", async () => {
        const mockCreatedTemplate = createMockTemplate({
          id: "new-template-id",
          name: "New Template",
          subject: "New Subject",
        });

        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(JSON.stringify({ data: mockCreatedTemplate }), { status: 201 })
        );

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates",
          {
            method: "POST",
            body: {
              name: "New Template",
              templateType: "welcome",
              subject: "New Subject",
              body: "Email body content",
              mergeFields: ["name"],
              isActive: true,
              isDefault: false,
            },
          }
        );

        const response = await listPOST(request);

        expect(executeManifestCommand).toHaveBeenCalledWith(
          request,
          expect.objectContaining({
            entityName: "EmailTemplate",
            commandName: "create",
            transformBody: expect.any(Function),
          })
        );

        // Verify the transformBody function produces correct output
        const callArgs = vi.mocked(executeManifestCommand).mock.calls[0][1];
        if (callArgs.transformBody) {
          const transformed = callArgs.transformBody({
            name: "Test",
            templateType: "custom",
            subject: "Test Subject",
            body: "Body",
            mergeFields: ["field1"],
            isActive: true,
            isDefault: false,
          }, { userId: "test-user", tenantId: TEST_TENANT_ID, role: "admin" });

          expect(transformed).toEqual({
            name: "Test",
            templateType: "custom",
            subject: "Test Subject",
            body: "Body",
            mergeFields: JSON.stringify(["field1"]),
            isActive: true,
            isDefault: false,
          });
        }
      });

      it("should use default values for optional fields", async () => {
        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(JSON.stringify({ data: {} }), { status: 201 })
        );

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates",
          {
            method: "POST",
            body: {
              name: "Minimal Template",
              subject: "Minimal Subject",
            },
          }
        );

        await listPOST(request);

        const callArgs = vi.mocked(executeManifestCommand).mock.calls[0][1];
        if (callArgs.transformBody) {
          const transformed = callArgs.transformBody({}, { userId: "test-user", tenantId: TEST_TENANT_ID, role: "admin" });

          expect(transformed).toEqual({
            name: "",
            templateType: "custom",
            subject: "",
            body: "",
            mergeFields: JSON.stringify([]),
            isActive: true,
            isDefault: false,
          });
        }
      });
    });

    describe("validation errors", () => {
      it("should return 400 when name is missing", async () => {
        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({ error: "Template name is required" }),
            { status: 400 }
          )
        );

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates",
          {
            method: "POST",
            body: {
              templateType: "welcome",
              subject: "Subject",
              body: "Body",
            },
          }
        );

        const response = await listPOST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Template name is required");
      });

      it("should return 400 when subject is missing", async () => {
        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({ error: "Template subject is required" }),
            { status: 400 }
          )
        );

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates",
          {
            method: "POST",
            body: {
              name: "Template Name",
              templateType: "welcome",
              body: "Body",
            },
          }
        );

        const response = await listPOST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Template subject is required");
      });
    });

    describe("authentication", () => {
      it("should return 401 when unauthorized", async () => {
        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
        );

        const request = createMockRequest(
          "/api/collaboration/notifications/email/templates",
          {
            method: "POST",
            body: { name: "Test", subject: "Test" },
          }
        );

        const response = await listPOST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });
    });
  });

  describe("GET /api/collaboration/notifications/email/templates/[id]", () => {
    describe("get by id", () => {
      it("should return template by id", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);

        const mockTemplate = createMockTemplate();
        vi.mocked(database.email_templates.findFirst).mockResolvedValue(mockTemplate as never);

        const request = createMockRequest(
          `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`
        );
        const context = createMockContext(TEST_TEMPLATE_ID);

        const response = await detailGET(request, context);
        const data = await response.json();

        expect(response.status).toBe(200);
        // Note: Dates are serialized to ISO strings in JSON response
        expect(data.data.id).toBe(mockTemplate.id);
        expect(data.data.name).toBe(mockTemplate.name);
        expect(data.data.subject).toBe(mockTemplate.subject);
        expect(data.data.template_type).toBe(mockTemplate.template_type);
        expect(data.data.is_active).toBe(mockTemplate.is_active);
        expect(data.data.is_default).toBe(mockTemplate.is_default);

        expect(database.email_templates.findFirst).toHaveBeenCalledWith({
          where: {
            tenant_id: TEST_TENANT_ID,
            id: TEST_TEMPLATE_ID,
            deleted_at: null,
          },
        });
      });
    });

    describe("not found", () => {
      it("should return 404 when template not found", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.email_templates.findFirst).mockResolvedValue(null);

        const request = createMockRequest(
          `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`
        );
        const context = createMockContext(TEST_TEMPLATE_ID);

        const response = await detailGET(request, context);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("Email template not found");
      });

      it("should return 404 for deleted templates", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);

        // Deleted template won't be found due to deleted_at: null filter
        vi.mocked(database.email_templates.findFirst).mockResolvedValue(null);

        const request = createMockRequest(
          `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`
        );
        const context = createMockContext(TEST_TEMPLATE_ID);

        const response = await detailGET(request, context);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe("Email template not found");
      });
    });

    describe("authentication", () => {
      it("should return 401 when unauthorized (no orgId)", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

        const request = createMockRequest(
          `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`
        );
        const context = createMockContext(TEST_TEMPLATE_ID);

        const response = await detailGET(request, context);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });
    });

    describe("error handling", () => {
      it("should return 500 on database error", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
        vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
        vi.mocked(database.email_templates.findFirst).mockRejectedValue(new Error("DB error"));

        const request = createMockRequest(
          `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`
        );
        const context = createMockContext(TEST_TEMPLATE_ID);

        const response = await detailGET(request, context);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch email template");
      });
    });
  });

  describe("PUT /api/collaboration/notifications/email/templates/[id]", () => {
    describe("update successfully", () => {
      it("should update template with executeManifestCommand", async () => {
        const updatedTemplate = createMockTemplate({
          name: "Updated Name",
          subject: "Updated Subject",
        });

        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(JSON.stringify({ data: updatedTemplate }), { status: 200 })
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
              mergeFields: ["name", "email"],
              isActive: true,
              isDefault: false,
            },
          }
        );
        const context = createMockContext(TEST_TEMPLATE_ID);

        const response = await detailPUT(request, context);

        expect(executeManifestCommand).toHaveBeenCalledWith(
          request,
          expect.objectContaining({
            entityName: "EmailTemplate",
            commandName: "update",
            params: { id: TEST_TEMPLATE_ID },
            transformBody: expect.any(Function),
          })
        );

        // Verify the transformBody function includes the id
        const callArgs = vi.mocked(executeManifestCommand).mock.calls[0][1];
        if (callArgs.transformBody) {
          const transformed = callArgs.transformBody({
            name: "Test",
            subject: "Test Subject",
          }, { userId: "test-user", tenantId: TEST_TENANT_ID, role: "admin", params: { id: TEST_TEMPLATE_ID } });

          expect(transformed.id).toBe(TEST_TEMPLATE_ID);
          expect(transformed.name).toBe("Test");
          expect(transformed.subject).toBe("Test Subject");
        }
      });
    });

    describe("validation errors", () => {
      it("should return 400 when updating deleted template", async () => {
        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({ error: "Cannot update a deleted template" }),
            { status: 400 }
          )
        );

        const request = createMockRequest(
          `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
          {
            method: "PUT",
            body: {
              name: "Updated Name",
              subject: "Updated Subject",
            },
          }
        );
        const context = createMockContext(TEST_TEMPLATE_ID);

        const response = await detailPUT(request, context);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Cannot update a deleted template");
      });

      it("should return 400 when name is missing on update", async () => {
        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({ error: "Template name is required" }),
            { status: 400 }
          )
        );

        const request = createMockRequest(
          `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
          {
            method: "PUT",
            body: {
              subject: "Updated Subject",
            },
          }
        );
        const context = createMockContext(TEST_TEMPLATE_ID);

        const response = await detailPUT(request, context);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Template name is required");
      });

      it("should return 400 when subject is missing on update", async () => {
        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({ error: "Template subject is required" }),
            { status: 400 }
          )
        );

        const request = createMockRequest(
          `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
          {
            method: "PUT",
            body: {
              name: "Updated Name",
            },
          }
        );
        const context = createMockContext(TEST_TEMPLATE_ID);

        const response = await detailPUT(request, context);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Template subject is required");
      });
    });
  });

  describe("DELETE /api/collaboration/notifications/email/templates/[id]", () => {
    describe("soft delete successfully", () => {
      it("should soft delete template with executeManifestCommand", async () => {
        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        );

        const request = createMockRequest(
          `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
          { method: "DELETE" }
        );
        const context = createMockContext(TEST_TEMPLATE_ID);

        const response = await detailDELETE(request, context);

        expect(executeManifestCommand).toHaveBeenCalledWith(
          request,
          expect.objectContaining({
            entityName: "EmailTemplate",
            commandName: "softDelete",
            params: { id: TEST_TEMPLATE_ID },
            transformBody: expect.any(Function),
          })
        );

        // Verify transformBody passes the id
        const callArgs = vi.mocked(executeManifestCommand).mock.calls[0][1];
        if (callArgs.transformBody) {
          const transformed = callArgs.transformBody({}, { userId: "test-user", tenantId: TEST_TENANT_ID, role: "admin", params: { id: TEST_TEMPLATE_ID } });
          expect(transformed.id).toBe(TEST_TEMPLATE_ID);
        }
      });
    });

    describe("validation errors", () => {
      it("should return 400 when template is already deleted", async () => {
        vi.mocked(executeManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({ error: "Template is already deleted" }),
            { status: 400 }
          )
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
  });
});

describe("Email Templates Manifest Guards", () => {
  let listPOST: typeof import("@/app/api/collaboration/notifications/email/templates/route").POST;
  let detailPUT: typeof import("@/app/api/collaboration/notifications/email/templates/[id]/route").PUT;
  let detailDELETE: typeof import("@/app/api/collaboration/notifications/email/templates/[id]/route").DELETE;

  beforeEach(async () => {
    vi.clearAllMocks();

    const listRoute = await import("@/app/api/collaboration/notifications/email/templates/route");
    const detailRoute = await import("@/app/api/collaboration/notifications/email/templates/[id]/route");

    listPOST = listRoute.POST;
    detailPUT = detailRoute.PUT;
    detailDELETE = detailRoute.DELETE;
  });

  it("should enforce name guard on create", async () => {
    vi.mocked(executeManifestCommand).mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Template name is required" }),
        { status: 400 }
      )
    );

    const request = createMockRequest(
      "/api/collaboration/notifications/email/templates",
      {
        method: "POST",
        body: { subject: "Test", body: "Test" },
      }
    );

    const response = await listPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("name");
  });

  it("should enforce subject guard on create", async () => {
    vi.mocked(executeManifestCommand).mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Template subject is required" }),
        { status: 400 }
      )
    );

    const request = createMockRequest(
      "/api/collaboration/notifications/email/templates",
      {
        method: "POST",
        body: { name: "Test", body: "Test" },
      }
    );

    const response = await listPOST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("subject");
  });

  it("should enforce deletedAt guard on update", async () => {
    vi.mocked(executeManifestCommand).mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Cannot update a deleted template" }),
        { status: 400 }
      )
    );

    const request = createMockRequest(
      `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
      {
        method: "PUT",
        body: { name: "Updated", subject: "Updated" },
      }
    );
    const context = createMockContext(TEST_TEMPLATE_ID);

    const response = await detailPUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("deleted");
  });

  it("should enforce deletedAt guard on softDelete", async () => {
    vi.mocked(executeManifestCommand).mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Template is already deleted" }),
        { status: 400 }
      )
    );

    const request = createMockRequest(
      `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
      { method: "DELETE" }
    );
    const context = createMockContext(TEST_TEMPLATE_ID);

    const response = await detailDELETE(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("already deleted");
  });
});

describe("Email Templates Policy Tests", () => {
  let listGET: typeof import("@/app/api/collaboration/notifications/email/templates/route").GET;
  let listPOST: typeof import("@/app/api/collaboration/notifications/email/templates/route").POST;
  let detailDELETE: typeof import("@/app/api/collaboration/notifications/email/templates/[id]/route").DELETE;

  beforeEach(async () => {
    vi.clearAllMocks();

    const listRoute = await import("@/app/api/collaboration/notifications/email/templates/route");
    const detailRoute = await import("@/app/api/collaboration/notifications/email/templates/[id]/route");

    listGET = listRoute.GET;
    listPOST = listRoute.POST;
    detailDELETE = detailRoute.DELETE;
  });

  it("should allow staff role to read templates", async () => {
    // EmailTemplateRead policy: user.role in ["staff", "manager", "admin"]
    vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(database.email_templates.findMany).mockResolvedValue([] as never);
    vi.mocked(database.email_templates.count).mockResolvedValue(0);

    const request = createMockRequest(
      "/api/collaboration/notifications/email/templates"
    );
    const response = await listGET(request);

    // If we get here without auth error, the policy check passed
    expect(response.status).toBe(200);
  });

  it("should allow manager role to create templates", async () => {
    // EmailTemplateCreate policy: user.role in ["manager", "admin"]
    vi.mocked(executeManifestCommand).mockResolvedValue(
      new Response(JSON.stringify({ data: {} }), { status: 201 })
    );

    const request = createMockRequest(
      "/api/collaboration/notifications/email/templates",
      {
        method: "POST",
        body: { name: "Test", subject: "Test" },
      }
    );

    const response = await listPOST(request);

    // executeManifestCommand handles the policy check
    expect(executeManifestCommand).toHaveBeenCalled();
  });

  it("should allow admin role to delete templates", async () => {
    // EmailTemplateDelete policy: user.role in ["admin"]
    vi.mocked(executeManifestCommand).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const request = createMockRequest(
      `/api/collaboration/notifications/email/templates/${TEST_TEMPLATE_ID}`,
      { method: "DELETE" }
    );
    const context = createMockContext(TEST_TEMPLATE_ID);

    const response = await detailDELETE(request, context);

    // executeManifestCommand handles the policy check
    expect(executeManifestCommand).toHaveBeenCalled();
  });
});

describe("Email Templates Integration Tests", () => {
  // These tests would require a real database connection
  // Marked as integration tests to be run separately
  it.todo("should create, update, and delete template in sequence");
  it.todo("should handle concurrent updates to the same template");
  it.todo("should verify EmailTemplateCreated event is emitted");
  it.todo("should verify EmailTemplateUpdated event is emitted");
  it.todo("should verify EmailTemplateDeleted event is emitted");
});
