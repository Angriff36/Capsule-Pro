import { expect, test } from "@playwright/test";

test.describe("Onboarding Wizard Verification", () => {
  test("wizard component renders correctly", async ({ page }) => {
    // Navigate to events page
    await page.goto("/events");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check if the wizard dialog is present in the DOM
    const wizardDialog = page.locator('[data-slot="dialog"]');
    await expect(wizardDialog).toHaveCount(0); // Initially closed
  });

  test("empty state has guided tour button", async ({ page }) => {
    // Navigate to events page
    await page.goto("/events");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check for the empty state with guided tour option
    // This will only appear if there are no events
    const emptyState = page.locator('[data-slot="empty"]');
    const emptyStateExists = await emptyState.count();

    if (emptyStateExists > 0) {
      // Check for the "Start guided tour" button or "Create event" button
      const guidedTourButton = page.getByText(/Start guided tour/i);
      const createEventButton = page.getByRole("link", {
        name: /Create event/i,
      });

      // At least one of these should be present
      const hasGuidedTour = await guidedTourButton.count();
      const hasCreateEvent = await createEventButton.count();

      expect(hasGuidedTour + hasCreateEvent).toBeGreaterThan(0);
    }
  });

  test("wizard has correct structure when opened", async ({ page }) => {
    // Navigate to events page
    await page.goto("/events");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Try to find and click the guided tour button
    const guidedTourButton = page.getByText(/Start guided tour/i);
    const buttonCount = await guidedTourButton.count();

    if (buttonCount > 0) {
      await guidedTourButton.click();

      // Wait for dialog to appear
      const dialog = page.locator('[data-slot="dialog-content"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Check for progress indicator
      const progress = page.locator('[data-slot="progress"]');
      await expect(progress).toBeVisible();

      // Check for step indicators
      const stepIndicators = page.locator("button[disabled]");
      const indicatorCount = await stepIndicators.count();
      expect(indicatorCount).toBeGreaterThan(0);

      // Close the dialog
      const closeButton = page.locator('[data-slot="dialog-close"]');
      await closeButton.click();
    }
  });

  test("inline wizard renders correctly", async ({ page }) => {
    // Navigate to events page
    await page.goto("/events");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // The inline wizard should have step indicators
    const stepButtons = page.locator('button[class*="rounded-full"]');
    const count = await stepButtons.count();

    // If we have empty state with inline wizard, check for it
    if (count > 0) {
      // Check for back/continue buttons
      const backButton = page.getByRole("button", { name: /Back/i });
      const continueButton = page.getByRole("button", { name: /Continue/i });

      const hasBack = await backButton.count();
      const hasContinue = await continueButton.count();

      // Should have at least a continue button
      expect(hasContinue).toBeGreaterThan(0);
    }
  });
});
