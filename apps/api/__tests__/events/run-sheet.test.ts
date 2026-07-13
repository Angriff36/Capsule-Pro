/**
 * GET /api/events/[eventId]/run-sheet — parallelization + correctness guard.
 *
 * Pins item #19 on a flagship event-detail route. The original GET ran a
 * 10-deep serial waterfall:
 *   event → battleBoard → eventDishLinks → dish → recipeVersion →
 *   recipeIngredient → ingredient → eventStaff → staffMember → eventTimeline
 *
 * The parallel version collapses to 6 rounds using the dependency graph:
 *   event (prereq / 404 guard)
 *   Tier 0 — Promise.all([battleBoard, eventDishLinks, eventStaff, eventTimeline])
 *     (all four depend only on eventId+tenantId, never on each other)
 *   Tier 1 — Promise.all([dish, staffMember])  (dish←eventDishLinks, staff←eventStaff)
 *   recipeVersion → recipeIngredient → ingredient  (inherently serial; each needs prior IDs)
 *
 * The concurrency proofs use a controlled *pending* promise: inside a
 * Promise.all every query in the batch is invoked in the same synchronous
 * burst (array construction), so the last query fires WHILE the first is still
 * pending. The old serial layout ran eventTimeline (and eventStaff/staffMember)
 * only after the entire dish chain, so it could not fire while an earlier
 * query was pending — these tests fail if reverted to serial.
 *
 * Also pins the recipeVersion bound: `distinct:["recipeId"]` + orderBy desc
 * returns the latest version per recipe (one row each) instead of every
 * version; the dedup map remains the correctness floor, verified behaviorally
 * by supplying two versions and asserting the latest is used.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    event: { findFirst: vi.fn() },
    battleBoard: { findFirst: vi.fn() },
    eventDish: { findMany: vi.fn() },
    dish: { findMany: vi.fn() },
    recipeVersion: { findMany: vi.fn() },
    recipeIngredient: { findMany: vi.fn() },
    ingredient: { findMany: vi.fn() },
    eventStaff: { findMany: vi.fn() },
    staffMember: { findMany: vi.fn() },
    eventTimeline: { findMany: vi.fn() },
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/events/[eventId]/run-sheet/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const eventFindFirst = database.event.findFirst as ReturnType<typeof vi.fn>;
const battleBoardFindFirst = database.battleBoard.findFirst as ReturnType<
  typeof vi.fn
>;
const eventDishFindMany = database.eventDish.findMany as ReturnType<
  typeof vi.fn
>;
const dishFindMany = database.dish.findMany as ReturnType<typeof vi.fn>;
const recipeVersionFindMany = database.recipeVersion.findMany as ReturnType<
  typeof vi.fn
>;
const recipeIngredientFindMany = database.recipeIngredient
  .findMany as ReturnType<typeof vi.fn>;
const ingredientFindMany = database.ingredient.findMany as ReturnType<
  typeof vi.fn
>;
const eventStaffFindMany = database.eventStaff.findMany as ReturnType<
  typeof vi.fn
>;
const staffMemberFindMany = database.staffMember.findMany as ReturnType<
  typeof vi.fn
>;
const eventTimelineFindMany = database.eventTimeline.findMany as ReturnType<
  typeof vi.fn
>;

const EVENT_ID = "evt_1";

function buildRequest() {
  const url = `http://x/api/events/${EVENT_ID}/run-sheet`;
  return {
    req: new Request(url) as never,
    ctx: { params: Promise.resolve({ eventId: EVENT_ID }) } as never,
  };
}

describe("GET /api/events/[eventId]/run-sheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: "u1",
      orgId: "org_test",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    // Defaults — empty-result baseline so the route completes 200 unless a
    // test overrides a specific query.
    eventFindFirst.mockResolvedValue({
      id: EVENT_ID,
      title: "Gala",
      eventDate: null,
      eventType: "wedding",
      venueName: "Hall",
      venueAddress: null,
      guestCount: 100,
      status: "confirmed",
      client: null,
    });
    battleBoardFindFirst.mockResolvedValue(null);
    eventDishFindMany.mockResolvedValue([]);
    dishFindMany.mockResolvedValue([]);
    recipeVersionFindMany.mockResolvedValue([]);
    recipeIngredientFindMany.mockResolvedValue([]);
    ingredientFindMany.mockResolvedValue([]);
    eventStaffFindMany.mockResolvedValue([]);
    staffMemberFindMany.mockResolvedValue([]);
    eventTimelineFindMany.mockResolvedValue([]);
  });

  it("runs the four independent reads concurrently in the Tier-0 batch", async () => {
    // battleBoard stays pending; assert eventTimeline (the LAST Tier-0 read)
    // fires in the same Promise.all burst. The old serial layout ran
    // eventTimeline 10th — behind the whole dish chain — so it could not fire
    // while battleBoard was pending.
    let resolveBB!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveBB = r;
    });
    battleBoardFindFirst.mockReturnValue(pending as never);

    const { req, ctx } = buildRequest();
    const p = GET(req, ctx);

    await vi.waitFor(() => {
      expect(battleBoardFindFirst).toHaveBeenCalledTimes(1);
    });

    // CONCURRENCY: every other Tier-0 read fires while battleBoard is pending.
    expect(eventDishFindMany).toHaveBeenCalledTimes(1);
    expect(eventStaffFindMany).toHaveBeenCalledTimes(1);
    expect(eventTimelineFindMany).toHaveBeenCalledTimes(1);

    resolveBB(null);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("runs the dish + staffMember fetches concurrently in the Tier-1 batch", async () => {
    // Give the Tier-0 batch data so both Tier-1 reads fire.
    eventDishFindMany.mockResolvedValue([
      { dishId: "d1", course: 1, quantityServings: 10 },
    ]);
    eventStaffFindMany.mockResolvedValue([
      { staffMemberId: "s1", role: "Server" },
    ]);

    // dish stays pending; assert staffMember fires in the same Promise.all
    // burst. The old serial layout ran staffMember after the entire
    // dish → recipeVersion → recipeIngredient → ingredient chain, so it could
    // not fire while dish was pending.
    let resolveDish!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveDish = r;
    });
    dishFindMany.mockReturnValue(pending as never);

    const { req, ctx } = buildRequest();
    const p = GET(req, ctx);

    await vi.waitFor(() => {
      expect(dishFindMany).toHaveBeenCalledTimes(1);
    });

    // CONCURRENCY: staffMember fires while dish is still pending.
    expect(staffMemberFindMany).toHaveBeenCalledTimes(1);

    resolveDish([
      {
        id: "d1",
        name: "Salad",
        description: null,
        allergens: [],
        dietaryTags: [],
        recipeId: null,
      },
    ]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("builds the run sheet with latest-per-recipe, scaled ingredients, staff, and timeline", async () => {
    eventFindFirst.mockResolvedValue({
      id: EVENT_ID,
      title: "Gala",
      eventDate: null,
      eventType: "wedding",
      venueName: "Hall",
      venueAddress: null,
      guestCount: 100,
      status: "confirmed",
      client: {
        id: "cl1",
        companyName: "Acme",
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        phone: "555",
      },
    });
    eventDishFindMany.mockResolvedValue([
      { dishId: "d1", course: 1, quantityServings: 10 },
    ]);
    dishFindMany.mockResolvedValue([
      {
        id: "d1",
        name: "Salad",
        description: "Fresh",
        allergens: ["nuts"],
        dietaryTags: ["vegan"],
        recipeId: "r1",
      },
    ]);
    // Two versions of r1; orderBy desc + dedup must keep the LATEST (v2).
    recipeVersionFindMany.mockResolvedValue([
      {
        id: "rv2",
        recipeId: "r1",
        yieldQuantity: 20,
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        instructions: "Toss",
      },
      {
        id: "rv1",
        recipeId: "r1",
        yieldQuantity: 5,
        prepTimeMinutes: 1,
        cookTimeMinutes: 1,
        instructions: "old",
      },
    ]);
    recipeIngredientFindMany.mockResolvedValue([
      {
        recipeVersionId: "rv2",
        ingredientId: "i_tomato",
        quantity: 4,
        isOptional: false,
      },
      {
        recipeVersionId: "rv2",
        ingredientId: "i_salt",
        quantity: 2,
        isOptional: true,
      },
    ]);
    ingredientFindMany.mockResolvedValue([
      { id: "i_tomato", name: "Tomato" },
      { id: "i_salt", name: "Salt" },
    ]);
    eventStaffFindMany.mockResolvedValue([
      { staffMemberId: "s1", role: "Server" },
    ]);
    staffMemberFindMany.mockResolvedValue([
      { id: "s1", displayName: "Alice", role: "Lead" },
    ]);
    eventTimelineFindMany.mockResolvedValue([
      {
        id: "t1",
        description: "Doors open",
        notes: "note",
        timelineTime: null,
        responsibleRole: "Manager",
        isCompleted: false,
      },
    ]);

    const { req, ctx } = buildRequest();
    const res = await GET(req, ctx);
    const body = await res.json();

    expect(res.status).toBe(200);
    // Source derived from battleBoard (null → event-menu).
    expect(body.source).toBe("event-menu");
    expect(body.event.client).toMatchObject({ id: "cl1", name: "Acme" });

    // Latest recipe version used (v2: yield 20). NOTE: dish.recipe.ingredients
    // carries the RAW per-recipe quantity — scaling is applied only when
    // aggregating the shopping list below.
    expect(body.dishes).toHaveLength(1);
    const dish = body.dishes[0];
    expect(dish.name).toBe("Salad");
    expect(dish.servings).toBe(10);
    expect(dish.recipe.yieldQuantity).toBe(20);
    expect(dish.recipe.ingredients).toEqual([
      { name: "Tomato", quantity: 4, isOptional: false },
      { name: "Salt", quantity: 2, isOptional: true },
    ]);

    // Shopping list aggregated + sorted by name; scaled quantities preserved.
    expect(body.shoppingList).toEqual([
      { name: "Salt", quantity: 1, dishes: ["Salad"] },
      { name: "Tomato", quantity: 2, dishes: ["Salad"] },
    ]);

    expect(body.staff).toEqual([
      { id: "s1", name: "Alice", role: "Lead", assignmentRole: "Server" },
    ]);
    expect(body.timeline).toEqual([
      {
        id: "t1",
        title: "Doors open",
        description: "note",
        time: null,
        responsibleRole: "Manager",
        isCompleted: false,
      },
    ]);
  });

  it("returns battle-board source when a finalized board exists", async () => {
    battleBoardFindFirst.mockResolvedValue({ id: "bb1", boardName: "Board" });
    const { req, ctx } = buildRequest();
    const res = await GET(req, ctx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.source).toBe("battle-board");
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const { req, ctx } = buildRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
    expect(eventFindFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the event does not exist (before any Tier-0 read)", async () => {
    eventFindFirst.mockResolvedValue(null);
    const { req, ctx } = buildRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
    expect(battleBoardFindFirst).not.toHaveBeenCalled();
    expect(eventDishFindMany).not.toHaveBeenCalled();
    expect(eventTimelineFindMany).not.toHaveBeenCalled();
  });
});
