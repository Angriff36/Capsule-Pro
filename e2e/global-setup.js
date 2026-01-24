import { chromium } from "@playwright/test";
export default async function globalSetup(config) {
  const baseURL = config.projects[0]?.use?.baseURL;
  const storageStatePath = "e2e/.auth/storageState.json";
  // Skip if we are not ready to run authenticated tests.
  if (
    !(process.env.PLAYWRIGHT_AUTH_EMAIL && process.env.PLAYWRIGHT_AUTH_PASSWORD)
  ) {
    return;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // TODO: Update these to match your Clerk sign-in route and selectors.
  await page.goto(`${baseURL}/sign-in`, { waitUntil: "domcontentloaded" });
  // Example placeholders (replace with real selectors)
  await page.fill(
    'input[name="identifier"]',
    process.env.PLAYWRIGHT_AUTH_EMAIL
  );
  await page.fill(
    'input[name="password"]',
    process.env.PLAYWRIGHT_AUTH_PASSWORD
  );
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.click('button[type="submit"]'),
  ]);
  // Save cookies/localStorage for later tests
  await page.context().storageState({ path: storageStatePath });
  await browser.close();
}
