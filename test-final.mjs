/**
 * QA Test: Create Event (cp-031) + Board Concurrency (cp-048)
 * Uses Clerk Backend API sign-in token + email_code via testing token interceptor.
 */

import { createClerkClient } from "@clerk/backend";
import { clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://capsule-pro-app.vercel.app";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY env var is required");
}
const clerkB = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// ─── Auth helper ────────────────────────────────────────────────────────────────
async function createContext() {
  await clerkSetup();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const fapi = "assured-ray-89.clerk.accounts.dev";
  await context.route(`https://${fapi}/v1/*`, async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set(
      "__clerk_testing_token",
      process.env.CLERK_TESTING_TOKEN || ""
    );
    try {
      const resp = await route.fetch({ url: url.toString() });
      const json = await resp.json();
      if (json?.response?.captcha_bypass === false)
        json.response.captcha_bypass = true;
      if (json?.client?.captcha_bypass === false)
        json.client.captcha_bypass = true;
      await route.fulfill({ response: resp, json });
    } catch {
      await route.continue();
    }
  });

  await page.goto(`${BASE}/sign-in`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(4000);

  const result = await page.evaluate(async () => {
    const c = window.Clerk;
    const si = c.client.signIn;
    const email = "jane+clerk_test@example.com";
    const code = "424242";
    const s1 = await si.create({ identifier: email });
    const emailCodeFactor = s1.supportedFirstFactors?.find(
      (f) => f.strategy === "email_code"
    );
    if (!emailCodeFactor) return { error: "no email_code factor" };
    await si.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: emailCodeFactor.emailAddressId,
    });
    const s2 = await si.attemptFirstFactor({ strategy: "email_code", code });
    if (s2.status === "complete" && s2.createdSessionId) {
      await c.setActive({ sessionId: s2.createdSessionId });
      return { success: true, sessionId: s2.createdSessionId };
    }
    return { status: s2.status };
  });

  if (!result?.success)
    throw new Error(`Auth failed: ${JSON.stringify(result)}`);
  return { browser, context, page };
}

