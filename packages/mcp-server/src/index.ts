/**
 * Capsule-Pro MCP Server — Entry point.
 *
 * Initializes Sentry, resolves identity from env, creates the MCP server,
 * and connects the stdio transport.
 *
 * Requires preload.cts to run first (via tsx --require) which loads .env.
 *
 * Usage:
 *   pnpm --filter @repo/mcp-server start          # Tenant server
 *   pnpm --filter @repo/mcp-server start:admin     # Admin server
 *
 * @packageDocumentation
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { consoleLoggingIntegration, init } from "@sentry/node";
import { keys } from "./keys.js";
import { resolveIdentity } from "./lib/auth.js";
import { startIRWatcher } from "./lib/ir-loader.js";
import { disconnectPrisma } from "./lib/runtime-factory.js";
import {
  EXPLAIN_BRIDGE_REV,
  warmupExplainBridge,
} from "./lib/upstream-manifest-mcp.js";
import { createServer } from "./server.js";
import type { ServerMode } from "./types.js";

const env = keys();

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? env.SENTRY_DSN,
  environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
  tracesSampleRate: 1.0,
  sendDefaultPii: env.NODE_ENV !== "production",
  integrations: [
    consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],
  beforeSendTransaction(event) {
    if (env.NODE_ENV === "production") {
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

async function main() {
  const mode: ServerMode = env.MCP_SERVER_MODE === "admin" ? "admin" : "tenant";
  const identity = await resolveIdentity("stdio");

  process.stderr.write(
    `${JSON.stringify({
      level: "info",
      message: "MCP server starting",
      mode,
      userId: identity.userId,
      tenantId: identity.tenantId,
    })}\n`
  );

  try {
    await warmupExplainBridge();
    process.stderr.write(
      `${JSON.stringify({
        level: "info",
        message: "Explain bridge ready",
        rev: EXPLAIN_BRIDGE_REV,
      })}\n`
    );
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        level: "error",
        message: "Explain bridge failed to load",
        rev: EXPLAIN_BRIDGE_REV,
        error: error instanceof Error ? error.message : String(error),
      })}\n`
    );
  }

  if (env.NODE_ENV !== "production") {
    startIRWatcher();
  }

  const server = await createServer({ mode, identity });
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

async function shutdown() {
  process.stderr.write(
    `${JSON.stringify({ level: "info", message: "MCP server shutting down" })}\n`
  );
  await disconnectPrisma();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

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
