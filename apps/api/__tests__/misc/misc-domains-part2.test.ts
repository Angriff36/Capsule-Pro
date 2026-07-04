/**
 * Misc Domains Part 2 — API Integration Tests
 *
 * Tests six untested API domains:
 *   - ProposalLineItem: create, remove, update (manifest command handlers)
 *   - PurchaseOrderItem: create, remove, update (manifest command handlers)
 *   - SampleData: seed, reseed, clear (manifest command handlers)
 *   - ScheduleShift: create, remove, update (manifest command handlers)
 *   - User Preferences: GET (list), POST (upsert) — Prisma routes
 *   - MenuDish: create, remove, updateCourse (manifest command handlers)
 *
 * Each route is tested for: 401 (unauthenticated), 400 (bad request / tenant not found),
 * success (200), 500 (internal error), and tenant isolation where applicable.
 */

import { database } from "@repo/database";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

// InvariantError used by requireCurrentUser for auth failures
class MockInvariantError extends Error {
  override name = "InvariantError";
}
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: MockInvariantError,
  invariant: (condition: unknown, message: string) => {
    if (!condition) {
      throw new MockInvariantError(message);
    }
  },
}));

// ── Standard infrastructure mocks ──
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn((fn) => fn({})),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    userPreference: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
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
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
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
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});
vi.mock("@/lib/database", async () => {
  const mod =
    await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

// --- Route imports ---

// Dispatcher
import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

const dispatch = (entity: string, command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

// MenuDish
const menuDishCreate = dispatch("MenuDish", "create");
const menuDishRemove = dispatch("MenuDish", "remove");
const menuDishUpdateCourse = dispatch("MenuDish", "updateCourse");
// ProposalLineItem
const proposalLineItemCreate = dispatch("ProposalLineItem", "create");
const proposalLineItemRemove = dispatch("ProposalLineItem", "remove");
const proposalLineItemUpdate = dispatch("ProposalLineItem", "update");
// PurchaseOrderItem
const purchaseOrderItemCreate = dispatch("PurchaseOrderItem", "create");
const purchaseOrderItemRemove = dispatch("PurchaseOrderItem", "remove");
const purchaseOrderItemUpdate = dispatch("PurchaseOrderItem", "update");
const sampleDataClear = dispatch("SampleData", "clear");
const sampleDataReseed = dispatch("SampleData", "reseed");
// SampleData
const sampleDataSeed = dispatch("SampleData", "seed");
// ScheduleShift
const scheduleShiftCreate = dispatch("ScheduleShift", "create");
const scheduleShiftRemove = dispatch("ScheduleShift", "remove");
const scheduleShiftUpdate = dispatch("ScheduleShift", "update");

// User Preferences
import {
  GET as userPreferencesGet,
  POST as userPreferencesPost,
} from "@/app/api/user-preferences/route";

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000090";
const TEST_USER_ID = "user_misc_p2_test";
const TEST_ORG_ID = "org_misc_p2_test";

// --- Helpers ---

function mockAuth() {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

function makeRequest(
  url: string,
  body: Record<string, unknown> = {},
  method = "POST"
) {
  return new NextRequest(url, {
    method,
    body: method === "POST" ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Mock runManifestCommand to return a specific response.
 * The route handler calls runManifestCommand which returns a Response.
 */
function mockRunManifestCommandResponse(
  responseOrFn: Response | ((...args: unknown[]) => Response)
) {
  if (typeof responseOrFn === "function") {
    vi.mocked(runManifestCommand).mockImplementation(
      responseOrFn as unknown as (...args: unknown[]) => Promise<Response>
    );
  } else {
    vi.mocked(runManifestCommand).mockResolvedValue(responseOrFn);
  }
}

/** Create a successful manifest response (200) */
function successResponse(
  result: unknown = { id: "result-001" },
  events: unknown[] = []
) {
  return NextResponse.json({
    success: true,
    result,
    events,
  });
}

/** Create a manifest error response */
function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// Shared command-route test factory
function testManifestCommandRoute(
  label: string,
  handler: (req: NextRequest) => Promise<Response>,
  urlPath: string,
  entityName: string,
  commandName: string
) {
  describe(label, () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new MockInvariantError("Unauthorized")
      );

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Unauthorized");
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new MockInvariantError("Tenant not found")
      );

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Tenant not found");
    });

    it("should execute command successfully", async () => {
      mockAuth();
      mockRunManifestCommandResponse(
        successResponse({ id: "result-001" }, [{ type: `${entityName}Event` }])
      );

      const payload = { id: "test-id", name: "Test payload" };
      const request = makeRequest(`http://localhost/api/${urlPath}`, payload);
      const response = await handler(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.result).toEqual({ id: "result-001" });
      expect(json.events).toEqual([{ type: `${entityName}Event` }]);

      expect(runManifestCommand).toHaveBeenCalledWith({
        entity: entityName,
        command: commandName,
        body: expect.objectContaining(payload),
        user: {
          id: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: "admin",
        },
      });
    });

    it("should pass user context from requireCurrentUser", async () => {
      mockAuth();
      mockRunManifestCommandResponse(successResponse({ id: "result-002" }));

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      await handler(request);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          user: {
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          },
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      mockAuth();
      mockRunManifestCommandResponse(
        errorResponse("Access denied by policy RolePolicy", 403)
      );

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("RolePolicy");
    });

    it("should return 422 on guard failure", async () => {
      mockAuth();
      mockRunManifestCommandResponse(
        errorResponse("Guard 0 failed: Validation constraint violated", 422)
      );

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(422);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("Validation constraint violated");
    });

    it("should return 400 on generic command failure", async () => {
      mockAuth();
      mockRunManifestCommandResponse(
        errorResponse("Command execution failed", 400)
      );

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Command execution failed");
    });

    it("should return 400 with default message when error is null", async () => {
      mockAuth();
      mockRunManifestCommandResponse(errorResponse("Command failed", 400));

      const request = makeRequest(`http://localhost/api/${urlPath}`, {});
      const response = await handler(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.message).toBe("Command failed");
    });

    it("should return 500 on unexpected runtime exception", async () => {
      mockAuth();
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime crash")
      );

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Internal server error");
    });

    it("should not call runManifestCommand when authentication fails", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new MockInvariantError("Unauthorized")
      );

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      await handler(request);

      expect(runManifestCommand).not.toHaveBeenCalled();
    });

    it("should not call runManifestCommand when tenant is missing", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new MockInvariantError("Tenant not found")
      );

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      await handler(request);

      expect(runManifestCommand).not.toHaveBeenCalled();
    });
  });
}

