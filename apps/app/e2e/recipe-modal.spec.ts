import { expect, test } from "@playwright/test";

test.describe("Recipes Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/kitchen/recipes");
  });

  test("should display recipe cards in responsive grid", async ({ page }) => {
    await expect(page.locator('[data-testid="recipe-card"]')).toBeVisible();
  });

  test("should show FAB button to add recipe", async ({ page }) => {
    const fabButton = page.locator('button[aria-label*="Add"]');
    await expect(fabButton).toBeVisible();
  });

  test("should open modal when FAB is clicked", async ({ page }) => {
    const fabButton = page.locator("button").filter({ hasText: /add/i }).last();
    await fabButton.click();
    await expect(page.locator("dialog")).toBeVisible();
    await expect(page.locator('h2:has-text("Add Recipe")')).toBeVisible();
  });

  test("should have form fields in modal", async ({ page }) => {
    const fabButton = page.locator("button").filter({ hasText: /add/i }).last();
    await fabButton.click();

    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('input[name="prepTime"]')).toBeVisible();
    await expect(page.locator('input[name="cookTime"]')).toBeVisible();
    await expect(page.locator('input[name="servings"]')).toBeVisible();
  });

  test("should close modal when cancel is clicked", async ({ page }) => {
    const fabButton = page.locator("button").filter({ hasText: /add/i }).last();
    await fabButton.click();

    const cancelButton = page.locator("button").filter({ hasText: /cancel/i });
    await cancelButton.click();

    await expect(page.locator("dialog")).not.toBeVisible();
  });
});
