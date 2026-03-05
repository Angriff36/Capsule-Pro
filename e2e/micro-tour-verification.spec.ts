import { expect, test } from "@playwright/test";

/**
 * MicroTour Component Isolation Test
 *
 * This test verifies the MicroTour component in isolation
 * without requiring the full application to load.
 */

test.describe("MicroTour Component", () => {
  test("should render and function correctly", async ({ page }) => {
    // Create a test page with the MicroTour component
    await page.goto("/design-system/micro-tour");

    // Wait for component to render
    await page.waitForLoadState("networkidle");

    // Check tour is visible
    const tour = page.locator('[data-testid="micro-tour"]');
    await expect(tour).toBeVisible();

    // Check step content
    await expect(page.locator("h4")).toContain("Welcome");
    await expect(page.locator("p")).toContain(
      "This is a lightweight micro-tour"
    );
  });

  test("should navigate between steps", async ({ page }) => {
    await page.goto("/design-system/micro-tour");
    await page.waitForLoadState("networkidle");

    // Click Next button
    await page.click('button:has-text="Next"]');

    // Check we're on step 2
    await expect(page.locator("h4")).toContain("Non-Blocking");
  });

  test("should dismiss with close button", async ({ page }) => {
    await page.goto("/design-system/micro-tour");
    await page.waitForLoadState("networkidle");

    // Click close button
    await page.click('button[aria-label="Close tour"]');

    // Tour should be hidden
    await expect(page.locator('[data-testid="micro-tour"]')).not.toBeVisible();
  });

  test('should persist "Don\'t show again" preference', async ({
    page,
    context,
  }) => {
    await page.goto("/design-system/micro-tour");
    await page.waitForLoadState("networkidle");

    // Click "Don't show again"
    await page.click('button:has-text="Don\'t show again"]');

    // Check localStorage
    const dismissed = await page.evaluate(() => {
      return localStorage.getItem("capsule-micro-tour:test-tour:dismissed");
    });
    expect(dismissed).toBe("true");
  });
});
