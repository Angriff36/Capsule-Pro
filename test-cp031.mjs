/**
 * QA Test: cp-031 — Create Event
 * Key fix: use networkidle to wait for client-side form rendering.
 */
import { chromium } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://capsule-pro-app.vercel.app";

const ts = Date.now();
const EVENT_TITLE = `QA Nexus Event ${ts}`;
const EVENT_DATE = "2026-04-15";
const GUEST_COUNT = "10";
const VENUE_NAME = "QA Nexus Venue";

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
    if (s2.status === "complete" && s2.createdSessionId) await c.setActive({ session: s2.createdSessionId });
  });

  return { browser, context, page };
}

async function main() {
  const { browser, context, page } = await createContext();
  let eventId = null;

  try {
    // ── Navigate to create event page ──────────────────────────────
    console.log("📋 Going to /events/new...");
    await page.goto(`${BASE}/events/new`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(2000);
    console.log("   URL:", page.url());

    // Verify form is visible
    const titleEl = page.locator("input[name='title']").first();
    const titleVisible = await titleEl.isVisible({ timeout: 3000 }).catch(() => false);
    console.log("   Title input visible:", titleVisible);
    
    if (!titleVisible) {
      console.log("   ⚠ Form not visible — dumping page content:");
      const body = await page.locator("body").innerText().catch(() => "");
      console.log(body.substring(0, 300));
    }

    // ── Fill form ────────────────────────────────────────────────
    console.log("\n✏️  Filling form...");
    if (titleVisible) {
      await titleEl.fill(EVENT_TITLE);
      console.log("   ✓ title:", EVENT_TITLE);
      
      // eventDate (date input)
      const dateEl = page.locator("input[name='eventDate']").first();
      if (await dateEl.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateEl.fill(EVENT_DATE);
        console.log("   ✓ eventDate:", EVENT_DATE);
      }
      
      // guestCount
      const guestEl = page.locator("input[name='guestCount']").first();
      if (await guestEl.isVisible({ timeout: 2000 }).catch(() => false)) {
        await guestEl.fill(GUEST_COUNT);
        console.log("   ✓ guestCount:", GUEST_COUNT);
      }
      
      // venueName
      const venueEl = page.locator("input[name='venueName']").first();
      if (await venueEl.isVisible({ timeout: 2000 }).catch(() => false)) {
        await venueEl.fill(VENUE_NAME);
        console.log("   ✓ venueName:", VENUE_NAME);
      }

      // ── Submit ─────────────────────────────────────────────────
      console.log("\n📤 Submitting...");
      const submitBtn = page.locator("button[type='submit']").first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        console.log("   ✓ Clicked submit");
        
        // Wait for navigation to detail page
        await page.waitForURL(/\/events\/[^/]+/, { timeout: 15000 }).catch(() => {});
        console.log("   URL after submit:", page.url());
        
        const match = page.url().match(/\/events\/([^/?#]+)/);
        eventId = match?.[1] ?? null;
        console.log("   Event ID:", eventId);
      } else {
        console.log("   ⚠ Submit button not visible");
        // Try Enter key on last filled field
        await guestEl.press("Enter");
        await page.waitForTimeout(5000);
        console.log("   URL after Enter:", page.url());
        const match = page.url().match(/\/events\/([^/?#]+)/);
        eventId = match?.[1] ?? null;
      }
    }

    // ── Verify in list ───────────────────────────────────────────
    console.log("\n📋 Checking events list...");
    await page.goto(`${BASE}/events`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(2000);
    const listHtml = await page.content();
    const inList = listHtml.includes(EVENT_TITLE);
    console.log(`   ${inList ? "✓" : "✗"} In list: ${inList}`);

    // ── Verify in search ────────────────────────────────────────
    console.log("\n🔍 Checking search...");
    await page.goto(`${BASE}/search?q=${encodeURIComponent(EVENT_TITLE)}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);
    const searchHtml = await page.content();
    const inSearch = searchHtml.includes(EVENT_TITLE);
    console.log(`   ${inSearch ? "✓" : "✗"} In search: ${inSearch}`);

    // ── Summary ──────────────────────────────────────────────────
    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 cp-031 — Create Event — RESULT");
    console.log("=".repeat(60));
    console.log(`   Title:    ${EVENT_TITLE}`);
    console.log(`   ID:       ${eventId ?? "N/A"}`);
    console.log(`   Endpoint: createEvent server action → redirect /events/{id}`);
    console.log(`   List:     ${inList ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`   Search:   ${inSearch ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`   Detail:   ${BASE}/events/${eventId ?? "{id}"}`);
    console.log("=".repeat(60));

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
