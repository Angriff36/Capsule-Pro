/**
 * QA Test: cp-065 — J1 — Global search for event/task
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
      return { status: resp.status, data: json };
    },
    { m: method, p: path, b: body }
  );
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    console.log("Authenticating...");
    await auth(page, ctx);
    console.log("  ✓ Authenticated\n");

    // Get existing events to have real search terms
    const eventsR = await api(page, "GET", "/api/events?page=1&limit=5");
    const events = eventsR.data?.events || eventsR.data?.data || [];
    const eventName = events[0]?.name || "Battle Board";
    const eventId = events[0]?.id || "";

    // Get existing tasks
    const tasksR = await api(page, "GET", "/api/kitchen/tasks");
    const tasks = tasksR.data?.tasks || [];
    const taskTitle = tasks[0]?.title || tasks[0]?.name || "";

    // === J1: Global Search ===
    console.log("--- J1: Global Search ---");

    // Search for event name
    const searchEventR = await api(
      page,
      "GET",
      "/api/search?q=" + encodeURIComponent(eventName) + "&type=event"
    );
    const eventResults = searchEventR.data?.results || searchEventR.data || [];
    console.log(
      "J1: Search by event name ('" + eventName.substring(0, 20) + "'):",
      searchEventR.status,
      "results:",
      eventResults.length
    );

    // Search for task title
    const searchTaskR = await api(
      page,
      "GET",
      "/api/search?q=" + encodeURIComponent(taskTitle) + "&type=task"
    );
    const taskResults = searchTaskR.data?.results || searchTaskR.data || [];
    console.log(
      "J1: Search by task title ('" + taskTitle.substring(0, 20) + "'):",
      searchTaskR.status,
      "results:",
      taskResults.length
    );

    // Global search (all types)
    const globalR = await api(page, "GET", "/api/search?q=battle&limit=10");
    const globalResults = globalR.data?.results || globalR.data || [];
    console.log(
      "J1: Global search ('battle'):",
      globalR.status,
      "results:",
      globalResults.length
    );

    // Search with no query
    const emptyR = await api(page, "GET", "/api/search");
    console.log(
      "J1: No query:",
      emptyR.status,
      emptyR.status === 200 || emptyR.status === 400 || emptyR.status === 422
        ? "✓ handled"
        : "⚠ " + emptyR.status
    );

    // Navigate to search UI
    await page.goto(`${BASE}/search`, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    await page.waitForTimeout(3000);
    const pageText = await page.evaluate(() => document.body.innerText);
    const searchLoaded = pageText.length > 50;
    console.log("J1: Search UI page:", searchLoaded ? "✓ loads" : "✗ empty");

    console.log("\n" + "=".repeat(60));
    console.log("📊 cp-065 — J1: Global search — RESULT");
    console.log("=".repeat(60));
    console.log(
      "J1 — Search events:        " +
        (searchEventR.status === 200 ? "✓ PASS" : "✗ " + searchEventR.status)
    );
    console.log(
      "J1 — Search tasks:        " +
        (searchTaskR.status === 200 ? "✓ PASS" : "✗ " + searchTaskR.status)
    );
    console.log(
      "J1 — Global search:        " +
        (globalR.status === 200 ? "✓ PASS" : "✗ " + globalR.status)
    );
    console.log(
      "J1 — Search UI:            " + (searchLoaded ? "✓ PASS" : "✗ empty")
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
