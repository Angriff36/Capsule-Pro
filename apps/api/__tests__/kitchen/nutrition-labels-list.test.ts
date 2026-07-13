/**
 * GET /api/kitchen/nutrition-labels/list — N+1 collapse regression guard.
 *
 * Pins item #19: the route previously ran 2 queries PER recipe
 * (recipeVersion.findFirst + recipeIngredient.count inside a Promise.all map =
 * 2N+1 total). It now batch-fetches the latest version per recipe in one
 * findMany (distinct ["recipeId"] + orderBy versionNumber desc) and per-version
 * ingredient counts in one groupBy = 3 round-trips total.
 *
 * The regression guard asserts the per-row methods are NEVER called and the
 * batched methods are called once each — fails if reverted to the Promise.all
 * map. Also pins the response shape: yield Number conversion, null yield,
 * missing-version → 0 ingredients, and version-with-zero-ingredients → 0.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    recipe: { findMany: vi.fn() },
    recipeVersion: { findMany: vi.fn(), findFirst: vi.fn() },
    recipeIngredient: { groupBy: vi.fn(), count: vi.fn() },
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/kitchen/nutrition-labels/list/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/kitchen/nutrition-labels/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: "org_test",
      userId: "u1",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("batch-fetches versions + counts (no per-recipe N+1)", async () => {
    vi.mocked(database.recipe.findMany).mockResolvedValue([
      { id: "r1", name: "Alpha", createdAt: new Date("2026-01-01") },
      { id: "r2", name: "Beta", createdAt: new Date("2026-01-02") },
    ] as never);
    vi.mocked(database.recipeVersion.findMany).mockResolvedValue([
      { id: "v1", recipeId: "r1", yieldQuantity: 4 },
      { id: "v2", recipeId: "r2", yieldQuantity: null },
    ] as never);
    // Only v1 has ingredients; v2 has zero → absent from groupBy → defaults to 0.
    vi.mocked(database.recipeIngredient.groupBy).mockResolvedValue([
      { recipeVersionId: "v1", _count: { recipeVersionId: 5 } },
    ] as never);

    const res = await GET(
      new NextRequest("http://x/api/kitchen/nutrition-labels/list")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    // Batched methods called once each.
    expect(database.recipe.findMany).toHaveBeenCalledTimes(1);
    expect(database.recipeVersion.findMany).toHaveBeenCalledTimes(1);
    expect(database.recipeIngredient.groupBy).toHaveBeenCalledTimes(1);
    // Per-row N+1 methods NEVER called (regression guard).
    expect(database.recipeVersion.findFirst).not.toHaveBeenCalled();
    expect(database.recipeIngredient.count).not.toHaveBeenCalled();

    expect(body).toEqual({
      success: true,
      recipes: [
        {
          id: "r1",
          name: "Alpha",
          yield: 4,
          ingredientCount: 5,
          hasNutritionData: true,
          createdAt: expect.any(String),
        },
        {
          id: "r2",
          name: "Beta",
          yield: null,
          ingredientCount: 0,
          hasNutritionData: true,
          createdAt: expect.any(String),
        },
      ],
    });
  });

  it("returns yield=null + ingredientCount=0 for a recipe with no version", async () => {
    vi.mocked(database.recipe.findMany).mockResolvedValue([
      { id: "r3", name: "Gamma", createdAt: new Date("2026-01-03") },
    ] as never);
    vi.mocked(database.recipeVersion.findMany).mockResolvedValue([] as never);
    vi.mocked(database.recipeIngredient.groupBy).mockResolvedValue([] as never);

    const res = await GET(
      new NextRequest("http://x/api/kitchen/nutrition-labels/list")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.recipes).toEqual([
      {
        id: "r3",
        name: "Gamma",
        yield: null,
        ingredientCount: 0,
        hasNutritionData: true,
        createdAt: expect.any(String),
      },
    ]);
    // Versions query runs (returns []), but with no versions there are no
    // versionIds → the groupBy is skipped (no pointless `in: []` round-trip).
    expect(database.recipeVersion.findMany).toHaveBeenCalledTimes(1);
    expect(database.recipeIngredient.groupBy).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);
    const res = await GET(
      new NextRequest("http://x/api/kitchen/nutrition-labels/list")
    );
    expect(res.status).toBe(401);
    expect(database.recipe.findMany).not.toHaveBeenCalled();
  });
});
