/**
 * Communications API Integration Tests
 *
 * Tests verify email template, email workflow, and SMS automation rule
 * endpoints with authentication, authorization, and error handling.
 *
 * Mock pattern: runManifestCommand from @/lib/manifest/execute-command
 * returns a Response (the dispatcher route delegates directly to it).
 */

import { database } from "@repo/database";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getEmailTemplate } from "@/app/api/communications/email-templates/[id]/route";
// Email template routes
import { GET as listEmailTemplates } from "@/app/api/communications/email-templates/list/route";
import { GET as getEmailWorkflow } from "@/app/api/communications/email-workflows/[id]/route";
// Email workflow routes
import { GET as listEmailWorkflows } from "@/app/api/communications/email-workflows/list/route";
import {
  DELETE as deleteSmsRule,
  GET as getSmsRule,
  PATCH as patchSmsRule,
} from "@/app/api/communications/sms/automation-rules/[id]/route";
// SMS automation rule routes
import {
  POST as createSmsRule,
  GET as listSmsRules,
} from "@/app/api/communications/sms/automation-rules/route";
import {
  POST as createEmailTemplate,
  POST as createEmailWorkflow,
  POST as softDeleteEmailTemplate,
  POST as softDeleteEmailWorkflow,
  POST as updateEmailTemplate,
  POST as updateEmailWorkflow,
} from "@/app/api/manifest/[entity]/commands/[command]/route";

// Mock dependencies
vi.mock("@repo/database", () => ({
  database: {
    emailTemplate: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    emailWorkflow: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    sms_automation_rules: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((fn) => fn({})),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn(
    (data, status = 200) =>
      new Response(JSON.stringify({ success: true, ...data }), { status })
  ),
  manifestErrorResponse: vi.fn(
    (data, status = 400) =>
      new Response(
        JSON.stringify({
          success: false,
          ...(typeof data === "string" ? { message: data } : data),
        }),
        { status }
      )
  ),
}));
vi.mock("@/lib/pagination", () => ({
  clampLimit: vi.fn((v) => Math.min(Number(v) || 50, 200)),
  clampOffset: vi.fn((v) => Math.max(Number(v) || 0, 0)),
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    name = "InvariantError";
  },
}));
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
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { createManifestRuntime } = await import("@/lib/manifest-runtime");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "user_comm_test";
const TEST_ORG_ID = "org_comm_test";

const MOCK_CURRENT_USER = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  role: "admin",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    authUserId: "clerk-comm-123",
    ...overrides,
  };
}

function createMockEmailTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: "tmpl-001",
    tenant_id: TEST_TENANT_ID,
    name: "Welcome Email",
    subject: "Welcome to our platform",
    body: "<p>Hello {{name}}, welcome!</p>",
    created_at: new Date("2026-01-15"),
    updated_at: new Date("2026-01-15"),
    deleted_at: null,
    ...overrides,
  };
}

function createMockEmailWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: "wf-001",
    tenantId: TEST_TENANT_ID,
    name: "Onboarding Workflow",
    triggerType: "event_signup",
    steps: [],
    isActive: true,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    deletedAt: null,
    ...overrides,
  };
}

function createMockSmsRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-001",
    tenant_id: TEST_TENANT_ID,
    name: "Shift Reminder SMS",
    description: "Sends a reminder before a shift",
    trigger_type: "shift_scheduled",
    trigger_config: { hoursBefore: 2 },
    template_id: null,
    custom_message: "Your shift starts in {{hours}} hours.",
    recipient_type: "employee",
    recipient_config: {},
    is_active: true,
    priority: 10,
    created_at: new Date("2026-01-15"),
    updated_at: new Date("2026-01-15"),
    deleted_at: null,
    ...overrides,
  };
}

/** Helper: build a success Response matching manifestSuccessResponse shape. */
function successResponse(
  result: Record<string, unknown>,
  events: unknown[] = []
): Response {
  return NextResponse.json({ success: true, result, events }, { status: 200 });
}

