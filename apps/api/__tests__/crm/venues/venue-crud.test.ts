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

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks (pure factories — no vi.importActual, which loads server-only) ---

vi.mock("@repo/database", () => ({
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
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/prisma-error", () => ({
  translatePrismaError: () => ({ mapped: false, message: "", status: 500 }),
}));
vi.mock("@/app/lib/invariant", () => ({
  invariant: (condition: unknown, message: string) => {
    if (!condition) {
      const err = new Error(message);
      err.name = "InvariantError";
      throw err;
    }
  },
  InvariantError: class InvariantError extends Error {},
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, resolveCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { database } = await import("@repo/database");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

const _venueEventsRoute = await import(
  "@/app/api/crm/venues/[id]/events/route"
);
const listVenueEvents = _venueEventsRoute.GET;

const _venueIdRoute = await import("@/app/api/crm/venues/[id]/route");
const deleteVenue = _venueIdRoute.DELETE;
const getVenue = _venueIdRoute.GET;
const updateVenue = _venueIdRoute.PUT;

const _venuesRoute = await import("@/app/api/crm/venues/route");
const createVenue = _venuesRoute.POST;
const listVenues = _venuesRoute.GET;

const TENANT = "00000000-0000-0000-0000-0000000000aa";
const ORG = "org_venue_test";
const VENUE_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "user_venue_test";

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
  vi.mocked(resolveCurrentUser).mockResolvedValue({
    id: USER_ID,
    tenantId: TENANT,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
  vi.mocked(runManifestCommand).mockImplementation(
    async (params: any) =>
      new Response(JSON.stringify({ success: true, data: params.body }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
  );
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
  it("delegates create to manifest runtime", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: VENUE_ID,
            name: "Grand Ballroom",
            venueType: "other",
            capacity: 0,
            isActive: true,
            tags: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const req = new NextRequest("http://localhost/api/crm/venues", {
      method: "POST",
      body: JSON.stringify({ name: "Grand Ballroom" }),
    });
    const res = await createVenue(req);
    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Venue",
        command: "create",
        body: expect.objectContaining({ name: "Grand Ballroom" }),
      })
    );
  });

  it("passes raw body to manifest (validation is runtime-side)", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: "name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );

    const req = new NextRequest("http://localhost/api/crm/venues", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await createVenue(req);
    // Route delegates to manifest; manifest returns the validation error
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Venue",
        command: "create",
        body: {},
      })
    );
  });

  it("handles non-JSON bodies gracefully (empty object fallback)", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: false, error: "validation failed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    );

    const req = new NextRequest("http://localhost/api/crm/venues", {
      method: "POST",
      body: "not-json",
    });
    await createVenue(req);
    // Route catches JSON parse error and passes {} to manifest
    expect(runManifestCommand).toHaveBeenCalled();
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
  it("delegates update to manifest runtime", async () => {
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: { ...makeFakeVenue(), capacity: 999 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const req = new NextRequest("http://localhost/api/crm/venues/x", {
      method: "PUT",
      body: JSON.stringify({ capacity: 999 }),
    });
    const res = await updateVenue(req, { params: paramsOf(VENUE_ID) });
    expect(res.status).toBe(200);

    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Venue",
        command: "update",
        body: expect.objectContaining({ capacity: 999, id: VENUE_ID }),
      })
    );
  });
});

// --- DELETE /api/crm/venues/[id] ----------------------------------------

describe("DELETE /api/crm/venues/[id]", () => {
  it("returns 404 when venue does not exist (manifest returns error)", async () => {
    // The DELETE route checks event count first, then delegates to manifest.
    // For "venue does not exist", the route doesn't pre-check — it delegates.
    // We test the active-events guard below and the manifest delegation path.
    // Since there's no explicit findFirst before manifest, we just test
    // what the route actually does: check events, then delegate.
    vi.mocked(database.event.count).mockResolvedValue(0 as never);
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    const res = await deleteVenue(
      new NextRequest("http://localhost/api/crm/venues/x", {
        method: "DELETE",
      }),
      { params: paramsOf(VENUE_ID) }
    );
    // The route delegates to manifest, which returns whatever status the response has
    expect(res.status).toBe(404);
  });

  it("blocks deletion when active events exist", async () => {
    vi.mocked(database.event.count).mockResolvedValue(3 as never);

    const res = await deleteVenue(
      new NextRequest("http://localhost/api/crm/venues/x", {
        method: "DELETE",
      }),
      { params: paramsOf(VENUE_ID) }
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.activeEvents).toBe(3);
    expect(runManifestCommand).not.toHaveBeenCalled();
  });

  it("soft-deletes via manifest when no active events", async () => {
    vi.mocked(database.event.count).mockResolvedValue(0 as never);
    vi.mocked(runManifestCommand).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { id: VENUE_ID } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const res = await deleteVenue(
      new NextRequest("http://localhost/api/crm/venues/x", {
        method: "DELETE",
      }),
      { params: paramsOf(VENUE_ID) }
    );
    expect(res.status).toBe(200);

    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Venue",
        command: "deactivate",
        body: { id: VENUE_ID },
      })
    );
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
    vi.mocked(database.venue.findFirst).mockResolvedValue({
      id: VENUE_ID,
    } as never);
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
