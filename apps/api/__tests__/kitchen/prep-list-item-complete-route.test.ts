/**
 * POST /api/kitchen/prep-lists/[id]/items/[itemId]/complete
 *
 * Server owns actor identity: completedByUserId comes from requireCurrentUser,
 * never from the request body.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  tenant: vi.fn(),
  requireCurrentUser: vi.fn(),
  captureException: vi.fn(),
  runCommand: vi.fn(),
  createManifestRuntime: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenant,
  requireCurrentUser: mocks.requireCurrentUser,
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: mocks.createManifestRuntime,
}));
vi.mock("@repo/manifest-runtime/route-helpers", async () => {
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

import { POST } from "@/app/api/kitchen/prep-lists/[id]/items/[itemId]/complete/route";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    "http://localhost/api/kitchen/prep-lists/list-1/items/item-1/complete",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const params = Promise.resolve({ id: "list-1", itemId: "item-1" });

describe("POST prep-list item complete composite route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      userId: "clerk_user_1",
      orgId: "org_1",
    });
    mocks.tenant.mockResolvedValue("tenant-1");
    mocks.requireCurrentUser.mockResolvedValue({
      id: "employee-uuid-1",
      tenantId: "tenant-1",
    });
    mocks.createManifestRuntime.mockResolvedValue({
      runCommand: mocks.runCommand,
    });
  });

  it("incomplete → complete uses server-resolved employee id as completedByUserId", async () => {
    mocks.runCommand.mockResolvedValue({
      success: true,
      result: {
        id: "item-1",
        isCompleted: true,
        completedBy: "employee-uuid-1",
      },
      emittedEvents: [],
    });

    const response = await POST(makeRequest({ completed: true }), { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mocks.runCommand).toHaveBeenCalledWith(
      "markCompleted",
      { id: "item-1", completedByUserId: "employee-uuid-1" },
      { entityName: "PrepListItem" }
    );

    const bodyArg = mocks.runCommand.mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    expect(bodyArg.completedByUserId).toBe("employee-uuid-1");
    expect(bodyArg.completedByUserId).not.toBe("clerk_user_1");
  });

  it("complete → incomplete calls markUncompleted without actor param", async () => {
    mocks.runCommand.mockResolvedValue({
      success: true,
      result: { id: "item-1", isCompleted: false },
      emittedEvents: [],
    });

    const response = await POST(makeRequest({ completed: false }), { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mocks.runCommand).toHaveBeenCalledWith(
      "markUncompleted",
      { id: "item-1" },
      { entityName: "PrepListItem" }
    );
  });

  it("ignores client-supplied completedByUserId and still uses requireCurrentUser", async () => {
    mocks.runCommand.mockResolvedValue({
      success: true,
      result: { id: "item-1", isCompleted: true },
      emittedEvents: [],
    });

    await POST(
      makeRequest({
        completed: true,
        completedByUserId: "attacker-spoofed-id",
      }),
      { params }
    );

    const bodyArg = mocks.runCommand.mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    expect(bodyArg.completedByUserId).toBe("employee-uuid-1");
    expect(bodyArg.completedByUserId).not.toBe("attacker-spoofed-id");
  });
});
