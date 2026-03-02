/**
 * Shared workflow test helpers.
 *
 * Every workflow spec uses these to:
 * - Collect console errors, network failures, and 4xx/5xx responses
 * - Fail hard with full context (screenshot path, error log) on any issue
 * - Fill forms with realistic data
 * - Wait for UI state transitions
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";

export const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:2221";

// ─── Timestamp ────────────────────────────────────────────────────────────────

export const TS = Date.now();

export function ts(): string {
  return new Date().toTimeString().slice(0, 8);
}

export const log = {
  step: (msg: string) => process.stderr.write(`\n[${ts()}] 📋 ${msg}\n`),
  info: (msg: string) => process.stderr.write(`[${ts()}]    ℹ  ${msg}\n`),
  ok: (msg: string) => process.stderr.write(`[${ts()}]    ✓  ${msg}\n`),
  warn: (msg: string) => process.stderr.write(`[${ts()}]    ⚠  ${msg}\n`),
  err: (msg: string) => process.stderr.write(`[${ts()}]    ✗  ${msg}\n`),
  pass: (msg: string) => process.stderr.write(`[${ts()}] ✅ ${msg}\n`),
  fail: (msg: string) => process.stderr.write(`[${ts()}] ❌ ${msg}\n`),
};

// ─── Error collector ──────────────────────────────────────────────────────────

export interface CollectedError {
  kind: "console" | "network" | "request-failed";
  url: string;
  text: string;
  status?: number;
  method?: string;
}

const IGNORE_URL_PATTERNS = [
  /__nextjs_original-stack-frames/,
  /\/_next\/webpack-hmr/,
  /\/_next\/static\/chunks\//, // Stale chunk 404s after Next.js dev server recompile
  /\/_next\/static\/css\//, // Stale CSS 404s after recompile
];

const IGNORE_PATTERNS = [
  /Clerk.*development keys/i,
  /Clerk.*deprecated/i,
  /Arcjet.*127\.0\.0\.1.*development mode/i,
  /Download the React DevTools/i,
  /ERR_ABORTED/i,
  /ERR_CONNECTION_RESET/i, // Next.js dev server recompilation — transient, not a real error
  /ERR_CONNECTION_REFUSED/i, // Dev server briefly unavailable during recompile
  /Failed to load resource.*ERR_NAME_NOT_RESOLVED/i,
  /Failed to load resource.*net::/i,
  /localhost:25002/i, // Vercel toolbar companion (disabled locally)
  /\[Fast Refresh\]/i,
  /webpack-hmr/i,
  /__nextjs_original-stack-frames/i, // Next.js dev-only stack frame endpoint (blocked in dev)
  /Failed to load resource: the server responded with a status of 403/i, // Generic 403 console error (usually from __nextjs_original-stack-frames in dev)
  /Failed to load resource: the server responded with a status of 404/i, // Generic 404 console error (usually stale Server Action IDs after dev server recompile)
];

function shouldIgnore(text: string): boolean {
  return IGNORE_PATTERNS.some((re) => re.test(text));
}

export function attachErrorCollector(
  page: Page,
  errors: CollectedError[],
  baseURL: string
): void {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (shouldIgnore(text)) return;
    log.err(`Console error: ${text}`);
    errors.push({ kind: "console", url: page.url(), text });
  });

  page.on("response", async (response) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    if (!url.startsWith(baseURL)) return;
    if (IGNORE_URL_PATTERNS.some((re) => re.test(url))) return;
    const method = response.request().method();
    // Next.js Server Action calls are POST requests to the page URL.
    // After a dev server recompile, action IDs change and old calls return 404.
    // These are transient recompilation artifacts, not real errors.
    if (method === "POST" && status === 404) {
      const urlPath = url.replace(baseURL, "");
      if (!urlPath.startsWith("/api/")) return; // page-level POST 404 = stale action ID
    }
    // Skip auth endpoints — bodies may contain tokens/PII
    const sensitivePatterns = [
      "/api/auth",
      "/api/clerk",
      "/api/webhooks",
      "/__clerk",
    ];
    if (sensitivePatterns.some((p) => url.includes(p))) return;
    let body = "";
    try {
      body = (await response.text()).slice(0, 300);
    } catch {
      // ignore
    }
    const text = `HTTP ${status} ${method} ${url} — ${body}`;
    log.err(text);
    errors.push({
      kind: "network",
      url,
      text,
      status,
      method,
    });
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.startsWith(baseURL)) return;
    const errorText = request.failure()?.errorText ?? "unknown";
    if (shouldIgnore(errorText)) return;
    log.err(`Request failed: ${url} — ${errorText}`);
    errors.push({ kind: "request-failed", url, text: errorText });
  });
}

// ─── Fail hard ────────────────────────────────────────────────────────────────

export async function failHard(
  page: Page,
  testInfo: TestInfo,
  errors: CollectedError[],
  context: string
): Promise<never> {
  const reportDir = join(process.cwd(), "e2e", "reports");
  mkdirSync(reportDir, { recursive: true });

  const reportPath = join(
    reportDir,
    `failure-${testInfo.title.replace(/\s+/g, "-")}-${TS}.json`
  );

  const report = {
    test: testInfo.title,
    context,
    url: page.url(),
    timestamp: new Date().toISOString(),
    errors,
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log.fail(`Failure report written to: ${reportPath}`);

  // Attach screenshot
  const screenshotPath = join(
    reportDir,
    `failure-${testInfo.title.replace(/\s+/g, "-")}-${TS}.png`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  log.fail(`Screenshot: ${screenshotPath}`);

  const summary = errors.map((e) => `[${e.kind}] ${e.text}`).join("\n");

  throw new Error(
    `WORKFLOW FAILURE at "${context}" on ${page.url()}\n\n${summary}\n\nFull report: ${reportPath}`
  );
}

// ─── Cleanup helpers ──────────────────────────────────────────────────────────

/**
 * Delete a test-created entity via API. Best-effort — does not throw on failure.
 * Use in afterAll hooks to clean up test data.
 */
