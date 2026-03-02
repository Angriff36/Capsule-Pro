/**
 * Capsule-Pro MCP Server — Entry point.
 *
 * Initializes Sentry, resolves identity, creates the MCP server,
 * and connects the stdio transport.
 *
 * Uses @repo/database/standalone to avoid server-only guard.
 * Requires preload.cts to run first (via tsx --require) which:
 * - Loads .env from the monorepo root for DATABASE_URL
 *
 * Usage:
 *   pnpm --filter @repo/mcp-server start          # Tenant server
 *   pnpm --filter @repo/mcp-server start:admin     # Admin server
 *
 * @packageDocumentation
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { database } from "@repo/database/standalone";
import { consoleLoggingIntegration, init } from "@sentry/node";
import { resolveIdentity } from "./lib/auth.js";
import { startIRWatcher } from "./lib/ir-loader.js";
import { disconnectPrisma, setPrisma } from "./lib/runtime-factory.js";
import { createServer } from "./server.js";
import type { ServerMode } from "./types.js";

// ---------------------------------------------------------------------------
// Sentry initialization (MUST be first)
// ---------------------------------------------------------------------------

const isProd = process.env.NODE_ENV === "production";

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: 1.0,

  // PII: disabled in production, enabled in dev for debugging
  sendDefaultPii: !isProd,

  integrations: [
    consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],

  // Redact tool arguments in production
  beforeSendTransaction(event) {
    if (isProd) {
      for (const span of event.spans ?? []) {
        if (span.op === "mcp.server") {
          for (const key of Object.keys(span.data ?? {})) {
            if (key.startsWith("mcp.request.argument.")) {
              // biome-ignore lint/suspicious/noExplicitAny: Sentry span data is typed as Record<string, any>
              (span.data as any)[key] = "[REDACTED]";
            }
          }
        }
      }
    }
    return event;
  },
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // 1. Determine server mode
  const mode: ServerMode =
    process.env.MCP_SERVER_MODE === "admin" ? "admin" : "tenant";

  // 2. Initialize Prisma
  // biome-ignore lint/suspicious/noExplicitAny: database is the full PrismaClient; PrismaLike is a structural subset
  setPrisma(database as any);

  // 3. Resolve identity (stdio = service account from env vars)
  const identity = await resolveIdentity("stdio", database);

  process.stderr.write(
    `${JSON.stringify({
      level: "info",
      message: "MCP server starting",
      mode,
      userId: identity.userId,
      tenantId: identity.tenantId,
    })}\n`
  );

  // 4. Start IR file watcher for hot-reload in development
  if (!isProd) {
    startIRWatcher();
  }

  // 5. Create and configure server
  const server = await createServer({ mode, identity });

  // 6. Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `${JSON.stringify({
      level: "info",
      message: "MCP server connected via stdio transport",
      mode,
    })}\n`
  );
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown() {
  process.stderr.write(
    `${JSON.stringify({ level: "info", message: "MCP server shutting down" })}\n`
  );
  await disconnectPrisma();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({
      level: "error",
      message: "MCP server failed to start",
      error: error instanceof Error ? error.message : String(error),
    })}\n`
  );
  process.exit(1);
});
