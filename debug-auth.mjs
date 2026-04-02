import { chromium } from "@playwright/test";
import { clerkSetup } from "@clerk/testing/playwright";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  await clerkSetup();
  const token = process.env.CLERK_TESTING_TOKEN;
  console.log("Testing token:", token?.substring(0, 20));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Intercept Clerk FAPI and inject testing token
  const fapi = "assured-ray-89.clerk.accounts.dev";
  await context.route(`https://${fapi}/v1/*`, async route => {
    const url = new URL(route.request().url());
    url.searchParams.set("__clerk_testing_token", token || "");
    try {
      const resp = await route.fetch({ url: url.toString() });
      const json = await resp.json();
      // Log the response to see what Clerk returns
      const clientResp = json?.client;
      if (clientResp) {
        console.log("Client response - status:", clientResp.status);
        console.log("SignIn:", JSON.stringify(clientResp.signIn?.status), "session:", clientResp.signIn?.createdSessionId);
      }
      await route.fulfill({ response: resp, json });
    } catch (e) {
      await route.continue();
    }
  });

  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(4000);

  const result = await page.evaluate(async () => {
    const c = (window).Clerk;
    const si = c.client.signIn;
    
    const s1 = await si.create({ identifier: "jane+clerk_test@example.com" });
    console.log("s1 status:", s1.status, "factors:", s1.supportedFirstFactors?.map(f => f.strategy));
    
    if (s1.status === "complete") {
      const emailCodeFactor = s1.supportedFirstFactors?.find(f => f.strategy === "email_code");
      if (emailCodeFactor) {
        await si.prepareFirstFactor({ strategy: "email_code", emailAddressId: emailCodeFactor.emailAddressId });
        const s2 = await si.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        console.log("s2 status:", s2.status, "session:", s2.createdSessionId);
        if (s2.status === "complete" && s2.createdSessionId) {
          await c.setActive({ sessionId: s2.createdSessionId });
          return { success: true, sessionId: s2.createdSessionId };
        }
      }
    }
    return { status: s1.status };
  });

  console.log("Result:", JSON.stringify(result));
  console.log("URL:", page.url());
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
