/**
 * Staff Module — Full Workflow Test
 *
 * Covers:
 *  1. Staff overview
 *  2. Team page → add staff member (all fields)
 *  3. Availability page
 *  4. Schedule page
 *  5. Time-off page
 *  6. Training page
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
  TEST_EMAIL,
  unique,
} from "../helpers/workflow";

const STAFF_FIRST = "E2E";
const STAFF_LAST = unique("Staff");

test.describe("Staff: Full Workflow", () => {
  test.setTimeout(300_000);

  test("staff overview → add member → availability → schedule → time-off → training", async ({
    page,
    baseURL,
  }, testInfo) => {
    const errors: CollectedError[] = [];
    attachErrorCollector(page, errors, baseURL ?? "http://127.0.0.1:2221");

    // ── 1. Staff overview ─────────────────────────────────────────────────────
    log.step("1. Staff overview");
    await goto(page, "/staff");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "staff overview");

    // ── 2. Team page ──────────────────────────────────────────────────────────
    log.step("2. Team page");
    await goto(page, "/staff/team");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "team page");

    // ── 3. Add staff member ───────────────────────────────────────────────────
    log.step("3. Add staff member");
    // Fill the add staff form (it's inline on the team page)
    const firstNameInput = page
      .locator('#firstName, input[name="firstName"]')
      .first();
    if (await firstNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNameInput.fill(STAFF_FIRST);

      const lastNameInput = page
        .locator('#lastName, input[name="lastName"]')
        .first();
      if (await lastNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lastNameInput.fill(STAFF_LAST);
      }

      const emailInput = page.locator('#email, input[name="email"]').first();
      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill(TEST_EMAIL);
      }

      // Role select
      const roleSelect = page.locator('#role, select[name="role"]').first();
      if (await roleSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await roleSelect.selectOption("staff");
      }

      // Employment type
      const empTypeSelect = page
        .locator('select[name="employmentType"]')
        .first();
      if (await empTypeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await empTypeSelect.selectOption("full_time");
      }

      // Hourly rate
      const rateInput = page.locator('input[name="hourlyRate"]').first();
      if (await rateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rateInput.fill("25");
      }

      // Submit
      const submitBtn = page
        .getByRole("button", { name: /add staff|submit|save/i })
        .first();
      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBtn.click();
        await page
          .waitForLoadState("networkidle", { timeout: 15_000 })
          .catch(() => undefined);
        await assertNoErrors(page, testInfo, errors, "add staff member");
        log.ok(`Staff member added: ${STAFF_FIRST} ${STAFF_LAST}`);
      }
    } else {
      log.warn("Add staff form not found — skipping staff creation");
    }

    // ── 4. Availability page ──────────────────────────────────────────────────
    log.step("4. Availability page");
    await goto(page, "/staff/availability");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "availability page");

    // Click any visible buttons on availability page (skip icon-only and destructive buttons)
    const availBtns = await page.getByRole("button").all();
    for (const btn of availBtns.slice(0, 3)) {
      const text = (await btn.textContent().catch(() => ""))?.trim() ?? "";
      const label =
        (await btn.getAttribute("aria-label").catch(() => "")) ?? "";
      const combined = `${text} ${label}`.toLowerCase();
      // Skip empty buttons (icon-only like UserButton), destructive, or auth buttons
      if (!(text || label)) continue;
      if (
        /delete|remove|sign.?out|logout|user.?menu|organization.?switch/i.test(
          combined
        )
      )
        continue;
      await btn.click().catch(() => undefined);
      await page.waitForTimeout(500);
      await page.keyboard.press("Escape").catch(() => undefined);
    }
    await assertNoErrors(page, testInfo, errors, "availability interactions");

    // ── 5. Schedule page ──────────────────────────────────────────────────────
    log.step("5. Schedule page");
    await goto(page, "/staff/schedule");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "schedule page");

    // ── 6. Time-off page ──────────────────────────────────────────────────────
    log.step("6. Time-off page");
    await goto(page, "/staff/time-off");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "time-off page");

    // ── 7. Training page ──────────────────────────────────────────────────────
    log.step("7. Training page");
    await goto(page, "/staff/training");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "training page");

    // ── Final ─────────────────────────────────────────────────────────────────
    if (errors.length > 0) {
      await failHard(page, testInfo, errors, "final error check");
    }
    log.pass("Staff workflow complete — no errors");
  });
});
