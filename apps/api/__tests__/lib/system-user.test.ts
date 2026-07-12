/**
 * getSystemUserId — per-tenant memoization regression guard (db-perf #8).
 *
 * WHY THIS TEST EXISTS: the three DB-heavy crons each carried a local copy of
 * this resolver and re-queried it per row — email-reminders per claim AND per
 * shift, contract-expiration per contract. The shared helper memoizes the
 * (tenantId → systemUserId) mapping with a short TTL so the per-row N+1
 * collapses to one lookup per tenant per tick. This test pins the four
 * invariants a future change could silently break:
 *   1. within-TTL dedupe (the actual N+1 fix),
 *   2. per-tenant independence (no cross-tenant leak),
 *   3. TTL expiry re-queries (staleness bound),
 *   4. a thrown "no active users" is never cached (a transient empty state
 *      must not stick and starve the tenant of retries).
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@repo/database", () => ({
  database: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

import { database } from "@repo/database";
import { getSystemUserId } from "@/lib/system-user";

// `vi.mock` replaces the module but the imported ref keeps Prisma's real
// (strict) signature; cast the double to vi.Mock so per-test stubbing is loose.
const findFirst = database.user.findFirst as unknown as Mock;

/**
 * Answer the admin/owner query (carries a `role` filter) and the any-active-user
 * query (no `role`) independently. The real helper issues the admin query first
 * and only falls back to the any query on a miss.
 */
function mockSystemUsers(
  admin: { id: string } | null,
  anyUser: { id: string } | null
) {
  findFirst.mockImplementation((args: { where?: { role?: unknown } }) =>
    Promise.resolve(args.where?.role ? admin : anyUser)
  );
}

describe("getSystemUserId — per-tenant memoization (#8)", () => {
  beforeEach(() => {
    findFirst.mockReset();
    vi.useRealTimers();
  });

  it("dedupes within the TTL — one lookup per tenant across repeated calls", async () => {
    mockSystemUsers({ id: "u-admin" }, null);

    // Simulate the per-row fire: the same tenant re-resolved N times in a tick.
    await getSystemUserId("t-dedupe");
    await getSystemUserId("t-dedupe");
    const id = await getSystemUserId("t-dedupe");

    expect(id).toBe("u-admin");
    // The N+1 fix: 3 calls, 1 DB query total (the 2nd/3rd hit the Map).
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("resolves each tenant independently (no cross-tenant leak)", async () => {
    findFirst.mockImplementation(
      (args: { where?: { tenantId?: string } }) =>
        Promise.resolve(
          args.where?.tenantId === "t-a" ? { id: "u-a" } : { id: "u-b" }
        )
    );

    const a = await getSystemUserId("t-a");
    const b = await getSystemUserId("t-b");

    expect(a).toBe("u-a");
    expect(b).toBe("u-b");
    // One admin query per tenant, no leakage.
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it("prefers an admin/owner and never falls through to any-user when one exists", async () => {
    mockSystemUsers({ id: "u-admin" }, { id: "u-any" });

    const id = await getSystemUserId("t-admin");

    expect(id).toBe("u-admin");
    // Admin hit → the any-user fallback query never fires.
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findFirst.mock.calls[0]?.[0]).toMatchObject({
      where: expect.objectContaining({ role: { in: ["owner", "admin"] } }),
    });
  });

  it("falls back to any active user when no admin/owner exists", async () => {
    mockSystemUsers(null, { id: "u-any" });

    const id = await getSystemUserId("t-fallback");

    expect(id).toBe("u-any");
    // Admin miss then any-user hit = exactly 2 queries.
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it("re-resolves after the TTL expires", async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    mockSystemUsers({ id: "u-admin" }, null);

    await getSystemUserId("t-ttl");
    expect(findFirst).toHaveBeenCalledTimes(1);

    // Still within the 30s TTL — Map hit, no new query.
    await vi.advanceTimersByTimeAsync(29_000);
    await getSystemUserId("t-ttl");
    expect(findFirst).toHaveBeenCalledTimes(1);

    // Past TTL — cache expired, re-queries.
    await vi.advanceTimersByTimeAsync(2_000);
    await getSystemUserId("t-ttl");
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it("throws when no users exist AND does not cache the throw", async () => {
    mockSystemUsers(null, null);

    await expect(getSystemUserId("t-empty")).rejects.toThrow(
      "No active users found for tenant t-empty"
    );
    // Admin + any queries both fired.
    expect(findFirst).toHaveBeenCalledTimes(2);

    // A transient empty state must not stick — the next call re-queries.
    await expect(getSystemUserId("t-empty")).rejects.toThrow(
      "No active users found for tenant t-empty"
    );
    expect(findFirst).toHaveBeenCalledTimes(4);
  });
});
