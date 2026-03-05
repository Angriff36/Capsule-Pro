/**
 * Next.js entry point for @repo/database.
 *
 * Includes server-only guard to prevent accidental client-side usage.
 * For CLI tools and non-Next.js runtimes, use "@repo/database/standalone" instead.
 */

import "server-only";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "./generated/client";
import { keys } from "./keys";
import { createTenantClient } from "./tenant";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

neonConfig.webSocketConstructor = ws;
// Use HTTP fetch for queries when possible; avoids WebSocket "Connection terminated unexpectedly" (neondatabase/serverless#168)
neonConfig.poolQueryViaFetch = true;

const connectionString = keys().DATABASE_URL;
// Dev-only: confirm which host we're using (no credentials)
// Use console.error to avoid polluting stdout (MCP stdio transport requires JSON-only stdout)
if (process.env.NODE_ENV !== "production" && typeof process !== "undefined") {
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
const adapter = new PrismaNeon({ connectionString });

export const database = globalForPrisma.prisma || new PrismaClient({ adapter });
export const db = database;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = database;
}

export const tenantDatabase = (tenantId: string) =>
  createTenantClient(tenantId, database);

export * from "./generated/client";
export { Prisma, PrismaClient } from "./generated/client";
export * from "./src/critical-path";
export * from "./src/ingredient-resolution";
export * from "./tenant";
