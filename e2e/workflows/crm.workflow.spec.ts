/**
 * CRM Module — Full Workflow Test
 *
 * Covers:
 *  1. CRM overview
 *  2. Clients list
 *  3. Client detail tabs (requires at least one client in DB)
 *  4. Create proposal with line item → verify redirect
 *  5. Proposals list shows created proposal
 *  6. Create venue → verify toast + redirect
 *  7. Communications page
 */

import { expect, test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  assertVisible,
  attachErrorCollector,
  BASE_URL,
  fillById,
  goto,
  unique,
} from "../helpers/workflow";

const PROPOSAL_TITLE = unique("ProposalE2E");
const VENUE_NAME = unique("VenueE2E");
const EVENT_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

test.describe("CRM: Full Workflow", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  test("CRM overview loads", async ({ page }, testInfo) => {
    await goto(page, "/crm");
    await assertVisible(page, /crm|clients|proposals/i);
    await assertNoErrors(page, testInfo, errors, "crm overview");
  });

  test("clients list loads", async ({ page }, testInfo) => {
    await goto(page, "/crm/clients");
    await expect(page).toHaveURL(/crm\/clients/);
    await assertNoErrors(page, testInfo, errors, "clients list");
  });

  test.fixme(
    "create client — no UI form exists at /crm/clients/new (returns 404)",
    async () => {
      // /crm/clients/new → 404. The [id] route catches "new" and calls notFound().
      // No client creation form exists in the UI. Skipping until implemented.
    }
  );

  test("client detail tabs all render", async ({ page }, testInfo) => {
    await goto(page, "/crm/clients");

    // Require at least one client row — fail clearly if DB is empty
    const firstClientRow = page.locator("table tbody tr").first();
    await expect(firstClientRow).toBeVisible({ timeout: 10_000 });

    await firstClientRow.click();
    await expect(page).toHaveURL(/crm\/clients\/[a-z0-9-]+/, {
      timeout: 10_000,
    });

    // Click through each tab and assert the tab panel becomes visible
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click();
      // Each tab must activate a visible tab panel — hard fail if not
      const panel = page.locator('[role="tabpanel"]');
      await expect(panel).toBeVisible({ timeout: 5000 });
    }

    await assertNoErrors(page, testInfo, errors, "client detail tabs");
  });

  test("create proposal with line item", async ({ page }, testInfo) => {
    await goto(page, "/crm/proposals/new");

    await page.locator('input[name="title"]').fill(PROPOSAL_TITLE);
    await page.locator('input[name="eventDate"]').fill(EVENT_DATE);
    await page.locator('input[name="guestCount"]').fill("50");
    await page.locator('textarea[name="notes"]').fill("E2E test proposal");

    // Add a line item
    await page.locator("input#new-item-desc").fill("E2E Line Item");
    await page.locator("input#new-item-qty").fill("2");
    await page.locator("input#new-item-price").fill("500");
    await page.getByRole("button", { name: /add item/i }).click();

    await page.locator('button[type="submit"]').click();

    // Success: router.push to /crm/proposals/{id}
    await expect(page).toHaveURL(/crm\/proposals\/[a-z0-9-]+/, {
      timeout: 15_000,
    });
    await expect(page.getByText(PROPOSAL_TITLE)).toBeVisible({
      timeout: 10_000,
    });

    await assertNoErrors(page, testInfo, errors, "create proposal");
  });

  test("proposals list shows created proposal", async ({ page }, testInfo) => {
    await goto(page, "/crm/proposals");
    await expect(page.getByText(PROPOSAL_TITLE)).toBeVisible({
      timeout: 15_000,
    });
    await assertNoErrors(page, testInfo, errors, "proposals list");
  });

  test("create venue", async ({ page }, testInfo) => {
    await goto(page, "/crm/venues/new");

    await fillById(page, "name", VENUE_NAME);
    await fillById(page, "capacity", "200");
    await fillById(page, "contactName", "E2E Contact");
    await fillById(page, "contactEmail", "e2e-venue@capsule-test.example.com");

    await page.locator('button[type="submit"]').click();

    // Success: toast then redirect to /crm/venues/{id}
    await expect(page.getByText(/venue created/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/crm\/venues\/[a-z0-9-]+/, {
      timeout: 10_000,
    });

    await assertNoErrors(page, testInfo, errors, "create venue");
  });

  test("communications page loads", async ({ page }, testInfo) => {
    await goto(page, "/crm/communications");
    await expect(page).toHaveURL(/crm\/communications/);
    await assertNoErrors(page, testInfo, errors, "communications");
  });
});
