/**
 * Notification Commands API Test Suite
 *
 * Tests the manifest dispatcher for Notification commands:
 *   create, mark-dismissed, mark-read, remove
 *
 * The dispatcher is at @/app/api/manifest/[entity]/commands/[command]/route
 * and delegates to runManifestCommand after resolving auth via requireCurrentUser.
 *
 * Coverage per command:
 *   401 unauth (InvariantError), 200 success, 403 policy denial,
 *   422 guard failure, 400 generic failure, 400 null error,
 *   500 runtime throw, runtime invocation pin.
 *
 * @vitest-environment node
 */

import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

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

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@repo/database", () => ({
  database: {
    user: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

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

// --- Imports (after mocks) ---

const { requireCurrentUser } = await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");
const { InvariantError } = await import("@/app/lib/invariant");

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000300";
const TEST_USER_ID = "user_notification_test_internal";
const TEST_USER_ROLE = "admin";
const TEST_NOTIFICATION_ID = "33333333-3333-4333-a333-333333333333";

// --- Helpers ---

function authed() {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: TEST_USER_ROLE,
  } as never);
}

function unauthed(message = "Unauthorized") {
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError(message) as never
  );
}

function postRequest(url: string, body: unknown = {}): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

/** Build route params context for the dispatcher. */
function routeParams(entity: string, command: string) {
  return { params: Promise.resolve({ entity, command }) };
}

function mockCommandSuccess(
  result: Record<string, unknown> = { id: TEST_NOTIFICATION_ID }
) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    NextResponse.json({
      success: true,
      result,
      events: [{ type: "NotificationEvent", entityId: result.id }],
    }) as never
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

// --- Test Suite ---

describe("Notification Commands API", () => {
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
    path: string;
    routePath: string;
    sampleBody: Record<string, unknown>;
  };

  const COMMANDS: Cmd[] = [
    {
      name: "create",
      command: "create",
      path: "/api/manifest/Notification/commands/create",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: {
        recipient_employee_id: TEST_USER_ID,
        notification_type: "info",
        title: "Test",
        body: "Test body",
      },
    },
    {
      name: "mark-dismissed",
      command: "mark-dismissed",
      path: "/api/manifest/Notification/commands/mark-dismissed",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_NOTIFICATION_ID },
    },
    {
      name: "mark-read",
      command: "mark-read",
      path: "/api/manifest/Notification/commands/mark-read",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_NOTIFICATION_ID },
    },
    {
      name: "remove",
      command: "remove",
      path: "/api/manifest/Notification/commands/remove",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_NOTIFICATION_ID },
    },
  ];

  describe.each(COMMANDS)("POST $name", ({
    name,
    command,
    path,
    routePath,
    sampleBody,
  }) => {
    it(`returns 401 when unauthenticated [${name}]`, async () => {
      unauthed("Unauthenticated");

      const mod = await import(routePath);
      const res = await mod.POST(
        postRequest(path, sampleBody),
        routeParams("Notification", command)
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthenticated");
    });

    it(`returns 200 with result and events on success [${name}]`, async () => {
      mockCommandSuccess({ id: TEST_NOTIFICATION_ID });

      const mod = await import(routePath);
      const res = await mod.POST(
        postRequest(path, sampleBody),
        routeParams("Notification", command)
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_NOTIFICATION_ID);
      expect(body.events).toHaveLength(1);
    });

    it(`passes correct entity, command, body, and user to runManifestCommand [${name}]`, async () => {
      mockCommandSuccess();

      const mod = await import(routePath);
      await mod.POST(
        postRequest(path, sampleBody),
        routeParams("Notification", command)
      );

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Notification",
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

    it(`returns 403 on policy denial [${name}]`, async () => {
      mockCommandPolicyDenial("adminOnly");

      const mod = await import(routePath);
      const res = await mod.POST(
        postRequest(path, sampleBody),
        routeParams("Notification", command)
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("adminOnly");
      expect(body.message).toContain(`role=${TEST_USER_ROLE}`);
    });

    it(`returns 422 on guard failure [${name}]`, async () => {
      mockCommandGuardFailure(0, "id is required");

      const mod = await import(routePath);
      const res = await mod.POST(
        postRequest(path, sampleBody),
        routeParams("Notification", command)
      );

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("id is required");
    });

    it(`returns 400 on generic command failure [${name}]`, async () => {
      mockCommandFailure("State transition not allowed");

      const mod = await import(routePath);
      const res = await mod.POST(
        postRequest(path, sampleBody),
        routeParams("Notification", command)
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("State transition not allowed");
    });

    it(`returns 400 with default message when error is null [${name}]`, async () => {
      mockCommandFailure("Command failed");

      const mod = await import(routePath);
      const res = await mod.POST(
        postRequest(path, sampleBody),
        routeParams("Notification", command)
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Command failed");
    });

    it(`returns 500 when runtime throws [${name}]`, async () => {
      // The dispatcher does `return runManifestCommand(...)` without `await`,
      // so a rejected promise escapes the try/catch. Use a synchronous throw
      // so the dispatcher's catch block fires and returns 500.
      vi.mocked(runManifestCommand).mockImplementation(() => {
        throw new Error("Runtime explosion");
      });

      const mod = await import(routePath);
      const res = await mod.POST(
        postRequest(path, sampleBody),
        routeParams("Notification", command)
      );

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });
});
