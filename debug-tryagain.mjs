import { clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  await clerkSetup();
  const token = process.env.CLERK_TESTING_TOKEN;
  const fapi = process.env.CLERK_FAPI;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await context.route(
    new RegExp(`^https://${escaped}/v1/.*?(\\?.*)?$`),
    async (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("__clerk_testing_token", token || "");
      try {
        const resp = await route.fetch({ url: url.toString() });
        let json;
        try {
          json = await resp.json();
        } catch {
          json = {};
        }
        if (json?.response?.captcha_bypass === false)
          json.response.captcha_bypass = true;
        if (json?.client?.captcha_bypass === false)
          json.client.captcha_bypass = true;
        await route.fulfill({ response: resp, json });
      } catch {
        await route.continue();
      }
    }
  );

  await page.goto(`${BASE}/sign-in`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(4000);
  await page.evaluate(async () => {
    const c = window.Clerk;
    const si = c.client.signIn;
    const s1 = await si.create({ identifier: "jane+clerk_test@example.com" });
    const ef = s1.supportedFirstFactors?.find(
      (f) => f.strategy === "email_code"
    );
    if (ef) {
      await si.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: ef.emailAddressId,
      });
      const s2 = await si.attemptFirstFactor({
        strategy: "email_code",
        code: "424242",
      });
      if (s2.status === "complete" && s2.createdSessionId) {
        await c.setActive({ session: s2.createdSessionId });
      }
    }
  });
  await page.waitForTimeout(1000);

  // Intercept ALL API calls from the events page to see which one fails
  const failedRequests = [];
  await context.route(/\/api\//, async (route) => {
    try {
      const resp = await route.fetch();
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        failedRequests.push({
          url: route.request().url(),
          status: resp.status,
          body: body.substring(0, 200),
        });
      }
      await route.continue();
    } catch (e) {
      failedRequests.push({ url: route.request().url(), error: e.message });
      await route.continue();
    }
  });

  await page.goto(`${BASE}/events`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(3000);
  console.log("URL:", page.url());
  const h1 = await page
    .locator("h1")
    .textContent()
    .catch(() => "none");
  console.log("Heading:", h1);

  // Try "Try again"
  const tryAgain = page.locator("button:has-text('Try again')");
  if (await tryAgain.isVisible()) {
    console.log("Clicking Try again...");
    await tryAgain.click();
    await page.waitForTimeout(5000);
    const h1After = await page
      .locator("h1")
      .textContent()
      .catch(() => "none");
    console.log("After retry heading:", h1After);
  }

  console.log(
    "\nFailed API requests:",
    JSON.stringify(failedRequests, null, 2)
  );

  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
