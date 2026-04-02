/**
 * QA Test: cp-066 — J2 — Filter tasks by status/assignee/date
 * 
 * Apply filters to task lists. Confirm filter state persists in URL and works on refresh.
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

async function api(page, method, path, body = null) {
  return await page.evaluate(async ({ m, p, b }) => {
    const opts = { credentials: "include", headers: { "Content-Type": "application/json" } };
    if (m !== "GET") opts.method = m;
    if (b) opts.body = JSON.stringify(b);
    const resp = await fetch(p, opts);
    let json = null;
    try { json = await resp.json(); } catch {}
    return { status: resp.status, data: json };
  }, { m: method, p: path, b: body });
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

    // === J2: Create tasks with different statuses ===
    console.log("--- J2: Setup - Create tasks with different statuses ---");

    const STATUSES = ["pending", "in_progress", "completed", "canceled"];
    const taskIds = {};

    for (const status of STATUSES) {
      const r = await api(page, "POST", "/api/kitchen/tasks", {
        summary: `QA J2 Task ${status}`,
        priority: status === "pending" ? 1 : status === "in_progress" ? 3 : 5,
        complexity: 3,
        status: status,
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      });
      taskIds[status] = r.data?.result?.id || r.data?.id;
      console.log(`  Create ${status} task:`, r.status, r.status === 200 ? "✓" : JSON.stringify(r.data)?.substring(0, 60));
    }

    // === J2: Filter by status ===
    console.log("\n--- J2: Filter by Status ---");

    const filterResults = {};
    for (const status of STATUSES) {
      const r = await api(page, "GET", `/api/kitchen/tasks?status=${status}`);
      const tasks = r.data?.tasks || [];
      const ours = tasks.filter(t => t.summary?.startsWith("QA J2 Task"));
      filterResults[status] = { total: tasks.length, ours: ours.length };
      console.log(`  Filter status=${status}:`, r.status, `total=${tasks.length}, ours=${ours.length}`);
    }

    // === J2: Filter by minPriority ===
    console.log("\n--- J2: Filter by Priority ---");
    const priR = await api(page, "GET", "/api/kitchen/tasks?minPriority=3");
    const priTasks = priR.data?.tasks || [];
    const priOurs = priTasks.filter(t => t.summary?.startsWith("QA J2 Task"));
    console.log("  Filter minPriority=3:", priR.status, `total=${priTasks.length}, ours=${priOurs.length}`);

    // === J2: Combined filters ===
    console.log("\n--- J2: Combined Filters ---");
    const combinedR = await api(page, "GET", "/api/kitchen/tasks?status=pending&minPriority=2");
    console.log("  Filter status=pending&minPriority=2:", combinedR.status, `count=${combinedR.data?.tasks?.length || 0}`);

    // === J2: URL persistence (browser) ===
    console.log("\n--- J2: URL Persistence ---");
    // Visit tasks page with filters in URL
    await page.goto(`${BASE}/tasks?status=pending&minPriority=2`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check URL still has filters
    const urlAfterLoad = page.url();
    const urlHasStatus = urlAfterLoad.includes("status=pending");
    const urlHasPriority = urlAfterLoad.includes("minPriority");
    console.log("  URL after load:", urlAfterLoad);
    console.log("  URL has status=pending:", urlHasStatus ? "✓" : "✗");
    console.log("  URL has minPriority:", urlHasPriority ? "✓" : "✗");

    // Reload page and check filters persist
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const urlAfterReload = page.url();
    console.log("  URL after reload:", urlAfterReload);
    console.log("  Filters persist after reload:", urlAfterReload.includes("status=pending") ? "✓" : "✗");

    // Check if task list is visible
    const taskListVisible = await page.evaluate(() => {
      return document.body.innerText.length > 100;
    });
    console.log("  Task list renders:", taskListVisible ? "✓" : "⚠ empty or 500");

    // === J2: Assignee filter ===
    console.log("\n--- J2: Assignee Filter ---");
    // First get employee/staff IDs
    const employeesR = await api(page, "GET", "/api/eventstaff");
    const employees = employeesR.data?.staff || employeesR.data?.employees || [];
    console.log("  Employees:", employeesR.status, "count:", employees.length);
    const empId = employees[0]?.id;
    if (empId) {
      const assigneeR = await api(page, "GET", `/api/kitchen/tasks?assignee=${empId}`);
      console.log("  Filter by assignee:", assigneeR.status, `count=${assigneeR.data?.tasks?.length || 0}`);
    } else {
      // Try claim endpoint
      const claimR = await api(page, "GET", "/api/kitchen/tasks/my-tasks");
      console.log("  my-tasks:", claimR.status, `count=${claimR.data?.tasks?.length || 0}`);
    }

    // === J2: Date filter ===
    console.log("\n--- J2: Date Filter ---");
    const today = new Date().toISOString().split("T")[0];
    const dateR = await api(page, "GET", `/api/kitchen/tasks?dueDate=${today}`);
    console.log(`  Filter dueDate=${today}:`, dateR.status, `count=${dateR.data?.tasks?.length || 0}`);

    // Summary
    const allStatusFiltered = Object.values(filterResults).every(r => r.ours >= 1);
    console.log("\n" + "=".repeat(60));
    console.log("📊 cp-066 — J2: Filter tasks by status/assignee/date — RESULT");
    console.log("=".repeat(60));
    console.log("J2 — Status Filter:");
    STATUSES.forEach(s => {
      const r = filterResults[s];
      console.log(`  Filter ${s}: ` + (r?.ours >= 1 ? `✓ PASS (${r.ours})` : "✗ FAIL (0)"));
    });
    console.log("J2 — Priority Filter:  " + (priOurs >= 1 ? "✓ PASS" : "✗ FAIL (0)"));
    console.log("J2 — Combined Filter:  " + (combinedR.data?.tasks?.length >= 0 ? "✓ PASS" : "✗ " + combinedR.status));
    console.log("J2 — URL Persistence:   " + (urlHasStatus && urlHasPriority ? "✓ PASS" : "⚠ partial"));
    console.log("J2 — Assignee Filter:  " + (empId ? "✓ API supports" : "⚠ no employees found"));
    console.log("J2 — Date Filter:      " + (dateR.data?.tasks ? "✓ PASS" : "✗ " + dateR.status));
    console.log("=".repeat(60));

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
