/**
 * @vitest-environment node
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../../app/api/kitchen/recipes/[recipeId]/ingredients/route";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn().mockResolvedValue({ orgId: "org-1" }),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn().mockResolvedValue("tenant-1"),
}));

describe("recipe ingredients API query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped ingredients with preparationNotes and sortOrder", async () => {
    const recipeSpy = vi.spyOn(database.recipe, "findFirst");
    recipeSpy.mockResolvedValueOnce({ id: "recipe-1" } as never);

    const versionSpy = vi.spyOn(database.recipeVersion, "findFirst");
    versionSpy.mockResolvedValueOnce({ id: "version-1" } as never);

    const ingredientsSpy = vi.spyOn(database.recipeIngredient, "findMany");
    ingredientsSpy.mockResolvedValueOnce([
      {
        ingredientId: "ing-1",
        quantity: 2.5,
        unitId: 1,
        preparationNotes: "diced",
        isOptional: false,
        sortOrder: 0,
      },
    ] as never);

    const ingredientLookupSpy = vi.spyOn(database.ingredient, "findMany");
    ingredientLookupSpy.mockResolvedValueOnce([
      { id: "ing-1", name: "Onion" },
    ] as never);

    const unitsSpy = vi.spyOn(database.units, "findMany");
    unitsSpy.mockResolvedValueOnce([{ id: 1, code: "kg" }] as never);

    const response = await GET(new NextRequest("http://localhost"), {
      params: Promise.resolve({ recipeId: "recipe-1" }),
    });

    const body = await response.json();
    expect(body.ingredients).toHaveLength(1);
    expect(body.ingredients[0]).toEqual({
      id: "ing-1",
      name: "Onion",
      quantity: 2.5,
      unitCode: "kg",
      notes: "diced",
      isOptional: false,
      orderIndex: 0,
    });
  });

  it("returns 404 when recipe not found", async () => {
    const recipeSpy = vi.spyOn(database.recipe, "findFirst");
    recipeSpy.mockResolvedValueOnce(null);

    const response = await GET(new NextRequest("http://localhost"), {
      params: Promise.resolve({ recipeId: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns empty ingredients when no version exists", async () => {
    const recipeSpy = vi.spyOn(database.recipe, "findFirst");
    recipeSpy.mockResolvedValueOnce({ id: "recipe-1" } as never);

    const versionSpy = vi.spyOn(database.recipeVersion, "findFirst");
    versionSpy.mockResolvedValueOnce(null);

    const response = await GET(new NextRequest("http://localhost"), {
      params: Promise.resolve({ recipeId: "recipe-1" }),
    });

    const body = await response.json();
    expect(body.ingredients).toEqual([]);
  });
});
