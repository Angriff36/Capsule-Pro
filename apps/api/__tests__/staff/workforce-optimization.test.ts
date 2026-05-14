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

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
  invariant: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

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

// --- Imports (after mocks) ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000900";
const TEST_ORG_ID = "org_workforce_test";
const TEST_CLERK_ID = "clerk_workforce_test";
const TEST_OPTIMIZATION_ID = "99999999-9999-4999-a999-999999999999";

// --- Helpers ---

function authed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_CLERK_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_CLERK_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

function unauthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);
}

function makeRequest(url: string, init?: RequestInit): NextRequest {
  const opts: RequestInit = { ...init };
  if (opts.body && !opts.headers) {
    opts.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), opts as never);
}

function postRequest(url: string, body: unknown = {}): NextRequest {
  return makeRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: TEST_OPTIMIZATION_ID }
) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [
        { type: "WorkforceOptimizationEvent", entityId: result.id },
      ],
    }),
  } as never);
}

function mockRuntimeFailure(error: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      error,
    }),
  } as never);
}

function mockRuntimePolicyDenial(policyName: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      policyDenial: { policyName },
    }),
  } as never);
}

function mockRuntimeGuardFailure(index: number, formatted: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      guardFailure: { index, formatted },
    }),
  } as never);
}

// --- Test Suite ---

describe("WorkforceOptimization Commands API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  type Cmd = {
    name: string;
    runtimeName: string;
    path: string;
    routePath: string;
    sampleBody: Record<string, unknown>;
  };

  const COMMANDS: Cmd[] = [
    {
      name: "create",
      runtimeName: "create",
      path: "/api/workforceoptimization/create",
      routePath: "@/app/api/workforceoptimization/create/route",
      sampleBody: {
        locationId: "loc_001",
        optimizationType: "schedule",
      },
    },
    {
      name: "start",
      runtimeName: "start",
      path: "/api/workforceoptimization/start",
      routePath: "@/app/api/workforceoptimization/start/route",
      sampleBody: { id: TEST_OPTIMIZATION_ID },
    },
    {
      name: "complete",
      runtimeName: "complete",
      path: "/api/workforceoptimization/complete",
      routePath: "@/app/api/workforceoptimization/complete/route",
      sampleBody: {
        id: TEST_OPTIMIZATION_ID,
        results: '{"recommendedShifts":3,"laborSavings":250}',
      },
    },
    {
      name: "fail",
      runtimeName: "fail",
      path: "/api/workforceoptimization/fail",
      routePath: "@/app/api/workforceoptimization/fail/route",
      sampleBody: {
        id: TEST_OPTIMIZATION_ID,
        error: "Insufficient employee availability",
      },
    },
  ];

  describe.each(COMMANDS)("POST $path", ({
    name,
    runtimeName,
    path,
    routePath,
    sampleBody,
  }) => {
    it(`returns 401 when unauthenticated [${name}]`, async () => {
      unauthed();
      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({
          entity: "WorkforceOptimization",
          command: name,
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it(`returns 400 when tenant cannot be resolved [${name}]`, async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({
          entity: "WorkforceOptimization",
          command: name,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Tenant not found");
    });

    it(`returns 200 with result and events on success [${name}]`, async () => {
      mockRuntimeSuccess({ id: TEST_OPTIMIZATION_ID, status: "pending" });

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({
          entity: "WorkforceOptimization",
          command: name,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_OPTIMIZATION_ID);
      expect(body.events).toHaveLength(1);

      // Pin the user-context shape: routes pass clerk userId directly,
      // NOT the resolved internal user. A regression that adds
      // database.user.findFirst lookup would surface here.
      const runtimeCall = vi.mocked(createManifestRuntime).mock.calls[0][0];
      expect(runtimeCall).toEqual({
        user: {
          id: TEST_CLERK_ID,
          tenantId: TEST_TENANT_ID,
        },
      });
    });

    it(`returns 403 on policy denial [${name}]`, async () => {
      mockRuntimePolicyDenial("ManagersCanRunOptimization");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({
          entity: "WorkforceOptimization",
          command: name,
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toBe("Access denied: ManagersCanRunOptimization");
      // Pin: this domain's policy-denial does NOT include `role=` suffix.
      expect(body.message).not.toContain("role=");
    });

    it(`returns 422 on guard failure [${name}]`, async () => {
      mockRuntimeGuardFailure(
        0,
        "optimizationType must be one of schedule|assignment|performance"
      );

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({
          entity: "WorkforceOptimization",
          command: name,
        }),
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("optimizationType must be one of");
    });

    it(`returns 400 on generic command failure [${name}]`, async () => {
      mockRuntimeFailure("State transition not allowed");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({
          entity: "WorkforceOptimization",
          command: name,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("State transition not allowed");
    });

    it(`returns 400 with default message when error is null [${name}]`, async () => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({ success: false }),
      } as never);

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({
          entity: "WorkforceOptimization",
          command: name,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Command failed");
    });

    it(`returns 500 when runtime throws [${name}]`, async () => {
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Runtime explosion") as never
      );

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({
          entity: "WorkforceOptimization",
          command: name,
        }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it(`passes correct command name + entity (no instanceId) to runtime [${name}]`, async () => {
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: TEST_OPTIMIZATION_ID },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const mod = await import(routePath);
      await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({
          entity: "WorkforceOptimization",
          command: name,
        }),
      });

      // Pin the exact 3-arg shape: all 4 commands are entity-scoped,
      // so no `instanceId` is passed even for state-transitioning verbs
      // like start/complete/fail. The runtime resolves the instance from
      // body.id. Adding `instanceId: body.id` here would double-route.
      expect(runCommand).toHaveBeenCalledWith(runtimeName, sampleBody, {
        entityName: "WorkforceOptimization",
      });

      // Verify NO 4th arg or extra options key sneaked in.
      const callArgs = runCommand.mock.calls[0];
      expect(callArgs).toHaveLength(3);
      expect(callArgs[2]).not.toHaveProperty("instanceId");
    });
  });
});
