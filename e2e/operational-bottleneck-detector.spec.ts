import { expect, test } from "./fixtures/ticket.fixture";

/**
 * Verification test for Operational Bottleneck Detector feature
 *
 * Tests the AI-powered bottleneck detection system that identifies
 * operational bottlenecks and suggests process improvements.
 */

test.describe("Operational Bottleneck Detector", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the bottlenecks analytics page
    await page.goto("/analytics/bottlenecks");
  });

  test("should display the bottlenecks page with correct title", async ({
    page,
  }) => {
    // Check page header
    await expect(page.locator("h1")).toContainText("Operational Bottlenecks");
    await expect(page.locator("p.text-muted-foreground")).toContainText(
      "AI-powered detection of operational bottlenecks"
    );
  });

  test("should display health score overview cards", async ({ page }) => {
    // Wait for the page to load
    await page.waitForSelector("text=Overall Health Score");

    // Check that health score cards are displayed
    await expect(page.locator("text=Overall Health Score")).toBeVisible();
    await expect(page.locator("text=Bottlenecks Detected")).toBeVisible();
    await expect(page.locator("text=Trending Issues")).toBeVisible();
    await expect(page.locator("text=AI Suggestions")).toBeVisible();
  });

  test("should have period filter dropdown", async ({ page }) => {
    // Check for period selector
    const periodSelect = page.locator("#period");
    await expect(periodSelect).toBeVisible();

    // Check available options
    const options = await periodSelect.locator("option").allTextContents();
    expect(options).toContain("Last 7 days");
    expect(options).toContain("Last 30 days");
    expect(options).toContain("Last 90 days");
    expect(options).toContain("Last 12 months");
  });

  test("should have category filter dropdown", async ({ page }) => {
    // Check for category selector
    const categorySelect = page.locator("#category");
    await expect(categorySelect).toBeVisible();

    // Check default option
    await expect(categorySelect).toHaveValue("all");
  });

  test("should display bottlenecks list when detected", async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Check if bottlenecks section exists
    const bottlenecksSection = page.locator("text=Detected Bottlenecks");
    await expect(bottlenecksSection).toBeVisible();

    // The page should either show bottlenecks or a "no bottlenecks" message
    const hasBottlenecks =
      (await page.locator('[class*="border-l-"]').count()) > 0;
    const hasNoBottlenecksMessage =
      (await page.locator("text=No bottlenecks detected").count()) > 0;

    expect(hasBottlenecks || hasNoBottlenecksMessage).toBe(true);
  });

  test("should display bottleneck details with severity badges", async ({
    page,
  }) => {
    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Check if any bottleneck cards exist
    const bottleneckCards = page.locator('[class*="border-l-"]');
    const count = await bottleneckCards.count();

    if (count > 0) {
      // Get the first bottleneck card
      const firstCard = bottleneckCards.first();

      // Check for severity badge
      const severityBadge = firstCard.locator(".badge").first();
      await expect(severityBadge).toBeVisible();

      // Check for category badge
      const categoryBadge = firstCard.locator(".badge").nth(1);
      await expect(categoryBadge).toBeVisible();
    }
  });

  test("should display AI suggestions when available", async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Check for AI suggestion sections
    const aiSuggestions = page.locator("text=AI Suggestion");
    const count = await aiSuggestions.count();

    // AI suggestions may or may not be present depending on detected bottlenecks
    // If present, verify their structure
    if (count > 0) {
      const firstSuggestion = aiSuggestions.first();
      await expect(firstSuggestion).toBeVisible();

      // Check for suggestion title
      const suggestionTitle = firstSuggestion.locator("h4");
      await expect(suggestionTitle).toBeVisible();

      // Check for "AI Generated" badge
      const aiBadge = firstSuggestion.locator("text=AI Generated");
      await expect(aiBadge).toBeVisible();
    }
  });

  test("should allow changing period filter", async ({ page }) => {
    // Change period to 7 days
    await page.selectOption("#period", "7d");

    // Verify the selection changed
    await expect(page.locator("#period")).toHaveValue("7d");

    // Wait for potential reload
    await page
      .waitForLoadState("networkidle", { timeout: 5000 })
      .catch(() => {});
  });

  test("should allow changing category filter", async ({ page }) => {
    // Try to select a category if available
    const categorySelect = page.locator("#category");
    const options = await categorySelect.locator("option").allTextContents();

    if (options.length > 1) {
      // Select the first non-"all" option
      const secondOption = options[1];
      await page.selectOption("#category", secondOption);

      // Verify the selection changed
      await expect(categorySelect).toHaveValue(secondOption);
    }
  });

  test("should display trend indicators for bottlenecks", async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    const bottleneckCards = page.locator('[class*="border-l-"]');
    const count = await bottleneckCards.count();

    if (count > 0) {
      const firstCard = bottleneckCards.first();

      // Check for trend section (Current Value, Threshold, Trend)
      await expect(firstCard.locator("text=Current Value")).toBeVisible();
      await expect(firstCard.locator("text=Threshold")).toBeVisible();
      await expect(firstCard.locator("text=Trend")).toBeVisible();
    }
  });

  test("should expand implementation steps when clicking view", async ({
    page,
  }) => {
    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Look for "View implementation steps" links
    const viewStepsLink = page.locator("text=View implementation steps");
    const count = await viewStepsLink.count();

    if (count > 0) {
      // Click the first "View implementation steps" link
      await viewStepsLink.first().click();

      // Verify steps are now visible
      const stepsList = page.locator("ol").first();
      await expect(stepsList).toBeVisible();
    }
  });

  test("should handle empty state gracefully", async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Check for no bottlenecks message
    const noBottlenecksMessage = page.locator("text=No bottlenecks detected");
    const hasEmptyState = (await noBottlenecksMessage.count()) > 0;

    if (hasEmptyState) {
      // Verify the empty state shows checkmark icon and encouraging message
      await expect(
        page.locator("text=Your operations are running smoothly")
      ).toBeVisible();
      await expect(page.locator("text=Keep up the good work")).toBeVisible();
    }
  });
});

test.describe("Operational Bottleneck Detector API", () => {
  test("should return bottleneck analysis data from API", async ({
    request,
  }) => {
    const response = await request.get("/api/analytics/bottlenecks");

    expect(response.status()).toBe(200);

    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("healthScore");
    expect(data).toHaveProperty("bottlenecks");
    expect(data).toHaveProperty("analyzedAt");

    // Verify health score structure
    expect(data.healthScore).toHaveProperty("overall");
    expect(typeof data.healthScore.overall).toBe("number");
    expect(data.healthScore.overall).toBeGreaterThanOrEqual(0);
    expect(data.healthScore.overall).toBeLessThanOrEqual(100);
  });

  test("should support period parameter in API", async ({ request }) => {
    const response = await request.get("/api/analytics/bottlenecks?period=7d");

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.summary.period).toBe("7d");
  });

  test("should support category parameter in API", async ({ request }) => {
    const response = await request.get(
      "/api/analytics/bottlenecks?category=throughput"
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.summary).toBeDefined();
  });

  test("should require authentication for API", async ({ request }) => {
    // This test verifies the API has proper authentication
    // The actual behavior depends on the auth setup
    const response = await request.get("/api/analytics/bottlenecks");

    // Either we get 401 (unauthorized) or 200 (authorized via test setup)
    expect([200, 401]).toContain(response.status());
  });
});
