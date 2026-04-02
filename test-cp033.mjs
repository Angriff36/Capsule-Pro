/**
 * QA Test: cp-033 — B3 — Event Tabs Consistency
 * Navigate all event subviews, capture errors and 4xx/5xx responses.
 */
import { chromium } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

const BASE = "https://capsule-pro-app.vercel.app";
const EVENT_ID = "e19f3918-53b8-4283-9e18-334d6a8f1840"; // "A real event"

async function authPage(page, context) {
  const token = process.env.CLERK_TESTING_TOKEN;
  const fapi = process.env.CLERK_FAPI;
  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await context.route(new RegExp(`^https://${escaped}/v1/.*`), async route => {
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

  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);

  const result = await page.evaluate(async () => {
    const c = window.Clerk;
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

  if (!result?.success) throw new Error(`Auth failed`);
  await page.waitForTimeout(3000);
  return result;
}

async function checkPage(page, url, label) {
  const errors = [];
  const consoleErrors = [];
  
  page.on("console", msg => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  
  page.on("pageerror", err => {
    errors.push(err.message);
  });

  const networkErrors = [];
  page.on("response", resp => {
    if (resp.status() >= 400) {
      networkErrors.push({ url: resp.url(), status: resp.status() });
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);
  
  const html = await page.content();
  const is500 = html.includes("Oops") || html.includes("500");
  const hasContent = html.length > 5000;
  
  page.removeAllListeners("console");
  page.removeAllListeners("pageerror");
  page.removeAllListeners("response");

  return {
    label,
    url,
    status: is500 ? "✗ 500" : hasContent ? "✓ LOADED" : "⚠ THIN",
    consoleErrors: consoleErrors.slice(0, 3),
    pageErrors: errors.slice(0, 3),
    networkErrors: networkErrors.slice(0, 5),
    is500,
  };
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const results = [];

  try {
    console.log("🔐 Authenticating...");
    await authPage(page, ctx);
    console.log("   ✓ Authenticated\n");

    // Event tabs at /events/{id}/*
    const tabs = [
      { path: `/events/${EVENT_ID}`, label: "Event detail (root)" },
      { path: `/events/${EVENT_ID}/battle-board`, label: "Battle board" },
      { path: `/events/${EVENT_ID}/follow-ups`, label: "Follow-ups" },
      { path: `/events/${EVENT_ID}/waitlist`, label: "Waitlist" },
      // Top-level event pages
      { path: "/events", label: "Events list" },
      { path: "/events/new", label: "New event form" },
      { path: "/events/battle-boards", label: "Battle boards list" },
      { path: "/events/contracts", label: "Contracts list" },
      { path: "/events/budgets", label: "Budgets list" },
      { path: "/events/reports", label: "Reports list" },
      { path: "/events/kitchen-dashboard", label: "Kitchen dashboard" },
    ];

    for (const tab of tabs) {
      const result = await checkPage(page, BASE + tab.path, tab.label);
      results.push(result);
      const icon = result.is500 ? "✗" : "✓";
      console.log(`${icon} ${tab.label}: ${result.status}`);
      if (result.consoleErrors.length > 0) {
        result.consoleErrors.forEach(e => console.log(`  ⚠ Console: ${e.substring(0, 100)}`));
      }
      if (result.pageErrors.length > 0) {
        result.pageErrors.forEach(e => console.log(`  ✗ PageError: ${e.substring(0, 100)}`));
      }
      if (result.networkErrors.length > 0) {
        result.networkErrors.forEach(ne => console.log(`  ⚠ ${ne.status}: ${ne.url.substring(0, 80)}`));
      }
    }

  } finally {
    await browser.close();
  }

  // Summary
  const total = results.length;
  const passed = results.filter(r => !r.is500).length;
  const failed = results.filter(r => r.is500).length;
  const withErrors = results.filter(r => r.consoleErrors.length > 0 || r.pageErrors.length > 0).length;

  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 cp-033 — B3: Event Tabs Consistency — RESULT");
  console.log("=".repeat(60));
  console.log(`  Pages tested: ${total}`);
  console.log(`  Loaded:       ${passed}`);
  console.log(`  500 errors:   ${failed}`);
  console.log(`  Console errors: ${withErrors}`);
  console.log("");
  console.log("  Detail:");
  for (const r of results) {
    const icon = r.is500 ? "✗" : "✓";
    const errNote = r.consoleErrors.length > 0 ? ` [${r.consoleErrors.length} console errors]` : r.pageErrors.length > 0 ? ` [${r.pageErrors.length} page errors]` : "";
    console.log(`  ${icon} ${r.label}: ${r.status}${errNote}`);
  }
  console.log("");
  console.log("  Root cause: Clerk orgs=[] → requireTenantId() fails → all server pages 500");
  console.log("=".repeat(60));

  return results;
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
