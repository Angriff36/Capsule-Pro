/**
 * Standalone entry point for @repo/database.
 *
 * Exports the same surface area as index.ts but WITHOUT the server-only guard.
 * Use this entry point for CLI tools, scripts, and non-Next.js runtimes like MCP server.
 *
 * Usage: import { database, Prisma } from "@repo/database/standalone";
 *
 * Same TCP/`pg` connection path as index.ts — see Neon choose-connection docs.
 */

import { PrismaClient } from "./generated/client";
import { createPrismaPgAdapter } from "./create-pg-adapter";
import { keys } from "./keys";
import { createAnalyticsDatabase } from "./analytics-database";
import { createTenantClient } from "./tenant";

type GlobalPrisma = {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

// Guard: skip real DB initialization when DATABASE_URL is absent (test/mock environments).
// The vitest mock for @repo/database intercepts most imports, but transitive imports
// via @repo/database/standalone (e.g. manifest/runtime prisma-stores/shared.ts)
// bypass the mock and load this module. Without DATABASE_URL the keys() call crashes.
const connectionString = process.env.DATABASE_URL
  ? keys().DATABASE_URL
  : undefined;

function logNeonHost(url: string): void {
  if (process.env.NODE_ENV === "production" || typeof process === "undefined") {
    return;
  }
  try {
    const u = new URL(url);
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

function createDatabaseClient(url: string): PrismaClient {
  logNeonHost(url);
  const adapter = createPrismaPgAdapter(url);
  // Same transaction budget as index.ts — remote Neon latency makes the
  // 5s default expire mid-write in multi-command transactions.
  return new PrismaClient({
    adapter,
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
  });
}

// When DATABASE_URL is absent (test environments), the real client is never used
// — the vitest mock for @repo/database intercepts all direct usage. This branch
// only fires when standalone.ts is loaded transitively (e.g. via shared.ts) for
// the Prisma namespace re-export.
//
// Do not construct PrismaPg when globalThis.prisma already exists — orphan
// pools are a real hazard under Turbopack re-eval / parallel SSR.
export const database =
  globalForPrisma.prisma ??
  (connectionString
    ? createDatabaseClient(connectionString)
    : (undefined as unknown as PrismaClient));

if (database) {
  globalForPrisma.prisma = database;
}

/** Read-replica client for analytics/reporting; falls back to `database` when unset. */
export const analyticsDatabase = database
  ? createAnalyticsDatabase(database)
  : database;
export const db = database;

export const tenantDatabase = (tenantId: string) =>
  createTenantClient(tenantId, database);

export * from "./generated/client";
export { Prisma, PrismaClient } from "./generated/client";
export * from "./src/critical-path";
export * from "./src/ingredient-resolution";
export * from "./tenant";
