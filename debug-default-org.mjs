import { chromium } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  await clerkSetup();
  const token = process.env.CLERK_TESTING_TOKEN;
  const fapi = process.env.CLERK_FAPI;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await context.route(new RegExp(`^https://${escaped}/v1/.*?(\\?.*)?$`), async route => {
    const url = new URL(route.request().url());
    url.searchParams.set("__clerk_testing_token", token || "");
    try {
      const resp = await route.fetch({ url: url.toString() });
      let json;
      try { json = await resp.json(); } catch { json = {}; }
      if (json?.response?.captcha_bypass === false) json.response.captcha_bypass = true;
      if (json?.client?.captcha_bypass === false) json.client.captcha_bypass = true;
      await route.fulfill({ response: resp, json });
    } catch { await route.continue(); }
  });

  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(4000);

  const result = await page.evaluate(async () => {
    const c = (window).Clerk;
    const si = c.client.signIn;
    const s1 = await si.create({ identifier: "jane+clerk_test@example.com" });
    const ef = s1.supportedFirstFactors?.find(f => f.strategy === "email_code");
    if (!ef) return { error: "no email_code" };
    await si.prepareFirstFactor({ strategy: "email_code", emailAddressId: ef.emailAddressId });
    const s2 = await si.attemptFirstFactor({ strategy: "email_code", code: "424242" });
    if (s2.status === "complete" && s2.createdSessionId) {
      await c.setActive({ session: s2.createdSessionId });
      return { 
        success: true, 
        sessionId: s2.createdSessionId,
        orgId: c.session?.orgs?.[0]?.id,
        orgsCount: c.session?.orgs?.length,
      };
    }
    return { error: s2.status };
  });
  
  console.log("Auth result:", JSON.stringify(result, null, 2));

  await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log("Events URL:", page.url());
  const h1 = await page.locator("h1, h2").allTextContents();
  console.log("Headings:", h1.slice(0, 5));

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
