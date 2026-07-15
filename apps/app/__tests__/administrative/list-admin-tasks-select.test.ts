/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app over-fetch):
 * `listAdminTasks` did an unbounded `adminTask.findMany` with NO select,
 * materializing all ~18 columns of every admin-task row on every kanban-board
 * load — including columns the return map never reads (tenantId, deletedAt —
 * already filtered; createdAt — orderBy-only; updatedAt). The single live
 * consumer (the kanban board) consumes exactly the 14 fields the return map
 * projects, so a column-only `select` is behavior-identical. Critically NO
 * `take` is added: a kanban board must render every task across all columns,
 * so bounding the read would silently hide cards (the #8 truncation-trap).
 *
 * This test pins:
 *  1. findMany carries a focused select of EXACTLY the 14 consumed fields — the
 *     regression guard that fails if the select is dropped (reverts to full-row)
 *     or a dropped column is re-added (tenantId / createdAt / updatedAt).
 *  2. NO `take` is set (truncation-trap guard).
 *  3. The secondary `user.findMany` employee batch fires ONCE with the distinct
 *     assignedTo/createdBy ids (the Map-join N+1-avoidance shape).
 *  4. Returned rows resolve cleanly: estimatedHours Decimal→Number, dueDate
 *     Date→ISO, ownerName via the employee Map join (assignedTo → createdBy
 *     fallback → "Unassigned").
 *  5. The auth guard: no orgId → invariant throws → no DB read.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => ({ invariant: vi.fn() }));
vi.mock("@/lib/manifest-command", () => ({ runManifestCommand: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    adminTask: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { listAdminTasks } from "../../app/(authenticated)/(administrative)/administrative/kanban/actions";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const invariantMock = invariant as ReturnType<typeof vi.fn>;
const taskFindMany = database.adminTask.findMany as ReturnType<typeof vi.fn>;
const userFindMany = database.user.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";

const SELECT_ONLY_CONSUMED = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  category: true,
  position: true,
  labels: true,
  estimatedHours: true,
  dueDate: true,
  assignedTo: true,
  createdBy: true,
  sourceType: true,
  sourceId: true,
};

// Exercises every consumed read path: assignedTo present + null, createdBy
// distinct across rows, estimatedHours Decimal + null, dueDate Date + null.
const tasksFixture = [
  {
    id: "task-1",
    title: "Onboard vendor",
    description: "Collect W-9",
    status: "in_progress",
    priority: "high",
    category: "procurement",
    position: 1,
    labels: ["blocked"],
    estimatedHours: 2.5,
    dueDate: new Date("2026-07-20T18:00:00Z"),
    assignedTo: "u-1",
    createdBy: "u-2",
    sourceType: "manual",
    sourceId: null,
  },
  {
    id: "task-2",
    title: "Renew insurance",
    description: null,
    status: "backlog",
    priority: "low",
    category: "compliance",
    position: 2,
    labels: [],
    estimatedHours: null,
    dueDate: null,
    assignedTo: null,
    createdBy: "u-3",
    sourceType: "manual",
    sourceId: null,
  },
];

const usersFixture = [
  { id: "u-1", firstName: "Ada", lastName: "Lovelace" },
  { id: "u-2", firstName: "Grace", lastName: "Hopper" },
  { id: "u-3", firstName: "Linus", lastName: "Torvalds" },
];

describe("listAdminTasks — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: "org-1" });
    tenantMock.mockResolvedValue(TENANT_ID);
    invariantMock.mockImplementation((cond, msg) => {
      if (!cond) {
        throw new Error(msg);
      }
    });
    taskFindMany.mockResolvedValue(tasksFixture);
    userFindMany.mockResolvedValue(usersFixture);
  });

  it("selects ONLY the 14 consumed fields (no full-row over-fetch)", async () => {
    await listAdminTasks();

    expect(taskFindMany).toHaveBeenCalledTimes(1);
    // objectContaining deep-equals `select`, so this passes ONLY when select is
    // exactly these 14 keys — re-adding a dropped column (tenantId / createdAt /
    // updatedAt) or dropping the select fails.
    expect(taskFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        select: SELECT_ONLY_CONSUMED,
      })
    );
    const call = taskFindMany.mock.calls[0]?.[0] as {
      where: { tenantId: string; deletedAt: null };
      take?: unknown;
    };
    expect(call.where).toEqual({ tenantId: TENANT_ID, deletedAt: null });
    // Truncation-trap guard: a board must render every card.
    expect(call).not.toHaveProperty("take");
  });

  it("batches the employee lookup into ONE user.findMany over distinct ids", async () => {
    await listAdminTasks();

    expect(userFindMany).toHaveBeenCalledTimes(1);
    const call = userFindMany.mock.calls[0]?.[0] as {
      where: { tenantId: string; id: { in: string[] } };
      select: Record<string, boolean>;
    };
    expect(call.where).toEqual({
      tenantId: TENANT_ID,
      id: { in: ["u-1", "u-2", "u-3"] },
    });
    expect(call.select).toEqual({
      id: true,
      firstName: true,
      lastName: true,
    });
  });

  it("skips the employee read when no task carries an assignee/creator", async () => {
    taskFindMany.mockResolvedValue([
      { ...tasksFixture[1], assignedTo: null, createdBy: null },
    ]);

    await listAdminTasks();

    expect(userFindMany).not.toHaveBeenCalled();
  });

  it("maps Decimal→Number, Date→ISO, and ownerName via the employee join", async () => {
    const rows = await listAdminTasks();

    expect(rows).toHaveLength(2);
    // estimatedHours Decimal → number; null stays null.
    expect(rows[0]?.estimatedHours).toBe(2.5);
    expect(rows[1]?.estimatedHours).toBeNull();
    // dueDate Date → ISO string; null stays null.
    expect(rows[0]?.dueDate).toBe("2026-07-20T18:00:00.000Z");
    expect(rows[1]?.dueDate).toBeNull();
    // ownerName: assignedTo wins; else createdBy; else "Unassigned".
    expect(rows[0]?.ownerName).toBe("Ada Lovelace");
    expect(rows[1]?.ownerName).toBe("Linus Torvalds");
  });

  it("does not read the DB when the auth guard fails", async () => {
    authMock.mockResolvedValue({ orgId: null });

    await expect(listAdminTasks()).rejects.toThrow("Unauthorized");
    expect(taskFindMany).not.toHaveBeenCalled();
    expect(userFindMany).not.toHaveBeenCalled();
  });
});
