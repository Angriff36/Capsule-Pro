/**
 * Standalone Prisma client for the MCP server.
 *
 * We cannot import `@repo/database` directly because:
 * 1. It imports `server-only` which throws in standalone Node.js processes
 * 2. It re-exports `ingredient-resolution.ts` which imports from `@prisma/client`
 *    (the npm package) instead of the local generated client, causing a missing
 *    `.prisma/client/default` error
 *
 * This module creates an equivalent PrismaClient with the Neon adapter,
 * matching the configuration in `@repo/database/index.ts`.
 */

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
// Import directly from the generated client to avoid @repo/database's
// server-only guard and broken ingredient-resolution.ts re-export.
// The path traverses: mcp-server/src/lib/ → database/generated/client
// Use path alias to avoid Windows casing issues with relative paths
import { PrismaClient } from "../../../../packages/database/generated/client.js";

// Configure Neon WebSocket (same as @repo/database)
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

/**
 * Rewrite a Neon direct connection URL to use the pooler endpoint.
 * Copied from @repo/database/keys.ts to avoid importing the full package.
 */
function toNeonPoolerUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("neon.tech")) {
      return url;
    }
    if (!u.hostname.includes("-pooler")) {
      const beforeRegion = u.hostname.split(".")[0];
      if (beforeRegion?.startsWith("ep-")) {
        u.hostname = u.hostname.replace(beforeRegion, `${beforeRegion}-pooler`);
      }
    }
    u.searchParams.set("connect_timeout", "15");
    if (!u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url;
  }
}

function getConnectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error(
      "DATABASE_URL is not set. Ensure .env is loaded (preload.cts should handle this)."
    );
  }
  return toNeonPoolerUrl(raw);
}

const connectionString = getConnectionString();

// Dev-only: log which host we're using (no credentials)
if (process.env.NODE_ENV !== "production") {
  try {
    const u = new URL(connectionString);
    process.stderr.write(
      `${JSON.stringify({
        level: "info",
        message: "MCP database connection",
        host: u.hostname,
        pooler: u.hostname.includes("-pooler"),
      })}\n`
    );
  } catch {
    // ignore
  }
}

const adapter = new PrismaNeon({ connectionString });

/** Singleton PrismaClient for the MCP server process. */
export const database = new PrismaClient({ adapter });
