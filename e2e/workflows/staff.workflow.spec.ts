/**
 * Staff Module — Full Workflow Test
 *
 * Covers:
 *  1. Staff overview
 *  2. Team page loads with staff directory
 *  3. Add staff member (all fields) — verifies alert + table entry
 *  4. Availability page
 *  5. Schedule page
 *  6. Time-off page
 *  7. Training page
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

test.describe("Staff: Full Workflow", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  test("staff overview loads", async ({ page }, testInfo) => {
    await goto(page, "/staff");
    await assertVisible(page, /staff/i);
    await assertNoErrors(page, testInfo, errors, "staff overview");
  });

  test("team page loads with staff directory", async ({ page }, testInfo) => {
    await goto(page, "/staff/team");
    await assertVisible(page, /staff directory/i);
    await assertNoErrors(page, testInfo, errors, "team page");
  });

  test("add staff member with all fields", async ({ page }, testInfo) => {
    const STAFF_LAST = unique("StaffE2E");
    const STAFF_EMAIL = `e2e-staff-${Date.now()}@capsule-test.example.com`;

    await goto(page, "/staff/team");

    // Fill form — hard fail if any field is missing
    await page.locator('input[name="firstName"]').fill("E2E");
    await page.locator('input[name="lastName"]').fill(STAFF_LAST);
    await page.locator('input[name="email"]').fill(STAFF_EMAIL);
    await page.locator('select[name="role"]').selectOption({ index: 1 });
    await page
      .locator('select[name="employmentType"]')
      .selectOption({ index: 1 });

    // Submit
    await page.locator('button[type="submit"]').click();

    // Verify success alert
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 10_000 });
    await expect(alert).toContainText("Staff added");

    // Verify new staff member appears in the directory table
    const staffTable = page.locator("table tbody");
    await expect(staffTable).toContainText(STAFF_LAST, { timeout: 10_000 });

    await assertNoErrors(page, testInfo, errors, "add staff member");
  });

  test("availability page loads", async ({ page }, testInfo) => {
    // /staff/availability redirects to /scheduling/availability
    await goto(page, "/staff/availability");
    await expect(page).toHaveURL(/scheduling\/availability/);
    await expect(
      page.getByRole("heading", { name: /availability/i })
    ).toBeVisible({ timeout: 10_000 });
    await assertNoErrors(page, testInfo, errors, "availability page");
  });

  test("schedule page loads", async ({ page }, testInfo) => {
    // /staff/schedule redirects to /scheduling
    await goto(page, "/staff/schedule");
    await expect(page).toHaveURL(/scheduling/);
    await expect(
      page.getByRole("heading", { name: /scheduling/i })
    ).toBeVisible({ timeout: 10_000 });
    await assertNoErrors(page, testInfo, errors, "schedule page");
  });

  test("time-off page loads", async ({ page }, testInfo) => {
    // /staff/time-off redirects to /scheduling/time-off
    await goto(page, "/staff/time-off");
    await expect(page).toHaveURL(/scheduling\/time-off/);
    await expect(page.getByRole("heading", { name: /time.off/i })).toBeVisible({
      timeout: 10_000,
    });
    await assertNoErrors(page, testInfo, errors, "time-off page");
  });

  test("training page loads", async ({ page }, testInfo) => {
    await goto(page, "/staff/training");
    await expect(page).toHaveURL(/staff\/training/);
    await expect(page.getByRole("heading", { name: /training/i })).toBeVisible({
      timeout: 10_000,
    });
    await assertNoErrors(page, testInfo, errors, "training page");
  });
});
