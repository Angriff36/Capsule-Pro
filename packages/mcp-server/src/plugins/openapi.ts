/**
 * OpenAPI (HTTP-transport) introspection — tenant-facing tools.
 *
 * Complements ir-introspection.ts: where those tools describe IR *semantics*
 * (entities, commands, guards, params), these describe how to actually CALL the
 * API over HTTP — route path, method, status codes, and request/response JSON
 * schemas — sourced from the generated `manifest/api-docs/openapi.json`.
 *
 * The full spec is ~4 MB / 1460 operations, so these tools are search-oriented:
 * never dump the whole document into context. The full spec is available via the
 * auth-gated HTTP route /api-docs/openapi.json instead.
 */

import { z } from "zod";
import {
  collectReferencedSchemas,
  commandsForEntity,
  findEndpoint,
  getOpenApiSpec,
  listEndpoints,
} from "../lib/openapi-loader.js";
import type { McpPlugin, PluginContext } from "../types.js";

export const openapiPlugin: McpPlugin = {
  name: "openapi",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server } = ctx;

    // -----------------------------------------------------------------------
    // list_api_endpoints — compact catalog of HTTP operations
    // -----------------------------------------------------------------------
    server.registerTool(
      "list_api_endpoints",
      {
        title: "List API Endpoints",
        description:
          "List HTTP endpoints from the generated OpenAPI spec as compact rows " +
          "(operationId, method, path, summary). Optionally filter by entity. " +
          "Use get_api_endpoint for a single endpoint's full request/response schemas.",
        inputSchema: z.object({
          entity: z
            .string()
            .optional()
            .describe(
              "Entity name to filter by (matches the OpenAPI tag, case-insensitive). " +
                "Omit to list every endpoint."
            ),
        }),
      },
      (args: { entity?: string }) => {
        const spec = getOpenApiSpec();
        const all = listEndpoints(spec);
        const target = args.entity?.toLowerCase();
        const rows = target
          ? all.filter((e) =>
              (e.tags ?? []).some((t) => t.toLowerCase() === target)
            )
          : all;

        const result = {
          total: rows.length,
          ...(args.entity ? { entity: args.entity } : {}),
          endpoints: rows.map((e) => ({
            operationId: e.operationId,
            method: e.method.toUpperCase(),
            path: e.path,
            summary: e.summary,
          })),
        };

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    // -----------------------------------------------------------------------
    // get_api_endpoint — full HTTP contract for one endpoint
    // -----------------------------------------------------------------------
    server.registerTool(
      "get_api_endpoint",
      {
        title: "Get API Endpoint",
        description:
          "Get the full HTTP contract for one endpoint: method, route path, " +
          "request body schema, and success + error (401/403/409/422) response " +
          "schemas, with referenced component schemas resolved. Provide `command` " +
          "for a command POST endpoint, or omit it for the entity's list GET endpoint.",
        inputSchema: z.object({
          entity: z
            .string()
            .describe(
              "Entity name (matches the OpenAPI tag, case-insensitive)."
            ),
          command: z
            .string()
            .optional()
            .describe(
              "Command name for a POST /{entity}/commands/{command} endpoint. " +
                "Omit to get the GET list endpoint for the entity."
            ),
        }),
      },
      (args: { entity: string; command?: string }) => {
        const spec = getOpenApiSpec();
        const match = findEndpoint(spec, args.entity, args.command);

        if (!match) {
          const hint = args.command
            ? `Available commands for ${args.entity}: ${
                commandsForEntity(spec, args.entity).join(", ") || "none"
              }`
            : `No list endpoint found for entity '${args.entity}'. ` +
              "Check the entity name with list_api_endpoints.";
          return {
            content: [
              {
                type: "text" as const,
                text: `Endpoint not found for ${args.entity}${
                  args.command ? `.${args.command}` : " (list)"
                }. ${hint}`,
              },
            ],
            isError: true,
          };
        }

        const { method, path, operation } = match;
        const referencedSchemas = collectReferencedSchemas(operation, spec);

        const result = {
          method: method.toUpperCase(),
          path,
          operationId: operation.operationId,
          summary: operation.summary,
          description: operation.description,
          requestBody: operation.requestBody,
          responses: operation.responses,
          referencedSchemas,
        };

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      }
    );

    // -----------------------------------------------------------------------
    // openapi://paths resource — compact path index (NOT the full 4MB spec)
    // -----------------------------------------------------------------------
    server.registerResource(
      "openapi-paths",
      "openapi://paths",
      {
        description:
          "Compact index of every HTTP operation (operationId, method, path, tags) " +
          "from the generated OpenAPI spec. The full spec is served over HTTP at " +
          "/api-docs/openapi.json — it is intentionally NOT exposed as a resource.",
        mimeType: "application/json",
      },
      (uri: URL) => {
        const spec = getOpenApiSpec();
        const endpoints = listEndpoints(spec).map((e) => ({
          operationId: e.operationId,
          method: e.method.toUpperCase(),
          path: e.path,
          tags: e.tags,
        }));

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(
                { total: endpoints.length, endpoints },
                null,
                2
              ),
            },
          ],
        };
      }
    );
  },
};
