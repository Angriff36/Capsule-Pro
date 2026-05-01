/**
 * Venue CRUD API Integration Tests
 *
 * Covers the direct-Prisma venue routes that were re-enabled after the
 * `tenant.venues` migration landed (20260501000000_add_venues_table):
 *
 *   GET    /api/crm/venues
 *   POST   /api/crm/venues
 *   GET    /api/crm/venues/[id]
 *   PUT    /api/crm/venues/[id]
 *   DELETE /api/crm/venues/[id]
 *   GET    /api/crm/venues/[id]/events
 *
 * Pins the soft-delete + active-events guard, validation rules, and the
 * tenant-scoping pattern used by every read/write.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GET as listVenues,
  POST as createVenue,
} from "@/app/api/crm/venues/route";
import {
  DELETE as deleteVenue,
  GET as getVenue,
  PUT as updateVenue,
} from "@/app/api/crm/venues/[id]/route";
import { GET as listVenueEvents } from "@/app/api/crm/venues/[id]/events/route";

// --- Mocks --------------------------------------------------------------

vi.mock("@repo/database", async () => {
  const actual = await vi.importActual<typeof import("@repo/database")>(
    "@repo/database"
  );
  return {
    ...actual,
    database: {
      venue: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      event: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");

const TENANT = "00000000-0000-0000-0000-0000000000aa";
const ORG = "org_venue_test";
const VENUE_ID = "11111111-1111-1111-1111-111111111111";

function paramsOf(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

function makeFakeVenue(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    tenantId: TENANT,
    id: VENUE_ID,
    name: "Grand Ballroom",
    venueType: "banquet_hall",
    addressLine1: "123 Main",
    addressLine2: null,
    city: "Boston",
    stateProvince: "MA",
    postalCode: "02108",
    countryCode: "US",
    capacity: 250,
    contactName: "Jane Doe",
    contactPhone: "+1-555-0100",
    contactEmail: "jane@grand.example",
    equipmentList: null,
    preferredVendors: null,
    accessNotes: null,
    cateringNotes: null,
    layoutImageUrl: null,
    isActive: true,
    tags: ["downtown", "ballroom"],
    createdAt: new Date("2026-04-01T00:00:00Z"),
    updatedAt: new Date("2026-04-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    userId: "user_x",
    orgId: ORG,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT);
});

// --- GET /api/crm/venues ------------------------------------------------

describe("GET /api/crm/venues", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
    const req = new NextRequest("http://localhost/api/crm/venues");
    const res = await listVenues(req);
    expect(res.status).toBe(401);
  });

  it("filters by tenant + deletedAt and applies pagination", async () => {
    const fake = makeFakeVenue();
    vi.mocked(database.venue.findMany).mockResolvedValue([fake] as never);
    vi.mocked(database.venue.count).mockResolvedValue(1 as never);

    const req = new NextRequest(
      "http://localhost/api/crm/venues?page=2&limit=10&isActive=true"
    );
    const res = await listVenues(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
    });

    expect(database.venue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 10,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tenantId: TENANT },
            { deletedAt: null },
            { isActive: true },
          ]),
        }),
      })
    );
  });

  it("parses tags filter from JSON array param", async () => {
    vi.mocked(database.venue.findMany).mockResolvedValue([] as never);
    vi.mocked(database.venue.count).mockResolvedValue(0 as never);

    const req = new NextRequest(
      `http://localhost/api/crm/venues?tags=${encodeURIComponent(
        JSON.stringify(["downtown", "outdoor"])
      )}`
    );
    await listVenues(req);

    expect(database.venue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tags: { hasSome: ["downtown", "outdoor"] } },
          ]),
        }),
      })
    );
  });
});

// --- POST /api/crm/venues -----------------------------------------------

describe("POST /api/crm/venues", () => {
  it("returns 400 when name is missing", async () => {
    const req = new NextRequest("http://localhost/api/crm/venues", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await createVenue(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid email", async () => {
    const req = new NextRequest("http://localhost/api/crm/venues", {
      method: "POST",
      body: JSON.stringify({ name: "X", contactEmail: "not-an-email" }),
    });
    const res = await createVenue(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown venueType", async () => {
    const req = new NextRequest("http://localhost/api/crm/venues", {
      method: "POST",
      body: JSON.stringify({ name: "X", venueType: "spaceship" }),
    });
    const res = await createVenue(req);
    expect(res.status).toBe(400);
  });

  it("creates a venue with sane defaults", async () => {
    const fake = makeFakeVenue();
    vi.mocked(database.venue.create).mockResolvedValue(fake as never);

    const req = new NextRequest("http://localhost/api/crm/venues", {
      method: "POST",
      body: JSON.stringify({ name: "Grand Ballroom" }),
    });
    const res = await createVenue(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe(VENUE_ID);

    expect(database.venue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT,
          name: "Grand Ballroom",
          venueType: "other",
          capacity: 0,
          isActive: true,
          tags: [],
        }),
      })
    );
  });

  it("rejects non-JSON bodies with 400", async () => {
    const req = new NextRequest("http://localhost/api/crm/venues", {
      method: "POST",
      body: "not-json",
    });
    const res = await createVenue(req);
    expect(res.status).toBe(400);
  });
});

// --- GET /api/crm/venues/[id] -------------------------------------------

describe("GET /api/crm/venues/[id]", () => {
  it("returns 404 when venue does not exist", async () => {
    vi.mocked(database.venue.findFirst).mockResolvedValue(null);
    const res = await getVenue(new Request("http://localhost"), {
      params: paramsOf(VENUE_ID),
    });
    expect(res.status).toBe(404);
  });

  it("returns the venue with its event count", async () => {
    vi.mocked(database.venue.findFirst).mockResolvedValue(
      makeFakeVenue() as never
    );
    vi.mocked(database.event.count).mockResolvedValue(7 as never);

    const res = await getVenue(new Request("http://localhost"), {
      params: paramsOf(VENUE_ID),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(VENUE_ID);
    expect(json.data.eventCount).toBe(7);
  });
});

// --- PUT /api/crm/venues/[id] -------------------------------------------

describe("PUT /api/crm/venues/[id]", () => {
  it("returns 404 when venue not found", async () => {
    vi.mocked(database.venue.findFirst).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/crm/venues/x", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await updateVenue(req, { params: paramsOf(VENUE_ID) });
    expect(res.status).toBe(404);
    expect(database.venue.update).not.toHaveBeenCalled();
  });

  it("only writes provided fields", async () => {
    const fake = makeFakeVenue();
    vi.mocked(database.venue.findFirst).mockResolvedValue(fake as never);
    vi.mocked(database.venue.update).mockResolvedValue(
      { ...fake, capacity: 999 } as never
    );

    const req = new NextRequest("http://localhost/api/crm/venues/x", {
      method: "PUT",
      body: JSON.stringify({ capacity: 999 }),
    });
    const res = await updateVenue(req, { params: paramsOf(VENUE_ID) });
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(database.venue.update).mock.calls[0][0];
    expect(updateCall.where).toEqual({
      tenantId_id: { tenantId: TENANT, id: VENUE_ID },
    });
    expect(updateCall.data).toEqual({ capacity: 999 });
  });
});

// --- DELETE /api/crm/venues/[id] ----------------------------------------

describe("DELETE /api/crm/venues/[id]", () => {
  it("returns 404 when venue does not exist", async () => {
    vi.mocked(database.venue.findFirst).mockResolvedValue(null);
    const res = await deleteVenue(
      new NextRequest("http://localhost/api/crm/venues/x", { method: "DELETE" }),
      { params: paramsOf(VENUE_ID) }
    );
    expect(res.status).toBe(404);
  });

  it("blocks deletion when active events exist", async () => {
    vi.mocked(database.venue.findFirst).mockResolvedValue(
      makeFakeVenue() as never
    );
    vi.mocked(database.event.count).mockResolvedValue(3 as never);

    const res = await deleteVenue(
      new NextRequest("http://localhost/api/crm/venues/x", { method: "DELETE" }),
      { params: paramsOf(VENUE_ID) }
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.activeEvents).toBe(3);
    expect(database.venue.update).not.toHaveBeenCalled();
  });

  it("soft-deletes when no active events", async () => {
    vi.mocked(database.venue.findFirst).mockResolvedValue(
      makeFakeVenue() as never
    );
    vi.mocked(database.event.count).mockResolvedValue(0 as never);
    vi.mocked(database.venue.update).mockResolvedValue(
      makeFakeVenue({ deletedAt: new Date() }) as never
    );

    const res = await deleteVenue(
      new NextRequest("http://localhost/api/crm/venues/x", { method: "DELETE" }),
      { params: paramsOf(VENUE_ID) }
    );
    expect(res.status).toBe(200);

    const updateCall = vi.mocked(database.venue.update).mock.calls[0][0];
    expect(updateCall.where).toEqual({
      tenantId_id: { tenantId: TENANT, id: VENUE_ID },
    });
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });
});

// --- GET /api/crm/venues/[id]/events ------------------------------------

describe("GET /api/crm/venues/[id]/events", () => {
  it("returns 404 when the venue is missing", async () => {
    vi.mocked(database.venue.findFirst).mockResolvedValue(null);
    const res = await listVenueEvents(
      new NextRequest("http://localhost/api/crm/venues/x/events"),
      { params: paramsOf(VENUE_ID) }
    );
    expect(res.status).toBe(404);
  });

  it("returns events filtered by status with pagination", async () => {
    vi.mocked(database.venue.findFirst).mockResolvedValue({ id: VENUE_ID } as never);
    vi.mocked(database.event.findMany).mockResolvedValue([] as never);
    vi.mocked(database.event.count).mockResolvedValue(0 as never);

    const res = await listVenueEvents(
      new NextRequest(
        "http://localhost/api/crm/venues/x/events?status=confirmed&limit=10&offset=20"
      ),
      { params: paramsOf(VENUE_ID) }
    );
    expect(res.status).toBe(200);

    expect(database.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tenantId: TENANT },
            { venueEntityId: VENUE_ID },
            { deletedAt: null },
            { status: "confirmed" },
          ]),
        }),
      })
    );
  });
});
