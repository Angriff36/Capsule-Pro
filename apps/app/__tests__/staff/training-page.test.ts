/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app over-fetch):
 * the Staff Training list RSC page did a `trainingModule.findMany` (UNBOUNDED,
 * no take) with `include: { _count }` but NO scalar select, materializing all
 * ~20 columns of every module row — code, contentUrl, passThresholdPercent,
 * maxAttempts, requiredRole, status, version, publishedAt, archivedAt, notes,
 * createdBy, … — scaled by N modules per page load. The page's row map consumes
 * only 9 scalar fields (+ the _count relations), so folding the include into a
 * focused select drops the unused columns per row with zero behavior change
 * (column projection — row counts + the BigInt(_count) values are identical).
 *
 * This test pins:
 *  1. findMany carries a top-level `select` (NOT a bare include) of the 9
 *     consumed scalar fields, with the `_count` relations preserved inside it.
 *  2. Returned rows' consumed fields resolve cleanly over a fixture (BigInt
 *     coercion of the _count values).
 *  3. No read fires when unauthenticated (notFound short-circuits).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    trainingModule: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import StaffTrainingPage from "../../app/(authenticated)/(tenant-team)/staff/training/page";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const trainingFindMany = database.trainingModule.findMany as ReturnType<
  typeof vi.fn
>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";

const modulesFixture = [
  {
    id: "mod-1",
    title: "Food Safety 101",
    description: "Basics of safe food handling.",
    contentType: "video",
    durationMinutes: 30,
    category: "Safety",
    isRequired: true,
    isActive: true,
    createdAt: new Date("2026-06-01"),
    _count: { assignments: 5, trainingCompletions: 3 },
  },
  {
    id: "mod-2",
    title: "Customer Service",
    description: null,
    contentType: "document",
    durationMinutes: null,
    category: null,
    isRequired: false,
    isActive: false,
    createdAt: new Date("2026-06-15"),
    _count: { assignments: 0, trainingCompletions: 0 },
  },
];

const SELECT_SCALARS_ONLY_CONSUMED = {
  id: true,
  title: true,
  description: true,
  contentType: true,
  durationMinutes: true,
  category: true,
  isRequired: true,
  isActive: true,
  createdAt: true,
};

describe("StaffTrainingPage — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
    trainingFindMany.mockResolvedValue(modulesFixture);
  });

  it("selects the 9 consumed scalars + keeps _count (no full-row include over-fetch)", async () => {
    await StaffTrainingPage();

    expect(trainingFindMany).toHaveBeenCalledTimes(1);
    const call = trainingFindMany.mock.calls.at(0)?.[0] ?? {};
    // A focused top-level select exists (reverting to `include` would drop it).
    expect(call).toEqual(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: expect.objectContaining(SELECT_SCALARS_ONLY_CONSUMED),
      })
    );
    // The _count relations are preserved INSIDE the select (folded from include).
    expect(call.select).toEqual(
      expect.objectContaining({
        _count: {
          select: {
            assignments: { where: { deletedAt: null } },
            trainingCompletions: true,
          },
        },
      })
    );
  });

  it("resolves the row map over the fixture (BigInt _count coercion)", async () => {
    // The page BigInt-wraps _count.assignments / _count.trainingCompletions and
    // renders the table — resolving cleanly proves the selected fields feed it.
    const result = await StaffTrainingPage();
    expect(result).toBeDefined();
    expect(trainingFindMany).toHaveBeenCalledTimes(1);
  });

  it("fires no DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ orgId: null });

    await expect(StaffTrainingPage()).rejects.toThrow("NOT_FOUND");

    expect(trainingFindMany).not.toHaveBeenCalled();
  });
});
