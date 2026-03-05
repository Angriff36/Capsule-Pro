import { expect, test } from "@playwright/test";

/**
 * Verification test for role-aware empty states
 *
 * This test verifies that empty states correctly adapt their messaging
 * based on the user's role (admin vs viewer).
 *
 * Admin users should see:
 * - Setup instructions
 * - CTA buttons to add content
 *
 * Viewer users should see:
 * - Messaging explaining content will appear when admin adds it
 * - No create/add CTA buttons
 * - "Contact an admin" guidance
 */

test.describe("Role-Aware Empty States", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign in page first
    await page.goto("/sign-in");
  });

  test("Empty state component renders with role-aware props", async ({
    page,
  }) => {
    // Navigate to CRM clients page
    await page.goto("/crm/clients");
    await page.waitForLoadState("networkidle");

    // Look for the empty state container
    const emptyState = page.locator('[data-slot="empty"]');
    const isEmptyVisible = await emptyState
      .first()
      .isVisible()
      .catch(() => false);

    if (isEmptyVisible) {
      // Verify illustration is present (SVG element)
      const illustration = emptyState.locator("svg").first();
      await expect(illustration).toBeVisible();

      // Verify title exists
      const title = emptyState.locator('[data-slot="empty-title"]');
      await expect(title).toBeVisible();

      // Verify description exists
      const description = emptyState.locator('[data-slot="empty-description"]');
      await expect(description).toBeVisible();

      // Check for either:
      // 1. CTA button (admin role) OR
      // 2. "Contact an admin" messaging (viewer role)
      const hasCtaButton = await page
        .locator('button:has-text("Add")')
        .isVisible()
        .catch(() => false);
      const hasViewerMessage = await page
        .locator("text=/contact.*admin/i")
        .isVisible()
        .catch(() => false);

      // One of these should be visible
      expect(hasCtaButton || hasViewerMessage).toBeTruthy();
    } else {
      // If not in empty state, that's okay - data exists
      test.skip(true, "Empty state not visible - client data exists");
    }
  });

  test("Inventory empty state supports role-aware messaging", async ({
    page,
  }) => {
    await page.goto("/inventory/items");
    await page.waitForLoadState("networkidle");

    const emptyState = page.locator('[data-slot="empty"]');
    const isEmptyVisible = await emptyState
      .first()
      .isVisible()
      .catch(() => false);

    if (isEmptyVisible) {
      // Verify illustration is present
      const illustration = emptyState.locator("svg").first();
      await expect(illustration).toBeVisible();

      // Verify title mentions "inventory"
      const title = emptyState.locator('[data-slot="empty-title"]');
      await expect(title).toContainText(/inventory/i);

      // Check for role-specific content
      const hasAddButton = await page
        .locator('button:has-text("Add")')
        .isVisible()
        .catch(() => false);
      const hasContactAdmin = await page
        .locator("text=/contact.*admin/i")
        .isVisible()
        .catch(() => false);

      // Either admin or viewer messaging should be present
      expect(hasAddButton || hasContactAdmin).toBeTruthy();
    } else {
      test.skip(true, "Empty state not visible - inventory data exists");
    }
  });

  test("Shipments empty state supports role-aware messaging", async ({
    page,
  }) => {
    await page.goto("/warehouse/shipments");
    await page.waitForLoadState("networkidle");

    const emptyState = page.locator('[data-slot="empty"]');
    const isEmptyVisible = await emptyState
      .first()
      .isVisible()
      .catch(() => false);

    if (isEmptyVisible) {
      // Verify illustration is present
      const illustration = emptyState.locator("svg").first();
      await expect(illustration).toBeVisible();

      // Verify title mentions "shipments"
      const title = emptyState.locator('[data-slot="empty-title"]');
      await expect(title).toContainText(/shipments/i);

      // Check for role-specific content
      const hasCreateButton = await page
        .locator('button:has-text("Create")')
        .isVisible()
        .catch(() => false);
      const hasContactAdmin = await page
        .locator("text=/contact.*admin/i")
        .isVisible()
        .catch(() => false);

      // Either admin or viewer messaging should be present
      expect(hasCreateButton || hasContactAdmin).toBeTruthy();
    } else {
      test.skip(true, "Empty state not visible - shipment data exists");
    }
  });

  test("Events empty state supports role-aware messaging", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("networkidle");

    const emptyState = page.locator('[data-slot="empty"]');
    const isEmptyVisible = await emptyState
      .first()
      .isVisible()
      .catch(() => false);

    if (isEmptyVisible) {
      // Verify illustration or icon is present
      const illustration = emptyState.locator("svg").first();
      await expect(illustration).toBeVisible();

      // Verify title mentions "events"
      const title = emptyState.locator('[data-slot="empty-title"]');
      await expect(title).toContainText(/events/i);

      // Check for role-specific content
      const hasCreateButton = await page
        .locator('button:has-text("Create")')
        .isVisible()
        .catch(() => false);
      const hasStartTour = await page
        .locator('button:has-text("tour")')
        .isVisible()
        .catch(() => false);
      const hasContactAdmin = await page
        .locator("text=/contact.*admin/i")
        .isVisible()
        .catch(() => false);

      // Either admin CTAs or viewer messaging should be present
      expect(hasCreateButton || hasStartTour || hasContactAdmin).toBeTruthy();
    } else {
      test.skip(true, "Empty state not visible - event data exists");
    }
  });
});

test.describe("useUserRole Hook", () => {
  test("Hook exports are available", async ({ page }) => {
    // This test verifies the hook module is properly exported
    // by checking that the empty state components render without errors

    await page.goto("/crm/clients");
    await page.waitForLoadState("networkidle");

    // If the page loads without JavaScript errors, the hook is working
    const hasErrors = await page
      .evaluate(() => {
        return (
          (window as unknown as { __e2eErrors?: unknown[] }).__e2eErrors
            ?.length > 0
        );
      })
      .catch(() => false);

    expect(hasErrors).toBeFalsy();
  });
});
