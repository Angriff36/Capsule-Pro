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

  const result = await page.evaluate(async () => {
    const c = window.Clerk;
    const si = c.client.signIn;
    const s1 = await si.create({ identifier: "jane+clerk_test@example.com" });
    const ef = s1.supportedFirstFactors?.find(
      (f) => f.strategy === "email_code"
    );
    if (!ef) return { error: "no email_code" };
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
      return { success: true };
    }
    return { error: s2.status };
  });
  if (!result?.success) throw new Error(`Auth failed: ${result?.error}`);

  // Collect console errors from the page
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(`${BASE}/events`, {
    waitUntil: "networkidle",
    timeout: 20_000,
  });
  await page.waitForTimeout(3000);
  console.log("URL:", page.url());

  // Get the error content
  const errorText = await page
    .locator("body")
    .innerText()
    .catch(() => "");
  console.log("Body text (first 500):", errorText.substring(0, 500));

  // Check network requests that failed
  const failedRequests = [];
  page.on("response", (resp) => {
    if (resp.status() >= 400)
      failedRequests.push(`${resp.status()} ${resp.url().substring(0, 100)}`);
  });

  await page.reload({ waitUntil: "networkidle", timeout: 15_000 });
  await page.waitForTimeout(2000);

  console.log("Failed requests:", failedRequests.slice(0, 10));
  console.log("Console errors:", errors.slice(0, 5));

  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
