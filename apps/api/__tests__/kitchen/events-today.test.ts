/**
 * GET /api/kitchen/events/today — parallelization regression guard.
 *
 * Pins item #17 (kitchen mobile hot path): this route is polled frequently on
 * the mobile kitchen Today tab during service. The original GET ran 5 serial
 * reads:
 *   events → prepLists → prepListItems → kitchenTasks → claims
 *
 * The parallel version collapses to 3 rounds via the dependency graph:
 *   Tier 0 — Promise.all([events, kitchenTasks])  (both depend only on tenantId+now)
 *   Tier 1 — Promise.all([prepLists, claims])      (prepLists←eventIds, claims←taskIds)
 *   Tier 2 — prepListItems                          (←prepListIds)
 *
 * The concurrency proofs use a controlled *pending* promise: inside a
 * Promise.all every query in the batch is invoked in the same synchronous
 * burst (array construction), so the later query fires WHILE the first is still
 * pending. The old serial layout ran kitchenTasks (4th) and claims (5th) only
 * after the prior reads resolved, so they could not fire while an earlier
 * query was pending — these tests fail if reverted to serial.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    event: { findMany: vi.fn() },
    kitchenTask: { findMany: vi.fn() },
    prepList: { findMany: vi.fn() },
    kitchenTaskClaim: { findMany: vi.fn() },
    prepListItem: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/kitchen/events/today/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { expectNoDbWrites, expectTotalDbCalls } from "../db-query-tracker";

const eventFindMany = database.event.findMany as ReturnType<typeof vi.fn>;
const kitchenTaskFindMany = database.kitchenTask.findMany as ReturnType<
  typeof vi.fn
>;
const prepListFindMany = database.prepList.findMany as ReturnType<typeof vi.fn>;
const claimFindMany = database.kitchenTaskClaim.findMany as ReturnType<
  typeof vi.fn
>;
const prepListItemFindMany = database.prepListItem.findMany as ReturnType<
  typeof vi.fn
>;

describe("GET /api/kitchen/events/today", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    // Defaults — empty-result baseline so the route completes 200 unless a
    // test overrides a specific query.
    eventFindMany.mockResolvedValue([]);
    kitchenTaskFindMany.mockResolvedValue([]);
    prepListFindMany.mockResolvedValue([]);
    claimFindMany.mockResolvedValue([]);
    prepListItemFindMany.mockResolvedValue([]);
  });

  it("runs events + kitchenTasks concurrently in the Tier-0 batch", async () => {
    // events stays pending; assert kitchenTask (the other Tier-0 read) fires
    // in the same Promise.all burst. Old layout ran kitchenTasks 4th — behind
    // events → prepLists → prepListItems — so it could not fire while events
    // was pending.
    let resolveEvents!: (v: unknown) => void;
    eventFindMany.mockReturnValue(
      new Promise((r) => {
        resolveEvents = r;
      }) as never
    );

    const p = GET();

    await vi.waitFor(() => {
      expect(eventFindMany).toHaveBeenCalledTimes(1);
    });
    // CONCURRENCY: kitchenTasks fires while events is still pending.
    expect(kitchenTaskFindMany).toHaveBeenCalledTimes(1);

    resolveEvents([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("runs prepLists + claims concurrently in the Tier-1 batch", async () => {
    // Give Tier 0 data so both Tier-1 reads fire.
    eventFindMany.mockResolvedValue([
      { id: "e1", title: "Gala", eventDate: new Date(), guestCount: 10 },
    ]);
    kitchenTaskFindMany.mockResolvedValue([{ id: "t1", tags: [] }]);

    // prepLists stays pending; assert claims (the other Tier-1 read) fires in
    // the same Promise.all burst. Old layout ran claims 5th — behind
    // prepListItems — so it could not fire while prepLists was pending.
    let resolvePrep!: (v: unknown) => void;
    prepListFindMany.mockReturnValue(
      new Promise((r) => {
        resolvePrep = r;
      }) as never
    );

    const p = GET();

    await vi.waitFor(() => {
      expect(prepListFindMany).toHaveBeenCalledTimes(1);
    });
    // CONCURRENCY: claims fires while prepLists is still pending.
    expect(claimFindMany).toHaveBeenCalledTimes(1);

    resolvePrep([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("builds urgency + prep completion + unclaimed-task counts", async () => {
    // Event in ~1h → critical urgency (hoursUntil < 2).
    const soon = new Date(Date.now() + 60 * 60 * 1000);
    eventFindMany.mockResolvedValue([
      { id: "e1", title: "Gala", eventDate: soon, guestCount: 100 },
    ]);
    // Two active tasks; one is claimed → unclaimed count = 1.
    kitchenTaskFindMany.mockResolvedValue([
      { id: "t1", tags: [] },
      { id: "t2", tags: [] },
    ]);
    claimFindMany.mockResolvedValue([{ taskId: "t1" }]);
    prepListFindMany.mockResolvedValue([
      { id: "p1", eventId: "e1", status: "in_progress", totalItems: 3 },
    ]);
    // 1 of 3 completed → 2 incomplete.
    prepListItemFindMany.mockResolvedValue([
      { prepListId: "p1", isCompleted: true },
      { prepListId: "p1", isCompleted: false },
      { prepListId: "p1", isCompleted: false },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    // Regression guard (#28): the happy path issues exactly the 5 documented
    // reads (events, kitchenTasks, prepLists, claims, prepListItems) — an added
    // call on any of them (an N+1 reintroduction) trips this.
    expectTotalDbCalls(database, 5);
    // And it is a read-only GET — no writes (#2/#16 read-only-on-GET invariant).
    expectNoDbWrites(database);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      id: "e1",
      name: "Gala",
      headcount: 100,
      urgency: "critical",
      unclaimedPrepCount: 1,
      incompleteItemsCount: 2,
      prepListIds: ["p1"],
    });
    expect(body.events[0].startTime).toBe(soon.toISOString());
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(eventFindMany).not.toHaveBeenCalled();
    expect(kitchenTaskFindMany).not.toHaveBeenCalled();
  });
});
