/**
 * Manifest query tools — Phase 1 read-only tools.
 *
 * Tools:
 * - `query_entity`: Get a single entity instance by ID (tenant-scoped)
 * - `list_entities`: List entity instances with filters (tenant-scoped)
 *
 * All queries are automatically scoped to the resolved identity's tenant.
 * The tenantId is NEVER accepted as a tool parameter.
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { getEntityNames } from "../lib/ir-loader.js";
import { createMcpRuntime } from "../lib/runtime-factory.js";
import type { McpPlugin, PluginContext } from "../types.js";

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const manifestQueriesPlugin: McpPlugin = {
  name: "manifest-queries",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server, identity } = ctx;

    // ── query_entity ──────────────────────────────────────────────────
    server.registerTool(
      "query_entity",
      {
        title: "Query Entity",
        description:
          "Get a single entity instance by ID. Returns the full entity state " +
          "including all properties and computed properties. Automatically " +
          "scoped to your tenant.",
        inputSchema: z.object({
          entity: z
            .string()
            .describe(
              "Entity type name (e.g. 'PrepTask', 'Event', 'Recipe'). " +
                `Available: ${getEntityNames().join(", ")}`
            ),
          id: z.string().describe("Entity instance ID"),
        }),
      },
      async (args: { entity: string; id: string }) => {
        const { entity, id } = args;
        try {
          const runtime = await createMcpRuntime(identity, entity);
          // Store read: bypass runtime, never use runCommand for reads
          const instance = await runtime.getInstance(entity, id);

          if (!instance) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Entity ${entity} with ID ${id} not found or access denied.`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(instance, null, 2),
              },
            ],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);

          // Entity not found — return structured error
          if (
            message.includes("not found") ||
            message.includes("does not exist")
          ) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Entity ${entity} with ID ${id} not found.`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text" as const,
                text: `Error querying ${entity}: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ── list_entities ─────────────────────────────────────────────────
    server.registerTool(
      "list_entities",
      {
        title: "List Entities",
        description:
          "List entity instances with optional filters. Returns a paginated " +
          "list of entities matching the filter criteria. Automatically " +
          "scoped to your tenant.",
        inputSchema: z.object({
          entity: z
            .string()
            .describe(
              "Entity type name (e.g. 'PrepTask', 'Event', 'Recipe'). " +
                `Available: ${getEntityNames().join(", ")}`
            ),
          filters: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
              "Key-value filter criteria (e.g. { status: 'active' }). " +
                "Filters are applied as equality matches."
            ),
          limit: z
            .number()
            .optional()
            .describe(
              "Maximum number of results to return (default: 50, max: 200)"
            ),
          offset: z
            .number()
            .optional()
            .describe("Number of results to skip for pagination (default: 0)"),
        }),
      },
      async (args: {
        entity: string;
        filters?: Record<string, unknown>;
        limit?: number;
        offset?: number;
      }) => {
        const { entity, filters, limit, offset } = args;
        try {
          const runtime = await createMcpRuntime(identity, entity);

          // Store read: use store.getAll() via getAllInstances — NEVER runCommand
          // IR has no built-in "list" command; reads bypass the runtime.
          const allItems = await runtime.getAllInstances(entity);

          // Apply optional equality filters in memory
          let items = allItems;
          if (filters && Object.keys(filters).length > 0) {
            items = items.filter((item) =>
              Object.entries(filters).every(
                ([key, value]) =>
                  (item as Record<string, unknown>)[key] === value
              )
            );
          }

          const effectiveLimit = Math.min(limit ?? 50, 200);
          const effectiveOffset = offset ?? 0;
          const paginated = items.slice(
            effectiveOffset,
            effectiveOffset + effectiveLimit
          );

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    entity,
                    count: paginated.length,
                    total: items.length,
                    limit: effectiveLimit,
                    offset: effectiveOffset,
                    items: paginated,
                  },
                  null,
                  2
                ),
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
                text: `Error listing ${entity}: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
};
