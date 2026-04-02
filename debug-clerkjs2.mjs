import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(4000);

  const result = await page.evaluate(async () => {
    const c = (window).Clerk;
    const email = "jane+clerk_test@example.com";
    const code = "424242";
    const si = c.client.signIn;
    
    try {
      const created = await si.create({ identifier: email });
      const emailFactor = created.supportedFirstFactors?.find(
        (ff) => ff.strategy === "email_code"
      );
      if (!emailFactor) return { error: "no email_code factor", factors: created.supportedFirstFactors };
      
      await si.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      
      const attempt = await si.attemptFirstFactor({ strategy: "email_code", code });
      console.log("Attempt status:", attempt.status, "sessionId:", attempt.createdSessionId);
      
      if (attempt.status === "complete" && attempt.createdSessionId) {
        // Try different setActive signatures
        await c.setActive({ sessionId: attempt.createdSessionId });
        return { success: true, sessionId: attempt.createdSessionId };
      }
      return { status: attempt.status, hasSessionId: !!attempt.createdSessionId };
    } catch (e) {
      return { error: e.message };
    }
  });
  
  console.log("Auth result:", JSON.stringify(result, null, 2));
  console.log("Final URL:", page.url());
  
  // If success, navigate to events
  if (result.success) {
    await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log("Events URL:", page.url());
  }
  
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
