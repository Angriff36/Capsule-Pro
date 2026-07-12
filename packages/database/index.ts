/**
 * Next.js entry point for @repo/database.
 *
 * Includes server-only guard to prevent accidental client-side usage.
 * For CLI tools and non-Next.js runtimes, use "@repo/database/standalone" instead.
 *
 * Connection method (official Neon guidance):
 * https://neon.com/docs/connect/choose-connection
 * Long-lived Node (`next dev`, Vercel Fluid, Docker) → TCP via `pg` +
 * `@prisma/adapter-pg` on the Neon *pooled* URL. The Neon serverless/HTTP
 * driver (`@prisma/adapter-neon` + fetch) is for Workers/edge — using it from
 * a persistent Node process caused ConnectTimeoutError on :443 and multi-second
 * "fetch failed" stalls.
 */

import "server-only";

import { createAnalyticsDatabase } from "./analytics-database";
import { createPrismaPgAdapter } from "./create-pg-adapter";
import { PrismaClient } from "./generated/client";
import { keys } from "./keys";
import { withManifestIssueLog } from "./manifest-issue-log";
import { withQueryTiming } from "./query-timing";
import { createTenantClient } from "./tenant";

type GlobalPrisma = {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

function logNeonHost(connectionString: string): void {
  if (process.env.NODE_ENV === "production" || typeof process === "undefined") {
    return;
  }
  try {
    const u = new URL(connectionString);
    console.error(
      "[db] Using Neon host:",
      u.hostname,
      "(pooler:",
      `${u.hostname.includes("-pooler")})`,
      "driver: pg/tcp"
    );
  } catch {
    // ignore
  }
}

function createDatabaseClient(): PrismaClient {
  const connectionString = keys().DATABASE_URL;
  logNeonHost(connectionString);
  // Prisma 7 + pg: shared pool timeouts (idle 300s) — v7's 10s default
  // causes P1017 after Neon/PgBouncer closes idle TCP sockets.
  const adapter = createPrismaPgAdapter(connectionString);
  // Composite routes (recipe update-with-version, prep-list save, simulations…)
  // run multiple Manifest commands inside one interactive transaction over a
  // remote Neon connection; Prisma's 5s default expires mid-write and poisons
  // the transaction ("A query cannot be executed on an expired transaction").
  const baseClient = new PrismaClient({
    adapter,
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  });
  // withQueryTiming is a no-op unless PRISMA_LOG_QUERIES=1 (dev-only
  // per-query timing + slow-query warn); withManifestIssueLog captures errors.
  return withManifestIssueLog(withQueryTiming(baseClient));
}

// Construct the adapter/client ONLY when globalThis has none.
// Eager `new PrismaPg(...)` before the singleton check can orphan pools on
// Turbopack re-eval — always gate construction.
export const database = globalForPrisma.prisma ?? createDatabaseClient();
globalForPrisma.prisma = database;

/** Read-replica client for analytics/reporting; falls back to `database` when unset. */
export const analyticsDatabase = createAnalyticsDatabase(database);
export const db = database;

export const tenantDatabase = (tenantId: string) =>
  createTenantClient(tenantId, database);

export * from "./generated/client";
export { Prisma, PrismaClient } from "./generated/client";
export * from "./src/communication-preferences";
export * from "./src/critical-path";
export * from "./src/ingredient-resolution";
export * from "./src/vendor-cost-service";
export * from "./tenant";
