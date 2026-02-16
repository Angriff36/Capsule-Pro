import type { FullConfig } from "@playwright/test";

/**
 * When using PERSISTENT_BROWSER=true we don't start the app.
 * This setup only checks that the app is already running so tests don't hang on about:blank.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (typeof baseURL !== "string" || !baseURL) {
    throw new Error("Playwright baseURL is not set.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(baseURL, {
      signal: controller.signal,
      redirect: "manual",
    });
    clearTimeout(timeout);
    // Any response (200, 302, 404, etc.) means something is listening
    if (res.status >= 0) {
      return;
    }
  } catch (e) {
    clearTimeout(timeout);
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "timed out"
        : e instanceof Error
          ? e.message
          : String(e);
    console.error(`\n❌ App is not reachable at ${baseURL}`);
    console.error(`   Error: ${msg}`);
    console.error("   Start the app first in another terminal:");
    console.error("   pnpm dev:apps");
    console.error("");
    throw new Error(
      "App not running at " +
        baseURL +
        ". Start it first: pnpm dev:apps (or pnpm --filter ./apps/app dev)"
    );
  }
}
