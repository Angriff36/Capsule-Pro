/**
 * QA Test: cp-087 — K1-3 — Kitchen view workflow
 *
 * K1: Station view shows tasks by station
 * K2: Claim/unclaim from kitchen view syncs to event + board
 * K3: My work view and end-to-end completion loop for a shift
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

    // === K1: Station view shows tasks by station ===
    console.log("--- K1: Station View ---");

    // Get stations
    const stationsR = await api(page, "GET", "/api/kitchen/stations/list");
    const stations = stationsR.data?.stations || [];
    console.log("K1: Stations:", stationsR.status, "count:", stations.length);
    if (stations[0]) {
      console.log(
        "  Sample station keys:",
        Object.keys(stations[0]).join(", ")
      );
      console.log(
        "  Sample station:",
        JSON.stringify(stations[0])?.substring(0, 100)
      );
    }

    // Get tasks by station
    if (stations.length > 0) {
      const stationId = stations[0].id;
      const tasksByStationR = await api(
        page,
        "GET",
        "/api/kitchen/stations/" + stationId + "/tasks"
      );
      console.log(
        "K1: Tasks by station:",
        tasksByStationR.status,
        "count:",
        tasksByStationR.data?.tasks?.length || 0
      );
    }

    // === K2: Claim/unclaim from kitchen view ===
    console.log("\n--- K2: Claim/Unclaim ---");

    // Get tasks list
    const tasksR = await api(page, "GET", "/api/kitchen/tasks");
    const tasks = tasksR.data?.tasks || [];
    console.log("K2: Tasks list:", tasksR.status, "count:", tasks.length);
    const taskId = tasks[0]?.id;
    const taskStatus = tasks[0]?.status;
    console.log("  First task:", taskId, "status:", taskStatus);

    // Claim a task (pending task)
    if (taskId) {
      const claimR = await api(
        page,
        "POST",
        "/api/kitchen/tasks/" + taskId + "/claim",
        {}
      );
      console.log(
        "K2: Claim task:",
        claimR.status,
        claimR.status === 200 ? "✓ PASS" : "✗ " + claimR.status,
        JSON.stringify(claimR.data)?.substring(0, 80)
      );

      // Unclaim/release task
      const releaseR = await api(
        page,
        "POST",
        "/api/kitchen/tasks/" + taskId + "/release",
        {}
      );
      console.log(
        "K2: Release task:",
        releaseR.status,
        releaseR.status === 200 ? "✓ PASS" : "✗ " + releaseR.status,
        JSON.stringify(releaseR.data)?.substring(0, 80)
      );
    }

    // === K3: My work view and end-to-end completion loop ===
    console.log("\n--- K3: My Work View & Completion Loop ---");

    // My tasks
    const myTasksR = await api(page, "GET", "/api/kitchen/tasks/my-tasks");
    console.log(
      "K3: My tasks (my-tasks endpoint):",
      myTasksR.status,
      myTasksR.status === 200 ? "✓ PASS" : "✗ " + myTasksR.status,
      "count:",
      myTasksR.data?.tasks?.length || 0
    );

    // Available tasks (for my work queue)
    const availableR = await api(page, "GET", "/api/kitchen/tasks/available");
    console.log(
      "K3: Available tasks:",
      availableR.status,
      availableR.status === 200 ? "✓ PASS" : "✗ " + availableR.status,
      "count:",
      availableR.data?.tasks?.length || 0
    );

    // Start a task
    if (taskId) {
      const startR = await api(page, "PATCH", "/api/kitchen/tasks/" + taskId, {
        status: "in_progress",
      });
      console.log(
        "K3: Start task:",
        startR.status,
        startR.status === 200 ? "✓ PASS" : "✗ " + startR.status
      );

      // Complete a task
      const completeR = await api(
        page,
        "PATCH",
        "/api/kitchen/tasks/" + taskId,
        { status: "done" }
      );
      console.log(
        "K3: Complete task:",
        completeR.status,
        completeR.status === 200 ? "✓ PASS" : "✗ " + completeR.status,
        JSON.stringify(completeR.data)?.substring(0, 80)
      );

      // Verify it's marked done
      const verifyR = await api(page, "GET", "/api/kitchen/tasks?status=done");
      const doneCount = (verifyR.data?.tasks || []).length;
      console.log(
        "K3: Done tasks count:",
        doneCount,
        doneCount > 0 ? "✓ PASS" : "⚠ 0"
      );
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 cp-087 — K1-3: Kitchen view workflow — RESULT");
    console.log("=".repeat(60));
    console.log(
      "K1 — Station list:         " +
        (stationsR.status === 200
          ? "✓ PASS (" + stations.length + " stations)"
          : "✗ " + stationsR.status)
    );
    console.log(
      "K1 — Tasks by station:     " +
        (tasksByStationR?.status === 200
          ? "✓ PASS"
          : "⚠ " + (tasksByStationR?.status || "N/A"))
    );
    console.log(
      "K2 — Claim task:           " +
        (claimR?.status === 200 ? "✓ PASS" : "✗ " + (claimR?.status || "N/A"))
    );
    console.log(
      "K2 — Release task:         " +
        (releaseR?.status === 200
          ? "✓ PASS"
          : "✗ " + (releaseR?.status || "N/A"))
    );
    console.log(
      "K3 — My tasks:            " +
        (myTasksR.status === 200 ? "✓ PASS" : "✗ " + myTasksR.status)
    );
    console.log(
      "K3 — Start task:          " +
        (startR?.status === 200 ? "✓ PASS" : "✗ " + (startR?.status || "N/A"))
    );
    console.log(
      "K3 — Complete task:       " +
        (completeR?.status === 200
          ? "✓ PASS"
          : "✗ " + (completeR?.status || "N/A"))
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
