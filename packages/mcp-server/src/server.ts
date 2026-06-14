/**
 * MCP server setup and plugin registration.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { wrapMcpServerWithSentry } from "@sentry/node";
import { keys } from "./keys.js";
import { governanceScannersPlugin } from "./plugins/governance-scanners.js";
import { irAdminPlugin } from "./plugins/ir-admin.js";
import { irIntrospectionPlugin } from "./plugins/ir-introspection.js";
import { manifestQueriesPlugin } from "./plugins/manifest-queries.js";
import { openapiPlugin } from "./plugins/openapi.js";
import { routeResolutionPlugin } from "./plugins/route-resolution.js";
import { runCommandPlugin } from "./plugins/run-command.js";
import { testReproPlugin } from "./plugins/test-repro.js";
import type { McpIdentity, McpPlugin, ServerMode } from "./types.js";

const env = keys();

const TENANT_PLUGINS: McpPlugin[] = [
  manifestQueriesPlugin,
  irIntrospectionPlugin,
  openapiPlugin,
  runCommandPlugin,
  routeResolutionPlugin,
  governanceScannersPlugin,
  testReproPlugin,
];

const ADMIN_PLUGINS: McpPlugin[] = [irAdminPlugin];

export interface CreateServerOptions {
  identity: McpIdentity;
  mode: ServerMode;
}

export async function createServer(
  options: CreateServerOptions
): Promise<McpServer> {
  const { mode, identity } = options;
  const isProd = env.NODE_ENV === "production";

  const serverName = mode === "admin" ? "capsule-pro-admin" : "capsule-pro";
  const rawServer = new McpServer({
    name: serverName,
    version: "2.0.0",
  });

  const server = wrapMcpServerWithSentry(rawServer, {
    recordInputs: !isProd,
    recordOutputs: !isProd,
  });

  const plugins =
    mode === "admin" ? [...TENANT_PLUGINS, ...ADMIN_PLUGINS] : TENANT_PLUGINS;

  for (const plugin of plugins) {
    await plugin.register({ server, identity, mode });
  }

  return server;
}