export async function cleanupByApi(
  page: Page,
  method: "DELETE" | "POST",
  path: string
): Promise<void> {
  try {
    await page.request.fetch(`${BASE_URL}${path}`, { method });
  } catch {
    // Best-effort cleanup — ignore failures
  }
}

// ─── Assert no errors ─────────────────────────────────────────────────────────

export async function assertNoErrors(
  page: Page,
  testInfo: TestInfo,
  errors: CollectedError[],
  checkpoint: string
): Promise<void> {
  if (errors.length > 0) {
    await failHard(page, testInfo, errors, checkpoint);
  }
  log.ok(`No errors at checkpoint: ${checkpoint}`);
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

export async function goto(
  page: Page,
  path: string,
  opts?: { waitFor?: string | RegExp }
): Promise<void> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  log.info(`→ ${url}`);

  // Retry up to 3 times to handle Next.js dev server recompilation resets
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      const msg = String(err);
      const isReset =
        msg.includes("ERR_CONNECTION_RESET") ||
        msg.includes("ERR_CONNECTION_REFUSED") ||
        msg.includes("net::ERR_");
      if (isReset && attempt < 3) {
        log.info(
          `  ↻ Connection reset on attempt ${attempt} — waiting 5s then retrying`
        );
        await page.waitForTimeout(5000);
        continue;
      }
      throw err;
    }
  }
  if (lastErr) throw lastErr;

  await page
    .waitForLoadState("networkidle", { timeout: 8000 })
    .catch(() => undefined);
  if (opts?.waitFor) {
    await page.waitForSelector(
      typeof opts.waitFor === "string" ? opts.waitFor : `text=${opts.waitFor}`,
      { timeout: 10_000 }
    );
  }
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

/** Fill an input by name attribute */
export async function fillByName(
  page: Page,
  name: string,
  value: string
): Promise<void> {
  const el = page
    .locator(`input[name="${name}"], textarea[name="${name}"]`)
    .first();
  await el.waitFor({ state: "visible", timeout: 5000 });
  await el.fill(value);
  log.info(`  fill [name=${name}] = "${value}"`);
}

/** Fill an input by id attribute */
export async function fillById(
  page: Page,
  id: string,
  value: string
): Promise<void> {
  const selector = `#${id}`;
  await page.locator(selector).fill(value);
  log.info(`  fill [id=${id}] = "${value}"`);
}

/** Fill an input by label text */
export async function fillByLabel(
  page: Page,
  label: string | RegExp,
  value: string
): Promise<void> {
  const el = page.getByLabel(label).first();
  await el.waitFor({ state: "visible", timeout: 5000 });
  await el.fill(value);
  log.info(`  fill [label=${label}] = "${value}"`);
}

