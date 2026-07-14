/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app over-fetch):
 * `getKitchenTasks` did an unbounded `kitchenTask.findMany` with NO select,
 * materializing all 14 columns of every task row — including the `tags`
 * String[] array, `complexity`, `assignedTo`, `completedAt`, `updatedAt` —
 * scaled by N tasks per tasks-list page load. The single live consumer
 * (`kitchen/tasks/page.tsx`) reads only 7 fields (id/status/priority/title/
 * summary/dueDate/createdAt) plus `tasks.length` / `.filter().length` counts,
 * and a column-only `select` preserves those counts (it projects columns,
 * never rows), so dropping the unused 5 columns per row is behavior-identical.
 *
 * This test pins:
 *  1. findMany carries a focused select of EXACTLY the 7 consumed fields — the
 *     regression guard that fails if the select is dropped (reverts to
 *     full-row) or a dropped column is re-added (e.g. tags / complexity).
 *  2. status / priority filters are still applied WITH the select.
 *  3. getKitchenTasksByStatus delegates with the same select + status filter.
 *  4. Returned rows' consumed fields resolve cleanly over a fixture.
 *  5. requireTenantId gates the read (throw → no DB read).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  requireTenantId: vi.fn(),
}));
vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    kitchenTask: { findMany: vi.fn() },
  },
}));

import { database } from "@repo/database";
import { requireTenantId } from "@/app/lib/tenant";
import {
  getKitchenTasks,
  getKitchenTasksByStatus,
} from "../../app/(authenticated)/(operations)/kitchen/tasks/actions";

const requireTenant = requireTenantId as ReturnType<typeof vi.fn>;
const findMany = database.kitchenTask.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";

const SELECT_ONLY_CONSUMED = {
  id: true,
  status: true,
  priority: true,
  title: true,
  summary: true,
  dueDate: true,
  createdAt: true,
};

// Exercises every consumed read path: status/priority both Badge states,
// summary present + empty, dueDate present + null.
const tasksFixture = [
  {
    id: "task-1",
    status: "pending",
    priority: 3,
    title: "Chop onions",
    summary: "Prep for service",
    dueDate: new Date("2026-07-15T18:00:00Z"),
    createdAt: new Date("2026-07-14T10:00:00Z"),
  },
  {
    id: "task-2",
    status: "in_progress",
    priority: 1,
    title: "Grill salmon",
    summary: "",
    dueDate: null,
    createdAt: new Date("2026-07-13T09:00:00Z"),
  },
];

describe("getKitchenTasks — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireTenant.mockResolvedValue(TENANT_ID);
    findMany.mockResolvedValue(tasksFixture);
  });

  it("selects ONLY the 7 consumed fields (no full-row over-fetch)", async () => {
    await getKitchenTasks();

    expect(findMany).toHaveBeenCalledTimes(1);
    // objectContaining deep-equals `select`, so this passes ONLY when select is
    // exactly these 7 keys — re-adding a dropped column (tags / complexity /
    // assignedTo / completedAt / updatedAt) or dropping the select fails.
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        select: SELECT_ONLY_CONSUMED,
      })
    );
    const call = findMany.mock.calls[0]?.[0] as {
      where: { tenantId: string; deletedAt: null };
    };
    expect(call.where).toEqual({ tenantId: TENANT_ID, deletedAt: null });
  });

  it("applies status / priority filters alongside the select", async () => {
    await getKitchenTasks({ status: "pending", priority: 3 });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: SELECT_ONLY_CONSUMED,
        where: {
          tenantId: TENANT_ID,
          deletedAt: null,
          status: "pending",
          priority: 3,
        },
      })
    );
  });

  it("getKitchenTasksByStatus delegates with the same select + status filter", async () => {
    await getKitchenTasksByStatus("done");

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: SELECT_ONLY_CONSUMED,
        where: {
          tenantId: TENANT_ID,
          deletedAt: null,
          status: "done",
        },
      })
    );
  });

  it("returns rows whose consumed fields resolve cleanly over the fixture", async () => {
    const rows = await getKitchenTasks();

    expect(rows).toHaveLength(2);
    // The page reads id/status/priority/title/summary/dueDate/createdAt and
    // derives counts via `tasks.length` + `tasks.filter(t => t.status === …)`.
    expect(rows[0]?.title).toBe("Chop onions");
    expect(rows[0]?.priority).toBe(3);
    expect(rows[0]?.dueDate).toBeInstanceOf(Date);
    expect(rows[1]?.dueDate).toBeNull();
    expect(rows[1]?.summary).toBe("");
    // Counts the page computes still work (select never removes rows).
    expect(rows.filter((t) => t.status === "pending")).toHaveLength(1);
  });

  it("does not read the DB when requireTenantId throws", async () => {
    requireTenant.mockRejectedValue(new Error("UNAUTHORIZED"));

    await expect(getKitchenTasks()).rejects.toThrow("UNAUTHORIZED");
    expect(findMany).not.toHaveBeenCalled();
  });
});