/** Helper: build an error Response matching manifestErrorResponse shape. */
function errorResponse(message: string, status: number): Response {
  return NextResponse.json({ success: false, message }, { status });
}

/** Helper: create an InvariantError for requireCurrentUser mock rejections. */
function invariantError(message: string): Error {
  const err = new Error(message);
  err.name = "InvariantError";
  return err;
}

/** Helper: mock requireCurrentUser to reject with InvariantError (unauthenticated). */
function mockUnauthenticated(): void {
  vi.mocked(requireCurrentUser).mockRejectedValue(
    invariantError("Not authenticated") as never
  );
}

// ===========================================================================
// EMAIL TEMPLATES
// ===========================================================================

describe("Communications - Email Templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(requireCurrentUser).mockResolvedValue(MOCK_CURRENT_USER as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------ LIST
  describe("GET /api/communications/email-templates/list", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/communications/email-templates/list"
      );
      const response = await listEmailTemplates(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/communications/email-templates/list"
      );
      const response = await listEmailTemplates(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Tenant not found");
    });

    it("should return email templates for authenticated user", async () => {
      const mockTemplates = [
        createMockEmailTemplate({ id: "tmpl-1", name: "Welcome" }),
        createMockEmailTemplate({ id: "tmpl-2", name: "Follow-up" }),
      ];

      vi.mocked(database.emailTemplate.findMany).mockResolvedValue(
        mockTemplates as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/email-templates/list"
      );
      const response = await listEmailTemplates(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.emailTemplates).toHaveLength(2);
    });

    it("should filter by tenantId and exclude soft-deleted", async () => {
      vi.mocked(database.emailTemplate.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/communications/email-templates/list"
      );
      await listEmailTemplates(request);

      expect(database.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("should order results by createdAt descending", async () => {
      vi.mocked(database.emailTemplate.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/communications/email-templates/list"
      );
      await listEmailTemplates(request);

      expect(database.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.emailTemplate.findMany).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/communications/email-templates/list"
      );
      const response = await listEmailTemplates(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Internal server error");
    });
  });

  // ---------------------------------------------------------------- DETAIL
  describe("GET /api/communications/email-templates/[id]", () => {
    it("should return a single email template by ID", async () => {
      const mockTemplate = createMockEmailTemplate({ id: "tmpl-001" });

      vi.mocked(database.emailTemplate.findFirst).mockResolvedValue(
        mockTemplate as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/email-templates/tmpl-001"
      );
      const response = await getEmailTemplate(request, {
        params: Promise.resolve({ id: "tmpl-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.emailTemplate.id).toBe("tmpl-001");
    });

    it("should return 404 when template not found", async () => {
      vi.mocked(database.emailTemplate.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/email-templates/nonexistent"
      );
      const response = await getEmailTemplate(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("EmailTemplate not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      vi.mocked(database.emailTemplate.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/email-templates/tmpl-001"
      );
      await getEmailTemplate(request, {
        params: Promise.resolve({ id: "tmpl-001" }),
      });

      expect(database.emailTemplate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "tmpl-001",
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/communications/email-templates/tmpl-001"
      );
      const response = await getEmailTemplate(request, {
        params: Promise.resolve({ id: "tmpl-001" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // --------------------------------------------------------------- CREATE
  describe("POST /api/communications/email-templates/commands/create", () => {
    beforeEach(() => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: "tmpl-new" })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Template" }),
        }
      );
      const response = await createEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "create" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 when tenant not found (dispatcher catches InvariantError)", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        invariantError("Tenant not found") as never
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Template" }),
        }
      );
      const response = await createEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "create" }),
      });

      expect(response.status).toBe(401);
    });

    it("should create a template through manifest runtime", async () => {
      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            name: "New Template",
            subject: "Hello",
            body: "<p>Content</p>",
          }),
        }
      );
      const response = await createEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "create" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe("tmpl-new");

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EmailTemplate",
          command: "create",
          body: expect.objectContaining({ name: "New Template" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          }),
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Access denied by policy AdminOnlyPolicy", 403)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Unauthorized Template" }),
        }
      );
      const response = await createEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "create" }),
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("AdminOnlyPolicy");
    });

    it("should return 422 on guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Guard 0 failed: name is required", 422)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "" }),
        }
      );
      const response = await createEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "create" }),
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Crash Template" }),
        }
      );
      const response = await createEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "create" }),
      });

      expect(response.status).toBe(500);
    });
  });

  // --------------------------------------------------------------- UPDATE
  describe("POST /api/communications/email-templates/commands/update", () => {
    beforeEach(() => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: "tmpl-001" })
      );
    });

    it("should update a template through manifest runtime", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: "tmpl-001", name: "Updated" })
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tmpl-001", name: "Updated" }),
        }
      );
      const response = await updateEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "update" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.name).toBe("Updated");
    });

    it("should return 403 on policy denial for update", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Access denied by policy AdminOnlyPolicy", 403)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tmpl-001" }),
        }
      );
      const response = await updateEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "update" }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure for update", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Guard 1 failed: subject cannot be empty", 422)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tmpl-001", subject: "" }),
        }
      );
      const response = await updateEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "update" }),
      });

      expect(response.status).toBe(422);
    });

    it("should return 400 on generic command failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Invalid data", 400)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tmpl-001" }),
        }
      );
      const response = await updateEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "update" }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Invalid data");
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tmpl-001" }),
        }
      );
      const response = await updateEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "update" }),
      });

      expect(response.status).toBe(500);
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tmpl-001" }),
        }
      );
      const response = await updateEmailTemplate(request, {
        params: Promise.resolve({ entity: "EmailTemplate", command: "update" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ---------------------------------------------------------- SOFT DELETE
  describe("POST /api/communications/email-templates/commands/soft-delete", () => {
    beforeEach(() => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: "tmpl-001" })
      );
    });

    it("should soft delete a template through manifest runtime", async () => {
      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tmpl-001" }),
        }
      );
      const response = await softDeleteEmailTemplate(request, {
        params: Promise.resolve({
          entity: "EmailTemplate",
          command: "softDelete",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EmailTemplate",
          command: "softDelete",
          body: expect.objectContaining({ id: "tmpl-001" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          }),
        })
      );
    });

    it("should return 403 on policy denial for delete", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Access denied by policy AdminOnlyPolicy", 403)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tmpl-001" }),
        }
      );
      const response = await softDeleteEmailTemplate(request, {
        params: Promise.resolve({
          entity: "EmailTemplate",
          command: "softDelete",
        }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "tmpl-001" }),
        }
      );
      const response = await softDeleteEmailTemplate(request, {
        params: Promise.resolve({
          entity: "EmailTemplate",
          command: "softDelete",
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});

// ===========================================================================
// EMAIL WORKFLOWS
// ===========================================================================

describe("Communications - Email Workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(requireCurrentUser).mockResolvedValue(MOCK_CURRENT_USER as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------ LIST
  describe("GET /api/communications/email-workflows/list", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/communications/email-workflows/list"
      );
      const response = await listEmailWorkflows(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/communications/email-workflows/list"
      );
      const response = await listEmailWorkflows(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Tenant not found");
    });

    it("should return email workflows for authenticated user", async () => {
      const mockWorkflows = [
        createMockEmailWorkflow({ id: "wf-1", name: "Onboarding" }),
        createMockEmailWorkflow({ id: "wf-2", name: "Follow-up" }),
      ];

      vi.mocked(database.emailWorkflow.findMany).mockResolvedValue(
        mockWorkflows as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/email-workflows/list"
      );
      const response = await listEmailWorkflows(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.emailWorkflows).toHaveLength(2);
    });

    it("should filter by tenantId and exclude soft-deleted", async () => {
      vi.mocked(database.emailWorkflow.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/communications/email-workflows/list"
      );
      await listEmailWorkflows(request);

      expect(database.emailWorkflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("should order results by createdAt descending", async () => {
      vi.mocked(database.emailWorkflow.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/communications/email-workflows/list"
      );
      await listEmailWorkflows(request);

      expect(database.emailWorkflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.emailWorkflow.findMany).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/communications/email-workflows/list"
      );
      const response = await listEmailWorkflows(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Internal server error");
    });
  });

  // ---------------------------------------------------------------- DETAIL
  describe("GET /api/communications/email-workflows/[id]", () => {
    it("should return a single email workflow by ID", async () => {
      const mockWorkflow = createMockEmailWorkflow({ id: "wf-001" });

      vi.mocked(database.emailWorkflow.findFirst).mockResolvedValue(
        mockWorkflow as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/email-workflows/wf-001"
      );
      const response = await getEmailWorkflow(request, {
        params: Promise.resolve({ id: "wf-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.emailWorkflow.id).toBe("wf-001");
    });

    it("should return 404 when workflow not found", async () => {
      vi.mocked(database.emailWorkflow.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/email-workflows/nonexistent"
      );
      const response = await getEmailWorkflow(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("EmailWorkflow not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      vi.mocked(database.emailWorkflow.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/email-workflows/wf-001"
      );
      await getEmailWorkflow(request, {
        params: Promise.resolve({ id: "wf-001" }),
      });

      expect(database.emailWorkflow.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "wf-001",
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/communications/email-workflows/wf-001"
      );
      const response = await getEmailWorkflow(request, {
        params: Promise.resolve({ id: "wf-001" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // --------------------------------------------------------------- CREATE
  describe("POST /api/communications/email-workflows/commands/create", () => {
    beforeEach(() => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: "wf-new" })
      );
    });

    it("should create a workflow through manifest runtime", async () => {
      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            name: "New Workflow",
            triggerType: "event_signup",
          }),
        }
      );
      const response = await createEmailWorkflow(request, {
        params: Promise.resolve({ entity: "EmailWorkflow", command: "create" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "wf-new" });

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EmailWorkflow",
          command: "create",
          body: expect.objectContaining({ name: "New Workflow" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          }),
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Access denied by policy AdminOnlyPolicy", 403)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Unauthorized Workflow" }),
        }
      );
      const response = await createEmailWorkflow(request, {
        params: Promise.resolve({ entity: "EmailWorkflow", command: "create" }),
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
    });

    it("should return 422 on guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Guard 0 failed: name is required", 422)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "" }),
        }
      );
      const response = await createEmailWorkflow(request, {
        params: Promise.resolve({ entity: "EmailWorkflow", command: "create" }),
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
    });

    it("should return 400 on generic command failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Invalid workflow data", 400)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await createEmailWorkflow(request, {
        params: Promise.resolve({ entity: "EmailWorkflow", command: "create" }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Invalid workflow data");
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Crash Workflow" }),
        }
      );
      const response = await createEmailWorkflow(request, {
        params: Promise.resolve({ entity: "EmailWorkflow", command: "create" }),
      });

      expect(response.status).toBe(500);
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test" }),
        }
      );
      const response = await createEmailWorkflow(request, {
        params: Promise.resolve({ entity: "EmailWorkflow", command: "create" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // --------------------------------------------------------------- UPDATE
  describe("POST /api/communications/email-workflows/commands/update", () => {
    beforeEach(() => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: "wf-001" })
      );
    });

    it("should update a workflow through manifest runtime", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: "wf-001", name: "Updated Workflow" })
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "wf-001", name: "Updated Workflow" }),
        }
      );
      const response = await updateEmailWorkflow(request, {
        params: Promise.resolve({ entity: "EmailWorkflow", command: "update" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.name).toBe("Updated Workflow");
    });

    it("should return 403 on policy denial for update", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Access denied by policy AdminOnlyPolicy", 403)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "wf-001" }),
        }
      );
      const response = await updateEmailWorkflow(request, {
        params: Promise.resolve({ entity: "EmailWorkflow", command: "update" }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "wf-001" }),
        }
      );
      const response = await updateEmailWorkflow(request, {
        params: Promise.resolve({ entity: "EmailWorkflow", command: "update" }),
      });

      expect(response.status).toBe(500);
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "wf-001" }),
        }
      );
      const response = await updateEmailWorkflow(request, {
        params: Promise.resolve({ entity: "EmailWorkflow", command: "update" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ---------------------------------------------------------- SOFT DELETE
  describe("POST /api/communications/email-workflows/commands/soft-delete", () => {
    beforeEach(() => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        successResponse({ id: "wf-001" })
      );
    });

    it("should soft delete a workflow through manifest runtime", async () => {
      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "wf-001" }),
        }
      );
      const response = await softDeleteEmailWorkflow(request, {
        params: Promise.resolve({
          entity: "EmailWorkflow",
          command: "softDelete",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EmailWorkflow",
          command: "softDelete",
          body: expect.objectContaining({ id: "wf-001" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          }),
        })
      );
    });

    it("should return 403 on policy denial for delete", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Access denied by policy AdminOnlyPolicy", 403)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "wf-001" }),
        }
      );
      const response = await softDeleteEmailWorkflow(request, {
        params: Promise.resolve({
          entity: "EmailWorkflow",
          command: "softDelete",
        }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure for delete", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        errorResponse("Guard 0 failed: Cannot delete active workflow", 422)
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "wf-001" }),
        }
      );
      const response = await softDeleteEmailWorkflow(request, {
        params: Promise.resolve({
          entity: "EmailWorkflow",
          command: "softDelete",
        }),
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "wf-001" }),
        }
      );
      const response = await softDeleteEmailWorkflow(request, {
        params: Promise.resolve({
          entity: "EmailWorkflow",
          command: "softDelete",
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});

// ===========================================================================
// SMS AUTOMATION RULES
// ===========================================================================

describe("Communications - SMS Automation Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(requireCurrentUser).mockResolvedValue(MOCK_CURRENT_USER as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------ LIST
  describe("GET /api/communications/sms/automation-rules", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules"
      );
      const response = await listSmsRules(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules"
      );
      const response = await listSmsRules(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should return SMS rules with pagination for authenticated user", async () => {
      const mockRules = [
        createMockSmsRule({ id: "rule-1", name: "Shift Reminder" }),
        createMockSmsRule({ id: "rule-2", name: "Event Notification" }),
      ];

      vi.mocked(database.sms_automation_rules.findMany).mockResolvedValue(
        mockRules as never
      );
      vi.mocked(database.sms_automation_rules.count).mockResolvedValue(2);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules"
      );
      const response = await listSmsRules(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.rules).toHaveLength(2);
      expect(body.pagination).toEqual({
        total: 2,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });

    it("should map snake_case database fields to camelCase in response", async () => {
      const mockRule = createMockSmsRule({ id: "rule-001" });

      vi.mocked(database.sms_automation_rules.findMany).mockResolvedValue([
        mockRule,
      ] as never);
      vi.mocked(database.sms_automation_rules.count).mockResolvedValue(1);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules"
      );
      const response = await listSmsRules(request);
      const body = await response.json();

      const rule = body.rules[0];
      expect(rule.id).toBe("rule-001");
      expect(rule.tenantId).toBe(TEST_TENANT_ID);
      expect(rule.triggerType).toBe("shift_scheduled");
      expect(rule.triggerConfig).toEqual({ hoursBefore: 2 });
      expect(rule.isActive).toBe(true);
    });

    it("should filter by tenant_id and exclude soft-deleted", async () => {
      vi.mocked(database.sms_automation_rules.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.sms_automation_rules.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules"
      );
      await listSmsRules(request);

      const expectedWhere = {
        tenant_id: TEST_TENANT_ID,
        deleted_at: null,
      };

      expect(database.sms_automation_rules.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere })
      );
      expect(database.sms_automation_rules.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere })
      );
    });

    it("should filter by isActive when query param provided", async () => {
      vi.mocked(database.sms_automation_rules.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.sms_automation_rules.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules?isActive=true"
      );
      await listSmsRules(request);

      expect(database.sms_automation_rules.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_active: true }),
        })
      );
    });

    it("should filter by triggerType when query param provided", async () => {
      vi.mocked(database.sms_automation_rules.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.sms_automation_rules.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules?triggerType=shift_scheduled"
      );
      await listSmsRules(request);

      expect(database.sms_automation_rules.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ trigger_type: "shift_scheduled" }),
        })
      );
    });

    it("should apply pagination with limit and offset", async () => {
      vi.mocked(database.sms_automation_rules.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.sms_automation_rules.count).mockResolvedValue(100);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules?limit=10&offset=20"
      );
      const response = await listSmsRules(request);
      const body = await response.json();

      expect(database.sms_automation_rules.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
      expect(body.pagination).toEqual({
        total: 100,
        limit: 10,
        offset: 20,
        hasMore: true,
      });
    });

    it("should order by priority ascending then created_at descending", async () => {
      vi.mocked(database.sms_automation_rules.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.sms_automation_rules.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules"
      );
      await listSmsRules(request);

      expect(database.sms_automation_rules.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ priority: "asc" }, { created_at: "desc" }],
        })
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.sms_automation_rules.findMany).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules"
      );
      const response = await listSmsRules(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ---------------------------------------------------------------- DETAIL
  describe("GET /api/communications/sms/automation-rules/[id]", () => {
    it("should return a single SMS rule by ID", async () => {
      const mockRule = createMockSmsRule({ id: "rule-001" });

      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        mockRule as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001"
      );
      const response = await getSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.rule.id).toBe("rule-001");
      expect(body.rule.name).toBe("Shift Reminder SMS");
      expect(body.rule.triggerType).toBe("shift_scheduled");
    });

    it("should return 404 when rule not found", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/nonexistent"
      );
      const response = await getSmsRule(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("SMS automation rule not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001"
      );
      await getSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(database.sms_automation_rules.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "rule-001",
            tenant_id: TEST_TENANT_ID,
            deleted_at: null,
          },
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001"
      );
      const response = await getSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001"
      );
      const response = await getSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // --------------------------------------------------------------- CREATE
  // SMS routes call createManifestRuntime directly (not the dispatcher).
  describe("POST /api/communications/sms/automation-rules", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "rule-new" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Rule", triggerType: "test" }),
        }
      );
      const response = await createSmsRule(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 when name is missing", async () => {
      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules",
        {
          method: "POST",
          body: JSON.stringify({ triggerType: "shift_scheduled" }),
        }
      );
      const response = await createSmsRule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toContain("name");
      expect(body.message).toContain("trigger type");
    });

    it("should return 400 when triggerType is missing", async () => {
      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Rule" }),
        }
      );
      const response = await createSmsRule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toContain("name");
      expect(body.message).toContain("trigger type");
    });

    it("should return 400 when neither templateId nor customMessage provided", async () => {
      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Rule", triggerType: "test" }),
        }
      );
      const response = await createSmsRule(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toContain("templateId");
      expect(body.message).toContain("customMessage");
    });

    it("should create a rule with customMessage through manifest runtime", async () => {
      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules",
        {
          method: "POST",
          body: JSON.stringify({
            name: "New Rule",
            triggerType: "shift_scheduled",
            customMessage: "Your shift starts soon!",
          }),
        }
      );
      const response = await createSmsRule(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.rule.customMessage).toBe("Your shift starts soon!");

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({ name: "New Rule" }),
        { entityName: "SmsAutomationRule" }
      );
    });

    it("should create a rule with templateId through manifest runtime", async () => {
      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Template Rule",
            triggerType: "event_signup",
            templateId: "tmpl-001",
          }),
        }
      );
      const response = await createSmsRule(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.rule.templateId).toBe("tmpl-001");
    });

    it("should apply default values for optional fields", async () => {
      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Minimal Rule",
            triggerType: "shift_scheduled",
            customMessage: "Hello",
          }),
        }
      );
      const response = await createSmsRule(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.rule.recipientType).toBe("employee");
      expect(body.rule.isActive).toBe(true);
      expect(body.rule.priority).toBe(100);
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "AdminOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Denied Rule",
            triggerType: "test",
            customMessage: "hi",
          }),
        }
      );
      const response = await createSmsRule(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 0, formatted: "Invalid trigger type" },
      });

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Bad Rule",
            triggerType: "invalid",
            customMessage: "hi",
          }),
        }
      );
      const response = await createSmsRule(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Crash Rule",
            triggerType: "test",
            customMessage: "hi",
          }),
        }
      );
      const response = await createSmsRule(request);

      expect(response.status).toBe(500);
    });
  });

  // --------------------------------------------------------------- UPDATE
  // SMS PATCH calls createManifestRuntime directly.
  describe("PATCH /api/communications/sms/automation-rules/[id]", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "rule-001" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);
    });

    it("should update an SMS rule through manifest runtime and database", async () => {
      const existingRule = createMockSmsRule({ id: "rule-001" });

      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        existingRule as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated Rule", priority: 5 }),
        }
      );
      const response = await patchSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.rule.name).toBe("Updated Rule");
      expect(body.rule.priority).toBe(5);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        expect.objectContaining({ id: "rule-001", name: "Updated Rule" }),
        { entityName: "SmsAutomationRule", instanceId: "rule-001" }
      );
    });

    it("should return 404 when rule not found for update", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/nonexistent",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        }
      );
      const response = await patchSmsRule(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe("SMS automation rule not found");
    });

    it("should return 403 on policy denial for update", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        createMockSmsRule() as never
      );

      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "AdminOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        }
      );
      const response = await patchSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure for update", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        createMockSmsRule() as never
      );

      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 0, formatted: "Invalid priority" },
      });

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001",
        {
          method: "PATCH",
          body: JSON.stringify({ priority: -1 }),
        }
      );
      const response = await patchSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(422);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        }
      );
      const response = await patchSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockRejectedValue(
        new Error("Database crash")
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        }
      );
      const response = await patchSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(500);
    });
  });

  // --------------------------------------------------------------- DELETE
  // SMS DELETE calls createManifestRuntime directly.
  describe("DELETE /api/communications/sms/automation-rules/[id]", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "rule-001" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);
    });

    it("should soft delete an SMS rule through manifest runtime", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        createMockSmsRule() as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001",
        { method: "DELETE" }
      );
      const response = await deleteSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "softDelete",
        { id: "rule-001" },
        { entityName: "SmsAutomationRule", instanceId: "rule-001" }
      );
    });

    it("should return 404 when rule not found for delete", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/nonexistent",
        { method: "DELETE" }
      );
      const response = await deleteSmsRule(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe("SMS automation rule not found");
    });

    it("should return 403 on policy denial for delete", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        createMockSmsRule() as never
      );

      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "AdminOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001",
        { method: "DELETE" }
      );
      const response = await deleteSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure for delete", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockResolvedValue(
        createMockSmsRule() as never
      );

      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 0, formatted: "Cannot delete active rule" },
      });

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001",
        { method: "DELETE" }
      );
      const response = await deleteSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001",
        { method: "DELETE" }
      );
      const response = await deleteSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(database.sms_automation_rules.findFirst).mockRejectedValue(
        new Error("Database crash")
      );

      const request = new NextRequest(
        "http://localhost/api/communications/sms/automation-rules/rule-001",
        { method: "DELETE" }
      );
      const response = await deleteSmsRule(request, {
        params: Promise.resolve({ id: "rule-001" }),
      });

      expect(response.status).toBe(500);
    });
  });
});
