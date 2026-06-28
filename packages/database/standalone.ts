/**
 * Standalone entry point for @repo/database.
 *
 * Exports the same surface area as index.ts but WITHOUT the server-only guard.
 * Use this entry point for CLI tools, scripts, and non-Next.js runtimes like MCP server.
 *
 * Usage: import { database, Prisma } from "@repo/database/standalone";
 */

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "./generated/client";
import { keys } from "./keys";
import { createAnalyticsDatabase } from "./analytics-database";
import { createTenantClient } from "./tenant";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

neonConfig.webSocketConstructor = ws;
// Use HTTP fetch for queries when possible; avoids WebSocket "Connection terminated unexpectedly" (neondatabase/serverless#168)
neonConfig.poolQueryViaFetch = true;
// R5: Serialize Date objects as UTC when writing to `timestamp without time zone` columns.
// Without this the Neon driver uses the Node.js process local timezone, producing
// timestamps that are off by the server's UTC offset (e.g. +7h on US Pacific).
// Cast required: neonConfig TypeScript types omit this property even though the
// runtime honours it (see @neondatabase/serverless prepareValue in index.js).
(neonConfig as unknown as Record<string, unknown>).parseInputDatesAsUTC = true;

// Guard: skip real DB initialization when DATABASE_URL is absent (test/mock environments).
// The vitest mock for @repo/database intercepts most imports, but transitive imports
// via @repo/database/standalone (e.g. manifest/runtime prisma-stores/shared.ts)
// bypass the mock and load this module. Without DATABASE_URL the keys() call crashes.
const connectionString = process.env.DATABASE_URL
  ? keys().DATABASE_URL
  : undefined;

// Dev-only: confirm which host we're using (no credentials)
// Use console.error to avoid polluting stdout (MCP stdio transport requires JSON-only stdout)
if (
  connectionString &&
  process.env.NODE_ENV !== "production" &&
  typeof process !== "undefined"
) {
  try {
    const u = new URL(connectionString);
    console.error(
      "[db] Using Neon host:",
      u.hostname,
      "(pooler:",
      `${u.hostname.includes("-pooler")})`
    );
  } catch {
    // ignore
  }
}

// When DATABASE_URL is absent (test environments), the real client is never used
// — the vitest mock for @repo/database intercepts all direct usage. This branch
// only fires when standalone.ts is loaded transitively (e.g. via shared.ts) for
// the Prisma namespace re-export.
const adapter = connectionString
  ? new PrismaNeon({ connectionString })
  : undefined;

export const database =
  globalForPrisma.prisma ||
  (adapter
    ? new PrismaClient({ adapter })
    : (undefined as unknown as PrismaClient));
/** Read-replica client for analytics/reporting; falls back to `database` when unset. */
export const analyticsDatabase = database
  ? createAnalyticsDatabase(database)
  : database;
export const db = database;

if (process.env.NODE_ENV !== "production" && adapter) {
  globalForPrisma.prisma = database;
}

export const tenantDatabase = (tenantId: string) =>
  createTenantClient(tenantId, database);

export * from "./generated/client";
export { Prisma, PrismaClient } from "./generated/client";
export * from "./src/critical-path";
export * from "./src/ingredient-resolution";
export * from "./tenant";
