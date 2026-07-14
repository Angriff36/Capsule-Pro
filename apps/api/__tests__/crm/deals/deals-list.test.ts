/**
 * GET /api/crm/deals (+ /list) — over-fetch `select` regression guard (#17).
 *
 * `listDeals` is shared by GET /api/crm/deals and GET /api/crm/deals/list
 * (the latter imports + re-exports it). This pins that the read projects ONLY
 * the 12 scalar columns + client/lead relations the deal map consumes —
 * dropping ~19 unused Proposal columns/row (incl. potentially-large `notes` +
 * `termsAndConditions` text and 4 Decimal money fields) on every CRM pipeline
 * load. Reverting to an un-narrowed `include`, or dropping a consumed field,
 * fails this suite loudly.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    proposal: { findMany: vi.fn() },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/crm/deals/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/crm/deals (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("projects only the consumed columns (+ relations), not the full Proposal row", async () => {
    vi.mocked(database.proposal.findMany).mockResolvedValue([] as never);

    await GET(new NextRequest("http://x/api/crm/deals?limit=20&offset=0"));

    expect(database.proposal.findMany).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(database.proposal.findMany).mock.calls[0]?.[0] as {
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
    };

    // Narrowed via a top-level `select`, NOT an un-narrowed `include`.
    expect(arg.include).toBeUndefined();
    expect(arg.select).toBeDefined();

    // Exactly the consumed-field set + the two relations.
    expect(Object.keys(arg.select!).sort()).toEqual(
      [
        "client",
        "clientId",
        "createdAt",
        "eventDate",
        "eventId",
        "guestCount",
        "id",
        "lead",
        "leadId",
        "proposalNumber",
        "status",
        "title",
        "total",
        "updatedAt",
      ].sort()
    );

    // Heavy / unused columns MUST be absent from the projection.
    for (const dropped of [
      "notes",
      "termsAndConditions",
      "subtotal",
      "taxRate",
      "taxAmount",
      "discountAmount",
      "venueName",
      "venueAddress",
      "publicToken",
    ]) {
      expect(arg.select![dropped]).toBeUndefined();
    }
  });

  it("maps proposals to the deal shape with the derived pipeline stage", async () => {
    vi.mocked(database.proposal.findMany).mockResolvedValue([
      {
        id: "p1",
        proposalNumber: "PROP-1",
        title: "Gala Dinner",
        status: "accepted",
        eventId: "e1",
        total: 5000,
        eventDate: new Date("2026-08-01"),
        guestCount: 200,
        clientId: "c1",
        leadId: null,
        createdAt: new Date("2026-07-01"),
        updatedAt: new Date("2026-07-10"),
        client: {
          id: "c1",
          companyName: "Acme",
          firstName: "Jane",
          lastName: "Doe",
        },
        lead: null,
      },
      {
        id: "p2",
        proposalNumber: "PROP-2",
        title: "Brunch",
        status: "draft",
        eventId: null,
        total: 1200,
        eventDate: null,
        guestCount: 50,
        clientId: null,
        leadId: "l1",
        createdAt: new Date("2026-07-02"),
        updatedAt: new Date("2026-07-09"),
        client: null,
        lead: { id: "l1", companyName: "LeadCo", contactName: "Bob" },
      },
    ] as never);

    const res = await GET(new NextRequest("http://x/api/crm/deals?limit=20"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.limit).toBe(20);
    expect(body.offset).toBe(0);
    expect(body.data).toHaveLength(2);

    // accepted + eventId → "won"; raw status preserved as proposalStatus.
    expect(body.data[0]).toEqual({
      id: "p1",
      proposalNumber: "PROP-1",
      title: "Gala Dinner",
      stage: "won",
      proposalStatus: "accepted",
      total: 5000,
      eventDate: "2026-08-01T00:00:00.000Z",
      guestCount: 200,
      clientId: "c1",
      leadId: null,
      client: {
        id: "c1",
        companyName: "Acme",
        firstName: "Jane",
        lastName: "Doe",
      },
      lead: null,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
    });

    // draft → "lead"; lead relation mapped, client null.
    expect(body.data[1].stage).toBe("lead");
    expect(body.data[1].proposalStatus).toBe("draft");
    expect(body.data[1].lead).toEqual({
      id: "l1",
      companyName: "LeadCo",
      contactName: "Bob",
    });
    expect(body.data[1].client).toBeNull();
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new NextRequest("http://x/api/crm/deals"));
    expect(res.status).toBe(401);
    expect(database.proposal.findMany).not.toHaveBeenCalled();
  });

  it("returns 400 when the tenant cannot be resolved", async () => {
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
    const res = await GET(new NextRequest("http://x/api/crm/deals"));
    expect(res.status).toBe(400);
    expect(database.proposal.findMany).not.toHaveBeenCalled();
  });
});
