import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/sign-in`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(3000);

  // Try various passwords
  const passwords = [
    "testpassword123",
    "Test12345!",
    "password123",
    "Clerk123!",
  ];

  for (const pwd of passwords) {
    console.log(`\nTrying password: ${pwd}`);

    // Fill email
    const emailInput = page.locator("#identifier-field");
    await emailInput.fill("jane+clerk_test@example.com");

    const continueBtn = page.locator('button:has-text("Continue")');
    await continueBtn.click();
    await page.waitForTimeout(2000);

    // Check if password field appeared
    const pwdInput = page.locator("#password-field");
    const pwdVisible = await pwdInput.isVisible().catch(() => false);

    if (pwdVisible) {
      console.log("  Password field visible");
      await pwdInput.fill(pwd);
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(3000);

      if (page.url().includes("sign-in")) {
        console.log("  ✗ Still on sign-in");
        // Go back to clean state
        await page.goto(`${BASE}/sign-in`, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        });
        await page.waitForTimeout(2000);
      } else {
        console.log(`  ✓ SUCCESS! URL: ${page.url()}`);
        break;
      }
    } else {
      console.log("  Password field NOT visible");
      // Check URL
      if (page.url().includes("sign-in")) {
        // Go back
        await page.goto(`${BASE}/sign-in`, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        });
        await page.waitForTimeout(2000);
      }
    }
  }

  console.log("\nFinal URL:", page.url());
  if (!page.url().includes("sign-in")) {
    const cookies = await page.context().cookies();
    const clerkSession = cookies.filter(
      (c) =>
        c.domain.includes("capsule") && c.name.toLowerCase().includes("session")
    );
    console.log(
      "Session cookies:",
      clerkSession.map((c) => c.name)
    );

    // Save auth state
    const storageState = { cookies: await page.context().cookies() };
    const fs = await import("fs");
    fs.writeFileSync("/tmp/cp-prod-auth.json", JSON.stringify(storageState));
    console.log("Auth state saved to /tmp/cp-prod-auth.json");
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
