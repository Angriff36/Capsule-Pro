/**
 * Auth helpers for E2E tests.
 *
 * Uses Playwright's storageState pattern: a setup project authenticates
 * via Clerk and saves cookies/localStorage to e2e/.auth/user.json.
 * All other projects depend on it and reuse the stored auth state.
 *
 * Clerk SSR requires __session cookies — Bearer tokens don't work.
 * This approach ensures the full cookie jar (including __session,
 * __clerk_db_jwt, __client_uat) is present for every test.
 */

import { type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Path where the authenticated storage state is saved by auth.setup.ts */
export const AUTH_STORAGE_STATE_PATH = path.resolve(
  __dirname,
  "..",
  ".auth",
  "user.json"
);

/**
 * Wait for Clerk JS to initialize and become ready.
 *
 * Clerk loads asynchronously from cdn.clerk.com. The sign-in/sign-up
 * forms are rendered by Clerk's own JS — not server-rendered. Without
 * waiting, tests can hit the form before Clerk's SDK has mounted.
 *
 * @param page  Playwright Page
 * @param timeout  Max wait time in ms (default 15_000)
 */
export async function waitForClerk(
  page: Page,
  timeout = 15_000
): Promise<void> {
  await page.waitForFunction(
    () => Boolean((globalThis as any)?.Clerk?.client?.signIn),
    { timeout }
  );
}

/**
 * Wait for Clerk JS to initialize and the sign-up flow to be ready.
 * Same as `waitForClerk` but targets the signUp client.
 */
export async function waitForClerkSignUp(
  page: Page,
  timeout = 15_000
): Promise<void> {
  await page.waitForFunction(
    () => Boolean((globalThis as any)?.Clerk?.client?.signUp),
    { timeout }
  );
}

/**
 * Test user credentials for Clerk sign-in.
 *
 * These are Clerk test-mode credentials. The email code "424242" is a
 * Clerk test fixture — any code works in development.
 *
 * To change the test user, update these values and re-run the setup project.
 */
export const TEST_USER = {
  email: "jane+clerk_test@example.com",
  emailCode: "424242",
} as const;