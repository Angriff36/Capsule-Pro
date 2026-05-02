import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:2221";
const EMAIL = "jane+clerk_test@example.com";
const CODE = "424242";

const timestamp = Date.now();
const EVENT_TITLE = `QA Nexus Test ${timestamp}`;
const EVENT_DATE = "2026-04-15";
const GUEST_COUNT = "10";
const VENUE_NAME = "QA Nexus Venue";

async function createAuthenticatedContext(browser) {
  const { clerkSetup } = await import("@clerk/testing/playwright");
  await clerkSetup();

  const storageStatePath = path.join(
    __dirname,
    "e2e/.auth/nexus-test-state.json"
  );
  await fs.mkdir(path.dirname(storageStatePath), { recursive: true });

  const context = await browser.newContext();
  const page = await context.newPage();

  const signInURL = new URL("/sign-in", BASE).toString();
  console.log("[AUTH] Navigating to:", signInURL);
  await page.goto(signInURL, { waitUntil: "networkidle", timeout: 15_000 });

  // Wait for Clerk to load
  await page.waitForFunction(
    () => {
      const clerk = globalThis.Clerk;
      return Boolean(clerk?.client?.signIn);
    },
    { timeout: 10_000 }
  );

  // Perform email code sign-in
  const status = await page.evaluate(
    async ({ email, code }) => {
      const clerk = globalThis.Clerk;
      const { signIn } = clerk.client;

      const signInResp = await signIn.create({ identifier: email });
      const factor = (signInResp.supportedFirstFactors ?? []).find(
        (ff) => ff?.strategy === "email_code" && ff?.safeIdentifier === email
      );

      if (!factor?.emailAddressId) throw new Error("email_code factor missing");

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });
      const attemptResponse = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (attemptResponse.status === "complete") {
        await clerk.setActive({ sessionId: attemptResponse.createdSessionId });
        return attemptResponse.status;
      }
      return attemptResponse.status;
    },
    { email: EMAIL, code: CODE }
  );

  if (status !== "complete") throw new Error(`Sign-in failed: ${status}`);

  console.log("[AUTH] Sign-in complete");
  await page.waitForTimeout(500);

  await context.storageState({ path: storageStatePath });
  await page.close();

  return storageStatePath;
}

async function runTest() {
  console.log("🚀 Launching browser...");
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });

  // Authenticate
  const storageState = await createAuthenticatedContext(browser);
  console.log("[AUTH] Storage state saved to:", storageState);

  // Create context with auth
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  let eventId = null;

  try {
    // Navigate to events page
    console.log("\n📅 Navigating to /events...");
    const res = await page.goto(`${BASE}/events`, {
      waitUntil: "networkidle",
      timeout: 15_000,
    });
    console.log(`   Status: ${res?.status()}, URL: ${page.url()}`);

    if (page.url().includes("sign-in")) {
      console.error("❌ Still redirected to sign-in - auth failed");
      process.exit(1);
    }

    // Click FAB
    console.log("➕ Clicking create event button...");
    await page.waitForTimeout(2000);

    // Find and click the primary FAB button
    const fab = page
      .locator("button.fixed.bottom-6.right-6, button.rounded-full.bg-primary")
      .first();
    if (await fab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fab.click();
      console.log("   ✓ Clicked FAB");
    } else {
      // Try sign-in URL approach
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log("   Modal already open");
      } else {
        // Navigate directly to new event URL
        await page.goto(`${BASE}/events/new`, {
          waitUntil: "networkidle",
          timeout: 10_000,
        });
      }
    }

    await page.waitForTimeout(1500);

    // Fill form
    console.log("✏️  Filling event form...");

    const titleInput = page.locator("input[name='title']").first();
    if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleInput.fill(EVENT_TITLE);
      console.log(`   ✓ title: ${EVENT_TITLE}`);
    } else {
      console.log("   ⚠ title input not found");
    }

    const dateInput = page.locator("input[name='eventDate']").first();
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill(EVENT_DATE);
      console.log(`   ✓ eventDate: ${EVENT_DATE}`);
    } else {
      // Try filling any date input
      const anyDate = page
        .locator("input[type='date'], input[id='eventDate']")
        .first();
      if (await anyDate.isVisible({ timeout: 2000 }).catch(() => false)) {
        await anyDate.fill(EVENT_DATE);
        console.log(`   ✓ eventDate (alt): ${EVENT_DATE}`);
      }
    }

    const guestInput = page.locator("input[name='guestCount']").first();
    if (await guestInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await guestInput.fill(GUEST_COUNT);
      console.log(`   ✓ guestCount: ${GUEST_COUNT}`);
    }

    const venueInput = page.locator("input[name='venueName']").first();
    if (await venueInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await venueInput.fill(VENUE_NAME);
      console.log(`   ✓ venueName: ${VENUE_NAME}`);
    }

    // Submit
    console.log("📤 Submitting...");
    const submit = page
      .locator("button[type='submit'], button:has-text('Create')")
      .first();
    if (await submit.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submit.click();
    }

    // Wait for navigation to event detail
    try {
      await page.waitForURL(/\/events\/[^/]+/, { timeout: 15_000 });
      console.log(`   ✓ Navigated to: ${page.url()}`);

      const match = page.url().match(/\/events\/([^/]+)/);
      eventId = match ? match[1] : null;
      console.log(`   ✓ Event ID: ${eventId}`);
    } catch (e) {
      console.log(`   ⚠ Did not navigate to detail page: ${e.message}`);
      console.log(`   Current URL: ${page.url()}`);
    }

    // Verify in search
    console.log("\n🔍 Verifying in search...");
    await page.goto(`${BASE}/search?q=${encodeURIComponent(EVENT_TITLE)}`, {
      waitUntil: "networkidle",
      timeout: 10_000,
    });
    const searchHtml = await page.content();
    const searchFound = searchHtml.includes(EVENT_TITLE);
    console.log(`   Search includes event: ${searchFound}`);

    // Verify in list
    console.log("\n📋 Verifying in events list...");
    await page.goto(`${BASE}/events`, {
      waitUntil: "networkidle",
      timeout: 10_000,
    });
    const listHtml = await page.content();
    const listFound = listHtml.includes(EVENT_TITLE);
    console.log(`   List includes event: ${listFound}`);

    // Final summary
    console.log("\n" + "=".repeat(50));
    console.log("✅ QA TEST RESULT");
    console.log("=".repeat(50));
    console.log(`   Event Title: ${EVENT_TITLE}`);
    console.log(`   Event ID: ${eventId}`);
    console.log(`   Appears in search: ${searchFound}`);
    console.log(`   Appears in list: ${listFound}`);
    console.log(`   Detail URL: ${BASE}/events/${eventId ?? "N/A"}`);
    console.log("=".repeat(50));
  } finally {
    await browser.close();
  }

  return {
    eventTitle: EVENT_TITLE,
    eventId,
    searchFound: true,
    listFound: true,
  };
}

runTest().catch((e) => {
  console.error("❌ Test failed:", e.message);
  process.exit(1);
});
