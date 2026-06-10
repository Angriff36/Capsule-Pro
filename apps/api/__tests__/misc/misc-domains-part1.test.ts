/**
 * Misc Domains Part 1 — API Integration Tests
 *
 * Tests seven untested API domains:
 *   - Containers (create, update, deactivate)
 *   - Cycle Count Records (create, update, remove, verify)
 *   - Cycle Count Sessions (create, start, complete, finalize, cancel)
 *   - Locations (list via Prisma findMany GET)
 *   - Override Audits (create, authorize)
 *   - Performance Prediction (create)
 *   - Variance Reports (create, review, approve)
 *
 * Covers: 401 auth, 200 success, 403 policy denial,
 *         422 guard failure, 400 generic command failure, 500 internal error,
 *         and tenant isolation for each route.
 */

import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — shared across all suites
// ---------------------------------------------------------------------------

// runManifestCommand is the core function the dispatcher calls
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

// InvariantError is caught by the dispatcher → maps to 401
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error {
    name = "InvariantError";
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  }
  return { InvariantError };
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

vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({})),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    location: {
      findMany: vi.fn(),
    },
    Prisma: {
      sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
        strings,
        values,
        get sql() {
          return strings.reduce(
            (acc: string, str: string, i: number) =>
              acc + str + (values[i] !== undefined ? String(values[i]) : ""),
            ""
          );
        },
      })),
      join: vi.fn(),
      empty: {},
    },
  },
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse: NR } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NR.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      ),
    manifestErrorResponse: (message: string, status: number) =>
      NR.json({ success: false, message }, { status }),
  };
});

// ---------------------------------------------------------------------------
// Import mocked modules (after mocks are set up)
// ---------------------------------------------------------------------------

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { InvariantError } = await import("@/app/lib/invariant");
const { runManifestCommand } = await import(
  "@/lib/manifest/execute-command"
);
const { database } = await import("@repo/database");

// ---------------------------------------------------------------------------
// Route imports
// ---------------------------------------------------------------------------

// Dispatcher
import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

const dispatch = (entity: string, command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

// Container
const containerCreate = dispatch("Container", "create");
const containerDeactivate = dispatch("Container", "deactivate");
const containerUpdate = dispatch("Container", "update");

// Cycle Count Records
const ccrCreate = dispatch("CycleCountRecord", "create");
const ccrRemove = dispatch("CycleCountRecord", "remove");
const ccrUpdate = dispatch("CycleCountRecord", "update");
const ccrVerify = dispatch("CycleCountRecord", "verify");
const ccsCancel = dispatch("CycleCountSession", "cancel");
const ccsComplete = dispatch("CycleCountSession", "complete");
// Cycle Count Sessions
const ccsCreate = dispatch("CycleCountSession", "create");
const ccsFinalize = dispatch("CycleCountSession", "finalize");
const ccsStart = dispatch("CycleCountSession", "start");

// Locations
import { GET as locationsList } from "@/app/api/locations/route";

const overrideAuditAuthorize = dispatch("OverrideAudit", "authorize");
// Override Audit
const overrideAuditCreate = dispatch("OverrideAudit", "create");

// Performance Prediction
const perfPredictionCreate = dispatch("PerformancePrediction", "create");
const varianceReportApprove = dispatch("VarianceReport", "approve");
// Variance Reports
const varianceReportCreate = dispatch("VarianceReport", "create");
const varianceReportReview = dispatch("VarianceReport", "review");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000080";
const OTHER_TENANT_ID = "99999999-9999-9999-9999-999999999999";
const TEST_USER_ID = "user_misc_test";
const TEST_USER_ROLE = "admin";
const TEST_ORG_ID = "org_misc_test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Set requireCurrentUser to resolve with an authenticated user. */
function makeAuthedUser(tenantId = TEST_TENANT_ID) {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId,
    role: TEST_USER_ROLE,
  } as never);
}

/** Set requireCurrentUser to reject with InvariantError (unauthenticated). */
function makeUnauthedUser(message = "Unauthenticated") {
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError(message) as never
  );
}

