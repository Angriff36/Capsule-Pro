/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eventFindFirst: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@repo/database", async () => {
  const actual = await vi.importActual<typeof import("@repo/database")>(
    "@repo/database"
  );
  return {
    ...actual,
    database: {
      event: { findFirst: mocks.eventFindFirst },
      $queryRaw: mocks.queryRaw,
    },
  };
});

import { generatePrepListCore } from "@/lib/prep-lists/generation";

describe("prep generation with archived recipes", () => {
  beforeEach(() => {
    mocks.eventFindFirst.mockResolvedValue({
      id: "event-1",
      title: "Service",
      eventDate: new Date("2026-09-01T00:00:00Z"),
      guestCount: 50,
    });
    mocks.queryRaw.mockImplementation((sql: { strings: TemplateStringsArray }) => {
      const text = sql.strings.join("");

      if (text.includes("FROM tenant_events.event_dishes")) {
        if (text.includes("r.deleted_at IS NULL")) {
          return Promise.resolve([
            {
              dish_id: "dish-1",
              dish_name: "Committed Dish",
              recipe_id: "recipe-1",
              recipe_name: null,
              recipe_version_id: null,
              yield_quantity: null,
              yield_unit: null,
              prep_time_minutes: 10,
              cook_time_minutes: 20,
              recipe_category: null,
              recipe_tags: [],
              min_prep_lead_days: 1,
              dietary_tags: [],
              course: "main",
              quantity_servings: 10,
            },
          ]);
        }

        return Promise.resolve([
          {
            dish_id: "dish-1",
            dish_name: "Committed Dish",
            recipe_id: "recipe-1",
            recipe_name: "Archived Recipe",
            recipe_version_id: "version-1",
            yield_quantity: 10,
            yield_unit: "portion",
            prep_time_minutes: 10,
            cook_time_minutes: 20,
            recipe_category: "entree",
            recipe_tags: [],
            min_prep_lead_days: 1,
            dietary_tags: [],
            course: "main",
            quantity_servings: 10,
          },
        ]);
      }

      if (text.includes("FROM tenant_kitchen.recipe_ingredients")) {
        return Promise.resolve([
          {
            recipe_version_id: "version-1",
            ingredient_id: "ingredient-1",
            ingredient_name: "Tomato",
            quantity: 2,
            unit_code: "kg",
            category: "produce",
            is_optional: false,
            preparation_notes: null,
            allergens: [],
          },
        ]);
      }

      return Promise.resolve([]);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps recipe versions and ingredients for committed dishes whose recipe was archived", async () => {
    const result = await generatePrepListCore("tenant-1", {
      eventId: "event-1",
    });

    expect(result.unresolvedDishes).toEqual([]);
    expect(result.resolvedDishCount).toBe(1);
    expect(result.totalIngredients).toBeGreaterThan(0);
  });
});
