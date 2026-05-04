/**
 * Training Domain API Integration Tests
 *
 * Tests cover:
 * - Module list (custom $queryRaw), detail, and auto-generated list
 * - Module create/update/soft-delete via manifest command handler
 * - Assignment list (custom $queryRaw), detail, and auto-generated list
 * - Assignment create/soft-delete via manifest command handler
 * - Training completion (start/complete actions)
 * - Auth checks, error paths, tenant isolation
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @repo/database with all delegates used by training routes
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    trainingModule: {
      findMany: vi.fn(),
    },
    trainingAssignment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
  Prisma: {
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    })),
    empty: { strings: [], values: [] },
  },
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/manifest-command-handler", () => ({
  executeManifestCommand: vi.fn(),
}));
vi.mock("@/lib/pagination", () => ({
  clampLimit: vi.fn().mockReturnValue(50),
}));
vi.mock("@/lib/sql-like", () => ({
  likeContains: vi.fn((s: string) => `%${s}%`),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { database } from "@repo/database";

const queryRawMock = database.$queryRaw as unknown as ReturnType<typeof vi.fn>;

import { auth } from "@repo/auth/server";
import { GET as getAssignment } from "@/app/api/training/assignments/[id]/route";
import { POST as createAssignmentCommand } from "@/app/api/training/assignments/commands/create/route";
import { POST as softDeleteAssignmentCommand } from "@/app/api/training/assignments/commands/soft-delete/route";
import { GET as listAssignmentsAutogen } from "@/app/api/training/assignments/list/route";
import {
  POST as createAssignmentViaHandler,
  GET as listAssignments,
} from "@/app/api/training/assignments/route";
import { POST as completeTraining } from "@/app/api/training/complete/route";
import {
  DELETE as deleteModule,
  GET as getModule,
  PUT as updateModule,
} from "@/app/api/training/modules/[id]/route";
import { POST as createModuleCommand } from "@/app/api/training/modules/commands/create/route";
import { POST as softDeleteModuleCommand } from "@/app/api/training/modules/commands/soft-delete/route";
import { POST as updateModuleCommand } from "@/app/api/training/modules/commands/update/route";
import { GET as listModulesAutogen } from "@/app/api/training/modules/list/route";
// Route handlers
import {
  POST as createModuleViaHandler,
  GET as listModules,
} from "@/app/api/training/modules/route";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import { createManifestRuntime } from "@/lib/manifest-runtime";

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "user_training_test";
const TEST_ORG_ID = "org_training_test";
const TEST_CLERK_ID = "clerk_training_test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockModuleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "mod-001",
    tenant_id: TEST_TENANT_ID,
    title: "Safety Basics",
    description: "Intro to workplace safety",
    content_url: "https://example.com/safety.pdf",
    content_type: "document",
    duration_minutes: 30,
    category: "safety",
    is_required: true,
    is_active: true,
    created_by: TEST_USER_ID,
    created_at: new Date("2026-01-15"),
    updated_at: new Date("2026-01-15"),
    assignment_count: BigInt(3),
    completion_count: BigInt(1),
    ...overrides,
  };
}

function mockAssignmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "assign-001",
    tenant_id: TEST_TENANT_ID,
    module_id: "mod-001",
    employee_id: "emp-001",
    assigned_to_all: false,
    assigned_by: TEST_USER_ID,
    due_date: new Date("2026-02-01"),
    status: "assigned",
    assigned_at: new Date("2026-01-15"),
    created_at: new Date("2026-01-15"),
    updated_at: new Date("2026-01-15"),
    employee_first_name: "Jane",
    employee_last_name: "Doe",
    employee_email: "jane@example.com",
    module_title: "Safety Basics",
    module_content_type: "document",
    completion_id: null,
    completion_started_at: null,
    completion_completed_at: null,
    completion_score: null,
    completion_passed: false,
    ...overrides,
  };
}

function setupAuthMocks(
  opts: { userId?: string | null; orgId?: string | null } = {}
) {
  vi.mocked(auth).mockResolvedValue({
    userId: opts.userId ?? TEST_USER_ID,
    orgId: opts.orgId ?? TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    authUserId: TEST_CLERK_ID,
  } as never);
}

function setupCommandMocks() {
  const mockRunCommand = vi.fn();
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
  return mockRunCommand;
}

function setupUserLookup() {
  vi.mocked(database.user.findFirst).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    authUserId: TEST_CLERK_ID,
  } as never);
}

// ===========================================================================
// TESTS
// ===========================================================================

describe("Training API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =======================================================================
  // MODULES -- Custom list endpoint (GET /api/training/modules)
  // =======================================================================
  describe("GET /api/training/modules (custom list)", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest("http://localhost/api/training/modules");
      const response = await listModules(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("should return modules with pagination", async () => {
      const mockRows = [
        mockModuleRow({ id: "mod-1", title: "Module A" }),
        mockModuleRow({ id: "mod-2", title: "Module B" }),
      ];

      let callCount = 0;
      queryRawMock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return mockRows as never;
        return [{ count: BigInt(2) }] as never;
      });

      const request = new NextRequest("http://localhost/api/training/modules");
      const response = await listModules(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.modules).toHaveLength(2);
      expect(body.modules[0].id).toBe("mod-1");
      expect(body.pagination.total).toBe(2);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(50);
    });

    it("should pass category filter to query", async () => {
      let callCount = 0;
      queryRawMock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return [] as never;
        return [{ count: BigInt(0) }] as never;
      });

      const request = new NextRequest(
        "http://localhost/api/training/modules?category=safety"
      );
      await listModules(request);

      // Should have been called twice (data + count)
      expect(database.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("should clamp limit to 200 maximum", async () => {
      let callCount = 0;
      queryRawMock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return [] as never;
        return [{ count: BigInt(0) }] as never;
      });

      const request = new NextRequest(
        "http://localhost/api/training/modules?limit=999999"
      );
      const response = await listModules(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.pagination.limit).toBe(200);
    });

    it("should handle empty results gracefully", async () => {
      let callCount = 0;
      queryRawMock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return [] as never;
        return [{ count: BigInt(0) }] as never;
      });

      const request = new NextRequest("http://localhost/api/training/modules");
      const response = await listModules(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.modules).toHaveLength(0);
      expect(body.pagination.total).toBe(0);
      expect(body.pagination.totalPages).toBe(0);
    });

    it("should convert bigint counts to numbers in response", async () => {
      const row = mockModuleRow({
        assignment_count: BigInt(10),
        completion_count: BigInt(5),
      });
      let callCount = 0;
      queryRawMock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return [row] as never;
        return [{ count: BigInt(1) }] as never;
      });

      const request = new NextRequest("http://localhost/api/training/modules");
      const response = await listModules(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(typeof body.modules[0].assignment_count).toBe("number");
      expect(typeof body.modules[0].completion_count).toBe("number");
      expect(body.modules[0].assignment_count).toBe(10);
      expect(body.modules[0].completion_count).toBe(5);
    });
  });

  // =======================================================================
  // MODULES -- Auto-generated list endpoint (GET /api/training/modules/list)
  // =======================================================================
  describe("GET /api/training/modules/list (auto-generated)", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/training/modules/list"
      );
      const response = await listModulesAutogen(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/training/modules/list"
      );
      const response = await listModulesAutogen(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should return training modules list", async () => {
      const mockModules = [
        { id: "mod-1", title: "Safety 101", tenant_id: TEST_TENANT_ID },
        { id: "mod-2", title: "Hygiene 101", tenant_id: TEST_TENANT_ID },
      ];

      vi.mocked(database.trainingModule.findMany).mockResolvedValue(
        mockModules as never
      );

      const request = new NextRequest(
        "http://localhost/api/training/modules/list"
      );
      const response = await listModulesAutogen(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.trainingModules).toHaveLength(2);
    });

    it("should filter by tenant_id and exclude soft-deleted", async () => {
      vi.mocked(database.trainingModule.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        "http://localhost/api/training/modules/list"
      );
      await listModulesAutogen(request);

      expect(database.trainingModule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenant_id: TEST_TENANT_ID,
            deleted_at: null,
          },
        })
      );
    });

    it("should order results by created_at descending", async () => {
      vi.mocked(database.trainingModule.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        "http://localhost/api/training/modules/list"
      );
      await listModulesAutogen(request);

      expect(database.trainingModule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: "desc" },
        })
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.trainingModule.findMany).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/training/modules/list"
      );
      const response = await listModulesAutogen(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // =======================================================================
  // MODULES -- Detail (GET /api/training/modules/[id])
  // =======================================================================
  describe("GET /api/training/modules/[id]", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/training/modules/mod-001"
      );
      const response = await getModule(request, {
        params: Promise.resolve({ id: "mod-001" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return a single training module", async () => {
      const mockRow = {
        id: "mod-001",
        tenant_id: TEST_TENANT_ID,
        title: "Safety Basics",
        description: "Intro",
        content_url: null,
        content_type: "video",
        duration_minutes: 45,
        category: "safety",
        is_required: true,
        is_active: true,
        created_by: TEST_USER_ID,
        created_at: new Date("2026-01-15"),
        updated_at: new Date("2026-01-15"),
      };

      queryRawMock.mockResolvedValue([mockRow] as never);

      const request = new NextRequest(
        "http://localhost/api/training/modules/mod-001"
      );
      const response = await getModule(request, {
        params: Promise.resolve({ id: "mod-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.module.id).toBe("mod-001");
      expect(body.module.title).toBe("Safety Basics");
    });

    it("should return 404 when module not found", async () => {
      queryRawMock.mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/training/modules/nonexistent"
      );
      const response = await getModule(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe("Training module not found");
    });
  });

  // =======================================================================
  // MODULES -- Create via handler (POST /api/training/modules)
  // =======================================================================
  describe("POST /api/training/modules (via manifest runtime + raw SQL)", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      setupCommandMocks();
      setupUserLookup();
      mockRunCommand.mockReset();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);
    });

    it("should create module through manifest runtime validation + raw SQL insert", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "mod-new" },
        emittedEvents: [{ type: "created" }],
      });

      const insertedRow = {
        id: "mod-new",
        tenant_id: TEST_TENANT_ID,
        title: "New Module",
        description: null,
        content_type: "video",
        duration_minutes: null,
        category: null,
        is_required: false,
        is_active: true,
        content_url: null,
        created_by: TEST_USER_ID,
        created_at: new Date("2026-01-15"),
        updated_at: new Date("2026-01-15"),
      };
      queryRawMock.mockResolvedValue([insertedRow] as never);

      const request = new NextRequest("http://localhost/api/training/modules", {
        method: "POST",
        body: JSON.stringify({
          title: "New Module",
          contentType: "video",
        }),
      });
      const response = await createModuleViaHandler(request);

      expect(response.status).toBe(200);

      // Verify manifest runtime was used for validation
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({
          title: "New Module",
          contentType: "video",
        }),
        { entityName: "TrainingModule" }
      );

      // Verify raw SQL INSERT was called for persistence
      expect(database.$queryRaw).toHaveBeenCalled();

      const body = await response.json();
      expect(body.result.id).toBe("mod-new");
      expect(body.result.title).toBe("New Module");
      expect(body.events).toEqual([{ type: "created" }]);
    });

    it("should apply defaults to command payload", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "mod-new" },
        emittedEvents: [],
      });

      const insertedRow = {
        id: "mod-new",
        tenant_id: TEST_TENANT_ID,
        title: "My Module",
        description: null,
        content_type: "document",
        duration_minutes: null,
        category: null,
        is_required: false,
        is_active: true,
        content_url: null,
        created_by: TEST_USER_ID,
        created_at: new Date("2026-01-15"),
        updated_at: new Date("2026-01-15"),
      };
      queryRawMock.mockResolvedValue([insertedRow] as never);

      const request = new NextRequest("http://localhost/api/training/modules", {
        method: "POST",
        body: JSON.stringify({ title: "My Module" }),
      });
      await createModuleViaHandler(request);

      // Verify runCommand received defaults
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({
          title: "My Module",
          contentType: "document", // default
          isRequired: false, // default
          durationMinutes: 0, // default
          contentUrl: "", // default
          createdBy: TEST_USER_ID,
        }),
        { entityName: "TrainingModule" }
      );
    });

    it("should return 403 on policy denial from manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "AdminOnlyPolicy" },
      });

      const request = new NextRequest("http://localhost/api/training/modules", {
        method: "POST",
        body: JSON.stringify({ title: "Unauthorized" }),
      });
      const response = await createModuleViaHandler(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
    });

    it("should return 422 on guard failure from manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 0, formatted: "title is required" },
      });

      const request = new NextRequest("http://localhost/api/training/modules", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await createModuleViaHandler(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
    });
  });

  // =======================================================================
  // MODULES -- Update via handler (PUT /api/training/modules/[id])
  // =======================================================================
  describe("PUT /api/training/modules/[id] (via executeManifestCommand)", () => {
    it("should delegate to executeManifestCommand with correct params", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      vi.mocked(executeManifestCommand).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/training/modules/mod-001",
        {
          method: "PUT",
          body: JSON.stringify({ title: "Updated Title" }),
        }
      );
      const response = await updateModule(request, {
        params: Promise.resolve({ id: "mod-001" }),
      });

      expect(response.status).toBe(200);
      expect(executeManifestCommand).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          entityName: "TrainingModule",
          commandName: "update",
          params: { id: "mod-001" },
        })
      );
    });
  });

  // =======================================================================
  // MODULES -- Delete via handler (DELETE /api/training/modules/[id])
  // =======================================================================
  describe("DELETE /api/training/modules/[id] (via executeManifestCommand)", () => {
    it("should delegate to executeManifestCommand with softDelete", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      vi.mocked(executeManifestCommand).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/training/modules/mod-001",
        { method: "DELETE" }
      );
      const response = await deleteModule(request, {
        params: Promise.resolve({ id: "mod-001" }),
      });

      expect(response.status).toBe(200);
      expect(executeManifestCommand).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          entityName: "TrainingModule",
          commandName: "softDelete",
          params: { id: "mod-001" },
        })
      );
    });
  });

  // =======================================================================
  // MODULES -- Create command (POST /api/training/modules/commands/create)
  // =======================================================================
  describe("POST /api/training/modules/commands/create", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      setupCommandMocks();
      setupUserLookup();
      mockRunCommand.mockReset();
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
        "http://localhost/api/training/modules/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      const response = await createModuleCommand(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      const response = await createModuleCommand(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("should return 400 when user not found in database", async () => {
      vi.mocked(database.user.findFirst).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      const response = await createModuleCommand(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("User not found in database");
    });

    it("should create a module through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "mod-new" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Fire Safety",
            contentType: "video",
            durationMinutes: 30,
          }),
        }
      );
      const response = await createModuleCommand(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "mod-new" });

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({ title: "Fire Safety" }),
        { entityName: "TrainingModule" }
      );
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "AdminOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Unauthorized" }),
        }
      );
      const response = await createModuleCommand(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("AdminOnlyPolicy");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "title is required",
        },
      });

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await createModuleCommand(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("title is required");
    });

    it("should return 400 when command fails without policy/guard", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Invalid module data",
      });

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await createModuleCommand(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Invalid module data");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ title: "Crash" }),
        }
      );
      const response = await createModuleCommand(request);

      expect(response.status).toBe(500);
    });
  });

  // =======================================================================
  // MODULES -- Update command (POST /api/training/modules/commands/update)
  // =======================================================================
  describe("POST /api/training/modules/commands/update", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      setupCommandMocks();
      setupUserLookup();
      mockRunCommand.mockReset();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);
    });

    it("should update a module through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "mod-001", title: "Updated Title" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/update",
        {
          method: "POST",
          body: JSON.stringify({
            id: "mod-001",
            title: "Updated Title",
          }),
        }
      );
      const response = await updateModuleCommand(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        expect.objectContaining({ title: "Updated Title" }),
        { entityName: "TrainingModule" }
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/update",
        {
          method: "POST",
          body: JSON.stringify({ id: "mod-001" }),
        }
      );
      const response = await updateModuleCommand(request);

      expect(response.status).toBe(401);
    });
  });

  // =======================================================================
  // MODULES -- Soft-delete command
  // =======================================================================
  describe("POST /api/training/modules/commands/soft-delete", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      setupCommandMocks();
      setupUserLookup();
      mockRunCommand.mockReset();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);
    });

    it("should soft-delete a module through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "mod-001" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/soft-delete",
        {
          method: "POST",
          body: JSON.stringify({ id: "mod-001" }),
        }
      );
      const response = await softDeleteModuleCommand(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "softDelete",
        expect.objectContaining({ id: "mod-001" }),
        { entityName: "TrainingModule" }
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/soft-delete",
        {
          method: "POST",
          body: JSON.stringify({ id: "mod-001" }),
        }
      );
      const response = await softDeleteModuleCommand(request);

      expect(response.status).toBe(401);
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "AdminOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/training/modules/commands/soft-delete",
        {
          method: "POST",
          body: JSON.stringify({ id: "mod-001" }),
        }
      );
      const response = await softDeleteModuleCommand(request);

      expect(response.status).toBe(403);
    });
  });

  // =======================================================================
  // ASSIGNMENTS -- Custom list endpoint (GET /api/training/assignments)
  // =======================================================================
  describe("GET /api/training/assignments (custom list)", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/training/assignments"
      );
      const response = await listAssignments(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("should return assignments with pagination", async () => {
      const mockRows = [
        mockAssignmentRow({ id: "assign-1" }),
        mockAssignmentRow({ id: "assign-2", employee_first_name: "John" }),
      ];

      let callCount = 0;
      queryRawMock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return mockRows as never;
        return [{ count: BigInt(2) }] as never;
      });

      const request = new NextRequest(
        "http://localhost/api/training/assignments"
      );
      const response = await listAssignments(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assignments).toHaveLength(2);
      expect(body.pagination.total).toBe(2);
    });

    it("should include completion data when present", async () => {
      const row = mockAssignmentRow({
        completion_id: "comp-001",
        completion_started_at: new Date("2026-01-20"),
        completion_completed_at: new Date("2026-01-21"),
        completion_score: 85,
        completion_passed: true,
      });

      let callCount = 0;
      queryRawMock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return [row] as never;
        return [{ count: BigInt(1) }] as never;
      });

      const request = new NextRequest(
        "http://localhost/api/training/assignments"
      );
      const response = await listAssignments(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assignments[0].completion).toBeDefined();
      expect(body.assignments[0].completion.id).toBe("comp-001");
      expect(body.assignments[0].completion.score).toBe(85);
      expect(body.assignments[0].completion.passed).toBe(true);
    });

    it("should have undefined completion when no completion record", async () => {
      const row = mockAssignmentRow({
        completion_id: null,
        completion_started_at: null,
        completion_completed_at: null,
        completion_score: null,
        completion_passed: false,
      });

      let callCount = 0;
      queryRawMock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return [row] as never;
        return [{ count: BigInt(1) }] as never;
      });

      const request = new NextRequest(
        "http://localhost/api/training/assignments"
      );
      const response = await listAssignments(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assignments[0].completion).toBeUndefined();
    });

    it("should include embedded module data", async () => {
      const row = mockAssignmentRow({
        module_title: "Fire Safety",
        module_content_type: "video",
      });

      let callCount = 0;
      queryRawMock.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return [row] as never;
        return [{ count: BigInt(1) }] as never;
      });

      const request = new NextRequest(
        "http://localhost/api/training/assignments"
      );
      const response = await listAssignments(request);

      const body = await response.json();
      expect(body.assignments[0].module.title).toBe("Fire Safety");
      expect(body.assignments[0].module.content_type).toBe("video");
    });
  });

  // =======================================================================
  // ASSIGNMENTS -- Auto-generated list (GET /api/training/assignments/list)
  // =======================================================================
  describe("GET /api/training/assignments/list (auto-generated)", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/training/assignments/list"
      );
      const response = await listAssignmentsAutogen(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/training/assignments/list"
      );
      const response = await listAssignmentsAutogen(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("should return assignments list", async () => {
      const mockAssignments = [
        { id: "assign-1", tenant_id: TEST_TENANT_ID, status: "assigned" },
        { id: "assign-2", tenant_id: TEST_TENANT_ID, status: "completed" },
      ];

      vi.mocked(database.trainingAssignment.findMany).mockResolvedValue(
        mockAssignments as never
      );

      const request = new NextRequest(
        "http://localhost/api/training/assignments/list"
      );
      const response = await listAssignmentsAutogen(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.trainingAssignments).toHaveLength(2);
    });

    it("should filter by tenant_id and exclude soft-deleted", async () => {
      vi.mocked(database.trainingAssignment.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        "http://localhost/api/training/assignments/list"
      );
      await listAssignmentsAutogen(request);

      expect(database.trainingAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenant_id: TEST_TENANT_ID,
            deleted_at: null,
          },
        })
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.trainingAssignment.findMany).mockRejectedValue(
        new Error("DB error")
      );

      const request = new NextRequest(
        "http://localhost/api/training/assignments/list"
      );
      const response = await listAssignmentsAutogen(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // =======================================================================
  // ASSIGNMENTS -- Detail (GET /api/training/assignments/[id])
  // =======================================================================
  describe("GET /api/training/assignments/[id]", () => {
    it("should return a single assignment", async () => {
      const mockAssignment = {
        id: "assign-001",
        tenant_id: TEST_TENANT_ID,
        module_id: "mod-001",
        status: "assigned",
      };

      vi.mocked(database.trainingAssignment.findFirst).mockResolvedValue(
        mockAssignment as never
      );

      const request = new NextRequest(
        "http://localhost/api/training/assignments/assign-001"
      );
      const response = await getAssignment(request, {
        params: Promise.resolve({ id: "assign-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.trainingAssignment.id).toBe("assign-001");
    });

    it("should return 404 when assignment not found", async () => {
      vi.mocked(database.trainingAssignment.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/training/assignments/nonexistent"
      );
      const response = await getAssignment(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe("TrainingAssignment not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      vi.mocked(database.trainingAssignment.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/training/assignments/assign-001"
      );
      await getAssignment(request, {
        params: Promise.resolve({ id: "assign-001" }),
      });

      expect(database.trainingAssignment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "assign-001",
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
        "http://localhost/api/training/assignments/assign-001"
      );
      const response = await getAssignment(request, {
        params: Promise.resolve({ id: "assign-001" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/training/assignments/assign-001"
      );
      const response = await getAssignment(request, {
        params: Promise.resolve({ id: "assign-001" }),
      });

      expect(response.status).toBe(400);
    });
  });

  // =======================================================================
  // ASSIGNMENTS -- Create via handler (POST /api/training/assignments)
  // =======================================================================
  describe("POST /api/training/assignments (via executeManifestCommand)", () => {
    it("should delegate to executeManifestCommand", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      vi.mocked(executeManifestCommand).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/training/assignments",
        {
          method: "POST",
          body: JSON.stringify({
            moduleId: "mod-001",
            employeeId: "emp-001",
          }),
        }
      );
      const response = await createAssignmentViaHandler(request);

      expect(response.status).toBe(200);
      expect(executeManifestCommand).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          entityName: "TrainingAssignment",
          commandName: "create",
        })
      );
    });

    it("should pass transformBody with assignedBy from context", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      vi.mocked(executeManifestCommand).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/training/assignments",
        {
          method: "POST",
          body: JSON.stringify({ moduleId: "mod-001", employeeId: "emp-001" }),
        }
      );
      await createAssignmentViaHandler(request);

      const callArgs = vi.mocked(executeManifestCommand).mock.calls[0][1];
      const ctx = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      };
      const transformed = callArgs.transformBody!(
        { moduleId: "mod-001", employeeId: "emp-001" },
        ctx
      );

      expect(transformed.assignedBy).toBe(TEST_USER_ID);
      expect(transformed.moduleId).toBe("mod-001");
      expect(transformed.employeeId).toBe("emp-001");
    });
  });

  // =======================================================================
  // ASSIGNMENTS -- Create command (auto-generated)
  // =======================================================================
  describe("POST /api/training/assignments/commands/create", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      setupCommandMocks();
      setupUserLookup();
      mockRunCommand.mockReset();
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
        "http://localhost/api/training/assignments/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ moduleId: "mod-001" }),
        }
      );
      const response = await createAssignmentCommand(request);

      expect(response.status).toBe(401);
    });

    it("should create an assignment through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "assign-new" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/training/assignments/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            moduleId: "mod-001",
            employeeId: "emp-001",
            dueDate: "2026-02-01",
          }),
        }
      );
      const response = await createAssignmentCommand(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "assign-new" });

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({
          moduleId: "mod-001",
          employeeId: "emp-001",
        }),
        { entityName: "TrainingAssignment" }
      );
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagerOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/training/assignments/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ moduleId: "mod-001" }),
        }
      );
      const response = await createAssignmentCommand(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 1,
          formatted: "moduleId is required",
        },
      });

      const request = new NextRequest(
        "http://localhost/api/training/assignments/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await createAssignmentCommand(request);

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 1 failed");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = new NextRequest(
        "http://localhost/api/training/assignments/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ moduleId: "mod-001" }),
        }
      );
      const response = await createAssignmentCommand(request);

      expect(response.status).toBe(500);
    });

    it("should return 400 when user not found in database", async () => {
      vi.mocked(database.user.findFirst).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/training/assignments/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ moduleId: "mod-001" }),
        }
      );
      const response = await createAssignmentCommand(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("User not found in database");
    });
  });

  // =======================================================================
  // ASSIGNMENTS -- Soft-delete command (auto-generated)
  // =======================================================================
  describe("POST /api/training/assignments/commands/soft-delete", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      setupCommandMocks();
      setupUserLookup();
      mockRunCommand.mockReset();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);
    });

    it("should soft-delete an assignment through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "assign-001" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/training/assignments/commands/soft-delete",
        {
          method: "POST",
          body: JSON.stringify({ id: "assign-001" }),
        }
      );
      const response = await softDeleteAssignmentCommand(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "softDelete",
        expect.objectContaining({ id: "assign-001" }),
        { entityName: "TrainingAssignment" }
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/training/assignments/commands/soft-delete",
        {
          method: "POST",
          body: JSON.stringify({ id: "assign-001" }),
        }
      );
      const response = await softDeleteAssignmentCommand(request);

      expect(response.status).toBe(401);
    });
  });

  // =======================================================================
  // COMPLETION -- Start action (POST /api/training/complete)
  // =======================================================================
  describe("POST /api/training/complete", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/training/complete",
        {
          method: "POST",
          body: JSON.stringify({
            assignmentId: "assign-001",
            action: "start",
          }),
        }
      );
      const response = await completeTraining(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 when assignmentId is missing", async () => {
      const request = new NextRequest(
        "http://localhost/api/training/complete",
        {
          method: "POST",
          body: JSON.stringify({ action: "start" }),
        }
      );
      const response = await completeTraining(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Assignment ID is required");
    });

    it("should return 404 when assignment not found", async () => {
      queryRawMock.mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/training/complete",
        {
          method: "POST",
          body: JSON.stringify({
            assignmentId: "nonexistent",
            action: "start",
          }),
        }
      );
      const response = await completeTraining(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe("Assignment not found");
    });

    describe("action: start", () => {
      const mockAssignment = {
        id: "assign-001",
        module_id: "mod-001",
        employee_id: "emp-001",
        assigned_to_all: false,
        status: "assigned",
      };

      it("should start training and return completion record", async () => {
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) return [mockAssignment] as never;
          if (queryCallCount === 2) return [{ id: "emp-001" }] as never;
          if (queryCallCount === 3) return [] as never; // no existing completion
          if (queryCallCount === 4) return [{ id: "emp-001" }] as never;
          if (queryCallCount === 5) {
            return [
              { id: "comp-new", started_at: new Date("2026-01-20") },
            ] as never;
          }
          return [] as never;
        });
        vi.mocked(database.$executeRaw).mockResolvedValue(1 as never);

        const request = new NextRequest(
          "http://localhost/api/training/complete",
          {
            method: "POST",
            body: JSON.stringify({
              assignmentId: "assign-001",
              action: "start",
            }),
          }
        );
        const response = await completeTraining(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.completion.id).toBe("comp-new");
        expect(body.completion.started_at).toBeDefined();

        // Verify status was updated to in_progress
        expect(database.$executeRaw).toHaveBeenCalled();
      });

      it("should return existing completion if already started", async () => {
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) return [mockAssignment] as never;
          if (queryCallCount === 2) return [{ id: "emp-001" }] as never;
          if (queryCallCount === 3) {
            return [
              { id: "comp-existing", started_at: new Date("2026-01-19") },
            ] as never;
          }
          return [] as never;
        });

        const request = new NextRequest(
          "http://localhost/api/training/complete",
          {
            method: "POST",
            body: JSON.stringify({
              assignmentId: "assign-001",
              action: "start",
            }),
          }
        );
        const response = await completeTraining(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.completion.id).toBe("comp-existing");
        expect(body.message).toBe("Training already started");
      });

      it("should return 403 if user is not the assigned employee", async () => {
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) return [mockAssignment] as never;
          // Return a different employee ID
          if (queryCallCount === 2) return [{ id: "emp-other" }] as never;
          return [] as never;
        });

        const request = new NextRequest(
          "http://localhost/api/training/complete",
          {
            method: "POST",
            body: JSON.stringify({
              assignmentId: "assign-001",
              action: "start",
            }),
          }
        );
        const response = await completeTraining(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toBe("You are not assigned to this training");
      });

      it("should return 404 if employee record not found for start", async () => {
        const assignedToAllAssignment = {
          ...mockAssignment,
          assigned_to_all: true,
          employee_id: null,
        };
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) return [assignedToAllAssignment] as never;
          if (queryCallCount === 2) return [] as never; // no existing completions
          if (queryCallCount === 3) return [] as never; // no employee record
          return [] as never;
        });

        const request = new NextRequest(
          "http://localhost/api/training/complete",
          {
            method: "POST",
            body: JSON.stringify({
              assignmentId: "assign-001",
              action: "start",
            }),
          }
        );
        const response = await completeTraining(request);

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.message).toBe("Employee record not found");
      });
    });

    describe("action: complete", () => {
      const mockAssignment = {
        id: "assign-001",
        module_id: "mod-001",
        employee_id: "emp-001",
        assigned_to_all: false,
        status: "in_progress",
      };

      it("should complete training and return completion with score", async () => {
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) return [mockAssignment] as never;
          if (queryCallCount === 2) return [{ id: "emp-001" }] as never; // auth check
          if (queryCallCount === 3) return [{ id: "emp-001" }] as never; // employeeId lookup
          if (queryCallCount === 4) {
            return [
              {
                id: "comp-001",
                completed_at: new Date("2026-01-22"),
                score: 92,
                passed: true,
              },
            ] as never;
          }
          return [] as never;
        });
        vi.mocked(database.$executeRaw).mockResolvedValue(1 as never);

        const request = new NextRequest(
          "http://localhost/api/training/complete",
          {
            method: "POST",
            body: JSON.stringify({
              assignmentId: "assign-001",
              action: "complete",
              score: 92,
              passed: true,
            }),
          }
        );
        const response = await completeTraining(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.completion.id).toBe("comp-001");
        expect(body.completion.score).toBe(92);
        expect(body.completion.passed).toBe(true);

        // Verify status was updated to completed
        expect(database.$executeRaw).toHaveBeenCalled();
      });

      it("should complete training with default passed=true when omitted", async () => {
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) return [mockAssignment] as never;
          if (queryCallCount === 2) return [{ id: "emp-001" }] as never; // auth check
          if (queryCallCount === 3) return [{ id: "emp-001" }] as never; // employeeId lookup
          if (queryCallCount === 4) {
            return [
              {
                id: "comp-001",
                completed_at: new Date("2026-01-22"),
                score: null,
                passed: true,
              },
            ] as never;
          }
          return [] as never;
        });
        vi.mocked(database.$executeRaw).mockResolvedValue(1 as never);

        const request = new NextRequest(
          "http://localhost/api/training/complete",
          {
            method: "POST",
            body: JSON.stringify({
              assignmentId: "assign-001",
              action: "complete",
            }),
          }
        );
        const response = await completeTraining(request);

        expect(response.status).toBe(200);
      });

      it("should return 403 if user is not the assigned employee for complete", async () => {
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) return [mockAssignment] as never;
          if (queryCallCount === 2) return [{ id: "emp-other" }] as never;
          return [] as never;
        });

        const request = new NextRequest(
          "http://localhost/api/training/complete",
          {
            method: "POST",
            body: JSON.stringify({
              assignmentId: "assign-001",
              action: "complete",
            }),
          }
        );
        const response = await completeTraining(request);

        expect(response.status).toBe(403);
      });

      it("should return 404 if employee record not found for complete", async () => {
        const assignedToAllAssignment = {
          ...mockAssignment,
          assigned_to_all: true,
          employee_id: null,
        };
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) return [assignedToAllAssignment] as never;
          if (queryCallCount === 2) return [] as never; // no employee record
          return [] as never;
        });

        const request = new NextRequest(
          "http://localhost/api/training/complete",
          {
            method: "POST",
            body: JSON.stringify({
              assignmentId: "assign-001",
              action: "complete",
            }),
          }
        );
        const response = await completeTraining(request);

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.message).toBe("Employee record not found");
      });
    });

    describe("action: invalid", () => {
      it("should return 400 for invalid action", async () => {
        const mockAssignment = {
          id: "assign-001",
          module_id: "mod-001",
          employee_id: "emp-001",
          assigned_to_all: true,
          status: "assigned",
        };
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) return [mockAssignment] as never;
          return [] as never;
        });

        const request = new NextRequest(
          "http://localhost/api/training/complete",
          {
            method: "POST",
            body: JSON.stringify({
              assignmentId: "assign-001",
              action: "invalid_action",
            }),
          }
        );
        const response = await completeTraining(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Invalid action. Use 'start' or 'complete'");
      });
    });

    it("should return 500 on database error during completion", async () => {
      const mockAssignment = {
        id: "assign-001",
        module_id: "mod-001",
        employee_id: "emp-001",
        assigned_to_all: true,
        status: "assigned",
      };
      let queryCallCount = 0;
      queryRawMock.mockImplementation(async () => {
        queryCallCount++;
        if (queryCallCount === 1) return [mockAssignment] as never;
        throw new Error("Database crash");
      });

      const request = new NextRequest(
        "http://localhost/api/training/complete",
        {
          method: "POST",
          body: JSON.stringify({
            assignmentId: "assign-001",
            action: "start",
          }),
        }
      );
      const response = await completeTraining(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Failed to process training completion");
    });
  });
});
