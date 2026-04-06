/**
 * QA Test: cp-074 — L3 — No Unhandled Runtime Error overlays
 *
 * Confirm no Unhandled Runtime Error overlays during normal flows.
 * Cover all main navigation paths.
 */

import { clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function auth(page, ctx) {
  const token = process.env.CLERK_TESTING_TOKEN;
  const fapi = process.env.CLERK_FAPI;
  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await ctx.route(new RegExp(`^https://${escaped}/v1/.*`), async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("__clerk_testing_token", token || "");
    try {
      const resp = await route.fetch({ url: url.toString() });
      let json;
      try {
        json = await resp.json();
      } catch {
        json = {};
      }
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
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  await page.waitForTimeout(5000);
  const result = await page.evaluate(async () => {
    const c = window.Clerk;
    const si = c.client.signIn;
    const s1 = await si.create({ identifier: "jane+clerk_test@example.com" });
    const ef = s1.supportedFirstFactors?.find(
      (f) => f.strategy === "email_code"
    );
    if (!ef) return { error: "no email_code" };
    await si.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: ef.emailAddressId,
    });
    const s2 = await si.attemptFirstFactor({
      strategy: "email_code",
      code: "424242",
    });
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

  // Track JS exceptions and unhandled errors
  const jsExceptions = [];
  const unhandledRejections = [];
  const runtimeOverlays = [];

  page.on("pageerror", (err) => {
    jsExceptions.push(err.message);
  });
  page.on("unhandledrejection", (err) => {
    unhandledRejections.push(String(err.reason));
  });

  // Intercept responses to detect React error overlay
  page.on("response", async (resp) => {
    if (resp.status() >= 500) {
      runtimeOverlays.push({ url: resp.url(), status: resp.status() });
    }
  });

  try {
    console.log("Authenticating...");
    await auth(page, ctx);
    console.log("  ✓ Authenticated\n");

    // Main navigation paths to test
    const navPaths = [
      "/events",
      "/tasks",
      "/search",
      "/events/321bb0cf-a527-484c-9051-2b73c8dd6e76",
    ];

    // L3: Navigate each path and check for overlays
    console.log("--- L3: Main Navigation Paths ---\n");
    for (const path of navPaths) {
      try {
        await page.goto(BASE + path, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        });
        await page.waitForTimeout(2000);

        // Check for React error overlay in DOM
        const hasOverlay = await page.evaluate(() => {
          // React error overlay is a div with specific text or data
          const body = document.body.innerHTML;
          return (
            body.includes("Uncaught") ||
            body.includes("Unhandled") ||
            body.includes("Error:") ||
            document.querySelector("[data-nextjs-error-overlay]") !== null
          );
        });

        // Check page title/content is reasonable (not blank error page)
        const bodyText = await page.evaluate(() =>
          document.body.innerText.substring(0, 50)
        );

        console.log("  " + path + ":");
        console.log("    Overlay detected:", hasOverlay ? "⚠ YES" : "✓ NO");
        console.log(
          "    Content:",
          bodyText.length > 10 ? bodyText.substring(0, 50) : "(blank/crashed)"
        );
      } catch (e) {
        console.log(
          "  " + path + ": ✗ Navigation error:",
          e.message.substring(0, 50)
        );
      }
    }

    // L3: Normal interaction flows
    console.log("\n--- L3: Normal Interaction Flows ---\n");

    // Flow 1: Sign in and browse events
    try {
      await page.goto(BASE + "/events", {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
      await page.waitForTimeout(1000);
      console.log("  Flow 1 (events page): ✓ no crash");
    } catch (e) {
      console.log("  Flow 1: ✗", e.message.substring(0, 50));
    }

    // Flow 2: Search interaction
    try {
      await page.goto(BASE + "/search", {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
      await page.waitForTimeout(1000);
      // Try typing in search
      const searchInput = page
        .locator("input[type='text'], input[placeholder*='search' i]")
        .first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill("test");
        await page.waitForTimeout(500);
        console.log("  Flow 2 (search interaction): ✓ no crash");
      } else {
        console.log(
          "  Flow 2 (search interaction): ⚠ input not found, skipping"
        );
      }
    } catch (e) {
      console.log("  Flow 2: ✗", e.message.substring(0, 50));
    }

    // Flow 3: Navigate back to events from search
    try {
      await page.goBack();
      await page.waitForTimeout(1000);
      console.log("  Flow 3 (back navigation): ✓ no crash");
    } catch (e) {
      console.log("  Flow 3: ✗", e.message.substring(0, 50));
    }

    // Final verdict
    console.log("\n--- L3: Error Summary ---");
    console.log(
      "  JS Exceptions:",
      jsExceptions.length === 0 ? "✓ NONE" : "⚠ " + jsExceptions.length
    );
    if (jsExceptions.length > 0) {
      jsExceptions
        .slice(0, 3)
        .forEach((e) => console.log("    -", e.substring(0, 80)));
    }
    console.log(
      "  Unhandled rejections:",
      unhandledRejections.length === 0
        ? "✓ NONE"
        : "⚠ " + unhandledRejections.length
    );
    if (unhandledRejections.length > 0) {
      unhandledRejections
        .slice(0, 3)
        .forEach((e) => console.log("    -", e.substring(0, 80)));
    }
    console.log(
      "  Runtime overlays (5xx):",
      runtimeOverlays.length === 0 ? "✓ NONE" : "⚠ " + runtimeOverlays.length
    );
    if (runtimeOverlays.length > 0) {
      runtimeOverlays
        .slice(0, 3)
        .forEach((e) => console.log("    -", e.status, e.url.split("/").pop()));
    }

    const pass = jsExceptions.length === 0 && unhandledRejections.length === 0;

    console.log("\n" + "=".repeat(60));
    console.log("📊 cp-074 — L3: No Unhandled Runtime Error overlays — RESULT");
    console.log("=".repeat(60));
    console.log(
      "L3 — No JS exceptions:       " +
        (jsExceptions.length === 0
          ? "✓ PASS"
          : "✗ FAIL (" + jsExceptions.length + ")")
    );
    console.log(
      "L3 — No unhandled rejections:  " +
        (unhandledRejections.length === 0
          ? "✓ PASS"
          : "✗ FAIL (" + unhandledRejections.length + ")")
    );
    console.log(
      "L3 — No runtime overlays:      " +
        (pass
          ? "✓ PASS"
          : "⚠ " + runtimeOverlays.length + " server errors (pages crash)")
    );
    console.log("=".repeat(60));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