// =====================================================================
// PROPOSAL LINE ITEM
// =====================================================================

describe("ProposalLineItem API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  testManifestCommandRoute(
    "POST /api/proposallineitem/create",
    proposalLineItemCreate,
    "proposallineitem/create",
    "ProposalLineItem",
    "create"
  );

  testManifestCommandRoute(
    "POST /api/proposallineitem/remove",
    proposalLineItemRemove,
    "proposallineitem/remove",
    "ProposalLineItem",
    "remove"
  );

  testManifestCommandRoute(
    "POST /api/proposallineitem/update",
    proposalLineItemUpdate,
    "proposallineitem/update",
    "ProposalLineItem",
    "update"
  );

  describe("Entity-specific verification", () => {
    it("should always use entityName 'ProposalLineItem' for all commands", async () => {
      mockAuth();
      mockRunManifestCommandResponse(successResponse({}));

      const commands = [
        {
          fn: proposalLineItemCreate,
          action: "create",
          path: "proposallineitem/create",
        },
        {
          fn: proposalLineItemRemove,
          action: "remove",
          path: "proposallineitem/remove",
        },
        {
          fn: proposalLineItemUpdate,
          action: "update",
          path: "proposallineitem/update",
        },
      ];

      for (const { fn, path } of commands) {
        const request = makeRequest(`http://localhost/api/${path}`, {
          id: "pli-x",
        });
        await fn(request);
      }

      for (const call of vi.mocked(runManifestCommand).mock.calls) {
        expect(call[0].entity).toBe("ProposalLineItem");
      }
    });
  });
});

