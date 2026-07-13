/**
 * GET /api/kitchen/tasks — parallelization regression guard.
 *
 * Pins item #17 (kitchen mobile hot path). The original GET ran 3 serial reads:
 *   kitchenTask.findMany → kitchenTaskClaim.findMany → user.findMany
 *
 * The parallel version collapses to 2 rounds: tasks and claims both depend
 * only on tenantId (claims is NOT scoped to the returned tasks), so they run
 * in one Promise.all; users then follows from the claim employees.
 *
 * The concurrency proof uses a controlled *pending* promise: inside the
 * Promise.all, claims is invoked in the same synchronous burst as tasks, so
 * claims fires WHILE tasks is still pending. The old serial layout awaited
 * tasks before even constructing the claims query, so it could not fire while
 * tasks was pending — this test fails if reverted to serial.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/database", () => ({
  // KitchenTaskStatus is imported as a runtime value (Object.values(...).find).
  // Only the VALUES are read; provide the statuses the route filters on.
  KitchenTaskStatus: {
    pending: "pending",
    in_progress: "in_progress",
    done: "done",
    cancelled: "cancelled",
  },
  database: {
    kitchenTask: { findMany: vi.fn() },
    kitchenTaskClaim: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/kitchen/tasks/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const taskFindMany = database.kitchenTask.findMany as ReturnType<typeof vi.fn>;
const claimFindMany = database.kitchenTaskClaim.findMany as ReturnType<
  typeof vi.fn
>;
const userFindMany = database.user.findMany as ReturnType<typeof vi.fn>;

function buildRequest() {
  return new Request("http://x/api/kitchen/tasks") as never;
}

describe("GET /api/kitchen/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    taskFindMany.mockResolvedValue([]);
    claimFindMany.mockResolvedValue([]);
    userFindMany.mockResolvedValue([]);
  });

  it("runs tasks + claims concurrently in one Promise.all", async () => {
    // tasks stays pending; assert claims fires in the same Promise.all burst.
    // Old serial layout awaited tasks before constructing the claims query.
    let resolveTasks!: (v: unknown) => void;
    taskFindMany.mockReturnValue(
      new Promise((r) => {
        resolveTasks = r;
      }) as never
    );

    const p = GET(buildRequest());

    await vi.waitFor(() => {
      expect(taskFindMany).toHaveBeenCalledTimes(1);
    });
    // CONCURRENCY: claims fires while tasks is still pending.
    expect(claimFindMany).toHaveBeenCalledTimes(1);

    resolveTasks([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("attaches claims + claimant users to each task", async () => {
    taskFindMany.mockResolvedValue([
      { id: "t1", summary: "Chop onions", priority: 1, status: "pending" },
      {
        id: "t2",
        summary: "Plate desserts",
        priority: 5,
        status: "in_progress",
      },
    ] as never);
    claimFindMany.mockResolvedValue([
      { taskId: "t1", employeeId: "u1", releasedAt: null },
    ] as never);
    userFindMany.mockResolvedValue([
      { id: "u1", firstName: "Alice", lastName: "Ng", email: "a@b.com" },
    ] as never);

    const res = await GET(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tasks).toHaveLength(2);
    // t1 has a claim with the resolved user.
    const t1 = body.tasks.find((t: { id: string }) => t.id === "t1");
    expect(t1.claims).toEqual([
      expect.objectContaining({
        taskId: "t1",
        employeeId: "u1",
        user: {
          id: "u1",
          firstName: "Alice",
          lastName: "Ng",
          email: "a@b.com",
        },
      }),
    ]);
    // t2 has no claims → empty array.
    const t2 = body.tasks.find((t: { id: string }) => t.id === "t2");
    expect(t2.claims).toEqual([]);
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
    expect(taskFindMany).not.toHaveBeenCalled();
  });
});
