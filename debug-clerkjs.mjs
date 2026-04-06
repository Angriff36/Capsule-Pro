import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/sign-in`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(4000); // Let Clerk JS fully load

  // Check if Clerk JS is loaded
  const clerkLoaded = await page.evaluate(() => {
    return typeof window.Clerk !== "undefined";
  });
  console.log("Clerk JS loaded:", clerkLoaded);

  if (clerkLoaded) {
    const clerkInfo = await page.evaluate(() => {
      const c = window.Clerk;
      return {
        version: c.version,
        loaded: c.loaded,
        session: c.session,
        user: c.user
          ? { id: c.user.id, email: c.user.primaryEmailAddress?.emailAddress }
          : null,
        signIn: c.client?.signIn ? "available" : "not available",
      };
    });
    console.log("Clerk info:", JSON.stringify(clerkInfo, null, 2));

    // Try to use Clerk's internal email code flow
    if (clerkInfo.signIn === "available") {
      const result = await page.evaluate(async () => {
        const c = window.Clerk;
        const email = "jane+clerk_test@example.com";
        const code = "424242";

        // Check available first factors
        const si = c.client.signIn;
        try {
          const created = await si.create({ identifier: email });
          console.log(
            "SignIn created, supportedFirstFactors:",
            JSON.stringify(created.supportedFirstFactors)
          );

          const emailFactor = created.supportedFirstFactors?.find(
            (ff) => ff.strategy === "email_code"
          );
          if (emailFactor) {
            await si.prepareFirstFactor({
              strategy: "email_code",
              emailAddressId: emailFactor.emailAddressId,
            });
            const attempt = await si.attemptFirstFactor({
              strategy: "email_code",
              code,
            });
            console.log("Attempt result:", attempt.status);
            if (attempt.status === "complete") {
              await c.setActive({ sessionId: attempt.createdSessionId });
              return { success: true, status: attempt.status };
            }
            return { success: false, status: attempt.status };
          }
          return { success: false, reason: "no email_code factor" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      });
      console.log("Email code auth result:", JSON.stringify(result, null, 2));
    }
  } else {
    // No Clerk JS - try regular form fill
    console.log("No Clerk JS found - will try regular form");
    const emailInput = page.locator("#identifier-field");
    if (await emailInput.isVisible()) {
      await emailInput.fill("jane+clerk_test@example.com");
      const continueBtn = page.locator('button:has-text("Continue")');
      await continueBtn.click();
      await page.waitForTimeout(2000);
      console.log("URL after continue:", page.url());
    }
  }

  console.log("\nFinal URL:", page.url());
  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
