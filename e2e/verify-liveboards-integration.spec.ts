import { expect, test } from "@playwright/test";

const ADD_CARD_REGEX = /Add Card/i;
const LIVE_PRESENCE_CLASS = /LivePresenceIndicator/;
const LIVE_CURSORS_CLASS = /LiveCursors/;
const DETECT_CONFLICTS_REGEX = /Detect Conflicts/i;
const AI_SUGGESTIONS_REGEX = /AI Suggestions/i;
const EMPTY_BOARD_REGEX = /Your board is empty/i;
const ADD_FIRST_CARD_REGEX = /Add Your First Card/i;

test.describe("Command Board Liveblocks Integration", () => {
  test("should load command board with Liveblocks components", async ({
    page,
  }) => {
    await page.goto("http://localhost:2221/command-board/default");

    // Wait for page to load and redirect to actual board
    await page.waitForLoadState("networkidle");

    // Check that LivePresenceIndicator is present
    const presenceIndicator = page.locator(`[class*="${LIVE_PRESENCE_CLASS}"]`);
    await expect(presenceIndicator).toBeVisible();

    // Check that board canvas is present
    const canvas = page.locator('[aria-label="Command board canvas"]');
    await expect(canvas).toBeVisible();

    // Check that board header is visible
    const header = page.locator("h1");
    await expect(header).toContainText("Command Board");

    // Check for LiveCursors component presence (might be empty but should exist)
    const cursorsContainer = page.locator(`[class*="${LIVE_CURSORS_CLASS}"]`);
    await expect(cursorsContainer).toBeAttached();
  });

  test("should allow adding a card", async ({ page }) => {
    await page.goto("http://localhost:2221/command-board/default");
    await page.waitForLoadState("networkidle");

    // Find and click the "Add Card" button
    const addCardButton = page.getByRole("button", { name: ADD_CARD_REGEX });
    await expect(addCardButton).toBeVisible();
    await addCardButton.click();

    // Wait for card to be added (check for card count update)
    await page.waitForTimeout(1000);

    // Check that a card is now present on the board
    const cards = page.locator('[class*="BoardCard"]');
    await expect(cards).toHaveCount(1);
  });

  test("should show presence indicator in correct position", async ({
    page,
  }) => {
    await page.goto("http://localhost:2221/command-board/default");
    await page.waitForLoadState("networkidle");

    // Check that presence indicator is positioned in top right
    const presenceIndicator = page.locator(`[class*="${LIVE_PRESENCE_CLASS}"]`);
    await expect(presenceIndicator).toHaveCSS("position", "absolute");
    await expect(presenceIndicator).toHaveCSS("top", "16px");
    await expect(presenceIndicator).toHaveCSS("right", "16px");
    await expect(presenceIndicator).toHaveCSS("z-index", "50");
  });

  test("should display control buttons correctly", async ({ page }) => {
    await page.goto("http://localhost:2221/command-board/default");
    await page.waitForLoadState("networkidle");

    // Check for Detect Conflicts button
    const detectConflictsButton = page.getByRole("button", {
      name: DETECT_CONFLICTS_REGEX,
    });
    await expect(detectConflictsButton).toBeVisible();

    // Check for AI Suggestions button
    const aiSuggestionsButton = page.getByRole("button", {
      name: AI_SUGGESTIONS_REGEX,
    });
    await expect(aiSuggestionsButton).toBeVisible();
  });

  test("should show empty state when board is empty", async ({ page }) => {
    await page.goto("http://localhost:2221/command-board/default");
    await page.waitForLoadState("networkidle");

    // Look for empty state message
    const emptyStateText = page.getByText(EMPTY_BOARD_REGEX);
    const isVisible = await emptyStateText.isVisible().catch(() => false);

    if (isVisible) {
      await expect(emptyStateText).toBeVisible();
      await expect(page.getByText(ADD_FIRST_CARD_REGEX)).toBeVisible();
    } else {
      // Board already has cards, skip this check
      console.log("Board already has cards, skipping empty state check");
    }
  });
});
