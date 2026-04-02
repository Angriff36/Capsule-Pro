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

  // Fresh sign-in to get a session with ALL current org memberships
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

  // Check orgs in fresh session
  const orgInfo = await page.evaluate(async () => {
    const c = window.Clerk;
    const orgs = c.session?.orgs || [];
    return { count: orgs.length, orgs: orgs.map(o => ({ id: o.id, name: o.name })) };
  });
  console.log("Orgs in session:", JSON.stringify(orgInfo));
  
  // Check if org_38BryCr5yDMDLvASQfW7cHl824Q is in the session
  const hasCorrectOrg = orgInfo.orgs.some(o => o.id === 'org_38BryCr5yDMDLvASQfW7cHl824Q');
  console.log("Has org_38BryCr5yDMDLvASQfW7cHl824Q:", hasCorrectOrg);

  // Get session token and set cookie
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
  }

  // Try events API
  const eventsResp = await page.evaluate(async () => {
    const r = await fetch("/api/events", { credentials: "include" });
    const text = await r.text();
    return { status: r.status, body: text.substring(0, 300) };
  });
  console.log("\n/api/events:", eventsResp.status, eventsResp.body.substring(0, 200));

  // Try page navigation
  const errors = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  
  await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(5000);
  console.log("\nPage URL:", page.url());
  const h1 = await page.locator("h1, h2").allTextContents().catch(() => []);
  console.log("Headings:", h1.slice(0, 5));
  console.log("Errors:", errors.slice(0, 3));

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
