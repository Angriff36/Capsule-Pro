/**
 * Shared Sentry tracesSampler for server.ts and edge.ts.
 *
 * Goals:
 * - Drop zero-value traces (tunnel route, static assets, health checks, cron, bots)
 * - Cap production sampling via SENTRY_TRACES_SAMPLE_RATE env var or a conservative default
 * - Development always samples at 100%
 */

const NOISE_PREFIXES = [
  // Sentry tunnel
  "/monitoring",
  // Next.js internals
  "/_next",
  // Static files
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
  // Health / uptime
  "/api/health",
  // Cron jobs
  "/api/cron",
  "/cron/",
  // Security scanners
  "/.well-known",
  "/wp-admin",
  // Common uptime probes
  "/ping",
];

function isNoise(name: string): boolean {
  if (!name) return false;
  return NOISE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/** Resolve the effective trace sample rate. */
export function getTracesSampleRate(): number {
  const env = process.env.SENTRY_TRACES_SAMPLE_RATE;
  if (env !== undefined && env !== "") {
    return Number(env);
  }
  return process.env.NODE_ENV === "production" ? 0.05 : 1;
}

/**
 * tracesSampler for Sentry init().
 * Returns 0 for noise routes, otherwise the configured sample rate.
 */
export function tracesSampler(ctx: {
  name: string;
  normalizedRequest?: unknown;
}): number {
  if (isNoise(ctx.name)) return 0;
  return getTracesSampleRate();
}
