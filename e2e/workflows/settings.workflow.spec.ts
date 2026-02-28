/**
 * Settings Module — Full Workflow Test
 *
 * Covers:
 *  1. Settings overview
 *  2. Team settings
 *  3. Security settings
 *  4. Integrations page
 *  5. Email templates list
 *  6. Create email template (form fill + submit + toast + redirect)
 *  7. Created template appears in list
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

const TEMPLATE_NAME = unique("TemplateE2E");

test.describe("Settings: Full Workflow", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  test("settings overview loads", async ({ page }, testInfo) => {
    await goto(page, "/settings");
    await assertVisible(page, /settings/i);
    await assertNoErrors(page, testInfo, errors, "settings overview");
  });

  test("team settings page loads", async ({ page }, testInfo) => {
    await goto(page, "/settings/team");
    await expect(page).toHaveURL(/settings\/team/);
    await expect(page.getByRole("heading", { name: /^team$/i })).toBeVisible({
      timeout: 10_000,
    });
    await assertNoErrors(page, testInfo, errors, "team settings");
  });

  test("security settings page loads", async ({ page }, testInfo) => {
    await goto(page, "/settings/security");
    await expect(page).toHaveURL(/settings\/security/);
    await expect(page.getByRole("heading", { name: /security/i })).toBeVisible({
      timeout: 10_000,
    });
    await assertNoErrors(page, testInfo, errors, "security settings");
  });

  test("integrations page loads", async ({ page }, testInfo) => {
    await goto(page, "/settings/integrations");
    await expect(page).toHaveURL(/settings\/integrations/);
    await expect(
      page.getByRole("heading", { name: /integrations/i })
    ).toBeVisible({ timeout: 10_000 });
    await assertNoErrors(page, testInfo, errors, "integrations");
  });

  test("email templates list loads", async ({ page }, testInfo) => {
    await goto(page, "/settings/email-templates");
    await expect(page).toHaveURL(/settings\/email-templates/);
    await expect(
      page.getByRole("heading", { name: /email templates/i })
    ).toBeVisible({ timeout: 10_000 });
    await assertNoErrors(page, testInfo, errors, "email templates list");
  });

  test("create email template", async ({ page }, testInfo) => {
    await goto(page, "/settings/email-templates/new");

    await page.locator('input[name="name"]').fill(TEMPLATE_NAME);
    await page.locator('input[name="subject"]').fill("E2E Test Subject");
    await page
      .locator('textarea[name="body"]')
      .fill("Hello {{name}}, this is an E2E test email.");

    // Submit button is in the PAGE HEADER, not inside the form — click by text
    await page.getByRole("button", { name: /save template/i }).click();

    // Verify success toast
    await expect(page.getByText(/template created/i)).toBeVisible({
      timeout: 15_000,
    });

    // Verify redirect to templates list
    await expect(page).toHaveURL(/settings\/email-templates$/, {
      timeout: 10_000,
    });

    await assertNoErrors(page, testInfo, errors, "create email template");
  });

  test("created template appears in list", async ({ page }, testInfo) => {
    await goto(page, "/settings/email-templates");
    await expect(page.getByText(TEMPLATE_NAME)).toBeVisible({
      timeout: 15_000,
    });
    await assertNoErrors(page, testInfo, errors, "template in list");
  });
});
