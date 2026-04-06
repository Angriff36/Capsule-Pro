import { createClerkClient } from "@clerk/backend";
import { clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";
const clerk = createClerkClient({
  secretKey: "sk_test_8hldxeqOyMCZV62r6ves3vMapWwko8Qfl1qa2FOGHr",
});

async function main() {
  // Get user
  const users = await clerk.users.getUserList({ limit: 10 });
  const nexus = users.data.find(
    (u) => u.emailAddresses[0]?.emailAddress === "nexusqatest@example.com"
  );

  // Create ticket
  const token = await clerk.signInTokens.createSignInToken({
    userId: nexus.id,
    expiresInSeconds: 300,
  });
  console.log("Ticket created:", token.token.substring(0, 50) + "...");

  // Setup Clerk testing - intercepts Clerk FAPI and injects testing token
  await clerkSetup();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Intercept Clerk API calls and inject testing token
  const fapiUrl = "assured-ray-89.clerk.accounts.dev";
  await context.route(`https://${fapiUrl}/v1/*`, async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set(
      "__clerk_testing_token",
      process.env.CLERK_TESTING_TOKEN
    );
    try {
      const response = await route.fetch({ url: url.toString() });
      const json = await response.json();
      // Mark as bypassed for Clerk
      if (json?.response?.captcha_bypass === false)
        json.response.captcha_bypass = true;
      if (json?.client?.captcha_bypass === false)
        json.client.captcha_bypass = true;
      await route.fulfill({ response, json });
    } catch {
      await route.continue();
    }
  });

  await page.goto(`${BASE}/sign-in`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(4000);

  const result = await page.evaluate(async (ticketStr) => {
    const c = window.Clerk;
    const si = c.client.signIn;

    const s = await si.create({ strategy: "ticket", ticket: ticketStr });
    console.log("SignIn status:", s.status, "session:", s.createdSessionId);

    if (s.status === "complete" && s.createdSessionId) {
      await c.setActive({ sessionId: s.createdSessionId });
      return { success: true, sessionId: s.createdSessionId };
    }
    return { status: s.status, createdSessionId: s.createdSessionId };
  }, token.token);

  console.log("Result:", JSON.stringify(result));
  console.log("URL:", page.url());

  if (result.success) {
    await page.goto(`${BASE}/events`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    await page.waitForTimeout(2000);
    console.log("Events URL:", page.url());
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
