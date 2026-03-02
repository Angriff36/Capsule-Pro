/**
 * Full-Site Spider — Exhaustive Authenticated Crawl
 *
 * Upgrades app.spider.spec.ts with:
 * - Visits ALL known routes (not just discovered links)
 * - Clicks EVERY visible button on each page (not just 10)
 * - Fills EVERY visible form field with realistic data
 * - Fails hard on any console error or 4xx/5xx response
 * - Writes a full JSON report to e2e/reports/
 *
 * Run with: PERSISTENT_BROWSER=true pnpm test:e2e:spider
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@playwright/test";
import type { CollectedError } from "../helpers/workflow";
import {
  attachErrorCollector,
  failHard,
  goto,
  log,
  TEST_DATE,
  TS,
} from "../helpers/workflow";

// Every authenticated route in the app
const ALL_ROUTES = [
  "/",
  "/events",
  "/events/new",
  "/events/budgets",
  "/events/battle-boards",
  "/events/contracts",
  "/events/reports",
  "/events/kitchen-dashboard",
  "/events/import",
  "/kitchen",
  "/kitchen/recipes",
  "/kitchen/prep-lists",
  "/kitchen/inventory",
  "/kitchen/allergens",
  "/crm",
  "/crm/clients",
  "/crm/proposals",
  "/crm/venues",
  "/crm/communications",
  "/command-board",
  "/staff",
  "/staff/team",
  "/staff/availability",
  "/staff/schedule",
  "/staff/time-off",
  "/staff/training",
  "/inventory",
  "/inventory/items",
  "/inventory/levels",
  "/inventory/forecasts",
  "/inventory/recipe-costs",
  "/scheduling",
  "/scheduling/shifts",
  "/scheduling/availability",
  "/scheduling/requests",
  "/scheduling/time-off",
  "/scheduling/budgets",
  "/analytics",
  "/analytics/events",
  "/analytics/finance",
  "/analytics/kitchen",
  "/analytics/staff",
  "/analytics/clients",
  "/analytics/sales",
  "/administrative",
  "/administrative/chat",
  "/administrative/kanban",
  "/administrative/overview-boards",
  "/accounting/chart-of-accounts",
  "/payroll",
  "/payroll/timecards",
  "/payroll/periods",
  "/payroll/runs",
  "/payroll/payouts",
  "/payroll/reports",
  "/warehouse",
  "/warehouse/inventory",
  "/warehouse/receiving",
  "/warehouse/shipments",
  "/warehouse/audits",
  "/cycle-counting",
  "/search",
  "/tools",
  "/tools/ai",
  "/tools/autofill-reports",
  "/tools/battleboards",
  "/settings",
  "/settings/team",
  "/settings/security",
  "/settings/integrations",
  "/settings/email-templates",
  "/webhooks",
];

// Patterns to skip when clicking buttons
const SKIP_CLICK_PATTERNS = [
  /delete/i,
  /remove/i,
  /destroy/i,
  /sign.?out/i,
  /logout/i,
  /revoke/i,
  /cancel subscription/i,
  /charge/i,
  /publish/i,
];

function shouldSkipClick(text: string, label: string): boolean {
  const combined = `${text} ${label}`;
  return SKIP_CLICK_PATTERNS.some((re) => re.test(combined));
}

interface PageReport {
  route: string;
  buttonsClicked: number;
  formsFilledCount: number;
  errors: number;
  durationMs: number;
}

test.describe("Full-Site Spider: Exhaustive Crawl", () => {
  test.setTimeout(600_000); // 10 minutes for full crawl

  test("crawl every route, click every button, fill every form", async ({
    page,
    baseURL,
  }, testInfo) => {
    const errors: CollectedError[] = [];
    attachErrorCollector(page, errors, baseURL ?? "http://127.0.0.1:2221");

    const pageReports: PageReport[] = [];
    const allErrors: CollectedError[] = [];

    for (const route of ALL_ROUTES) {
      const routeStart = Date.now();
      const routeErrors: CollectedError[] = [];

      log.step(`Route: ${route}`);

      try {
        await goto(page, route);
        await page
          .waitForLoadState("networkidle", { timeout: 8000 })
          .catch(() => undefined);
      } catch (e) {
        log.err(`Navigation failed for ${route}: ${e}`);
        routeErrors.push({
          kind: "console",
          url: route,
          text: `Navigation failed: ${e}`,
        });
        allErrors.push(...routeErrors);
        continue;
      }

      // ── Fill all visible form fields ────────────────────────────────────────
      let formsFilledCount = 0;
      const inputs = await page
        .locator("input:visible, textarea:visible, select:visible")
        .all()
        .catch(() => []);

      for (const input of inputs) {
        try {
          const type = await input.getAttribute("type").catch(() => "text");
          const name = await input.getAttribute("name").catch(() => "");
          const tagName = await input
            .evaluate((el) => el.tagName.toLowerCase())
            .catch(() => "input");

          if (
            type === "hidden" ||
            type === "file" ||
            type === "submit" ||
            type === "button"
          )
            continue;
          if (type === "checkbox" || type === "radio") {
            // Toggle checkboxes on
            const checked = await input.isChecked().catch(() => false);
            if (!checked) await input.click().catch(() => undefined);
            formsFilledCount++;
            continue;
          }

          if (tagName === "select") {
            const options = await input.locator("option").all();
            if (options.length > 1) {
              await input.selectOption({ index: 1 }).catch(() => undefined);
              formsFilledCount++;
            }
            continue;
          }

          // Fill text inputs with realistic data based on name/type
          let value = "E2E Test Value";
          if (type === "email") value = `e2e-${TS}@test.example.com`;
          else if (type === "number") value = "42";
          else if (type === "date") value = TEST_DATE;
          else if (type === "tel") value = "555-0100";
          else if (type === "url") value = "https://example.com";
          else if (type === "password") value = "E2ETestPass123!";
          else if (/name/i.test(name ?? "")) value = "E2E Test Name";
          else if (/email/i.test(name ?? ""))
            value = `e2e-${TS}@test.example.com`;
          else if (/phone|tel/i.test(name ?? "")) value = "555-0100";
          else if (/date/i.test(name ?? "")) value = TEST_DATE;
          else if (/amount|price|cost|budget/i.test(name ?? "")) value = "100";
          else if (/count|qty|quantity/i.test(name ?? "")) value = "5";
          else if (tagName === "textarea") value = "E2E automated test content";

          await input.fill(value).catch(() => undefined);
          formsFilledCount++;
        } catch {
          // Ignore individual input errors
        }
      }

      if (formsFilledCount > 0) {
        log.info(`  Filled ${formsFilledCount} form fields`);
      }

      // ── Click all visible buttons ───────────────────────────────────────────
      let buttonsClicked = 0;
      const buttons = await page
        .locator(
          "button:visible, [role='button']:visible, [role='tab']:visible"
        )
        .all()
        .catch(() => []);

      for (const btn of buttons) {
        try {
          const text = await btn.textContent().catch(() => "");
          const label = await btn.getAttribute("aria-label").catch(() => "");
          if (shouldSkipClick(text ?? "", label ?? "")) continue;

          await btn.click({ timeout: 2000 }).catch(() => undefined);
          await page.waitForTimeout(300);

          // Close any dialog that opened
          const dialog = page.locator('[role="dialog"]').first();
          if (await dialog.isVisible({ timeout: 500 }).catch(() => false)) {
            await page.keyboard.press("Escape");
            await page.waitForTimeout(200);
          }

          buttonsClicked++;
        } catch {
          // Ignore individual button errors
        }
      }

      if (buttonsClicked > 0) {
        log.info(`  Clicked ${buttonsClicked} buttons`);
      }

      // Collect errors for this route
      const routeErrorCount = errors.length - allErrors.length;
      allErrors.push(...errors.slice(allErrors.length));

      pageReports.push({
        route,
        buttonsClicked,
        formsFilledCount,
        errors: routeErrorCount,
        durationMs: Date.now() - routeStart,
      });

      if (
        errors.length > 0 &&
        errors.length > allErrors.length - routeErrorCount
      ) {
        log.err(`  ${routeErrorCount} error(s) on ${route}`);
      } else {
        log.ok(
          `  ${route} — ${buttonsClicked} clicks, ${formsFilledCount} fields, ${Date.now() - routeStart}ms`
        );
      }
    }

    // ── Write full report ─────────────────────────────────────────────────────
    const reportDir = join(process.cwd(), "e2e", "reports");
    mkdirSync(reportDir, { recursive: true });
    const reportPath = join(reportDir, `spider-${TS}.json`);
    writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          totalRoutes: ALL_ROUTES.length,
          totalErrors: allErrors.length,
          pages: pageReports,
          errors: allErrors,
        },
        null,
        2
      )
    );
    log.info(`Full spider report: ${reportPath}`);

    // ── Fail hard if any errors ───────────────────────────────────────────────
    if (allErrors.length > 0) {
      await failHard(page, testInfo, allErrors, "full-site spider complete");
    }

    const totalClicks = pageReports.reduce((s, r) => s + r.buttonsClicked, 0);
    const totalFields = pageReports.reduce((s, r) => s + r.formsFilledCount, 0);
    log.pass(
      `Spider complete — ${ALL_ROUTES.length} routes, ${totalClicks} clicks, ${totalFields} fields filled, 0 errors`
    );
  });
});
