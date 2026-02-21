/**
 * Scheduling Module — Full Workflow Test
 *
 * Covers:
 *  1. Scheduling overview
 *  2. Shifts page → click all interactive elements
 *  3. Availability page
 *  4. Requests page
 *  5. Time-off page
 *  6. Budgets page
 *  7. Assert no errors throughout
 */

import { test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  attachErrorCollector,
  failHard,
  goto,
  log,
  TEST_DATE,
} from "../helpers/workflow";

test.describe("Scheduling: Full Workflow", () => {
  test.setTimeout(120_000);

  test("scheduling overview → shifts → availability → requests → time-off → budgets", async ({
    page,
    baseURL,
  }, testInfo) => {
    const errors: CollectedError[] = [];
    attachErrorCollector(page, errors, baseURL ?? "http://127.0.0.1:2221");

    // ── 1. Scheduling overview ────────────────────────────────────────────────
    log.step("1. Scheduling overview");
    await goto(page, "/scheduling");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "scheduling overview");

    // ── 2. Shifts page ────────────────────────────────────────────────────────
    log.step("2. Shifts page");
    await goto(page, "/scheduling/shifts");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "shifts page");

    // Click visible buttons (non-destructive)
    const shiftBtns = await page.getByRole("button").all();
    for (const btn of shiftBtns.slice(0, 5)) {
      const text = await btn.textContent().catch(() => "");
      const label = await btn.getAttribute("aria-label").catch(() => "");
      const combined = `${text} ${label}`.toLowerCase();
      if (/delete|remove|sign.?out|logout/i.test(combined)) continue;
      log.info(`  shift btn: "${combined.trim().slice(0, 40)}"`);
      await btn.click().catch(() => undefined);
      await page.waitForTimeout(500);
      // Close any dialog
      if (
        await page
          .locator('[role="dialog"]')
          .isVisible({ timeout: 500 })
          .catch(() => false)
      ) {
        // Fill required fields if it's a create form
        const nameInput = page
          .locator('input[name="name"], input[placeholder*="name" i]')
          .first();
        if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await nameInput.fill("E2E Shift");
        }
        const startInput = page
          .locator('input[type="datetime-local"], input[name="startTime"]')
          .first();
        if (await startInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await startInput.fill(`${TEST_DATE}T09:00`);
        }
        const endInput = page.locator('input[name="endTime"]').first();
        if (await endInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await endInput.fill(`${TEST_DATE}T17:00`);
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }
    }
    await assertNoErrors(page, testInfo, errors, "shifts interactions");

    // ── 3. Availability page ──────────────────────────────────────────────────
    log.step("3. Availability page");
    await goto(page, "/scheduling/availability");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "availability page");

    // ── 4. Requests page ──────────────────────────────────────────────────────
    log.step("4. Requests page");
    await goto(page, "/scheduling/requests");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "requests page");

    // ── 5. Time-off page ──────────────────────────────────────────────────────
    log.step("5. Time-off page");
    await goto(page, "/scheduling/time-off");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "time-off page");

    // ── 6. Budgets page ───────────────────────────────────────────────────────
    log.step("6. Scheduling budgets");
    await goto(page, "/scheduling/budgets");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "scheduling budgets");

    // ── Final ─────────────────────────────────────────────────────────────────
    if (errors.length > 0) {
      await failHard(page, testInfo, errors, "final error check");
    }
    log.pass("Scheduling workflow complete — no errors");
  });
});
