/**
 * IR introspection tools and resources — Phase 1.
 *
 * Tools:
 * - `query_ir_summary`: Query IR for entities, commands, constraints (excludes policies)
 * - `inspect_command`: Get detailed command info (params, guards, constraints)
 *
 * Resources:
 * - `ir://entities`: Full entity catalog
 *
 * Policy expressions are EXCLUDED from the tenant-facing server.
 * Admin-only tools (Phase 4+) will expose full IR including policies.
 *
 * @packageDocumentation
 */

import type { IRCommand, IREntity, IRExpression } from "@angriff36/manifest/ir";
import { z } from "zod";
import { getAllowedCommands, getCommandAccess } from "../lib/command-policy.js";
import {
  getCommand,
  getCommands,
  getCommandsForEntity,
  getEntity,
  getEntityNames,
  getEvents,
  getIR,
  getPolicies,
} from "../lib/ir-loader.js";
import type {
  IrCommandSummary,
  IrEntitySummary,
  McpPlugin,
  PluginContext,
} from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stringify an IR expression for display (not for execution). */
function expressionToString(expr: IRExpression): string {
  if (!expr) {
    return "";
  }
  if (typeof expr === "string") {
    return expr;
  }
  if ("kind" in expr) {
    switch (expr.kind) {
      case "literal":
        return String((expr as { value: unknown }).value ?? "");
      case "identifier":
        return (expr as { name: string }).name ?? "";
      case "binary":
        return `${expressionToString((expr as { left: IRExpression }).left)} ${(expr as { operator: string }).operator} ${expressionToString((expr as { right: IRExpression }).right)}`;
      case "member":
        return `${expressionToString((expr as { object: IRExpression }).object)}.${(expr as { property: string }).property}`;
      default:
        return JSON.stringify(expr);
    }
  }
  return JSON.stringify(expr);
}

function summarizeEntity(entity: IREntity | undefined): IrEntitySummary | null {
  if (!entity) {
    return null;
  }

  const commands = getCommandsForEntity(entity.name);

  return {
    name: entity.name,
    properties: (entity.properties ?? []).map((p) => ({
      name: p.name,
      type: p.type?.name ?? "unknown",
      required: (p.modifiers ?? []).includes("required"),
      nullable: p.type?.nullable ?? false,
    })),
    computedProperties: (entity.computedProperties ?? []).map((c) => c.name),
    commands: commands.map((c) => c.name),
    constraints: (entity.constraints ?? []).map((c) => ({
      name: c.name ?? "",
      severity: c.severity ?? "block",
      message: c.message ?? "",
    })),
  };
}

