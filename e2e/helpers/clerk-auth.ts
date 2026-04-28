/**
 * Clerk-specific Playwright helpers for E2E tests.
 *
 * Clerk renders its sign-in / sign-up forms asynchronously from cdn.clerk.com
 * inside iframes. The form fields are NOT server-rendered — they appear after
 * Clerk's JS executes. Tests that interact with Clerk form elements MUST wait for
 * them, otherwise they'll hit stale element errors or strict mode violations.
 *
 * Usage in a test:
 *   await waitForClerkInput(page);
 *   await page.locator('input[type="email"]').first().fill(TEST_USER.email);
 *   await waitForClerkSubmit(page);
 *   await page.locator('button[type="submit"]').first().click();
 *
 * Ref: docs/clerk-e2e-debug-findings.md
 */

import type { Page } from "@playwright/test";

/**
 * Wait for Clerk's async form to be fully rendered and interactive.
 *
 * Checks two things:
 * 1. Clerk's SDK has initialised (window.Clerk.client.signIn is truthy)
 * 2. The email input field is present in the DOM and enabled
 *
 * Use this before attempting to fill Clerk form fields.
 *
 * @param page   Playwright Page
 * @param timeout_ms  Max wait time (default 20_000 — Clerk CDN can be slow in CI)
 */
export async function waitForClerkInput(
  page: Page,
  timeout_ms = 20_000
): Promise<void> {
  // Wait for Clerk SDK to be ready
  await page.waitForFunction(
    () => Boolean((globalThis as any)?.Clerk?.client?.signIn),
    { timeout: timeout_ms }
  );

  // Clerk renders email input inside its iframe. Wait for it to be visible and enabled.
  // Use a longer timeout here because the iframe content loads after the page JS.
  await expect(
    page.locator("input[type='email'], input[name='email']").first()
  ).toBeEnabled({
    timeout: timeout_ms,
  });
}

/**
 * Wait for Clerk's submit button to be visible and enabled.
 *
 * Clerk may disable the submit button until required fields are filled.
 * After filling form fields, call this before clicking submit to avoid
 * clicking a disabled button.
 *
 * @param page   Playwright Page
 * @param timeout_ms  Max wait time (default 20_000)
 */
export async function waitForClerkSubmit(
  page: Page,
  timeout_ms = 20_000
): Promise<void> {
  // Wait for the submit button to be both visible and enabled (not disabled)
  const submitButton = page.locator('button[type="submit"]').first();

  await submitButton.waitFor({ state: "visible", timeout: timeout_ms });
  await expect(submitButton).toBeEnabled({ timeout: timeout_ms });
}

/**
 * Clear all Clerk session state from the browser context.
 *
 * Use this before navigating to /sign-in or /sign-up when you want to test
 * the unauthenticated form render. Without clearing, Clerk redirects
 * authenticated users away before the form can render.
 *
 * @param page   Playwright Page
 */
export async function clearClerkSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  // Also clear Clerk's client-side state from localStorage/sessionStorage
  await page.evaluate(() => {
    const clerkKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith("__clerk")
    );
    clerkKeys.forEach((k) => localStorage.removeItem(k));
  });
}

/**
 * Assert Clerk SDK loaded without throwing a fatal error.
 *
 * Call this after navigating to a Clerk-protected route to confirm
 * Clerk initialised correctly. Use in error-context snapshots.
 *
 * @param page   Playwright Page
 */
export async function assertClerkLoaded(page: Page): Promise<void> {
  const clerkLoaded = await page.evaluate(() =>
    Boolean((globalThis as any)?.Clerk?.load)
  );
  if (!clerkLoaded) {
    throw new Error("Clerk SDK did not load on this page");
  }
}

// Re-export waitForClerk for convenience (used alongside these helpers)
export { waitForClerk } from "./auth";

// Playwright utilities used in this file — imported lazily to avoid import errors in non-test code
import { expect } from "@playwright/test";
