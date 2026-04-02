import { chromium } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

const BASE = "https://capsule-pro-app.vercel.app";
const EVENT_ID = "321bb0cf-a527-484c-9051-2b73c8dd6e76";

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

  // Check battle board page
  console.log(`Checking board page: /events/${EVENT_ID}/battle-board`);
  await page.goto(`${BASE}/events/${EVENT_ID}/battle-board`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  const boardH1 = await page.locator("h1").textContent().catch(() => "none");
  const boardBody = await page.locator("body").innerText();
  console.log(`Board heading: ${boardH1}`);
  console.log(`Board body (first 300): ${boardBody.substring(0, 300)}`);
  
  // Check if board is visible
  const boardContent = await page.content();
  const hasError = boardContent.includes("Oops");
  const hasBoard = boardContent.includes("board") || boardContent.includes("Board");
  console.log(`Has error: ${hasError}, Has board content: ${hasBoard}`);

  // Check /staff page too
  console.log(`\nChecking /staff page:`);
  await page.goto(`${BASE}/staff`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  const staffH1 = await page.locator("h1").textContent().catch(() => "none");
  const staffBody = await page.locator("body").innerText();
  console.log(`Staff heading: ${staffH1}`);
  console.log(`Staff body (first 200): ${staffBody.substring(0, 200)}`);

  // Check /employees
  console.log(`\nChecking /employees page:`);
  await page.goto(`${BASE}/employees`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  const empH1 = await page.locator("h1").textContent().catch(() => "none");
  const empBody = await page.locator("body").innerText();
  console.log(`Employees heading: ${empH1}`);
  console.log(`Employees body (first 200): ${empBody.substring(0, 200)}`);

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
