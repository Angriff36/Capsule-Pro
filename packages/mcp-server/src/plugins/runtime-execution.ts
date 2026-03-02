/**
 * Runtime execution & trace tools.
 *
 * Tools:
 * - `runtime.runCommand`: Execute a manifest command (dry-run or commit)
 * - `runtime.traceCommand`: Trace command execution phases
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { getCommandAccess } from "../lib/command-policy.js";
import { getCommand } from "../lib/ir-loader.js";
import { createMcpRuntime } from "../lib/runtime-factory.js";
import type { McpPlugin, PluginContext } from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a correlation ID for tracing. */
function generateCorrelationId(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Generate an idempotency key. */
function generateIdempotencyKey(
  entityName: string,
  commandName: string
): string {
  return `mcp-${entityName}-${commandName}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const runtimeExecutionPlugin: McpPlugin = {
  name: "runtime-execution",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server, identity } = ctx;

    // ── runtime.runCommand ──────────────────────────────────────────────
    server.registerTool(
      "runtime.runCommand",
      {
        title: "Run Command",
        description:
          "Execute a manifest command with dry-run or commit mode. " +
          "Returns domain result, emitted events, and persistence info. " +
          "Only ALLOW-tier commands can be executed.",
        inputSchema: z.object({
          entityName: z.string().describe("Entity name (e.g., 'PrepTask')"),
          commandName: z.string().describe("Command name (e.g., 'claim')"),
          instanceId: z
            .string()
            .optional()
            .describe("Entity instance ID for instance-scoped commands"),
          input: z
            .record(z.string(), z.unknown())
            .describe("Command parameters"),
          mode: z
            .enum(["dryRun", "commit"])
            .optional()
            .default("dryRun")
            .describe("Execution mode: dry-run (no persistence) or commit"),
          correlationId: z
            .string()
            .optional()
            .describe("Optional correlation ID for tracing"),
          idempotencyKey: z
            .string()
            .optional()
            .describe("Optional idempotency key for deduplication"),
        }),
      },
      async (args: {
        entityName: string;
        commandName: string;
        instanceId?: string;
        input: Record<string, unknown>;
        mode?: "dryRun" | "commit";
        correlationId?: string;
        idempotencyKey?: string;
      }) => {
        const {
          entityName,
          commandName,
          instanceId,
          input,
          mode = "dryRun",
          correlationId: providedCorrelationId,
          idempotencyKey: providedIdempotencyKey,
        } = args;

        const correlationId = providedCorrelationId ?? generateCorrelationId();

        /** Stable machine-checkable response shape. Same keys for dry-run and commit. */
        const buildResponse = (overrides: Record<string, unknown>) => ({
          status: "success" as const,
          correlationId,
          mode,
          timings: { totalMs: 0 },
          persistence: {
            txCommitted: false,
            outboxRows: [] as Array<{ eventType: string; status: string }>,
            entityRowsChanged: [] as Array<{
              entity: string;
              operation: string;
            }>,
          },
          ...overrides,
        });

        // Check command access
        const access = getCommandAccess(entityName, commandName);
        if (access === "DENY") {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  buildResponse({
                    status: "blocked",
                    error: `Command ${entityName}.${commandName} is not allowed via MCP`,
                    mcpAccess: access,
                  }),
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Verify command exists in IR
        const cmd = getCommand(entityName, commandName);
        if (!cmd) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  buildResponse({
                    status: "error",
                    error: `Command ${entityName}.${commandName} not found in IR`,
                  }),
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
        const idempotencyKey =
          providedIdempotencyKey ??
          (mode === "commit"
            ? generateIdempotencyKey(entityName, commandName)
            : undefined);

        try {
          // Create runtime for this entity.
          // For dry-run mode, use deterministicMode so no persistence occurs.
          const runtime = await createMcpRuntime(identity, entityName, {
            deterministicMode: mode === "dryRun",
          });

          // Build command options
          const options: Record<string, unknown> = {
            entityName,
            correlationId,
          };
          if (instanceId) {
            options.instanceId = instanceId;
          }
          if (idempotencyKey && mode === "commit") {
            options.idempotencyKey = idempotencyKey;
          }

          const startTime = Date.now();
          const result = await runtime.runCommand(commandName, input, options);
          const totalMs = Date.now() - startTime;

          // Stable response shape: same keys for dry-run and commit
          const response = buildResponse({
            status: result.success ? "success" : "blocked",
            timings: { totalMs },
            mode,
            domainResult: result.result,
            emittedEvents: result.emittedEvents?.map((e) => ({
              name: e.name,
              channel: e.channel,
              payload: e.payload,
              timestamp: e.timestamp,
              correlationId: e.correlationId ?? correlationId,
            })),
            constraintOutcomes: result.constraintOutcomes?.map((c) => ({
              code: c.code,
              constraintName: c.constraintName,
              severity: c.severity,
              passed: c.passed,
              message: c.message,
              overridden: c.overridden,
            })),
            persistence: {
              txCommitted: mode === "commit" && result.success,
              outboxRows:
                mode === "commit" && result.emittedEvents?.length
                  ? result.emittedEvents.map((e) => ({
                      eventType: e.name,
                      status: "pending" as const,
                      correlationId: e.correlationId ?? correlationId,
                    }))
                  : [],
              entityRowsChanged: result.success
                ? [{ entity: entityName, operation: "update" as const }]
                : [],
            },
            error: result.error,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  buildResponse({
                    status: "error",
                    error: errorMessage,
                  }),
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ── runtime.traceCommand ─────────────────────────────────────────────
    server.registerTool(
      "runtime.traceCommand",
      {
        title: "Trace Command",
        description:
          "Trace command execution phases without side effects. " +
          "Returns which phases would execute, guard/constraint decisions, " +
          "and what events would be emitted.",
        inputSchema: z.object({
          entityName: z.string().describe("Entity name (e.g., 'PrepTask')"),
          commandName: z.string().describe("Command name (e.g., 'claim')"),
          instanceId: z
            .string()
            .optional()
            .describe("Entity instance ID for instance-scoped commands"),
          input: z
            .record(z.string(), z.unknown())
            .describe("Command parameters"),
        }),
      },
      async (args: {
        entityName: string;
        commandName: string;
        instanceId?: string;
        input: Record<string, unknown>;
      }) => {
        const { entityName, commandName, instanceId, input } = args;

        // Verify command exists in IR
        const cmd = getCommand(entityName, commandName);
        if (!cmd) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: `Command ${entityName}.${commandName} not found in IR`,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        try {
          // Create runtime for this entity
          const runtime = await createMcpRuntime(identity, entityName);

          // Build command options with deterministic mode (no side effects)
          const options: Record<string, unknown> = {
            entityName,
            deterministicMode: true,
          };
          if (instanceId) {
            options.instanceId = instanceId;
          }

          const result = await runtime.runCommand(commandName, input, options);

          // Real phase data from execution (not inferred from IR)
          const phasesExecuted: string[] = [];
          const decisions: Array<{
            phase: string;
            name: string;
            result: boolean;
            reason?: string;
          }> = [];

          // Policy phase
          if (cmd.policies?.length) {
            phasesExecuted.push("policy");
            const policyPassed = !result.policyDenial;
            decisions.push({
              phase: "policy",
              name: "policy-check",
              result: policyPassed,
              reason: result.policyDenial
                ? (result.policyDenial.message ?? result.policyDenial.formatted)
                : "Passed",
            });
          }

          // Guards phase
          if (cmd.guards?.length) {
            phasesExecuted.push("guards");
            const guardsPassed = !result.guardFailure;
            decisions.push({
              phase: "guards",
              name: "guards-check",
              result: guardsPassed,
              reason: result.guardFailure
                ? result.guardFailure.formatted
                : "Passed",
            });
          }

          // Constraints phase
          if (cmd.constraints?.length && result.constraintOutcomes?.length) {
            phasesExecuted.push("constraints");
            for (const outcome of result.constraintOutcomes) {
              decisions.push({
                phase: "constraints",
                name: outcome.constraintName,
                result: outcome.passed,
                reason: outcome.message,
              });
            }
          }

          // Actions phase
          if (result.success) {
            phasesExecuted.push("actions");
          }

          // Emits phase
          if (result.emittedEvents?.length) {
            phasesExecuted.push("emits");
          }

          const response = {
            phasesExecuted,
            decisions,
            shortCircuitReason: (() => {
              if (result.success) return undefined;
              if (result.policyDenial)
                return `policy: ${result.policyDenial.policyName}`;
              if (result.guardFailure)
                return `guard: ${result.guardFailure.formatted}`;
              const blocking = result.constraintOutcomes?.find(
                (c) => !c.passed
              );
              if (blocking) return `constraint: ${blocking.constraintName}`;
              return result.error;
            })(),
            wouldEmit:
              result.emittedEvents?.map((e) => ({
                name: e.name,
                channel: e.channel,
              })) ?? [],
            wouldPersist: result.success
              ? [
                  {
                    type: "entity",
                    entity: entityName,
                    operation: instanceId ? "update" : "create",
                  },
                  ...(result.emittedEvents?.map((e) => ({
                    type: "outbox",
                    eventType: e.name,
                  })) ?? []),
                ]
              : [],
          };

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: errorMessage,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
};
