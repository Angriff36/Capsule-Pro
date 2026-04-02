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
      return { success: true };
    }
    return { error: s2.status };
  });
  if (!result?.success) throw new Error("Auth failed");

  // Go to /events
  await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log("Events URL:", page.url());

  // List all buttons
  const buttons = await page.locator("button").all();
  console.log(`Buttons (${buttons.length}):`);
  for (const btn of buttons) {
    try {
      const txt = await btn.textContent();
      const vis = await btn.isVisible();
      if (vis && txt?.trim()) console.log(`  "${txt.trim().substring(0, 60)}"`);
    } catch {}
  }

  // List all inputs
  const inputs = await page.locator("input").all();
  console.log(`\nInputs (${inputs.length}):`);
  for (const inp of inputs) {
    try {
      const vis = await inp.isVisible();
      const name = await inp.getAttribute("name");
      const id = await inp.getAttribute("id");
      const type = await inp.getAttribute("type");
      const ph = await inp.getAttribute("placeholder");
      if (vis) console.log(`  vis=true name="${name}" id="${id}" type="${type}" ph="${ph}"`);
    } catch {}
  }

  // Check for FAB
  const fab = page.locator("button.fixed.bottom-6.right-6, button.rounded-full.bg-primary").first();
  console.log(`\nFAB: ${await fab.isVisible().catch(() => false)}`);

  // Go to /events/new and check
  await page.goto(`${BASE}/events/new`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log("\n/events/new URL:", page.url());

  const inputsNew = await page.locator("input").all();
  console.log(`Inputs on /events/new (${inputsNew.length}):`);
  for (const inp of inputsNew) {
    try {
      const vis = await inp.isVisible();
      const name = await inp.getAttribute("name");
      const id = await inp.getAttribute("id");
      const type = await inp.getAttribute("type");
      if (vis) console.log(`  vis=true name="${name}" id="${id}" type="${type}"`);
    } catch {}
  }

  const headings = await page.locator("h1, h2, h3").allTextContents();
  console.log(`\nHeadings: ${JSON.stringify(headings.slice(0, 5))}`);

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
