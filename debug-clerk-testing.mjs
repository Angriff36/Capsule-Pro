import { chromium } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  // Setup Clerk testing token
  await clerkSetup();
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  
  // Use @clerk/testing/playwright's clerk.signIn()
  console.log("clerk.signIn available:", typeof clerk.signIn);
  if (typeof clerk.signIn === "function") {
    console.log("Calling clerk.signIn()...");
    try {
      await clerk.signIn({ page });
      console.log("✓ clerk.signIn succeeded");
      console.log("URL after signIn:", page.url());
    } catch (e) {
      console.log("clerk.signIn error:", e.message);
    }
  } else {
    // Try to call with email
    console.log("Trying clerk.signIn({ email: ... })");
    try {
      await clerk.signIn({ 
        page, 
        signInParams: { strategy: "email_code", identifier: "jane+clerk_test@example.com" }
      });
      console.log("✓ signed in");
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
  
  console.log("Final URL:", page.url());
  
  // Check auth state
  const cookies = await page.context().cookies();
  const clerkCookies = cookies.filter(c => 
    c.domain.includes('clerk') || c.name.toLowerCase().includes('session') || c.name.toLowerCase().includes('__clerk')
  );
  console.log("Clerk-related cookies:", clerkCookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`));
  
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
