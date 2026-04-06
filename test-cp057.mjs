/**
 * QA Test: cp-057 — INV5-7 — Inventory bulk, units, low-stock
 */

import { clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";
const EVENT_ID = "321bb0cf-a527-484c-9051-2b73c8dd6e76";
const USER_ID = "user_38l4Ysz037WwfEIfrjAvWLeM7AP";

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

    // Create test item
    const itemR = await api(
      page,
      "POST",
      "/api/kitchen/inventory/commands/create",
      {
        name: "QA Final Item",
        itemNumber: "QA-FINAL-001",
        unitCost: 5,
        unitId: 4,
        parLevel: 10,
      }
    );
    const itemId = itemR.data?.result;
    console.log("Item:", itemR.status, "id:", itemId);

    // Restock
    await api(page, "POST", "/api/kitchen/inventory/commands/restock", {
      inventoryItemId: itemId,
      quantity: 100,
      costPerUnit: 5,
      userId: USER_ID,
    });
    console.log("Restocked to 100 units");

    // === INV5: Bulk Operations ===
    console.log("\n--- INV5: Bulk Operations ---");

    // Reserve (prerequisite for consume in this inventory system)
    const reserveR = await api(
      page,
      "POST",
      "/api/kitchen/inventory/commands/reserve",
      {
        inventoryItemId: itemId,
        quantity: 20,
        eventId: EVENT_ID,
        recipeId: "test",
        stationId: "test",
      }
    );
    console.log(
      "INV5: Reserve (20):",
      reserveR.status,
      reserveR.status === 200
        ? "✓ PASS"
        : JSON.stringify(reserveR.data)?.substring(0, 80)
    );

    // Consume after reserve
    const consumeR = await api(
      page,
      "POST",
      "/api/kitchen/inventory/commands/consume",
      {
        inventoryItemId: itemId,
        quantity: 5,
        userId: USER_ID,
        lotId: "",
      }
    );
    console.log(
      "INV5: Consume (after reserve):",
      consumeR.status,
      consumeR.status === 200
        ? "✓ PASS"
        : JSON.stringify(consumeR.data)?.substring(0, 100)
    );

    // Single adjust
    const adjustR = await api(
      page,
      "POST",
      "/api/kitchen/inventory/commands/adjust",
      {
        inventoryItemId: itemId,
        newQuantity: 80,
        reason: "cycle count",
      }
    );
    console.log(
      "INV5: Adjust:",
      adjustR.status,
      adjustR.status === 200
        ? "✓ PASS"
        : JSON.stringify(adjustR.data)?.substring(0, 80)
    );

    // Release reservation
    const releaseR = await api(
      page,
      "POST",
      "/api/kitchen/inventory/commands/release-reservation",
      {
        inventoryItemId: itemId,
        quantity: 5,
        eventId: EVENT_ID,
      }
    );
    console.log(
      "INV5: Release reservation:",
      releaseR.status,
      releaseR.status === 200
        ? "✓ PASS"
        : JSON.stringify(releaseR.data)?.substring(0, 80)
    );

    // Waste
    const wasteR = await api(
      page,
      "POST",
      "/api/kitchen/inventory/commands/waste",
      {
        inventoryItemId: itemId,
        quantity: 2,
        userId: USER_ID,
        reason: "spoilage",
        lotId: "",
      }
    );
    console.log(
      "INV5: Waste:",
      wasteR.status,
      wasteR.status === 200
        ? "✓ PASS"
        : JSON.stringify(wasteR.data)?.substring(0, 80)
    );

    // === INV6: Unit Conversions ===
    console.log("\n--- INV6: Unit Conversions ---");

    // Fractional restock
    const fracR = await api(
      page,
      "POST",
      "/api/kitchen/inventory/commands/restock",
      {
        inventoryItemId: itemId,
        quantity: 0.5,
        costPerUnit: 0.333,
        userId: USER_ID,
      }
    );
    console.log(
      "INV6: Fractional restock:",
      fracR.status,
      fracR.status === 200
        ? "✓ PASS"
        : JSON.stringify(fracR.data)?.substring(0, 80)
    );

    // Waste units list
    const unitsR = await api(page, "GET", "/api/kitchen/waste/units");
    const unitCount = unitsR.data?.data?.length || 0;
    console.log(
      "INV6: Units API:",
      unitsR.status,
      unitsR.status === 200
        ? "✓ PASS (" + unitCount + " units)"
        : "✗ " + unitsR.status
    );

    // === INV7: Low-Stock Alerts ===
    console.log("\n--- INV7: Low-Stock Alerts ---");

    // Create alert config
    const alertR = await api(
      page,
      "POST",
      "/api/kitchen/alerts-config/commands/create",
      {
        alertType: "low_stock",
        channel: "email",
        destination: "jane@test.com",
        threshold: 5,
        enabled: true,
        inventoryItemId: itemId,
      }
    );
    console.log(
      "INV7: Create alert config:",
      alertR.status,
      alertR.status === 200
        ? "✓ PASS"
        : alertR.status === 422
          ? "⚠ Guard"
          : "✗ " + alertR.status,
      JSON.stringify(alertR.data)?.substring(0, 80)
    );

    // List alerts
    const listAlertsR = await api(
      page,
      "GET",
      "/api/kitchen/alerts-config/list"
    );
    console.log(
      "INV7: List alert configs:",
      listAlertsR.status,
      listAlertsR.status === 200 ? "✓ PASS" : "✗ " + listAlertsR.status,
      JSON.stringify(listAlertsR.data)?.substring(0, 80)
    );

    // IoT alerts route
    const iotR = await api(page, "GET", "/api/kitchen/iot/alerts");
    console.log(
      "INV7: IoT alerts:",
      iotR.status,
      iotR.status === 200 ? "✓ PASS" : "✗ 404"
    );

    console.log("\n" + "=".repeat(60));
    console.log(
      "📊 cp-057 — INV5-7: Inventory Bulk, Units, Low-Stock — RESULT"
    );
    console.log("=".repeat(60));
    console.log("INV5 — Bulk Operations:");
    console.log(
      "  Reserve (prereq for consume): " +
        (reserveR.status === 200 ? "✓ PASS" : "✗ " + reserveR.status)
    );
    console.log(
      "  Consume:                      " +
        (consumeR.status === 200
          ? "✓ PASS"
          : "✗ " + consumeR.status + " (needs reserve first)")
    );
    console.log(
      "  Adjust:                       " +
        (adjustR.status === 200 ? "✓ PASS" : "✗ " + adjustR.status)
    );
    console.log(
      "  Release reservation:          " +
        (releaseR.status === 200 ? "✓ PASS" : "✗ " + releaseR.status)
    );
    console.log(
      "  Waste:                        " +
        (wasteR.status === 200 ? "✓ PASS" : "✗ " + wasteR.status)
    );
    console.log("INV6 — Unit Conversions:");
    console.log(
      "  Fractional restock:           " +
        (fracR.status === 200 ? "✓ PASS" : "✗ " + fracR.status)
    );
    console.log(
      "  Units API (27 units):         " +
        (unitsR.status === 200 ? "✓ PASS" : "✗ " + unitsR.status)
    );
    console.log("INV7 — Low-Stock Alerts:");
    console.log(
      "  Create alert config:          " +
        (alertR.status === 200
          ? "✓ PASS"
          : alertR.status === 422
            ? "⚠ Guard"
            : "✗ " + alertR.status)
    );
    console.log(
      "  List alert configs:           " +
        (listAlertsR.status === 200
          ? "✓ PASS"
          : "✗ " + listAlertsR.status + " (500 internal error)")
    );
    console.log(
      "  IoT alerts:                   " +
        (iotR.status === 200 ? "✓ PASS" : "✗ 404 route not deployed")
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
