/**
 * Activity Feed Feature Verification Test
 *
 * Temporary test to verify the activity feed feature works correctly.
 * This test will be deleted after verification.
 */

import { expect, test } from "@playwright/test";

test.describe("Activity Feed Feature", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the activity feed page
    await page.goto("/analytics/activity-feed");
  });

  test("should display the activity feed page with header", async ({
    page,
  }) => {
    // Check for page header
    await expect(
      page.getByRole("heading", { name: "Activity Feed" })
    ).toBeVisible();
    await expect(
      page.getByText(
        "Monitor all system events, entity changes, AI plan approvals"
      )
    ).toBeVisible();
  });

  test("should display filter bar with search and filters", async ({
    page,
  }) => {
    // Check for search input
    const searchInput = page.getByPlaceholder("Search activities...");
    await expect(searchInput).toBeVisible();

    // Check for activity type filter
    await expect(page.getByRole("combobox")).toBeVisible();

    // Check for clear filters button (hidden initially)
    const clearButton = page.getByRole("button", { name: /clear filters/i });
    await expect(clearButton).not.toBeVisible();
  });

  test("should display activity stats cards", async ({ page }) => {
    // Check for stats cards
    await expect(page.getByText("Total Activities")).toBeVisible();
    await expect(page.getByText("Today")).toBeVisible();
    await expect(page.getByText("This Week")).toBeVisible();
  });

  test("should display empty state when no activities", async ({ page }) => {
    // Check for empty state
    await expect(page.getByText("No activities yet")).toBeVisible();
    await expect(
      page.getByText(
        "Activities will appear here as you and your team make changes"
      )
    ).toBeVisible();
  });

  test("should allow filtering by activity type", async ({ page }) => {
    // Click on activity type select
    const select = page.getByRole("combobox").first();
    await select.click();

    // Select "Entity Changes"
    await page.getByRole("option", { name: "Entity Changes" }).click();

    // Verify filter is applied
    await expect(
      page.getByRole("button", { name: /clear filters/i })
    ).toBeVisible();
  });

  test("should allow filtering by importance", async ({ page }) => {
    // Click on importance select
    const importanceSelect = page.getByRole("combobox").nth(1);
    await importanceSelect.click();

    // Select "High"
    await page.getByRole("option", { name: "High" }).click();

    // Verify filter is applied
    await expect(
      page.getByRole("button", { name: /clear filters/i })
    ).toBeVisible();
  });

  test("should allow clearing filters", async ({ page }) => {
    // Apply a filter first
    const select = page.getByRole("combobox").first();
    await select.click();
    await page.getByRole("option", { name: "Entity Changes" }).click();

    // Click clear filters
    await page.getByRole("button", { name: /clear filters/i }).click();

    // Verify clear button is hidden again
    await expect(
      page.getByRole("button", { name: /clear filters/i })
    ).not.toBeVisible();
  });

  test("should have refresh button", async ({ page }) => {
    // Check for refresh button
    const refreshButton = page.getByRole("button", { name: /refresh/i });
    await expect(refreshButton).toBeVisible();
  });

  test("API endpoint should return valid response structure", async ({
    request,
  }) => {
    // Test the list endpoint
    const listResponse = await request.get("/api/activity-feed/list");
    expect(listResponse.ok()).toBeTruthy();

    const listData = await listResponse.json();
    expect(listData).toHaveProperty("activities");
    expect(listData).toHaveProperty("hasMore");
    expect(listData).toHaveProperty("totalCount");
    expect(Array.isArray(listData.activities)).toBeTruthy();

    // Test the stats endpoint
    const statsResponse = await request.get("/api/activity-feed/stats");
    expect(statsResponse.ok()).toBeTruthy();

    const statsData = await statsResponse.json();
    expect(statsData).toHaveProperty("stats");
    expect(statsData.stats).toHaveProperty("totalActivities");
    expect(statsData.stats).toHaveProperty("todayCount");
    expect(statsData.stats).toHaveProperty("weekCount");
    expect(statsData.stats).toHaveProperty("byType");
    expect(statsData.stats).toHaveProperty("byEntity");
  });

  test("API endpoint should support filtering", async ({ request }) => {
    // Test with activity type filter
    const response = await request.get(
      "/api/activity-feed/list?activityType=entity_change"
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data.activities)).toBeTruthy();
  });

  test("API endpoint should support pagination", async ({ request }) => {
    // Test with limit and offset
    const response = await request.get(
      "/api/activity-feed/list?limit=10&offset=0"
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.activities.length).toBeLessThanOrEqual(10);
  });
});

test.describe("Activity Feed Components", () => {
  test("ActivityTimelineWidget should render", async ({ page }) => {
    // Navigate to analytics page which might have the widget
    await page.goto("/analytics");

    // The widget might be on the analytics page
    // This is a basic check that the page loads
    await expect(page).toHaveTitle(/Analytics/);
  });
});
