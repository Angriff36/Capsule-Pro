/**
 * Debug: Events list vs search discrepancy
 */
import { chromium } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

const BASE = "https://capsule-pro-app.vercel.app";

async function createContext() {
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
    if (s2.status === "complete" && s2.createdSessionId) {
      await c.setActive({ session: s2.createdSessionId });
    }
  });
  
  const sessionToken = await page.evaluate(async () => {
    try { return await window.Clerk.session.getToken(); } catch { return null; }
  });
  if (sessionToken) {
    await context.addCookies([{
      name: "__session", value: sessionToken,
      domain: ".capsule-pro-app.vercel.app", path: "/",
      httpOnly: true, secure: true, sameSite: "Lax",
    }]);
  }

  return { browser, context, page };
}

async function main() {
  const { browser, context, page } = await createContext();

  try {
    // Get events via API
    const eventsResult = await page.evaluate(async () => {
      const r = await fetch("/api/events", { credentials: "include" });
      const json = await r.json();
      return { status: r.status, data: json };
    });
    const events = eventsResult.data?.data || eventsResult.data || [];
    console.log("API events count:", events.length);
    const titles = events.map(e => e.title).slice(0, 5);
    console.log("Titles:", titles);

    const LATEST = "QA Nexus Event 1775103971072";
    
    // ── List page ─────────────────────────────────────────────────
    console.log("\n📋 Events list page:");
    await page.goto(`${BASE}/events`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(3000);
    
    // Check what's visible
    const eventCards = await page.locator('[data-testid*="event"]').count();
    const eventCardTexts = await page.locator('[data-testid*="event"]').allTextContents().catch(() => []);
    console.log("   Event cards (data-testid):", eventCards);
    
    // Check for any text containing event titles
    const bodyText = await page.locator("body").innerText();
    const hasLatest = bodyText.includes(LATEST);
    console.log(`   Body includes latest event title: ${hasLatest}`);
    console.log(`   Body first 500 chars: ${bodyText.substring(0, 500)}`);
    
    // Check URL
    console.log("   URL:", page.url());
    
    // ── Search page ────────────────────────────────────────────────
    console.log("\n🔍 Search page:");
    await page.goto(`${BASE}/search?q=${encodeURIComponent(LATEST)}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const searchText = await page.locator("body").innerText();
    const foundInSearch = searchText.includes(LATEST);
    console.log(`   Search includes latest event: ${foundInSearch}`);
    console.log(`   Search first 500 chars: ${searchText.substring(0, 500)}`);
    
    // ── Direct API check ───────────────────────────────────────────
    console.log("\n🔎 Direct API:");
    const latestEvent = events.find(e => e.title === LATEST);
    if (latestEvent) {
      console.log("   Latest event exists in API:", latestEvent.id, latestEvent.title);
      
      // Check event detail page
      await page.goto(`${BASE}/events/${latestEvent.id}`, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);
      console.log("   Detail page URL:", page.url());
      const detailText = await page.locator("body").innerText();
      console.log(`   Detail includes title: ${detailText.includes(LATEST)}`);
    }

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
