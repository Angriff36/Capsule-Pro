/**
 * Settings Module — Full Workflow Test
 *
 * Covers:
 *  1. Settings overview
 *  2. Team settings → click all tabs/sections
 *  3. Security settings
 *  4. Integrations page
 *  5. Email templates list → create template
 *  6. Assert no errors throughout
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

const TEMPLATE_NAME = unique("E2E Email Template");

test.describe("Settings: Full Workflow", () => {
  test.setTimeout(120_000);

  test("settings overview → team → security → integrations → email templates", async ({
    page,
    baseURL,
  }, testInfo) => {
    const errors: CollectedError[] = [];
    attachErrorCollector(page, errors, baseURL ?? "http://127.0.0.1:2221");

    // ── 1. Settings overview ──────────────────────────────────────────────────
    log.step("1. Settings overview");
    await goto(page, "/settings");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "settings overview");

    // Click all visible tabs/nav items on settings page
    const settingsTabs = await page.locator('[role="tab"], nav a').all();
    for (const tab of settingsTabs.slice(0, 6)) {
      const text = await tab.textContent().catch(() => "");
      if (!text?.trim()) continue;
      log.info(`  settings tab: "${text.trim()}"`);
      await tab.click().catch(() => undefined);
      await page.waitForTimeout(500);
      await assertNoErrors(
        page,
        testInfo,
        errors,
        `settings tab: ${text.trim()}`
      );
    }

    // ── 2. Team settings ──────────────────────────────────────────────────────
    log.step("2. Team settings");
    await goto(page, "/settings/team");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "team settings");

    // Click visible buttons (non-destructive)
    const teamBtns = await page.getByRole("button").all();
    for (const btn of teamBtns.slice(0, 4)) {
      const text = await btn.textContent().catch(() => "");
      const label = await btn.getAttribute("aria-label").catch(() => "");
      const combined = `${text} ${label}`.toLowerCase();
      if (/delete|remove|revoke|sign.?out|logout/i.test(combined)) continue;
      await btn.click().catch(() => undefined);
      await page.waitForTimeout(500);
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(200);
    }
    await assertNoErrors(page, testInfo, errors, "team settings interactions");

    // ── 3. Security settings ──────────────────────────────────────────────────
    log.step("3. Security settings");
    await goto(page, "/settings/security");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "security settings");

    // ── 4. Integrations ───────────────────────────────────────────────────────
    log.step("4. Integrations");
    await goto(page, "/settings/integrations");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "integrations");

    // Click integration toggle buttons (non-destructive)
    const integrationBtns = await page.getByRole("button").all();
    for (const btn of integrationBtns.slice(0, 3)) {
      const text = await btn.textContent().catch(() => "");
      if (/delete|remove|disconnect/i.test(text ?? "")) continue;
      await btn.click().catch(() => undefined);
      await page.waitForTimeout(500);
      await page.keyboard.press("Escape").catch(() => undefined);
    }
    await assertNoErrors(page, testInfo, errors, "integrations interactions");

    // ── 5. Email templates list ───────────────────────────────────────────────
    log.step("5. Email templates list");
    await goto(page, "/settings/email-templates");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "email templates list");

    // ── 6. Create email template ──────────────────────────────────────────────
    log.step("6. Create email template");
    await goto(page, "/settings/email-templates/new");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);

    const nameInput = page.locator('input[name="name"]').first();
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill(TEMPLATE_NAME);
    }

    const subjectInput = page.locator('input[name="subject"]').first();
    if (await subjectInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subjectInput.fill("E2E Test Email Subject");
    }

    const bodyInput = page
      .locator('textarea[name="body"], [contenteditable="true"]')
      .first();
    if (await bodyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bodyInput.fill(
        "Hello {{name}},\n\nThis is an E2E test email template.\n\nBest regards,\nThe Team"
      );
    }

    const submitBtn = page
      .getByRole("button", { name: /save|create|submit/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      await page
        .waitForLoadState("networkidle", { timeout: 15_000 })
        .catch(() => undefined);
      await assertNoErrors(page, testInfo, errors, "create email template");
      log.ok(`Email template created: ${TEMPLATE_NAME}`);
    }

    // ── Final ─────────────────────────────────────────────────────────────────
    if (errors.length > 0) {
      await failHard(page, testInfo, errors, "final error check");
    }
    log.pass("Settings workflow complete — no errors");
  });
});
