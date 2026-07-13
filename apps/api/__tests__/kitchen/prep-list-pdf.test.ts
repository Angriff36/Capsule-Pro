/**
 * GET /api/kitchen/prep-lists/[id]/pdf — N+1 collapse + over-fetch regression
 * guard (item #20).
 *
 * @vitest-environment node
 *
 * The event-branch `preparePdfData` previously ran a 4×N waterfall inside the
 * eventDish loop: per dish it fired dish.findFirst + recipeVersion.findFirst
 * (pulling the heavy `instructions` @db.Text blob) + recipeIngredient.findMany
 * + ingredient.findMany. A 20-dish event paid ~80 round-trips per PDF.
 *
 * It now batch-loads all dishes → latest version per recipe (distinct
 * ["recipeId"] + orderBy versionNumber desc) → recipe ingredients → ingredient
 * details in 4 reads total, each with a focused `select`. The regression guard
 * asserts the per-dish findFirst methods are NEVER called and the batched
 * findMany methods are called once each — fails if reverted to the loop. Also
 * pins the built station data (per-station grouping + guestCount/yield scaling).
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));
vi.mock("@repo/pdf", () => ({ PrepListPDF: vi.fn(() => ({ type: "mock" })) }));
vi.mock("@react-pdf/renderer", () => ({
  pdf: vi.fn(() =>
    Promise.resolve({
      toBlob: () =>
        Promise.resolve(new Blob(["pdf"], { type: "application/pdf" })),
    })
  ),
}));
vi.mock("@repo/database", () => ({
  database: {
    prepList: { findFirst: vi.fn() },
    event: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    eventDish: { findMany: vi.fn() },
    dish: { findMany: vi.fn(), findFirst: vi.fn() },
    recipeVersion: { findMany: vi.fn(), findFirst: vi.fn() },
    recipeIngredient: { findMany: vi.fn() },
    ingredient: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { PrepListPDF } from "@repo/pdf";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { GET } from "../../app/api/kitchen/prep-lists/[id]/pdf/route";

const tenantId = "tenant-1";

describe("GET /api/kitchen/prep-lists/[id]/pdf (event branch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(tenantId);

    // fetchPrepList: no saved prep list → falls through to the event branch.
    vi.mocked(database.prepList.findFirst).mockResolvedValue(null as never);
    // Both event.findFirst calls (fetchPrepList + preparePdfData) return the event.
    vi.mocked(database.event.findFirst).mockResolvedValue({
      id: "evt-1",
      title: "Gala",
      eventDate: new Date("2026-07-13T00:00:00Z"),
      guestCount: 100,
    } as never);
    vi.mocked(database.user.findFirst).mockResolvedValue({
      firstName: "Cook",
      lastName: "Chef",
      email: "cook@x.test",
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("batch-loads dishes/versions/ingredients (no per-dish N+1, no instructions blob)", async () => {
    vi.mocked(database.eventDish.findMany).mockResolvedValue([
      { dishId: "dish-A" },
      { dishId: "dish-B" },
    ] as never);
    vi.mocked(database.dish.findMany).mockResolvedValue([
      { id: "dish-A", recipeId: "r1" },
      { id: "dish-B", recipeId: "r2" },
    ] as never);
    vi.mocked(database.recipeVersion.findMany).mockResolvedValue([
      { id: "v1", recipeId: "r1", yieldQuantity: 10 },
      { id: "v2", recipeId: "r2", yieldQuantity: 5 },
    ] as never);
    vi.mocked(database.recipeIngredient.findMany).mockResolvedValue([
      { ingredientId: "i1", quantity: 2, recipeVersionId: "v1" },
      { ingredientId: "i2", quantity: 3, recipeVersionId: "v2" },
    ] as never);
    vi.mocked(database.ingredient.findMany).mockResolvedValue([
      { id: "i1", name: "chicken breast", category: "poultry" },
      { id: "i2", name: "flour", category: "baking" },
    ] as never);

    const res = await GET(
      new NextRequest(
        "http://x/api/kitchen/prep-lists/evt-1/pdf?download=true"
      ),
      { params: Promise.resolve({ id: "evt-1" }) }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");

    // Batched reads called exactly once each, with the expected shapes.
    expect(database.dish.findMany).toHaveBeenCalledTimes(1);
    expect(database.dish.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["dish-A", "dish-B"] }, tenantId },
        select: { id: true, recipeId: true },
      })
    );
    expect(database.recipeVersion.findMany).toHaveBeenCalledTimes(1);
    expect(database.recipeVersion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        distinct: ["recipeId"],
        orderBy: { versionNumber: "desc" },
        select: { id: true, recipeId: true, yieldQuantity: true },
      })
    );
    expect(database.recipeIngredient.findMany).toHaveBeenCalledTimes(1);
    expect(database.ingredient.findMany).toHaveBeenCalledTimes(1);

    // Per-dish N+1 methods NEVER called (regression guard).
    expect(database.dish.findFirst).not.toHaveBeenCalled();
    expect(database.recipeVersion.findFirst).not.toHaveBeenCalled();
  });

  it("builds per-station scaled ingredient data from the batched reads", async () => {
    vi.mocked(database.eventDish.findMany).mockResolvedValue([
      { dishId: "dish-A" },
      { dishId: "dish-B" },
    ] as never);
    vi.mocked(database.dish.findMany).mockResolvedValue([
      { id: "dish-A", recipeId: "r1" },
      { id: "dish-B", recipeId: "r2" },
    ] as never);
    vi.mocked(database.recipeVersion.findMany).mockResolvedValue([
      { id: "v1", recipeId: "r1", yieldQuantity: 10 },
      { id: "v2", recipeId: "r2", yieldQuantity: 5 },
    ] as never);
    vi.mocked(database.recipeIngredient.findMany).mockResolvedValue([
      { ingredientId: "i1", quantity: 2, recipeVersionId: "v1" },
      { ingredientId: "i2", quantity: 3, recipeVersionId: "v2" },
    ] as never);
    vi.mocked(database.ingredient.findMany).mockResolvedValue([
      { id: "i1", name: "chicken breast", category: "poultry" },
      { id: "i2", name: "flour", category: "baking" },
    ] as never);

    await GET(
      new NextRequest(
        "http://x/api/kitchen/prep-lists/evt-1/pdf?download=true"
      ),
      { params: Promise.resolve({ id: "evt-1" }) }
    );

    expect(PrepListPDF).toHaveBeenCalledTimes(1);
    const data = (
      vi.mocked(PrepListPDF).mock.calls[0]?.[0] as {
        data: {
          prepList: { totalIngredients: number; stationLists: unknown[] };
        };
      }
    ).data;

    // 100 guests / yield 10 → i1 (qty 2) scales to 20; 100/5 → i2 (qty 3) → 60.
    const stations = data.prepList.stationLists as Array<{
      stationId: string;
      totalIngredients: number;
      ingredients: Array<{ ingredientId: string; scaledQuantity: number }>;
    }>;
    const byStation = new Map(stations.map((s) => [s.stationId, s]));
    expect(byStation.get("hot-line")?.ingredients[0]).toMatchObject({
      ingredientId: "i1",
      scaledQuantity: 20,
    });
    expect(byStation.get("bakery")?.ingredients[0]).toMatchObject({
      ingredientId: "i2",
      scaledQuantity: 60,
    });
    expect(data.prepList.totalIngredients).toBe(2);
  });

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

    const res = await GET(
      new NextRequest("http://x/api/kitchen/prep-lists/evt-1/pdf"),
      { params: Promise.resolve({ id: "evt-1" }) }
    );

    expect(res.status).toBe(401);
    expect(database.eventDish.findMany).not.toHaveBeenCalled();
    expect(database.dish.findMany).not.toHaveBeenCalled();
  });
});
