/**
 * Playwright setup project — authenticates via Clerk and saves storageState.
 *
 * This runs before any test project. It:
 * 1. Launches a headless Chromium browser
 * 2. Navigates to the Clerk sign-in page
 * 3. Signs in using Clerk's testing API (email_code strategy)
 * 4. Saves the full storage state (cookies + localStorage) to e2e/.auth/user.json
 *
 * All authenticated test projects declare this as a dependency, so they
 * automatically get the Clerk __session cookie and related auth tokens.
 *
 * Usage:
 *   npx playwright test --project=setup          # run setup only
 *   npx playwright test                           # runs setup first, then tests
 */

import fs from "node:fs/promises";
import path from "node:path";
import { clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";
import { AUTH_STORAGE_STATE_PATH, TEST_USER } from "../helpers/auth";

const authFile = AUTH_STORAGE_STATE_PATH;

setup("authenticate via Clerk", async ({ page }) => {
  // Configure Playwright with Clerk test helpers
  await clerkSetup();

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:2221";
  const signInURL = new URL("/sign-in", baseURL).toString();

  console.log(`[AUTH SETUP] Navigating to: ${signInURL}`);
  await page.goto(signInURL);

  // Wait for Clerk JS to load on the sign-in page
  await page.waitForFunction(() => {
    const clerk = (globalThis as unknown as { Clerk?: unknown }).Clerk as
      | { client?: { signIn?: unknown } }
      | undefined;
    return Boolean(clerk?.client?.signIn);
  });

  // Sign in using Clerk's client-side API directly.
  // This avoids needing to interact with the UI widgets (which can be flaky).
  const status = await page.evaluate(
    async ({ email, code }: { email: string; code: string }) => {
      interface EmailCodeFactor {
        emailAddressId: string;
        safeIdentifier: string;
        strategy: "email_code";
      }

      const clerk = (globalThis as unknown as { Clerk?: unknown }).Clerk as
        | {
            client?: {
              signIn?: {
                create: (args: {
                  identifier: string;
                }) => Promise<{ supportedFirstFactors?: unknown[] }>;
                prepareFirstFactor: (args: {
                  strategy: "email_code";
                  emailAddressId: string;
                }) => Promise<void>;
                attemptFirstFactor: (args: {
                  strategy: "email_code";
                  code: string;
                }) => Promise<{ status: string; createdSessionId?: string }>;
              };
            };
            setActive?: (args: { session: string }) => Promise<void>;
          }
        | undefined;

      if (!clerk?.client?.signIn) {
        throw new Error("Clerk client not available on sign-in page");
      }

      const { signIn } = clerk.client;

      const resp = await signIn.create({ identifier: email });
      const factor = (resp.supportedFirstFactors ?? []).find(
        (ff): ff is EmailCodeFactor =>
          Boolean(ff) &&
          typeof ff === "object" &&
          (ff as Record<string, unknown>).strategy === "email_code" &&
          (ff as Record<string, unknown>).safeIdentifier === email
      );

      if (!factor?.emailAddressId) {
        throw new Error("email_code factor missing for test user");
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });

      const attempt = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (attempt.status === "complete" && attempt.createdSessionId) {
        await clerk.setActive?.({ session: attempt.createdSessionId });
      }

      return attempt.status;
    },
    { email: TEST_USER.email, code: TEST_USER.emailCode }
  );

  if (status !== "complete") {
    throw new Error(`Clerk sign-in failed (status=${status})`);
  }

  console.log("[AUTH SETUP] Sign-in complete");

  // Allow Clerk to persist session cookies
  await page.waitForTimeout(500);

  // Verify we got session cookies
  const cookies = await page.context().cookies();
  const hasSessionCookie = cookies.some((c) =>
    c.name.toLowerCase().includes("session")
  );
  expect(
    hasSessionCookie,
    "Expected __session cookie after Clerk sign-in"
  ).toBe(true);

  // Save storage state for dependent test projects
  await fs.mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });

  console.log(`[AUTH SETUP] Storage state saved to: ${authFile}`);
});
