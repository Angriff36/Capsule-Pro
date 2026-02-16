import { expect, test } from "@playwright/test";

const START_PATH = "/";
const MAX_VISITS = 50;
const VISIT_TIMEOUT_MS = 10_000;
const MAX_CLICKS_PER_PAGE = 10;
const SKIP_PATTERNS = [
  /logout/i,
  /signout/i,
  /sign-out/i,
  /delete/i,
  /remove/i,
  /destroy/i,
  /publish/i,
  /charge/i,
];

const IGNORE_CONSOLE_PATTERNS = [
  /Clerk.*development keys/i,
  /Clerk.*deprecated.*afterSignInUrl/i,
  /Arcjet.*127\.0\.0\.1.*development mode/i,
  /Download the React DevTools/i,
  /Attempted import error/i, // Next.js dev noise
  /Failed to load resource.*ERR_NAME_NOT_RESOLVED/i, // Captured via requestfailed
  /Failed to load resource.*net::/i, // Generic network errors captured via requestfailed
];

function isSameOrigin(target: string, baseURL: string): boolean {
  try {
    const url = new URL(target, baseURL);
    const origin = new URL(baseURL).origin;
    return url.origin === origin;
  } catch {
    return false;
  }
}

function shouldSkip(href: string): boolean {
  if (!href) {
    return true;
  }
  if (href.startsWith("#")) {
    return true;
  }
  if (href.startsWith("mailto:")) {
    return true;
  }
  if (href.startsWith("tel:")) {
    return true;
  }
  return SKIP_PATTERNS.some((re) => re.test(href));
}

function shouldSkipClick(
  text: string,
  ariaLabel: string,
  role: string
): boolean {
  const combined = `${text} ${ariaLabel} ${role}`.toLowerCase();
  return SKIP_PATTERNS.some((re) => re.test(combined));
}

