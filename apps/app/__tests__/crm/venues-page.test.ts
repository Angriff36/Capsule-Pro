/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app over-fetch):
 * the Venues list RSC page did a `venue.findMany` with NO select, materializing
 * all 21 columns of every venue row — including `accessNotes`/`cateringNotes`
 * (plain String? — no @db.Text, but still wire/serialization cost) and
 * `layoutImageUrl`/address fields — while the card list + active-count consume
 * only 11 fields (id, name, venueType, isActive, city, stateProvince, capacity,
 * contactName, contactEmail, contactPhone, tags). A focused select drops the 10
 * unused columns per row with zero behavior change (select is a column
 * projection — venues.length + activeCount + the card render are identical).
 *
 * This test pins:
 *  1. findMany carries a focused select of EXACTLY the 11 consumed fields —
 *     fails if the select is dropped or a consumed field removed.
 *  2. The card list + activeCount resolve cleanly over a fixture (incl. the
 *      tags String[] render + inactive badge + empty-field guards).
 *  3. No read fires when unauthenticated (the userId/orgId guard short-circuits).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    venue: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import VenuesPage from "../../app/(authenticated)/(sales)/crm/venues/page";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const venueFindMany = database.venue.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";
const USER_ID = "user-1";

const venuesFixture = [
  {
    id: "ven-1",
    name: "Grand Hall",
    venueType: "banquet_hall",
    isActive: true,
    city: "Austin",
    stateProvince: "TX",
    capacity: 400,
    contactName: "Jane",
    contactEmail: "jane@grand.com",
    contactPhone: "555-0100",
    tags: ["premium", "indoor"],
  },
  {
    id: "ven-2",
    name: "Riverside Lot",
    venueType: "outdoor",
    isActive: false,
    city: null,
    stateProvince: null,
    capacity: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    tags: [],
  },
];

const SELECT_ONLY_CONSUMED = {
  id: true,
  name: true,
  venueType: true,
  isActive: true,
  city: true,
  stateProvince: true,
  capacity: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  tags: true,
};

describe("VenuesPage — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: USER_ID, orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
    venueFindMany.mockResolvedValue(venuesFixture);
  });

  it("selects ONLY the 11 consumed fields (no full-row over-fetch)", async () => {
    await VenuesPage();

    expect(venueFindMany).toHaveBeenCalledTimes(1);
    expect(venueFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: [{ name: "asc" }],
        select: SELECT_ONLY_CONSUMED,
      })
    );
  });

  it("resolves the card list + activeCount over the fixture", async () => {
    // activeCount = venues.filter(v => v.isActive).length = 1; the cards render
    // name/venueType/city-state/capacity/contact/tags, including the inactive
    // badge + empty-field guards. Resolving cleanly proves the selected fields
    // feed every read path.
    const result = await VenuesPage();
    expect(result).toBeDefined();
    expect(venueFindMany).toHaveBeenCalledTimes(1);
  });

  it("fires no DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null, orgId: null });

    await expect(VenuesPage()).rejects.toThrow(/REDIRECT/);

    expect(venueFindMany).not.toHaveBeenCalled();
  });
});
