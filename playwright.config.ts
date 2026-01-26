import { defineConfig, devices } from "@playwright/test";
import { loadEnvFiles } from "./e2e/env";

loadEnvFiles();

const PORT = Number(process.env.PORT ?? 2221);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "e2e/global-setup.ts",

  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
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
  },

  // Start Next.js once for the suite.
  // (This is the standard Next.js + Playwright pattern.)
  webServer: {
    command: process.env.CI
      ? "pnpm --filter ./apps/app start"
      : "pnpm --filter ./apps/app dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
