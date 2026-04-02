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
  await page.evaluate(async () => {
    const c = (window).Clerk;
    const si = c.client.signIn;
    const s1 = await si.create({ identifier: "jane+clerk_test@example.com" });
    const ef = s1.supportedFirstFactors?.find(f => f.strategy === "email_code");
    if (ef) {
      await si.prepareFirstFactor({ strategy: "email_code", emailAddressId: ef.emailAddressId });
      const s2 = await si.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (s2.status === "complete" && s2.createdSessionId) {
        await c.setActive({ session: s2.createdSessionId });
      }
    }
  });
  await page.waitForTimeout(2000);

  // Intercept ALL requests to find the failing one
  let allRequests = [];
  await context.route(/./, async route => {
    const url = route.request().url();
    if (url.includes("/api/") || url.includes("clerk") || url.includes("database") || url.includes("capsule")) {
      allRequests.push({ url: url.substring(0, 100), method: route.request().method() });
    }
    await route.continue();
  });

  await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  
  console.log("All intercepted requests:");
  for (const req of allRequests.slice(0, 30)) {
    console.log(`  ${req.method} ${req.url}`);
  }
  
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
