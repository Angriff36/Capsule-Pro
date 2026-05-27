/**
 * Admin-only IR introspection — exposes policies excluded from tenant MCP.
 */

import { z } from "zod";
import {
  getCommand,
  getCommandsForEntity,
  getEntityNames,
  getIR,
  getPolicies,
  listIrSources,
} from "../lib/ir-loader.js";
import { explainManifestTarget } from "../lib/upstream-manifest-mcp.js";
import type { McpPlugin, PluginContext } from "../types.js";

export const irAdminPlugin: McpPlugin = {
  name: "ir-admin",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server } = ctx;

    server.registerTool(
      "list_policies",
      {
        title: "List Manifest Policies",
        description:
          "Admin-only: list all policy definitions from merged manifest IR.",
        inputSchema: z.object({}),
      },
      () => {
        const policies = getPolicies().map((policy) => ({
          name: (policy as { name?: string }).name,
          action: (policy as { action?: string }).action,
          entity: (policy as { entity?: string }).entity,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  irSources: listIrSources(),
                  policyCount: policies.length,
                  policies,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    server.registerTool(
      "explain_policy",
      {
        title: "Explain Manifest Policy",
        description:
          "Admin-only: human-readable explanation of a policy using upstream manifest-mcp.",
        inputSchema: z.object({
          name: z.string().describe("Policy name"),
        }),
      },
      async (args: { name: string }) => {
        const ir = getIR();
        try {
          const explanation = await explainManifestTarget(ir, {
            target: "policy",
            name: args.name,
          });
          return {
            content: [{ type: "text" as const, text: explanation }],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: `Policy ${args.name} not found or could not be explained: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    server.registerTool(
      "admin_ir_overview",
      {
        title: "Admin IR Overview",
        description:
          "Admin-only: entity/command/policy counts across all merged IR sources.",
        inputSchema: z.object({}),
      },
      () => {
        const ir = getIR();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  irSources: listIrSources(),
                  schemaVersion: ir.version,
                  entityCount: ir.entities?.length ?? 0,
                  commandCount: ir.commands?.length ?? 0,
                  eventCount: ir.events?.length ?? 0,
                  policyCount: ir.policies?.length ?? 0,
                  entities: getEntityNames(),
                  sampleCommands: getCommandsForEntity(
                    getEntityNames()[0] ?? ""
                  ).map((command) => command.name),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    server.registerTool(
      "admin_inspect_command",
      {
        title: "Admin Inspect Command (full IR)",
        description:
          "Admin-only: full command explanation including guards and policies context.",
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
                text: `Command ${args.entity}.${args.command} not found.`,
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

        return {
          content: [{ type: "text" as const, text: explanation }],
        };
      }
    );
  },
};