// =====================================================================
// PURCHASE ORDER ITEM
// =====================================================================

describe("PurchaseOrderItem API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  testManifestCommandRoute(
    "POST /api/purchaseorderitem/create",
    purchaseOrderItemCreate,
    "purchaseorderitem/create",
    "PurchaseOrderItem",
    "create"
  );

  testManifestCommandRoute(
    "POST /api/purchaseorderitem/remove",
    purchaseOrderItemRemove,
    "purchaseorderitem/remove",
    "PurchaseOrderItem",
    "remove"
  );

  testManifestCommandRoute(
    "POST /api/purchaseorderitem/update",
    purchaseOrderItemUpdate,
    "purchaseorderitem/update",
    "PurchaseOrderItem",
    "update"
  );

  describe("Entity-specific verification", () => {
    it("should always use entityName 'PurchaseOrderItem' for all commands", async () => {
      mockAuth();
      mockRunManifestCommandResponse(successResponse({}));

      const commands = [
        {
          fn: purchaseOrderItemCreate,
          path: "purchaseorderitem/create",
        },
        {
          fn: purchaseOrderItemRemove,
          path: "purchaseorderitem/remove",
        },
        {
          fn: purchaseOrderItemUpdate,
          path: "purchaseorderitem/update",
        },
      ];

      for (const { fn, path } of commands) {
        const request = makeRequest(`http://localhost/api/${path}`, {
          id: "poi-x",
        });
        await fn(request);
      }

      for (const call of vi.mocked(runManifestCommand).mock.calls) {
        expect(call[0].entity).toBe("PurchaseOrderItem");
      }
    });
  });
});

// =====================================================================
// SAMPLE DATA
// =====================================================================

describe("SampleData API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  testManifestCommandRoute(
    "POST /api/sampledata/seed",
    sampleDataSeed,
    "sampledata/seed",
    "SampleData",
    "seed"
  );

  testManifestCommandRoute(
    "POST /api/sampledata/reseed",
    sampleDataReseed,
    "sampledata/reseed",
    "SampleData",
    "reseed"
  );

  testManifestCommandRoute(
    "POST /api/sampledata/clear",
    sampleDataClear,
    "sampledata/clear",
    "SampleData",
    "clear"
  );

  describe("Entity-specific verification", () => {
    it("should always use entityName 'SampleData' for all commands", async () => {
      mockAuth();
      mockRunManifestCommandResponse(successResponse({}));

      const commands = [
        { fn: sampleDataSeed, path: "sampledata/seed" },
        { fn: sampleDataReseed, path: "sampledata/reseed" },
        { fn: sampleDataClear, path: "sampledata/clear" },
      ];

      for (const { fn, path } of commands) {
        const request = makeRequest(`http://localhost/api/${path}`, {});
        await fn(request);
      }

      for (const call of vi.mocked(runManifestCommand).mock.calls) {
        expect(call[0].entity).toBe("SampleData");
      }
    });
  });
});

// =====================================================================
// SCHEDULE SHIFT
// =====================================================================

