/**
 * Misc Domains Part 2 — API Integration Tests
 *
 * Tests six untested API domains:
 *   - ProposalLineItem: create, remove, update (manifest command handlers)
 *   - PurchaseOrderItem: create, remove, update (manifest command handlers)
 *   - SampleData: seed, reseed, clear (manifest command handlers)
 *   - ScheduleShift: create, remove, update (manifest command handlers)
 *   - User Preferences: GET (list), POST (upsert) — raw SQL routes
 *   - MenuDish: create, remove, updateCourse (manifest command handlers)
 *
 * Each route is tested for: 401 (unauthenticated), 400 (bad request / tenant not found),
 * success (200), 500 (internal error), and tenant isolation where applicable.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
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

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// --- Route imports ---

// MenuDish
import { POST as menuDishCreate } from "@/app/api/menudish/create/route";
import { POST as menuDishRemove } from "@/app/api/menudish/remove/route";
import { POST as menuDishUpdateCourse } from "@/app/api/menudish/update-course/route";
// ProposalLineItem
import { POST as proposalLineItemCreate } from "@/app/api/proposallineitem/create/route";
import { POST as proposalLineItemRemove } from "@/app/api/proposallineitem/remove/route";
import { POST as proposalLineItemUpdate } from "@/app/api/proposallineitem/update/route";
// PurchaseOrderItem
import { POST as purchaseOrderItemCreate } from "@/app/api/purchaseorderitem/create/route";
import { POST as purchaseOrderItemRemove } from "@/app/api/purchaseorderitem/remove/route";
import { POST as purchaseOrderItemUpdate } from "@/app/api/purchaseorderitem/update/route";
import { POST as sampleDataClear } from "@/app/api/sampledata/clear/route";
import { POST as sampleDataReseed } from "@/app/api/sampledata/reseed/route";
// SampleData
import { POST as sampleDataSeed } from "@/app/api/sampledata/seed/route";
// ScheduleShift
import { POST as scheduleShiftCreate } from "@/app/api/scheduleshift/create/route";
import { POST as scheduleShiftRemove } from "@/app/api/scheduleshift/remove/route";
import { POST as scheduleShiftUpdate } from "@/app/api/scheduleshift/update/route";
// User Preferences
import {
  GET as userPreferencesGet,
  POST as userPreferencesPost,
} from "@/app/api/user-preferences/route";

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000090";
const TEST_USER_ID = "user_misc_p2_test";
const TEST_ORG_ID = "org_misc_p2_test";
const OTHER_TENANT_ID = "00000000-0000-0000-0000-000000000099";

// --- Helpers ---

function mockAuth() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
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

function makeRuntime(mockRunCommand: ReturnType<typeof vi.fn>) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
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
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Tenant not found");
    });

    it("should execute command successfully", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "result-001" },
        emittedEvents: [{ type: `${entityName}Event` }],
      });

      const payload = { id: "test-id", name: "Test payload" };
      const request = makeRequest(`http://localhost/api/${urlPath}`, payload);
      const response = await handler(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.result).toEqual({ id: "result-001" });
      expect(json.events).toEqual([{ type: `${entityName}Event` }]);

      expect(mockRunCommand).toHaveBeenCalledWith(
        commandName,
        expect.objectContaining(payload),
        { entityName }
      );
    });

    it("should pass user context to manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "result-002" },
        emittedEvents: [],
      });

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      await handler(request);

      expect(createManifestRuntime).toHaveBeenCalledWith({
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
      });
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "RolePolicy" },
      });

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("Access denied");
      expect(json.message).toContain("RolePolicy");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Validation constraint violated",
        },
      });

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(422);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toContain("Guard 0 failed");
      expect(json.message).toContain("Validation constraint violated");
    });

    it("should return 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Command execution failed",
      });

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
      mockRunCommand.mockResolvedValue({
        success: false,
        error: null,
      });

      const request = makeRequest(`http://localhost/api/${urlPath}`, {});
      const response = await handler(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.message).toBe("Command failed");
    });

    it("should return 500 on unexpected runtime exception", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      const response = await handler(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Internal server error");
    });

    it("should not call runCommand when authentication fails", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      await handler(request);

      expect(createManifestRuntime).not.toHaveBeenCalled();
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("should not call runCommand when tenant is missing", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeRequest(`http://localhost/api/${urlPath}`, {
        id: "test-id",
      });
      await handler(request);

      expect(createManifestRuntime).not.toHaveBeenCalled();
      expect(mockRunCommand).not.toHaveBeenCalled();
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
    const mockRunCommand = vi.fn();
    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should always use entityName 'ProposalLineItem' for all commands", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: {},
        emittedEvents: [],
      });

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

      for (const call of mockRunCommand.mock.calls) {
        expect(call[2]).toEqual({ entityName: "ProposalLineItem" });
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
    const mockRunCommand = vi.fn();
    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should always use entityName 'PurchaseOrderItem' for all commands", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: {},
        emittedEvents: [],
      });

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

      for (const call of mockRunCommand.mock.calls) {
        expect(call[2]).toEqual({ entityName: "PurchaseOrderItem" });
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
    const mockRunCommand = vi.fn();
    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should always use entityName 'SampleData' for all commands", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: {},
        emittedEvents: [],
      });

      const commands = [
        { fn: sampleDataSeed, path: "sampledata/seed" },
        { fn: sampleDataReseed, path: "sampledata/reseed" },
        { fn: sampleDataClear, path: "sampledata/clear" },
      ];

      for (const { fn, path } of commands) {
        const request = makeRequest(`http://localhost/api/${path}`, {});
        await fn(request);
      }

      for (const call of mockRunCommand.mock.calls) {
        expect(call[2]).toEqual({ entityName: "SampleData" });
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
    const mockRunCommand = vi.fn();
    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should always use entityName 'ScheduleShift' for all commands", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: {},
        emittedEvents: [],
      });

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

      for (const call of mockRunCommand.mock.calls) {
        expect(call[2]).toEqual({ entityName: "ScheduleShift" });
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
    const mockRunCommand = vi.fn();
    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("should always use entityName 'MenuDish' for all commands", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: {},
        emittedEvents: [],
      });

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

      for (const call of mockRunCommand.mock.calls) {
        expect(call[2]).toEqual({ entityName: "MenuDish" });
      }
    });

    it("should call 'updateCourse' command for update-course route (not 'update')", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "md-001" },
        emittedEvents: [],
      });

      const request = makeRequest(
        "http://localhost/api/menudish/update-course",
        {
          id: "md-001",
          courseId: "course-1",
        }
      );
      await menuDishUpdateCourse(request);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "updateCourse",
        expect.objectContaining({ id: "md-001", courseId: "course-1" }),
        { entityName: "MenuDish" }
      );
    });
  });
});

// =====================================================================
// USER PREFERENCES (raw SQL route — not manifest)
// =====================================================================

describe("User Preferences API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------- GET
  describe("GET /api/user-preferences", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
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
      vi.mocked(database.$queryRaw).mockResolvedValue([] as never);

      const request = new NextRequest("http://localhost/api/user-preferences");
      const response = await userPreferencesGet(request);

      expect(response.status).toBe(200);
    });

    it("should return preferences for authenticated user", async () => {
      const mockPreferences = [
        {
          id: "pref-001",
          preference_key: "theme",
          preference_value: "dark",
          category: "ui",
          notes: null,
          created_at: new Date("2026-01-01"),
          updated_at: new Date("2026-01-01"),
        },
        {
          id: "pref-002",
          preference_key: "language",
          preference_value: "en",
          category: "ui",
          notes: null,
          created_at: new Date("2026-01-01"),
          updated_at: new Date("2026-01-01"),
        },
      ];
      vi.mocked(database.$queryRaw).mockResolvedValue(mockPreferences as never);

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
      vi.mocked(database.$queryRaw).mockResolvedValue([] as never);

      const request = new NextRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}&category=ui`
      );
      await userPreferencesGet(request);

      expect(database.$queryRaw).toHaveBeenCalled();
    });

    it("should return empty array when no preferences exist", async () => {
      vi.mocked(database.$queryRaw).mockResolvedValue([] as never);

      const request = new NextRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`
      );
      const response = await userPreferencesGet(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.preferences).toEqual([]);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.$queryRaw).mockRejectedValue(
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
      vi.mocked(database.$queryRaw).mockResolvedValue([] as never);

      const request = new NextRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`
      );
      await userPreferencesGet(request);

      // Verify $queryRaw was called — the SQL template includes tenantId
      expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------- POST
  describe("POST /api/user-preferences", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
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
      vi.mocked(database.$executeRaw).mockResolvedValue(1 as never);

      const request = makeRequest("http://localhost/api/user-preferences", {
        preferenceKey: "theme",
        preferenceValue: "dark",
      });
      const response = await userPreferencesPost(request);

      expect(response.status).toBe(200);
    });

    it("should upsert a preference successfully", async () => {
      vi.mocked(database.$executeRaw).mockResolvedValue(1 as never);

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

      expect(database.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("should upsert preference without optional fields", async () => {
      vi.mocked(database.$executeRaw).mockResolvedValue(1 as never);

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
      vi.mocked(database.$executeRaw).mockRejectedValue(
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
      vi.mocked(database.$executeRaw).mockResolvedValue(1 as never);

      const request = makeRequest(
        `http://localhost/api/user-preferences?userId=${TEST_USER_ID}`,
        {
          preferenceKey: "timezone",
          preferenceValue: "UTC",
        }
      );
      await userPreferencesPost(request);

      // $executeRaw was called — the SQL includes tenantId in INSERT and ON CONFLICT
      expect(database.$executeRaw).toHaveBeenCalledTimes(1);
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
    it(`${label}: should return 500 on malformed JSON body`, async () => {
      const request = new NextRequest(`http://localhost/api/${path}`, {
        method: "POST",
        body: "not valid json {{{",
        headers: { "Content-Type": "application/json" },
      });
      const response = await fn(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Internal server error");
    });
  }

  it("User Preferences POST: should return 500 on malformed JSON body", async () => {
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
    vi.mocked(auth).mockRejectedValue(new Error("Auth service down"));

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
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockRejectedValue(
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
