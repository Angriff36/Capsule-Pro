import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KitchenPage from "@/app/(authenticated)/(operations)/kitchen/page";
import { getTenantIdForOrg } from "@/app/lib/tenant";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    kitchenTask: {
      findMany: vi.fn(),
    },
    kitchenTaskClaim: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock(
  "@/app/(authenticated)/(operations)/kitchen/components/kitchen-navigation",
  () => ({
    KitchenNavigation: () => null,
  })
);

vi.mock(
  "@/app/(authenticated)/(operations)/kitchen/production-board-client",
  () => ({
    ProductionBoardClient: () => null,
  })
);

vi.mock(
  "@/app/(authenticated)/(operations)/kitchen/production-board-realtime",
  () => ({
    ProductionBoardRealtime: () => null,
  })
);

describe("KitchenPage KitchenTask query shape", () => {
  it("filters KitchenTask reads by deletedAt: null (soft-delete)", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: "org_test",
      userId: "user_test",
    } as Awaited<ReturnType<typeof auth>>);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.user.findFirst).mockResolvedValue(null);
    vi.mocked(database.kitchenTask.findMany).mockResolvedValue([]);
    vi.mocked(database.kitchenTaskClaim.findMany).mockResolvedValue([]);
    vi.mocked(database.user.findMany).mockResolvedValue([]);

    await KitchenPage();

    const args = vi.mocked(database.kitchenTask.findMany).mock.calls[0]?.[0];
    // KitchenTask carries a deleted_at column; the production board must exclude
    // soft-deleted tasks. (Stale guard from 2619fd70a's schema-alignment fix.)
    expect(JSON.stringify(args)).toContain('"deletedAt":null');
  });
});

/**
 * db-performance plan #7 — apps/app over-fetch (kitchen production board).
 *
 * The /kitchen board ran three UNBOUNDED full-row fetches on every load:
 * kitchenTask.findMany (all 14 columns × every non-deleted task),
 * kitchenTaskClaim.findMany (all 10 columns × every unreleased claim), and
 * user.findFirst (~15 columns to read only `id`). Each now projects exactly the
 * fields the board + TaskCard consume.
 *
 * select projects columns, never rows — so the board grouping, status filters,
 * claim attach, and assignee avatars are byte-identical with or without it.
 */
describe("KitchenPage focused select (db-perf #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: "org_test",
      userId: "user_test",
    } as Awaited<ReturnType<typeof auth>>);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.user.findFirst).mockResolvedValue({
      id: "user_test",
    } as never);
    vi.mocked(database.user.findMany).mockResolvedValue([
      {
        id: "emp-1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@x.io",
        avatarUrl: null,
      },
    ] as never);
    vi.mocked(database.kitchenTask.findMany).mockResolvedValue([
      {
        id: "task-1",
        title: "Prep mise",
        summary: "Station setup",
        status: "pending",
        priority: 3,
        dueDate: new Date("2026-07-15T18:00:00Z"),
        tags: ["hot-line"],
      },
    ] as never);
    vi.mocked(database.kitchenTaskClaim.findMany).mockResolvedValue([
      { taskId: "task-1", employeeId: "emp-1", releasedAt: null },
    ] as never);
  });

  it("projects ONLY consumed KitchenTask fields on the task read (no full-row over-fetch)", async () => {
    await KitchenPage();

    // toEqual(objectContaining({ select })) is strict on the select value —
    // fails if select is dropped, if a dropped column is re-added, or if a
    // consumed column goes missing.
    expect(vi.mocked(database.kitchenTask.findMany).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        where: { tenantId: "tenant_test", deletedAt: null },
        select: {
          id: true,
          title: true,
          summary: true,
          status: true,
          priority: true,
          dueDate: true,
          tags: true,
        },
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
      })
    );
  });

  it("projects ONLY consumed KitchenTaskClaim fields on the claims read", async () => {
    await KitchenPage();

    expect(
      vi.mocked(database.kitchenTaskClaim.findMany).mock.calls[0]?.[0]
    ).toEqual(
      expect.objectContaining({
        where: {
          AND: [{ tenantId: "tenant_test" }, { releasedAt: null }],
        },
        select: { taskId: true, employeeId: true, releasedAt: true },
      })
    );
  });

  it("selects ONLY id for the current-user findFirst", async () => {
    await KitchenPage();

    expect(vi.mocked(database.user.findFirst).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        where: { tenantId: "tenant_test", authUserId: "user_test" },
        select: { id: true },
      })
    );
  });

  it("narrowed rows feed the board mapping (claims attach, page resolves)", async () => {
    const result = await KitchenPage();
    expect(result).toBeDefined();

    expect(vi.mocked(database.kitchenTask.findMany)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(database.kitchenTaskClaim.findMany)).toHaveBeenCalledTimes(
      1
    );
    // claim employees hydrate via user.findMany; current user via findFirst.
    expect(vi.mocked(database.user.findMany)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(database.user.findFirst)).toHaveBeenCalledTimes(1);
  });

  it("fires no DB read when there is no orgId", async () => {
    vi.mocked(auth).mockResolvedValue({
      orgId: null,
      userId: null,
    } as Awaited<ReturnType<typeof auth>>);

    const result = await KitchenPage();
    // Returns the Unauthorized JSX (no redirect/throw) — but no DB read fires.
    expect(result).toBeDefined();

    expect(vi.mocked(database.kitchenTask.findMany)).not.toHaveBeenCalled();
    expect(
      vi.mocked(database.kitchenTaskClaim.findMany)
    ).not.toHaveBeenCalled();
    expect(vi.mocked(database.user.findFirst)).not.toHaveBeenCalled();
    expect(vi.mocked(getTenantIdForOrg)).not.toHaveBeenCalled();
  });
});
