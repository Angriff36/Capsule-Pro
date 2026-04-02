import { chromium } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";
const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  await clerkSetup(); // This sets up CLERK_TESTING_TOKEN env var
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Set up testing token interceptor
  const fapi = "assured-ray-89.clerk.accounts.dev";
  await context.route(`https://${fapi}/v1/*`, async route => {
    const req = route.request();
    const url = new URL(req.url());
    url.searchParams.set("__clerk_testing_token", process.env.CLERK_TESTING_TOKEN || "");
    try {
      const resp = await route.fetch({ url: url.toString() });
      let json = await resp.json();
      if (json?.response?.captcha_bypass === false) json.response.captcha_bypass = true;
      if (json?.client?.captcha_bypass === false) json.client.captcha_bypass = true;
      await route.fulfill({ response: resp, json });
    } catch {
      await route.continue();
    }
  });
  
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(4000);
  
  const result = await page.evaluate(async () => {
    const c = (window).Clerk;
    const si = c.client.signIn;
    
    // Try email_code strategy with jane+clerk_test
    const email = "jane+clerk_test@example.com";
    const code = "424242";
    
    try {
      // Step 1: Create sign-in
      const s1 = await si.create({ identifier: email });
      console.log("Step1 status:", s1.status);
      console.log("Factors:", s1.supportedFirstFactors?.map(f => f.strategy));
      
      // Try email_code directly
      const emailCodeFactor = s1.supportedFirstFactors?.find(f => f.strategy === "email_code");
      if (emailCodeFactor) {
        await si.prepareFirstFactor({ strategy: "email_code", emailAddressId: emailCodeFactor.emailAddressId });
        const s2 = await si.attemptFirstFactor({ strategy: "email_code", code });
        console.log("Step2 status:", s2.status, "session:", s2.createdSessionId);
        
        if (s2.status === "complete" && s2.createdSessionId) {
          await c.setActive({ sessionId: s2.createdSessionId });
          return { success: true, sessionId: s2.createdSessionId };
        }
        return { status: s2.status };
      }
      
      return { status: s1.status, reason: "no email_code factor" };
    } catch (e) {
      return { error: e.message };
    }
  });
  
  console.log("Result:", JSON.stringify(result, null, 2));
  console.log("URL:", page.url());
  
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
