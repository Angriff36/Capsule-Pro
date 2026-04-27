import { defineConfig, devices } from "@playwright/test";
import { detectBrowserEndpoint } from "./e2e/detect-browser-endpoint";
import { loadEnvFiles } from "./e2e/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STORAGE_STATE = path.resolve(__dirname, "e2e", ".auth", "user.json");

loadEnvFiles();

const PORT = Number(process.env.PORT ?? 2221);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

const USE_PERSISTENT_BROWSER = process.env.PERSISTENT_BROWSER === "true";

function getPersistentBrowserEndpoint(): string {
  const detected = detectBrowserEndpoint();
  const endpoint = process.env.PLAYWRIGHT_CDP_ENDPOINT || detected || undefined;
  if (endpoint) {
    return endpoint;
  }
  console.error(
    "\n❌ PERSISTENT_BROWSER=true but could not connect to your Chrome."
  );
  console.error(
    "   1. Close all Chrome windows, then start Chrome with remote debugging:"
  );
  console.error(
    '      Windows:  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222'
  );
  console.error(
    "      (Or create a shortcut and add:  --remote-debugging-port=9222)"
  );
  console.error(
    "   2. Or set PLAYWRIGHT_CDP_ENDPOINT to the WebSocket URL from chrome://inspect."
  );
  throw new Error(
    "Cannot use persistent browser: Chrome not found on port 9222. Start Chrome with --remote-debugging-port=9222."
  );
}

const wsEndpoint = USE_PERSISTENT_BROWSER
  ? getPersistentBrowserEndpoint()
  : undefined;

// Workflow specs run sequentially (they mutate DB state); spider runs alone.
// Set E2E_SUITE=workflows | spider | all (default: all)
const E2E_SUITE = process.env.E2E_SUITE ?? "all";
const testMatch =
  E2E_SUITE === "workflows"
    ? ["**/workflows/*.spec.ts"]
    : E2E_SUITE === "spider"
      ? ["**/workflows/full-site.spider.spec.ts"]
      : ["**/*.spec.ts"];

export default defineConfig({
  testDir: "e2e",
  testMatch,
  globalSetup: USE_PERSISTENT_BROWSER
    ? "e2e/global-setup-persistent-browser.ts"
    : undefined, // Auth handled by setup project below

  timeout: 120_000,
  expect: { timeout: 15_000 },
  // Workflow specs must run sequentially — they share DB state
  fullyParallel: false,
  workers: 1,
  retries: 0, // Fail hard — no retries, force fixes
  reporter: process.env.CI ? [["github"], ["html"]] : [["list"], ["html"]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...(USE_PERSISTENT_BROWSER &&
      wsEndpoint && { connectOptions: { wsEndpoint } }),
  },

  // When using persistent browser, do NOT start the server (you run the app yourself).
  // When not, start the app and wait for it.
  webServer: USE_PERSISTENT_BROWSER
    ? undefined
    : {
        command: process.env.CI
          ? "pnpm --filter ./apps/app start"
          : "pnpm --filter ./apps/app dev",
        url: `${baseURL}/sign-in`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },

  projects: USE_PERSISTENT_BROWSER
    ? [
        // Persistent browser mode: user's real browser is already authenticated.
        // No setup project needed — just connect to the running browser.
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : [
        // Setup project: authenticates via Clerk and saves storageState.
        // Runs before any test project. All test projects depend on it.
        {
          name: "setup",
          testMatch: /.*\.setup\.ts/,
          use: { ...devices["Desktop Chrome"] },
        },
        // Unauthenticated test project — NO stored session.
        // For sign-in/sign-up form rendering tests that need a clean browser.
        // Does NOT depend on setup — runs with a fresh context.
        {
          name: "chromium-unauth",
          testMatch: /.*\.spec\.ts/,
          use: { ...devices["Desktop Chrome"] },
          // No storageState, no dependency on setup
        },
        // Authenticated test project — uses stored Clerk session cookies.
        // Clerk SSR requires __session cookies; Bearer tokens don't work.
        {
          name: "chromium",
          use: {
            ...devices["Desktop Chrome"],
            storageState: AUTH_STORAGE_STATE,
          },
          dependencies: ["setup"],
        },
      ],
});
