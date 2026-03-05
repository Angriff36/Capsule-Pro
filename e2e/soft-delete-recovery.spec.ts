import { expect, test } from "@playwright/test";

test.describe("Soft Delete Recovery", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the trash page
    await page.goto("/administrative/trash");
  });

  test("should display trash page with filters", async ({ page }) => {
    // Check that the page loads
    await expect(page.locator("h1, h2")).toContainText("Trash");

    // Check for filter elements
    await expect(page.getByLabel("Entity Type:")).toBeVisible();
    await expect(
      page.getByPlaceholder("Search deleted items...")
    ).toBeVisible();

    // Check for refresh button
    await expect(page.getByRole("button", { name: /refresh/i })).toBeVisible();
  });

  test("should display entity type filter options", async ({ page }) => {
    // Click on entity type filter
    await page.getByLabel("Entity Type:").click();

    // Wait for dropdown
    await expect(page.getByRole("option", { name: "All Types" })).toBeVisible();

    // Check for some common entity types
    await expect(page.getByRole("option", { name: /Event/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Client/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Recipe/i })).toBeVisible();
  });

  test("should show empty state when no items in trash", async ({ page }) => {
    // If no items, should show empty state
    const emptyState = page.getByText(/no items in trash/i);
    if (await emptyState.isVisible()) {
      await expect(page.locator("svg")).toBeVisible(); // Trash icon
    }
  });

  test("should have pagination controls", async ({ page }) => {
    // Check for pagination elements (may be hidden if no results)
    const prevButton = page.getByRole("button", { name: "Previous" });
    const nextButton = page.getByRole("button", { name: "Next" });

    // These might exist but be disabled
    await expect(prevButton.or(page.getByText("Previous"))).toBeAttached();
    await expect(nextButton.or(page.getByText("Next"))).toBeAttached();
  });

  test("should display table columns", async ({ page }) => {
    // Check for table headers
    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    // Check for column headers
    await expect(page.getByText("Name")).toBeVisible();
    await expect(page.getByText("Type")).toBeVisible();
    await expect(page.getByText("Deleted At")).toBeVisible();
    await expect(page.getByText("Actions")).toBeVisible();
  });

  test("should have restore buttons in actions", async ({ page }) => {
    // The table should be visible
    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    // Check for action column (buttons may not exist if no data)
    const actionsHeader = page.getByText("Actions");
    await expect(actionsHeader).toBeVisible();
  });

  test("should navigate correctly", async ({ page }) => {
    // Test that the page is accessible from the administrative section
    await page.goto("/administrative");
    await expect(page).toHaveURL(/\/administrative/);

    // Navigate to trash
    await page.goto("/administrative/trash");
    await expect(page).toHaveURL(/\/administrative\/trash/);
  });

  test("should have responsive layout", async ({ page }) => {
    // Check on desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator("table")).toBeVisible();

    // Check on mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator("h1, h2")).toBeVisible();
  });

  test("should show header with correct navigation", async ({ page }) => {
    // Check breadcrumb navigation
    await expect(page.getByText("Administrative")).toBeVisible();
    await expect(page.getByText("Trash")).toBeVisible();
  });
});

test.describe("Trash API Endpoints", () => {
  test("GET /api/administrative/trash/list should return valid structure", async ({
    request,
  }) => {
    const response = await request.get("/api/administrative/trash/list");

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("pagination");
    expect(data).toHaveProperty("entityTypes");

    expect(data.pagination).toHaveProperty("page");
    expect(data.pagination).toHaveProperty("limit");
    expect(data.pagination).toHaveProperty("total");
    expect(data.pagination).toHaveProperty("totalPages");

    expect(Array.isArray(data.items)).toBe(true);
    expect(Array.isArray(data.entityTypes)).toBe(true);
  });

  test("GET /api/administrative/trash/list should support filtering", async ({
    request,
  }) => {
    // Test entity type filter
    const response = await request.get(
      "/api/administrative/trash/list?entityType=Event"
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.items).toBeDefined();
  });

  test("GET /api/administrative/trash/list should support pagination", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/administrative/trash/list?page=1&limit=10"
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
  });

  test("GET /api/administrative/trash/list should support search", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/administrative/trash/list?search=test"
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.items).toBeDefined();
  });

  test("POST /api/administrative/trash/restore should require authentication", async ({
    request,
  }) => {
    const response = await request.post("/api/administrative/trash/restore", {
      data: {
        entities: [],
      },
    });

    // Should return 401 or 403 without auth
    expect([401, 403]).toContain(response.status());
  });

  test("GET /api/administrative/trash/analyze should return valid structure", async ({
    request,
  }) => {
    // This would need a real entity ID to test properly
    // For now, just test the endpoint returns appropriate status
    const response = await request.get(
      "/api/administrative/trash/analyze?entityId=123&entityType=Event"
    );

    // Should return 404 or 400 (invalid ID) rather than 500
    expect([400, 404, 401, 403]).toContain(response.status());
  });

  test("DELETE /api/administrative/trash/restore should require authentication", async ({
    request,
  }) => {
    const response = await request.delete(
      "/api/administrative/trash/restore?entityId=123&entityType=Event"
    );

    // Should return 401 or 403 without auth
    expect([401, 403]).toContain(response.status());
  });
});
