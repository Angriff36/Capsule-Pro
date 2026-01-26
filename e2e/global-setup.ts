import fs from "node:fs/promises";
import { clerkSetup } from "@clerk/testing/playwright";
import { expect, type FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const storageStatePath = "e2e/.auth/storageState.json";
  const baseURL = config.projects[0]?.use?.baseURL;
  const emailAddress = "jane+clerk_test@example.com";
  const emailCode = "424242";

  invariant(
    typeof baseURL === "string" && baseURL.length > 0,
    "Playwright baseURL is not configured (missing in config)."
  );

  await fs.mkdir("e2e/.auth", { recursive: true });

  // Configure Playwright with Clerk
  await clerkSetup();

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const signInURL = new URL("/sign-in", baseURL).toString();
  console.log("[SETUP] Navigating to:", signInURL);
  await page.goto(signInURL);
  console.log("[SETUP] Current URL after navigation:", page.url());

  await page.waitForFunction(() => {
    const clerk = (globalThis as unknown as { Clerk?: unknown }).Clerk as
      | { client?: { signIn?: unknown } }
      | undefined;
    return Boolean(clerk?.client?.signIn);
  });

  const attemptStatus = await page.evaluate(
    async ({ email, code }) => {
      type EmailCodeFactor = {
        emailAddressId: string;
        safeIdentifier: string;
        strategy: "email_code";
      };

      const clerk = (globalThis as unknown as { Clerk?: unknown }).Clerk as
        | {
            client?: {
              signIn?: {
                create: (args: { identifier: string }) => Promise<{
                  supportedFirstFactors?: unknown[];
                }>;
                prepareFirstFactor: (args: {
                  strategy: "email_code";
                  emailAddressId: string;
                }) => Promise<void>;
                attemptFirstFactor: (args: {
                  strategy: "email_code";
                  code: string;
                }) => Promise<{ status: string }>;
              };
            };
          }
        | undefined;

      if (!clerk?.client?.signIn) {
        throw new Error("Clerk client is not available on the sign-in page");
      }

      const { signIn } = clerk.client;

      const signInResp = await signIn.create({ identifier: email });
      const factor = (signInResp.supportedFirstFactors ?? []).find(
        (ff): ff is EmailCodeFactor =>
          Boolean(ff) &&
          typeof ff === "object" &&
          (ff as { strategy?: unknown }).strategy === "email_code" &&
          (ff as { safeIdentifier?: unknown }).safeIdentifier === email
      );

      if (!factor?.emailAddressId) {
        throw new Error("email_code factor missing for test user");
      }

      const { emailAddressId } = factor;

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId,
      });

      const attemptResponse = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (attemptResponse.status === "complete") {
        const createdSessionId = (attemptResponse as {
          createdSessionId?: string;
        }).createdSessionId;

        if (!createdSessionId) {
          throw new Error("Clerk did not return createdSessionId on success");
        }

        await (clerk as {
          setActive?: (args: { session: string }) => Promise<void>;
        }).setActive?.({ session: createdSessionId });
      }

      return attemptResponse.status;
    },
    { email: emailAddress, code: emailCode }
  );

  invariant(
    attemptStatus === "complete",
    `Clerk email_code sign-in failed (status=${attemptStatus})`
  );

  console.log("[SETUP] Sign-in complete");

  // Allow Clerk to persist session cookies after setActive.
  await page.waitForTimeout(500);

  // Sanity: we should be authenticated (Clerk sets a session cookie).
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name.toLowerCase().includes("session"))).toBe(
    true
  );

  await page.context().storageState({ path: storageStatePath });
  await browser.close();
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
