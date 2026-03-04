import { expect, test } from "@playwright/test";

test.describe("Multi-Channel Marketing Automation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to marketing page
    await page.goto("/marketing");
  });

  test("marketing page loads and displays overview", async ({ page }) => {
    // Check that the marketing page is accessible
    await expect(page.locator("h1")).toContainText("Marketing");

    // Verify the page description
    await expect(page.locator("text=Manage multi-channel campaigns")).toBeVisible();
  });

  test("marketing page displays navigation buttons", async ({ page }) => {
    // Check for navigation buttons
    await expect(page.locator('a[href="/marketing/channels"]')).toBeVisible();
    await expect(page.locator('a[href="/marketing/automation"]')).toBeVisible();
    await expect(page.locator('a[href="/marketing/analytics"]')).toBeVisible();
  });

  test("marketing page displays overview statistics cards", async ({ page }) => {
    // Check for stats cards - they should be present even with zero values
    await expect(page.locator('text=Total Campaigns')).toBeVisible();
    await expect(page.locator('text=Active Channels')).toBeVisible();
    await expect(page.locator('text=Automation Rules')).toBeVisible();
    await expect(page.locator('text=Draft Campaigns')).toBeVisible();
  });

  test("marketing page displays campaigns section", async ({ page }) => {
    // Check for campaigns section
    await expect(page.locator('text=Recent Campaigns')).toBeVisible();
  });

  test("marketing page displays channels section", async ({ page }) => {
    // Check for channels section
    await expect(page.locator('text=Active Channels')).toBeVisible();
  });

  test("new campaign button is visible", async ({ page }) => {
    // Check for the new campaign button in the header
    const newCampaignButton = page.locator('a:has-text("New Campaign")');
    await expect(newCampaignButton.first()).toBeVisible();
  });

  test("campaigns page is accessible", async ({ page }) => {
    // Navigate to campaigns page
    await page.goto("/marketing/campaigns");

    // Check that the campaigns page is accessible
    await expect(page.locator("h1")).toContainText("Campaigns");

    // Verify the page description
    await expect(page.locator("text=Manage your multi-channel marketing campaigns")).toBeVisible();
  });

  test("campaigns page has search and filter functionality", async ({ page }) => {
    await page.goto("/marketing/campaigns");

    // Check for search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Check for filter buttons
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Active")')).toBeVisible();
    await expect(page.locator('button:has-text("Draft")')).toBeVisible();
  });
});

test.describe("Marketing API Endpoints", () => {
  test("GET /api/marketing/campaigns returns proper response structure", async ({
    request,
  }) => {
    const response = await request.get("/api/marketing/campaigns");

    // Should return 200 or 401 (if not authenticated)
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("campaigns");
      expect(body).toHaveProperty("pagination");
      expect(body.pagination).toHaveProperty("page");
      expect(body.pagination).toHaveProperty("limit");
      expect(body.pagination).toHaveProperty("total");
    }
  });

  test("GET /api/marketing/channels returns proper response structure", async ({
    request,
  }) => {
    const response = await request.get("/api/marketing/channels");

    // Should return 200 or 401 (if not authenticated)
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("channels");
      expect(body).toHaveProperty("pagination");
    }
  });

  test("GET /api/marketing/automation-rules returns proper response structure", async ({
    request,
  }) => {
    const response = await request.get("/api/marketing/automation-rules");

    // Should return 200 or 401 (if not authenticated)
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("rules");
      expect(body).toHaveProperty("pagination");
    }
  });

  test("GET /api/marketing/contact-lists returns proper response structure", async ({
    request,
  }) => {
    const response = await request.get("/api/marketing/contact-lists");

    // Should return 200 or 401 (if not authenticated)
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("contactLists");
      expect(body).toHaveProperty("pagination");
    }
  });
});
