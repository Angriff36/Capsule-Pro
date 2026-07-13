/**
 * Tests for GET /api/events/export/csv
 * Pins the #19 over-fetch fix: the route selects only the columns emitted to
 * the CSV (no full-row fetch, no dead `notes` column) while producing an
 * unchanged CSV.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    event: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { GET } from "../../app/api/events/export/csv/route";

const mockAuth = vi.mocked(auth);
const mockGetTenantId = vi.mocked(getTenantIdForOrg);
const mockEventFindMany = vi.mocked(database.event.findMany);

const selectOf = (call: unknown): Record<string, unknown> =>
  (call as { select?: Record<string, unknown> }).select ?? {};

describe("GET /api/events/export/csv", () => {
  const tenantId = "tenant-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetTenantId.mockResolvedValue(tenantId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({
      orgId: null,
      userId: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await GET(
      new Request("http://localhost/api/events/export/csv")
    );

    expect(res.status).toBe(401);
  });

  it("should select only the CSV columns (no full-row over-fetch, no notes)", async () => {
    mockEventFindMany.mockResolvedValue([
      {
        id: "evt-1",
        eventNumber: "E-001",
        title: "Gala",
        eventDate: new Date("2026-07-13T00:00:00Z"),
        eventType: "wedding",
        status: "confirmed",
        guestCount: 100,
        venueName: "Grand Hall",
        venueAddress: "1 Main St",
        budget: 5000,
        tags: ["vip", "outdoor"],
        createdAt: new Date("2026-07-01T00:00:00Z"),
        updatedAt: new Date("2026-07-02T00:00:00Z"),
      },
    ] as unknown as Awaited<ReturnType<typeof database.event.findMany>>);

    const res = await GET(
      new Request("http://localhost/api/events/export/csv")
    );
    const data = await res.json();

    expect(res.status).toBe(200);

    const select = selectOf(mockEventFindMany.mock.calls[0]?.[0]);
    // Exactly the 13 columns emitted to the CSV.
    expect(Object.keys(select).sort()).toEqual(
      [
        "budget",
        "createdAt",
        "eventDate",
        "eventNumber",
        "eventType",
        "guestCount",
        "id",
        "status",
        "tags",
        "title",
        "updatedAt",
        "venueAddress",
        "venueName",
      ].sort()
    );
    // The dead `notes` column must NOT be selected.
    expect(select).not.toHaveProperty("notes");

    // CSV output is unchanged: header + the exported row.
    expect(data.content).toContain(
      "Event ID,Event Number,Title,Date,Type,Status,Guest Count,Venue,Address,Budget,Tags,Created,Updated"
    );
    expect(data.content).toContain("evt-1");
    expect(data.content).toContain("vip; outdoor");
    expect(data.eventsExported).toBe(1);
  });

  it("should return 404 when no events match", async () => {
    mockEventFindMany.mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof database.event.findMany>>
    );

    const res = await GET(
      new Request("http://localhost/api/events/export/csv")
    );

    expect(res.status).toBe(404);
  });

  it("should download as a CSV file when download=true", async () => {
    mockEventFindMany.mockResolvedValue([
      {
        id: "evt-1",
        eventNumber: null,
        title: "Gala",
        eventDate: new Date("2026-07-13T00:00:00Z"),
        eventType: "wedding",
        status: "confirmed",
        guestCount: 0,
        venueName: null,
        venueAddress: null,
        budget: null,
        tags: [],
        createdAt: new Date("2026-07-01T00:00:00Z"),
        updatedAt: new Date("2026-07-02T00:00:00Z"),
      },
    ] as unknown as Awaited<ReturnType<typeof database.event.findMany>>);

    const res = await GET(
      new Request("http://localhost/api/events/export/csv?download=true")
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toContain(
      "attachment; filename="
    );
  });
});