test("App spider: authenticated crawl logs errors", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(180_000);
  expect(baseURL).toBeTruthy();

  const errors: Array<{ url: string; text: string }> = [];
  const warnings: Array<{ url: string; text: string }> = [];
  const failures: Array<{
    url: string;
    status: number;
    method: string;
    body?: string;
  }> = [];
  const failedRequests: Array<{
    pageUrl: string;
    requestUrl: string;
    errorText: string;
  }> = [];
  const visited = new Set<string>();
  const visitLog: Array<{ url: string; clicksAttempted: number }> = [];

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") {
      // Skip known dev-mode noise
      if (IGNORE_CONSOLE_PATTERNS.some((re) => re.test(text))) {
        return;
      }
      errors.push({ url: page.url(), text });
    } else if (type === "warning") {
      if (IGNORE_CONSOLE_PATTERNS.some((re) => re.test(text))) {
        return;
      }
      warnings.push({ url: page.url(), text });
    }
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    const errorText = request.failure()?.errorText || "unknown error";

    // Skip external resources (analytics, CDNs, etc.)
    if (!isSameOrigin(url, baseURL!)) {
      return;
    }

    // Skip ERR_ABORTED which happens during redirects/navigation
    if (errorText.includes("ERR_ABORTED")) {
      return;
    }

    failedRequests.push({
      pageUrl: page.url(),
      requestUrl: url,
      errorText,
    });
  });

  page.on("response", async (response) => {
    const status = response.status();
    if (status >= 400 && isSameOrigin(response.url(), baseURL!)) {
      let body: string | undefined;
      try {
        const text = await response.text();
        body = text.slice(0, 500); // First 500 chars
      } catch {}
      failures.push({
        url: response.url(),
        status,
        method: response.request().method(),
        body,
      });
    }
  });

  const queue: string[] = [START_PATH];

  while (queue.length && visited.size < MAX_VISITS) {
    const path = queue.shift()!;
    if (visited.has(path)) {
      continue;
    }
    visited.add(path);

    const target = new URL(path, baseURL).toString();
    const response = await page.goto(target, {
      waitUntil: "domcontentloaded",
      timeout: VISIT_TIMEOUT_MS,
    });

    if (response && response.status() >= 400) {
      failures.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
      });
    }

    await page
      .waitForLoadState("networkidle", { timeout: 5000 })
      .catch(() => undefined);

    if (page.isClosed()) {
      break;
    }

    // Try clicking interactive elements to trigger state/API calls
    const clickables = await page
      .locator(
        "button:visible, [role='button']:visible, [role='tab']:visible, a:visible"
      )
      .all()
      .catch(() => []);

    let clickCount = 0;
    let clicksAttempted = 0;
    for (const el of clickables) {
      if (clickCount >= MAX_CLICKS_PER_PAGE) {
        break;
      }

      const text = await el.textContent().catch(() => "");
      const ariaLabel = await el.getAttribute("aria-label").catch(() => "");
      const role = await el.getAttribute("role").catch(() => "");

      if (shouldSkipClick(text || "", ariaLabel || "", role || "")) {
        continue;
      }

      clicksAttempted++;
      await el.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(500); // Let interactions settle
      await page
        .waitForLoadState("networkidle", { timeout: 3000 })
        .catch(() => undefined);

      // Check for error states in UI
      const hasErrorText =
        (await page.locator("text=/error|failed|invalid|required/i").count()) >
        0;
      if (hasErrorText) {
        const errorTexts = await page
          .locator("text=/error|failed|invalid|required/i")
          .allTextContents();
        errors.push({
          url: page.url(),
          text: `UI error after click: ${errorTexts.join(", ")}`,
        });
      }

      clickCount++;

      if (errors.length || failures.length || failedRequests.length) {
        break;
      }
    }

    visitLog.push({ url: target, clicksAttempted });

    // Also try form inputs
    const inputs = await page
      .locator("input:visible, select:visible")
      .all()
      .catch(() => []);
    for (const input of inputs.slice(0, 3)) {
      const type = await input.getAttribute("type").catch(() => "text");
      if (type === "text" || type === "email" || !type) {
        await input.fill("test").catch(() => undefined);
      }
    }

    const hrefs = await page
      .$$eval("a[href]", (links) =>
        links.map(
          (link) => (link as HTMLAnchorElement).getAttribute("href") || ""
        )
      )
      .catch(() => [] as string[]);

    for (const href of hrefs) {
      if (shouldSkip(href)) {
        continue;
      }
      if (!isSameOrigin(href, baseURL!)) {
        continue;
      }
      const normalized =
        new URL(href, baseURL!).pathname +
        (new URL(href, baseURL!).search || "");
      if (!(visited.has(normalized) || queue.includes(normalized))) {
        queue.push(normalized);
      }
    }

    if (errors.length || failures.length || failedRequests.length) {
      break;
    }
  }

  console.log(
    `[SPIDER] Visited ${visited.size} pages, attempted ${visitLog.reduce((sum, v) => sum + v.clicksAttempted, 0)} interactions`
  );

  if (
    errors.length ||
    failures.length ||
    failedRequests.length ||
    warnings.length
  ) {
    console.log("[SPIDER] Visit log:", visitLog);
    if (errors.length) {
      console.log("[SPIDER] Console errors:", errors);
    }
    if (warnings.length) {
      console.log("[SPIDER] Console warnings:", warnings);
    }
    if (failures.length) {
      console.log("[SPIDER] Network failures:", failures);
    }
    if (failedRequests.length) {
      console.log("[SPIDER] Failed requests:", failedRequests);
    }
  }

  expect(errors, "Console errors found during crawl").toEqual([]);
  expect(failures, "Network failures (4xx/5xx) found during crawl").toEqual([]);
  expect(
    failedRequests,
    "Failed network requests (DNS/connection errors) found during crawl"
  ).toEqual([]);
});
