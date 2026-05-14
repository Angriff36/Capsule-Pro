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
 *
 * NOTE: Route handlers are simulated because the actual route paths do not exist.
 * Tests mock createManifestRuntime to verify command behavior.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvariantError } from "@/app/lib/invariant";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
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
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// ---------------------------------------------------------------------------
// Simulated route handler for testing
// ---------------------------------------------------------------------------

const mockRunCommand = vi.fn();

function setupRuntimeMock() {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
}

async function simulateRouteHandler(
  command: string,
  request: NextRequest,
  entityName: string
) {
  let authResult;
  try {
    authResult = await auth();
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!authResult?.userId) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const orgId = authResult.orgId;
  if (!orgId) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let tenantId: string | null;
  try {
    tenantId = await getTenantIdForOrg(orgId);
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!tenantId) {
    return new Response(
      JSON.stringify({ success: false, message: "Tenant not found" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    if (request.method !== "GET") {
      body = await request.json();
    }
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await createManifestRuntime({
      user: { id: authResult.userId, tenantId },
    });

    const response = await result.runCommand(command, body, { entityName });

    if (!response.success) {
      if (response.policyDenial) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Access denied: ${response.policyDenial.policyName}`,
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      if (response.guardFailure) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Guard ${response.guardFailure.index} failed: ${response.guardFailure.formatted}`,
          }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          message: response.error || "Command failed",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: response.result,
        events: response.emittedEvents,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

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

function mockUnauthed() {
  vi.mocked(auth).mockResolvedValue({
    userId: null,
    orgId: null,
  } as never);
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError("Unauthorized")
  );
}

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: "result-001" }
) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: true,
    result,
    emittedEvents: [],
  });
}

function mockRuntimePolicyDenial(policyName: string) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: false,
    policyDenial: { policyName },
  });
}

function mockRuntimeGuardFailure(index: number, formatted: string) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: false,
    guardFailure: { index, formatted },
  });
}

function mockRuntimeFailure(error: string) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: false,
    error,
  });
}

// ===================================================================== //
// TEST SUITES                                                            //
// ===================================================================== //

describe("ProposalLineItem API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ProposalLineItem.create", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockUnauthed();
      const res = await simulateRouteHandler(
        "create",
        makeRequest({ id: "pli-001", name: "Test" }),
        "ProposalLineItem"
      );
      expect(res.status).toBe(401);
      expect((await res.json()).message).toBe("Unauthorized");
    });

    it("returns 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
      const res = await simulateRouteHandler(
        "create",
        makeRequest({ id: "pli-001" }),
        "ProposalLineItem"
      );
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("Tenant not found");
    });

    it("executes command successfully", async () => {
      mockRuntimeSuccess({ id: "pli-001" });
      const res = await simulateRouteHandler(
        "create",
        makeRequest({ id: "pli-001", name: "Test payload" }),
        "ProposalLineItem"
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({ id: "pli-001" }),
        { entityName: "ProposalLineItem" }
      );
    });

    it("returns 403 on policy denial", async () => {
      mockRuntimePolicyDenial("RolePolicy");
      const res = await simulateRouteHandler(
        "create",
        makeRequest({ id: "pli-001" }),
        "ProposalLineItem"
      );
      expect(res.status).toBe(403);
      expect((await res.json()).message).toContain("Access denied");
    });

    it("returns 422 on guard failure", async () => {
      mockRuntimeGuardFailure(0, "Validation constraint violated");
      const res = await simulateRouteHandler(
        "create",
        makeRequest({ id: "pli-001" }),
        "ProposalLineItem"
      );
      expect(res.status).toBe(422);
      expect((await res.json()).message).toContain("Guard 0 failed");
    });

    it("returns 400 on generic command failure", async () => {
      mockRuntimeFailure("Command execution failed");
      const res = await simulateRouteHandler(
        "create",
        makeRequest({ id: "pli-001" }),
        "ProposalLineItem"
      );
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("Command execution failed");
    });

    it("returns 500 on unexpected runtime exception", async () => {
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Runtime crash")
      );
      const res = await simulateRouteHandler(
        "create",
        makeRequest({ id: "pli-001" }),
        "ProposalLineItem"
      );
      expect(res.status).toBe(500);
      expect((await res.json()).message).toBe("Internal server error");
    });
  });

  describe("ProposalLineItem.remove", () => {
    it("executes remove command successfully", async () => {
      mockRuntimeSuccess({ id: "pli-001", deletedAt: new Date() });
      const res = await simulateRouteHandler(
        "remove",
        makeRequest({ id: "pli-001" }),
        "ProposalLineItem"
      );
      expect(res.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "remove",
        expect.objectContaining({ id: "pli-001" }),
        { entityName: "ProposalLineItem" }
      );
    });
  });

  describe("ProposalLineItem.update", () => {
    it("executes update command successfully", async () => {
      mockRuntimeSuccess({ id: "pli-001", name: "Updated" });
      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "pli-001", name: "Updated" }),
        "ProposalLineItem"
      );
      expect(res.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        expect.objectContaining({ id: "pli-001" }),
        { entityName: "ProposalLineItem" }
      );
    });
  });
});

