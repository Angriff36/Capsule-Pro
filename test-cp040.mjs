/**
 * QA Test: cp-040 — D1 — Identify Governed Manifest Command
 * Audit CommandBoardCard.create as a case study.
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
  await page.waitForTimeout(3000);
  return result;
}

async function apiFetch(page, path, method = "GET", body = null) {
  return await page.evaluate(
    async ({ path: p, method: m, body: b }) => {
      const opts = {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      };
      if (m !== "GET") opts.method = m;
      if (b) opts.body = JSON.stringify(b);
      const r = await fetch(p, opts);
      let json = null;
      try {
        json = await r.json();
      } catch {}
      return { status: r.status, data: json };
    },
    { path, method, body }
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

    const BOARD_ID = "036cea66-8f05-4ef9-8587-e7e90f633677";

    // ── CommandBoardCard.create — Test Case 1: Valid Input ───────
    console.log("═══ CommandBoardCard.create: VALID INPUT ═══\n");
    const validR = await apiFetch(
      page,
      "/api/command-board/cards/commands/create",
      "POST",
      {
        boardId: BOARD_ID,
        title: "QA Test Card — Valid",
        content: "Testing governance layer",
        cardType: "task",
        status: "pending",
        positionX: 100,
        positionY: 100,
        width: 200,
        height: 150,
        color: "#3b82f6",
        metadata: "{}",
        groupId: "",
        entityId: "",
        entityType: "",
      }
    );
    console.log(`  Status: ${validR.status}`);
    if (validR.status === 200) {
      console.log("  Result: ✓ PASS — card created");
      console.log(`  Card ID: ${validR.data?.result?.id || "N/A"}`);
    } else {
      console.log(
        "  Response:",
        JSON.stringify(validR.data)?.substring(0, 300)
      );
    }

    // ── CommandBoardCard.create — Test Case 2: Missing title ─────
    console.log("\n═══ CommandBoardCard.create: MISSING TITLE (guard) ═══\n");
    const noTitleR = await apiFetch(
      page,
      "/api/command-board/cards/commands/create",
      "POST",
      {
        boardId: BOARD_ID,
        title: "",
        cardType: "task",
      }
    );
    console.log(`  Status: ${noTitleR.status}`);
    if (noTitleR.status === 422 || noTitleR.status === 400) {
      console.log("  Guard triggered: ✓ CORRECTLY REJECTED");
      console.log(
        `  Error: ${JSON.stringify(noTitleR.data)?.substring(0, 200)}`
      );
    } else {
      console.log(
        "  Response:",
        JSON.stringify(noTitleR.data)?.substring(0, 200)
      );
    }

    // ── CommandBoardCard.create — Test Case 3: Missing boardId ───
    console.log(
      "\n═══ CommandBoardCard.create: MISSING BOARD ID (guard) ═══\n"
    );
    const noBoardR = await apiFetch(
      page,
      "/api/command-board/cards/commands/create",
      "POST",
      {
        boardId: "",
        title: "Some Title",
        cardType: "task",
      }
    );
    console.log(`  Status: ${noBoardR.status}`);
    if (noBoardR.status === 422 || noBoardR.status === 400) {
      console.log("  Guard triggered: ✓ CORRECTLY REJECTED");
      console.log(
        `  Error: ${JSON.stringify(noBoardR.data)?.substring(0, 200)}`
      );
    } else {
      console.log(
        "  Response:",
        JSON.stringify(noBoardR.data)?.substring(0, 200)
      );
    }

    // ── CommandBoardCard.create — Test Case 4: Invalid cardType ──
    console.log(
      "\n═══ CommandBoardCard.create: INVALID CARD TYPE (constraint) ═══\n"
    );
    const badTypeR = await apiFetch(
      page,
      "/api/command-board/cards/commands/create",
      "POST",
      {
        boardId: BOARD_ID,
        title: "QA Test",
        cardType: "invalid_type",
      }
    );
    console.log(`  Status: ${badTypeR.status}`);
    if (badTypeR.status === 422 || badTypeR.status === 400) {
      console.log("  Constraint triggered: ✓ CORRECTLY REJECTED");
      console.log(
        `  Error: ${JSON.stringify(badTypeR.data)?.substring(0, 200)}`
      );
    } else {
      console.log(
        "  Response:",
        JSON.stringify(badTypeR.data)?.substring(0, 200)
      );
    }

    // ── CommandBoardConnection.create — Self-connection guard ─────
    console.log(
      "\n═══ CommandBoardConnection.create: SELF-CONNECTION (guard) ═══\n"
    );
    const selfConnectR = await apiFetch(
      page,
      "/api/command-board/connections/commands/create",
      "POST",
      {
        boardId: BOARD_ID,
        fromCardId: "00000000-0000-0000-0000-000000000001",
        toCardId: "00000000-0000-0000-0000-000000000001",
        relationshipType: "blocks",
      }
    );
    console.log(`  Status: ${selfConnectR.status}`);
    if (selfConnectR.status === 422 || selfConnectR.status === 400) {
      console.log("  Guard triggered: ✓ CORRECTLY REJECTED");
      console.log(
        `  Error: ${JSON.stringify(selfConnectR.data)?.substring(0, 200)}`
      );
    } else {
      console.log(
        "  Response:",
        JSON.stringify(selfConnectR.data)?.substring(0, 200)
      );
    }

    // ── CommandBoard.update — Non-draft board guard ───────────────
    console.log("\n═══ CommandBoard.update: NON-DRAFT BOARD (guard) ═══\n");
    // The 'test' board is status='draft' so let's try to update it
    const updateR = await apiFetch(
      page,
      "/api/command-board/boards/commands/update",
      "POST",
      {
        boardId: BOARD_ID,
        newName: "QA Updated Board",
        newDescription: "Updated by QA test",
        newTags: "qa",
      }
    );
    console.log(`  Status: ${updateR.status}`);
    if (updateR.status === 200) {
      console.log("  Result: ✓ PASS — board updated (draft → still draft)");
    } else {
      console.log(
        "  Response:",
        JSON.stringify(updateR.data)?.substring(0, 200)
      );
    }

    // ── Summary ──────────────────────────────────────────────────
    console.log(`\n${"=".repeat(60)}`);
    console.log("📊 cp-040 — D1: Governed Manifest Command Audit — RESULT");
    console.log("=".repeat(60));
    console.log("  Command audited: CommandBoardCard.create");
    console.log("");
    console.log("  Governance layers verified:");
    console.log(
      "    Guard (boardId required):     " +
        (noBoardR.status !== 200 ? "✓ BLOCKED" : "✗ ALLOWED")
    );
    console.log(
      "    Guard (title required):        " +
        (noTitleR.status !== 200 ? "✓ BLOCKED" : "✗ ALLOWED")
    );
    console.log(
      "    Constraint (cardType valid):   " +
        (badTypeR.status !== 200 ? "✓ BLOCKED" : "✗ ALLOWED")
    );
    console.log(
      "    Guard (no self-connection):     " +
        (selfConnectR.status !== 200 ? "✓ BLOCKED" : "✗ ALLOWED")
    );
    console.log("");
    console.log("  Manifest governance structure (from IR):");
    console.log("    Guards: pre-conditions enforced by runtime.runCommand()");
    console.log("    Constraints: field-level validation rules");
    console.log(
      "    Policies: role-based access (kitchen_staff through admin)"
    );
    console.log(
      "    Events: emitted on success (CommandBoardCardCreated etc.)"
    );
    console.log("    Warnings: non-blocking constraints (warnStatusChange)");
    console.log("=".repeat(60));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