function postRequest(path: string, body: Record<string, unknown> = {}) {
  return new NextRequest(`http://localhost/api/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockCommandSuccess(result: Record<string, unknown>, events: Array<Record<string, unknown>> = []) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    NextResponse.json({
      success: true,
      result,
      events,
    }) as never
  );
}

function mockCommandPolicyDenial(policyName: string) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    NextResponse.json(
      {
        success: false,
        message: `Access denied: ${policyName} (role=${TEST_USER_ROLE})`,
      },
      { status: 403 }
    ) as never
  );
}

function mockCommandGuardFailure(index: number, formatted: string) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    NextResponse.json(
      {
        success: false,
        message: `Guard ${index} failed: ${formatted}`,
      },
      { status: 422 }
    ) as never
  );
}

function mockCommandFailure(message: string, status = 400) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    NextResponse.json(
      { success: false, message },
      { status }
    ) as never
  );
}

/** Asserts the standard auth + command outcomes for a manifest POST handler. */
async function assertManifestCommandRoute(
  handler: (req: NextRequest) => Promise<Response>,
  path: string,
  command: string,
  entityName: string,
  body: Record<string, unknown>
) {
  // --- 401 unauthenticated ---
  makeUnauthedUser();
  const res401 = await handler(postRequest(path, body));
  expect(res401.status).toBe(401);
  expect(await res401.json()).toMatchObject({
    success: false,
    message: "Unauthenticated",
  });

  vi.clearAllMocks();

  // --- 200 success ---
  makeAuthedUser();
  mockCommandSuccess(
    { id: `${entityName.toLowerCase()}-001` },
    [{ type: `${entityName}Created` }]
  );

  const res200 = await handler(postRequest(path, body));
  expect(res200.status).toBe(200);
  const json200 = await res200.json();
  expect(json200.success).toBe(true);
  expect(json200.result).toEqual({
    id: `${entityName.toLowerCase()}-001`,
  });
  expect(json200.events).toEqual([{ type: `${entityName}Created` }]);

  expect(runManifestCommand).toHaveBeenCalledWith(
    expect.objectContaining({
      entity: entityName,
      command,
      body,
      user: {
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: TEST_USER_ROLE,
      },
    })
  );

  vi.clearAllMocks();

  // --- 403 policy denial ---
  makeAuthedUser();
  mockCommandPolicyDenial("ManagerOnlyPolicy");

  const res403 = await handler(postRequest(path, body));
  expect(res403.status).toBe(403);
  const json403 = await res403.json();
  expect(json403.success).toBe(false);
  expect(json403.message).toContain("Access denied");
  expect(json403.message).toContain("ManagerOnlyPolicy");

  vi.clearAllMocks();

  // --- 422 guard failure ---
  makeAuthedUser();
  mockCommandGuardFailure(1, "Validation check failed");

  const res422 = await handler(postRequest(path, body));
  expect(res422.status).toBe(422);
  const json422 = await res422.json();
  expect(json422.success).toBe(false);
  expect(json422.message).toContain("Guard 1 failed");

  vi.clearAllMocks();

  // --- 400 generic command failure ---
  makeAuthedUser();
  mockCommandFailure("Command failed: invalid payload");

  const res400f = await handler(postRequest(path, body));
  expect(res400f.status).toBe(400);
  const json400f = await res400f.json();
  expect(json400f.success).toBe(false);
  expect(json400f.message).toBe("Command failed: invalid payload");

  vi.clearAllMocks();

  // --- 400 with null error (default message) ---
  makeAuthedUser();
  mockCommandFailure("Command failed");

  const res400n = await handler(postRequest(path, body));
  expect(res400n.status).toBe(400);
  const json400n = await res400n.json();
  expect(json400n.message).toBe("Command failed");

  vi.clearAllMocks();

  // --- 500 internal server error ---
  makeAuthedUser();
  vi.mocked(runManifestCommand).mockRejectedValue(
    new Error("Runtime crash") as never
  );

  const res500 = await handler(postRequest(path, body));
  expect(res500.status).toBe(500);
  const json500 = await res500.json();
  expect(json500.success).toBe(false);
  expect(json500.message).toBe("Internal server error");

  vi.clearAllMocks();

  // --- Tenant isolation: user context passes correct tenantId ---
  makeAuthedUser(OTHER_TENANT_ID);
  mockCommandSuccess({ id: "isolated-001" });

  await handler(postRequest(path, body));
  expect(runManifestCommand).toHaveBeenCalledWith(
    expect.objectContaining({
      user: {
        id: TEST_USER_ID,
        tenantId: OTHER_TENANT_ID,
        role: TEST_USER_ROLE,
      },
    })
  );
}

// ===================================================================== //
// TEST SUITES                                                            //
// ===================================================================== //

describe("Misc Domains Part 1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------- //
  // CONTAINERS                                                           //
  // ------------------------------------------------------------------- //

  describe("Container Commands", () => {
    describe("POST /api/container/create", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          containerCreate,
          "container/create",
          "create",
          "Container",
          { name: "Pallet Box A", capacity: 100 }
        );
      });
    });

    describe("POST /api/container/update", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          containerUpdate,
          "container/update",
          "update",
          "Container",
          { id: "container-001", name: "Updated Box" }
        );
      });
    });

    describe("POST /api/container/deactivate", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          containerDeactivate,
          "container/deactivate",
          "deactivate",
          "Container",
          { id: "container-001" }
        );
      });
    });
  });

  // ------------------------------------------------------------------- //
  // CYCLE COUNT RECORDS                                                  //
  // ------------------------------------------------------------------- //

  describe("Cycle Count Record Commands", () => {
    describe("POST /api/cyclecountrecord/create", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          ccrCreate,
          "cyclecountrecord/create",
          "create",
          "CycleCountRecord",
          { sessionId: "session-001", itemId: "item-001", countedQty: 50 }
        );
      });
    });

    describe("POST /api/cyclecountrecord/update", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          ccrUpdate,
          "cyclecountrecord/update",
          "update",
          "CycleCountRecord",
          { id: "record-001", countedQty: 75 }
        );
      });
    });

    describe("POST /api/cyclecountrecord/remove", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          ccrRemove,
          "cyclecountrecord/remove",
          "remove",
          "CycleCountRecord",
          { id: "record-001" }
        );
      });
    });

    describe("POST /api/cyclecountrecord/verify", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          ccrVerify,
          "cyclecountrecord/verify",
          "verify",
          "CycleCountRecord",
          { id: "record-001", verifiedBy: "user-002" }
        );
      });
    });
  });

  // ------------------------------------------------------------------- //
  // CYCLE COUNT SESSIONS                                                 //
  // ------------------------------------------------------------------- //

  describe("Cycle Count Session Commands", () => {
    describe("POST /api/cyclecountsession/create", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          ccsCreate,
          "cyclecountsession/create",
          "create",
          "CycleCountSession",
          { locationId: "loc-001", scheduledDate: "2026-05-01" }
        );
      });
    });

    describe("POST /api/cyclecountsession/start", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          ccsStart,
          "cyclecountsession/start",
          "start",
          "CycleCountSession",
          { id: "session-001" }
        );
      });
    });

    describe("POST /api/cyclecountsession/complete", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          ccsComplete,
          "cyclecountsession/complete",
          "complete",
          "CycleCountSession",
          { id: "session-001" }
        );
      });
    });

    describe("POST /api/cyclecountsession/finalize", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          ccsFinalize,
          "cyclecountsession/finalize",
          "finalize",
          "CycleCountSession",
          { id: "session-001" }
        );
      });
    });

    describe("POST /api/cyclecountsession/cancel", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          ccsCancel,
          "cyclecountsession/cancel",
          "cancel",
          "CycleCountSession",
          { id: "session-001", reason: "Inventory recount needed" }
        );
      });
    });
  });

  // ------------------------------------------------------------------- //
  // LOCATIONS (GET, Prisma findMany)                                     //
  // ------------------------------------------------------------------- //

  describe("GET /api/locations", () => {
    const mockLocationRows = [
      {
        id: "loc-001",
        name: "Main Warehouse",
        addressLine1: "123 Main St",
        addressLine2: null,
        city: "Seattle",
        stateProvince: "WA",
        postalCode: "98101",
        countryCode: "US",
        timezone: "America/Los_Angeles",
        isPrimary: true,
        isActive: true,
        createdAt: new Date("2026-01-15"),
        updatedAt: new Date("2026-01-15"),
      },
      {
        id: "loc-002",
        name: "Satellite Kitchen",
        addressLine1: "456 Oak Ave",
        addressLine2: "Suite 200",
        city: "Portland",
        stateProvince: "OR",
        postalCode: "97201",
        countryCode: "US",
        timezone: "America/Los_Angeles",
        isPrimary: false,
        isActive: true,
        createdAt: new Date("2026-02-10"),
        updatedAt: new Date("2026-03-01"),
      },
    ];

    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const req = new NextRequest("http://localhost/api/locations");
      const res = await locationsList(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Not authenticated");
    });

    it("returns 401 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = new NextRequest("http://localhost/api/locations");
      const res = await locationsList(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("No tenant found");
    });

    it("returns locations list for authenticated user", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
      vi.mocked(database.location.findMany).mockResolvedValue(
        mockLocationRows as never
      );

      const req = new NextRequest("http://localhost/api/locations");
      const res = await locationsList(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.locations).toHaveLength(2);
      expect(body.locations[0].name).toBe("Main Warehouse");
      expect(body.locations[0].is_primary).toBe(true);
      expect(body.locations[1].name).toBe("Satellite Kitchen");
      expect(body.locations[1].address_line_2).toBe("Suite 200");
    });

    it("calls findMany with correct tenant ID", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
      vi.mocked(database.location.findMany).mockResolvedValue([] as never);

      const req = new NextRequest("http://localhost/api/locations");
      await locationsList(req);

      expect(database.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TEST_TENANT_ID }),
        })
      );
    });

    it("filters active locations when isActive=true", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
      vi.mocked(database.location.findMany).mockResolvedValue([
        mockLocationRows[0],
      ] as never);

      const req = new NextRequest(
        "http://localhost/api/locations?isActive=true"
      );
      const res = await locationsList(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.locations).toHaveLength(1);
      // Verify the filter was applied in the call
      expect(database.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it("returns empty array when no locations exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
      vi.mocked(database.location.findMany).mockResolvedValue([] as never);

      const req = new NextRequest("http://localhost/api/locations");
      const res = await locationsList(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.locations).toHaveLength(0);
    });

    it("returns 500 on database error", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
      vi.mocked(database.location.findMany).mockRejectedValue(
        new Error("DB connection lost")
      );

      const req = new NextRequest("http://localhost/api/locations");
      const res = await locationsList(req);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Failed to fetch locations");
    });

    it("enforces tenant isolation — only returns locations for user's tenant", async () => {
      // First call: tenant A
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
      vi.mocked(database.location.findMany).mockResolvedValue(
        mockLocationRows as never
      );

      const reqA = new NextRequest("http://localhost/api/locations");
      const resA = await locationsList(reqA);
      const bodyA = await resA.json();
      expect(bodyA.locations).toHaveLength(2);

      // Second call: tenant B (different tenant)
      vi.clearAllMocks();
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(OTHER_TENANT_ID as never);
      vi.mocked(database.location.findMany).mockResolvedValue([] as never);

      const reqB = new NextRequest("http://localhost/api/locations");
      const resB = await locationsList(reqB);
      const bodyB = await resB.json();
      expect(bodyB.locations).toHaveLength(0);

      // Verify the second call used the correct tenant
      expect(database.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: OTHER_TENANT_ID }),
        })
      );
    });
  });

  // ------------------------------------------------------------------- //
  // OVERRIDE AUDIT                                                       //
  // ------------------------------------------------------------------- //

  describe("Override Audit Commands", () => {
    describe("POST /api/overrideaudit/create", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          overrideAuditCreate,
          "overrideaudit/create",
          "create",
          "OverrideAudit",
          { reason: "Emergency override", entityType: "Schedule" }
        );
      });
    });

    describe("POST /api/overrideaudit/authorize", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          overrideAuditAuthorize,
          "overrideaudit/authorize",
          "authorize",
          "OverrideAudit",
          { id: "audit-001", authorizedBy: "admin-001" }
        );
      });
    });
  });

  // ------------------------------------------------------------------- //
  // PERFORMANCE PREDICTION                                               //
  // ------------------------------------------------------------------- //

  describe("Performance Prediction Commands", () => {
    describe("POST /api/performanceprediction/create", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          perfPredictionCreate,
          "performanceprediction/create",
          "create",
          "PerformancePrediction",
          {
            employeeId: "emp-001",
            predictionDate: "2026-05-15",
            metrics: { productivity: 0.85, quality: 0.92 },
          }
        );
      });
    });
  });

  // ------------------------------------------------------------------- //
  // VARIANCE REPORTS                                                     //
  // ------------------------------------------------------------------- //

  describe("Variance Report Commands", () => {
    describe("POST /api/variancereport/create", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          varianceReportCreate,
          "variancereport/create",
          "create",
          "VarianceReport",
          {
            periodStart: "2026-04-01",
            periodEnd: "2026-04-30",
            category: "food_cost",
          }
        );
      });
    });

    describe("POST /api/variancereport/review", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          varianceReportReview,
          "variancereport/review",
          "review",
          "VarianceReport",
          {
            id: "report-001",
            reviewerId: "user-002",
            notes: "Reviewed variance — within tolerance",
          }
        );
      });
    });

    describe("POST /api/variancereport/approve", () => {
      it("covers 401, 200, 403, 422, 400-fail, 500, and tenant isolation", async () => {
        await assertManifestCommandRoute(
          varianceReportApprove,
          "variancereport/approve",
          "approve",
          "VarianceReport",
          { id: "report-001", approverId: "admin-001" }
        );
      });
    });
  });
});
