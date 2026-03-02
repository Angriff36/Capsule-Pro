/**
 * Enhanced MCP resources for Capsule-Pro.
 *
 * Resources:
 * - `resource://manifest/index` - Lists all entities, commands, events with source links
 * - `resource://ir/index` - Lists generated IR artifacts with timestamps
 * - `resource://runtime/contracts` - Documents canonical runtime return shapes
 *
 * @packageDocumentation
 */

import { getCommandAccess } from "../lib/command-policy.js";
import {
  getCommands,
  getCommandsForEntity,
  getEntity,
  getEntityNames,
  getEvents,
  getIR,
} from "../lib/ir-loader.js";
import type { McpPlugin, PluginContext } from "../types.js";

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const resourcesPlugin: McpPlugin = {
  name: "resources",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server } = ctx;

    // ── resource://manifest/index ───────────────────────────────────────
    server.registerResource(
      "manifest-index",
      "resource://manifest/index",
      {
        description:
          "Domain manifest catalog — all entities, commands, and events " +
          "with source file links. Use this to discover the domain model structure.",
        mimeType: "application/json",
      },
      (uri: URL) => {
        const ir = getIR();
        const entityNames = getEntityNames();

        const entities = entityNames.map((name) => {
          const entity = getEntity(name);
          const commands = getCommandsForEntity(name);
          return {
            name,
            propertyCount: (entity?.properties ?? []).length,
            commandCount: commands.length,
            constraintCount: (entity?.constraints ?? []).length,
            sourceFile: `specs/kitchen/${name.toLowerCase()}.manifest`,
            irPath: "ir/kitchen/kitchen.ir.json",
          };
        });

        const commands = getCommands().map((cmd) => ({
          name: cmd.name,
          entity: cmd.entity ?? "",
          mcpAccess: getCommandAccess(cmd.entity ?? "", cmd.name),
          parameterNames: (cmd.parameters ?? []).map((p) => p.name),
          emits: cmd.emits ?? [],
        }));

        const events = getEvents().map((ev) => {
          // Find which commands emit this event
          const emittedBy = getCommands()
            .filter((c) => c.emits?.includes(ev.name))
            .map((c) => `${c.entity}.${c.name}`);
          return {
            name: ev.name,
            channel: ev.channel,
            emittedBy,
          };
        });

        const content = {
          entities,
          commands,
          events,
          provenance: ir.provenance,
        };

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(content, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      }
    );

    // ── resource://ir/index ─────────────────────────────────────────────
    server.registerResource(
      "ir-index",
      "resource://ir/index",
      {
        description:
          "IR artifacts catalog — lists all generated IR artifacts with " +
          "timestamps and hashes. Use this to verify IR is up to date.",
        mimeType: "application/json",
      },
      (uri: URL) => {
        const ir = getIR();

        const artifacts = [
          {
            path: "packages/manifest-ir/dist/routes.manifest.json",
            type: "routes",
            description: "Canonical route surface for API handlers",
          },
          {
            path: "packages/manifest-ir/ir/kitchen/kitchen.ir.json",
            type: "ir",
            description: "Full compiled IR for kitchen domain",
          },
          {
            path: "packages/manifest-ir/ir/kitchen/kitchen.provenance.json",
            type: "provenance",
            description: "IR provenance metadata (hashes, versions)",
          },
          {
            path: "packages/manifest-ir/ir/kitchen/kitchen.commands.json",
            type: "commands",
            description: "Command manifest for route audit",
          },
        ];

        const content = {
          artifacts,
          provenance: ir.provenance,
          schemaVersion: ir.version,
        };

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(content, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      }
    );

    // ── resource://runtime/contracts ────────────────────────────────────
    server.registerResource(
      "runtime-contracts",
      "resource://runtime/contracts",
      {
        description:
          "Runtime contracts documentation — canonical return shapes " +
          "used by routes and UI. Use this to understand what runtime.runCommand returns.",
        mimeType: "application/json",
      },
      (uri: URL) => {
        const content = {
          CommandResult: {
            description:
              "Result of executing a manifest command via runtime.runCommand",
            properties: {
              success: {
                type: "boolean",
                description: "Whether the command executed successfully",
              },
              result: {
                type: "object | null",
                description: "The resulting entity instance (if any)",
              },
              error: {
                type: "string | null",
                description: "Error message if command failed",
              },
              deniedBy: {
                type: "string | null",
                description: "Policy name if denied by policy",
              },
              guardFailure: {
                type: "object | null",
                description: "Guard failure details if guard blocked",
              },
              constraintOutcomes: {
                type: "ConstraintOutcome[]",
                description: "All constraint evaluation results",
              },
              correlationId: {
                type: "string | undefined",
                description: "Correlation ID for event tracing",
              },
              emittedEvents: {
                type: "EmittedEvent[]",
                description: "Events emitted by this command",
              },
            },
          },
          EmittedEvent: {
            description: "A domain event emitted by command execution",
            properties: {
              name: { type: "string", description: "Event type name" },
              channel: {
                type: "string",
                description: "Event channel for subscription",
              },
              payload: { type: "object", description: "Event payload" },
              timestamp: {
                type: "number",
                description: "Unix timestamp in milliseconds",
              },
              correlationId: {
                type: "string | undefined",
                description: "Workflow correlation ID",
              },
              causationId: {
                type: "string | undefined",
                description: "ID of triggering event/command",
              },
              provenance: {
                type: "IRProvenance | undefined",
                description: "IR provenance for traceability",
              },
            },
          },
          ConstraintOutcome: {
            description: "Result of evaluating a constraint",
            properties: {
              code: {
                type: "string",
                description: "Stable constraint identifier",
              },
              constraintName: {
                type: "string",
                description: "Human-readable constraint name",
              },
              severity: {
                type: "'ok' | 'warn' | 'block'",
                description: "Constraint severity level",
              },
              passed: {
                type: "boolean",
                description: "Whether constraint passed",
              },
              message: {
                type: "string | undefined",
                description: "Formatted message for violations",
              },
              overridden: {
                type: "boolean | undefined",
                description: "Whether constraint was overridden",
              },
              overriddenBy: {
                type: "string | undefined",
                description: "User who overrode the constraint",
              },
            },
          },
          RunCommandOptions: {
            description: "Options for runtime.runCommand",
            properties: {
              entityName: {
                type: "string",
                description: "Entity name for entity-scoped commands",
              },
              instanceId: {
                type: "string",
                description: "Instance ID for instance-scoped commands",
              },
              correlationId: {
                type: "string",
                description: "Correlation ID for event tracing",
              },
              causationId: {
                type: "string",
                description: "ID of triggering event/command",
              },
              idempotencyKey: {
                type: "string",
                description: "Key for deduplication",
              },
              deterministicMode: {
                type: "boolean",
                description: "If true, prevent side effects (dry run)",
              },
            },
          },
        };

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(content, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      }
    );
  },
};
