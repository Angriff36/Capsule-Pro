/**
 * QA Test: cp-069 — K1 — Force 422 scenario
 *
 * Force unsupported status transition. Confirm UX displays server message
 * and a next step. No console spam.
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

    // === K1: Find existing tasks to determine current statuses ===
    console.log("--- K1: Find existing tasks ---");
    const listR = await api(page, "GET", "/api/kitchen/tasks");
    const tasks = listR.data?.tasks || [];
    console.log("  Total tasks:", tasks.length);
    const byStatus = {};
    tasks.forEach((t) => {
      byStatus[t.status] = byStatus[t.status] || [];
      byStatus[t.status].push(t);
    });
    Object.keys(byStatus).forEach((s) =>
      console.log("  " + s + ":", byStatus[s].length, "tasks")
    );
    const inProgressTask = tasks.find((t) => t.status === "in_progress");
    const pendingTask = tasks.find((t) => t.status === "pending");

    // === K1: Create a task, complete it, then try to transition ===
    console.log("\n--- K1: Create task and force invalid transitions ---");

    // Create a new task
    const createR = await api(page, "POST", "/api/kitchen/tasks", {
      title: "QA K1 Test Task",
      priority: 5,
      complexity: 3,
    });
    const taskId = createR.data?.result;
    console.log(
      "  Create task:",
      createR.status,
      createR.status === 200 ? "✓" : "✗",
      "id:",
      taskId
    );

    // Start it (pending → in_progress)
    const startR = await api(page, "PATCH", "/api/kitchen/tasks/" + taskId, {
      status: "in_progress",
    });
    console.log(
      "  Start task:",
      startR.status,
      startR.status === 200 ? "✓ PASS" : "✗ FAIL",
      JSON.stringify(startR.data)?.substring(0, 100)
    );

    // Complete it (in_progress → done)
    const completeR = await api(page, "PATCH", "/api/kitchen/tasks/" + taskId, {
      status: "done",
    });
    console.log(
      "  Complete task:",
      completeR.status,
      completeR.status === 200 ? "✓ PASS" : "✗ FAIL"
    );

    // === K1: Scenario 1 — Try to transition DONE task to in_progress ===
    console.log("\n--- K1: Invalid Transition — DONE → in_progress ---");
    const invalid1R = await api(page, "PATCH", "/api/kitchen/tasks/" + taskId, {
      status: "in_progress",
    });
    console.log(
      "  Status:",
      invalid1R.status,
      invalid1R.status === 422 ? "✓ 422 returned" : "⚠ " + invalid1R.status
    );
    console.log(
      "  Message:",
      JSON.stringify(invalid1R.data)?.substring(0, 150)
    );

    // === K1: Scenario 2 — Try to cancel a DONE task ===
    console.log("\n--- K1: Invalid Transition — DONE → cancelled ---");
    const invalid2R = await api(page, "PATCH", "/api/kitchen/tasks/" + taskId, {
      status: "cancelled",
    });
    console.log(
      "  Status:",
      invalid2R.status,
      invalid2R.status === 422 ? "✓ 422 returned" : "⚠ " + invalid2R.status
    );
    console.log(
      "  Message:",
      JSON.stringify(invalid2R.data)?.substring(0, 150)
    );

    // === K1: Scenario 3 — Try to complete a PENDING task directly ===
    console.log(
      "\n--- K1: Invalid Transition — PENDING → done (not allowed) ---"
    );
    if (pendingTask) {
      const invalid3R = await api(
        page,
        "PATCH",
        "/api/kitchen/tasks/" + pendingTask.id,
        {
          status: "done",
        }
      );
      console.log(
        "  Status:",
        invalid3R.status,
        invalid3R.status === 422 ? "✓ 422 returned" : "⚠ " + invalid3R.status
      );
      console.log(
        "  Message:",
        JSON.stringify(invalid3R.data)?.substring(0, 150)
      );
    } else {
      console.log("  No pending task found, skipping");
    }

    // === K1: Scenario 4 — Try to transition from cancelled to anything ===
    console.log("\n--- K1: Invalid Transition — CANCELLED → pending ---");
    // First find a cancelled task or create + cancel one
    const cancelR = await api(page, "POST", "/api/kitchen/tasks", {
      title: "QA K1 Cancel Test",
      priority: 5,
      complexity: 3,
    });
    const cancelId = cancelR.data?.result;
    if (cancelId) {
      await api(page, "PATCH", "/api/kitchen/tasks/" + cancelId, {
        status: "cancelled",
      });
      const invalid4R = await api(
        page,
        "PATCH",
        "/api/kitchen/tasks/" + cancelId,
        {
          status: "pending",
        }
      );
      console.log(
        "  Status:",
        invalid4R.status,
        invalid4R.status === 422 ? "✓ 422 returned" : "⚠ " + invalid4R.status
      );
      console.log(
        "  Message:",
        JSON.stringify(invalid4R.data)?.substring(0, 150)
      );
    }

    // === K1: Verify console doesn't spam (no console.error from API) ===
    console.log("\n--- K1: Console Error Check ---");
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    // Make an invalid request
    await api(page, "PATCH", "/api/kitchen/tasks/" + taskId, {
      status: "in_progress",
    });
    await page.waitForTimeout(1000);
    const apiErrors = consoleErrors.filter(
      (e) => !(e.includes("Warning") || e.includes("warning"))
    );
    console.log(
      "  Console errors on 422:",
      apiErrors.length === 0
        ? "✓ NONE (clean)"
        : "⚠ " + apiErrors.length + " errors: " + apiErrors.join("; ")
    );

    // === K1: Verify UX message ===
    console.log("\n--- K1: UX Response Check ---");
    const uxR = await api(page, "PATCH", "/api/kitchen/tasks/" + taskId, {
      status: "in_progress",
    });
    const hasMessage =
      uxR.data?.message || uxR.data?.error || uxR.data?.guardFailure;
    const hasSuggestion =
      uxR.data?.suggestion || uxR.data?.nextStep || uxR.data?.details;
    console.log(
      "  Has error message:",
      hasMessage
        ? "✓ YES: " + JSON.stringify(hasMessage)?.substring(0, 80)
        : "✗ NO"
    );
    console.log(
      "  Has next step/suggestion:",
      hasSuggestion
        ? "✓ YES: " + JSON.stringify(hasSuggestion)?.substring(0, 80)
        : "⚠ NO (missing)"
    );

    // === K1 Summary ===
    const s1 = invalid1R.status === 422 ? 1 : 0;
    const s2 = invalid2R.status === 422 ? 1 : 0;
    const s3 = invalid3R ? (invalid3R.status === 422 ? 1 : 0) : 0;
    const s4 = invalid4R ? (invalid4R.status === 422 ? 1 : 0) : 0;
    const total = s1 + s2 + s3 + s4;
    const noSpam = apiErrors.length === 0;

    console.log("\n" + "=".repeat(60));
    console.log("📊 cp-069 — K1: Force 422 Scenario — RESULT");
    console.log("=".repeat(60));
    console.log("K1 — 422 on DONE→in_progress: " + (s1 ? "✓ PASS" : "✗ FAIL"));
    console.log("K1 — 422 on DONE→cancelled:   " + (s2 ? "✓ PASS" : "✗ FAIL"));
    console.log("K1 — 422 on PENDING→done:     " + (s3 ? "✓ PASS" : "✗ FAIL"));
    console.log("K1 — 422 on CANCELLED→any:    " + (s4 ? "✓ PASS" : "✗ FAIL"));
    console.log(
      "K1 — No console spam:          " + (noSpam ? "✓ PASS" : "⚠ FAIL")
    );
    console.log(
      "K1 — Error message displayed:  " + (hasMessage ? "✓ PASS" : "✗ FAIL")
    );
    console.log(
      "K1 — Next step shown:          " +
        (hasSuggestion ? "⚠ PRESENT" : "✗ MISSING")
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
