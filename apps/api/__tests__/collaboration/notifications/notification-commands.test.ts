/**
 * Notification Commands API Test Suite
 *
 * Tests the 4 canonical notification command routes under
 * /api/collaboration/notifications/commands/*:
 *   create, mark-dismissed, mark-read, remove
 *
 * Each route:
 *   1. auth (orgId + clerkId)
 *   2. resolves tenantId via getTenantIdForOrg
 *   3. resolves internal user via database.user.findFirst
 *   4. delegates to runtime.runCommand(verb, body, { entityName, instanceId? })
 *
 * Coverage per route (from menus.test.ts pattern):
 *   401 unauth, 400 tenant-missing, 400 user-not-found,
 *   200 success, 403 policy denial, 422 guard failure,
 *   400 generic failure, 500 runtime throw,
 *   plus runtime invocation pin (verb name + entityName + instanceId).
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

vi.mock("@repo/database", () => ({
  database: {
    user: { findFirst: vi.fn() },
  },
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
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@repo/database");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000300";
const TEST_ORG_ID = "org_notification_test";
const TEST_CLERK_ID = "clerk_notification_test";
const TEST_USER_ID = "user_notification_test_internal";
const TEST_USER_ROLE = "admin";
const TEST_NOTIFICATION_ID = "33333333-3333-4333-a333-333333333333";

// --- Helpers ---

function authed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_CLERK_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
  vi.mocked(database.user.findFirst).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: TEST_USER_ROLE,
    authUserId: TEST_CLERK_ID,
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
  result: Record<string, unknown> = { id: TEST_NOTIFICATION_ID }
) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [{ type: "NotificationEvent", entityId: result.id }],
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
    runtimeName: string;
    path: string;
    routePath: string;
    sampleBody: Record<string, unknown>;
    hasInstanceId: boolean;
  };

  const COMMANDS: Cmd[] = [
    {
      name: "create",
      runtimeName: "create",
      path: "/api/collaboration/notifications/commands/create",
      routePath: "@/app/api/collaboration/notifications/commands/create/route",
      sampleBody: {
        recipient_employee_id: TEST_USER_ID,
        notification_type: "info",
        title: "Test",
        body: "Test body",
      },
      hasInstanceId: false,
    },
    {
      name: "mark-dismissed",
      runtimeName: "markDismissed",
      path: "/api/collaboration/notifications/commands/mark-dismissed",
      routePath:
        "@/app/api/collaboration/notifications/commands/mark-dismissed/route",
      sampleBody: { id: TEST_NOTIFICATION_ID },
      hasInstanceId: true,
    },
    {
      name: "mark-read",
      runtimeName: "markRead",
      path: "/api/collaboration/notifications/commands/mark-read",
      routePath:
        "@/app/api/collaboration/notifications/commands/mark-read/route",
      sampleBody: { id: TEST_NOTIFICATION_ID },
      hasInstanceId: true,
    },
    {
      name: "remove",
      runtimeName: "remove",
      path: "/api/collaboration/notifications/commands/remove",
      routePath: "@/app/api/collaboration/notifications/commands/remove/route",
      sampleBody: { id: TEST_NOTIFICATION_ID },
      hasInstanceId: true,
    },
  ];

  describe.each(COMMANDS)("POST $path", ({
    name,
    runtimeName,
    path,
    routePath,
    sampleBody,
    hasInstanceId,
  }) => {
    it(`returns 401 when unauthenticated [${name}]`, async () => {
      unauthed();
      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it(`returns 400 when tenant cannot be resolved [${name}]`, async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Tenant not found");
    });

    it(`returns 400 when internal user cannot be resolved [${name}]`, async () => {
      vi.mocked(database.user.findFirst).mockResolvedValue(null as never);

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("User not found in database");
    });

    it(`returns 200 with result and events on success [${name}]`, async () => {
      mockRuntimeSuccess({ id: TEST_NOTIFICATION_ID });

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_NOTIFICATION_ID);
      expect(body.events).toHaveLength(1);

      // Verify runtime received correct user context
      const runtimeCall = vi.mocked(createManifestRuntime).mock.calls[0][0];
      expect(runtimeCall).toEqual({
        user: {
          id: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: TEST_USER_ROLE,
        },
        entityName: "Notification",
      });
    });

    it(`returns 403 on policy denial [${name}]`, async () => {
      mockRuntimePolicyDenial("adminOnly");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("adminOnly");
      expect(body.message).toContain(`role=${TEST_USER_ROLE}`);
    });

    it(`returns 422 on guard failure [${name}]`, async () => {
      mockRuntimeGuardFailure(0, "id is required");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("id is required");
    });

    it(`returns 400 on generic command failure [${name}]`, async () => {
      mockRuntimeFailure("State transition not allowed");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("State transition not allowed");
    });

    it(`returns 400 with default message when error is null [${name}]`, async () => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({ success: false }),
      } as never);

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Command failed");
    });

    it(`returns 500 when runtime throws [${name}]`, async () => {
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Runtime explosion") as never
      );

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it(`passes correct command name + entity${hasInstanceId ? " + instanceId" : ""} to runtime [${name}]`, async () => {
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: TEST_NOTIFICATION_ID },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const mod = await import(routePath);
      await mod.POST(postRequest(path, sampleBody));

      if (hasInstanceId) {
        expect(runCommand).toHaveBeenCalledWith(runtimeName, sampleBody, {
          entityName: "Notification",
          instanceId: sampleBody.id,
        });
      } else {
        expect(runCommand).toHaveBeenCalledWith(runtimeName, sampleBody, {
          entityName: "Notification",
        });
      }
    });

    it(`scopes user lookup to tenant + clerk id [${name}]`, async () => {
      mockRuntimeSuccess();

      const mod = await import(routePath);
      await mod.POST(postRequest(path, sampleBody));

      expect(database.user.findFirst).toHaveBeenCalledWith({
        where: {
          AND: [{ tenantId: TEST_TENANT_ID }, { authUserId: TEST_CLERK_ID }],
        },
      });
    });
  });
});