/** Select an option in a <select> by name */
export async function selectByName(
  page: Page,
  name: string,
  value: string
): Promise<void> {
  const el = page.locator(`select[name="${name}"]`).first();
  await el.waitFor({ state: "visible", timeout: 5000 });
  await el.selectOption(value);
  log.info(`  select [name=${name}] = "${value}"`);
}

/** Click a button by text or role */
export async function clickButton(
  page: Page,
  text: string | RegExp,
  opts?: { timeout?: number }
): Promise<void> {
  const btn = page
    .getByRole("button", { name: text })
    .or(page.locator("button").filter({ hasText: text }))
    .first();
  await btn.waitFor({ state: "visible", timeout: opts?.timeout ?? 8000 });
  await btn.click();
  log.info(`  click button "${text}"`);
}

/** Click a link by text */
export async function clickLink(
  page: Page,
  text: string | RegExp
): Promise<void> {
  const link = page.getByRole("link", { name: text }).first();
  await link.waitFor({ state: "visible", timeout: 8000 });
  await link.click();
  log.info(`  click link "${text}"`);
}

/** Wait for a toast/success message */
export async function waitForToast(
  page: Page,
  pattern: string | RegExp,
  timeout = 10_000
): Promise<void> {
  await page
    .locator(`[data-sonner-toast], [role="status"], [role="alert"]`)
    .filter({ hasText: pattern })
    .first()
    .waitFor({ state: "visible", timeout });
  log.ok(`Toast: "${pattern}"`);
}

/** Wait for a URL pattern */
export async function waitForURL(
  page: Page,
  pattern: string | RegExp,
  timeout = 15_000
): Promise<void> {
  await page.waitForURL(pattern, { timeout });
  log.ok(`URL: ${page.url()}`);
}

/** Assert text is visible on page */
export async function assertVisible(
  page: Page,
  text: string | RegExp,
  timeout = 8000
): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout });
  log.ok(`Visible: "${text}"`);
}

/** Assert element exists by selector */
export async function assertExists(
  page: Page,
  selector: string,
  timeout = 8000
): Promise<void> {
  await expect(page.locator(selector).first()).toBeVisible({ timeout });
  log.ok(`Exists: "${selector}"`);
}

/** Open a dialog/modal by clicking a trigger button */
export async function openDialog(
  page: Page,
  triggerText: string | RegExp
): Promise<void> {
  await clickButton(page, triggerText);
  await page
    .locator('[role="dialog"]')
    .first()
    .waitFor({ state: "visible", timeout: 8000 });
  log.ok(`Dialog opened via "${triggerText}"`);
}

const SUBMIT_RE = /save|submit|create|add/i;

/** Submit a form and wait for network idle */
export async function submitForm(
  page: Page,
  submitText: string | RegExp = SUBMIT_RE
): Promise<void> {
  await clickButton(page, submitText);
  await page
    .waitForLoadState("networkidle", { timeout: 15_000 })
    .catch(() => undefined);
  log.ok(`Form submitted via "${submitText}"`);
}

/** Fill a Radix/shadcn Select component by trigger text */
export async function fillSelect(
  page: Page,
  triggerLabel: string | RegExp,
  optionText: string | RegExp
): Promise<void> {
  // Click the trigger
  const trigger = page
    .locator('[role="combobox"]')
    .filter({ hasText: triggerLabel })
    .or(page.getByRole("combobox", { name: triggerLabel }))
    .first();
  await trigger.waitFor({ state: "visible", timeout: 5000 });
  await trigger.click();
  // Pick the option from the listbox
  const option = page
    .locator('[role="option"]')
    .filter({ hasText: optionText })
    .first();
  await option.waitFor({ state: "visible", timeout: 5000 });
  await option.click();
  log.info(`  select (radix) "${triggerLabel}" → "${optionText}"`);
}

// ─── Unique test data ─────────────────────────────────────────────────────────

export function unique(prefix: string): string {
  return `${prefix} E2E-${TS}`;
}

export const TEST_EMAIL = `e2e-test-${String(TS)}@capsule-test.example.com`;
export const TEST_DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
})();
export const TEST_DATE_FAR = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
})();
