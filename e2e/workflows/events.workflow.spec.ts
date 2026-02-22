/**
 * Events Module — Full Workflow Test
 *
 * Covers:
 *  1. Events list loads
 *  2. Create a new event (all fields) → verify redirect + detail page
 *  3. Events list shows created event
 *  4. Budgets page loads
 *  5. Battle boards page loads
 *  6. Contracts page loads
 *  7. Reports page loads
 *  8. Kitchen dashboard page loads
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

const EVENT_NAME = unique("EventE2E");
const EVENT_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0]; // 30 days from now, YYYY-MM-DD

test.describe("Events: Full Workflow", () => {
  let errors: CollectedError[] = [];
  let createdEventUrl = ""; // capture after creation for reuse

  test.beforeEach(async ({ page }) => {
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  test("events list loads", async ({ page }, testInfo) => {
    await goto(page, "/events");
    await assertVisible(page, /events/i);
    await assertNoErrors(page, testInfo, errors, "events list");
  });

  test("create event with all fields", async ({ page }, testInfo) => {
    await goto(page, "/events/new");

    // Fill required fields — hard fail if missing
    await page.locator('input[name="title"]').fill(EVENT_NAME);
    await page.locator('input[name="eventType"]').fill("Corporate Gala");
    await page.locator('input[name="eventDate"]').fill(EVENT_DATE);
    await page.locator('select[name="status"]').selectOption("confirmed");
    await page.locator('input[name="guestCount"]').fill("150");
    await page.locator('input[name="budget"]').fill("25000");
    await page.locator('input[name="venueName"]').fill("Grand Ballroom");
    await page.locator('input[name="venueAddress"]').fill("123 Main St");
    await page.locator('textarea[name="notes"]').fill("E2E test event");

    await page.locator('button[type="submit"]').click();

    // Verify redirect to event detail page
    await expect(page).toHaveURL(/\/events\/[a-f0-9-]+/, { timeout: 15_000 });
    createdEventUrl = page.url();

    // Verify event title appears on detail page
    await expect(page.getByText(EVENT_NAME)).toBeVisible({ timeout: 10_000 });

    await assertNoErrors(page, testInfo, errors, "create event");
  });

  test("events list shows created event", async ({ page }, testInfo) => {
    await goto(page, "/events");
    await expect(page.getByText(EVENT_NAME)).toBeVisible({ timeout: 15_000 });
    await assertNoErrors(
      page,
      testInfo,
      errors,
      "events list with created event"
    );
  });

  test("budgets page loads", async ({ page }, testInfo) => {
    await goto(page, "/events/budgets");
    await expect(page).toHaveURL(/events\/budgets/);
    await assertNoErrors(page, testInfo, errors, "budgets page");
  });

  test("battle boards page loads", async ({ page }, testInfo) => {
    await goto(page, "/events/battle-boards");
    await expect(page).toHaveURL(/events\/battle-boards/);
    await assertNoErrors(page, testInfo, errors, "battle boards page");
  });

  test("contracts page loads", async ({ page }, testInfo) => {
    await goto(page, "/events/contracts");
    await expect(page).toHaveURL(/events\/contracts/);
    await assertNoErrors(page, testInfo, errors, "contracts page");
  });

  test("reports page loads", async ({ page }, testInfo) => {
    await goto(page, "/events/reports");
    await expect(page).toHaveURL(/events\/reports/);
    await assertNoErrors(page, testInfo, errors, "reports page");
  });

  test("kitchen dashboard page loads", async ({ page }, testInfo) => {
    await goto(page, "/events/kitchen-dashboard");
    await expect(page).toHaveURL(/events\/kitchen-dashboard/);
    await assertNoErrors(page, testInfo, errors, "kitchen dashboard page");
  });
});
