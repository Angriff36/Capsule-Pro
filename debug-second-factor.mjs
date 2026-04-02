import { chromium } from "@playwright/test";
const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(4000);
  
  const result = await page.evaluate(async () => {
    const c = (window).Clerk;
    const si = c.client.signIn;
    
    const step1 = await si.create({ identifier: "nexusqatest@example.com" });
    console.log("Step1 status:", step1.status);
    console.log("First factors:", step1.supportedFirstFactors?.map(f => ({ s: f.strategy, id: f.emailAddressId })));
    console.log("Second factors:", step1.supportedSecondFactors?.map(f => ({ s: f.strategy, id: f.emailAddressId })));
    console.log("Status after step1:", step1.status);
    
    // What factors does signIn have after step1?
    console.log("signIn.firstFactorVerification:", si.firstFactorVerification?.status);
    console.log("signIn.secondFactorVerification:", si.secondFactorVerification?.status);
    
    // Try password as second factor
    const pwdFactor = step1.supportedSecondFactors?.find(f => f.strategy === "password");
    console.log("PWD second factor:", pwdFactor);
    
    if (step1.status === "needs_second_factor" && pwdFactor) {
      const step2 = await si.attemptSecondFactor({
        strategy: "password",
        password: "NexusTest123!"
      });
      console.log("Step2 status:", step2.status, "session:", step2.createdSessionId);
      
      if (step2.status === "complete" && step2.createdSessionId) {
        await c.setActive({ sessionId: step2.createdSessionId });
        return { success: true, sessionId: step2.createdSessionId };
      }
      return { status: step2.status };
    }
    
    return { status: step1.status };
  });
  
  console.log("Result:", JSON.stringify(result, null, 2));
  console.log("URL:", page.url());
  
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
