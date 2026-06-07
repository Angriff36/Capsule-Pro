/**
 * IR introspection — tenant-facing tools.
 *
 * Uses @angriff36/manifest/agent-sdk for structured introspection, with
 * upstream explain tooling retained for human-readable prose output.
 * Policies are admin-only (see ir-admin plugin).
 */

import {
  describeCommand,
  describeEntity,
  findMatchingCommands,
  listEntities,
} from "../lib/agent-sdk.js";
import type { EntitySummary } from "@angriff36/manifest/agent-sdk";
import { z } from "zod";
import { getAllowedCommands, getCommandAccess } from "../lib/command-policy.js";
import {
  getCommand,
  getCommandsForEntity,
  getEntity,
  getEntityNames,
  getEvents,
  getIR,
  listIrSources,
} from "../lib/ir-loader.js";
import { explainManifestTarget } from "../lib/upstream-manifest-mcp.js";
import type { McpPlugin, PluginContext } from "../types.js";

export const irIntrospectionPlugin: McpPlugin = {
  name: "ir-introspection",
  version: "3.0.0",

  register(ctx: PluginContext) {
    const { server } = ctx;

    // -----------------------------------------------------------------------
    // query_ir_summary (ENHANCED) — agent-sdk listEntities() enrichment
    // -----------------------------------------------------------------------
    server.registerTool(
      "query_ir_summary",
      {
        title: "Query IR Summary",
        description:
          "Summarize merged manifest IR: entities, commands, events. " +
          "Use explain_entity / explain_command for full detail.",
        inputSchema: z.object({
          filter: z
            .object({
              entities: z.array(z.string()).optional(),
            })
            .optional(),
        }),
      },
      (args: { filter?: { entities?: string[] } }) => {
        const ir = getIR();
        const entityFilter = args.filter?.entities;

        // Agent-sdk provides richer summaries (module, computed props, relationships)
        const allSummaries = listEntities(ir);
        const summaries: EntitySummary[] = entityFilter?.length
          ? allSummaries.filter((s) => entityFilter.includes(s.name))
          : allSummaries;

        const result = {
          irSources: listIrSources(),
          schemaVersion: ir.version,
          entityCount: ir.entities?.length ?? 0,
          commandCount: ir.commands?.length ?? 0,
          eventCount: ir.events?.length ?? 0,
          entities: summaries.map((summary) => ({
            name: summary.name,
            module: summary.module,
            propertyCount: summary.propertyCount,
            computedPropertyCount: summary.computedPropertyCount,
            relationshipCount: summary.relationshipCount,
            commandCount: summary.commandCount,
            constraintCount: summary.constraintCount,
            commands: getCommandsForEntity(summary.name).map((command) => ({
              name: command.name,
              mcpAccess: getCommandAccess(summary.name, command.name),
            })),
          })),
          events: getEvents().map((event) => ({
            name: event.name,
            channel: event.channel,
          })),
          mcpAllowedCommands: getAllowedCommands(),
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    // -----------------------------------------------------------------------
    // explain_entity (ENHANCED) — agent-sdk describeEntity() enrichment
    // -----------------------------------------------------------------------
    server.registerTool(
      "explain_entity",
      {
        title: "Explain Entity",
        description:
          "Rich entity definition with structured properties, relationships, " +
          "constraints, and policies from agent-sdk, plus human-readable prose " +
          "from upstream explain tooling.",
        inputSchema: z.object({
          entity: z
            .string()
            .describe(`Entity name. Available: ${getEntityNames().join(", ")}`),
        }),
      },
      async (args: { entity: string }) => {
        if (!getEntity(args.entity)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Entity ${args.entity} not found in merged IR.`,
              },
            ],
            isError: true,
          };
        }

        const ir = getIR();

        // Agent-sdk structured details (properties with types, relationships, constraints)
        const details = describeEntity(ir, args.entity);

        // Upstream human-readable prose explanation
        const explanation = await explainManifestTarget(ir, {
          target: "entity",
          name: args.entity,
        });

        const result = {
          explanation,
          structured: details,
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    // -----------------------------------------------------------------------
    // explain_command (ENHANCED) — agent-sdk describeCommand() enrichment
    // -----------------------------------------------------------------------
    server.registerTool(
      "explain_command",
      {
        title: "Explain Command",
        description:
          "Rich command definition with typed parameters, guards, constraints, " +
          "and emitted events from agent-sdk, plus human-readable prose " +
          "from upstream explain tooling.",
        inputSchema: z.object({
          entity: z.string(),
          command: z.string(),
        }),
      },
      async (args: { entity: string; command: string }) => {
        const cmd = getCommand(args.entity, args.command);
        if (!cmd) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `Command ${args.entity}.${args.command} not found. ` +
                  `Available: ${
                    getCommandsForEntity(args.entity)
                      .map((command) => command.name)
                      .join(", ") || "none"
                  }`,
              },
            ],
            isError: true,
          };
        }

        const ir = getIR();
        const access = getCommandAccess(args.entity, args.command);

        // Agent-sdk structured details (typed params, guards, constraints, emits)
        const details = describeCommand(ir, args.command, {
          includeGuardExpressions: true,
          includeActionExpressions: true,
        });

        // Upstream human-readable prose explanation
        const explanation = await explainManifestTarget(ir, {
          target: "command",
          name: args.command,
          entityName: args.entity,
        });

        const result = {
          explanation,
          mcpAccess: access,
          structured: details,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    // -----------------------------------------------------------------------
    // find_commands (NEW) — natural language command discovery
    // -----------------------------------------------------------------------
    server.registerTool(
      "find_commands",
      {
        title: "Find Commands",
        description:
          "Find manifest commands matching a natural language intent. " +
          "Returns scored matches with entity/command names and matched tokens. " +
          "Examples: 'cancel an order', 'complete a task', 'create a new lead'.",
        inputSchema: z.object({
          intent: z
            .string()
            .describe(
              "Natural language description of what you want to do. " +
                "Examples: 'cancel order', 'mark task complete', 'approve request'"
            ),
          minScore: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe("Minimum match score (0-1). Default: 0.1"),
        }),
      },
      (args: { intent: string; minScore?: number }) => {
        const ir = getIR();

        const matches = findMatchingCommands(ir, args.intent, {
          minScore: args.minScore ?? 0.1,
        });

        // Enrich matches with MCP access level
        const result = matches.map((match) => ({
          ...match,
          mcpAccess: match.entity
            ? getCommandAccess(match.entity, match.command)
            : "DENY",
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    // -----------------------------------------------------------------------
    // ir-entities resource (unchanged)
    // -----------------------------------------------------------------------
    server.registerResource(
      "ir-entities",
      "ir://entities",
      {
        description: "Entity catalog from merged manifest/ir/*.ir.json",
        mimeType: "application/json",
      },
      (uri: URL) => {
        const ir = getIR();
        const summaries = listEntities(ir);

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(
                { irSources: listIrSources(), entities: summaries },
                null,
                2
              ),
              mimeType: "application/json",
            },
          ],
        };
      }
    );
  },
};

/** Internal (non-deprecated) implementation. */
function _expressionToString(expr: unknown): string {
  if (!expr || typeof expr !== "object") {
    return JSON.stringify(expr);
  }
  const node = expr as Record<string, unknown>;
  if (node.kind === "literal") {
    const value = node.value;
    if (value && typeof value === "object" && "kind" in value) {
      const literal = value as { kind?: string; value?: unknown };
      if (literal.kind === "null") return "null";
      if (literal.kind === "string") return `"${String(literal.value ?? "")}"`;
      if (literal.kind === "number" || literal.kind === "boolean") {
        return String(literal.value ?? "");
      }
    }
    return String(value ?? "");
  }
  if (node.kind === "identifier") {
    return String(node.name ?? "");
  }
  if (node.kind === "binary") {
    return `${_expressionToString(node.left)} ${String(node.operator)} ${_expressionToString(node.right)}`;
  }
  if (node.kind === "member") {
    return `${_expressionToString(node.object)}.${String(node.property)}`;
  }
  return JSON.stringify(expr);
}

/** @deprecated Use upstream explain tooling — kept for existing tests only. */
export const expressionToString = _expressionToString;
