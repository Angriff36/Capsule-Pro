import { chromium } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  const { browser, context, page } = await (async () => {
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
      const c = window.Clerk;
      const si = c.client.signIn;
      const s1 = await si.create({ identifier: "jane+clerk_test@example.com" });
      const ef = s1.supportedFirstFactors?.find(f => f.strategy === "email_code");
      if (!ef) return;
      await si.prepareFirstFactor({ strategy: "email_code", emailAddressId: ef.emailAddressId });
      const s2 = await si.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      if (s2.status === "complete" && s2.createdSessionId) await c.setActive({ session: s2.createdSessionId });
    });
    return { browser, context, page };
  })();

  try {
    await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(5000);
    console.log("URL:", page.url());
    console.log("Title:", await page.title());
    
    const h1 = await page.locator("h1, h2, h3").allTextContents();
    console.log("Headings:", h1.slice(0, 5));
    
    const inputs = await page.locator("input").count();
    console.log("Total inputs:", inputs);
    
    // Show visible inputs
    for (const inp of await page.locator("input").all()) {
      try {
        const vis = await inp.isVisible();
        if (vis) {
          const name = await inp.getAttribute("name");
          console.log(`  VISIBLE: name="${name}"`);
        }
      } catch {}
    }
    
    // Body text
    const body = await page.locator("body").innerText();
    console.log("\nBody text:", body.substring(0, 500));
    
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
