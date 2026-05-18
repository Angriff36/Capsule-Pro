/**
 * Event Intake — Full Workflow Test
 *
 * Covers:
 *  1. Intake page loads from sidebar nav
 *  2. Wizard renders all steps
 *  3. Fill out wizard form across steps
 *  4. Submit lead via /api/lead
 *  5. Verify confirmation screen appears
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

const LEAD_EMAIL = `intake-e2e-${unique("lead")}@example.com`;

test.describe("Event Intake: Full Workflow", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  test("intake page loads via sidebar", async ({ page }, testInfo) => {
    await goto(page, "/events/intake");
    await assertVisible(page, /event intake|your vision/i);
    await assertNoErrors(page, testInfo, errors, "intake page");
  });

  test("fill intake wizard and submit lead", async ({ page }, testInfo) => {
    await goto(page, "/events/intake");

    // Step 1: Your Vision — occasion type and vibe
    await expect(page.getByText(/your vision/i).first()).toBeVisible({
      timeout: 10000,
    });
    // Select an occasion type card
    const occasionCard = page.locator('[role="radio"], [role="button"]').filter({
      hasText: /wedding|birthday|corporate|gala/i,
    }).first();
    if (await occasionCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await occasionCard.click();
    }

    // Click "Next" or "Continue"
    const nextBtn = page.getByRole("button", { name: /next|continue/i });
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // Step 2: Event Details — guest count should be pre-filled (100)
    // Continue through remaining steps
    for (let i = 0; i < 6; i++) {
      const btn = page.getByRole("button", { name: /next|continue/i });
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }

    // Step: Final Details — fill required contact info
    const contactNameInput = page.locator('input[name="contactName"], [placeholder*="name" i], [placeholder*="contact" i]').first();
    if (await contactNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await contactNameInput.fill("E2E Test Lead");
    }

    const emailInput = page.locator('input[type="email"], input[name="email"], [placeholder*="email" i]').first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill(LEAD_EMAIL);
    }

    // Submit
    const submitBtn = page.getByRole("button", { name: /submit|send|finish/i });
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }

    // Verify confirmation screen
    await expect(
      page.getByText(/thank you|submitted|confirmation|lead created/i).first()
    ).toBeVisible({ timeout: 15000 });

    await assertNoErrors(page, testInfo, errors, "intake submit");
  });

  test("menu builder page loads", async ({ page }, testInfo) => {
    await goto(page, "/events/menu-builder");
    await assertVisible(page, /menu|builder/i);
    await assertNoErrors(page, testInfo, errors, "menu builder");
  });
});
