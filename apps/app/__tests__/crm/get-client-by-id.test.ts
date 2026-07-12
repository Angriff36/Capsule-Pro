/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan item #7): getClientById is the data
 * source for the CRM client-detail page (`crm/clients/[id]/page.tsx`). It ran
 * 6 SERIAL DB round-trips after auth — findFirst (existence guard) plus five
 * independent detail queries (contacts, preferences, interaction count, event
 * count, revenue aggregate). Those five are keyed solely on (tenantId, id) and
 * do not depend on each other's results, so they collapse into one concurrent
 * Promise.all batch: 6 round-trips → 2 (findFirst guard + one parallel batch).
 *
 * This test pins three properties a future change could regress:
 *  1. The five detail queries run CONCURRENTLY (they overlap), not serially.
 *  2. They do NOT fire at all when the client row is missing — the findFirst
 *     guard short-circuits before the batch.
 *  3. The merged return shape + Decimal→string transform stay correct.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/manifest-command", () => ({ runManifestCommand: vi.fn() }));

vi.mock("@repo/database", () => ({
  database: {
    client: { findFirst: vi.fn() },
    clientContact: { findMany: vi.fn() },
    clientPreference: { findMany: vi.fn() },
    clientInteraction: { count: vi.fn() },
    cateringOrder: { count: vi.fn(), aggregate: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { requireCurrentUser } from "@/app/lib/tenant";
import { getClientById } from "../../app/(authenticated)/(sales)/crm/clients/actions";

// `auth`'s real type (AuthFn) doesn't structurally overlap Mock, so bridge via
// unknown — at runtime the vi.mock factory below replaces it with a vi.fn().
const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const requireUser = requireCurrentUser as ReturnType<typeof vi.fn>;
const clientFindFirst = database.client.findFirst as ReturnType<typeof vi.fn>;
const contactsFindMany = database.clientContact.findMany as ReturnType<
  typeof vi.fn
>;
const preferencesFindMany = database.clientPreference.findMany as ReturnType<
  typeof vi.fn
>;
const interactionsCount = database.clientInteraction.count as ReturnType<
  typeof vi.fn
>;
const eventsCount = database.cateringOrder.count as ReturnType<typeof vi.fn>;
const revenueAggregate = database.cateringOrder.aggregate as ReturnType<
  typeof vi.fn
>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";
const CLIENT_ID = "client-1";

describe("getClientById — parallel detail-query batch (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: ORG_ID, userId: "u1" });
    requireUser.mockResolvedValue({
      id: "u1",
      tenantId: TENANT_ID,
      role: "admin",
    });
    clientFindFirst.mockResolvedValue({
      id: CLIENT_ID,
      tenantId: TENANT_ID,
      name: "Acme",
    });
  });

  it("runs the five detail queries concurrently (overlap), not serially", async () => {
    // Each detail query returns a promise we control. With Promise.all all five
    // are INVOKED in the same tick before any resolves; with serial awaits only
    // the first would be invoked while the rest are still pending.
    const resolvers: Array<() => void> = [];
    const pending = <T>(value: T) =>
      new Promise<T>((resolve) => {
        resolvers.push(() => resolve(value));
      });
    // Record invocation order so we can assert the array sequence + overlap.
    const invocations: string[] = [];
    const tracked = <T>(name: string, value: T) => {
      invocations.push(name);
      return pending(value);
    };

    contactsFindMany.mockImplementation(() =>
      tracked("contacts", [{ id: "c1" }])
    );
    preferencesFindMany.mockImplementation(() => tracked("preferences", []));
    interactionsCount.mockImplementation(() => tracked("interactions", 7));
    eventsCount.mockImplementation(() => tracked("events", 3));
    revenueAggregate.mockImplementation(() =>
      tracked("revenue", {
        _sum: { totalAmount: { toString: () => "1234.56" } },
      })
    );

    const resultPromise = getClientById(CLIENT_ID);

    // Let the prerequisite awaits (auth → requireCurrentUser → findFirst)
    // settle, then the Promise.all invokes all five detail queries synchronously.
    await vi.waitFor(() => expect(invocations).toHaveLength(5));

    // PROOF OF PARALLELISM: all five were invoked before ANY resolved — five
    // pending promises exist simultaneously. Serial execution would have
    // invoked only one here (the rest wait for it to resolve).
    expect(resolvers).toHaveLength(5);
    expect(invocations).toEqual([
      "contacts",
      "preferences",
      "interactions",
      "events",
      "revenue",
    ]);

    // Release all five and collect the merged result.
    for (const resolve of resolvers) {
      resolve();
    }
    const result = await resultPromise;

    expect(result.contacts).toEqual([{ id: "c1" }]);
    expect(result.preferences).toEqual([]);
    expect(result.interactionCount).toBe(7);
    expect(result.eventCount).toBe(3);
    expect(result.totalRevenue).toEqual({ total: "1234.56" });
  });

  it("does not fire detail queries when the client is missing", async () => {
    clientFindFirst.mockResolvedValue(null);

    await expect(getClientById(CLIENT_ID)).rejects.toThrow("Client not found");

    expect(contactsFindMany).not.toHaveBeenCalled();
    expect(preferencesFindMany).not.toHaveBeenCalled();
    expect(interactionsCount).not.toHaveBeenCalled();
    expect(eventsCount).not.toHaveBeenCalled();
    expect(revenueAggregate).not.toHaveBeenCalled();
  });

  it("maps a null revenue sum to totalRevenue: null", async () => {
    contactsFindMany.mockResolvedValue([]);
    preferencesFindMany.mockResolvedValue([]);
    interactionsCount.mockResolvedValue(0);
    eventsCount.mockResolvedValue(0);
    revenueAggregate.mockResolvedValue({ _sum: { totalAmount: null } });

    const result = await getClientById(CLIENT_ID);

    expect(result.totalRevenue).toBeNull();
    expect(result.interactionCount).toBe(0);
    expect(result.eventCount).toBe(0);
  });
});
