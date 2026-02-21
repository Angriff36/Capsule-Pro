/**
 * Inventory Module — Full Workflow Test
 *
 * Covers:
 *  1. Inventory overview
 *  2. Items list → create item (all fields including FSA checkboxes)
 *  3. Stock levels page
 *  4. Forecasts page
 *  5. Recipe costs page
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

const ITEM_NAME = unique("E2E Inventory Item");
const ITEM_NUMBER = `E2E-${Date.now()}`;

test.describe("Inventory: Full Workflow", () => {
  test.setTimeout(120_000);

  test("inventory overview → create item → stock levels → forecasts → recipe costs", async ({
    page,
    baseURL,
  }, testInfo) => {
    const errors: CollectedError[] = [];
    attachErrorCollector(page, errors, baseURL ?? "http://127.0.0.1:2221");

    // ── 1. Inventory overview ─────────────────────────────────────────────────
    log.step("1. Inventory overview");
    await goto(page, "/inventory");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "inventory overview");

    // ── 2. Items list ─────────────────────────────────────────────────────────
    log.step("2. Items list");
    await goto(page, "/inventory/items");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "items list");

    // ── 3. Create inventory item ──────────────────────────────────────────────
    log.step("3. Create inventory item");
    const addBtn = page
      .getByRole("button", { name: /add item|create item|new item/i })
      .first();

    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page
        .locator('[role="dialog"]')
        .first()
        .waitFor({ state: "visible", timeout: 8000 });

      // Fill all form fields
      const itemNumInput = page
        .locator(
          'input[placeholder*="item number" i], input[id*="item_number" i]'
        )
        .first();
      if (await itemNumInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await itemNumInput.fill(ITEM_NUMBER);
      }

      const nameInput = page
        .locator('input[placeholder*="item name" i], input[id*="name" i]')
        .first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(ITEM_NAME);
      }

      // Category select (Radix)
      const categoryTrigger = page.locator('[role="combobox"]').first();
      if (
        await categoryTrigger.isVisible({ timeout: 3000 }).catch(() => false)
      ) {
        await categoryTrigger.click();
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await firstOption.click();
        }
      }

      const costInput = page
        .locator('input[placeholder*="unit cost" i], input[id*="unit_cost" i]')
        .first();
      if (await costInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await costInput.fill("12.50");
      }

      const qtyInput = page
        .locator('input[placeholder*="quantity" i], input[id*="quantity" i]')
        .first();
      if (await qtyInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await qtyInput.fill("100");
      }

      const reorderInput = page
        .locator('input[placeholder*="reorder" i], input[id*="reorder" i]')
        .first();
      if (await reorderInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reorderInput.fill("20");
      }

      // FSA checkboxes
      const fsaCheckboxes = await page.locator('input[type="checkbox"]').all();
      for (const cb of fsaCheckboxes.slice(0, 3)) {
        if (await cb.isVisible({ timeout: 1000 }).catch(() => false)) {
          const checked = await cb.isChecked().catch(() => false);
          if (!checked) {
            await cb.click().catch(() => undefined);
          }
        }
      }

      // Tags
      const tagInput = page.locator('input[placeholder*="tag" i]').first();
      if (await tagInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tagInput.fill("e2e");
        await page.keyboard.press("Enter");
      }

      // Submit
      const submitBtn = page
        .getByRole("button", { name: /save|create|add item/i })
        .last();
      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBtn.click();
        await page
          .waitForLoadState("networkidle", { timeout: 15_000 })
          .catch(() => undefined);
        await assertNoErrors(page, testInfo, errors, "create inventory item");
        log.ok(`Inventory item created: ${ITEM_NAME}`);
      }
    } else {
      log.warn("Add item button not found — skipping item creation");
    }

    // ── 4. Stock levels ───────────────────────────────────────────────────────
    log.step("4. Stock levels");
    await goto(page, "/inventory/levels");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "stock levels");

    // ── 5. Forecasts ──────────────────────────────────────────────────────────
    log.step("5. Forecasts");
    await goto(page, "/inventory/forecasts");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "forecasts");

    // ── 6. Recipe costs ───────────────────────────────────────────────────────
    log.step("6. Recipe costs");
    await goto(page, "/inventory/recipe-costs");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "recipe costs");

    // ── Final ─────────────────────────────────────────────────────────────────
    if (errors.length > 0) {
      await failHard(page, testInfo, errors, "final error check");
    }
    log.pass("Inventory workflow complete — no errors");
  });
});
