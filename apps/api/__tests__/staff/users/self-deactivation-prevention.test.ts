/**
 * Self-Deactivation Prevention Tests (P1.BX)
 *
 * Why this matters: an admin/manager who deactivates their own account loses
 * access immediately. If they are the only privileged user, the tenant becomes
 * unrecoverable from the UI. The deactivate route MUST refuse to process when
 * body.userId resolves to the caller's own internal user id.
 *
 * These tests encode the WHY (lockout prevention), not just the WHAT (403).
 *
 * Uses the dedicated /api/user/deactivate route which includes self-deactivation
 * prevention before delegating to runManifestCommand.
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDatabase } = vi.hoisted(() => ({
  mockDatabase: {
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@repo/database", () => ({ database: mockDatabase }));
vi.mock("@/lib/database", () => ({ database: mockDatabase }));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireTenantId: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(msg: string) {
      super(msg);
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

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

const TENANT = "a0000000-0000-4000-a000-000000000001";
const ORG = "org-test-1";
const CLERK = "clerk_self_001";
const SELF_INTERNAL = "user-self-001";
const OTHER_INTERNAL = "user-other-002";

// Helper function to get the dedicated user deactivate handler
async function getDeactivateHandler() {
  const mod = await import("@/app/api/user/deactivate/route");
  return (req: NextRequest) => mod.POST(req);
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL("http://localhost:3000/api/manifest/User/commands/deactivate"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    } as ConstructorParameters<typeof NextRequest>[1]
  );
}

/** Mock requireCurrentUser to return an authenticated internal user */
function mockAuthenticatedUser(overrides: Record<string, unknown> = {}) {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: SELF_INTERNAL,
    tenantId: TENANT,
    role: "admin",
    email: "admin@test.com",
    firstName: "Self",
    lastName: "Admin",
    ...overrides,
  } as never);
}

describe("POST /api/user/deactivate — self-deactivation prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: ORG, userId: CLERK } as any);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT);
    vi.mocked(runManifestCommand).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: { id: OTHER_INTERNAL },
          events: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
  });

  it("returns 403 and does NOT run command when caller targets own userId", async () => {
    mockAuthenticatedUser({ id: SELF_INTERNAL });
    mockDatabase.user.findFirst.mockResolvedValue({ id: SELF_INTERNAL });

    const deactivate = await getDeactivateHandler();
    const res = await deactivate(
      makeRequest({ userId: SELF_INTERNAL, reason: "x" })
    );

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(String(json.message ?? json.error ?? "")).toMatch(
      /cannot deactivate your own account/i
    );
    expect(runManifestCommand).not.toHaveBeenCalled();
  });

  it("allows deactivating another user (passes through to runtime)", async () => {
    mockAuthenticatedUser({ id: SELF_INTERNAL });
    mockDatabase.user.findFirst.mockResolvedValue({ id: SELF_INTERNAL });

    const deactivate = await getDeactivateHandler();
    const res = await deactivate(
      makeRequest({ userId: OTHER_INTERNAL, reason: "leaving" })
    );

    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "User",
        command: "deactivate",
        body: expect.objectContaining({ userId: OTHER_INTERNAL }),
        user: expect.objectContaining({ id: SELF_INTERNAL }),
      })
    );
  });

  it("allows the command when targeting a different user even with same role", async () => {
    // Verifies the self-deactivation check only blocks when caller targets
    // their own userId — a different user with the same role is allowed.
    // The manifest policy layer will still enforce role-based access.
    mockAuthenticatedUser({ id: SELF_INTERNAL });

    const deactivate = await getDeactivateHandler();
    const res = await deactivate(
      makeRequest({ userId: OTHER_INTERNAL, reason: "restructuring" })
    );

    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          userId: OTHER_INTERNAL,
          reason: "restructuring",
        }),
      })
    );
  });

  it("returns 401 when unauthenticated", async () => {
    // requireCurrentUser throws InvariantError when not authenticated
    const { InvariantError } = await import("@/app/lib/invariant");
    vi.mocked(requireCurrentUser).mockRejectedValue(
      new InvariantError("Unauthenticated")
    );
    const deactivate = await getDeactivateHandler();
    const res = await deactivate(makeRequest({ userId: SELF_INTERNAL }));
    expect(res.status).toBe(401);
    expect(runManifestCommand).not.toHaveBeenCalled();
  });
});
