/**
 * Kitchen Module — Full Workflow Test
 *
 * Covers:
 *  1. Kitchen overview page
 *  2. Recipes list
 *  3. Create recipe (all fields) → verify redirect to detail
 *  4. Recipe appears in list after creation
 *  5. Prep lists page (AI generator — creation requires existing event, marked fixme)
 *  6. Kitchen inventory page
 *  7. Allergens page
 */

import { expect, test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  assertVisible,
  attachErrorCollector,
  BASE_URL,
  goto,
  unique,
} from "../helpers/workflow";

const RECIPE_NAME = unique("RecipeE2E");

test.describe("Kitchen: Full Workflow", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  test("kitchen overview loads", async ({ page }, testInfo) => {
    await goto(page, "/kitchen");
    await assertVisible(page, /kitchen/i);
    await assertNoErrors(page, testInfo, errors, "kitchen overview");
  });

  test("recipes list loads", async ({ page }, testInfo) => {
    await goto(page, "/kitchen/recipes");
    await expect(page).toHaveURL(/kitchen\/recipes/);
    await assertNoErrors(page, testInfo, errors, "recipes list");
  });

  test("create recipe with all fields", async ({ page }, testInfo) => {
    await goto(page, "/kitchen/recipes/new");

    await page.locator('input[name="name"]').fill(RECIPE_NAME);
    await page.locator('input[name="category"]').fill("Main Course");
    await page.locator('textarea[name="description"]').fill("E2E test recipe");
    await page.locator('input[name="prepTimeMinutes"]').fill("30");
    await page.locator('input[name="cookTimeMinutes"]').fill("45");
    await page.locator('input[name="yieldQuantity"]').fill("4");
    await page.locator('select[name="yieldUnit"]').selectOption({ index: 1 });
    await page
      .locator('textarea[name="ingredients"]')
      .fill("Ingredient 1\nIngredient 2");
    await page
      .locator('textarea[name="steps"]')
      .fill("Step 1: Prepare\nStep 2: Cook");

    await page.locator('button[type="submit"]').click();

    // Verify redirect to recipe detail page
    await expect(page).toHaveURL(/kitchen\/recipes\/[a-z0-9-]+/, {
      timeout: 15_000,
    });
    await expect(page.getByText(RECIPE_NAME)).toBeVisible({ timeout: 10_000 });

    await assertNoErrors(page, testInfo, errors, "create recipe");
  });

  test("recipe appears in list after creation", async ({ page }, testInfo) => {
    await goto(page, "/kitchen/recipes");
    // Verify at least one recipe card exists
    await expect(
      page.locator('[data-testid="recipe-card"]').first()
    ).toBeVisible({ timeout: 15_000 });
    // Verify our created recipe is in the list
    await expect(page.getByText(RECIPE_NAME)).toBeVisible({ timeout: 10_000 });
    await assertNoErrors(page, testInfo, errors, "recipe in list");
  });

  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixme signature
  test.fixme(
    "prep lists: AI generator requires existing event — cannot test creation standalone",
    async () => {
      // /kitchen/prep-lists is an AI-driven generator, not a CRUD form.
      // It requires ?eventId= query param and an event with dishes.
      // Implement once a test event with dishes can be reliably seeded.
    }
  );

  test("prep lists page loads", async ({ page }, testInfo) => {
    await goto(page, "/kitchen/prep-lists");
    await expect(page).toHaveURL(/kitchen\/prep-lists/);
    await assertNoErrors(page, testInfo, errors, "prep lists page");
  });

  test("kitchen inventory page loads", async ({ page }, testInfo) => {
    await goto(page, "/kitchen/inventory");
    await expect(page).toHaveURL(/kitchen\/inventory/);
    await assertNoErrors(page, testInfo, errors, "kitchen inventory");
  });

  test("allergens page loads", async ({ page }, testInfo) => {
    await goto(page, "/kitchen/allergens");
    await expect(page).toHaveURL(/kitchen\/allergens/);
    await assertNoErrors(page, testInfo, errors, "allergens");
  });
});
