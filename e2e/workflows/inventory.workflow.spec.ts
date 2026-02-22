/**
 * Inventory Module — Full Workflow Test
 *
 * Covers:
 *  1. Inventory overview
 *  2. Items list loads
 *  3. Create inventory item via dialog (fill + submit + verify toast + verify list)
 *  4. Stock levels page
 *  5. Forecasts page
 *  6. Recipe costs page
 */

import { expect, test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  assertNoErrors,
  attachErrorCollector,
  BASE_URL,
  goto,
  unique,
} from "../helpers/workflow";

const ITEM_NAME = unique("ItemE2E");
const ITEM_NUMBER = `INV-E2E-${Date.now()}`;

test.describe("Inventory: Full Workflow", () => {
  let errors: CollectedError[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    attachErrorCollector(page, errors, BASE_URL);
  });

  test("inventory overview loads", async ({ page }, testInfo) => {
    await goto(page, "/inventory");
    await expect(page).toHaveURL(/\/inventory/);
    await assertNoErrors(page, testInfo, errors, "inventory overview");
  });

  test("items list loads", async ({ page }, testInfo) => {
    await goto(page, "/inventory/items");
    await expect(page).toHaveURL(/inventory\/items/);
    await assertNoErrors(page, testInfo, errors, "items list");
  });

  test("create inventory item via dialog", async ({ page }, testInfo) => {
    await goto(page, "/inventory/items");

    // Open create dialog
    await page.getByRole("button", { name: /new item|create item/i }).click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Fill required fields — hard fail if missing
    await page.locator("input#item_number").fill(ITEM_NUMBER);
    await page.locator("input#name").fill(ITEM_NAME);
    await page.locator("input#unit_cost").fill("12.50");
    await page.locator("input#quantity_on_hand").fill("100");

    // Submit — actually create the item
    await dialog.locator('button[type="submit"]').click();

    // Verify success toast
    await expect(page.getByText(/inventory item created/i)).toBeVisible({
      timeout: 15_000,
    });

    // Verify item appears in the list
    await expect(page.getByText(ITEM_NAME)).toBeVisible({ timeout: 10_000 });

    await assertNoErrors(page, testInfo, errors, "create inventory item");
  });

  test("stock levels page loads", async ({ page }, testInfo) => {
    await goto(page, "/inventory/levels");
    await expect(page).toHaveURL(/inventory\/levels/);
    await assertNoErrors(page, testInfo, errors, "stock levels");
  });

  test("forecasts page loads", async ({ page }, testInfo) => {
    await goto(page, "/inventory/forecasts");
    await expect(page).toHaveURL(/inventory\/forecasts/);
    await assertNoErrors(page, testInfo, errors, "forecasts");
  });

  test("recipe costs page loads", async ({ page }, testInfo) => {
    await goto(page, "/inventory/recipe-costs");
    await expect(page).toHaveURL(/inventory\/recipe-costs/);
    await assertNoErrors(page, testInfo, errors, "recipe costs");
  });
});
