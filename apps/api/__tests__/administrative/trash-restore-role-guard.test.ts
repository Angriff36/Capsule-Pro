/**
 * Trash restore role-guard tests (P1.AM).
 *
 * Why this matters: POST/DELETE /api/administrative/trash/restore reverses
 * (or finalizes) soft-deletes across arbitrary tenant entities. Before P1.AM,
 * any authenticated user with a session could un-delete records — including
 * records they should never have seen, like terminated employees or refunded
 * payments. Restore is irreversible from an audit perspective; the role gate
 * MUST be admin-only.
 *
 * Tests cover the two write verbs (POST restore, DELETE purge) and pin the
 * 403 path so a refactor that drops the guard fails loudly.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@repo/database", () => ({
  database: {
    // No table queries should happen on the 403 path; absent mocks would throw.
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { requireCurrentUser } from "@/app/lib/tenant";

const baseUser = {
  id: "user-1",
  tenantId: "tenant-1",
  email: "u@e.com",
  firstName: "U",
  lastName: "E",
};

function restoreRequest(): NextRequest {
  return new NextRequest("http://localhost/api/administrative/trash/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entities: [{ id: "x", type: "Event" }] }),
  });
}

function purgeRequest(): NextRequest {
  return new NextRequest(
    "http://localhost/api/administrative/trash/restore?entityId=x&entityType=Event",
    { method: "DELETE" }
  );
}

describe("trash/restore — admin role guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST returns 403 for manager-tier role (finance_manager is not admin)", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({
      ...baseUser,
      role: "finance_manager",
    });
    const { POST } = await import(
      "@/app/api/administrative/trash/restore/route"
    );
    const res = await POST(restoreRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toBe("Forbidden");
    expect(body.required).toEqual(["super_admin", "tenant_admin", "admin"]);
  });

  it("POST returns 401 when no session is resolvable", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new Error("no session"));
    const { POST } = await import(
      "@/app/api/administrative/trash/restore/route"
    );
    const res = await POST(restoreRequest());
    expect(res.status).toBe(401);
  });

  it("DELETE returns 403 for staff role", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({
      ...baseUser,
      role: "staff",
    });
    const { DELETE } = await import(
      "@/app/api/administrative/trash/restore/route"
    );
    const res = await DELETE(purgeRequest());
    expect(res.status).toBe(403);
  });
});
