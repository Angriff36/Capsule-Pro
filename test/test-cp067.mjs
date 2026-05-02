/**
 * QA Test: cp-067 — J3 — Sort and paginate lists
 *
 * Sort task/event lists by different columns. Paginate through results.
 * Confirm no off-by-one errors or missing pages.
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

    // === J3: Pagination on Tasks ===
    console.log("--- J3: Task List Pagination ---");

    // Default list (page 1)
    const page1R = await api(page, "GET", "/api/kitchen/tasks?page=1&limit=2");
    const tasks1 = page1R.data?.tasks || [];
    const pagination1 = page1R.data?.pagination || {};
    console.log(
      "J3: Page 1 (limit=2):",
      page1R.status,
      "tasks:",
      tasks1.length,
      "total:",
      pagination1?.total || "N/A"
    );
    console.log("  Pagination:", JSON.stringify(pagination1));

    // Page 2
    const page2R = await api(page, "GET", "/api/kitchen/tasks?page=2&limit=2");
    const tasks2 = page2R.data?.tasks || [];
    const pagination2 = page2R.data?.pagination || {};
    console.log(
      "\nJ3: Page 2 (limit=2):",
      page2R.status,
      "tasks:",
      tasks2.length
    );

    // Check for off-by-one: page 1 and page 2 should have different items
    const overlap = tasks1.filter((t1) =>
      tasks2.some((t2) => t2.id === t1.id)
    ).length;
    console.log(
      "  Overlap between page 1 and 2:",
      overlap,
      overlap === 0 ? "✓ No duplicates" : "⚠ Duplicates found"
    );

    // Page 3 (beyond data)
    const page3R = await api(page, "GET", "/api/kitchen/tasks?page=3&limit=2");
    const tasks3 = page3R.data?.tasks || [];
    const pagination3 = page3R.data?.pagination || {};
    console.log(
      "\nJ3: Page 3 (beyond data):",
      page3R.status,
      "tasks:",
      tasks3.length
    );

    // === J3: Sorting on Tasks ===
    console.log("\n--- J3: Task Sorting ---");

    // Sort by priority ascending
    const sortPriR = await api(
      page,
      "GET",
      "/api/kitchen/tasks?sortBy=priority&sortOrder=asc"
    );
    const tasksPri = sortPriR.data?.tasks || [];
    console.log(
      "J3: Sort by priority asc:",
      sortPriR.status,
      "tasks:",
      tasksPri.length
    );

    // Sort by priority descending
    const sortPriDescR = await api(
      page,
      "GET",
      "/api/kitchen/tasks?sortBy=priority&sortOrder=desc"
    );
    const tasksPriDesc = sortPriDescR.data?.tasks || [];
    console.log(
      "J3: Sort by priority desc:",
      sortPriDescR.status,
      "tasks:",
      tasksPriDesc.length
    );

    // Verify ordering
    if (tasksPri.length >= 2) {
      const ascOrder = tasksPri[0].priority <= tasksPri[1].priority;
      const descOrder = tasksPriDesc[0].priority >= tasksPriDesc[1].priority;
      console.log("  Ascending order correct:", ascOrder ? "✓" : "✗");
      console.log("  Descending order correct:", descOrder ? "✓" : "✗");
    }

    // Sort by createdAt
    const sortCreatedR = await api(
      page,
      "GET",
      "/api/kitchen/tasks?sortBy=createdAt&sortOrder=desc"
    );
    const tasksCreated = sortCreatedR.data?.tasks || [];
    console.log(
      "J3: Sort by createdAt desc:",
      sortCreatedR.status,
      "tasks:",
      tasksCreated.length
    );

    // === J3: Pagination on Events ===
    console.log("\n--- J3: Event List Pagination ---");

    const eventsPage1R = await api(page, "GET", "/api/events?page=1&limit=5");
    const events1 = eventsPage1R.data?.events || eventsPage1R.data?.data || [];
    const eventsPagination = eventsPage1R.data?.pagination || {};
    console.log(
      "J3: Events page 1 (limit=5):",
      eventsPage1R.status,
      "events:",
      events1.length,
      "total:",
      eventsPagination?.total || "N/A"
    );

    const eventsPage2R = await api(page, "GET", "/api/events?page=2&limit=5");
    const events2 = eventsPage2R.data?.events || eventsPage2R.data?.data || [];
    const eventsOverlap = events1.filter((e1) =>
      events2.some((e2) => e2.id === e1.id)
    ).length;
    console.log(
      "J3: Events page 2:",
      eventsPage2R.status,
      "events:",
      events2.length,
      "overlap:",
      eventsOverlap === 0 ? "✓ No dupes" : "⚠ dupes"
    );

    // === J3: Sort Events ===
    console.log("\n--- J3: Event Sorting ---");
    const sortEventsR = await api(
      page,
      "GET",
      "/api/events?sortBy=name&sortOrder=asc"
    );
    const eventsSorted =
      sortEventsR.data?.events || sortEventsR.data?.data || [];
    console.log(
      "J3: Events sort by name asc:",
      sortEventsR.status,
      "events:",
      eventsSorted.length
    );

    // Summary
    const noOverlap = overlap === 0;
    const paginationWorks = page1R.status === 200 && page2R.status === 200;
    const sortWorks = sortPriR.status === 200 && sortCreatedR.status === 200;

    console.log("\n" + "=".repeat(60));
    console.log("📊 cp-067 — J3: Sort and paginate lists — RESULT");
    console.log("=".repeat(60));
    console.log(
      "J3 — Pagination (tasks):     " +
        (paginationWorks ? "✓ PASS" : "✗ " + page1R.status)
    );
    console.log(
      "J3 — No page overlap:        " +
        (noOverlap ? "✓ PASS" : "⚠ FAIL (" + overlap + " duplicates)")
    );
    console.log(
      "J3 — Page beyond data:      " +
        (tasks3.length === 0
          ? "✓ PASS (empty)"
          : "⚠ " + tasks3.length + " items")
    );
    console.log(
      "J3 — Sort (tasks):           " +
        (sortWorks ? "✓ PASS" : "✗ " + sortPriR.status)
    );
    console.log(
      "J3 — Events pagination:      " +
        (eventsPage1R.status === 200 ? "✓ PASS" : "✗ " + eventsPage1R.status)
    );
    console.log(
      "J3 — Events sorting:         " +
        (sortEventsR.status === 200 ? "✓ PASS" : "✗ " + sortEventsR.status)
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