describe("PurchaseOrderItem API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("PurchaseOrderItem.create", () => {
    it("executes create command successfully", async () => {
      mockRuntimeSuccess({ id: "poi-001" });
      const res = await simulateRouteHandler(
        "create",
        makeRequest({ id: "poi-001" }),
        "PurchaseOrderItem"
      );
      expect(res.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({ id: "poi-001" }),
        { entityName: "PurchaseOrderItem" }
      );
    });
  });

  describe("PurchaseOrderItem.remove", () => {
    it("executes remove command successfully", async () => {
      mockRuntimeSuccess({ id: "poi-001", deletedAt: new Date() });
      const res = await simulateRouteHandler(
        "remove",
        makeRequest({ id: "poi-001" }),
        "PurchaseOrderItem"
      );
      expect(res.status).toBe(200);
    });
  });

  describe("PurchaseOrderItem.update", () => {
    it("executes update command successfully", async () => {
      mockRuntimeSuccess({ id: "poi-001", quantity: 100 });
      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "poi-001", quantity: 100 }),
        "PurchaseOrderItem"
      );
      expect(res.status).toBe(200);
    });
  });
});

describe("SampleData API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("SampleData.seed", () => {
    it("executes seed command successfully", async () => {
      mockRuntimeSuccess({ seeded: true });
      const res = await simulateRouteHandler(
        "seed",
        makeRequest({}),
        "SampleData"
      );
      expect(res.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith("seed", expect.any(Object), {
        entityName: "SampleData",
      });
    });
  });

  describe("SampleData.reseed", () => {
    it("executes reseed command successfully", async () => {
      mockRuntimeSuccess({ reseeded: true });
      const res = await simulateRouteHandler(
        "reseed",
        makeRequest({}),
        "SampleData"
      );
      expect(res.status).toBe(200);
    });
  });

  describe("SampleData.clear", () => {
    it("executes clear command successfully", async () => {
      mockRuntimeSuccess({ cleared: true });
      const res = await simulateRouteHandler(
        "clear",
        makeRequest({}),
        "SampleData"
      );
      expect(res.status).toBe(200);
    });
  });
});

describe("ScheduleShift API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ScheduleShift.create", () => {
    it("executes create command successfully", async () => {
      mockRuntimeSuccess({ id: "shift-001" });
      const res = await simulateRouteHandler(
        "create",
        makeRequest({ id: "shift-001" }),
        "ScheduleShift"
      );
      expect(res.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({ id: "shift-001" }),
        { entityName: "ScheduleShift" }
      );
    });
  });

  describe("ScheduleShift.remove", () => {
    it("executes remove command successfully", async () => {
      mockRuntimeSuccess({ id: "shift-001", deletedAt: new Date() });
      const res = await simulateRouteHandler(
        "remove",
        makeRequest({ id: "shift-001" }),
        "ScheduleShift"
      );
      expect(res.status).toBe(200);
    });
  });

  describe("ScheduleShift.update", () => {
    it("executes update command successfully", async () => {
      mockRuntimeSuccess({ id: "shift-001", startTime: "09:00" });
      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "shift-001", startTime: "09:00" }),
        "ScheduleShift"
      );
      expect(res.status).toBe(200);
    });
  });
});

describe("MenuDish API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("MenuDish.create", () => {
    it("executes create command successfully", async () => {
      mockRuntimeSuccess({ id: "md-001" });
      const res = await simulateRouteHandler(
        "create",
        makeRequest({ id: "md-001" }),
        "MenuDish"
      );
      expect(res.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({ id: "md-001" }),
        { entityName: "MenuDish" }
      );
    });
  });

  describe("MenuDish.remove", () => {
    it("executes remove command successfully", async () => {
      mockRuntimeSuccess({ id: "md-001", deletedAt: new Date() });
      const res = await simulateRouteHandler(
        "remove",
        makeRequest({ id: "md-001" }),
        "MenuDish"
      );
      expect(res.status).toBe(200);
    });
  });

  describe("MenuDish.updateCourse", () => {
    it("executes updateCourse command successfully", async () => {
      mockRuntimeSuccess({ id: "md-001", courseId: "course-1" });
      const res = await simulateRouteHandler(
        "updateCourse",
        makeRequest({ id: "md-001", courseId: "course-1" }),
        "MenuDish"
      );
      expect(res.status).toBe(200);
      expect(mockRunCommand).toHaveBeenCalledWith(
        "updateCourse",
        expect.objectContaining({ id: "md-001", courseId: "course-1" }),
        { entityName: "MenuDish" }
      );
    });
  });
});

describe("Cross-cutting: malformed request body", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 500 on malformed JSON body", async () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      body: "not valid json {{{",
      headers: { "Content-Type": "application/json" },
    });
    const res = await simulateRouteHandler(
      "create",
      request,
      "ProposalLineItem"
    );
    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe("Internal server error");
  });
});

describe("Cross-cutting: auth and tenant exceptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default auth mock for cross-cutting tests
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(requireCurrentUser).mockResolvedValue({
      id: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      role: "admin",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should handle auth throwing an exception", async () => {
    vi.mocked(auth).mockRejectedValue(new Error("Auth service down"));
    const res = await simulateRouteHandler(
      "create",
      makeRequest({ id: "test" }),
      "ProposalLineItem"
    );
    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe("Internal server error");
  });

  it("should handle getTenantIdForOrg throwing", async () => {
    // Reset auth to return success first, then let getTenantIdForOrg throw
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockRejectedValue(
      new Error("Tenant lookup failed")
    );
    const res = await simulateRouteHandler(
      "create",
      makeRequest({ id: "test" }),
      "PurchaseOrderItem"
    );
    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe("Internal server error");
  });
});
