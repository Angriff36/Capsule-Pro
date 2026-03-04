/**
 * Route/UI resolution tools.
 *
 * Tools:
 * - `next_route_resolve`: Resolve URL to handler and invoked command
 * - `ui_traceAction`: Trace UI action to command invocation
 *
 * @packageDocumentation
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { McpPlugin, PluginContext } from "../types.js";

const projectRoot = process.env.MCP_PROJECT_ROOT || process.cwd();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteManifest {
  version: string;
  generatedAt: string;
  basePath: string;
  routes: Array<{
    id: string;
    path: string;
    method: string;
    params: Array<{
      name: string;
      type: string;
      location: string;
    }>;
    source: {
      kind: "entity-read" | "command";
      entity?: string;
      command?: string;
    };
    auth: boolean;
    tenant: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Route loading
// ---------------------------------------------------------------------------

function loadRoutesManifest(): RouteManifest {
  const manifestPath = join(
    projectRoot,
    "packages/manifest-ir/dist/routes.manifest.json"
  );

  try {
    const content = readFileSync(manifestPath, "utf-8");
    return JSON.parse(content) as RouteManifest;
  } catch (error) {
    throw new Error(
      `Failed to load routes.manifest.json: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// ---------------------------------------------------------------------------
// Route matching
// ---------------------------------------------------------------------------

function matchRoute(
  routes: RouteManifest["routes"],
  url: string,
  method: string
):
  | (RouteManifest["routes"][0] & { extractedParams: Record<string, string> })
  | null {
  const urlPath = url.split("?")[0].startsWith("/")
    ? url.split("?")[0]
    : `/${url.split("?")[0]}`;

  for (const route of routes) {
    if (route.method !== method) continue;

    const paramNames: string[] = [];
    const pattern = route.path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });

    const regex = new RegExp(`^${pattern}$`);
    const match = urlPath.match(regex);

    if (match) {
      const extractedParams: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        extractedParams[name] = match[i + 1];
      });

      return { ...route, extractedParams };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const routeResolutionPlugin: McpPlugin = {
  name: "route-resolution",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server } = ctx;

    // ── next_route_resolve ─────────────────────────────────────────────
    server.registerTool(
      "next_route_resolve",
      {
        title: "Resolve Next.js Route",
        description:
          "Resolve a URL to its handler and invoked command. " +
          "Parses routes.manifest.json to find the matching route.",
        inputSchema: z.object({
          url: z
            .string()
            .describe(
              "Full URL or path to resolve (e.g., '/api/preptask/123')"
            ),
          method: z
            .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
            .optional()
            .default("GET")
            .describe("HTTP method"),
        }),
      },
      async (args: { url: string; method?: string }) => {
        const { url, method = "GET" } = args;

        try {
          const manifest = loadRoutesManifest();
          const matched = matchRoute(manifest.routes, url, method);

          if (!matched) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      error: "Route not found",
                      url,
                      method,
                      suggestion:
                        "Check the URL path and method. Available routes in routes.manifest.json",
                    },
                    null,
                    2
                  ),
                },
              ],
              isError: true,
            };
          }

          const result = {
            routeId: matched.id,
            routeFile: `apps/api/app/api/${matched.path
              .replace("/api/", "")
              .replace(/:([^/]+)/g, "[$1]")}/route.ts`,
            handler: matched.method,
            method: matched.method,
            path: matched.path,
            pathParams: matched.extractedParams,
            invokedCommand:
              matched.source.kind === "command" &&
              matched.source.entity &&
              matched.source.command
                ? {
                    entityName: matched.source.entity,
                    commandName: matched.source.command,
                  }
                : undefined,
            source: matched.source,
            auth: matched.auth,
            tenant: matched.tenant,
            manifest: {
              generatedAt: manifest.generatedAt,
              basePath: manifest.basePath,
            },
          };

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error resolving route: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ── ui.traceAction ─────────────────────────────────────────────────
    server.registerTool(
      "ui_traceAction",
      {
        title: "Trace UI Action",
        description:
          "Trace a UI action to its command invocation. " +
          "Maps action IDs like 'PrepTask.claim' to their API routes and commands.",
        inputSchema: z.object({
          actionId: z
            .string()
            .describe(
              "Action identifier (e.g., 'PrepTask.claim', 'Event.create')"
            ),
        }),
      },
      async (args: { actionId: string }) => {
        const { actionId } = args;

        try {
          const manifest = loadRoutesManifest();

          const [entityName, commandName] = actionId.split(".");

          if (!(entityName && commandName)) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      error: "Invalid action ID format",
                      actionId,
                      expectedFormat: "Entity.command (e.g., 'PrepTask.claim')",
                    },
                    null,
                    2
                  ),
                },
              ],
              isError: true,
            };
          }

          const commandRoute = manifest.routes.find(
            (r) =>
              r.source.kind === "command" &&
              r.source.entity === entityName &&
              r.source.command === commandName
          );

          if (!commandRoute) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      error: "No route found for action",
                      actionId,
                      entityName,
                      commandName,
                      suggestion:
                        "This action may not be exposed via API, or the action ID is incorrect",
                    },
                    null,
                    2
                  ),
                },
              ],
              isError: true,
            };
          }

          const result = {
            actionId,
            componentFile: `apps/web/components/${entityName}/${commandName}.tsx`,
            handlerSymbol: `handle${commandName.charAt(0).toUpperCase()}${commandName.slice(1)}`,
            request: {
              url: commandRoute.path,
              method: commandRoute.method,
              bodyShape:
                commandRoute.params.length > 0
                  ? Object.fromEntries(
                      commandRoute.params.map((p) => [p.name, p.type])
                    )
                  : undefined,
            },
            responseShape: {
              success: "boolean",
              data: "object | null",
              error: "string | null",
            },
            invokedCommand: {
              entityName,
              commandName,
            },
            route: {
              id: commandRoute.id,
              auth: commandRoute.auth,
              tenant: commandRoute.tenant,
            },
            manifest: {
              generatedAt: manifest.generatedAt,
            },
          };

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Error tracing action: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
};
