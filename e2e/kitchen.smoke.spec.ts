import { expect, test } from "@playwright/test";

/**
 * IMPORTANT:
 * These tests assume Kitchen pages are behind auth.
 * We treat redirects to sign-in as acceptable ONLY in the "unauthenticated" test.
 *
 * For the "authenticated" tests, you will later add a login helper (storageState)
 * once you decide how you want CI auth to work (Clerk test user, etc.).
 */

const KITCHEN_ENTRY = "/kitchen";

// Update these if your actual routes differ.
const KITCHEN_ROUTES = [
  "/kitchen",
  "/kitchen/recipes",
  "/kitchen/prep-lists",
  "/kitchen/inventory",
];

test("Kitchen: unauthenticated users do not see a 404", async ({ page }) => {
  const res = await page.goto(KITCHEN_ENTRY, { waitUntil: "domcontentloaded" });
  // Allow redirects, but navigation must succeed and not be a hard 404.
  expect(res).not.toBeNull();
  expect(res!.status()).not.toBe(404);
  await expect(page).not.toHaveTitle(/404/i);
});

test.describe("Kitchen: route existence + no dead-ends (AUTH REQUIRED)", () => {
  for (const route of KITCHEN_ROUTES) {
    test(`Kitchen route loads: ${route}`, async ({ page }) => {
      const res = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(res?.status() ?? 200).not.toBe(404);
      await expect(page).not.toHaveTitle(/404/i);
      // Basic sanity: page has at least one main landmark or heading.
      expect(
        await page.locator("main, [role='main'], h1").count()
      ).toBeGreaterThan(0);
    });
  }

  test("Kitchen: click-audit all visible in-app links/buttons (no 404 / no blank)", async ({
    page,
  }) => {
    await page.goto(KITCHEN_ENTRY, { waitUntil: "domcontentloaded" });

    // Collect candidate click targets:
    // - anchor with href
    // - button-like elements that navigate (data-href, role=link)
    const candidates = page.locator(
      ["a[href]", "[role='link'][data-href]", "button[data-href]"].join(",")
    );

    const count = await candidates.count();
    expect(count).toBeGreaterThan(0);

    // Visit each unique href. Safer than clicking everything.
    const hrefs = new Set<string>();
    for (let i = 0; i < count; i++) {
      const el = candidates.nth(i);
      const href =
        (await el.getAttribute("href")) ?? (await el.getAttribute("data-href"));
      if (!href) continue; // skip if no href
      if (href.startsWith("http") || href.startsWith("//")) continue; // ignore external
      if (href.startsWith("#")) continue; // ignore hash
      hrefs.add(href);
    }

    for (const href of hrefs) {
      const res = await page.goto(href, { waitUntil: "domcontentloaded" });
      expect(res, `Navigation to ${href} failed`).not.toBeNull();
      expect(res!.status()).not.toBe(404);
      await expect(page).not.toHaveTitle(/404/i);
    }
  });
});
