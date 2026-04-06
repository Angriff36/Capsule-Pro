import { clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  await clerkSetup();
  const token = process.env.CLERK_TESTING_TOKEN;
  const fapi = process.env.CLERK_FAPI;
  console.log("FAPI:", fapi, "Token:", token?.substring(0, 20));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const fapiEscaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^https://${fapiEscaped}/v1/.*?(\\?.*)?$`);
  await context.route(regex, async (route) => {
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
  });

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
    if (!ef) return { status: s1.status, error: "no email_code" };
    await si.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: ef.emailAddressId,
    });
    const s2 = await si.attemptFirstFactor({
      strategy: "email_code",
      code: "424242",
    });
    console.log("Session:", s2.createdSessionId);

    if (s2.status === "complete" && s2.createdSessionId) {
      // Try SESSION (not sessionId) - per @clerk/testing/playwright pattern
      try {
        await c.setActive({ session: s2.createdSessionId });
        return { success: true, method: "session" };
      } catch (e1) {
        console.log("session failed:", e1.message);
      }

      // Try sessionId
      try {
        await c.setActive({ sessionId: s2.createdSessionId });
        return { success: true, method: "sessionId" };
      } catch (e2) {
        console.log("sessionId failed:", e2.message);
      }

      // Try session object
      try {
        await c.setActive({ session: { id: s2.createdSessionId } });
        return { success: true, method: "session object" };
      } catch (e3) {
        console.log("session object failed:", e3.message);
      }

      return { status: s2.status, sessionId: s2.createdSessionId };
    }
    return { status: s2.status };
  });

  console.log("Result:", JSON.stringify(result, null, 2));
  console.log("URL:", page.url());

  if (result?.success) {
    await page.goto(`${BASE}/events`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    await page.waitForTimeout(2000);
    console.log("Events URL:", page.url());
    const onEvents =
      page.url().includes("/events") && !page.url().includes("sign-in");
    console.log("Auth successful:", onEvents);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
