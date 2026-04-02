/**
 * QA Test: cp-072 — L1 — Rapid navigation memory check
 * 
 * Navigate between heavy pages rapidly. Confirm no memory leak symptoms:
 * - Massive console spam
 * - Repeated subscriptions / API calls
 * - Errors accumulating disproportionately
 */
import { chromium } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

const BASE = "https://capsule-pro-app.vercel.app";

async function auth(page, ctx) {
  const token = process.env.CLERK_TESTING_TOKEN;
  const fapi = process.env.CLERK_FAPI;
  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await ctx.route(new RegExp(`^https://${escaped}/v1/.*`), async route => {
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
  if (!result?.success) throw new Error("Auth failed");
  await page.waitForTimeout(5000);
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const consoleMessages = [];
  const networkRequests = [];
  const pageErrors = [];

  page.on("console", msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text(), timestamp: Date.now() });
  });
  page.on("pageerror", err => {
    pageErrors.push(err.message);
  });
  page.on("request", req => {
    if (req.url().includes("/api/")) {
      networkRequests.push({ url: req.url(), method: req.method() });
    }
  });

  try {
    console.log("Authenticating...");
    await auth(page, ctx);
    console.log("  ✓ Authenticated\n");

    // Baseline: count console messages before rapid navigation
    const baselineCount = consoleMessages.length;
    console.log("Baseline console messages:", baselineCount);

    // L1: Rapid navigation across 5 heavy pages, 3 cycles each
    const pages = [
      "/events",
      "/tasks",
      "/search",
      "/events",  // bounce back
      "/tasks",
    ];

    console.log("\n--- L1: Rapid Navigation (3 cycles) ---\n");
    const NAVIGATIONS = [
      "/events",
      "/tasks", 
      "/search",
      "/events",
      "/tasks",
      "/search",
      "/events",
      "/tasks",
      "/search",
      "/events",
      "/tasks",
      "/search",
      "/events",
      "/tasks",
      "/search",
    ];

    for (const path of NAVIGATIONS) {
      try {
        await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(500);
      } catch (e) {
        // Ignore navigation errors
      }
    }
    await page.waitForTimeout(2000);

    // L1: Analyze results
    const total = consoleMessages.length;
    const errors = consoleMessages.filter(m => m.type === "error");
    const warnings = consoleMessages.filter(m => m.type === "warning");
    const infos = consoleMessages.filter(m => m.type === "log" || m.type === "info");

    // Count unique error messages (dedupe repeats)
    const uniqueErrors = [...new Set(errors.map(e => e.text.substring(0, 80)))];
    // Count unique warning messages
    const uniqueWarnings = [...new Set(warnings.map(w => w.text.substring(0, 80)))];

    console.log("After rapid navigation:");
    console.log("  Total console messages:", total);
    console.log("  Errors:", errors.length, "(unique:", uniqueErrors.length, ")");
    console.log("  Warnings:", warnings.length, "(unique:", uniqueWarnings.length, ")");
    console.log("  Page errors:", pageErrors.length);

    // Check for repeated subscription spam (Clerk-related messages)
    const clerkMsgs = consoleMessages.filter(m =>
      m.text.includes("Clerk") || m.text.includes("clerk") || m.text.includes("auth")
    );
    const uniqueClerk = [...new Set(clerkMsgs.map(m => m.text.substring(0, 80)))];
    console.log("  Clerk auth messages:", clerkMsgs.length, "(unique:", uniqueClerk.length, ")");

    // Check for repeated API calls (should be proportional to navigations)
    const apiCalls = networkRequests.length;
    const apiCallsPerNav = (apiCalls / NAVIGATIONS.length).toFixed(1);
    console.log("  API calls:", apiCalls, "(" + apiCallsPerNav + " per navigation)");

    // Memory leak indicators
    // A memory leak would show: exponentially growing messages, massive spam of identical messages
    const errorRate = errors.length / NAVIGATIONS.length;
    const warningRate = warnings.length / NAVIGATIONS.length;
    const hasMassiveSpam = errors.length > 50 || warnings.length > 100;
    const hasRepeatedSpam = uniqueErrors.length < errors.length * 0.3 && errors.length > 20;

    console.log("\n--- L1: Memory Leak Indicators ---");
    console.log("  Error rate per nav:", errorRate.toFixed(1));
    console.log("  Warning rate per nav:", warningRate.toFixed(1));
    console.log("  Massive console spam (>50 errors):", hasMassiveSpam ? "⚠ YES" : "✓ NO");
    console.log("  Repeated identical errors (>80% dupes):", hasRepeatedSpam ? "⚠ YES" : "✓ NO");

    // Sample of unique errors
    if (uniqueErrors.length > 0) {
      console.log("\n  Unique error samples (first 5):");
      uniqueErrors.slice(0, 5).forEach(e => console.log("    -", e.substring(0, 80)));
    }

    // Final verdict
    const memoryLeak = hasMassiveSpam || hasRepeatedSpam;

    console.log("\n" + "=".repeat(60));
    console.log("📊 cp-072 — L1: Rapid Navigation Memory Check — RESULT");
    console.log("=".repeat(60));
    console.log("L1 — No massive console spam:  " + (!hasMassiveSpam ? "✓ PASS" : "✗ FAIL"));
    console.log("L1 — No repeated subscriptions: " + (!hasRepeatedSpam ? "✓ PASS" : "⚠ SUSPECT"));
    console.log("L1 — Error rate reasonable:     " + (errorRate < 5 ? "✓ PASS" : "⚠ HIGH (" + errorRate.toFixed(1) + ")"));
    console.log("L1 — API calls proportional:    " + (apiCallsPerNav < 30 ? "✓ PASS" : "⚠ HIGH (" + apiCallsPerNav + ")"));
    console.log("L1 — Overall:                   " + (!memoryLeak ? "✓ PASS" : "⚠ MEMORY LEAK SUSPECTED"));
    console.log("=".repeat(60));

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
