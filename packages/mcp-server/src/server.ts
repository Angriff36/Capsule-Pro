/**
 * MCP server setup and plugin registration.
 *
 * Creates the McpServer instance, wraps it with Sentry instrumentation,
 * and registers all plugins based on server mode.
 *
 * @packageDocumentation
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { wrapMcpServerWithSentry } from "@sentry/node";
import { irIntrospectionPlugin } from "./plugins/ir-introspection.js";
import { manifestQueriesPlugin } from "./plugins/manifest-queries.js";
import type { McpIdentity, McpPlugin, ServerMode } from "./types.js";

// ---------------------------------------------------------------------------
// Plugin registry
// ---------------------------------------------------------------------------

/** Core plugins — always loaded for tenant server. */
const TENANT_PLUGINS: McpPlugin[] = [
  manifestQueriesPlugin,
  irIntrospectionPlugin,
];

/** Admin-only plugins — loaded only for admin server. */
const ADMIN_PLUGINS: McpPlugin[] = [
  // Phase 4+: ir-admin, monitoring, devops plugins
];

// ---------------------------------------------------------------------------
// Server creation
// ---------------------------------------------------------------------------

export interface CreateServerOptions {
  mode: ServerMode;
  identity: McpIdentity;
}

/**
 * Create and configure the MCP server.
 *
 * 1. Creates McpServer instance
 * 2. Wraps with Sentry instrumentation
 * 3. Registers plugins based on server mode
 */
export async function createServer(
  options: CreateServerOptions
): Promise<McpServer> {
  const { mode, identity } = options;
  const isProd = process.env.NODE_ENV === "production";

  // 1. Create raw server
  const serverName = mode === "admin" ? "capsule-pro-admin" : "capsule-pro";
  const rawServer = new McpServer({
    name: serverName,
    version: "1.0.0",
  });

  // 2. Wrap with Sentry — auto-instruments tools/call, resources/read, prompts/get
  const server = wrapMcpServerWithSentry(rawServer, {
    // Record inputs/outputs only in dev — redact in production
    recordInputs: !isProd,
    recordOutputs: !isProd,
  });

  // 3. Register plugins
  const plugins = [...TENANT_PLUGINS];
  if (mode === "admin") {
    plugins.push(...ADMIN_PLUGINS);
  }

  for (const plugin of plugins) {
    await plugin.register({ server, identity, mode });
  }

  return server;
}
