import { chromium } from "@playwright/test";
const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  await page.locator("#identifier-field").fill("nexusqatest@example.com");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(2000);

  await page.locator("#password-field").fill("NexusTest123!");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);

  console.log("Factor-2 URL:", page.url());
  
  // Check for code input
  const codeInput = page.locator('input[name="code"], input#code, input[placeholder*="code" i]');
  const codeVisible = await codeInput.isVisible().catch(() => false);
  console.log("Code input visible:", codeVisible);
  
  if (codeVisible) {
    // Try 424242
    await codeInput.fill("424242");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(4000);
    console.log("After code URL:", page.url());
  }
  
  // List inputs at factor-two page
  const inputs = await page.locator("input").all();
  for (const inp of inputs) {
    const vis = await inp.isVisible().catch(() => false);
    const name = await inp.getAttribute("name").catch(() => "");
    const type = await inp.getAttribute("type").catch(() => "");
    const id = await inp.getAttribute("id").catch(() => "");
    const ph = await inp.getAttribute("placeholder").catch(() => "");
    if (vis) console.log(`  visible: name="${name}" type="${type}" id="${id}" ph="${ph}"`);
  }
  
  // Check heading
  const heading = await page.locator("h1, h2").allTextContents();
  console.log("Headings:", heading);

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
