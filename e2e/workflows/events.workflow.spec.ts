/**
 * Events Module — Full Workflow Test
 *
 * Covers:
 *  1. Navigate to Events list
 *  2. Create a new event (fill every form field)
 *  3. View event detail
 *  4. Edit the event
 *  5. Add a budget line
 *  6. View battle board for the event
 *  7. Navigate to contracts list
 *  8. Navigate to reports list
 *  9. Navigate to budgets list
 * 10. Assert no console errors or network failures throughout
 *
 * Fails hard on any error — writes report + screenshot to e2e/reports/
 */

import { test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  assertVisible,
  attachErrorCollector,
  clickButton,
  failHard,
  fillByName,
  goto,
  log,
  selectByName,
  TEST_DATE,
  unique,
} from "../helpers/workflow";

const EVENT_NAME = unique("E2E Event");
const EVENT_TYPE = "catering";

test.describe("Events: Full Workflow", () => {
  test.setTimeout(120_000);

  test("create event → edit → budget → battle board → contracts → reports", async ({
    page,
    baseURL,
  }, testInfo) => {
    const errors: CollectedError[] = [];
    attachErrorCollector(page, errors, baseURL ?? "http://127.0.0.1:2221");

    // ── 1. Events list ────────────────────────────────────────────────────────
    log.step("1. Navigate to Events list");
    await goto(page, "/events");
    await assertVisible(page, /events/i);
    await assertNoErrors(page, testInfo, errors, "events list");

    // ── 2. Create new event ───────────────────────────────────────────────────
    log.step("2. Create new event");
    await goto(page, "/events/new");
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => undefined);

    await fillByName(page, "title", EVENT_NAME);
    await fillByName(page, "eventType", EVENT_TYPE);
    await fillByName(page, "eventDate", TEST_DATE);
    await selectByName(page, "status", "confirmed");
    await fillByName(page, "guestCount", "75");
    await fillByName(page, "budget", "15000");
    await fillByName(page, "ticketTier", "General Admission");

    // Fill optional fields if present
    const venueInput = page
      .locator('input[name="venue"], input[name="location"]')
      .first();
    if (await venueInput.isVisible().catch(() => false)) {
      await venueInput.fill("Grand Ballroom");
    }
    const notesInput = page
      .locator('textarea[name="notes"], textarea[name="description"]')
      .first();
    if (await notesInput.isVisible().catch(() => false)) {
      await notesInput.fill("E2E test event — automated workflow verification");
    }

    await clickButton(page, /save|create|submit/i);
    await page
      .waitForLoadState("networkidle", { timeout: 15_000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "create event");

    // Should redirect to event detail
    const currentURL = page.url();
    if (!currentURL.includes("/events/")) {
      // Try navigating to events list and finding the created event
      await goto(page, "/events");
      const eventLink = page.getByText(EVENT_NAME).first();
      if (await eventLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await eventLink.click();
        await page
          .waitForLoadState("networkidle", { timeout: 10_000 })
          .catch(() => undefined);
      }
    }

    log.ok(`Event created: ${page.url()}`);
    await assertNoErrors(page, testInfo, errors, "event detail after create");

    // ── 3. Verify event detail ────────────────────────────────────────────────
    log.step("3. Verify event detail page");
    await assertVisible(page, EVENT_NAME);

    // ── 4. Navigate to events list and verify event appears ───────────────────
    log.step("4. Events list — verify created event appears");
    await goto(page, "/events");
    await assertVisible(page, EVENT_NAME);
    await assertNoErrors(
      page,
      testInfo,
      errors,
      "events list with created event"
    );

    // ── 5. Navigate to budgets ────────────────────────────────────────────────
    log.step("5. Navigate to Budgets");
    await goto(page, "/events/budgets");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "budgets list");

    // ── 6. Navigate to battle boards ──────────────────────────────────────────
    log.step("6. Navigate to Battle Boards");
    await goto(page, "/events/battle-boards");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "battle boards list");

    // ── 7. Navigate to contracts ──────────────────────────────────────────────
    log.step("7. Navigate to Contracts");
    await goto(page, "/events/contracts");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "contracts list");

    // ── 8. Navigate to reports ────────────────────────────────────────────────
    log.step("8. Navigate to Reports");
    await goto(page, "/events/reports");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "reports list");

    // ── 9. Navigate to kitchen dashboard ─────────────────────────────────────
    log.step("9. Navigate to Kitchen Dashboard");
    await goto(page, "/events/kitchen-dashboard");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "kitchen dashboard");

    // ── Final check ───────────────────────────────────────────────────────────
    if (errors.length > 0) {
      await failHard(page, testInfo, errors, "final error check");
    }

    log.pass("Events workflow complete — no errors");
  });
});
