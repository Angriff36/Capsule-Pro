/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app read waterfalls): the
 * battle-board server functions getTimelineTasks + getEventStaff awaited
 * INDEPENDENT reads serially — an existence-guard read first, then the data
 * read(s) that key only off route params. Collapsing each into one concurrent
 * batch removes 1 serial round-trip per battle-board page load (the page awaits
 * both functions in its own Promise.all, so these internal hops extend the
 * critical path).
 *
 * These tests pin the parallelization: the data read must FIRE before the guard
 * read RESOLVES. A regression back to `const a = await guard(); const b = await
 * data();` makes the data read block on the guard — the held-pending gate then
 * never sees the data call and vi.waitFor times out.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest-command", () => ({ runManifestCommand: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    event: { findFirst: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  getEventStaff,
  getTimelineTasks,
} from "../../app/(authenticated)/(events)/events/[eventId]/battle-board/actions/tasks";
import { getTenantIdForOrg } from "../../app/lib/tenant";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const eventFindFirst = database.event.findFirst as ReturnType<typeof vi.fn>;
const queryRawUnsafe = database.$queryRawUnsafe as ReturnType<typeof vi.fn>;

const ORG_ID = "org-1";
const TENANT_ID = "tenant-1";
const EVENT_ID = "00000000-0000-4000-8000-000000000000";

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ orgId: ORG_ID });
  tenantMock.mockResolvedValue(TENANT_ID);
});

describe("battle-board tasks — read parallelization (plan #7)", () => {
  it("getTimelineTasks fires the tasks read before the event guard resolves", async () => {
    // Hold the event existence read pending; the tasks read must still fire.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    eventFindFirst.mockImplementation(() =>
      gate.then(() => ({ id: EVENT_ID }))
    );
    let rawCalls = 0;
    queryRawUnsafe.mockImplementation(() => {
      rawCalls += 1;
      return Promise.resolve([]);
    });

    const promise = getTimelineTasks(EVENT_ID);
    // Serial: tasks read never fires while event is pending → timeout.
    await vi.waitFor(() => expect(rawCalls).toBe(1), { timeout: 500 });
    release();
    const result = await promise;
    expect(result).toEqual([]);
  });

  it("getEventStaff fires both reads before the first resolves", async () => {
    // Hold the FIRST read (staff) pending; the assignments read must still fire.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    queryRawUnsafe.mockImplementation(() => {
      calls += 1;
      // 1st call = staff (held); 2nd = assignments (resolves)
      if (calls === 1) {
        return gate.then(() => [
          {
            id: "e1",
            first_name: "Ada",
            last_name: "Lovelace",
            role: "chef",
            avatar_url: null,
            is_active: true,
          },
        ]);
      }
      return Promise.resolve([{ employeeId: "e1", task_count: 2n }]);
    });

    const promise = getEventStaff(EVENT_ID);
    // Serial: assignments read never fires while staff is pending → timeout.
    await vi.waitFor(() => expect(calls).toBe(2), { timeout: 500 });
    release();
    const result = await promise;
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "e1",
      name: "Ada Lovelace",
      availability: "at_capacity",
      currentTaskCount: 2,
    });
  });
});
