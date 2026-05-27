/**
 * Governed command execution against the real Capsule manifest runtime (Neon).
 *
 * Uses @angriff36/manifest RuntimeEngine via @repo/manifest-runtime — not the
 * in-memory engine from the upstream manifest-mcp `execute` tool.
 */

import { z } from "zod";
import {
  getCommandAccess,
  isCommandAvailable,
} from "../lib/command-policy.js";
import { createMcpRuntime } from "../lib/runtime-factory.js";
import type { McpPlugin, PluginContext } from "../types.js";

export const runCommandPlugin: McpPlugin = {
  name: "run-command",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server, identity } = ctx;

    server.registerTool(
      "run_command",
      {
        title: "Run Manifest Command",
        description:
          "Execute a manifest command through the governed Capsule runtime " +
          "(Prisma/Neon). Respects MCP command policy: ALLOW runs immediately, " +
          "CONFIRM requires confirm=true, DENY is rejected.",
        inputSchema: z.object({
          entity: z.string().describe("Entity name (e.g. PrepTask, Event)"),
          command: z.string().describe("Command name (e.g. claim, create)"),
          input: z
            .record(z.string(), z.unknown())
            .optional()
            .describe("Command payload"),
          instanceId: z
            .string()
            .optional()
            .describe("Target instance ID for update/mutate commands"),
          confirm: z
            .boolean()
            .optional()
            .describe("Required true for CONFIRM-tier destructive commands"),
        }),
      },
      async (args: {
        entity: string;
        command: string;
        input?: Record<string, unknown>;
        instanceId?: string;
        confirm?: boolean;
      }) => {
        const { entity, command, input = {}, instanceId, confirm } = args;
        const access = getCommandAccess(entity, command);

        if (access === "DENY" || !isCommandAvailable(entity, command)) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `Command ${entity}.${command} is not available via MCP ` +
                  `(policy: DENY). Add to packages/mcp-server/src/lib/command-policy.ts ` +
                  `via PR review to enable.`,
              },
            ],
            isError: true,
          };
        }

        if (access === "CONFIRM" && !confirm) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    status: "confirmation_required",
                    entity,
                    command,
                    access,
                    message:
                      "Re-invoke with confirm=true to execute this destructive command.",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        try {
          const runtime = await createMcpRuntime(identity, entity);
          const resolvedInstanceId =
            instanceId ??
            (command !== "create" && typeof input.id === "string"
              ? input.id
              : undefined);

          const result = await runtime.runCommand(command, input, {
            entityName: entity,
            ...(resolvedInstanceId ? { instanceId: resolvedInstanceId } : {}),
          });

          if (!result.success) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      success: false,
                      policyDenial: result.policyDenial,
                      guardFailure: result.guardFailure,
                      error: result.error,
                    },
                    null,
                    2
                  ),
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    success: true,
                    result: result.result,
                    events: result.emittedEvents,
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
                text: `run_command failed for ${entity}.${command}: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
};
