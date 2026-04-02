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
    const c = (window).Clerk;
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

  if (!result?.success) throw new Error(`Auth failed: ${JSON.stringify(result)}`);

  // Check session and org state
  await page.waitForTimeout(1000);
  const state = await page.evaluate(() => {
    const c = (window).Clerk;
    return {
      session: c.session?.id,
      org: c.session?.orgs?.[0],
      orgId: c.organization?.id,
      orgRole: c.session?.user?.role,
      memberships: c.client?.organizations?.getOrganizationMemberships?.(),
    };
  });
  console.log("Clerk state:", JSON.stringify(state, null, 2));

  // Navigate to events
  await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log("Events URL:", page.url());
  const h1 = await page.locator("h1, h2").allTextContents();
  console.log("Headings:", h1);

  // Check org switcher if needed
  const orgSwitcher = page.locator('button:has-text("Mangia"), button:has-text("org"), [aria-label*="organization" i]').first();
  if (await orgSwitcher.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log("Found org switcher - clicking...");
    await orgSwitcher.click();
    await page.waitForTimeout(2000);
    console.log("After org switch:", page.url());
  }

  // List events
  const eventCards = await page.locator('[data-testid*="event"], [class*="event"]').count();
  console.log("Event cards visible:", eventCards);

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
