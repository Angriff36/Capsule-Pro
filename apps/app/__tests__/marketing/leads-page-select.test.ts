/**
 * @vitest-environment node
 *
 * db-performance plan #7 — apps/app over-fetch (leads list).
 *
 * The Marketing Leads list RSC page did a `lead.findMany({ take: 200 })` with
 * NO select, materializing the full row per lead — including the `scoreBreakdown`
 * Json column (not on the Lead view-model, read by no consumer) plus `notes` and
 * other scalar columns — across up to 200 rows on every /marketing/leads load.
 * It now selects exactly the 10 fields the leads-page-client consumes (search
 * filters + table columns) and shares the duplicate-detection `contactEmail`.
 *
 * `select` projects columns, never rows — so leads.length, the status-filter
 * chips, and the serialized table shape are byte-identical with or without it.
 *
 * Pins:
 *  1. the main list findMany carries a focused select of EXACTLY the 10 consumed
 *     fields — fails if the select is dropped or a consumed field removed.
 *  2. the narrowed rows still feed the render + the duplicate-detection path
 *     (a lead with a contactEmail triggers client.findMany; the page resolves).
 *  3. no read fires when unauthenticated (the auth guard short-circuits).
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
    lead: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    client: { findMany: vi.fn() },
  },
}));
// Stub the client component so the page test stays isolated to the DB query
// shape (the client render + its heavier imports are out of scope here).
vi.mock(
  "../../app/(authenticated)/(sales)/marketing/leads/leads-page-client",
  () => ({
    LeadsPageClient: () => null,
  })
);

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import MarketingLeadsPage from "../../app/(authenticated)/(sales)/marketing/leads/page";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const leadFindMany = database.lead.findMany as ReturnType<typeof vi.fn>;
const leadGroupBy = database.lead.groupBy as ReturnType<typeof vi.fn>;
const leadAggregate = database.lead.aggregate as ReturnType<typeof vi.fn>;
const clientFindMany = database.client.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";
const USER_ID = "user-1";

const SELECT_ONLY_CONSUMED = {
  id: true,
  status: true,
  contactName: true,
  companyName: true,
  contactEmail: true,
  eventType: true,
  source: true,
  eventDate: true,
  estimatedGuests: true,
  estimatedValue: true,
};

const leadsFixture = [
  {
    id: "lead-1",
    status: "new",
    contactName: "Acme Corp",
    companyName: "Acme",
    contactEmail: "buyer@acme.com",
    eventType: "conference",
    source: "website",
    eventDate: new Date("2026-08-01"),
    estimatedGuests: 250,
    estimatedValue: 12_500,
  },
  {
    id: "lead-2",
    status: "qualified",
    contactName: "Jane Doe",
    companyName: null,
    contactEmail: null,
    eventType: null,
    source: null,
    eventDate: null,
    estimatedGuests: null,
    estimatedValue: null,
  },
];

describe("MarketingLeadsPage — focused select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: USER_ID, orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
    leadFindMany.mockResolvedValue(leadsFixture);
    leadGroupBy.mockResolvedValue([
      { status: "new", _count: { status: 1 } },
      { status: "qualified", _count: { status: 1 } },
    ]);
    leadAggregate.mockResolvedValue({ _sum: { estimatedValue: 12_500 } });
    clientFindMany.mockResolvedValue([]);
  });

  it("selects ONLY the 10 consumed fields on the list read (no full-row over-fetch)", async () => {
    await MarketingLeadsPage();

    // The page calls lead.findMany twice when a lead has a contactEmail
    // (main list + duplicate-detection). Find the main list call by take: 200.
    const mainCall = leadFindMany.mock.calls.find(
      (c) => (c[0] as { take?: number })?.take === 200
    );
    expect(mainCall).toBeDefined();
    expect(mainCall?.[0]).toEqual(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: SELECT_ONLY_CONSUMED,
      })
    );
  });

  it("narrowed rows feed the render + duplicate-detection path", async () => {
    // lead-1 has a contactEmail → the duplicate-detection block runs, issuing a
    // client.findMany + a second lead.findMany. The page resolves (returns JSX),
    // proving the selected fields feed every read/render path.
    const result = await MarketingLeadsPage();
    expect(result).toBeDefined();

    // Main list + dup-detection = 2 lead.findMany calls.
    expect(leadFindMany).toHaveBeenCalledTimes(2);
    // Duplicate detection fired because lead-1 carries a contactEmail.
    expect(clientFindMany).toHaveBeenCalledTimes(1);
    const dupCall = leadFindMany.mock.calls.find(
      (c) =>
        (c[0] as { select?: unknown })?.select &&
        (c[0] as { take?: number })?.take === undefined
    );
    expect(dupCall?.[0]).toEqual(
      expect.objectContaining({ select: { contactEmail: true } })
    );
  });

  it("fires no DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null, orgId: null });

    await expect(MarketingLeadsPage()).rejects.toThrow(/REDIRECT/);

    expect(leadFindMany).not.toHaveBeenCalled();
    expect(leadGroupBy).not.toHaveBeenCalled();
  });
});
