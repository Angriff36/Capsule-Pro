import { clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  await clerkSetup();
  const token = process.env.CLERK_TESTING_TOKEN;
  const fapi = process.env.CLERK_FAPI;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await context.route(
    new RegExp(`^https://${escaped}/v1/.*?(\\?.*)?$`),
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
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(4000);
  await page.evaluate(async () => {
    const c = window.Clerk;
    const si = c.client.signIn;
    const s1 = await si.create({ identifier: "jane+clerk_test@example.com" });
    const ef = s1.supportedFirstFactors?.find(
      (f) => f.strategy === "email_code"
    );
    if (ef) {
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
      }
    }
  });
  await page.waitForTimeout(2000);

  // Try calling the events API directly
  console.log("Fetching events via API...");
  const apiResp = await page.evaluate(async () => {
    const resp = await fetch("/api/events", {
      credentials: "include", // Include session cookies
    });
    const text = await resp.text();
    return { status: resp.status, body: text.substring(0, 500) };
  });
  console.log("API Response:", JSON.stringify(apiResp, null, 2));

  // Try creating an event via API
  console.log("\nCreating event via API...");
  const createResp = await page.evaluate(async () => {
    const tenantId = "02981b1c-f9d4-454b-9766-ff2395926663"; // Mangia Catering
    const body = {
      title: "QA Nexus Test Event",
      eventDate: "2026-04-15",
      guestCount: 10,
      venueName: "QA Nexus Venue",
      eventType: "catering",
      status: "confirmed",
    };
    const resp = await fetch("/api/event/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    return { status: resp.status, body: text.substring(0, 500) };
  });
  console.log("Create Response:", JSON.stringify(createResp, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
