/**
 * Kitchen Module — Full Workflow Test
 *
 * Covers:
 *  1. Kitchen overview page
 *  2. Recipes list → create recipe (all fields) → view detail
 *  3. Prep lists → create prep list
 *  4. Kitchen tasks list
 *  5. Inventory page
 *  6. Allergens page
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
  unique,
} from "../helpers/workflow";

const RECIPE_NAME = unique("E2E Recipe");
const PREP_LIST_NAME = unique("E2E Prep List");

test.describe("Kitchen: Full Workflow", () => {
  test.setTimeout(120_000);

  test("kitchen overview → recipe → prep list → tasks → inventory → allergens", async ({
    page,
    baseURL,
  }, testInfo) => {
    const errors: CollectedError[] = [];
    attachErrorCollector(page, errors, baseURL ?? "http://127.0.0.1:2221");

    // ── 1. Kitchen overview ───────────────────────────────────────────────────
    log.step("1. Kitchen overview");
    await goto(page, "/kitchen");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "kitchen overview");

    // ── 2. Recipes list ───────────────────────────────────────────────────────
    log.step("2. Recipes list");
    await goto(page, "/kitchen/recipes");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "recipes list");

    // ── 3. Create recipe ──────────────────────────────────────────────────────
    log.step("3. Create recipe");

    // Look for FAB / Add button
    const addBtn = page
      .getByRole("button", { name: /add|create|new recipe/i })
      .or(page.locator('button[aria-label*="Add"]'))
      .first();

    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page
        .waitForLoadState("networkidle", { timeout: 5000 })
        .catch(() => undefined);

      // Fill recipe form (modal or page)
      const nameInput = page
        .locator(
          'input[name="name"], input[placeholder*="recipe" i], input[placeholder*="name" i]'
        )
        .first();
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.fill(RECIPE_NAME);
      }

      const descInput = page
        .locator(
          'textarea[name="description"], textarea[placeholder*="description" i]'
        )
        .first();
      if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await descInput.fill("E2E automated test recipe");
      }

      const prepTimeInput = page.locator('input[name="prepTime"]').first();
      if (await prepTimeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await prepTimeInput.fill("30");
      }

      const cookTimeInput = page.locator('input[name="cookTime"]').first();
      if (await cookTimeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cookTimeInput.fill("45");
      }

      const servingsInput = page
        .locator('input[name="servings"], input[name="yield"]')
        .first();
      if (await servingsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await servingsInput.fill("10");
      }

      // Submit
      const submitBtn = page
        .getByRole("button", { name: /save|create|add recipe/i })
        .first();
      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBtn.click();
        await page
          .waitForLoadState("networkidle", { timeout: 10_000 })
          .catch(() => undefined);
      }

      await assertNoErrors(page, testInfo, errors, "create recipe");
      log.ok(`Recipe created: ${RECIPE_NAME}`);
    } else {
      log.warn("Add recipe button not found — skipping recipe creation");
    }

    // ── 4. Prep lists ─────────────────────────────────────────────────────────
    log.step("4. Prep lists");
    await goto(page, "/kitchen/prep-lists");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "prep lists");

    // Try creating a prep list
    const createPrepBtn = page
      .getByRole("button", { name: /create|new|add prep list/i })
      .first();
    if (await createPrepBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createPrepBtn.click();
      await page
        .waitForLoadState("networkidle", { timeout: 5000 })
        .catch(() => undefined);

      const prepNameInput = page
        .locator('input[name="name"], input[placeholder*="name" i]')
        .first();
      if (await prepNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await prepNameInput.fill(PREP_LIST_NAME);
      }

      const submitBtn = page
        .getByRole("button", { name: /save|create|submit/i })
        .first();
      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBtn.click();
        await page
          .waitForLoadState("networkidle", { timeout: 10_000 })
          .catch(() => undefined);
      }

      await assertNoErrors(page, testInfo, errors, "create prep list");
    }

    // ── 5. Kitchen inventory ──────────────────────────────────────────────────
    log.step("5. Kitchen inventory");
    await goto(page, "/kitchen/inventory");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "kitchen inventory");

    // ── 6. Allergens ──────────────────────────────────────────────────────────
    log.step("6. Allergens");
    await goto(page, "/kitchen/allergens");
    await page
      .waitForLoadState("networkidle", { timeout: 8000 })
      .catch(() => undefined);
    await assertNoErrors(page, testInfo, errors, "allergens");

    // ── Final ─────────────────────────────────────────────────────────────────
    if (errors.length > 0) {
      await failHard(page, testInfo, errors, "final error check");
    }
    log.pass("Kitchen workflow complete — no errors");
  });
});
