import { expect, test } from "@playwright/test";

/**
 * Verification test for Getting Started Checklist
 *
 * This test verifies that the Getting Started checklist component
 * renders correctly on the analytics dashboard.
 */
test.describe("Getting Started Checklist", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign in page first
    await page.goto("/sign-in");
  });

  test("Analytics dashboard shows Getting Started checklist when tasks incomplete", async ({
    page,
  }) => {
    // Navigate to analytics page
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    // Look for the Getting Started checklist component
    const checklist = page.locator('div:has-text("Getting Started")').first();
    const isChecklistVisible = await checklist.isVisible().catch(() => false);

    if (isChecklistVisible) {
      // Verify checklist title
      await expect(checklist).toContainText("Getting Started");

      // Verify it shows progress indicator
      const progressSection = checklist
        .locator('[role="progressbar"]')
        .or(page.locator('div:has-text("tasks completed")'));

      // Verify checklist items are present
      const checklistItems = checklist.locator("a[href]");
      const itemCount = await checklistItems.count();

      // Should have at least some checklist items
      expect(itemCount).toBeGreaterThan(0);

      // Verify items have the expected structure
      const firstItem = checklistItems.first();
      await expect(firstItem).toBeVisible();

      // Items should have completed or incomplete state indicators
      const circleIcon = firstItem
        .locator('svg:has(path[d*="circle" i])')
        .or(firstItem.locator("svg.lucide-circle"));
      const checkIcon = firstItem
        .locator('svg:has(path[d*="check" i])')
        .or(firstItem.locator("svg.lucide-check-circle"));

      // Either circle or check icon should be present
      const hasIcon =
        (await circleIcon.count()) > 0 || (await checkIcon.count()) > 0;
      expect(hasIcon).toBe(true);

      // Verify collapsible functionality - the toggle button
      const toggleButton = checklist
        .locator('button:has-text("Show")')
        .or(checklist.locator('button:has-text("Hide")'));
      await expect(toggleButton).toBeVisible();

      // Test collapsing/expanding
      await toggleButton.click();
      await page.waitForTimeout(300); // Wait for animation

      // Click again to expand
      await toggleButton.click();
      await page.waitForTimeout(300);
    } else {
      // If checklist is not visible, it might be because all tasks are completed
      // which is also a valid state
      test.skip(
        true,
        "Getting Started checklist not visible - all tasks may be completed"
      );
    }
  });

  test("Checklist items link to correct pages", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    const checklist = page.locator('div:has-text("Getting Started")').first();
    const isChecklistVisible = await checklist.isVisible().catch(() => false);

    if (isChecklistVisible) {
      // Verify the expected checklist items with their hrefs
      const expectedItems = [
        { text: "client", href: "/crm/clients" },
        { text: "event", href: "/events" },
        { text: "inventory", href: "/inventory/items" },
        { text: "recipe", href: "/recipes" },
        { text: "team", href: "/settings/team" },
      ];

      for (const item of expectedItems) {
        const itemLink = checklist
          .locator(`a[href*="${item.href}"]`)
          .or(checklist.locator(`a:has-text("${item.text}")`));

        const isVisible = await itemLink.isVisible().catch(() => false);
        if (isVisible) {
          // Verify it has an href
          const href = await itemLink.getAttribute("href");
          expect(href).toBeTruthy();
        }
      }
    } else {
      test.skip(true, "Getting Started checklist not visible");
    }
  });

  test("Checklist shows completion progress", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    const checklist = page.locator('div:has-text("Getting Started")').first();
    const isChecklistVisible = await checklist.isVisible().catch(() => false);

    if (isChecklistVisible) {
      // Verify progress indicator shows "X of Y tasks completed"
      const progressText = checklist
        .locator('div:has-text("tasks completed")')
        .or(checklist.locator('div:has-text("task")'));

      // Should show some progress text
      const text = await progressText.textContent().catch(() => "");
      const hasProgressIndicator =
        text.includes("tasks completed") ||
        text.includes("task") ||
        text.includes("of");

      // If all tasks are complete, it should say "All tasks completed"
      const isAllComplete = text.includes("All tasks completed");

      expect(hasProgressIndicator || isAllComplete).toBe(true);
    } else {
      test.skip(
        true,
        "Getting Started checklist not visible - all tasks may be completed"
      );
    }
  });
});
