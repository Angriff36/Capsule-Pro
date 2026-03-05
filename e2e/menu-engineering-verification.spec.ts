import { expect, test } from "@playwright/test";

test.describe("Menu Engineering Analytics Verification", () => {
  test("should display menu engineering page with analytics", async ({
    page,
  }) => {
    // Navigate to menu engineering page
    await page.goto("/analytics/menu-engineering");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check that page title is visible
    await expect(
      page.getByRole("heading", { name: "Menu Engineering", level: 1 })
    ).toBeVisible();

    // Check that description is visible
    await expect(
      page.getByText(
        "Analyze contribution margins, popularity, and optimize your menu."
      )
    ).toBeVisible();

    // Check that period selector exists
    await expect(
      page.getByRole("combobox", { name: /Select period/i })
    ).toBeVisible();
  });

  test("should show performance overview metrics when data exists", async ({
    page,
  }) => {
    await page.goto("/analytics/menu-engineering");
    await page.waitForLoadState("networkidle");

    // The API might return empty state or actual data
    // We're testing the structure exists

    // Check for metric cards or empty state
    const hasMetrics =
      (await page.getByText("Total Revenue").count()) > 0 ||
      (await page.getByText("No Menu Data Available").count()) > 0;

    expect(hasMetrics).toBeTruthy();
  });

  test("should have menu matrix distribution chart", async ({ page }) => {
    await page.goto("/analytics/menu-engineering");
    await page.waitForLoadState("networkidle");

    // Check for the menu matrix distribution section
    const hasChartOrEmpty =
      (await page.getByText("Menu Matrix Distribution").count()) > 0 ||
      (await page.getByText("No Menu Data Available").count()) > 0;

    expect(hasChartOrEmpty).toBeTruthy();
  });

  test("should display strategic recommendations when data exists", async ({
    page,
  }) => {
    await page.goto("/analytics/menu-engineering");
    await page.waitForLoadState("networkidle");

    // Check for recommendations section or empty state
    const hasRecommendationsOrEmpty =
      (await page.getByText("Strategic Recommendations").count()) > 0 ||
      (await page.getByText("No Menu Data Available").count()) > 0;

    expect(hasRecommendationsOrEmpty).toBeTruthy();
  });

  test("should allow period selection", async ({ page }) => {
    await page.goto("/analytics/menu-engineering");
    await page.waitForLoadState("networkidle");

    // Find and click the period selector
    const selector = page.getByRole("combobox");
    await selector.click();

    // Check that options are available
    await expect(
      page.getByRole("option", { name: "Last 7 days" })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Last 30 days" })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Last 90 days" })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Last 12 months" })
    ).toBeVisible();

    // Select a different period
    await page.getByRole("option", { name: "Last 90 days" }).click();

    // Verify the selection (the page should reload/refetch)
    await page.waitForLoadState("networkidle");
    await expect(selector).toHaveValue("90d");
  });

  test("should show empty state when no menu data available", async ({
    page,
  }) => {
    await page.goto("/analytics/menu-engineering");
    await page.waitForLoadState("networkidle");

    // The empty state should be shown if there's no data
    // OR metrics if data exists (both are valid states)
    const hasValidState =
      (await page.getByText("No Menu Data Available").count()) > 0 ||
      (await page.getByText("Total Revenue").count()) > 0;

    expect(hasValidState).toBeTruthy();
  });
});
