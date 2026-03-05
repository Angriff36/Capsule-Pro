import { expect, test } from "@playwright/test";

test.describe("Quality Assurance Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the quality dashboard
    await page.goto("/quality");
  });

  test("should display the dashboard with header and controls", async ({
    page,
  }) => {
    // Check for main heading
    await expect(
      page.getByRole("heading", { name: /Quality Assurance Dashboard/i })
    ).toBeVisible();

    // Check for description
    await expect(
      page.getByText(/Real-time quality metrics tracking/i)
    ).toBeVisible();
  });

  test("should display performance overview cards", async ({ page }) => {
    // Check for performance overview section
    await expect(
      page.getByRole("heading", { name: /Performance Overview/i })
    ).toBeVisible();

    // Check for key metric cards
    await expect(page.getByText(/Overall Pass Rate/i)).toBeVisible();
    await expect(page.getByText(/Total Inspections/i)).toBeVisible();
    await expect(page.getByText(/Open Actions/i)).toBeVisible();
    await expect(page.getByText(/Target Status/i)).toBeVisible();
  });

  test("should allow period selection", async ({ page }) => {
    // Find the period selector
    const selector = page.locator("select").first();

    // Verify default selection (30 days)
    await expect(selector).toHaveValue("30");

    // Change selection to 7 days
    await selector.selectOption("7");
    await expect(selector).toHaveValue("7");
  });

  test("should display charts section", async ({ page }) => {
    // Check for Pass Rate Trend chart
    await expect(
      page.getByRole("heading", { name: /Pass Rate Trend/i })
    ).toBeVisible();

    // Check for Open Actions by Severity chart
    await expect(
      page.getByRole("heading", { name: /Open Actions by Severity/i })
    ).toBeVisible();
  });

  test("should display category breakdown section", async ({ page }) => {
    // Check for category details section
    await expect(
      page.getByRole("heading", { name: /Category Details/i })
    ).toBeVisible();

    // Check for table headers
    await expect(
      page.getByRole("columnheader", { name: /Category/i })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /Inspections/i })
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /Pass Rate/i })
    ).toBeVisible();
  });

  test("should display corrective actions severity section", async ({
    page,
  }) => {
    // Check for corrective actions section
    await expect(
      page.getByRole("heading", { name: /Corrective Actions by Severity/i })
    ).toBeVisible();

    // Check for table
    const table = page.locator("table").filter({
      has: page.getByRole("columnheader", { name: /Severity/i }),
    });
    await expect(table).toBeVisible();
  });

  test("should display performance benchmarks section", async ({ page }) => {
    // Check for performance benchmarks card
    await expect(
      page.getByRole("heading", { name: /Performance Benchmarks/i })
    ).toBeVisible();

    // Check for key metrics
    await expect(page.getByText(/Completion Rate/i)).toBeVisible();
    await expect(page.getByText(/Avg Inspection Time/i)).toBeVisible();
    await expect(page.getByText(/Avg Response Time/i)).toBeVisible();
  });
});

test.describe("Quality Metrics API", () => {
  test("should return metrics data structure", async ({ request }) => {
    const response = await request.get(
      "/api/quality/metrics?period=30&includeTrends=true"
    );

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("summary");
    expect(data.data).toHaveProperty("trends");
    expect(data.data).toHaveProperty("categoryBreakdown");
    expect(data.data).toHaveProperty("severityBreakdown");
    expect(data.data).toHaveProperty("performanceBenchmarks");
    expect(data.data).toHaveProperty("trendData");
    expect(data.data).toHaveProperty("period");
  });

  test("should include all required summary fields", async ({ request }) => {
    const response = await request.get("/api/quality/metrics?period=30");

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const summary = data.data.summary;

    expect(summary).toHaveProperty("totalInspections");
    expect(summary).toHaveProperty("passedInspections");
    expect(summary).toHaveProperty("failedInspections");
    expect(summary).toHaveProperty("overallPassRate");
    expect(summary).toHaveProperty("openCorrectiveActions");
    expect(summary).toHaveProperty("closedCorrectiveActions");
    expect(summary).toHaveProperty("criticalIssues");
  });

  test("should include trend analysis", async ({ request }) => {
    const response = await request.get(
      "/api/quality/metrics?period=30&includeTrends=true"
    );

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const trends = data.data.trends;
    const trendData = data.data.trendData;

    expect(trends).toHaveProperty("totalInspectionsTrend");
    expect(trends).toHaveProperty("passRateTrend");
    expect(Array.isArray(trendData)).toBeTruthy();
  });

  test("should include performance benchmarks", async ({ request }) => {
    const response = await request.get("/api/quality/metrics?period=30");

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    const benchmarks = data.data.performanceBenchmarks;

    expect(benchmarks).toHaveProperty("overallPassRate");
    expect(benchmarks).toHaveProperty("targetPassRate");
    expect(benchmarks).toHaveProperty("onTarget");
    expect(benchmarks).toHaveProperty("avgResponseTime");
    expect(benchmarks).toHaveProperty("avgInspectionTime");
    expect(benchmarks).toHaveProperty("completionRate");
  });
});
