/**
 * QA Test: cp-070 — K2 — Force 500 scenario
 *
 * Temporarily break internal call or hit invalid endpoint. Confirm generic error UI,
 * logs captured, no secrets leaked.
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

async function api(page, method, path, body = null) {
  return await page.evaluate(
    async ({ m, p, b }) => {
      const opts = {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      };
      if (m !== "GET") opts.method = m;
      if (b) opts.body = JSON.stringify(b);
      const resp = await fetch(p, opts);
      let json = null;
      try {
        json = await resp.json();
      } catch {}
      return {
        status: resp.status,
        data: json,
        headers: Object.fromEntries(resp.headers.entries()),
      };
    },
    { m: method, p: path, b: body }
  );
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // Collect network failures
  const networkFailures = [];
  page.on("requestfailed", (req) => {
    networkFailures.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  try {
    console.log("Authenticating...");
    await auth(page, ctx);

    console.log("\n=== K2: Triggering 500 Errors ===\n");

    // K2: Known 500 — alerts-config list
    console.log("--- K2: alerts-config/list (known 500) ---");
    const alerts500 = await api(page, "GET", "/api/kitchen/alerts-config/list");
    console.log(
      "  Status:",
      alerts500.status,
      alerts500.status === 500 ? "✓ 500" : "⚠ " + alerts500.status
    );
    const responseText1 = JSON.stringify(alerts500.data)?.substring(0, 200);
    console.log("  Response:", responseText1);
    const leaked1 =
      responseText1.includes("password") ||
      responseText1.includes("secret") ||
      responseText1.includes("key") ||
      responseText1.includes("token") ||
      responseText1.includes("sk_");
    console.log("  Secrets leaked:", leaked1 ? "✗ YES" : "✓ NO");

    // K2: Hit invalid endpoint (should 404, but check for 500)
    console.log("\n--- K2: Invalid endpoint ---");
    const invalidR = await api(page, "GET", "/api/kitchen/nonexistent");
    console.log(
      "  Status:",
      invalidR.status,
      invalidR.status === 404 ? "404 (expected)" : "⚠ " + invalidR.status
    );

    // K2: Trigger 500 by sending malformed JSON or invalid body to a known endpoint
    console.log("\n--- K2: Malformed request body ---");
    const malformedR = await api(page, "POST", "/api/kitchen/tasks", {
      broken: "data",
    });
    console.log(
      "  Status:",
      malformedR.status,
      malformedR.status >= 400 ? "✓ " + malformedR.status : "✗ unexpected"
    );

    // K2: Hit alerts-config directly from browser (UI page)
    console.log("\n--- K2: Browser UI on 500 page ---");
    await page.goto(`${BASE}/events`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    await page.waitForTimeout(3000);
    const pageErrors = consoleErrors.filter(
      (e) => !e.includes("Failed to load resource")
    );
    console.log(
      "  Console errors on /events (expected 500):",
      pageErrors.length
    );
    if (pageErrors.length > 0) {
      console.log(
        "  Error texts:",
        pageErrors.slice(0, 3).map((e) => e.substring(0, 80))
      );
    }
    // Check if error boundary or generic error is shown
    const bodyText = await page.evaluate(() =>
      document.body.innerText.substring(0, 200)
    );
    console.log(
      "  Page content:",
      bodyText.length > 0
        ? bodyText.substring(0, 100)
        : "(empty/error boundary)"
    );

    // K2: Check if Sentry/captureException would have captured the error
    // We can't directly check Sentry, but we can verify the error doesn't leak
    console.log("\n--- K2: Secret Leak Check ---");
    const secretPatterns = [
      "password",
      "secret",
      "sk_test",
      "pk_test",
      "token",
      "authorization",
      "Bearer",
      "neon",
      "clerk",
    ];
    const allResponses = [alerts500.data];
    let leaked = false;
    for (const data of allResponses) {
      const text = JSON.stringify(data || "");
      for (const pattern of secretPatterns) {
        if (text.toLowerCase().includes(pattern)) {
          console.log(
            "  ⚠ Possible leak:",
            pattern,
            "in:",
            text.substring(0, 100)
          );
          leaked = true;
        }
      }
    }
    console.log("  Overall secret leak:", leaked ? "✗ FAIL" : "✓ PASS");

    // K2: 500 error response headers (check for no stack trace in headers)
    console.log("\n--- K2: Response Headers Check ---");
    const headers = alerts500.headers || {};
    const stackHeaders = Object.keys(headers).filter(
      (k) =>
        k.toLowerCase().includes("stack") ||
        k.toLowerCase().includes("trace") ||
        k.toLowerCase().includes("debug")
    );
    console.log(
      "  Stack/trace headers:",
      stackHeaders.length === 0 ? "✓ NONE" : "⚠ " + stackHeaders.join(", ")
    );

    // K2: Generic error UI check (via page screenshot)
    await page
      .goto(`${BASE}/events`, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      })
      .catch(() => {});
    await page.waitForTimeout(2000);
    const hasGenericError = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return (
        text.includes("error") ||
        text.includes("something went wrong") ||
        text.includes("500") ||
        text.includes("internal")
      );
    });
    console.log("\n--- K2: Generic Error UI ---");
    console.log(
      "  Error UI visible:",
      hasGenericError ? "✓ YES" : "✗ NO (page may be blank/error boundary)"
    );

    console.log("\n" + "=".repeat(60));
    console.log("📊 cp-070 — K2: Force 500 Scenario — RESULT");
    console.log("=".repeat(60));
    console.log(
      "K2 — 500 triggered:          " +
        (alerts500.status === 500 ? "✓ PASS" : "⚠ " + alerts500.status)
    );
    console.log(
      "K2 — Generic error UI:      " +
        (hasGenericError ? "✓ PASS" : "✗ FAIL (no error UI)")
    );
    console.log(
      "K2 — No secrets leaked:      " + (leaked ? "✗ FAIL" : "✓ PASS")
    );
    console.log(
      "K2 — No stack trace headers: " +
        (stackHeaders.length === 0 ? "✓ PASS" : "⚠ FOUND")
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
