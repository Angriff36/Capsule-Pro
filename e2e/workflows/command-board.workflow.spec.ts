/**
 * Command Board — Full Workflow Test
 *
 * Covers:
 *  1. Board list page loads
 *  2. Create a new board (fill name + description, verify redirect)
 *  3. Board canvas renders after creation
 *  4. Created board appears in list
 *  5. Entity browser — fixme (trigger selector unconfirmed)
 *  6. AI chat panel — fixme (requires E2E_EXTERNAL=true)
 */

import { expect, test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  assertVisible,
  attachErrorCollector,
  BASE_URL,
  goto,
  unique,
} from "../helpers/workflow";

const BOARD_NAME = unique("BoardE2E");
const BOARD_DESC = "E2E test board created by automated workflow test";

test.describe("Command Board: Full Workflow", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  test("board list loads", async ({ page }, testInfo) => {
    await goto(page, "/command-board");
    await assertVisible(page, /command board/i);
    await assertNoErrors(page, testInfo, errors, "board list");
  });

  test("create board with name and description", async ({ page }, testInfo) => {
    await goto(page, "/command-board");

    // Open create dialog
    await page.getByRole("button", { name: /new board/i }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Fill using id selectors (no name attrs on these inputs)
    await page.locator("input#board-name").fill(BOARD_NAME);
    await page.locator("textarea#board-description").fill(BOARD_DESC);

    // Submit
    await dialog.locator('button[type="submit"]').click();

    // Verify redirect to board detail
    await expect(page).toHaveURL(/command-board\/[a-f0-9-]+/, {
      timeout: 15_000,
    });

    await assertNoErrors(page, testInfo, errors, "create board");
  });

  test("board canvas renders after creation", async ({ page }, testInfo) => {
    await goto(page, "/command-board");

    // Create a board to navigate to
    await page.getByRole("button", { name: /new board/i }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({
      timeout: 10_000,
    });
    await page.locator("input#board-name").fill(unique("CanvasE2E"));
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/command-board\/[a-f0-9-]+/, {
      timeout: 15_000,
    });

    // Verify canvas area renders (react-flow or board content)
    const canvas = page
      .locator('.react-flow, [data-testid*="board"], [aria-label*="board" i]')
      .first();
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    await assertNoErrors(page, testInfo, errors, "board canvas");
  });

  test("created board appears in list", async ({ page }, testInfo) => {
    await goto(page, "/command-board");
    await expect(page.getByText(BOARD_NAME)).toBeVisible({ timeout: 15_000 });
    await assertNoErrors(page, testInfo, errors, "board in list");
  });

  // biome-ignore lint/suspicious/noSkippedTests: trigger selector not yet confirmed against live UI
  test.fixme(
    "entity browser: add entity to board — selectors need verification",
    async () => {
      // Entity browser component exists but trigger button selector not confirmed.
      // Implement once button aria-label/text is verified against live UI.
    }
  );

  // biome-ignore lint/suspicious/noSkippedTests: requires E2E_EXTERNAL=true to avoid LLM cost in CI
  test.fixme(
    "AI chat panel: send message — requires E2E_EXTERNAL=true",
    async () => {
      // AI chat panel component exists but hits real LLM providers.
      // Only enable when E2E_EXTERNAL=true to avoid cost/nondeterminism in CI.
    }
  );
});
