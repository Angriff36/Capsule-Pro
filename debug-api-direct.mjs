import { chromium } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  await clerkSetup();
  const token = process.env.CLERK_TESTING_TOKEN;
  const fapi = process.env.CLERK_FAPI;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await context.route(new RegExp(`^https://${escaped}/v1/.*?(\\?.*)?$`), async route => {
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

  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(4000);

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
      return { success: true, sessionId: s2.createdSessionId };
    }
    return { error: s2.status };
  });
  
  console.log("Auth:", JSON.stringify(result));
  
  // Get session token and set cookie on app domain
  const sessionToken = await page.evaluate(async () => {
    try {
      return await window.Clerk.session.getToken();
    } catch { return null; }
  });
  
  if (sessionToken) {
    await context.addCookies([{
      name: "__session",
      value: sessionToken,
      domain: ".capsule-pro-app.vercel.app",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    }]);
    console.log("Set __session cookie");
  }
  
  // Try API routes directly
  const apiTests = [
    "/api/auth/me",
    "/api/events",
    "/api/staff",
  ];
  
  for (const apiPath of apiTests) {
    try {
      const resp = await page.evaluate(async (path) => {
        const r = await fetch(path, { credentials: "include" });
        const text = await r.text();
        return { status: r.status, body: text.substring(0, 200) };
      }, apiPath);
      console.log(`${apiPath}: ${resp.status} - ${resp.body}`);
    } catch(e) {
      console.log(`${apiPath}: error - ${e.message}`);
    }
  }
  
  // Check what organizations Jane has
  const orgInfo = await page.evaluate(async () => {
    const c = window.Clerk;
    const orgs = c.session?.orgs || [];
    return { count: orgs.length, orgs: orgs.map(o => ({ id: o.id, name: o.name, slug: o.slug })) };
  });
  console.log("\nJane's orgs:", JSON.stringify(orgInfo));

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
