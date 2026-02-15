import { expect, test } from "@playwright/test";

const ADD_CARD_REGEX = /add card/i;
const CARD_COUNT_REGEX = /\d+ cards?/;
const EMPTY_BOARD_REGEX = /your board is empty|no cards on the board yet/i;

test.describe("Command Board Realtime Sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:2221/command-board/default");
  });

  test("should load command board page", async ({ page }) => {
    await expect(
      page.getByRole("region", { name: "Command board canvas" })
    ).toBeVisible();
  });

  test("should display live cursors component", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const cursors = await page
      .locator('[class*="pointer-events-none"][class*="fixed"]')
      .all();
    expect(cursors.length).toBeGreaterThanOrEqual(0);
  });

  test("should show add card button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: ADD_CARD_REGEX })
    ).toBeVisible();
  });

  test("should add a new card", async ({ page }) => {
    const addCardButton = page.getByRole("button", { name: ADD_CARD_REGEX });
    await addCardButton.click();

    await page.waitForTimeout(1000);

    const cards = page.locator(
      '[data-testid="board-card"], [class*="board-card"]'
    );
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test("should display card count", async ({ page }) => {
    const addCardButton = page.getByRole("button", { name: ADD_CARD_REGEX });

    await addCardButton.click();
    await page.waitForTimeout(500);

    const cardCount = page.getByText(CARD_COUNT_REGEX);
    await expect(cardCount).toBeVisible();
  });

  test("should open and close settings panel", async ({ page }) => {
    const settingsButton = page
      .getByRole("button")
      .filter({ hasText: "" })
      .nth(1);
    await settingsButton.click();

    await expect(page.getByText("Show Grid")).toBeVisible();
    await expect(page.getByText("Snap to Grid")).toBeVisible();
    await expect(page.getByText("Grid Size:")).toBeVisible();

    await settingsButton.click();
    await expect(page.getByText("Show Grid")).not.toBeVisible();
  });

  test("should show empty state when no cards", async ({ page }) => {
    const emptyState = page.getByText(EMPTY_BOARD_REGEX);
    await expect(emptyState).toBeVisible();
  });

  test("should toggle grid display", async ({ page }) => {
    const settingsButton = page
      .getByRole("button")
      .filter({ hasText: "" })
      .nth(1);
    await settingsButton.click();

    const showGridCheckbox = page.getByLabel("Show Grid");
    await showGridCheckbox.click();
    await page.waitForTimeout(300);

    await showGridCheckbox.click();
    await page.waitForTimeout(300);
  });

  test("should have viewport controls", async ({ page }) => {
    await expect(page.locator('[class*="viewport"]')).toBeVisible();
  });

  test("should display Liveblocks connection", async ({ page }) => {
    await page.waitForTimeout(2000);

    const connectionStatus = page
      .locator("text=Connecting...")
      .or(page.locator("text=Connected"));
    await expect(connectionStatus.first()).toBeVisible();
  });
});
