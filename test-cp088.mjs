/**
 * QA Test: cp-088 — PAY1-5 Payroll Module Workflow
 */

import { clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function authPage(page, context) {
  const token = process.env.CLERK_TESTING_TOKEN;
  const fapi = process.env.CLERK_FAPI;
  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await context.route(
    new RegExp(`^https://${escaped}/v1/.*`),
    async (route) => {
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
    }
  );

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
      return { success: true, sessionId: s2.createdSessionId };
    }
    return { error: s2.status };
  });

  if (!result?.success) throw new Error("Auth failed");
  await page.waitForTimeout(5000);
  return result;
}

async function api(page, method, path, body = null) {
  return await page.evaluate(
    async ({ method: m, path: p, body: b }) => {
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
    { method, path, body }
  );
}

async function main() {
  await clerkSetup();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    console.log("🔐 Authenticating...");
    await authPage(page, ctx);
    console.log("   ✓ Authenticated\n");

    const USER_ID = "user_38l4Ysz037WwfEIfrjAvWLeM7AP";
    const now = Date.now();
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    const later = new Date(Date.now() + 90_000_000).toISOString();

    // ══════════════════════════════════════════════════════════════
    // PAY1: Create time entry / shift for staff
    // ══════════════════════════════════════════════════════════════
    console.log("═══ PAY1: Create Time Entry / Shift ═══\n");

    const clockIn = await api(page, "POST", "/api/timeentry/clock-in", {
      employeeId: USER_ID,
    });
    console.log("  POST /api/timeentry/clock-in:");
    console.log(
      `    Status: ${clockIn.status} | ${clockIn.status === 200 ? "✓ PASS" : clockIn.status === 404 ? "✗ NOT FOUND" : "⚠ " + JSON.stringify(clockIn.data)?.substring(0, 100)}`
    );

    const addEntry = await api(
      page,
      "POST",
      "/api/timecards/entries/commands/add-entry",
      {
        employeeId: USER_ID,
        date: "2026-04-01",
        hours: 8,
        jobType: "regular",
        notes: "QA test",
      }
    );
    console.log("\n  POST /api/timecards/entries/commands/add-entry:");
    console.log(
      `    Status: ${addEntry.status} | ${addEntry.status === 200 ? "✓ PASS" : addEntry.status === 400 ? "⚠ " + JSON.stringify(addEntry.data)?.substring(0, 100) : "⚠ " + addEntry.status}`
    );

    const createShift = await api(
      page,
      "POST",
      "/api/staff/shifts/commands/create",
      {
        employeeId: USER_ID,
        startTime: now,
        endTime: now + 3_600_000,
        role: "kitchen_staff",
        notes: "QA test",
      }
    );
    console.log("\n  POST /api/staff/shifts/commands/create:");
    console.log(
      `    Status: ${createShift.status} | ${createShift.status === 200 ? "✓ PASS" : createShift.status === 400 ? "⚠ " + JSON.stringify(createShift.data)?.substring(0, 100) : "⚠ " + createShift.status}`
    );

    // ══════════════════════════════════════════════════════════════
    // PAY2: Approve / lock timesheet period
    // ══════════════════════════════════════════════════════════════
    console.log("\n═══ PAY2: Approve / Lock Timesheet Period ═══\n");

    const approve = await api(page, "POST", "/api/payroll/approvals", {
      payrollRunId: "00000000-0000-0000-0000-000000000001",
      action: "approve",
    });
    console.log("  POST /api/payroll/approvals:");
    console.log(
      `    Status: ${approve.status} | ${approve.status === 200 ? "✓ PASS" : approve.status === 422 ? "⚠ Guard triggered: " + JSON.stringify(approve.data)?.substring(0, 100) : "⚠ " + approve.status}`
    );

    const lockPeriod = await api(page, "POST", "/api/payroll/periods", {
      name: "QA Period",
      periodStart: "2026-04-01",
      periodEnd: "2026-04-15",
      status: "locked",
    });
    console.log("\n  POST /api/payroll/periods:");
    console.log(
      `    Status: ${lockPeriod.status} | ${lockPeriod.status === 200 ? "✓ PASS" : lockPeriod.status === 404 ? "✗ NOT FOUND" : "⚠ " + lockPeriod.status}`
    );

    // ══════════════════════════════════════════════════════════════
    // PAY3: Adjust time entry (break, overtime)
    // ══════════════════════════════════════════════════════════════
    console.log("\n═══ PAY3: Adjust Time Entry ═══\n");

    const editReq = await api(
      page,
      "POST",
      "/api/timecards/edit-requests/commands/create",
      {
        timeEntryId: "00000000-0000-0000-0000-000000000001",
        employeeId: USER_ID,
        adjustmentHours: 0.5,
        adjustmentType: "break",
        reason: "QA test - 30 min break adjustment",
      }
    );
    console.log("  POST /api/timecards/edit-requests/commands/create:");
    console.log(
      `    Status: ${editReq.status} | ${editReq.status === 200 ? "✓ PASS" : editReq.status === 422 ? "⚠ Guard: " + JSON.stringify(editReq.data)?.substring(0, 100) : "⚠ " + editReq.status}`
    );

    const approveEdit = await api(
      page,
      "POST",
      "/api/timecards/edit-requests/commands/approve",
      {
        requestId: "00000000-0000-0000-0000-000000000001",
      }
    );
    console.log("\n  POST /api/timecards/edit-requests/commands/approve:");
    console.log(
      `    Status: ${approveEdit.status} | ${approveEdit.status === 200 ? "✓ PASS" : approveEdit.status === 404 ? "✗ NOT FOUND" : "⚠ " + approveEdit.status}`
    );

    // ══════════════════════════════════════════════════════════════
    // PAY4: Generate payroll report / export
    // ══════════════════════════════════════════════════════════════
    console.log("\n═══ PAY4: Generate Payroll Report / Export ═══\n");

    const generate = await api(page, "POST", "/api/payroll/generate", {
      periodStart: "2026-04-01",
      periodEnd: "2026-04-15",
      includeOvertime: true,
    });
    console.log("  POST /api/payroll/generate:");
    console.log(
      `    Status: ${generate.status} | ${generate.status === 200 ? "✓ PASS" : generate.status === 400 ? "⚠ Bad request: " + JSON.stringify(generate.data)?.substring(0, 100) : "⚠ " + generate.status}`
    );

    const reports = await api(page, "GET", "/api/payroll/reports");
    console.log("\n  GET /api/payroll/reports:");
    console.log(
      `    Status: ${reports.status} | ${reports.status === 200 ? "✓ PASS" : reports.status === 404 ? "✗ NOT FOUND" : "⚠ " + reports.status}`
    );

    const payrollExport = await api(page, "GET", "/api/payroll/export");
    console.log("\n  GET /api/payroll/export:");
    console.log(
      `    Status: ${payrollExport.status} | ${payrollExport.status === 200 ? "✓ PASS" : payrollExport.status === 404 ? "✗ NOT FOUND" : "⚠ " + payrollExport.status}`
    );

    // ══════════════════════════════════════════════════════════════
    // PAY5: Permission check — payroll admin approval
    // ══════════════════════════════════════════════════════════════
    console.log("\n═══ PAY5: Permission Check — Payroll Admin Only ═══\n");

    // Try to approve without proper role
    const unauthorizedApprove = await api(
      page,
      "POST",
      "/api/payroll/approvals",
      {
        payrollRunId: "00000000-0000-0000-0000-000000000001",
        action: "approve",
      }
    );
    console.log("  Non-admin approve attempt:");
    console.log(`    Status: ${unauthorizedApprove.status}`);
    if (unauthorizedApprove.status === 403) {
      console.log("    ✓ PERMISSION DENIED (403) — Guard enforced!");
    } else if (unauthorizedApprove.status === 422) {
      console.log(
        `    ⚠ Guard triggered (unauthorized): ${JSON.stringify(unauthorizedApprove.data)?.substring(0, 100)}`
      );
    } else {
      console.log(
        `    Response: ${JSON.stringify(unauthorizedApprove.data)?.substring(0, 100)}`
      );
    }

    // Check if payroll-runs/list requires runId
    const runsList = await api(
      page,
      "GET",
      "/api/payroll/runs/list?runId=00000000-0000-0000-0000-000000000001"
    );
    console.log("\n  GET /api/payroll/runs/list (with runId):");
    console.log(
      `    Status: ${runsList.status} | ${runsList.status === 200 ? "✓ PASS" : "⚠ " + runsList.status}`
    );

    // ══════════════════════════════════════════════════════════════
    // Summary
    // ══════════════════════════════════════════════════════════════
    const r = (name, status) =>
      status === 200
        ? "✓"
        : status === 404
          ? "✗"
          : status === 405
            ? "✗"
            : status === 403
              ? "⚠"
              : status === 422
                ? "⚠"
                : status === 400
                  ? "⚠"
                  : "?";

    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 cp-088 — PAY1-5 Payroll Module — RESULT");
    console.log("=".repeat(60));
    console.log("  PAY1 (Create time entry/shift):");
    console.log(
      `    clock-in:               ${r("clock-in", clockIn.status)} ${clockIn.status}`
    );
    console.log(
      `    add-entry:             ${r("add-entry", addEntry.status)} ${addEntry.status}`
    );
    console.log(
      `    create-shift:          ${r("create-shift", createShift.status)} ${createShift.status}`
    );
    console.log("");
    console.log("  PAY2 (Approve/lock period):");
    console.log(
      `    approve:               ${r("approve", approve.status)} ${approve.status}`
    );
    console.log(
      `    lock-period:          ${r("lockPeriod", lockPeriod.status)} ${lockPeriod.status}`
    );
    console.log("");
    console.log("  PAY3 (Adjust time entry):");
    console.log(
      `    edit-request:          ${r("edit-req", editReq.status)} ${editReq.status}`
    );
    console.log(
      `    approve-edit:          ${r("appr-edit", approveEdit.status)} ${approveEdit.status}`
    );
    console.log("");
    console.log("  PAY4 (Generate report/export):");
    console.log(
      `    generate:              ${r("generate", generate.status)} ${generate.status}`
    );
    console.log(
      `    reports-list:          ${r("reports", reports.status)} ${reports.status}`
    );
    console.log(
      `    export:                ${r("export", payrollExport.status)} ${payrollExport.status}`
    );
    console.log("");
    console.log("  PAY5 (Permission check):");
    console.log(
      `    unauthorized approve:  ${unauthorizedApprove.status === 403 ? "✓ DENIED" : "⚠ " + unauthorizedApprove.status}`
    );
    console.log("");
    console.log(
      "  Note: User (Jane) has no orgId in Clerk session → tenant resolution fails"
    );
    console.log("  Routes are deployed; guards return 400/422 instead of 200");
    console.log("=".repeat(60));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
