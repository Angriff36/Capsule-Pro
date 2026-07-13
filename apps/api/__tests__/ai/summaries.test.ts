/**
 * Tests for AI Event Summaries API — GET /api/ai/summaries/[eventId]
 *
 * Pins the #19 getEventDataForSummary parallelization: the event, event-dishes,
 * staff-assignment, and allergen-warning reads are independent (all keyed only on
 * tenantId+eventId) and run in one Promise.all batch; only dish.findMany waits on
 * the event_dishes junction rows.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    event: {
      findFirst: vi.fn(),
    },
    dish: {
      findMany: vi.fn(),
    },
    eventStaff: {
      findMany: vi.fn(),
    },
    allergenWarning: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mocked-model"),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { generateText } from "ai";
import { getTenantIdForOrg } from "@/app/lib/tenant";

import { GET } from "../../app/api/ai/summaries/[eventId]/route";

const mockAuth = vi.mocked(auth);
const mockGetTenantId = vi.mocked(getTenantIdForOrg);
const mockGenerateText = vi.mocked(generateText);
const mockEventFindFirst = vi.mocked(database.event.findFirst);
const mockDishFindMany = vi.mocked(database.dish.findMany);
const mockEventStaffFindMany = vi.mocked(database.eventStaff.findMany);
const mockAllergenWarningFindMany = vi.mocked(
  database.allergenWarning.findMany
);
const mockQueryRaw = vi.mocked(database.$queryRaw);

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";
const EVENT_ID = "evt-1";

function ctx(eventId: string): { params: Promise<{ eventId: string }> } {
  return { params: Promise.resolve({ eventId }) };
}

function mockEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    title: "Spring Wedding",
    eventType: "wedding",
    eventDate: new Date("2026-08-01T16:00:00Z"),
    guestCount: 120,
    status: "confirmed",
    venueName: "The Grand Hall",
    venueAddress: "1 Main St",
    notes: "Valet parking required",
    tags: ["outdoor", "premium"],
    client: {
      companyName: "Acme Co",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@acme.com",
      phone: "555-0100",
    },
    ...overrides,
  };
}

describe("GET /api/ai/summaries/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      orgId: ORG_ID,
      userId: "user-1",
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetTenantId.mockResolvedValue(TENANT_ID);
    mockEventFindFirst.mockResolvedValue(mockEvent() as never);
    mockQueryRaw.mockResolvedValue([] as never);
    mockDishFindMany.mockResolvedValue([] as never);
    mockEventStaffFindMany.mockResolvedValue([] as never);
    mockAllergenWarningFindMany.mockResolvedValue([] as never);
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({
        summary: "A lovely wedding.",
        highlights: ["Outdoor venue"],
        criticalInfo: ["Shellfish allergen"],
      }),
    } as unknown as Awaited<ReturnType<typeof generateText>>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 before any DB read when unauthenticated", async () => {
    mockAuth.mockResolvedValue({
      orgId: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await GET(
      new Request("http://localhost/api/ai/summaries/evt-1"),
      ctx(EVENT_ID)
    );

    expect(res.status).toBe(401);
    expect(mockEventFindFirst).not.toHaveBeenCalled();
  });

  it("returns 400 when eventId is missing", async () => {
    const res = await GET(
      new Request("http://localhost/api/ai/summaries/"),
      ctx("")
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toBe("Event ID is required");
  });

  it("returns 404 when the event does not exist", async () => {
    mockEventFindFirst.mockResolvedValue(null as never);

    const res = await GET(
      new Request("http://localhost/api/ai/summaries/evt-1"),
      ctx(EVENT_ID)
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.message).toBe("Event not found");
  });

  it("runs the event, event-dishes, staff, and allergen-warning reads concurrently (Tier 0)", async () => {
    // Hold the event query pending. The three sibling Tier-0 reads share the
    // same Promise.all batch, so they must be invoked BEFORE the event query
    // resolves — proving concurrency. dish.findMany is Tier 1 (depends on the
    // event_dishes rows) and must NOT have fired yet.
    let resolveEvent!: (value: unknown) => void;
    mockEventFindFirst.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEvent = resolve;
        }) as never
    );

    const getPromise = GET(
      new Request("http://localhost/api/ai/summaries/evt-1"),
      ctx(EVENT_ID)
    );
    // Drain microtasks so the route reaches the Tier-0 Promise.all.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockQueryRaw).toHaveBeenCalled();
    expect(mockEventStaffFindMany).toHaveBeenCalled();
    expect(mockAllergenWarningFindMany).toHaveBeenCalled();
    expect(mockDishFindMany).not.toHaveBeenCalled();

    resolveEvent(mockEvent());
    await getPromise;
  });

  it("fetches dishes only when event_dishes junction rows exist (Tier 1 dependency)", async () => {
    mockQueryRaw.mockResolvedValue([
      {
        tenant_id: TENANT_ID,
        id: "ed-1",
        event_id: EVENT_ID,
        dish_id: "dish-1",
        course: "main",
        quantity_servings: 40,
      },
    ] as never);
    mockDishFindMany.mockResolvedValue([
      {
        id: "dish-1",
        name: "Grilled Salmon",
        allergens: ["fish"],
        dietaryTags: ["gluten-free"],
      },
    ] as never);

    const res = await GET(
      new Request("http://localhost/api/ai/summaries/evt-1"),
      ctx(EVENT_ID)
    );

    expect(res.status).toBe(200);
    expect(mockDishFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          id: { in: ["dish-1"] },
        }),
      })
    );
  });

  it("skips the dish read when there are no event_dishes (empty Tier-1 guard)", async () => {
    mockQueryRaw.mockResolvedValue([] as never);

    await GET(
      new Request("http://localhost/api/ai/summaries/evt-1"),
      ctx(EVENT_ID)
    );

    expect(mockDishFindMany).not.toHaveBeenCalled();
  });

  it("returns the generated summary on the happy path", async () => {
    mockQueryRaw.mockResolvedValue([
      {
        tenant_id: TENANT_ID,
        id: "ed-1",
        event_id: EVENT_ID,
        dish_id: "dish-1",
        course: "main",
        quantity_servings: 40,
      },
    ] as never);
    mockDishFindMany.mockResolvedValue([
      {
        id: "dish-1",
        name: "Grilled Salmon",
        allergens: ["fish"],
        dietaryTags: ["gluten-free"],
      },
    ] as never);
    mockEventStaffFindMany.mockResolvedValue([
      {
        role: "Chef",
        shiftStart: new Date("2026-08-01T15:00:00Z"),
        shiftEnd: new Date("2026-08-01T23:00:00Z"),
      },
    ] as never);
    mockAllergenWarningFindMany.mockResolvedValue([
      { severity: "high", allergens: ["shellfish"], notes: "Guest alert" },
    ] as never);

    const res = await GET(
      new Request("http://localhost/api/ai/summaries/evt-1"),
      ctx(EVENT_ID)
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.eventId).toBe(EVENT_ID);
    expect(data.summary).toBe("A lovely wedding.");
    expect(data.highlights).toEqual(["Outdoor venue"]);
    expect(data.criticalInfo).toEqual(["Shellfish allergen"]);
    expect(data.eventTitle).toBe("Spring Wedding");
    expect(data.model).toBe("gpt-4o-mini");
  });

  it("falls back to a rule-based summary when the AI call fails", async () => {
    mockGenerateText.mockRejectedValue(new Error("AI unavailable"));

    const res = await GET(
      new Request("http://localhost/api/ai/summaries/evt-1"),
      ctx(EVENT_ID)
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(typeof data.summary).toBe("string");
    expect(data.summary.length).toBeGreaterThan(0);
  });
});
