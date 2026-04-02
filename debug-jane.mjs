import { chromium } from "@playwright/test";
const BASE = "https://capsule-pro-app.vercel.app";

async function tryPassword(email, password) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);
  
  await page.locator("#identifier-field").fill(email);
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(2000);
  
  const pwdVisible = await page.locator("#password-field").isVisible().catch(() => false);
  if (!pwdVisible) {
    console.log(`${email} ✗ no password field`);
    await browser.close();
    return false;
  }
  
  await page.locator("#password-field").fill(password);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);
  
  const success = !page.url().includes("sign-in") && !page.url().includes("factor");
  console.log(`${email} + ${password}: ${success ? "✓ SUCCESS" : "✗ " + page.url()}`);
  
  await browser.close();
  return success;
}

async function main() {
  // Try jane+clerk_test with common test passwords
  const passwords = ["testpassword123", "Test12345!", "Test123!", "password123", "Clerk123!", "clerk123", "clerk_test123"];
  const email = "jane+clerk_test@example.com";
  
  for (const pwd of passwords) {
    const success = await tryPassword(email, pwd);
    if (success) {
      console.log(`Found working password: ${pwd}`);
      break;
    }
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
