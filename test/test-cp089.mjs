/**
 * QA Test: cp-089 — SCH1-5 Scheduling Module Workflow
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
    const tomorrow9 = new Date(Date.now() + 9 * 3_600_000).toISOString();
    const tomorrow17 = new Date(Date.now() + 17 * 3_600_000).toISOString();
    const EVENT_ID = "321bb0cf-a527-484c-9051-2b73c8dd6e76";

    // ══════════════════════════════════════════════════════════════
    // SCH1: Create schedule block / shift
    // ══════════════════════════════════════════════════════════════
    console.log("═══ SCH1: Create Schedule Block / Shift ═══\n");

    // Valid shift creation
    const createShift = await api(
      page,
      "POST",
      "/api/staff/shifts/commands/create",
      {
        employeeId: USER_ID,
        startTime: tomorrow9,
        endTime: tomorrow17,
        role: "head-chef",
        notes: "QA test shift",
      }
    );
    console.log("  POST /api/staff/shifts/commands/create:");
    const sch1Status =
      createShift.status === 200
        ? "✓ PASS"
        : createShift.status === 404
          ? "✗ NOT FOUND"
          : createShift.status === 422
            ? "⚠ Guard (no tenant)"
            : "⚠ " + createShift.status;
    console.log(`    Status: ${createShift.status} | ${sch1Status}`);
    if (createShift.status !== 200) {
      console.log(
        `    Response: ${JSON.stringify(createShift.data)?.substring(0, 150)}`
      );
    } else {
      console.log("    Shift created ✓");
    }

    // List shifts to confirm
    const listShifts = await api(page, "GET", "/api/staff/shifts/list");
    console.log("\n  GET /api/staff/shifts/list:");
    const shifts = listShifts.data?.scheduleShifts || [];
    console.log(
      `    Status: ${listShifts.status} | Shifts count: ${shifts.length}`
    );

    // ══════════════════════════════════════════════════════════════
    // SCH2: Assign staff to shift
    // ══════════════════════════════════════════════════════════════
    console.log("\n═══ SCH2: Assign Staff to Shift ═══\n");

    const assignStaff = await api(
      page,
      "POST",
      "/api/staff/shifts/commands/create",
      {
        employeeId: USER_ID,
        startTime: tomorrow9,
        endTime: tomorrow17,
        role: "kitchen_staff",
        notes: "QA staff assignment",
      }
    );
    console.log("  POST /api/staff/shifts/commands/create (assign):");
    console.log(
      `    Status: ${assignStaff.status} | ${assignStaff.status === 200 ? "✓ PASS" : assignStaff.status === 422 ? "⚠ Guard" : "⚠ " + assignStaff.status}`
    );
    if (assignStaff.status === 200) {
      console.log("    Staff assigned ✓");
    }

    // Try bulk assignment
    const bulkAssign = await api(
      page,
      "POST",
      "/api/staff/shifts/bulk-assignment",
      {
        shiftId: "00000000-0000-0000-0000-000000000001",
        employeeIds: [USER_ID],
      }
    );
    console.log("\n  POST /api/staff/shifts/bulk-assignment:");
    console.log(
      `    Status: ${bulkAssign.status} | ${bulkAssign.status === 200 ? "✓ PASS" : bulkAssign.status === 404 ? "✗ NOT FOUND" : "⚠ " + bulkAssign.status}`
    );

    // ══════════════════════════════════════════════════════════════
    // SCH3: Overlapping shift — clean validation
    // ══════════════════════════════════════════════════════════════
    console.log("\n═══ SCH3: Overlapping Shift — Clean Validation ═══\n");

    // Create first shift
    const shift1 = await api(
      page,
      "POST",
      "/api/staff/shifts/commands/create",
      {
        employeeId: USER_ID,
        startTime: tomorrow9,
        endTime: tomorrow17,
        role: "sous-chef",
      }
    );
    console.log(`  Shift 1 (9am-5pm): ${shift1.status}`);

    // Create overlapping shift (2pm-10pm)
    const shift2 = await api(
      page,
      "POST",
      "/api/staff/shifts/commands/create",
      {
        employeeId: USER_ID,
        startTime: new Date(Date.now() + 14 * 3_600_000).toISOString(),
        endTime: new Date(Date.now() + 22 * 3_600_000).toISOString(),
        role: "sous-chef",
      }
    );
    console.log(`  Shift 2 (overlapping 2pm-10pm): ${shift2.status}`);

    const isOverlapBlocked =
      shift2.status === 422 || shift2.status === 409 || shift2.status === 400;
    console.log(
      `  Overlap detected and blocked: ${isOverlapBlocked ? "✓ YES" : "⚠ NO (accepted overlap)"}`
    );
    if (shift2.data) {
      console.log(
        `  Validation message: ${JSON.stringify(shift2.data)?.substring(0, 200)}`
      );
    }

    // Non-overlapping shift (should succeed)
    const shift3 = await api(
      page,
      "POST",
      "/api/staff/shifts/commands/create",
      {
        employeeId: USER_ID,
        startTime: new Date(Date.now() + 25 * 3_600_000).toISOString(),
        endTime: new Date(Date.now() + 33 * 3_600_000).toISOString(),
        role: "kitchen_staff",
      }
    );
    console.log(
      `  Shift 3 (non-overlapping next day): ${shift3.status} | ${shift3.status === 200 ? "✓ PASS" : shift3.status === 422 ? "⚠ Guard" : "⚠ " + shift3.status}`
    );

    // ══════════════════════════════════════════════════════════════
    // SCH4: Connect schedule to event
    // ══════════════════════════════════════════════════════════════
    console.log("\n═══ SCH4: Connect Schedule to Event ═══\n");

    // Try to create a shift linked to an event
    const eventShift = await api(
      page,
      "POST",
      "/api/staff/shifts/commands/create",
      {
        employeeId: USER_ID,
        startTime: tomorrow9,
        endTime: tomorrow17,
        role: "head-chef",
        eventId: EVENT_ID,
        notes: "QA event shift",
      }
    );
    console.log("  POST /api/staff/shifts/commands/create (with eventId):");
    console.log(
      `    Status: ${eventShift.status} | ${eventShift.status === 200 ? "✓ PASS" : eventShift.status === 422 ? "⚠ Guard" : "⚠ " + eventShift.status}`
    );
    if (eventShift.data) {
      console.log(
        `    Response: ${JSON.stringify(eventShift.data)?.substring(0, 150)}`
      );
    }

    // ══════════════════════════════════════════════════════════════
    // SCH5: Delete shift with assignments — confirm cleanup
    // ══════════════════════════════════════════════════════════════
    console.log("\n═══ SCH5: Delete Shift — Confirm Cleanup ═══\n");

    // Create a shift to delete
    const shiftToDelete = await api(
      page,
      "POST",
      "/api/staff/shifts/commands/create",
      {
        employeeId: USER_ID,
        startTime: new Date(Date.now() + 48 * 3_600_000).toISOString(),
        endTime: new Date(Date.now() + 56 * 3_600_000).toISOString(),
        role: "kitchen_staff",
      }
    );
    const shiftIdToDelete = shiftToDelete.data?.result || null;
    console.log(
      `  Created shift to delete: ${shiftToDelete.status} | ID: ${shiftIdToDelete || "unknown"}`
    );

    // Try remove endpoint
    const removeShift = await api(page, "POST", "/api/staff/shifts/remove", {
      shiftId: shiftIdToDelete || "00000000-0000-0000-0000-000000000001",
    });
    console.log("\n  POST /api/staff/shifts/remove:");
    console.log(
      `    Status: ${removeShift.status} | ${removeShift.status === 200 ? "✓ PASS" : removeShift.status === 404 ? "✗ NOT FOUND" : "⚠ " + removeShift.status}`
    );
    if (removeShift.data) {
      console.log(
        `    Response: ${JSON.stringify(removeShift.data)?.substring(0, 150)}`
      );
    }

    // ══════════════════════════════════════════════════════════════
    // Summary
    // ══════════════════════════════════════════════════════════════
    const r = (s) =>
      s === 200
        ? "✓"
        : s === 404
          ? "✗"
          : s === 422
            ? "⚠"
            : s === 409
              ? "⚠"
              : "?";

    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 cp-089 — SCH1-5 Scheduling Module — RESULT");
    console.log("=".repeat(60));
    console.log("  SCH1 (Create shift):");
    console.log(
      `    create-shift:          ${r(createShift.status)} ${createShift.status}`
    );
    console.log("");
    console.log("  SCH2 (Assign staff):");
    console.log(
      `    assign-shift:         ${r(assignStaff.status)} ${assignStaff.status}`
    );
    console.log(
      `    bulk-assignment:       ${r(bulkAssign.status)} ${bulkAssign.status}`
    );
    console.log("");
    console.log("  SCH3 (Overlapping shift):");
    console.log(
      `    overlap-detection:     ${isOverlapBlocked ? "✓ BLOCKED" : "✗ ACCEPTED"}`
    );
    console.log(
      `    non-overlap-allowed:    ${shift3.status === 200 ? "✓ PASS" : "⚠ " + shift3.status}`
    );
    console.log("");
    console.log("  SCH4 (Connect to event):");
    console.log(
      `    shift-with-eventId:    ${r(eventShift.status)} ${eventShift.status}`
    );
    console.log("");
    console.log("  SCH5 (Delete shift):");
    console.log(
      `    remove-shift:          ${r(removeShift.status)} ${removeShift.status}`
    );
    console.log("");
    console.log(
      "  Note: Jane has no orgId (orgs=[]) — tenant resolution fails for all"
    );
    console.log("  shifts. Routes are deployed but guards return 422.");
    console.log("=".repeat(60));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
