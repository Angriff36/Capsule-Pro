Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe("Recipes Page", () => {
  test_1.test.beforeEach(async ({ page }) => {
    await page.goto("/kitchen/recipes");
  });
  (0, test_1.test)(
    "should display recipe cards in responsive grid",
    async ({ page }) => {
      await (0, test_1.expect)(
        page.locator('[data-testid="recipe-card"]')
      ).toBeVisible();
    }
  );
  (0, test_1.test)("should show FAB button to add recipe", async ({ page }) => {
    const fabButton = page.locator('button[aria-label*="Add"]');
    await (0, test_1.expect)(fabButton).toBeVisible();
  });
  (0, test_1.test)(
    "should open modal when FAB is clicked",
    async ({ page }) => {
      const fabButton = page
        .locator("button")
        .filter({ hasText: /add/i })
        .last();
      await fabButton.click();
      await (0, test_1.expect)(page.locator("dialog")).toBeVisible();
      await (0, test_1.expect)(
        page.locator('h2:has-text("Add Recipe")')
      ).toBeVisible();
    }
  );
  (0, test_1.test)("should have form fields in modal", async ({ page }) => {
    const fabButton = page.locator("button").filter({ hasText: /add/i }).last();
    await fabButton.click();
    await (0, test_1.expect)(page.locator('input[name="name"]')).toBeVisible();
    await (0, test_1.expect)(
      page.locator('textarea[name="description"]')
    ).toBeVisible();
    await (0, test_1.expect)(
      page.locator('input[name="prepTime"]')
    ).toBeVisible();
    await (0, test_1.expect)(
      page.locator('input[name="cookTime"]')
    ).toBeVisible();
    await (0, test_1.expect)(
      page.locator('input[name="servings"]')
    ).toBeVisible();
  });
  (0, test_1.test)(
    "should close modal when cancel is clicked",
    async ({ page }) => {
      const fabButton = page
        .locator("button")
        .filter({ hasText: /add/i })
        .last();
      await fabButton.click();
      const cancelButton = page
        .locator("button")
        .filter({ hasText: /cancel/i });
      await cancelButton.click();
      await (0, test_1.expect)(page.locator("dialog")).not.toBeVisible();
    }
  );
});
