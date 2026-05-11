/**
 * Self-Deactivation Prevention Tests (P1.BX)
 *
 * Why this matters: an admin/manager who deactivates their own account loses
 * access immediately. If they are the only privileged user, the tenant becomes
 * unrecoverable from the UI. The deactivate route MUST refuse to process when
 * body.userId resolves to the caller's own internal user id.
 *
 * These tests encode the WHY (lockout prevention), not just the WHAT (403).
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
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

const TENANT = "a0000000-0000-4000-a000-000000000001";
const ORG = "org-test-1";
const CLERK = "clerk_self_001";
const SELF_INTERNAL = "user-self-001";
const OTHER_INTERNAL = "user-other-002";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL("http://localhost:3000/api/user/deactivate"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    } as ConstructorParameters<typeof NextRequest>[1]
  );
}

describe("POST /api/user/deactivate — self-deactivation prevention", () => {
  const runCommand = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: ORG, userId: CLERK } as any);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT);
    runCommand.mockReset();
    runCommand.mockResolvedValue({
      success: true,
      result: { id: OTHER_INTERNAL },
      emittedEvents: [],
    });
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand,
    } as any);
  });

  it("returns 403 and does NOT run command when caller targets own userId", async () => {
    mockDatabase.user.findFirst.mockResolvedValue({ id: SELF_INTERNAL });

    const { POST } = await import("@/app/api/user/deactivate/route");
    const res = await POST(makeRequest({ userId: SELF_INTERNAL, reason: "x" }));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(String(json.message ?? json.error ?? "")).toMatch(
      /cannot deactivate your own account/i
    );
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("allows deactivating another user (passes through to runtime)", async () => {
    mockDatabase.user.findFirst.mockResolvedValue({ id: SELF_INTERNAL });

    const { POST } = await import("@/app/api/user/deactivate/route");
    const res = await POST(
      makeRequest({ userId: OTHER_INTERNAL, reason: "leaving" })
    );

    expect(res.status).toBe(200);
    expect(runCommand).toHaveBeenCalledWith(
      "deactivate",
      expect.objectContaining({ userId: OTHER_INTERNAL }),
      expect.objectContaining({
        entityName: "User",
        instanceId: OTHER_INTERNAL,
      })
    );
  });

  it("allows the command when the caller's internal user record cannot be resolved (fail-open vs. command-level guards)", async () => {
    // If we can't resolve the caller's internal id, we don't have grounds to
    // block — the manifest policy will still enforce role-based access. This
    // documents the chosen behavior so a future change to fail-closed is a
    // deliberate decision, not an accident.
    mockDatabase.user.findFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/user/deactivate/route");
    const res = await POST(makeRequest({ userId: SELF_INTERNAL, reason: "x" }));

    expect(res.status).toBe(200);
    expect(runCommand).toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);
    const { POST } = await import("@/app/api/user/deactivate/route");
    const res = await POST(makeRequest({ userId: SELF_INTERNAL }));
    expect(res.status).toBe(401);
    expect(runCommand).not.toHaveBeenCalled();
  });
});
