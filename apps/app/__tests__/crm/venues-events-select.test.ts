/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app server-action over-fetch):
 * `getVenueEvents` did an `event.findMany` (up to 50 rows) with NO select,
 * materializing the full Event row — including the heavy `tags` / `accessibilityOptions`
 * `String[]` arrays plus ~20 unused scalars (notes/budget/ticketPrice/venueName/...)
 * on every venue-detail page open. The sole consumer (venues/[id]/page.tsx) renders an
 * event table that reads ONLY { id, title, eventDate, status, guestCount }. A column-only
 * `select` is behavior-identical at runtime (row-counts / serialized shape unchanged).
 *
 * This test pins:
 *  1. findMany carries a focused select of EXACTLY those 5 list fields — fails if the
 *     select is dropped (reverts to full-row) or a heavy column is re-added.
 *  2. The tenant + venueEntityId + deletedAt (+ optional status) filters land in where.
 *  3. The auth guard: no orgId → invariant throws → no DB read.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantId: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => ({ invariant: vi.fn() }));
vi.mock("@/lib/manifest-command", () => ({ runManifestCommand: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    event: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";
import { getVenueEvents } from "../../app/(authenticated)/(sales)/crm/venues/actions";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantId as ReturnType<typeof vi.fn>;
const invariantMock = invariant as ReturnType<typeof vi.fn>;
const findMany = database.event.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";

const LIST_SELECT = {
  id: true,
  title: true,
  eventDate: true,
  status: true,
  guestCount: true,
};

const eventsFixture = [
  {
    id: "evt-1",
    title: "Annual Gala",
    eventDate: new Date("2026-09-01"),
    status: "confirmed",
    guestCount: 250,
  },
  {
    id: "evt-2",
    title: "Wedding Reception",
    eventDate: new Date("2026-10-12"),
    status: "draft",
    guestCount: 120,
  },
];

describe("getVenueEvents — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: "org-1" });
    tenantMock.mockResolvedValue(TENANT_ID);
    invariantMock.mockImplementation((cond, msg) => {
      if (!cond) {
        throw new Error(msg);
      }
    });
    findMany.mockResolvedValue(eventsFixture);
  });

  it("selects ONLY the 5 list fields (drops tags/accessibilityOptions String[] + scalars)", async () => {
    const result = await getVenueEvents("venue-1");

    expect(findMany).toHaveBeenCalledTimes(1);
    const call = findMany.mock.calls[0]?.[0] as {
      where: unknown;
      orderBy: unknown;
      take: number;
      skip: number;
      select: Record<string, boolean>;
    };
    // objectContaining deep-equals `select`, so this passes ONLY when select is
    // exactly these 5 keys — re-adding a heavy column or dropping the select fails.
    expect(call).toEqual(
      expect.objectContaining({
        orderBy: [{ eventDate: "desc" }],
        take: 50,
        skip: 0,
        select: LIST_SELECT,
      })
    );
    // Explicit heavy-column regression guard.
    expect(call.select).not.toHaveProperty("tags");
    expect(call.select).not.toHaveProperty("accessibilityOptions");
    expect(call.select).not.toHaveProperty("notes");
    expect(Object.keys(call.select).sort()).toEqual([
      "eventDate",
      "guestCount",
      "id",
      "status",
      "title",
    ]);

    // Row data flows through unchanged.
    expect(result).toEqual(eventsFixture);
  });

  it("applies tenant + venueEntityId + deletedAt (+ status) filters to where", async () => {
    await getVenueEvents("venue-1", "confirmed");

    expect(findMany).toHaveBeenCalledTimes(1);
    const call = findMany.mock.calls[0]?.[0] as {
      where: { AND: Record<string, unknown>[] };
    };
    expect(call.where.AND).toHaveLength(4);
    expect(call.where.AND).toContainEqual({ tenantId: TENANT_ID });
    expect(call.where.AND).toContainEqual({ venueEntityId: "venue-1" });
    expect(call.where.AND).toContainEqual({ deletedAt: null });
    expect(call.where.AND).toContainEqual({ status: "confirmed" });
  });

  it("respects the limit/offset pagination args", async () => {
    await getVenueEvents("venue-1", undefined, 10, 20);

    const call = findMany.mock.calls[0]?.[0] as { take: number; skip: number };
    expect(call.take).toBe(10);
    expect(call.skip).toBe(20);
  });

  it("does not read the DB when the auth guard fails", async () => {
    authMock.mockResolvedValue({ orgId: null });

    await expect(getVenueEvents("venue-1")).rejects.toThrow("Unauthorized");
    expect(findMany).not.toHaveBeenCalled();
  });
});
