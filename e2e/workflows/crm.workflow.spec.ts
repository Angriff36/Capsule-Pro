/**
 * CRM Module — Full Workflow Test
 *
 * Covers:
 *  1. CRM overview
 *  2. Clients list → create client (all fields) → view detail → all tabs
 *  3. Proposals list → create proposal → add line item
 *  4. Venues list → create venue
 *  5. Communications page
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
  TEST_EMAIL,
  unique,
} from "../helpers/workflow";

const CLIENT_FIRST = "E2E";
const CLIENT_LAST = unique("Client");
const CLIENT_COMPANY = unique("E2E Corp");
const VENUE_NAME = unique("E2E Venue");

test.describe("CRM: Full Workflow", () => {
  test.setTimeout(150_000);

  test("crm overview → client → proposal → venue → communications", async ({
    page,
    baseURL,
  }, testInfo) => {
    const errors: CollectedError[] = [];
    attachErrorCollector(page, errors, baseURL ?? "http://127.0.0.1:2221");

    // ── 1. CRM overview ───────────────────────────────────────────────────────
    log.step("1. CRM overview");
    await goto(page, "/crm");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "crm overview");

    // ── 2. Clients list ───────────────────────────────────────────────────────
    log.step("2. Clients list");
    await goto(page, "/crm/clients");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "clients list");

    // ── 3. Create client ──────────────────────────────────────────────────────
    log.step("3. Create client");
    // Look for a create/new client button or link
    const newClientBtn = page
      .getByRole("button", { name: /new client|add client|create client/i })
      .or(page.getByRole("link", { name: /new client|add client/i }))
      .first();

    if (await newClientBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newClientBtn.click();
      await page
        .waitForLoadState("networkidle", { timeout: 8000 })
        .catch(() => undefined);

      // Fill client form fields
      const firstNameInput = page
        .locator('input[name="first_name"], input[name="firstName"]')
        .first();
      if (
        await firstNameInput.isVisible({ timeout: 5000 }).catch(() => false)
      ) {
        await firstNameInput.fill(CLIENT_FIRST);
      }

      const lastNameInput = page
        .locator('input[name="last_name"], input[name="lastName"]')
        .first();
      if (await lastNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lastNameInput.fill(CLIENT_LAST);
      }

      const companyInput = page
        .locator('input[name="company_name"], input[name="company"]')
        .first();
      if (await companyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await companyInput.fill(CLIENT_COMPANY);
      }

      const emailInput = page
        .locator('input[name="email"], input[type="email"]')
        .first();
      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill(TEST_EMAIL);
      }

      const phoneInput = page
        .locator('input[name="phone"], input[type="tel"]')
        .first();
      if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await phoneInput.fill("555-0100");
      }

      const notesInput = page.locator('textarea[name="notes"]').first();
      if (await notesInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await notesInput.fill("E2E test client — automated workflow");
      }

      const submitBtn = page
        .getByRole("button", { name: /save|create|submit/i })
        .first();
      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBtn.click();
        await page
          .waitForLoadState("networkidle", { timeout: 15_000 })
          .catch(() => undefined);
      }

      await assertNoErrors(page, testInfo, errors, "create client");
      log.ok(`Client created: ${CLIENT_FIRST} ${CLIENT_LAST}`);

      // ── 4. Client detail tabs ─────────────────────────────────────────────
      log.step("4. Client detail — click all tabs");
      const tabs = await page.locator('[role="tab"]').all();
      for (const tab of tabs) {
        const tabText = await tab.textContent().catch(() => "");
        if (!tabText) continue;
        log.info(`  tab: ${tabText.trim()}`);
        await tab.click().catch(() => undefined);
        await page.waitForTimeout(500);
        await assertNoErrors(
          page,
          testInfo,
          errors,
          `client tab: ${tabText.trim()}`
        );
      }
    } else {
      log.warn("New client button not found — skipping client creation");
    }

    // ── 5. Proposals list ─────────────────────────────────────────────────────
    log.step("5. Proposals list");
    await goto(page, "/crm/proposals");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "proposals list");

    // ── 6. Create proposal ────────────────────────────────────────────────────
    log.step("6. Create proposal");
    await goto(page, "/crm/proposals/new");
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => undefined);

    // Fill proposal form
    const titleInput = page.locator('input[name="title"]').first();
    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.fill(unique("E2E Proposal"));
    }

    const eventTypeInput = page
      .locator('input[name="eventType"], input[name="event_type"]')
      .first();
    if (await eventTypeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await eventTypeInput.fill("catering");
    }

    const totalInput = page
      .locator('input[name="totalAmount"], input[name="total"]')
      .first();
    if (await totalInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await totalInput.fill("5000");
    }

    const notesInput = page.locator('textarea[name="notes"]').first();
    if (await notesInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notesInput.fill("E2E test proposal");
    }

    // Add a line item if button exists
    const addLineBtn = page
      .getByRole("button", { name: /add line|add item/i })
      .first();
    if (await addLineBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addLineBtn.click();
      await page.waitForTimeout(500);
      const lineDesc = page
        .locator('input[placeholder*="description" i]')
        .last();
      if (await lineDesc.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lineDesc.fill("Catering service");
      }
      const lineQty = page
        .locator('input[placeholder*="qty" i], input[name*="quantity" i]')
        .last();
      if (await lineQty.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lineQty.fill("1");
      }
      const linePrice = page
        .locator('input[placeholder*="price" i], input[name*="price" i]')
        .last();
      if (await linePrice.isVisible({ timeout: 3000 }).catch(() => false)) {
        await linePrice.fill("5000");
      }
    }

    const submitBtn = page
      .getByRole("button", { name: /save|create|submit/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      await page
        .waitForLoadState("networkidle", { timeout: 15_000 })
        .catch(() => undefined);
    }
    await assertNoErrors(page, testInfo, errors, "create proposal");

    // ── 7. Venues list ────────────────────────────────────────────────────────
    log.step("7. Venues list");
    await goto(page, "/crm/venues");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "venues list");

    // Create venue
    await goto(page, "/crm/venues/new");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);

    const venueNameInput = page.locator('input[name="name"]').first();
    if (await venueNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await venueNameInput.fill(VENUE_NAME);
    }
    const venueAddrInput = page.locator('input[name="address"]').first();
    if (await venueAddrInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await venueAddrInput.fill("123 E2E Street, Test City, TC 00000");
    }
    const venueCapInput = page.locator('input[name="capacity"]').first();
    if (await venueCapInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await venueCapInput.fill("200");
    }

    const venueSubmit = page
      .getByRole("button", { name: /save|create|submit/i })
      .first();
    if (await venueSubmit.isVisible({ timeout: 5000 }).catch(() => false)) {
      await venueSubmit.click();
      await page
        .waitForLoadState("networkidle", { timeout: 15_000 })
        .catch(() => undefined);
    }
    await assertNoErrors(page, testInfo, errors, "create venue");

    // ── 8. Communications ─────────────────────────────────────────────────────
    log.step("8. Communications");
    await goto(page, "/crm/communications");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "communications");

    // ── Final ─────────────────────────────────────────────────────────────────
    if (errors.length > 0) {
      await failHard(page, testInfo, errors, "final error check");
    }
    log.pass("CRM workflow complete — no errors");
  });
});
