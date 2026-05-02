/**
 * Debug: Modal visibility after FAB click
 */

import { clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function createContext() {
  await clerkSetup();
  const token = process.env.CLERK_TESTING_TOKEN;
  const fapi = process.env.CLERK_FAPI;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await context.route(
    new RegExp(`^https://${escaped}/v1/.*?(\\?.*)?$`),
    async (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set("__clerk_testing_token", token || "");
      try {
        const resp = await route.fetch({ url: url.toString() });
        let json;
        try {
          json = await resp.json();
        } catch {
          json = {};
        }
        if (json?.response?.captcha_bypass === false)
          json.response.captcha_bypass = true;
        if (json?.client?.captcha_bypass === false)
          json.client.captcha_bypass = true;
        await route.fulfill({ response: resp, json });
      } catch {
        await route.continue();
      }
    }
  );

  await page.goto(`${BASE}/sign-in`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(4000);
  await page.evaluate(async () => {
    const c = window.Clerk;
    const si = c.client.signIn;
    const s1 = await si.create({ identifier: "jane+clerk_test@example.com" });
    const ef = s1.supportedFirstFactors?.find(
      (f) => f.strategy === "email_code"
    );
    if (!ef) return;
    await si.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: ef.emailAddressId,
    });
    const s2 = await si.attemptFirstFactor({
      strategy: "email_code",
      code: "424242",
    });
    if (s2.status === "complete" && s2.createdSessionId)
      await c.setActive({ session: s2.createdSessionId });
  });

  return { browser, context, page };
}

async function main() {
  const { browser, context, page } = await createContext();

  try {
    await page.goto(`${BASE}/events`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    await page.waitForTimeout(3000);
    console.log("Events URL:", page.url());

    // Check initial state
    const modalBefore = await page.locator('[role="dialog"]').count();
    const inputsBefore = await page.locator("input").count();
    console.log("Modal count before FAB:", modalBefore);
    console.log("Input count before FAB:", inputsBefore);

    // Click FAB
    const fab = page.locator("button.fixed.bottom-6.right-6").first();
    const fabVisible = await fab.isVisible().catch(() => false);
    console.log("FAB visible:", fabVisible);

    if (fabVisible) {
      await fab.click();
      console.log("Clicked FAB");
      await page.waitForTimeout(2000);
    } else {
      // Try clicking by position
      await page.mouse.click(1100, 700);
      await page.waitForTimeout(2000);
      console.log("Clicked by position");
    }

    // Check state after FAB
    const modalAfter = await page.locator('[role="dialog"]').count();
    const inputsAfter = await page.locator("input").count();
    console.log("Modal count after FAB:", modalAfter);
    console.log("Input count after FAB:", inputsAfter);

    // List ALL inputs with visibility
    for (const inp of await page.locator("input").all()) {
      try {
        const vis = await inp.isVisible();
        const name = await inp.getAttribute("name");
        const id = await inp.getAttribute("id");
        const type = await inp.getAttribute("type");
        const display = await page.evaluate(
          (el) => window.getComputedStyle(el).display,
          inp
        );
        if (name || id)
          console.log(
            `  [vis=${vis} display=${display}] name="${name}" id="${id}" type="${type}"`
          );
      } catch {}
    }

    // List all dialogs/modals
    for (const dlg of await page
      .locator('[role="dialog"], [aria-modal="true"]')
      .all()) {
      try {
        const vis = await dlg.isVisible();
        const display = await page.evaluate(
          (el) => window.getComputedStyle(el).display,
          dlg
        );
        const cls = await dlg.getAttribute("class");
        console.log(
          `  Dialog[vis=${vis} display=${display}]: ${cls?.substring(0, 50)}`
        );
      } catch {}
    }

    // Snapshot the full page HTML (first 500 chars)
    const html = await page.content();
    console.log("\nPage HTML snippet:", html.substring(0, 500));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
