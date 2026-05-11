/**
 * Role guard unit tests (P1.AM).
 *
 * Why this matters: the requireApiRole helper is the single point of
 * enforcement for admin/manager gating across sensitive write routes. If the
 * helper silently fails open (e.g. swallowing a thrown error from
 * requireCurrentUser, or matching against an unintended role string), every
 * route that depends on it inherits the bug. These tests pin the failure modes
 * — unauthenticated, wrong role, allowed role — to the exact HTTP shape each
 * route relies on.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));

import { requireCurrentUser } from "@/app/lib/tenant";
import {
  ADMIN_ROLES,
  MANAGER_ROLES,
  requireApiAdmin,
  requireApiManager,
  requireApiRole,
} from "@/app/lib/auth-roles";

const TENANT = "tenant-1";
const USER = {
  id: "user-1",
  tenantId: TENANT,
  email: "x@y.com",
  firstName: "A",
  lastName: "B",
};

describe("requireApiRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when requireCurrentUser throws (no session)", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new Error("no session"));
    const result = await requireApiRole(["admin"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.message).toBe("Unauthorized");
    }
  });

  it("returns 403 with role + required list when role is not allowed", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ ...USER, role: "staff" });
    const result = await requireApiRole(["admin", "tenant_admin"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json();
      expect(body.message).toBe("Forbidden");
      expect(body.role).toBe("staff");
      expect(body.required).toEqual(["admin", "tenant_admin"]);
    }
  });

  it("returns ok with user + tenantId when role matches allow-list", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ ...USER, role: "admin" });
    const result = await requireApiRole(["admin", "tenant_admin"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tenantId).toBe(TENANT);
      expect(result.user.id).toBe("user-1");
      expect(result.user.role).toBe("admin");
    }
  });

  it("requireApiAdmin matches the documented ADMIN_ROLES set", async () => {
    for (const role of ADMIN_ROLES) {
      vi.mocked(requireCurrentUser).mockResolvedValue({ ...USER, role });
      const result = await requireApiAdmin();
      expect(result.ok, `role ${role} should pass admin gate`).toBe(true);
    }
  });

  it("requireApiAdmin rejects manager-only roles", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({
      ...USER,
      role: "finance_manager",
    });
    const result = await requireApiAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("requireApiManager accepts both admin and manager tiers", async () => {
    for (const role of MANAGER_ROLES) {
      vi.mocked(requireCurrentUser).mockResolvedValue({ ...USER, role });
      const result = await requireApiManager();
      expect(result.ok, `role ${role} should pass manager gate`).toBe(true);
    }
  });

  it("requireApiManager rejects staff role", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({ ...USER, role: "staff" });
    const result = await requireApiManager();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });
});
