import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageState = path.resolve(__dirname, "e2e/.auth/storageState.json");
const BASE = "https://capsule-pro-app.vercel.app";

const timestamp = Date.now();
const eventTitle = `QA Test Event ${timestamp}`;
const eventDate = "2026-04-15";
const guestCount = "10";
const venueName = "QA Test Venue";

async function main() {
  console.log("🚀 Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  // Navigate to events page
  console.log("📅 Navigating to /events...");
  try {
    const eventsRes = await page.goto(`${BASE}/events`, { waitUntil: "networkidle", timeout: 15000 });
    console.log(`   Status: ${eventsRes?.status()}, URL: ${page.url()}`);
  } catch (e) {
    console.log(`   Navigation error: ${e.message}`);
  }

  // Check if redirected to sign-in
  if (page.url().includes("sign-in")) {
    console.error("❌ Not authenticated — redirected to sign-in");
    await browser.close();
    process.exit(1);
  }

  // Click the FAB (Create Event button)
  console.log("➕ Looking for Create Event button...");
  
  // Wait for page to settle
  await page.waitForTimeout(2000);
  
  // Try various FAB selectors
  const fabSelectors = [
    'button.fixed.bottom-6',
    'button.rounded-full.bg-primary',
    '[aria-label*="Create"]',
    'button:has-text("Create")',
    'button:has-text("New Event")',
  ];
  
  let fabClicked = false;
  for (const sel of fabSelectors) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      console.log(`   Found FAB with: ${sel} (${count} elements)`);
      await page.locator(sel).first().click();
      fabClicked = true;
      break;
    }
  }
  
  if (!fabClicked) {
    console.log("   ⚠ Could not find FAB, trying direct URL...");
    // Maybe the modal is opened differently - check if it's already visible
    const modal = page.locator('[role="dialog"], [aria-modal="true"]');
    if (await modal.count() > 0) {
      console.log("   Modal already visible!");
      fabClicked = true;
    }
  }
  
  await page.waitForTimeout(1500);

  // Fill form fields
  console.log("✏️  Filling event form...");
  
  // Title
  const titleInput = page.locator('input[name="title"], input[id="title"], input[placeholder*="title" i]').first();
  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill(eventTitle);
    console.log(`   ✓ Filled title: ${eventTitle}`);
  } else {
    console.log("   ⚠ title input not found");
  }

  // Event date  
  const dateInput = page.locator('input[name="eventDate"], input[id="eventDate"], input[type="date"]').first();
  if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dateInput.fill(eventDate);
    console.log(`   ✓ Filled date: ${eventDate}`);
  }

  // Guest count
  const guestInput = page.locator('input[name="guestCount"], input[id="guestCount"], input[placeholder*="guest" i]').first();
  if (await guestInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await guestInput.fill(guestCount);
    console.log(`   ✓ Filled guestCount: ${guestCount}`);
  }

  // Venue name
  const venueInput = page.locator('input[name="venueName"], input[id="venueName"], input[placeholder*="venue" i]').first();
  if (await venueInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await venueInput.fill(venueName);
    console.log(`   ✓ Filled venueName: ${venueName}`);
  }

  // Submit
  console.log("📤 Submitting form...");
  const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save Event")').first();
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
    console.log("   ✓ Clicked submit");
  } else {
    console.log("   ⚠ submit button not found");
  }
  
  // Wait for navigation
  await page.waitForURL(/\/events\/[^/]+/, { timeout: 15000 }).catch(() => {
    console.log("   ⚠ Did not navigate to event detail page");
  });
  
  console.log(`   Final URL: ${page.url()}`);
  
  // Extract event ID from URL
  const eventIdMatch = page.url().match(/\/events\/([^/]+)/);
  const eventId = eventIdMatch ? eventIdMatch[1] : null;
  console.log(`   Event ID: ${eventId}`);

  // Check for errors
  const pageContent = await page.content();
  if (pageContent.includes("error") || pageContent.includes("Error")) {
    const errorPatterns = [
      /([Ee]rror[:\s]+[^\n<]{0,100})/,
      /([Ff]ailed[:\s]+[^\n<]{0,100})/,
    ];
    for (const pat of errorPatterns) {
      const match = pageContent.match(pat);
      if (match) console.log(`   ⚠ Error detected: ${match[1]}`);
    }
  }

  // Go to search and verify
  if (eventTitle) {
    console.log("\n🔍 Verifying in search...");
    try {
      await page.goto(`${BASE}/search?q=${encodeURIComponent(eventTitle)}`, { waitUntil: "networkidle", timeout: 10000 });
      const searchContent = await page.content();
      const found = searchContent.includes(eventTitle);
      console.log(`   Search result includes event: ${found}`);
    } catch (e) {
      console.log(`   Search navigation error: ${e.message}`);
    }
  }

  // Go to events list and verify
  console.log("\n📋 Verifying in events list...");
  try {
    await page.goto(`${BASE}/events`, { waitUntil: "networkidle", timeout: 10000 });
    const listContent = await page.content();
    const inList = listContent.includes(eventTitle);
    console.log(`   List includes event: ${inList}`);
  } catch (e) {
    console.log(`   Events list navigation error: ${e.message}`);
  }

  console.log(`\n✅ Event creation test complete`);
  console.log(`   Title: ${eventTitle}`);
  console.log(`   ID: ${eventId}`);
  console.log(`   URL: ${BASE}/events/${eventId || "N/A"}`);

  await browser.close();
}

main().catch((e) => {
  console.error("❌ Test failed:", e.message);
  process.exit(1);
});
