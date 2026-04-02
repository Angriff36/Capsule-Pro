import { chromium } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  await clerkSetup();
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Sign in
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  
  try {
    await clerk.signIn({ page });
  } catch (e) {
    // Cookie might still be set
    console.log("signIn error:", e.message.substring(0, 100));
  }
  
  await page.waitForTimeout(2000);
  
  // Check session
  const sessionInfo = await page.evaluate(() => {
    const c = (window).Clerk;
    return {
      loaded: c.loaded,
      session: c.session?.id,
      user: c.user?.id,
      email: c.user?.primaryEmailAddress?.emailAddress,
    };
  });
  console.log("Session info:", JSON.stringify(sessionInfo));
  
  // Try navigating to events
  await page.goto(`${BASE}/events`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log("Events URL:", page.url());
  
  // Try board
  await page.goto(`${BASE}/events/321bb0cf-a527-484c-9051-2b73c8dd6e76/battle-board`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log("Board URL:", page.url());
  
  // Check page content
  const heading = await page.locator("h1, h2").first().textContent().catch(() => "none");
  console.log("Heading:", heading);
  
  // Get board content snippet
  const bodyText = await page.locator("body").innerText().catch(() => "");
  console.log("Body preview:", bodyText.substring(0, 300));
  
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