function summarizeCommand(cmd: IRCommand | undefined): IrCommandSummary | null {
  if (!cmd) {
    return null;
  }

  return {
    name: cmd.name,
    entity: cmd.entity ?? "",
    parameters: (cmd.parameters ?? []).map((p) => ({
      name: p.name,
      type: p.type?.name ?? "unknown",
      required: p.required ?? false,
    })),
    guards: (cmd.guards ?? []).map((g) => ({
      expression: expressionToString(g),
      message: "", // Guards in IR are expressions, not objects with messages
    })),
    constraints: (cmd.constraints ?? []).map((c) => ({
      name: c.name ?? "",
      severity: c.severity ?? "block",
      message: c.message ?? "",
    })),
    emits: cmd.emits ?? [],
  };
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const irIntrospectionPlugin: McpPlugin = {
  name: "ir-introspection",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server } = ctx;

    // ── query_ir_summary ──────────────────────────────────────────────
    server.registerTool(
      "query_ir_summary",
      {
        title: "Query IR Summary",
        description:
          "Query the Manifest IR for entities, commands, and constraints. " +
          "Use this to understand the domain model — what entities exist, " +
          "what commands are available, and what constraints are enforced. " +
          "Policies are excluded from this view.",
        inputSchema: z.object({
          filter: z
            .object({
              entities: z
                .array(z.string())
                .optional()
                .describe("Filter to specific entity names"),
            })
            .optional()
            .describe("Optional filters to narrow the IR view"),
          include: z
            .array(
              z.enum([
                "properties",
                "constraints",
                "guards",
                "events",
                "commands",
              ])
            )
            .optional()
            .describe(
              "What to include in the response (default: all except policies)"
            ),
          format: z
            .enum(["summary", "full"])
            .optional()
            .describe(
              "Response format: 'summary' (names only) or 'full' (with details)"
            ),
        }),
      },
      (args: {
        filter?: { entities?: string[] };
        include?: Array<
          "properties" | "constraints" | "guards" | "events" | "commands"
        >;
        format?: "summary" | "full";
      }) => {
        const { filter, include, format } = args;
        const ir = getIR();
        const entityFilter = filter?.entities;
        const isSummary = format === "summary" || !format;
        const includeSet = new Set(
          include ?? [
            "properties",
            "constraints",
            "guards",
            "events",
            "commands",
          ]
        );

        // Filter entities
        let entities = ir.entities ?? [];
        if (entityFilter?.length) {
          entities = entities.filter((e) => entityFilter.includes(e.name));
        }

        // Build response
        const result: Record<string, unknown> = {
          schemaVersion: ir.version,
          entityCount: (ir.entities ?? []).length,
          commandCount: (ir.commands ?? []).length,
          eventCount: (ir.events ?? []).length,
        };

        if (isSummary) {
          result.entities = entities.map((e) => {
            const summary: Record<string, unknown> = { name: e.name };
            if (includeSet.has("properties")) {
              summary.propertyCount = (e.properties ?? []).length;
            }
            if (includeSet.has("commands")) {
              summary.commands = getCommandsForEntity(e.name).map((c) => ({
                name: c.name,
                mcpAccess: getCommandAccess(e.name, c.name),
              }));
            }
            if (includeSet.has("constraints")) {
              summary.constraintCount = (e.constraints ?? []).length;
            }
            return summary;
          });
        } else {
          result.entities = entities.map((e) => summarizeEntity(e));
          // Flat commands list: name, entity, parameter names, emits
          if (includeSet.has("commands")) {
            const allCommands = getCommands();
            result.commands = allCommands
              .filter(
                (c) =>
                  !entityFilter?.length || entityFilter.includes(c.entity ?? "")
              )
              .map((c) => ({
                name: c.name,
                entity: c.entity ?? "",
                parameterNames: (c.parameters ?? []).map((p) => p.name),
                emits: c.emits ?? [],
              }));
          }
        }

        // Events: name, channel (always in summary format per spec)
        if (includeSet.has("events")) {
          result.events = getEvents().map((ev) => ({
            name: ev.name,
            channel: ev.channel,
          }));
        }

        // Policies: name, action, entity (if set) — excluded from tenant view by default
        const policies = getPolicies();
        if (policies.length > 0) {
          result.policies = policies.map((p) => ({
            name: (p as { name?: string }).name,
            action: (p as { action?: string }).action,
            entity: (p as { entity?: string }).entity,
          }));
        }

        // Include MCP command access info
        result.mcpAllowedCommands = getAllowedCommands();

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

    // ── inspect_command ───────────────────────────────────────────────
    server.registerTool(
      "inspect_command",
      {
        title: "Inspect Command",
        description:
          "Get detailed information about a specific manifest command, " +
          "including parameters, guards, constraints, and emitted events. " +
          "Policy expressions are excluded. Use this to understand what a " +
          "command does before executing it.",
        inputSchema: z.object({
          entity: z
            .string()
            .describe(
              "Entity name (e.g. 'PrepTask'). " +
                `Available: ${getEntityNames().join(", ")}`
            ),
          command: z.string().describe("Command name (e.g. 'claim', 'create')"),
        }),
      },
      (args: { entity: string; command: string }) => {
        const { entity, command } = args;
        const cmd = getCommand(entity, command);

        if (!cmd) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `Command ${entity}.${command} not found in IR. ` +
                  `Available commands for ${entity}: ${
                    getCommandsForEntity(entity)
                      .map((c) => c.name)
                      .join(", ") || "none"
                  }`,
              },
            ],
            isError: true,
          };
        }

        const summary = summarizeCommand(cmd);
        const access = getCommandAccess(entity, command);

        let accessDescription: string;
        if (access === "ALLOW") {
          accessDescription =
            "This command can be executed immediately via execute_command.";
        } else if (access === "CONFIRM") {
          accessDescription =
            "This command requires confirmation before execution (destructive operation).";
        } else {
          accessDescription =
            "This command is not available via MCP (not in allowlist).";
        }

        const response = {
          ...summary,
          mcpAccess: access,
          mcpAccessDescription: accessDescription,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }
    );

    // ── IR Resources ──────────────────────────────────────────────────

    // Entity catalog resource
    server.registerResource(
      "ir-entities",
      "ir://entities",
      {
        description:
          "Domain entity catalog — all entities with property counts, " +
          "command counts, and constraint counts. Use this to discover " +
          "what entities are available in the system.",
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
              text: JSON.stringify(entities, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      }
    );
  },
};
