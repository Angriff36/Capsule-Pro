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

  // Check cookies after auth
  const allCookies = await context.cookies();
  const clerkCookies = allCookies.filter(c => c.domain.includes("clerk") || c.domain.includes("vercel") || c.name.startsWith("__"));
  console.log("\nAll Clerk/Vercel cookies:");
  for (const c of clerkCookies) {
    console.log(`  ${c.domain}: ${c.name}=${c.value.substring(0, 40)}...`);
  }
  
  // Check __session cookie specifically
  const sessionCookie = allCookies.find(c => c.name === "__session");
  console.log("\n__session cookie:", sessionCookie ? `${sessionCookie.value.substring(0, 40)}... (${sessionCookie.domain})` : "NOT FOUND");
  
  // Now navigate to events
  const errors = [];
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  
  const responses = [];
  page.on("response", resp => {
    if (resp.status() >= 400) responses.push(`${resp.status()} ${resp.url().substring(0, 100)}`);
  });

  await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(5000);
  
  console.log("\nFailed responses:", responses.slice(0, 10));
  console.log("Console errors:", errors.slice(0, 5));
  console.log("Final URL:", page.url());
  
  // Check if we can see the page content
  const h1 = await page.locator("h1").allTextContents();
  console.log("H1s:", h1);

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
