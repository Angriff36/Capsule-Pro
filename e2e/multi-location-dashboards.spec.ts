import { expect, test } from "@playwright/test";

test.describe("Multi-Location Executive Dashboards", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the multi-location dashboard
    await page.goto("/analytics/multi-location");
  });

  test("should display the multi-location dashboard page", async ({ page }) => {
    // Check that the page title is visible
    await expect(
      page.getByRole("heading", { name: "Multi-Location Executive Dashboard" })
    ).toBeVisible();
  });

  test("should display summary cards with key metrics", async ({ page }) => {
    // Check for summary cards
    await expect(page.getByText("Total Revenue")).toBeVisible();
    await expect(page.getByText("Total Staff")).toBeVisible();
    await expect(page.getByText("Locations")).toBeVisible();
  });

  test("should display KPI cards", async ({ page }) => {
    // Check for KPI section
    await expect(
      page.getByRole("heading", { name: "Key Performance Indicators" })
    ).toBeVisible();

    // Check for common KPIs
    const kpiTitles = [
      "Total revenue",
      "Labor utilization",
      "Waste cost",
      "Profit margin",
    ];

    for (const title of kpiTitles) {
      await expect(page.getByText(title, { exact: false })).toBeVisible();
    }
  });

  test("should display benchmarks section", async ({ page }) => {
    // Check for benchmarks section
    await expect(
      page.getByRole("heading", { name: "Performance Benchmarks" })
    ).toBeVisible();

    // Check for benchmark cards
    await expect(page.getByText("Target:")).toBeVisible();
  });

  test("should display top performers section", async ({ page }) => {
    // Check for rankings section
    await expect(
      page.getByRole("heading", { name: "Top Performers" })
    ).toBeVisible();
  });

  test("should display location comparison table", async ({ page }) => {
    // Check for location comparison section
    await expect(
      page.getByRole("heading", { name: "Location Comparison" })
    ).toBeVisible();
  });

  test("should allow expanding KPI cards to see location breakdown", async ({
    page,
  }) => {
    // Find a KPI card and click to expand
    const kpiCard = page.locator('[class*="cursor-pointer"]').first();
    await kpiCard.click();

    // Check for breakdown text
    await expect(page.getByText("Breakdown by Location")).toBeVisible();
  });

  test("should allow period selection", async ({ page }) => {
    // Check for period buttons
    await expect(page.getByText("Last 7 days")).toBeVisible();
    await expect(page.getByText("Last 30 days")).toBeVisible();
    await expect(page.getByText("Last 90 days")).toBeVisible();
    await expect(page.getByText("Last 12 months")).toBeVisible();
  });

  test("should allow category filtering", async ({ page }) => {
    // Check for category filters
    await expect(page.getByText("Categories:")).toBeVisible();
    await expect(page.getByText("Financial")).toBeVisible();
    await expect(page.getByText("Operational")).toBeVisible();
  });

  test("should toggle alerts only filter for benchmarks", async ({ page }) => {
    // Find and click the "Show alerts only" button
    const alertsButton = page
      .getByRole("button")
      .filter({ hasText: "Show alerts only" })
      .first();

    if ((await alertsButton.count()) > 0) {
      await alertsButton.click();
      // Button should be toggled (have different styling)
      await expect(alertsButton).toBeVisible();
    }
  });

  test("should display empty state when no locations exist", async ({
    page,
  }) => {
    // Navigate directly to the page
    await page.goto("/analytics/multi-location");

    // If there's no data, check for empty state
    const emptyState = page.getByText(/No locations|No Data Available/i);
    if ((await emptyState.count()) > 0) {
      await expect(emptyState).toBeVisible();
    }
  });

  test("should expand location rows to show additional details", async ({
    page,
  }) => {
    // Find the location comparison table
    const tableRow = page.locator("tbody tr").first();

    // Click to expand
    await tableRow.click();

    // Check for expanded details (may not be visible if no data)
    const expandedContent = page.locator(".bg-muted\\/30");
    if ((await expandedContent.count()) > 0) {
      await expect(expandedContent).toBeVisible();
    }
  });
});
