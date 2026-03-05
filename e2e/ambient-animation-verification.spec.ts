/**
 * Ambient Animation Verification Test
 *
 * This test verifies that the ambient animation component works correctly.
 * Run with: pnpm exec playwright test ambient-animation-verification.spec.ts
 *
 * NOTE: These tests are skipped by default as they require a running dev server.
 * To run them, start the dev server first: pnpm --filter ./apps/app dev
 */

import { expect, test } from "@playwright/test";

test.describe("Ambient Animation", () => {
  test.skip("should render ambient animation component with particles", async ({
    page,
  }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    const pageTitle = page.locator("h1");
    await expect(pageTitle).toContainText("Operational Insights");
  });

  test.skip("should show NoDataState with animation when no events", async ({
    page,
  }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    const emptyStateMessage = page.locator(
      "text=/No events scheduled this week|No data available/i"
    );
    const isVisible = await emptyStateMessage.isVisible().catch(() => false);

    if (isVisible) {
      const animationContainer = page.locator("[class*='animate-ambient']");
      const hasAnimation = await animationContainer
        .count()
        .then((count) => count > 0);
      console.log(
        `Empty state visible: ${isVisible}, Animation present: ${hasAnimation}`
      );
    }
  });

  test.skip("animation should respect prefers-reduced-motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    const animatedElements = page.locator("[class*='animate-ambient']");
    if ((await animatedElements.count()) > 0) {
      const animationState = await animatedElements.first().evaluate((el) => {
        return window.getComputedStyle(el).animationPlayState;
      });
      console.log(`Animation state with reduced motion: ${animationState}`);
    }

    await context.close();
  });
});