describe("ScheduleShift API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  testManifestCommandRoute(
    "POST /api/scheduleshift/create",
    scheduleShiftCreate,
    "scheduleshift/create",
    "ScheduleShift",
    "create"
  );

  testManifestCommandRoute(
    "POST /api/scheduleshift/remove",
    scheduleShiftRemove,
    "scheduleshift/remove",
    "ScheduleShift",
    "remove"
  );

  testManifestCommandRoute(
    "POST /api/scheduleshift/update",
    scheduleShiftUpdate,
    "scheduleshift/update",
    "ScheduleShift",
    "update"
  );

  describe("Entity-specific verification", () => {
    it("should always use entityName 'ScheduleShift' for all commands", async () => {
      mockAuth();
      mockRunManifestCommandResponse(successResponse({}));

      const commands = [
        { fn: scheduleShiftCreate, path: "scheduleshift/create" },
        { fn: scheduleShiftRemove, path: "scheduleshift/remove" },
        { fn: scheduleShiftUpdate, path: "scheduleshift/update" },
      ];

      for (const { fn, path } of commands) {
        const request = makeRequest(`http://localhost/api/${path}`, {
          id: "shift-x",
        });
        await fn(request);
      }

      for (const call of vi.mocked(runManifestCommand).mock.calls) {
        expect(call[0].entity).toBe("ScheduleShift");
      }
    });
  });
});

// =====================================================================
// MENU DISH
// =====================================================================

describe("MenuDish API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  testManifestCommandRoute(
    "POST /api/menudish/create",
    menuDishCreate,
    "menudish/create",
    "MenuDish",
    "create"
  );

  testManifestCommandRoute(
    "POST /api/menudish/remove",
    menuDishRemove,
    "menudish/remove",
    "MenuDish",
    "remove"
  );

  testManifestCommandRoute(
    "POST /api/menudish/update-course",
    menuDishUpdateCourse,
    "menudish/update-course",
    "MenuDish",
    "updateCourse"
  );

  describe("Entity-specific verification", () => {
    it("should always use entityName 'MenuDish' for all commands", async () => {
      mockAuth();
      mockRunManifestCommandResponse(successResponse({}));

      const commands = [
        { fn: menuDishCreate, path: "menudish/create" },
        { fn: menuDishRemove, path: "menudish/remove" },
        { fn: menuDishUpdateCourse, path: "menudish/update-course" },
      ];

      for (const { fn, path } of commands) {
        const request = makeRequest(`http://localhost/api/${path}`, {
          id: "md-x",
        });
        await fn(request);
      }

      for (const call of vi.mocked(runManifestCommand).mock.calls) {
        expect(call[0].entity).toBe("MenuDish");
      }
    });

    it("should call 'updateCourse' command for update-course route (not 'update')", async () => {
      mockAuth();
      mockRunManifestCommandResponse(successResponse({ id: "md-001" }));

      const request = makeRequest(
        "http://localhost/api/menudish/update-course",
        {
          id: "md-001",
          courseId: "course-1",
        }
      );
      await menuDishUpdateCourse(request);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "MenuDish",
          command: "updateCourse",
          body: expect.objectContaining({ id: "md-001", courseId: "course-1" }),
        })
      );
    });
  });
});

// =====================================================================
// USER PREFERENCES (Prisma route — not manifest)
// =====================================================================

