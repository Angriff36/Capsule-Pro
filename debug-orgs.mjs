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

  const authResult = await page.evaluate(async () => {
    const c = window.Clerk;
    const si = c.client.signIn;
    const s1 = await si.create({ identifier: "jane+clerk_test@example.com" });
    const ef = s1.supportedFirstFactors?.find(f => f.strategy === "email_code");
    if (!ef) return { error: "no email_code" };
    await si.prepareFirstFactor({ strategy: "email_code", emailAddressId: ef.emailAddressId });
    const s2 = await si.attemptFirstFactor({ strategy: "email_code", code: "424242" });
    if (s2.status === "complete" && s2.createdSessionId) {
      await c.setActive({ session: s2.createdSessionId });
      return { success: true, sessionId: s2.createdSessionId };
    }
    return { error: s2.status };
  });
  
  if (!authResult?.success) throw new Error(`Auth failed: ${JSON.stringify(authResult)}`);

  // Check page errors
  const errors = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  // Navigate to events and capture what the page looks like
  await page.goto(`${BASE}/events`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(5000);
  
  const url = page.url();
  const h1 = await page.locator("h1, h2").allTextContents().catch(() => []);
  const eventCards = await page.locator('[data-testid*="event"]').count().catch(() => 0);
  const bodySnippet = (await page.locator("body").innerText().catch(() => "")).substring(0, 300);
  
  console.log("URL:", url);
  console.log("Headings:", h1.slice(0, 5));
  console.log("Event cards:", eventCards);
  console.log("Body snippet:", bodySnippet.substring(0, 200));
  console.log("Console errors:", errors.slice(0, 3));
  
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
