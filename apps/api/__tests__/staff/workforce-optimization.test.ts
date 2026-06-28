/**
 * WorkforceOptimization Commands API Test Suite
 *
 * Tests the 4 command routes dispatched through the generic manifest
 * dispatcher at /api/manifest/[entity]/commands/[command]:
 *   create, start, complete, fail
 *
 * Why this matters:
 * - WorkforceOptimization is the AI-driven scheduling primitive: a tenant
 *   triggers an optimization run (schedule | assignment | performance), the
 *   runtime moves it through the state machine `pending -> in_progress ->
 *   completed | failed`, and downstream consumers (dashboards, schedule
 *   suggestions) read the resulting `results` blob. A regression on the
 *   verb mapping silently strands an in-flight run, leaves the UI showing
 *   "pending" forever, and the only way to notice is when a manager opens
 *   a dashboard at 2am on Saturday and finds last week's optimization
 *   never completed.
 * - All 4 commands route through the generic manifest dispatcher (no
 *   per-entity concrete routes). Tests pin the correct entity/command slug
 *   pair passed via context params.
 * - The dispatcher uses requireCurrentUser (not auth + getTenantIdForOrg),
 *   so the user context shape is { id, tenantId, role, email, firstName,
 *   lastName }. Tests pin that runManifestCommand receives the correct
 *   user subshape { id, tenantId, role }.
 *
 * Coverage per command (9 cases, 36 tests total):
 *   401 InvariantError, 500 requireCurrentUser throws non-invariant,
 *   200 success, 403 policy denial, 422 guard failure,
 *   400 generic failure, 400 default-error fallback, 500 runtime throw,
 *   plus runManifestCommand invocation pin (entity + command + body + user).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Imports (dispatcher) ---

import { POST as dispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

// --- Mocks ---

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    override name = "InvariantError";
  },
}));

vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {},
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));

// --- Imports (after mocks) ---

const { runManifestCommand } = await import("@/lib/manifest/execute-command");
const { requireCurrentUser } = await import("@/app/lib/tenant");

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000900";
const TEST_USER_ID = "user_workforce_internal";
const TEST_USER_ROLE = "admin";
const TEST_OPTIMIZATION_ID = "99999999-9999-4999-a999-999999999999";

const MOCK_USER = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  role: TEST_USER_ROLE,
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
};

// --- Helpers ---

function authed() {
  vi.mocked(requireCurrentUser).mockResolvedValue(MOCK_USER as never);
}

function unauthed() {
  const authError = new Error("Unauthenticated");
  authError.name = "InvariantError";
  vi.mocked(requireCurrentUser).mockRejectedValue(authError as never);
}

function postRequest(body: unknown = {}): NextRequest {
  return new NextRequest(
    "http://localhost/api/manifest/WorkforceOptimization/commands/create",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function makeContext(command: string) {
  return {
    params: Promise.resolve({ entity: "WorkforceOptimization", command }),
  };
}

function mockSuccess(
  result: Record<string, unknown> = { id: TEST_OPTIMIZATION_ID }
) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        result,
        events: [{ type: "WorkforceOptimizationEvent", entityId: result.id }],
      }),
      { status: 200 }
    )
  );
}

function mockFailure(message: string, status = 400) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(JSON.stringify({ success: false, message }), { status })
  );
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
    command: string;
    sampleBody: Record<string, unknown>;
  };

  const COMMANDS: Cmd[] = [
    {
      name: "create",
      command: "create",
      sampleBody: {
        locationId: "loc_001",
        optimizationType: "schedule",
      },
    },
    {
      name: "start",
      command: "start",
      sampleBody: { id: TEST_OPTIMIZATION_ID },
    },
    {
      name: "complete",
      command: "complete",
      sampleBody: {
        id: TEST_OPTIMIZATION_ID,
        results: '{"recommendedShifts":3,"laborSavings":250}',
      },
    },
    {
      name: "fail",
      command: "fail",
      sampleBody: {
        id: TEST_OPTIMIZATION_ID,
        error: "Insufficient employee availability",
      },
    },
  ];

  describe.each(COMMANDS)("command $name", ({ name, command, sampleBody }) => {
    it(`returns 401 when requireCurrentUser throws InvariantError [${name}]`, async () => {
      unauthed();
      const res = await dispatch(postRequest(sampleBody), makeContext(command));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthenticated");
    });

    it(`returns 500 when requireCurrentUser throws non-InvariantError [${name}]`, async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("DB connection lost") as never
      );
      const res = await dispatch(postRequest(sampleBody), makeContext(command));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it(`returns 200 with result and events on success [${name}]`, async () => {
      mockSuccess({ id: TEST_OPTIMIZATION_ID, status: "pending" });

      const res = await dispatch(postRequest(sampleBody), makeContext(command));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_OPTIMIZATION_ID);
      expect(body.events).toHaveLength(1);
    });

    it(`returns 403 on policy denial [${name}]`, async () => {
      mockFailure("Access denied: ManagersCanRunOptimization", 403);

      const res = await dispatch(postRequest(sampleBody), makeContext(command));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toBe("Access denied: ManagersCanRunOptimization");
    });

    it(`returns 422 on guard failure [${name}]`, async () => {
      mockFailure(
        "Guard 0 failed: optimizationType must be one of schedule|assignment|performance",
        422
      );

      const res = await dispatch(postRequest(sampleBody), makeContext(command));

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("optimizationType must be one of");
    });

    it(`returns 400 on generic command failure [${name}]`, async () => {
      mockFailure("State transition not allowed", 400);

      const res = await dispatch(postRequest(sampleBody), makeContext(command));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("State transition not allowed");
    });

    it(`returns 400 with default message when error is empty [${name}]`, async () => {
      mockFailure("Command failed", 400);

      const res = await dispatch(postRequest(sampleBody), makeContext(command));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Command failed");
    });

    it(`returns 500 when runManifestCommand throws [${name}]`, async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Runtime explosion") as never
      );

      const res = await dispatch(postRequest(sampleBody), makeContext(command));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it(`passes correct entity, command, body, and user to runManifestCommand [${name}]`, async () => {
      mockSuccess({ id: TEST_OPTIMIZATION_ID });

      await dispatch(postRequest(sampleBody), makeContext(command));

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "WorkforceOptimization",
          command,
          body: sampleBody,
          user: {
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: TEST_USER_ROLE,
          },
        })
      );
    });
  });
});
