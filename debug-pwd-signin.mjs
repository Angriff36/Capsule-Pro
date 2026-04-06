import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/sign-in`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(4000);

  const result = await page.evaluate(async () => {
    const c = window.Clerk;
    const si = c.client.signIn;

    // Step 1: Create sign-in with identifier
    const step1 = await si.create({ identifier: "nexusqatest@example.com" });
    console.log("Step1 status:", step1.status);
    console.log(
      "Step1 strategies:",
      step1.supportedFirstFactors?.map((f) => f.strategy || f)
    );

    // Step 2: Attempt password (if it's the first factor)
    const pwdStrategy = step1.supportedFirstFactors?.find(
      (f) => (f.strategy || f) === "password"
    );
    console.log("Password factor:", pwdStrategy ? "found" : "not found");

    if (pwdStrategy) {
      const step2 = await si.attemptFirstFactor({
        strategy: "password",
        password: "NexusTest123!",
      });
      console.log("Step2 status:", step2.status);
      console.log("Created session:", step2.createdSessionId);

      if (step2.status === "complete" && step2.createdSessionId) {
        await c.setActive({ sessionId: step2.createdSessionId });
        return { success: true, sessionId: step2.createdSessionId };
      }
    }

    return { status: step1.status, error: "password factor not found" };
  });

  console.log("Result:", JSON.stringify(result, null, 2));
  console.log("URL:", page.url());

  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
