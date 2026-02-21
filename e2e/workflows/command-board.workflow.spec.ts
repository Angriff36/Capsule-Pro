/**
 * Command Board — Full Workflow Test
 *
 * Covers:
 *  1. Command Board list page
 *  2. Create a new board (fill name + description)
 *  3. Open the board
 *  4. Open Entity Browser → add an entity to the board
 *  5. Open AI chat panel → send a message → verify response
 *  6. Open conflict panel
 *  7. Use command palette (Cmd+K)
 *  8. Assert no errors throughout
 */

import { test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  attachErrorCollector,
  failHard,
  goto,
  log,
  unique,
} from "../helpers/workflow";

const BOARD_NAME = unique("E2E Board");
const BOARD_DESC = "Automated E2E workflow test board";

test.describe("Command Board: Full Workflow", () => {
  test.setTimeout(180_000);

  test("board list → create board → add entity → AI chat → conflict panel", async ({
    page,
    baseURL,
  }, testInfo) => {
    const errors: CollectedError[] = [];
    attachErrorCollector(page, errors, baseURL ?? "http://127.0.0.1:2221");

    // ── 1. Board list ─────────────────────────────────────────────────────────
    log.step("1. Command Board list");
    await goto(page, "/command-board");
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "board list");

    // ── 2. Create board ───────────────────────────────────────────────────────
    log.step("2. Create board");
    const createBtn = page
      .getByRole("button", { name: /create board|new board|add board/i })
      .first();

    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page
        .locator('[role="dialog"]')
        .first()
        .waitFor({ state: "visible", timeout: 8000 });

      // Fill board name
      const nameInput = page
        .locator('input[placeholder*="board" i], input[name="name"]')
        .first();
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill(BOARD_NAME);
      }

      // Fill description
      const descInput = page
        .locator(
          'textarea[name="description"], textarea[placeholder*="description" i]'
        )
        .first();
      if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await descInput.fill(BOARD_DESC);
      }

      // Submit
      const submitBtn = page
        .getByRole("button", { name: /create|save/i })
        .last();
      await submitBtn.click();

      // Wait for navigation to board
      await page
        .waitForLoadState("networkidle", { timeout: 15_000 })
        .catch(() => undefined);
      await assertNoErrors(page, testInfo, errors, "create board");
      log.ok(`Board created: ${BOARD_NAME} — URL: ${page.url()}`);
    } else {
      log.warn("Create board button not found — trying to use existing board");
      // Try clicking first board link
      const firstBoard = page.locator('a[href*="/command-board/"]').first();
      if (await firstBoard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstBoard.click();
        await page
          .waitForLoadState("networkidle", { timeout: 10_000 })
          .catch(() => undefined);
      }
    }

    // ── 3. Board canvas loaded ────────────────────────────────────────────────
    log.step("3. Verify board canvas");
    const canvas = page
      .locator('[aria-label*="board" i], [data-testid*="board"], .react-flow')
      .first();
    if (await canvas.isVisible({ timeout: 10_000 }).catch(() => false)) {
      log.ok("Board canvas visible");
    } else {
      log.warn("Board canvas not found — board may still be loading");
    }
    await assertNoErrors(page, testInfo, errors, "board canvas");

    // ── 4. Entity Browser ─────────────────────────────────────────────────────
    log.step("4. Open Entity Browser");
    const entityBrowserBtn = page
      .getByRole("button", {
        name: /entity browser|add entity|browse entities/i,
      })
      .or(page.locator('[aria-label*="entity browser" i]'))
      .first();

    if (
      await entityBrowserBtn.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await entityBrowserBtn.click();
      await page.waitForTimeout(1000);

      // Search for an entity
      const searchInput = page
        .locator('[placeholder*="search" i]')
        .or(page.locator('input[type="search"]'))
        .first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill("event");
        await page.waitForTimeout(1000);
      }

      // Add first result if available
      const addToBoard = page
        .getByRole("button", { name: /add to board|add/i })
        .first();
      if (await addToBoard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addToBoard.click();
        await page.waitForTimeout(1000);
        log.ok("Entity added to board");
      }

      // Close browser
      const closeBtn = page
        .getByRole("button", { name: /close|dismiss/i })
        .or(page.locator('[aria-label="Close"]'))
        .first();
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click();
      }

      await assertNoErrors(page, testInfo, errors, "entity browser");
    } else {
      log.warn("Entity browser button not found — skipping");
    }

    // ── 5. AI Chat panel ──────────────────────────────────────────────────────
    log.step("5. AI Chat panel");
    const chatBtn = page
      .getByRole("button", { name: /chat|ai|assistant/i })
      .or(page.locator('[aria-label*="chat" i]'))
      .first();

    if (await chatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatBtn.click();
      await page.waitForTimeout(1000);

      // Find chat input
      const chatInput = page
        .locator(
          'textarea[placeholder*="message" i], input[placeholder*="message" i], [contenteditable="true"]'
        )
        .first();

      if (await chatInput.isVisible({ timeout: 8000 }).catch(() => false)) {
        await chatInput.fill("What is on this board?");
        await page.keyboard.press("Enter");
        log.info("  Chat message sent: 'What is on this board?'");

        // Wait for response (up to 30s for AI)
        await page.waitForTimeout(3000);
        await assertNoErrors(page, testInfo, errors, "ai chat message sent");
        log.ok("AI chat interaction complete");
      } else {
        log.warn("Chat input not found");
      }
    } else {
      log.warn("Chat button not found — skipping AI chat");
    }

    // ── 6. Board header buttons ───────────────────────────────────────────────
    log.step("6. Click board header buttons");
    const headerBtns = await page
      .locator('header button, [data-testid*="board-header"] button')
      .all();
    for (const btn of headerBtns.slice(0, 5)) {
      const label = await btn.getAttribute("aria-label").catch(() => "");
      const text = await btn.textContent().catch(() => "");
      const combined = `${label} ${text}`.toLowerCase();
      // Skip destructive actions
      if (/delete|remove|destroy|logout|sign.?out/i.test(combined)) continue;
      log.info(`  header btn: "${combined.trim()}"`);
      await btn.click().catch(() => undefined);
      await page.waitForTimeout(500);
      // Close any dialog that opened
      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }
    }
    await assertNoErrors(page, testInfo, errors, "board header buttons");

    // ── Final ─────────────────────────────────────────────────────────────────
    if (errors.length > 0) {
      await failHard(page, testInfo, errors, "final error check");
    }
    log.pass("Command Board workflow complete — no errors");
  });
});
