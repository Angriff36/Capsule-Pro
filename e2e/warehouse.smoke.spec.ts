import { expect, test } from "@playwright/test";

/**
 * Warehouse Dashboard E2E Tests
 *
 * Tests verify:
 * 1. Routes exist and don't 404
 * 2. Key UI elements are present
 * 3. Navigation links work and lead to real pages
 * 4. Data displays correctly (when available)
 */

// Run tests sequentially to avoid connection reset issues
test.describe.configure({ mode: "serial" });

const WAREHOUSE_ENTRY = "/warehouse";

const WAREHOUSE_ROUTES = [
  "/warehouse",
  "/warehouse/receiving",
  "/warehouse/shipments",
  "/warehouse/audits",
  "/warehouse/inventory",
];

// Routes that warehouse dashboard links to
const LINKED_ROUTES = [
  "/inventory/items",
];

test.describe("Warehouse Dashboard", () => {
  test("unauthenticated users do not see a 404", async ({ page }) => {
    const res = await page.goto(WAREHOUSE_ENTRY, { waitUntil: "domcontentloaded" });
    expect(res).not.toBeNull();
    expect(res!.status()).not.toBe(404);
    await expect(page).not.toHaveTitle(/404/i);
  });

  test.describe("Route existence (AUTH REQUIRED)", () => {
    for (const route of WAREHOUSE_ROUTES) {
      test(`route loads: ${route}`, async ({ page }) => {
        const res = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(res?.status() ?? 200).not.toBe(404);
        await expect(page).not.toHaveTitle(/404/i);
        // Page has at least one main landmark or heading
        expect(await page.locator("main, [role='main'], h1").count()).toBeGreaterThan(0);
      });
    }
  });

  test.describe("Dashboard UI Elements (AUTH REQUIRED)", () => {
    test("displays header with breadcrumb", async ({ page }) => {
      await page.goto(WAREHOUSE_ENTRY, { waitUntil: "domcontentloaded" });

      // Check for header elements - breadcrumb should contain "Warehouse"
      const breadcrumb = page.locator("nav[aria-label='breadcrumb'], ol");
      await expect(breadcrumb.first()).toBeVisible();
    });

    test("displays stats cards section", async ({ page }) => {
      await page.goto(WAREHOUSE_ENTRY, { waitUntil: "domcontentloaded" });

      // Look for the stats cards - they contain "Total SKUs", "Stock Alerts", etc.
      const statsSection = page.locator("section").first();
      await expect(statsSection).toBeVisible();

      // Check for at least some card-like elements
      const cards = page.locator("[class*='card'], [data-slot='card']");
      expect(await cards.count()).toBeGreaterThan(0);
    });

    test("displays quick actions sidebar on desktop", async ({ page }) => {
      // Set viewport to desktop size
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(WAREHOUSE_ENTRY, { waitUntil: "domcontentloaded" });

      // Check for sidebar with quick action links
      const receivingLink = page.locator("a[href='/warehouse/receiving']");
      const shipmentsLink = page.locator("a[href='/warehouse/shipments']");
      const auditsLink = page.locator("a[href='/warehouse/audits']");

      expect(await receivingLink.count()).toBeGreaterThan(0);
      expect(await shipmentsLink.count()).toBeGreaterThan(0);
      expect(await auditsLink.count()).toBeGreaterThan(0);
    });

    test("refresh button exists and links to warehouse", async ({ page }) => {
      await page.goto(WAREHOUSE_ENTRY, { waitUntil: "domcontentloaded" });

      // Find refresh link
      const refreshLink = page.locator("a[href='/warehouse']").filter({ hasText: /refresh/i });
      expect(await refreshLink.count()).toBeGreaterThan(0);
    });

    test("receive stock button exists and links to receiving", async ({ page }) => {
      await page.goto(WAREHOUSE_ENTRY, { waitUntil: "domcontentloaded" });

      // Find receive stock link
      const receiveLink = page.locator("a[href='/warehouse/receiving']").filter({ hasText: /receive/i });
      expect(await receiveLink.count()).toBeGreaterThan(0);
    });
  });

  test.describe("Navigation Links (AUTH REQUIRED)", () => {
    test("all sidebar quick action links work", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(WAREHOUSE_ENTRY, { waitUntil: "domcontentloaded" });

      // Test each quick action link
      const quickActionLinks = [
        { href: "/warehouse/receiving", text: /receiving/i },
        { href: "/warehouse/shipments", text: /shipments/i },
        { href: "/warehouse/audits", text: /cycle count/i },
        { href: "/inventory/items", text: /all items/i },
      ];

      for (const { href, text } of quickActionLinks) {
        const link = page.locator(`a[href='${href}']`).filter({ hasText: text }).first();
        if (await link.isVisible()) {
          const res = await page.goto(href, { waitUntil: "domcontentloaded" });
          expect(res?.status() ?? 200, `Link ${href} returned 404`).not.toBe(404);
          await expect(page).not.toHaveTitle(/404/i);
        }
      }
    });

    test("click-audit all visible in-app links (no 404)", async ({ page }) => {
      test.setTimeout(120_000); // Allow 2 minutes for this comprehensive test
      await page.goto(WAREHOUSE_ENTRY, { waitUntil: "domcontentloaded" });

      // Collect all anchor hrefs
      const candidates = page.locator("a[href]");
      const count = await candidates.count();

      const hrefs = new Set<string>();
      for (let i = 0; i < count; i++) {
        const el = candidates.nth(i);
        const href = await el.getAttribute("href");
        if (!href) continue;
        if (href.startsWith("http") || href.startsWith("//")) continue; // ignore external
        if (href.startsWith("#")) continue; // ignore hash
        if (href.includes("highlight=") || href.includes("filter=")) continue; // skip query params that need data
        if (href.includes("?po=")) continue; // skip PO links that need specific data
        if (href.includes("webhook")) continue; // skip webhook endpoints
        if (!href.startsWith("/warehouse") && !href.startsWith("/inventory")) continue; // only test warehouse-related routes
        hrefs.add(href);
      }

      // Visit each unique href (limit to first 10 to avoid timeout)
      const hrefsToTest = Array.from(hrefs).slice(0, 10);
      for (const href of hrefsToTest) {
        const res = await page.goto(href, { waitUntil: "domcontentloaded" });
        expect(res, `Navigation to ${href} failed`).not.toBeNull();
        expect(res!.status(), `${href} returned 404`).not.toBe(404);
        await expect(page).not.toHaveTitle(/404/i);
      }
    });
  });

  test.describe("Data Display (AUTH REQUIRED)", () => {
    test("shows appropriate empty states or data", async ({ page }) => {
      await page.goto(WAREHOUSE_ENTRY, { waitUntil: "domcontentloaded" });

      // The page should show either:
      // - Real data (inventory items, transactions)
      // - Empty states ("No stock alerts", "No pending orders", etc.)
      // Either way, these sections should exist

      // Check for Recent Activity section
      const recentActivityCard = page.locator("text=Recent Activity").first();
      await expect(recentActivityCard).toBeVisible();

      // Check for Pending Purchase Orders section
      const pendingOrdersCard = page.locator("text=Pending Purchase Orders").first();
      await expect(pendingOrdersCard).toBeVisible();
    });

    test("stats cards display numeric values", async ({ page }) => {
      await page.goto(WAREHOUSE_ENTRY, { waitUntil: "domcontentloaded" });

      // Stats cards should have numeric values (even if 0)
      // Look for the large text-3xl numbers in card headers
      const statNumbers = page.locator("[class*='text-3xl']");
      expect(await statNumbers.count()).toBeGreaterThanOrEqual(4);
    });
  });

  test.describe("Linked Routes Exist", () => {
    for (const route of LINKED_ROUTES) {
      test(`linked route exists: ${route}`, async ({ page }) => {
        const res = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(res?.status() ?? 200).not.toBe(404);
        await expect(page).not.toHaveTitle(/404/i);
      });
    }
  });
});
