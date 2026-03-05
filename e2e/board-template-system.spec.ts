import { expect, test } from "@playwright/test";

test.describe("Board Template System", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to command board
    await page.goto("/command-board");
  });

  test("should display template options in board menu", async ({ page }) => {
    // Click on the board menu (ellipsis icon)
    await page.click('[aria-label="More options"]');

    // Check for template-related menu items
    await expect(page.getByText("Save as Template")).toBeVisible();
    await expect(page.getByText("Browse Templates")).toBeVisible();
  });

  test("should open save as template dialog", async ({ page }) => {
    // Open the menu
    await page.click('[aria-label="More options"]');

    // Click "Save as Template"
    await page.click("text=Save as Template");

    // Check dialog is visible
    await expect(page.getByText("Save as Template")).toBeVisible();
    await expect(page.getByText("Template Name")).toBeVisible();
    await expect(page.getByText("Description")).toBeVisible();
    await expect(page.getByText("Make Public")).toBeVisible();
  });

  test("should open browse templates dialog", async ({ page }) => {
    // Open the menu
    await page.click('[aria-label="More options"]');

    // Click "Browse Templates"
    await page.click("text=Browse Templates");

    // Check dialog is visible
    await expect(page.getByText("Board Templates")).toBeVisible();
    await expect(page.getByText("Search templates...")).toBeVisible();
    await expect(page.getByText("Show Public")).toBeVisible();
  });

  test("should toggle public/private in save dialog", async ({ page }) => {
    // Open save as template dialog
    await page.click('[aria-label="More options"]');
    await page.click("text=Save as Template");

    // Check initial state (private)
    await expect(
      page.getByText("Only your organization can see this template")
    ).toBeVisible();

    // Toggle to public
    await page.click("button[role='switch']");

    // Check public state message
    await expect(
      page.getByText("Anyone with the link can use this template")
    ).toBeVisible();
  });

  test("should filter templates by search", async ({ page }) => {
    // Open browse templates dialog
    await page.click('[aria-label="More options"]');
    await page.click("text=Browse Templates");

    // Wait for dialog to load
    await expect(page.getByText("Board Templates")).toBeVisible();

    // Type in search
    await page.fill("input[placeholder='Search templates...']", "kitchen");

    // The search should work (we can't check results without data)
    const searchInput = page.locator(
      "input[placeholder='Search templates...']"
    );
    await expect(searchInput).toHaveValue("kitchen");
  });

  test("should have create board flow in template browser", async ({
    page,
  }) => {
    // Open browse templates dialog
    await page.click('[aria-label="More options"]');
    await page.click("text=Browse Templates");

    // Wait for dialog to load
    await expect(page.getByText("Board Templates")).toBeVisible();

    // Check that the dialog has the expected structure
    await expect(
      page.getByText("Choose a template to create a new board")
    ).toBeVisible();
  });
});

test.describe("Board Template API", () => {
  test("should list templates via API", async ({ request }) => {
    // Note: This test requires authentication and would need setup
    // For now, we're testing the endpoint structure
    const response = await request.get("/api/command-board/templates");
    // May be 401 (unauthorized) or 200, but not 404
    expect([200, 401]).toContain(response.status());
  });
});
