/**
 * QA Test: cp-083 — CRM1-5 — CRM module workflow
 *
 * CRM1: Create customer/account
 * CRM2: Create contact under customer
 * CRM3: Create deal/opportunity
 * CRM4: Convert/attach CRM record to Event
 * CRM5: Duplicate customer email gives merge flow or clean error
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

    // === CRM1: Create customer/client ===
    console.log("--- CRM1: Create customer/account ---");
    const clientR = await api(page, "POST", "/api/crm/clients", {
      name: "QA Test Client Corp",
      email: "qa-client@test.com",
      phone: "555-0100",
      companyName: "QA Test Client Corp",
    });
    console.log(
      "CRM1: Create client:",
      clientR.status,
      clientR.status === 200 ? "✓ PASS" : "✗ FAIL",
      JSON.stringify(clientR.data)?.substring(0, 100)
    );
    const clientId =
      clientR.data?.result || clientR.data?.client?.id || clientR.data?.id;
    console.log("  Client ID:", clientId);

    // List clients to verify
    const listClientsR = await api(page, "GET", "/api/crm/clients");
    const clientCount = listClientsR.data?.clients?.length || 0;
    console.log(
      "CRM1: Client list:",
      listClientsR.status,
      "count:",
      clientCount
    );

    // === CRM2: Create contact under customer ===
    console.log("\n--- CRM2: Create contact under customer ---");
    const contactR = await api(page, "POST", "/api/crm/client-contacts", {
      clientId,
      firstName: "Jane",
      lastName: "QA Contact",
      email: "jane.qa@test.com",
      phone: "555-0101",
      role: "Event Coordinator",
    });
    console.log(
      "CRM2: Create contact:",
      contactR.status,
      contactR.status === 200
        ? "✓ PASS"
        : contactR.status === 404
          ? "✗ 404 route"
          : "⚠ " + contactR.status,
      JSON.stringify(contactR.data)?.substring(0, 80)
    );
    const contactId = contactR.data?.result || contactR.data?.contact?.id;

    // List contacts for this client
    if (clientId) {
      const listContactsR = await api(
        page,
        "GET",
        `/api/crm/clients/${clientId}/contacts`
      );
      console.log(
        "CRM2: List contacts:",
        listContactsR.status,
        "count:",
        listContactsR.data?.contacts?.length || 0
      );
    }

    // === CRM3: Create deal/opportunity ===
    console.log("\n--- CRM3: Create deal/opportunity ---");
    const dealR = await api(page, "POST", "/api/crm/proposals", {
      clientId,
      title: "QA Big Wedding Deal",
      estimatedValue: 25_000,
      stage: "proposal",
    });
    console.log(
      "CRM3: Create deal:",
      dealR.status,
      dealR.status === 200
        ? "✓ PASS"
        : dealR.status === 404
          ? "✗ 404 route"
          : "⚠ " + dealR.status,
      JSON.stringify(dealR.data)?.substring(0, 80)
    );
    const dealId = dealR.data?.result || dealR.data?.proposal?.id;

    // List deals
    const listDealsR = await api(page, "GET", "/api/crm/deals");
    console.log(
      "CRM3: List deals:",
      listDealsR.status,
      listDealsR.status === 200 ? "✓ PASS" : "✗ " + listDealsR.status,
      "count:",
      listDealsR.data?.deals?.length || 0
    );

    // === CRM4: Attach CRM record to Event ===
    console.log("\n--- CRM4: Convert/attach CRM record to Event ---");
    // Attach client to event
    const EVENT_ID = "321bb0cf-a527-484c-9051-2b73c8dd6e76"; // Battle board event
    const attachR = await api(
      page,
      "POST",
      `/api/crm/clients/${clientId}/events`,
      {
        eventId: EVENT_ID,
      }
    );
    console.log(
      "CRM4: Attach client to event:",
      attachR.status,
      attachR.status === 200
        ? "✓ PASS"
        : attachR.status === 404
          ? "✗ 404 route"
          : "⚠ " + attachR.status,
      JSON.stringify(attachR.data)?.substring(0, 80)
    );

    // === CRM5: Duplicate customer email gives merge flow or clean error ===
    console.log("\n--- CRM5: Duplicate customer email ---");
    const dupR = await api(page, "POST", "/api/crm/clients", {
      name: "QA Duplicate Client",
      email: "qa-client@test.com", // Same email as CRM1
      phone: "555-0199",
    });
    console.log(
      "CRM5: Duplicate email:",
      dupR.status,
      dupR.status === 409
        ? "✓ 409 Conflict (merge flow)"
        : dupR.status === 422
          ? "✓ 422 Validation error"
          : dupR.status === 200
            ? "⚠ 200 Created duplicate (no merge)"
            : "⚠ " + dupR.status
    );
    console.log("  Response:", JSON.stringify(dupR.data)?.substring(0, 150));

    // Also try duplicate contact
    if (contactId) {
      const dupContactR = await api(page, "POST", "/api/crm/client-contacts", {
        clientId,
        firstName: "Another",
        lastName: "Contact",
        email: "jane.qa@test.com", // Same email
        phone: "555-0102",
      });
      console.log(
        "CRM5: Duplicate contact email:",
        dupContactR.status,
        dupContactR.status === 409
          ? "✓ 409"
          : dupContactR.status === 422
            ? "✓ 422"
            : dupContactR.status === 200
              ? "⚠ Created"
              : "⚠ " + dupContactR.status
      );
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 cp-083 — CRM1-5: CRM module workflow — RESULT");
    console.log("=".repeat(60));
    console.log(
      "CRM1 — Create customer:   " +
        (clientR.status === 200 ? "✓ PASS" : "✗ " + clientR.status)
    );
    console.log(
      "CRM2 — Create contact:   " +
        (contactR.status === 200
          ? "✓ PASS"
          : contactR.status === 404
            ? "✗ 404 route"
            : "⚠ " + contactR.status)
    );
    console.log(
      "CRM3 — Create deal:     " +
        (dealR.status === 200
          ? "✓ PASS"
          : dealR.status === 404
            ? "✗ 404 route"
            : "⚠ " + dealR.status)
    );
    console.log(
      "CRM4 — Attach to event: " +
        (attachR.status === 200
          ? "✓ PASS"
          : attachR.status === 404
            ? "✗ 404 route"
            : "⚠ " + attachR.status)
    );
    console.log(
      "CRM5 — Duplicate email:  " +
        (dupR.status === 409
          ? "✓ PASS (409 conflict)"
          : dupR.status === 422
            ? "✓ PASS (422 validation)"
            : "⚠ " + dupR.status)
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
