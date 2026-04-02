import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  // List all buttons
  const buttons = await page.locator("button").all();
  console.log(`Total buttons: ${buttons.length}`);
  for (const btn of buttons) {
    try {
      const txt = await btn.textContent();
      const vis = await btn.isVisible();
      const hidden = await btn.getAttribute("aria-hidden");
      const disabled = await btn.getAttribute("disabled");
      console.log(`  [vis=${vis} hidden=${hidden} dis=${disabled}]: "${txt?.trim().substring(0, 60)}"`);
    } catch {}
  }

  // List all inputs
  const inputs = await page.locator("input").all();
  console.log(`\nTotal inputs: ${inputs.length}`);
  for (const inp of inputs) {
    try {
      const name = await inp.getAttribute("name");
      const type = await inp.getAttribute("type");
      const id = await inp.getAttribute("id");
      const vis = await inp.isVisible();
      const placeholder = await inp.getAttribute("placeholder");
      console.log(`  [name="${name}" type="${type}" id="${id}" vis=${vis}] placeholder="${placeholder}"`);
    } catch {}
  }

  // Show page title
  const title = await page.title();
  console.log(`\nPage title: ${title}`);
  console.log(`URL: ${page.url()}`);

  // Check for Clerk elements
  const clerkEl = await page.locator('[id^="__clerk"]').count();
  console.log(`Clerk elements: ${clerkEl}`);

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
