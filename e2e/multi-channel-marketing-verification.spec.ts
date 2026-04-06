import { expect, test } from "@playwright/test";

test.describe("Multi-Channel Marketing Automation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to marketing page
    await page.goto("/marketing");
  });

  test("marketing page loads and displays coming soon message", async ({
    page,
  }) => {
    // Check that the marketing page is accessible
    await expect(page.locator("h1")).toContainText("Marketing");

    // Verify the page shows coming soon message
    await expect(page.locator("text=Marketing — Coming Soon")).toBeVisible();

    // Verify the description mentions campaigns, channels, and automation
    await expect(
      page.locator(
        "text=Marketing features including campaigns, channels, and automation"
      )
    ).toBeVisible();
  });

  test("marketing page displays feature preview cards", async ({ page }) => {
    // Check for feature preview cards
    await expect(page.locator("text=Campaigns")).toBeVisible();
    await expect(page.locator("text=Channels")).toBeVisible();
    await expect(page.locator("text=Automation")).toBeVisible();
  });

  test("campaigns page is accessible", async ({ page }) => {
    // Navigate to campaigns page
    await page.goto("/marketing/campaigns");

    // Check that the campaigns page is accessible
    await expect(page.locator("h1")).toContainText("Campaigns");

    // Verify the page shows coming soon message
    await expect(page.locator("text=Campaigns — Coming Soon")).toBeVisible();

    // Verify the page description
    await expect(
      page.locator(
        "text=Campaign management features are currently in development"
      )
    ).toBeVisible();
  });
});
