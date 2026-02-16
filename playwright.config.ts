import { defineConfig, devices } from "@playwright/test";
import { detectBrowserEndpoint } from "./e2e/detect-browser-endpoint";
import { loadEnvFiles } from "./e2e/env";

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

export default defineConfig({
  testDir: "e2e",
  globalSetup: USE_PERSISTENT_BROWSER
    ? "e2e/global-setup-persistent-browser.ts"
    : "e2e/global-setup.ts",

  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: !USE_PERSISTENT_BROWSER,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html"]] : [["list"], ["html"]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    storageState: process.env.PLAYWRIGHT_AUTH_READY
      ? "e2e/.auth/storageState.json"
      : undefined,
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
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
