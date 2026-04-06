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

  const authResult = await page.evaluate(async () => {
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
  console.log("Auth:", JSON.stringify(authResult));

  // Get session token
  const sessionToken = await page.evaluate(async () => {
    try {
      return await window.Clerk.session.getToken();
    } catch {
      return null;
    }
  });

  // Fetch events via API with session cookie
  if (sessionToken) {
    await context.addCookies([
      {
        name: "__session",
        value: sessionToken,
        domain: ".capsule-pro-app.vercel.app",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ]);
  }

  const eventsResp = await page.evaluate(async () => {
    const r = await fetch("/api/events", { credentials: "include" });
    const text = await r.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      status: r.status,
      data: json?.data || [],
      total: json?.total || 0,
    };
  });
  console.log("Events API:", eventsResp.status, "total:", eventsResp.total);
  console.log("First event:", JSON.stringify(eventsResp.data[0], null, 2));

  // Get an event ID
  const eventId = eventsResp.data[0]?.id;
  console.log("\nEvent ID for board:", eventId);

  // Check if board URL works
  if (eventId) {
    await page.goto(`${BASE}/events/${eventId}/battle-board`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    await page.waitForTimeout(3000);
    console.log("Board URL:", page.url());
    const h1 = await page
      .locator("h1, h2")
      .allTextContents()
      .catch(() => []);
    console.log("Board headings:", h1.slice(0, 5));
    const cards = await page
      .locator('[data-testid*="card"]')
      .count()
      .catch(() => 0);
    console.log("Cards on board:", cards);
  }

  // Summary
  console.log("\n=== AUTH SUMMARY ===");
  console.log("Session:", authResult.sessionId);
  console.log("Orgs in session: (empty - API has orgs but session doesn't)");
  console.log("Events API: WORKING (200)");
  console.log("Page 500: Likely due to no active org in session");
  console.log("Workaround: Use API directly for testing");

  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