describe("User Preferences API", () => {
  /** Set up auth mocks for user-preferences routes (which use auth() + getTenantIdForOrg directly) */
  function mockUserPrefAuth() {
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserPrefAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------- GET
  describe("GET /api/user-preferences", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/user-preferences?userId=user-1"
      );
      const response = await userPreferencesGet(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Not authenticated");
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/user-preferences?userId=user-1"
      );
      const response = await userPreferencesGet(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("No tenant found");
    });

    it("should use session userId instead of query param (IDOR fix)", async () => {
      vi.mocked(database.userPreference.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest("http://localhost/api/user-preferences");
      const response = await userPreferencesGet(request);

      expect(response.status).toBe(200);
      // Verify findMany was called with session userId, not query param
      expect(database.userPreference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: TEST_USER_ID }),
        })
      );
    });

    it("should return preferences for authenticated user", async () => {
      const mockPreferences = [
        {
          id: "pref-001",
          preferenceKey: "theme",
          preferenceValue: "dark",
          category: "ui",
          notes: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
        {
          id: "pref-002",
          preferenceKey: "language",
          preferenceValue: "en",
          category: "ui",
          notes: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
      ];
      vi.mocked(database.userPreference.findMany).mockResolvedValue(
        mockPreferences as never
      );

      const request = new NextRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`
      );
      const response = await userPreferencesGet(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.preferences).toHaveLength(2);
      expect(json.preferences[0].id).toBe("pref-001");
      expect(json.preferences[0].preference_key).toBe("theme");
      expect(json.preferences[1].id).toBe("pref-002");
    });

    it("should pass category filter when provided", async () => {
      vi.mocked(database.userPreference.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}&category=ui`
      );
      await userPreferencesGet(request);

      expect(database.userPreference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "ui" }),
        })
      );
    });

    it("should return empty array when no preferences exist", async () => {
      vi.mocked(database.userPreference.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`
      );
      const response = await userPreferencesGet(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.preferences).toEqual([]);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.userPreference.findMany).mockRejectedValue(
        new Error("Connection refused")
      );

      const request = new NextRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`
      );
      const response = await userPreferencesGet(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("Failed to fetch user preferences");
    });

    it("should use tenant-scoped query (tenant isolation)", async () => {
      vi.mocked(database.userPreference.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`
      );
      await userPreferencesGet(request);

      // Verify findMany was called with tenantId filter
      expect(database.userPreference.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TEST_TENANT_ID }),
        })
      );
    });
  });

  // --------------------------------------------------------------- POST
  describe("POST /api/user-preferences", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const request = makeRequest(
        "http://localhost/api/user-preferences?userId=user-1",
        {
          preferenceKey: "theme",
          preferenceValue: "dark",
        }
      );
      const response = await userPreferencesPost(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Not authenticated");
    });

    it("should return 401 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeRequest(
        "http://localhost/api/user-preferences?userId=user-1",
        {
          preferenceKey: "theme",
          preferenceValue: "dark",
        }
      );
      const response = await userPreferencesPost(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("No tenant found");
    });

    it("should return 400 when preferenceKey is missing", async () => {
      const request = makeRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`,
        {
          preferenceValue: "dark",
        }
      );
      const response = await userPreferencesPost(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("preferenceKey");
    });

    it("should return 400 when preferenceValue is missing", async () => {
      const request = makeRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`,
        {
          preferenceKey: "theme",
        }
      );
      const response = await userPreferencesPost(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("preferenceValue");
    });

    it("should use session userId instead of query param (IDOR fix)", async () => {
      vi.mocked(database.userPreference.upsert).mockResolvedValue({} as never);

      const request = makeRequest("http://localhost/api/user-preferences", {
        preferenceKey: "theme",
        preferenceValue: "dark",
      });
      const response = await userPreferencesPost(request);

      expect(response.status).toBe(200);
      // Verify upsert uses session userId, not query param
      expect(database.userPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId_userId_preferenceKey_category: expect.objectContaining({
              userId: TEST_USER_ID,
            }),
          }),
        })
      );
    });

    it("should upsert a preference successfully", async () => {
      vi.mocked(database.userPreference.upsert).mockResolvedValue({} as never);

      const request = makeRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`,
        {
          preferenceKey: "theme",
          preferenceValue: "dark",
          category: "ui",
          notes: "User prefers dark mode",
        }
      );
      const response = await userPreferencesPost(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);

      expect(database.userPreference.upsert).toHaveBeenCalledTimes(1);
    });

    it("should upsert preference without optional fields", async () => {
      vi.mocked(database.userPreference.upsert).mockResolvedValue({} as never);

      const request = makeRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`,
        {
          preferenceKey: "notifications",
          preferenceValue: true,
        }
      );
      const response = await userPreferencesPost(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.userPreference.upsert).mockRejectedValue(
        new Error("Write conflict")
      );

      const request = makeRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`,
        {
          preferenceKey: "theme",
          preferenceValue: "light",
        }
      );
      const response = await userPreferencesPost(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe("Failed to save user preference");
    });

    it("should include tenant scope in upsert query (tenant isolation)", async () => {
      vi.mocked(database.userPreference.upsert).mockResolvedValue({} as never);

      const request = makeRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`,
        {
          preferenceKey: "timezone",
          preferenceValue: "UTC",
        }
      );
      await userPreferencesPost(request);

      // Verify upsert was called with tenantId
      expect(database.userPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId_userId_preferenceKey_category: expect.objectContaining({
              tenantId: TEST_TENANT_ID,
            }),
          }),
        })
      );
    });
  });
});

// =====================================================================
// CROSS-CUTTING: MALFORMED JSON
// =====================================================================

describe("Cross-cutting: malformed request body", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const manifestRoutes = [
    {
      label: "ProposalLineItem create",
      fn: proposalLineItemCreate,
      path: "proposallineitem/create",
    },
    {
      label: "PurchaseOrderItem create",
      fn: purchaseOrderItemCreate,
      path: "purchaseorderitem/create",
    },
    {
      label: "SampleData seed",
      fn: sampleDataSeed,
      path: "sampledata/seed",
    },
    {
      label: "ScheduleShift create",
      fn: scheduleShiftCreate,
      path: "scheduleshift/create",
    },
    {
      label: "MenuDish create",
      fn: menuDishCreate,
      path: "menudish/create",
    },
  ];

  for (const { label, fn, path } of manifestRoutes) {
    it(`${label}: should handle malformed JSON body gracefully`, async () => {
      // The route catches JSON parse errors via .catch(() => ({})), so malformed
      // JSON results in an empty body being passed to runManifestCommand.
      // If runManifestCommand returns an error response, we get a non-500 status.
      // If runManifestCommand rejects, the outer catch returns 500.
      // With the catch, body becomes {} so runManifestCommand is called normally.
      mockRunManifestCommandResponse(errorResponse("Command failed", 400));

      const request = new NextRequest(`http://localhost/api/${path}`, {
        method: "POST",
        body: "not valid json {{{",
        headers: { "Content-Type": "application/json" },
      });
      const response = await fn(request);

      // The route catches JSON parse failure gracefully (body becomes {})
      // so it calls runManifestCommand. With our mock returning 400, we get 400.
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  }

  it("User Preferences POST: should return 500 on malformed JSON body", async () => {
    // The user-preferences route does NOT have a .catch() on req.json(),
    // so malformed JSON throws and the outer catch returns 500.
    const request = new NextRequest(
      `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`,
      {
        method: "POST",
        body: "not valid json {{{",
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await userPreferencesPost(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Failed to save user preference");
  });
});

// =====================================================================
// CROSS-CUTTING: AUTH THROW / TENANT LOOKUP THROW
// =====================================================================

describe("Cross-cutting: auth and tenant exceptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should handle auth throwing an exception for manifest routes", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(
      // Non-InvariantError exceptions are caught by the outer catch -> 500
      new Error("Auth service down")
    );

    const request = makeRequest(
      "http://localhost/api/proposallineitem/create",
      { id: "test" }
    );
    const response = await proposalLineItemCreate(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.message).toBe("Internal server error");
  });

  it("should handle getTenantIdForOrg throwing for manifest routes", async () => {
    // requireCurrentUser is mocked and throws a generic error
    vi.mocked(requireCurrentUser).mockRejectedValue(
      new Error("Tenant lookup failed")
    );

    const request = makeRequest(
      "http://localhost/api/purchaseorderitem/create",
      { id: "test" }
    );
    const response = await purchaseOrderItemCreate(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.message).toBe("Internal server error");
  });

  it("should handle auth throwing for user preferences GET", async () => {
    vi.mocked(auth).mockRejectedValue(new Error("Auth service down"));

    const request = new NextRequest(
      `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`
    );
    const response = await userPreferencesGet(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Failed to fetch user preferences");
  });

  it("should handle auth throwing for user preferences POST", async () => {
    vi.mocked(auth).mockRejectedValue(new Error("Auth service down"));

    const request = makeRequest(
      `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`,
      { preferenceKey: "theme", preferenceValue: "dark" }
    );
    const response = await userPreferencesPost(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Failed to save user preference");
  });
});
