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
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    trainingAssignment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    trainingCompletion: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  Prisma: {
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    })),
    empty: { strings: [], values: [] },
    Decimal: class DecimalMock {
      value: string;
      constructor(v: string | number) {
        this.value = String(v);
      }
    },
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
vi.mock("@/lib/pagination", () => ({
  clampLimit: vi.fn().mockReturnValue(50),
}));
vi.mock("@/lib/sql-like", () => ({
  likeContains: vi.fn((s: string) => `%${s}%`),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: vi.fn((data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      )
    ),
    manifestErrorResponse: vi.fn(
      (
        message: string | { error: string; diagnostics?: unknown[] },
        status: number
      ) => {
        const body =
          typeof message === "string"
            ? { success: false, message }
            : {
                success: false,
                error: message.error,
                diagnostics: message.diagnostics ?? [],
              };
        return NextResponse.json(body, { status });
      }
    ),
  };
});
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
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

import { database } from "@repo/database";

const queryRawMock = database.$queryRaw as ReturnType<typeof vi.fn>;

import { auth } from "@repo/auth/server";
import {
  POST as createAssignmentCommand,
  POST as createModuleCommand,
  POST as softDeleteAssignmentCommand,
  POST as softDeleteModuleCommand,
  POST as updateModuleCommand,
} from "@/app/api/manifest/[entity]/commands/[command]/route";
import { GET as getAssignment } from "@/app/api/training/assignments/[id]/route";
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
import { GET as listModulesAutogen } from "@/app/api/training/modules/list/route";
// Route handlers
import {
  POST as createModuleViaHandler,
  GET as listModules,
} from "@/app/api/training/modules/route";
import {
  getTenantIdForOrg,
  requireCurrentUser,
  resolveCurrentUser,
} from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "user_training_test";
const TEST_ORG_ID = "org_training_test";
const TEST_CLERK_ID = "clerk_training_test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  vi.mocked(resolveCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    authUserId: TEST_CLERK_ID,
  } as never);
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
        {
          id: "mod-1",
          tenantId: TEST_TENANT_ID,
          title: "Module A",
          description: "Desc A",
          contentUrl: null,
          contentType: "document",
          durationMinutes: 30,
          category: "safety",
          isRequired: true,
          isActive: true,
          createdBy: TEST_USER_ID,
          createdAt: new Date("2026-01-15"),
          updatedAt: new Date("2026-01-15"),
          _count: { assignments: 3, completions: 1 },
        },
        {
          id: "mod-2",
          tenantId: TEST_TENANT_ID,
          title: "Module B",
          description: "Desc B",
          contentUrl: null,
          contentType: "video",
          durationMinutes: 45,
          category: "hygiene",
          isRequired: false,
          isActive: true,
          createdBy: TEST_USER_ID,
          createdAt: new Date("2026-01-14"),
          updatedAt: new Date("2026-01-14"),
          _count: { assignments: 0, completions: 0 },
        },
      ];

      vi.mocked(database.trainingModule.findMany).mockResolvedValue(
        mockRows as never
      );
      vi.mocked(database.trainingModule.count).mockResolvedValue(2);

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
      vi.mocked(database.trainingModule.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.trainingModule.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/training/modules?category=safety"
      );
      await listModules(request);

      expect(database.trainingModule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "safety" }),
        })
      );
    });

    it("should clamp limit to 200 maximum", async () => {
      vi.mocked(database.trainingModule.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.trainingModule.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/training/modules?limit=999999"
      );
      const response = await listModules(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.pagination.limit).toBe(200);
    });

    it("should handle empty results gracefully", async () => {
      vi.mocked(database.trainingModule.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.trainingModule.count).mockResolvedValue(0);

      const request = new NextRequest("http://localhost/api/training/modules");
      const response = await listModules(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.modules).toHaveLength(0);
      expect(body.pagination.total).toBe(0);
      expect(body.pagination.totalPages).toBe(0);
    });

    it("should include assignment_count and completion_count from _count include", async () => {
      const row = {
        id: "mod-001",
        tenantId: TEST_TENANT_ID,
        title: "Safety Basics",
        description: "Intro",
        contentUrl: null,
        contentType: "document",
        durationMinutes: 30,
        category: "safety",
        isRequired: true,
        isActive: true,
        createdBy: TEST_USER_ID,
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-01-15"),
        _count: { assignments: 10, completions: 5 },
      };
      vi.mocked(database.trainingModule.findMany).mockResolvedValue([
        row,
      ] as never);
      vi.mocked(database.trainingModule.count).mockResolvedValue(1);

      const request = new NextRequest("http://localhost/api/training/modules");
      const response = await listModules(request);

      expect(response.status).toBe(200);
      const body = await response.json();
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
      expect(body.error).toBe("Tenant not found");
    });

    it("should return training modules list", async () => {
      const mockModules = [
        { id: "mod-1", title: "Safety 101", tenantId: TEST_TENANT_ID },
        { id: "mod-2", title: "Hygiene 101", tenantId: TEST_TENANT_ID },
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

    it("should filter by tenantId and exclude soft-deleted", async () => {
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
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("should order results by createdAt descending", async () => {
      vi.mocked(database.trainingModule.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        "http://localhost/api/training/modules/list"
      );
      await listModulesAutogen(request);

      expect(database.trainingModule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
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
      expect(body.error).toBe("Internal server error");
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
        tenantId: TEST_TENANT_ID,
        title: "Safety Basics",
        description: "Intro",
        contentUrl: null,
        contentType: "video",
        durationMinutes: 45,
        category: "safety",
        isRequired: true,
        isActive: true,
        createdBy: TEST_USER_ID,
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-01-15"),
      };

      vi.mocked(database.trainingModule.findFirst).mockResolvedValue(
        mockRow as never
      );

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
      vi.mocked(database.trainingModule.findFirst).mockResolvedValue(
        null as never
      );

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
  describe("POST /api/training/modules (via runManifestCommand)", () => {
    beforeEach(() => {
      setupUserLookup();
    });

    it("should create module through runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "mod-new" },
            events: [{ type: "created" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = new NextRequest("http://localhost/api/training/modules", {
        method: "POST",
        body: JSON.stringify({
          title: "New Module",
          contentType: "video",
        }),
      });
      const response = await createModuleViaHandler(request);

      expect(response.status).toBe(200);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TrainingModule",
          command: "create",
          body: expect.objectContaining({
            title: "New Module",
            contentType: "video",
          }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );

      const body = await response.json();
      expect(body.result.id).toBe("mod-new");
      expect(body.events).toEqual([{ type: "created" }]);
    });

    it("should return 403 on policy denial from runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            message: "Access denied by policy AdminOnlyPolicy",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = new NextRequest("http://localhost/api/training/modules", {
        method: "POST",
        body: JSON.stringify({ title: "Unauthorized" }),
      });
      const response = await createModuleViaHandler(request);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
    });
  });

  // =======================================================================
  // MODULES -- Update via handler (PUT /api/training/modules/[id])
  // =======================================================================
  describe("PUT /api/training/modules/[id] (via runManifestCommand)", () => {
    it("should delegate to runManifestCommand with correct params", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      vi.mocked(runManifestCommand).mockResolvedValue(mockResponse);

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
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TrainingModule",
          command: "update",
          body: expect.objectContaining({
            id: "mod-001",
            title: "Updated Title",
          }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });
  });

  // =======================================================================
  // MODULES -- Delete via handler (DELETE /api/training/modules/[id])
  // =======================================================================
  describe("DELETE /api/training/modules/[id] (via runManifestCommand)", () => {
    it("should delegate to runManifestCommand with softDelete", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      vi.mocked(runManifestCommand).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/training/modules/mod-001",
        { method: "DELETE" }
      );
      const response = await deleteModule(request, {
        params: Promise.resolve({ id: "mod-001" }),
      });

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TrainingModule",
          command: "softDelete",
          body: expect.objectContaining({ id: "mod-001" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });
  });

  // =======================================================================
  // MODULES -- Create command (POST /api/training/modules/commands/create)
  // =======================================================================
  describe("POST /api/training/modules/commands/create", () => {
    beforeEach(() => {
      setupUserLookup();
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new (await import("@/app/lib/invariant")).InvariantError(
          "Unauthorized"
        ) as never
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ title: "Test" }),
        }
      );
      const response = await createModuleCommand(request, {
        params: Promise.resolve({
          entity: "TrainingModule",
          command: "create",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should create a module through runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "mod-new" },
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Fire Safety",
            contentType: "video",
            durationMinutes: 30,
          }),
        }
      );
      const response = await createModuleCommand(request, {
        params: Promise.resolve({
          entity: "TrainingModule",
          command: "create",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "mod-new" });

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TrainingModule",
          command: "create",
          body: expect.objectContaining({ title: "Fire Safety" }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("Runtime crash") as never
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ title: "Crash" }),
        }
      );
      const response = await createModuleCommand(request, {
        params: Promise.resolve({
          entity: "TrainingModule",
          command: "create",
        }),
      });

      expect(response.status).toBe(500);
    });
  });

  // =======================================================================
  // MODULES -- Update command (POST /api/training/modules/commands/update)
  // =======================================================================
  describe("POST /api/training/modules/commands/update", () => {
    beforeEach(() => {
      setupUserLookup();
    });

    it("should update a module through runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "mod-001", title: "Updated Title" },
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            id: "mod-001",
            title: "Updated Title",
          }),
        }
      );
      const response = await updateModuleCommand(request, {
        params: Promise.resolve({
          entity: "TrainingModule",
          command: "update",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TrainingModule",
          command: "update",
          body: expect.objectContaining({ title: "Updated Title" }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new (await import("@/app/lib/invariant")).InvariantError(
          "Unauthorized"
        ) as never
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "mod-001" }),
        }
      );
      const response = await updateModuleCommand(request, {
        params: Promise.resolve({
          entity: "TrainingModule",
          command: "update",
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  // =======================================================================
  // MODULES -- Soft-delete command
  // =======================================================================
  describe("POST /api/training/modules/commands/soft-delete", () => {
    beforeEach(() => {
      setupUserLookup();
    });

    it("should soft-delete a module through runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "mod-001" },
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "mod-001" }),
        }
      );
      const response = await softDeleteModuleCommand(request, {
        params: Promise.resolve({
          entity: "TrainingModule",
          command: "softDelete",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TrainingModule",
          command: "softDelete",
          body: expect.objectContaining({ id: "mod-001" }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new (await import("@/app/lib/invariant")).InvariantError(
          "Unauthorized"
        ) as never
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "mod-001" }),
        }
      );
      const response = await softDeleteModuleCommand(request, {
        params: Promise.resolve({
          entity: "TrainingModule",
          command: "softDelete",
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  // =======================================================================
  // ASSIGNMENTS -- Custom list endpoint (GET /api/training/assignments)
  // =======================================================================
  describe("GET /api/training/assignments (custom list)", () => {
    const mockPrismaAssignment = (overrides: Record<string, unknown> = {}) => ({
      id: "assign-001",
      tenantId: TEST_TENANT_ID,
      moduleId: "mod-001",
      employeeId: "emp-001",
      assignedToAll: false,
      assignedBy: TEST_USER_ID,
      dueDate: new Date("2026-02-01"),
      status: "assigned",
      assignedAt: new Date("2026-01-15"),
      createdAt: new Date("2026-01-15"),
      updatedAt: new Date("2026-01-15"),
      module: {
        id: "mod-001",
        tenantId: TEST_TENANT_ID,
        title: "Safety Basics",
        contentType: "document",
        description: "Intro to safety",
        contentUrl: null,
        durationMinutes: 30,
        category: "safety",
        isRequired: true,
        isActive: true,
        createdBy: TEST_USER_ID,
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-01-15"),
      },
      completions: [],
      ...overrides,
    });

    const mockEmployee = {
      id: "emp-001",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    };

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
        mockPrismaAssignment({ id: "assign-1" }),
        mockPrismaAssignment({ id: "assign-2", employeeId: "emp-002" }),
      ];

      vi.mocked(database.trainingAssignment.findMany).mockResolvedValue(
        mockRows as never
      );
      vi.mocked(database.trainingAssignment.count).mockResolvedValue(2);
      vi.mocked(database.user.findMany).mockResolvedValue([
        mockEmployee,
      ] as never);

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
      const row = mockPrismaAssignment({
        completions: [
          {
            id: "comp-001",
            tenantId: TEST_TENANT_ID,
            assignmentId: "assign-001",
            employeeId: "emp-001",
            moduleId: "mod-001",
            startedAt: new Date("2026-01-20"),
            completedAt: new Date("2026-01-21"),
            score: { value: "85" },
            passed: true,
            notes: null,
            createdAt: new Date("2026-01-20"),
            updatedAt: new Date("2026-01-21"),
          },
        ],
      });

      vi.mocked(database.trainingAssignment.findMany).mockResolvedValue([
        row,
      ] as never);
      vi.mocked(database.trainingAssignment.count).mockResolvedValue(1);
      vi.mocked(database.user.findMany).mockResolvedValue([
        mockEmployee,
      ] as never);

      const request = new NextRequest(
        "http://localhost/api/training/assignments"
      );
      const response = await listAssignments(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assignments[0].completion).toBeDefined();
      expect(body.assignments[0].completion.id).toBe("comp-001");
      expect(body.assignments[0].completion.passed).toBe(true);
    });

    it("should have undefined completion when no completion record", async () => {
      const row = mockPrismaAssignment({ completions: [] });

      vi.mocked(database.trainingAssignment.findMany).mockResolvedValue([
        row,
      ] as never);
      vi.mocked(database.trainingAssignment.count).mockResolvedValue(1);
      vi.mocked(database.user.findMany).mockResolvedValue([
        mockEmployee,
      ] as never);

      const request = new NextRequest(
        "http://localhost/api/training/assignments"
      );
      const response = await listAssignments(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.assignments[0].completion).toBeUndefined();
    });

    it("should include embedded module data", async () => {
      const row = mockPrismaAssignment({
        module: {
          id: "mod-001",
          tenantId: TEST_TENANT_ID,
          title: "Fire Safety",
          contentType: "video",
          description: null,
          contentUrl: null,
          durationMinutes: 30,
          category: "safety",
          isRequired: true,
          isActive: true,
          createdBy: TEST_USER_ID,
          createdAt: new Date("2026-01-15"),
          updatedAt: new Date("2026-01-15"),
        },
      });

      vi.mocked(database.trainingAssignment.findMany).mockResolvedValue([
        row,
      ] as never);
      vi.mocked(database.trainingAssignment.count).mockResolvedValue(1);
      vi.mocked(database.user.findMany).mockResolvedValue([
        mockEmployee,
      ] as never);

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
      expect(body.success).toBe(false);
      expect(body.error).toBe("Tenant not found");
    });

    it("should return assignments list", async () => {
      const mockAssignments = [
        { id: "assign-1", tenantId: TEST_TENANT_ID, status: "assigned" },
        { id: "assign-2", tenantId: TEST_TENANT_ID, status: "completed" },
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

    it("should filter by tenantId", async () => {
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
            tenantId: TEST_TENANT_ID,
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
      expect(body.error).toBe("Internal server error");
    });
  });

  // =======================================================================
  // ASSIGNMENTS -- Detail (GET /api/training/assignments/[id])
  // =======================================================================
  describe("GET /api/training/assignments/[id]", () => {
    it("should return a single assignment", async () => {
      const mockAssignment = {
        id: "assign-001",
        tenantId: TEST_TENANT_ID,
        moduleId: "mod-001",
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
      expect(body.error).toBe("TrainingAssignment not found");
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
            tenantId: TEST_TENANT_ID,
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
  describe("POST /api/training/assignments (via runManifestCommand)", () => {
    it("should delegate to runManifestCommand", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      vi.mocked(runManifestCommand).mockResolvedValue(mockResponse);

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
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TrainingAssignment",
          command: "create",
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should pass body with assignedBy from context", async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      vi.mocked(runManifestCommand).mockResolvedValue(mockResponse);

      const request = new NextRequest(
        "http://localhost/api/training/assignments",
        {
          method: "POST",
          body: JSON.stringify({ moduleId: "mod-001", employeeId: "emp-001" }),
        }
      );
      await createAssignmentViaHandler(request);

      const callArgs = vi.mocked(runManifestCommand).mock.calls[0][0];
      expect(callArgs.body.assignedBy).toBe(TEST_USER_ID);
      expect(callArgs.body.moduleId).toBe("mod-001");
      expect(callArgs.body.employeeId).toBe("emp-001");
    });
  });

  // =======================================================================
  // ASSIGNMENTS -- Create command (auto-generated via dispatcher)
  // =======================================================================
  describe("POST /api/training/assignments/commands/create", () => {
    beforeEach(() => {
      setupUserLookup();
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new (await import("@/app/lib/invariant")).InvariantError(
          "Unauthorized"
        ) as never
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ moduleId: "mod-001" }),
        }
      );
      const response = await createAssignmentCommand(request, {
        params: Promise.resolve({
          entity: "TrainingAssignment",
          command: "create",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("should create an assignment through runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "assign-new" },
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            moduleId: "mod-001",
            employeeId: "emp-001",
            dueDate: "2026-02-01",
          }),
        }
      );
      const response = await createAssignmentCommand(request, {
        params: Promise.resolve({
          entity: "TrainingAssignment",
          command: "create",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "assign-new" });

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TrainingAssignment",
          command: "create",
          body: expect.objectContaining({
            moduleId: "mod-001",
            employeeId: "emp-001",
          }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should return 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("Runtime crash") as never
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ moduleId: "mod-001" }),
        }
      );
      const response = await createAssignmentCommand(request, {
        params: Promise.resolve({
          entity: "TrainingAssignment",
          command: "create",
        }),
      });

      expect(response.status).toBe(500);
    });
  });

  // =======================================================================
  // ASSIGNMENTS -- Soft-delete command (auto-generated via dispatcher)
  // =======================================================================
  describe("POST /api/training/assignments/commands/soft-delete", () => {
    beforeEach(() => {
      setupUserLookup();
    });

    it("should soft-delete an assignment through runManifestCommand", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "assign-001" },
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "assign-001" }),
        }
      );
      const response = await softDeleteAssignmentCommand(request, {
        params: Promise.resolve({
          entity: "TrainingAssignment",
          command: "softDelete",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "TrainingAssignment",
          command: "softDelete",
          body: expect.objectContaining({ id: "assign-001" }),
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new (await import("@/app/lib/invariant")).InvariantError(
          "Unauthorized"
        ) as never
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ id: "assign-001" }),
        }
      );
      const response = await softDeleteAssignmentCommand(request, {
        params: Promise.resolve({
          entity: "TrainingAssignment",
          command: "softDelete",
        }),
      });

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
          if (queryCallCount === 1) {
            return [mockAssignment] as never;
          }
          if (queryCallCount === 2) {
            return [{ id: "emp-001" }] as never;
          }
          if (queryCallCount === 3) {
            return [] as never; // no existing completion
          }
          if (queryCallCount === 4) {
            return [{ id: "emp-001" }] as never;
          }
          return [] as never;
        });

        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
        vi.mocked(database.trainingCompletion.upsert).mockResolvedValue({
          id: "comp-new",
          startedAt: new Date("2026-01-20"),
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

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.completion.id).toBe("comp-new");
        expect(body.completion.started_at).toBeDefined();

        // Verify manifest command was called for status transition
        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "TrainingAssignment",
            command: "start",
          })
        );
        // Verify legacy completion record was upserted
        expect(database.trainingCompletion.upsert).toHaveBeenCalled();
      });

      it("should return existing completion if already started", async () => {
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) {
            return [mockAssignment] as never;
          }
          if (queryCallCount === 2) {
            return [{ id: "emp-001" }] as never;
          }
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
          if (queryCallCount === 1) {
            return [mockAssignment] as never;
          }
          // Return a different employee ID
          if (queryCallCount === 2) {
            return [{ id: "emp-other" }] as never;
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
          if (queryCallCount === 1) {
            return [assignedToAllAssignment] as never;
          }
          if (queryCallCount === 2) {
            return [] as never; // no existing completions
          }
          if (queryCallCount === 3) {
            return [] as never; // no employee record
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
          if (queryCallCount === 1) {
            return [mockAssignment] as never;
          }
          if (queryCallCount === 2) {
            return [{ id: "emp-001" }] as never; // auth check
          }
          if (queryCallCount === 3) {
            return [{ id: "emp-001" }] as never; // employeeId lookup
          }
          return [] as never;
        });

        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
        vi.mocked(database.trainingCompletion.findFirst).mockResolvedValue({
          startedAt: new Date("2026-01-20"),
        } as never);
        vi.mocked(database.trainingCompletion.upsert).mockResolvedValue({
          id: "comp-001",
          completedAt: new Date("2026-01-22"),
          score: 92,
          passed: true,
        } as never);

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

        // Verify manifest command was called for completion
        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "TrainingAssignment",
            command: "submitPassingAttempt",
          })
        );
        // Verify legacy completion record was upserted
        expect(database.trainingCompletion.upsert).toHaveBeenCalled();
      });

      it("should complete training with default passed=true when omitted", async () => {
        let queryCallCount = 0;
        queryRawMock.mockImplementation(async () => {
          queryCallCount++;
          if (queryCallCount === 1) {
            return [mockAssignment] as never;
          }
          if (queryCallCount === 2) {
            return [{ id: "emp-001" }] as never; // auth check
          }
          if (queryCallCount === 3) {
            return [{ id: "emp-001" }] as never; // employeeId lookup
          }
          return [] as never;
        });

        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
        vi.mocked(database.trainingCompletion.findFirst).mockResolvedValue(
          null as never
        );
        vi.mocked(database.trainingCompletion.upsert).mockResolvedValue({
          id: "comp-001",
          completedAt: new Date("2026-01-22"),
          score: 0,
          passed: true,
        } as never);

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
          if (queryCallCount === 1) {
            return [mockAssignment] as never;
          }
          if (queryCallCount === 2) {
            return [{ id: "emp-other" }] as never;
          }
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
          if (queryCallCount === 1) {
            return [assignedToAllAssignment] as never;
          }
          if (queryCallCount === 2) {
            return [] as never; // no employee record
          }
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
          if (queryCallCount === 1) {
            return [mockAssignment] as never;
          }
          return [] as never;
        });

        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

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
        if (queryCallCount === 1) {
          return [mockAssignment] as never;
        }
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