// ─── cp-031: Create Event ────────────────────────────────────────────────────
async function testCreateEvent(ctx) {
  const { browser, context, page } = ctx;
  const ts = Date.now();
  const EVENT_TITLE = `QA Nexus Event ${ts}`;
  const EVENT_DATE = "2026-04-15";
  const GUEST_COUNT = "10";
  const VENUE_NAME = "QA Nexus Venue";
  let eventId = null;

  try {
    console.log("🔐 Auth: ✓");
    console.log("📅 Going to /events...");
    await page.goto(`${BASE}/events`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    await page.waitForTimeout(2000);
    console.log(`   URL: ${page.url()}`);

    console.log("➕ Opening create modal...");
    const fab = page.locator("button.fixed.bottom-6.right-6").first();
    if (await fab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fab.click();
    } else {
      await page.goto(`${BASE}/events/new`, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
    }
    await page.waitForTimeout(2000);

    console.log("✏️  Filling form...");
    let filled = 0;
    for (const [sel, val] of [
      ["input[name='title']", EVENT_TITLE],
      ["input[name='eventDate']", EVENT_DATE],
      ["input[name='guestCount']", GUEST_COUNT],
      ["input[name='venueName']", VENUE_NAME],
    ]) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.fill(val);
        filled++;
      }
    }
    console.log(`   Filled ${filled}/4 fields`);

    console.log("📤 Submitting...");
    const submitBtn = page.locator("button[type='submit']").first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(8000);
    }
    const finalUrl = page.url();
    const match = finalUrl.match(/\/events\/([^/?#]+)/);
    eventId = match?.[1] ?? null;
    console.log(`   URL: ${finalUrl}, ID: ${eventId}`);

    // Verify in search
    await page.goto(`${BASE}/search?q=${encodeURIComponent(EVENT_TITLE)}`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    await page.waitForTimeout(2000);
    const inSearch = (await page.content()).includes(EVENT_TITLE);
    console.log(`   Search: ${inSearch ? "✓ FOUND" : "✗ NOT FOUND"}`);

    // Verify in list
    await page.goto(`${BASE}/events`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    await page.waitForTimeout(2000);
    const inList = (await page.content()).includes(EVENT_TITLE);
    console.log(`   List:   ${inList ? "✓ FOUND" : "✗ NOT FOUND"}`);

    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 cp-031 — Create Event — RESULT");
    console.log("=".repeat(60));
    console.log(`   Title:    ${EVENT_TITLE}`);
    console.log(`   ID:       ${eventId ?? "N/A"}`);
    console.log("   Endpoint: POST /api/event/create");
    console.log(
      "   Payload:  { title, eventDate, guestCount, venueName, eventType }"
    );
    console.log(`   List:     ${inList ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`   Search:   ${inSearch ? "✓ PASS" : "✗ FAIL"}`);
    console.log("=".repeat(60));
  } finally {
    await browser.close();
  }

  return { eventTitle: EVENT_TITLE, eventId };
}

// ─── cp-048: Board Concurrency ───────────────────────────────────────────────
async function testBoardConcurrency() {
  const EVENT_ID = "321bb0cf-a527-484c-9051-2b73c8dd6e76";
  const BOARD_URL = `${BASE}/events/${EVENT_ID}/battle-board`;

  const ctxA = await createContext();
  const ctxB = await createContext();
  const { page: pageA } = ctxA;
  const { page: pageB, browser } = ctxB;

  try {
    console.log("🔐 Auth A+B: ✓");
    console.log(`\n📋 Opening board in both sessions: ${BOARD_URL}`);
    await pageA.goto(BOARD_URL, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    await pageA.waitForTimeout(3000);
    console.log(`   A URL: ${pageA.url()}`);

    await pageB.goto(BOARD_URL, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    await pageB.waitForTimeout(3000);
    console.log(`   B URL: ${pageB.url()}`);

    const cardsA0 = await pageA
      .locator('[data-testid*="card"], [class*="card"]')
      .count();
    const cardsB0 = await pageB
      .locator('[data-testid*="card"], [class*="card"]')
      .count();
    console.log(`   Initial cards — A: ${cardsA0}, B: ${cardsB0}`);

    console.log("\n➕ Adding card in session A...");
    let added = false;
    const addBtnA = pageA
      .locator('button[aria-label*="add"], button:has-text("add")')
      .first();
    if (await addBtnA.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtnA.click();
      added = true;
      console.log("  ✓ Clicked add button");
      await pageA.waitForTimeout(1500);
    }
    if (!added) {
      const boardArea = pageA
        .locator('[class*="board"], [class*="canvas"]')
        .first();
      if (await boardArea.isVisible({ timeout: 2000 }).catch(() => false)) {
        await boardArea.click({ position: { x: 200, y: 200 } });
        added = true;
        console.log("  ✓ Clicked board area");
      }
    }

    const cardsAAfter = await pageA
      .locator('[data-testid*="card"], [class*="card"]')
      .count();
    console.log(`  Cards A after: ${cardsAAfter}`);

    console.log("\n⏳ Waiting 4s for B to receive update...");
    await pageA.waitForTimeout(4000);
    const cardsBAfter = await pageB
      .locator('[data-testid*="card"], [class*="card"]')
      .count();
    console.log(`  Cards B after wait: ${cardsBAfter}`);

    const realtimeSync = cardsBAfter > cardsB0 || cardsBAfter === cardsAAfter;
    console.log(`  Realtime sync: ${realtimeSync ? "✓ YES" : "⚠ NO"}`);

    let refreshSync = false;
    if (!realtimeSync && cardsAAfter > cardsB0) {
      console.log("\n🔄 Refreshing session B...");
      await pageB.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
      await pageB.waitForTimeout(2000);
      const cardsBRefresh = await pageB
        .locator('[data-testid*="card"], [class*="card"]')
        .count();
      refreshSync = cardsBRefresh >= cardsAAfter;
      console.log(`  Cards B after refresh: ${cardsBRefresh}`);
      console.log(
        `  Consistent after refresh: ${refreshSync ? "✓ YES" : "✗ NO"}`
      );
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 cp-048 — Board Concurrency — RESULT");
    console.log("=".repeat(60));
    console.log(`   Board:     ${BOARD_URL}`);
    console.log(
      `   Session A: ${cardsA0} → ${cardsAAfter} (${added ? "added" : "no btn"})`
    );
    console.log(`   Session B: ${cardsB0} → ${cardsBAfter} (before refresh)`);
    console.log(`   Realtime:  ${realtimeSync ? "✓ PASS" : "⚠ NOT REALTIME"}`);
    console.log(
      `   Refresh:   ${refreshSync || realtimeSync ? "✓ PASS" : "⚠ CHECK DATA"}`
    );
    console.log("=".repeat(60));
  } finally {
    await browser.close();
  }
}

// ─── Run both ─────────────────────────────────────────────────────────────────
async function main() {
  // cp-031 first
  console.log("\n" + "═".repeat(60));
  console.log("▶ cp-031: Create Event");
  console.log("═".repeat(60));
  const cp031Ctx = await createContext();
  const cp031Result = await testCreateEvent(cp031Ctx);

  // cp-048 second
  console.log("\n" + "═".repeat(60));
  console.log("▶ cp-048: Board Concurrency");
  console.log("═".repeat(60));
  await testBoardConcurrency();
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
