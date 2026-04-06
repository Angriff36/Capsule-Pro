import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { chromium } from "@playwright/test";

const BASE = "https://capsule-pro-app.vercel.app";

async function main() {
  await clerkSetup();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/sign-in`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(3000);

  console.log("URL before clerk.signIn:", page.url());

  // clerk.signIn from @clerk/testing/playwright uses the testing token internally
  // It should bypass email code for test users like jane+clerk_test@example.com
  try {
    await clerk.signIn({ page });
    console.log("clerk.signIn succeeded!");
  } catch (e) {
    console.log("clerk.signIn error:", e.message.substring(0, 200));
  }

  await page.waitForTimeout(3000);
  console.log("URL after signIn:", page.url());

  // Check if we can access events
  await page.goto(`${BASE}/events`, {
    waitUntil: "domcontentloaded",
    timeout: 15_000,
  });
  await page.waitForTimeout(2000);
  console.log("Events URL:", page.url());

  // Check Clerk state
  const clerkState = await page.evaluate(() => {
    const c = window.Clerk;
    return {
      loaded: c?.loaded,
      session: c?.session?.id,
      user: c?.user?.id,
      email: c?.user?.primaryEmailAddress?.emailAddress,
    };
  });
  console.log("Clerk state:", JSON.stringify(clerkState));

  // Save auth state
  const cookies = await page.context().cookies();
  const clerkCookies = cookies.filter(
    (c) => c.domain.includes("clerk") || c.name.startsWith("__")
  );
  console.log(
    "Clerk cookies:",
    clerkCookies.map((c) => `${c.domain}:${c.name}=${c.value.substring(0, 30)}`)
  );

  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
