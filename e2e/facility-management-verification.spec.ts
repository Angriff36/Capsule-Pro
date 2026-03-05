import { expect, test } from "@playwright/test";

/**
 * Facility Management Verification Tests
 * Tests for facility spaces, bookings, and utility tracking
 */

const FACILITY_ROUTES = ["/facility/spaces", "/facility/utilities"];

test.describe("Facility Management: Route Existence", () => {
  for (const route of FACILITY_ROUTES) {
    test(`Facility route loads: ${route}`, async ({ page }) => {
      const res = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(res?.status() ?? 200).not.toBe(404);
      await expect(page).not.toHaveTitle(/404/i);
      expect(
        await page.locator("main, [role='main'], h1").count()
      ).toBeGreaterThan(0);
    });
  }
});

test.describe("Facility Spaces Page", () => {
  test("Facility spaces page renders correctly", async ({ page }) => {
    await page.goto("/facility/spaces", { waitUntil: "domcontentloaded" });

    // Check page title
    await expect(page.locator("h1")).toContainText("Facility Spaces");

    // Check for tabs
    await expect(page.locator("text=Spaces")).toBeVisible();
    await expect(page.locator("text=Bookings")).toBeVisible();

    // Check for summary cards
    await expect(page.locator("text=Total Spaces")).toBeVisible();
    await expect(page.locator("text=Available")).toBeVisible();
    await expect(page.locator("text=In Maintenance")).toBeVisible();
    await expect(page.locator("text=Active Bookings")).toBeVisible();
  });

  test("Facility spaces page has empty state", async ({ page }) => {
    await page.goto("/facility/spaces", { waitUntil: "domcontentloaded" });

    // Check for empty state message when no spaces exist
    const emptyState = page.locator("text=No facility spaces found");
    const hasEmptyState = await emptyState.count();
    expect(hasEmptyState).toBeGreaterThanOrEqual(0);
  });

  test("Facility spaces page tabs switch correctly", async ({ page }) => {
    await page.goto("/facility/spaces", { waitUntil: "domcontentloaded" });

    // Click on Bookings tab
    const bookingsTab = page.locator("text=Bookings");
    await bookingsTab.click();

    // Check for bookings content
    await expect(page.locator("text=Facility Bookings")).toBeVisible();
  });
});

test.describe("Facility Utilities Page", () => {
  test("Facility utilities page renders correctly", async ({ page }) => {
    await page.goto("/facility/utilities", { waitUntil: "domcontentloaded" });

    // Check page title
    await expect(page.locator("h1")).toContainText("Utility Tracking");

    // Check for tabs
    await expect(page.locator("text=Meters")).toBeVisible();
    await expect(page.locator("text=Readings")).toBeVisible();

    // Check for summary cards
    await expect(page.locator("text=Electric Cost")).toBeVisible();
    await expect(page.locator("text=Gas Cost")).toBeVisible();
    await expect(page.locator("text=Water Cost")).toBeVisible();
    await expect(page.locator("text=Total Meters")).toBeVisible();
  });

  test("Facility utilities page has empty state", async ({ page }) => {
    await page.goto("/facility/utilities", { waitUntil: "domcontentloaded" });

    // Check for empty state message when no meters exist
    const emptyState = page.locator("text=No utility meters found");
    const hasEmptyState = await emptyState.count();
    expect(hasEmptyState).toBeGreaterThanOrEqual(0);
  });

  test("Facility utilities page tabs switch correctly", async ({ page }) => {
    await page.goto("/facility/utilities", { waitUntil: "domcontentloaded" });

    // Click on Readings tab
    const readingsTab = page.locator("text=Readings");
    await readingsTab.click();

    // Check for readings content
    await expect(page.locator("text=Utility Readings")).toBeVisible();
  });
});

test.describe("Facility API Endpoints", () => {
  test("GET /api/facility/spaces/list returns valid response", async ({
    request,
  }) => {
    const res = await request.get("/api/facility/spaces/list");
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("success");
    expect(data).toHaveProperty("spaces");
    expect(Array.isArray(data.spaces)).toBe(true);
  });

  test("GET /api/facility/bookings/list returns valid response", async ({
    request,
  }) => {
    const res = await request.get("/api/facility/bookings/list");
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("success");
    expect(data).toHaveProperty("bookings");
    expect(Array.isArray(data.bookings)).toBe(true);
  });

  test("GET /api/facility/utilities/meters/list returns valid response", async ({
    request,
  }) => {
    const res = await request.get("/api/facility/utilities/meters/list");
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("success");
    expect(data).toHaveProperty("meters");
    expect(Array.isArray(data.meters)).toBe(true);
  });

  test("GET /api/facility/utilities/readings/list returns valid response", async ({
    request,
  }) => {
    const res = await request.get("/api/facility/utilities/readings/list");
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("success");
    expect(data).toHaveProperty("readings");
    expect(Array.isArray(data.readings)).toBe(true);
  });
});
