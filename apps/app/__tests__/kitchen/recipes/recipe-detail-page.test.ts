/**
 * @vitest-environment node
 */

import { database } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecipeDetailPage from "../../../app/(authenticated)/kitchen/recipes/[recipeId]/page";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn().mockResolvedValue({ orgId: "org-1" }),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("../../../app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn().mockResolvedValue("tenant-1"),
}));

describe("RecipeDetailPage ingredient query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses preparation_notes and sort_order columns", async () => {
    const queryRawSpy = vi.spyOn(database, "$queryRaw");

    const recipeRow = {
      id: "recipe-1",
      name: "Test Recipe",
      description: null,
      category: null,
      tags: null,
      is_active: true,
      yield_quantity: null,
      yield_unit: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      rest_time_minutes: null,
      instructions: null,
      notes: null,
      image_url: null,
    };

    queryRawSpy
      .mockResolvedValueOnce([recipeRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ version_id: "version-1" }])
      .mockResolvedValueOnce([]);

    await RecipeDetailPage({
      params: Promise.resolve({ recipeId: "recipe-1" }),
    });

    const ingredientCall = queryRawSpy.mock.calls.find((call) => {
      const sql = call[0];
      return sql?.strings
        ?.join("")
        .includes("FROM tenant_kitchen.recipe_ingredients");
    });

    expect(ingredientCall).toBeDefined();

    const ingredientSql = ingredientCall?.[0]?.strings?.join("") ?? "";
    expect(ingredientSql).toContain("ri.preparation_notes");
    expect(ingredientSql).toContain("ri.sort_order");
    expect(ingredientSql).not.toContain("ri.notes");
    expect(ingredientSql).not.toContain("ri.order_index");
  });
});
