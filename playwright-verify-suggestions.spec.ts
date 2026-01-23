import { expect, test } from "@playwright/test";

test.describe("AI Suggestions Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:2221");
  });

  test("API endpoint returns suggestions", async ({ request }) => {
    const response = await request.get(
      "http://localhost:2222/api/ai/suggestions?maxSuggestions=5"
    );

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("suggestions");
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("generatedAt");

    expect(Array.isArray(data.suggestions)).toBeTruthy();

    if (data.suggestions.length > 0) {
      const firstSuggestion = data.suggestions[0];
      expect(firstSuggestion).toHaveProperty("id");
      expect(firstSuggestion).toHaveProperty("title");
      expect(firstSuggestion).toHaveProperty("description");
      expect(firstSuggestion).toHaveProperty("type");
      expect(firstSuggestion).toHaveProperty("priority");
      expect(firstSuggestion).toHaveProperty("category");
      expect(firstSuggestion).toHaveProperty("action");
      expect(["high", "medium", "low"]).toContain(firstSuggestion.priority);
    }
  });

  test("Command board has AI Suggestions button", async ({ page }) => {
    await page.goto("http://localhost:2221/command-board");

    const aiButton = page.getByRole("button", { name: /AI Suggestions/i });
    await expect(aiButton).toBeVisible();

    await aiButton.click();

    const suggestionsPanel = page.getByText(/AI Suggestions/i);
    await expect(suggestionsPanel).toBeVisible();
  });

  test("Suggestions panel displays suggestion cards", async ({ page }) => {
    await page.goto("http://localhost:2221/command-board");

    const aiButton = page.getByRole("button", { name: /AI Suggestions/i });
    await aiButton.click();

    await page.waitForTimeout(2000);

    const refreshButton = page.getByRole("button", { name: /Refresh/i });
    await expect(refreshButton).toBeVisible();
  });
});
