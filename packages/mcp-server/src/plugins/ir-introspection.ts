/**
 * IR introspection — tenant-facing tools.
 *
 * Heavy formatting delegates to upstream @angriff36/manifest explain tooling.
 * Policies are admin-only (see ir-admin plugin).
 */

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
  version: "2.0.0",

  register(ctx: PluginContext) {
    const { server } = ctx;

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
        let entities = ir.entities ?? [];
        if (entityFilter?.length) {
          entities = entities.filter((entity) =>
            entityFilter.includes(entity.name)
          );
        }

        const result = {
          irSources: listIrSources(),
          schemaVersion: ir.version,
          entityCount: ir.entities?.length ?? 0,
          commandCount: ir.commands?.length ?? 0,
          eventCount: ir.events?.length ?? 0,
          entities: entities.map((entity) => ({
            name: entity.name,
            propertyCount: (entity.properties ?? []).length,
            commands: getCommandsForEntity(entity.name).map((command) => ({
              name: command.name,
              mcpAccess: getCommandAccess(entity.name, command.name),
            })),
            constraintCount: (entity.constraints ?? []).length,
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

    server.registerTool(
      "explain_entity",
      {
        title: "Explain Entity",
        description:
          "Human-readable entity definition via official @angriff36/manifest explain tooling.",
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

        const explanation = await explainManifestTarget(getIR(), {
          target: "entity",
          name: args.entity,
        });

        return {
          content: [{ type: "text" as const, text: explanation }],
        };
      }
    );

    server.registerTool(
      "explain_command",
      {
        title: "Explain Command",
        description:
          "Human-readable command definition via official @angriff36/manifest explain tooling.",
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

        const explanation = await explainManifestTarget(getIR(), {
          target: "command",
          name: args.command,
          entityName: args.entity,
        });

        const access = getCommandAccess(args.entity, args.command);

        return {
          content: [
            {
              type: "text" as const,
              text: `${explanation}\n\nMCP access: ${access}`,
            },
          ],
        };
      }
    );

    server.registerResource(
      "ir-entities",
      "ir://entities",
      {
        description: "Entity catalog from merged manifest/ir/*.ir.json",
        mimeType: "application/json",
      },
      (uri: URL) => {
        const entities = getEntityNames().map((name) => {
          const entity = getEntity(name);
          return {
            name,
            propertyCount: (entity?.properties ?? []).length,
            commandCount: getCommandsForEntity(name).length,
            constraintCount: (entity?.constraints ?? []).length,
          };
        });

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ irSources: listIrSources(), entities }, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      }
    );
  },
};

/** @deprecated Use upstream explain tooling — kept for existing tests only. */
export function expressionToString(expr: unknown): string {
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
    return `${expressionToString(node.left)} ${String(node.operator)} ${expressionToString(node.right)}`;
  }
  if (node.kind === "member") {
    return `${expressionToString(node.object)}.${String(node.property)}`;
  }
  return JSON.stringify(expr);
}
