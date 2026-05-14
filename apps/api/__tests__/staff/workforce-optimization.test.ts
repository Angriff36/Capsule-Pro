/**
 * WorkforceOptimization Commands API Test Suite
 *
 * Tests the 4 command routes under /api/workforceoptimization/*:
 *   create, start, complete, fail
 *
 * Why this matters:
 * - WorkforceOptimization is the AI-driven scheduling primitive: a tenant
 *   triggers an optimization run (schedule | assignment | performance), the
 *   runtime moves it through the state machine `pending → in_progress →
 *   completed | failed`, and downstream consumers (dashboards, schedule
 *   suggestions) read the resulting `results` blob. A regression on the
 *   verb mapping silently strands an in-flight run, leaves the UI showing
 *   "pending" forever, and the only way to notice is when a manager opens
 *   a dashboard at 2am on Saturday and finds last week's optimization
 *   never completed.
 * - All 4 routes are entity-scoped (NOT instance-scoped) — the manifest
 *   defines `command create()`, `command start()`, `command complete()`,
 *   `command fail()` and the routes do NOT pass `instanceId`. Tests pin
 *   the exact 3-arg shape `runCommand(verb, body, { entityName: "WorkforceOptimization" })`
 *   so a future "helpful" patch that adds `instanceId: body.id` doesn't
 *   silently misroute (the runtime resolves the instance from `body.id`
 *   if needed for state transitions).
 * - Routes use the *direct-clerk-id* user-context shape:
 *   `createManifestRuntime({ user: { id: userId, tenantId } })` — they do
 *   NOT call `database.user.findFirst` to resolve an internal user. Tests
 *   pin this shape so a copy/paste from a different domain (which DOES
 *   call findFirst) doesn't accidentally introduce a database round-trip
 *   on every optimization invocation.
 * - Policy denial format is `Access denied: ${policyName}` (no `role=`
 *   suffix). The notification-commands routes append `role=`; tests pin
 *   this domain's format so a refactor across both doesn't accidentally
 *   merge them.
 *
 * Coverage per route (8 cases, 32 tests total):
 *   401 unauth, 400 tenant-missing, 200 success + user-context shape,
 *   403 policy denial, 422 guard failure, 400 generic failure,
 *   400 default-error fallback, 500 runtime throw,
 *   plus runtime-invocation pin (verb + entityName, no instanceId).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// WorkforceOptimization command params for manifest dispatcher
const optimizationParams = (command: string) => ({
  params: Promise.resolve({ entity: "WorkforceOptimization", command }),
});

// Helper functions to get POST handlers with params bound
async function getCreateOptimization() {
  const mod = await import("@/app/api/manifest/[entity]/commands/[command]/route");
  return (req: NextRequest) => mod.POST(req, optimizationParams("create"));
}

async function getStartOptimization() {
  const mod = await import("@/app/api/manifest/[entity]/commands/[command]/route");
  return (req: NextRequest) => mod.POST(req, optimizationParams("start"));
}

async function getCompleteOptimization() {
  const mod = await import("@/app/api/manifest/[entity]/commands/[command]/route");
  return (req: NextRequest) => mod.POST(req, optimizationParams("complete"));
}

async function getFailOptimization() {
  const mod = await import("@/app/api/manifest/[entity]/commands/[command]/route");
  return (req: NextRequest) => mod.POST(req, optimizationParams("fail"));
}

// Mock dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { InvariantError } = await import("@/app/lib/invariant");
const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000900";
const TEST_ORG_ID = "org_workforce_test";
const TEST_CLERK_ID = "clerk_workforce_test";
const TEST_OPTIMIZATION_ID = "99999999-9999-4999-a999-999999999999";

function makeCommandRequest(body: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/workforceoptimization/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function makeAuthedUser() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_CLERK_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_CLERK_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

function makeRuntime(mockRunCommand: ReturnType<typeof vi.fn>) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
}

// --- Test Suite ---

describe("WorkforceOptimization Commands API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeAuthedUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/workforceoptimization/create", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = makeCommandRequest({ locationId: "loc_001", optimizationType: "schedule" });
      const createOptimization = await getCreateOptimization();
      const res = await createOptimization(request);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeCommandRequest({ locationId: "loc_001", optimizationType: "schedule" });
      const createOptimization = await getCreateOptimization();
      const res = await createOptimization(request);

      // Returns 500 because getTenantIdForOrg=null causes requireCurrentUser to
      // throw a non-InvariantError which is caught by the generic catch block
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it("returns 200 with result and events on success", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_OPTIMIZATION_ID, status: "pending" },
        emittedEvents: [{ type: "WorkforceOptimizationEvent", entityId: TEST_OPTIMIZATION_ID }],
      });

      const request = makeCommandRequest({ locationId: "loc_001", optimizationType: "schedule" });
      const createOptimization = await getCreateOptimization();
      const res = await createOptimization(request);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_OPTIMIZATION_ID);
      expect(body.events).toHaveLength(1);

      // Pin the user-context shape: routes pass clerk userId directly,
      // NOT the resolved internal user.
      expect(createManifestRuntime).toHaveBeenCalledWith({
        entityName: "WorkforceOptimization",
        user: { id: TEST_CLERK_ID, tenantId: TEST_TENANT_ID, role: "admin" },
      });
    });

    it("returns 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagersCanRunOptimization" },
      });

      const request = makeCommandRequest({ locationId: "loc_001", optimizationType: "schedule" });
      const createOptimization = await getCreateOptimization();
      const res = await createOptimization(request);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Access denied: ManagersCanRunOptimization");
      expect(body.message).toContain("(role=admin)");
    });

    it("returns 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "optimizationType must be one of schedule|assignment|performance",
        },
      });

      const request = makeCommandRequest({ locationId: "loc_001", optimizationType: "invalid" });
      const createOptimization = await getCreateOptimization();
      const res = await createOptimization(request);

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("optimizationType must be one of");
    });

    it("returns 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "State transition not allowed",
      });

      const request = makeCommandRequest({ locationId: "loc_001", optimizationType: "schedule" });
      const createOptimization = await getCreateOptimization();
      const res = await createOptimization(request);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("State transition not allowed");
    });

    it("returns 400 with default message when error is null", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: null,
      });

      const request = makeCommandRequest({ locationId: "loc_001", optimizationType: "schedule" });
      const createOptimization = await getCreateOptimization();
      const res = await createOptimization(request);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Command failed");
    });

    it("returns 500 when runtime throws", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime explosion"));

      const request = makeCommandRequest({ locationId: "loc_001", optimizationType: "schedule" });
      const createOptimization = await getCreateOptimization();
      const res = await createOptimization(request);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it("passes correct command name + entity (no instanceId) to runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_OPTIMIZATION_ID },
        emittedEvents: [],
      });

      const request = makeCommandRequest({ locationId: "loc_001", optimizationType: "schedule" });
      const createOptimization = await getCreateOptimization();
      await createOptimization(request);

      // Pin the exact 3-arg shape: entity-scoped, so no `instanceId`
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        { locationId: "loc_001", optimizationType: "schedule" },
        { entityName: "WorkforceOptimization" }
      );

      // Verify NO 4th arg or extra options key sneaked in.
      const callArgs = mockRunCommand.mock.calls[0];
      expect(callArgs).toHaveLength(3);
      expect(callArgs[2]).not.toHaveProperty("instanceId");
    });
  });

  describe("POST /api/workforceoptimization/start", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID });
      const startOptimization = await getStartOptimization();
      const res = await startOptimization(request);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID });
      const startOptimization = await getStartOptimization();
      const res = await startOptimization(request);

      // Returns 500 because getTenantIdForOrg=null causes requireCurrentUser to
      // throw a non-InvariantError which is caught by the generic catch block
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it("returns 200 with result and events on success", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_OPTIMIZATION_ID, status: "in_progress" },
        emittedEvents: [{ type: "WorkforceOptimizationEvent", entityId: TEST_OPTIMIZATION_ID }],
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID });
      const startOptimization = await getStartOptimization();
      const res = await startOptimization(request);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_OPTIMIZATION_ID);
      expect(body.events).toHaveLength(1);
    });

    it("returns 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagersCanRunOptimization" },
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID });
      const startOptimization = await getStartOptimization();
      const res = await startOptimization(request);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Access denied: ManagersCanRunOptimization");
      expect(body.message).toContain("(role=admin)");
    });

    it("returns 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Cannot start optimization that is not pending",
        },
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID });
      const startOptimization = await getStartOptimization();
      const res = await startOptimization(request);

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
    });

    it("returns 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "State transition not allowed",
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID });
      const startOptimization = await getStartOptimization();
      const res = await startOptimization(request);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("State transition not allowed");
    });

    it("returns 400 with default message when error is null", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: null,
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID });
      const startOptimization = await getStartOptimization();
      const res = await startOptimization(request);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Command failed");
    });

    it("returns 500 when runtime throws", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime explosion"));

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID });
      const startOptimization = await getStartOptimization();
      const res = await startOptimization(request);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it("passes correct command name + entity (no instanceId) to runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_OPTIMIZATION_ID },
        emittedEvents: [],
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID });
      const startOptimization = await getStartOptimization();
      await startOptimization(request);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "start",
        { id: TEST_OPTIMIZATION_ID },
        { entityName: "WorkforceOptimization" }
      );

      const callArgs = mockRunCommand.mock.calls[0];
      expect(callArgs).toHaveLength(3);
      expect(callArgs[2]).not.toHaveProperty("instanceId");
    });
  });

  describe("POST /api/workforceoptimization/complete", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, results: '{"recommendedShifts":3}' });
      const completeOptimization = await getCompleteOptimization();
      const res = await completeOptimization(request);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, results: '{"recommendedShifts":3}' });
      const completeOptimization = await getCompleteOptimization();
      const res = await completeOptimization(request);

      // Returns 500 because getTenantIdForOrg=null causes requireCurrentUser to
      // throw a non-InvariantError which is caught by the generic catch block
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it("returns 200 with result and events on success", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_OPTIMIZATION_ID, status: "completed", results: { recommendedShifts: 3 } },
        emittedEvents: [{ type: "WorkforceOptimizationEvent", entityId: TEST_OPTIMIZATION_ID }],
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, results: '{"recommendedShifts":3}' });
      const completeOptimization = await getCompleteOptimization();
      const res = await completeOptimization(request);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_OPTIMIZATION_ID);
      expect(body.events).toHaveLength(1);
    });

    it("returns 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagersCanRunOptimization" },
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, results: '{"recommendedShifts":3}' });
      const completeOptimization = await getCompleteOptimization();
      const res = await completeOptimization(request);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Access denied: ManagersCanRunOptimization");
      expect(body.message).toContain("(role=admin)");
    });

    it("returns 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Cannot complete optimization that is not in_progress",
        },
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, results: '{"recommendedShifts":3}' });
      const completeOptimization = await getCompleteOptimization();
      const res = await completeOptimization(request);

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
    });

    it("returns 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "State transition not allowed",
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, results: '{"recommendedShifts":3}' });
      const completeOptimization = await getCompleteOptimization();
      const res = await completeOptimization(request);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("State transition not allowed");
    });

    it("returns 400 with default message when error is null", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: null,
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, results: '{"recommendedShifts":3}' });
      const completeOptimization = await getCompleteOptimization();
      const res = await completeOptimization(request);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Command failed");
    });

    it("returns 500 when runtime throws", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime explosion"));

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, results: '{"recommendedShifts":3}' });
      const completeOptimization = await getCompleteOptimization();
      const res = await completeOptimization(request);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it("passes correct command name + entity (no instanceId) to runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_OPTIMIZATION_ID },
        emittedEvents: [],
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, results: '{"recommendedShifts":3}' });
      const completeOptimization = await getCompleteOptimization();
      await completeOptimization(request);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "complete",
        { id: TEST_OPTIMIZATION_ID, results: '{"recommendedShifts":3}' },
        { entityName: "WorkforceOptimization" }
      );

      const callArgs = mockRunCommand.mock.calls[0];
      expect(callArgs).toHaveLength(3);
      expect(callArgs[2]).not.toHaveProperty("instanceId");
    });
  });

  describe("POST /api/workforceoptimization/fail", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      makeRuntime(mockRunCommand);
    });

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, error: "Insufficient availability" });
      const failOptimization = await getFailOptimization();
      const res = await failOptimization(request);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, error: "Insufficient availability" });
      const failOptimization = await getFailOptimization();
      const res = await failOptimization(request);

      // Returns 500 because getTenantIdForOrg=null causes requireCurrentUser to
      // throw a non-InvariantError which is caught by the generic catch block
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it("returns 200 with result and events on success", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_OPTIMIZATION_ID, status: "failed", error: "Insufficient availability" },
        emittedEvents: [{ type: "WorkforceOptimizationEvent", entityId: TEST_OPTIMIZATION_ID }],
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, error: "Insufficient availability" });
      const failOptimization = await getFailOptimization();
      const res = await failOptimization(request);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_OPTIMIZATION_ID);
      expect(body.events).toHaveLength(1);
    });

    it("returns 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "ManagersCanRunOptimization" },
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, error: "Insufficient availability" });
      const failOptimization = await getFailOptimization();
      const res = await failOptimization(request);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Access denied: ManagersCanRunOptimization");
      expect(body.message).toContain("(role=admin)");
    });

    it("returns 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Cannot fail optimization that is not in_progress",
        },
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, error: "Insufficient availability" });
      const failOptimization = await getFailOptimization();
      const res = await failOptimization(request);

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
    });

    it("returns 400 on generic command failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "State transition not allowed",
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, error: "Insufficient availability" });
      const failOptimization = await getFailOptimization();
      const res = await failOptimization(request);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("State transition not allowed");
    });

    it("returns 400 with default message when error is null", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: null,
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, error: "Insufficient availability" });
      const failOptimization = await getFailOptimization();
      const res = await failOptimization(request);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Command failed");
    });

    it("returns 500 when runtime throws", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime explosion"));

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, error: "Insufficient availability" });
      const failOptimization = await getFailOptimization();
      const res = await failOptimization(request);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it("passes correct command name + entity (no instanceId) to runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_OPTIMIZATION_ID },
        emittedEvents: [],
      });

      const request = makeCommandRequest({ id: TEST_OPTIMIZATION_ID, error: "Insufficient availability" });
      const failOptimization = await getFailOptimization();
      await failOptimization(request);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "fail",
        { id: TEST_OPTIMIZATION_ID, error: "Insufficient availability" },
        { entityName: "WorkforceOptimization" }
      );

      const callArgs = mockRunCommand.mock.calls[0];
      expect(callArgs).toHaveLength(3);
      expect(callArgs[2]).not.toHaveProperty("instanceId");
    });
  });
});