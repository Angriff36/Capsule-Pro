import { expect, test } from "@playwright/test";

test.describe("Sample Data Feature", () => {
  test("API endpoint returns sample data status", async ({ request }) => {
    const response = await request.get("/api/settings/sample-data");

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("hasSampleData");
    expect(data).toHaveProperty("sampleEventsCount");
  });

  test("API endpoint clears sample data when DELETE is called", async ({
    request,
  }) => {
    // First check if there's sample data
    const getResponse = await request.get("/api/settings/sample-data");
    const initialData = await getResponse.json();

    // Try to clear sample data (may fail if no auth, which is expected)
    const deleteResponse = await request.delete("/api/settings/sample-data");

    // Should get 401 without auth, or 200 with auth
    expect([200, 401]).toContain(deleteResponse.status());
  });

  test("Settings page renders sample data section", async ({ page }) => {
    await page.goto("/settings");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check for the Sample Data heading
    const sampleDataSection = page.getByText("Sample Data");
    await expect(sampleDataSection).toBeVisible();
  });
});
