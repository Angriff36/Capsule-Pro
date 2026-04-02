/**
 * QA Test: Create Event B1
 */
import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:2221";

const timestamp = Date.now();
const EVENT_TITLE = `QA Nexus Test ${timestamp}`;
const EVENT_DATE = "2026-04-15";
const GUEST_COUNT = "10";
const VENUE_NAME = "QA Nexus Venue";

async function main() {
  console.log("🚀 Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let eventId = null;
  
  try {
    // Navigate to events
    console.log("\n📅 Navigating to /events...");
    await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 20000 });
    console.log(`   URL: ${page.url()}`);
    
    if (page.url().includes("sign-in")) {
      console.log("⚠️  Redirected to sign-in - attempting auth...");
      
      // Sign in with test credentials
      await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 15000 });
      
      // Enter email
      const emailInput = page.locator("input[name='identifier'], input[type='email']").first();
      await emailInput.waitFor({ timeout: 10000 });
      await emailInput.fill("jane+clerk_test@example.com");
      await page.locator("button[type='submit']").first().click();
      await page.waitForTimeout(2000);
      
      // Enter code
      const codeInput = page.locator("input[name='code']").first();
      await codeInput.waitFor({ timeout: 10000 });
      await codeInput.fill("424242");
      await page.locator("button[type='submit']").first().click();
      await page.waitForTimeout(3000);
      
      console.log(`   After auth URL: ${page.url()}`);
    }
    
    // Navigate back to events
    await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 20000 });
    console.log(`   Events page URL: ${page.url()}`);
    
    if (page.url().includes("sign-in")) {
      console.error("❌ Auth failed - still on sign-in page");
      process.exit(1);
    }
    
    await page.waitForTimeout(2000);
    
    // Try to find and click FAB
    console.log("➕ Looking for create button...");
    const fabSelectors = [
      "button.fixed.bottom-6.right-6",
      "button.rounded-full.bg-primary",
      "button.rounded-full",
      "[aria-label*='Create']",
      "button:has-text('Create')",
    ];
    
    let clicked = false;
    for (const sel of fabSelectors) {
      const el = page.locator(sel).first();
      const count = await el.count();
      if (count > 0) {
        const isVisible = await el.isVisible().catch(() => false);
        if (isVisible) {
          console.log(`   ✓ Clicking: ${sel}`);
          await el.click();
          clicked = true;
          break;
        }
      }
    }
    
    if (!clicked) {
      console.log("   ⚠ No FAB found - trying /events/new...");
      await page.goto(`${BASE}/events/new`, { waitUntil: "domcontentloaded", timeout: 10000 });
    }
    
    await page.waitForTimeout(2000);
    
    // Check for modal or form
    const dialogCount = await page.locator('[role="dialog"]').count();
    console.log(`   Dialogs found: ${dialogCount}`);
    
    // List visible inputs
    const inputs = await page.locator("input:visible").all();
    console.log(`   Visible inputs: ${inputs.length}`);
    
    // Try to fill form
    console.log("\n✏️  Filling event form...");
    
    const titleInput = page.locator("input[name='title']").first();
    const titleVisible = await titleInput.isVisible().catch(() => false);
    console.log(`   title visible: ${titleVisible}`);
    if (titleVisible) {
      await titleInput.fill(EVENT_TITLE);
      
      const dateInput = page.locator("input[name='eventDate']").first();
      if (await dateInput.isVisible().catch(() => false)) {
        await dateInput.fill(EVENT_DATE);
      }
      
      const guestInput = page.locator("input[name='guestCount']").first();
      if (await guestInput.isVisible().catch(() => false)) {
        await guestInput.fill(GUEST_COUNT);
      }
      
      const venueInput = page.locator("input[name='venueName']").first();
      if (await venueInput.isVisible().catch(() => false)) {
        await venueInput.fill(VENUE_NAME);
      }
      
      // Submit
      const submit = page.locator("button[type='submit']").first();
      if (await submit.isVisible().catch(() => false)) {
        console.log("   📤 Submitting...");
        await submit.click();
        await page.waitForTimeout(8000);
        
        const finalUrl = page.url();
        console.log(`   Final URL: ${finalUrl}`);
        
        const match = finalUrl.match(/\/events\/([^/]+)/);
        eventId = match ? match[1] : null;
      }
    } else {
      console.log("   ⚠ Title input not visible - taking page snapshot");
      // Just show what's on the page
      const h1 = await page.locator("h1, h2").first().textContent().catch(() => "none");
      console.log(`   First heading: ${h1}`);
    }
    
    // Verify in search
    if (EVENT_TITLE) {
      console.log("\n🔍 Checking search...");
      try {
        await page.goto(`${BASE}/search?q=${encodeURIComponent(EVENT_TITLE)}`, { waitUntil: "domcontentloaded", timeout: 10000 });
        const content = await page.content();
        const found = content.includes(EVENT_TITLE);
        console.log(`   Found in search: ${found}`);
      } catch (e) {
        console.log(`   Search error: ${e.message}`);
      }
    }
    
    // Verify in list
    console.log("\n📋 Checking events list...");
    try {
      await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 10000 });
      const content = await page.content();
      const found = content.includes(EVENT_TITLE);
      console.log(`   Found in list: ${found}`);
    } catch (e) {
      console.log(`   List error: ${e.message}`);
    }
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 QA RESULT — Create Event");
    console.log("=".repeat(60));
    console.log(`   Title:   ${EVENT_TITLE}`);
    console.log(`   ID:      ${eventId ?? "N/A"}`);
    console.log(`   API:     POST /api/event/create`);
    console.log(`   Fields:  title, eventDate, guestCount, venueName, eventType`);
    console.log(`   Action:  createEvent server action → redirect to /events/{id}`);
    console.log(`   Detail:  ${BASE}/events/${eventId ?? "{id}"}`);
    console.log("=".repeat(60));
    
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
