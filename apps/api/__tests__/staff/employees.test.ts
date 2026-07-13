/**
 * GET /api/staff/employees — regression guard for the #26 `select` projection.
 *
 * Before the fix, `user.findMany` pulled EVERY User column (incl. salaryAnnual,
 * authUserId, payoutMethod, roleId, terminationDate, employeeNumber) per
 * employee row, then the shape map read only 13 of them — the rest were
 * fetched and discarded. These tests pin the projection: the findMany call
 * MUST carry a `select` enumerating exactly the shipped fields, and MUST NOT
 * select the unused sensitive/salary columns. Also pins the snake_case
 * response shape so a future field rename breaks loudly.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => ({
  database: { user: { findMany: vi.fn() } },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@repo/database");

import { GET } from "@/app/api/staff/employees/route";

const EMP_TENANT_ID = "00000000-0000-0000-0000-000000000071";
const EMP_ORG_ID = "org_staff_employees";

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: EMP_ORG_ID } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(EMP_TENANT_ID);
}

function makeRequest(query = ""): NextRequest {
  return new NextRequest(
    new URL(`/api/staff/employees${query}`, "http://localhost:3000")
  );
}

describe("GET /api/staff/employees", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthed();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(database.user.findMany).not.toHaveBeenCalled();
  });

  it("projects only the shipped fields — no salary/auth/payout columns (#26)", async () => {
    vi.mocked(database.user.findMany).mockResolvedValue([
      {
        id: "u-1",
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "manager",
        isActive: true,
        phone: "555",
        avatarUrl: "",
        employmentType: "full_time",
        hourlyRate: 150.0,
        hireDate: new Date("2026-01-01"),
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
      },
    ] as never);

    const res = await GET(makeRequest("?isActive=true"));
    expect(res.status).toBe(200);

    const select = vi.mocked(database.user.findMany).mock.calls.at(-1)?.[0]
      ?.select;
    if (!select) throw new Error("findMany called without a select projection");
    // Exactly the 13 fields the shape map reads.
    for (const field of [
      "id",
      "email",
      "firstName",
      "lastName",
      "role",
      "isActive",
      "phone",
      "avatarUrl",
      "employmentType",
      "hourlyRate",
      "hireDate",
      "createdAt",
      "updatedAt",
    ]) {
      expect(select).toHaveProperty(field, true);
    }
    // The unused sensitive/salary columns MUST be dropped.
    for (const dropped of [
      "salaryAnnual",
      "authUserId",
      "payoutMethod",
      "roleId",
      "terminationDate",
      "employeeNumber",
    ]) {
      expect(select).not.toHaveProperty(dropped);
    }

    const body = await res.json();
    expect(body.employees).toHaveLength(1);
    expect(body.employees[0]).toMatchObject({
      id: "u-1",
      email: "ada@example.com",
      first_name: "Ada",
      last_name: "Lovelace",
      role: "manager",
      is_active: true,
      employment_type: "full_time",
    });
  });
});
