/**
 * POST /api/kitchen/nutrition-labels/generate — over-fetch regression guard
 * (item #20).
 *
 * The route fetches the latest recipe version to read only `id` (the ingredient
 * lookup key) + `yieldQuantity` (per-serving scaling). It previously fetched
 * the full row including the heavy `instructions` @db.Text blob. The fix adds a
 * focused `select`. The guard asserts the select carries only id+yieldQuantity
 * (never `instructions`) and the response shape is unchanged.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));
vi.mock("@repo/database", () => ({
  database: {
    recipe: { findFirst: vi.fn() },
    recipeVersion: { findFirst: vi.fn() },
    recipeIngredient: { findMany: vi.fn() },
    ingredient: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { POST } from "../../app/api/kitchen/nutrition-labels/generate/route";

const tenantId = "tenant-1";

describe("POST /api/kitchen/nutrition-labels/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(tenantId);
    vi.mocked(database.recipe.findFirst).mockResolvedValue({
      id: "r1",
      name: "Pancakes",
    } as never);
    vi.mocked(database.recipeVersion.findFirst).mockResolvedValue({
      id: "v1",
      yieldQuantity: 4,
    } as never);
    vi.mocked(database.recipeIngredient.findMany).mockResolvedValue([
      { ingredientId: "i1", quantity: 100 },
      { ingredientId: "i2", quantity: 50 },
    ] as never);
    vi.mocked(database.ingredient.findMany).mockResolvedValue([
      { id: "i1", name: "flour" },
      { id: "i2", name: "egg" },
    ] as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("selects only id+yieldQuantity on the version read (drops instructions blob)", async () => {
    const res = await POST(
      new NextRequest("http://x/api/kitchen/nutrition-labels/generate", {
        method: "POST",
        body: JSON.stringify({ recipeId: "r1", servings: 2 }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(database.recipeVersion.findFirst).toHaveBeenCalledTimes(1);
    expect(database.recipeVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipeId: "r1", tenantId },
        orderBy: { versionNumber: "desc" },
        select: { id: true, yieldQuantity: true },
      })
    );
    // The heavy `instructions` @db.Text column must NOT be selected.
    const select = (
      vi.mocked(database.recipeVersion.findFirst).mock.calls[0]?.[0] as {
        select?: Record<string, unknown>;
      }
    ).select;
    expect(Object.keys(select ?? {}).sort()).toEqual(
      ["id", "yieldQuantity"].sort()
    );

    // Response shape unchanged.
    expect(body.success).toBe(true);
    expect(body.nutritionLabel).toMatchObject({
      recipeId: "r1",
      recipeName: "Pancakes",
      servingsPerRecipe: 2,
    });
    expect(body.nutritionLabel.nutrition).toBeDefined();
  });

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

    const res = await POST(
      new NextRequest("http://x/api/kitchen/nutrition-labels/generate", {
        method: "POST",
        body: JSON.stringify({ recipeId: "r1" }),
      })
    );

    expect(res.status).toBe(401);
    expect(database.recipe.findFirst).not.toHaveBeenCalled();
    expect(database.recipeVersion.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the recipe does not exist", async () => {
    vi.mocked(database.recipe.findFirst).mockResolvedValue(null as never);

    const res = await POST(
      new NextRequest("http://x/api/kitchen/nutrition-labels/generate", {
        method: "POST",
        body: JSON.stringify({ recipeId: "missing" }),
      })
    );

    expect(res.status).toBe(404);
  });
});
