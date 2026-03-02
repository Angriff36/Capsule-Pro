/**
 * MCP Prompts for Capsule-Pro.
 *
 * Prompts chain tools into repeatable workflows:
 * - `prove_semantic_event_end_to_end`: Prove command emits correct event
 * - `trace_ui_click_to_outbox`: Trace UI action to outbox persistence
 * - `explain_422_with_ir`: Explain 422 error using IR context
 *
 * @packageDocumentation
 */

import { z } from "zod";
import type { McpPlugin, PluginContext } from "../types.js";

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const promptsPlugin: McpPlugin = {
  name: "prompts",
  version: "1.0.0",

  register(ctx: PluginContext) {
    const { server } = ctx;

    // ── prove_semantic_event_end_to_end ─────────────────────────────────
    server.registerPrompt(
      "prove_semantic_event_end_to_end",
      {
        title: "Prove Semantic Event End-to-End",
        description:
          "Proves that a command emits the correct semantic event with full " +
          "traceability. Chains: inspect_command → runtime.runCommand(dryRun) → " +
          "verify events match declaration → outbox.find(correlationId).",
        argsSchema: {
          entityName: z.string().describe("Entity name (e.g., 'PrepTask')"),
          commandName: z.string().describe("Command name (e.g., 'claim')"),
          inputJson: z
            .string()
            .describe("JSON string of command input parameters"),
        },
      },
      (args: {
        entityName: string;
        commandName: string;
        inputJson: string;
      }) => {
        const { entityName, commandName, inputJson } = args;

        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Prove that ${entityName}.${commandName} emits the correct semantic event end-to-end.

**Workflow:**
1. Call \`inspect_command\` with entityName="${entityName}" and commandName="${commandName}" to understand the command and its declared events.
2. Call \`runtime.runCommand\` with mode="dryRun", entityName="${entityName}", commandName="${commandName}", and input=${inputJson}.
3. Verify that the \`emittedEvents\` in the response match the \`emits\` declarations from step 1.
4. If there's a correlationId in the response, call \`outbox.find\` with that correlationId to verify persistence.
5. Generate a proof report including:
   - Command metadata (name, entity, parameters)
   - Declared events vs actual emitted events
   - Constraint outcomes
   - CorrelationId and traceability info
   - Whether the proof succeeded

**Input parameters:** ${inputJson}`,
              },
            },
          ],
        };
      }
    );

    // ── trace_ui_click_to_outbox ────────────────────────────────────────
    server.registerPrompt(
      "trace_ui_click_to_outbox",
      {
        title: "Trace UI Click to Outbox",
        description:
          "Traces a UI action through the stack to outbox persistence. " +
          "Chains: ui.traceAction → next.route.resolve → inspect_command → " +
          "runtime.runCommand → outbox.find.",
        argsSchema: {
          actionId: z
            .string()
            .describe("Action identifier (e.g., 'PrepTask.claim')"),
        },
      },
      (args: { actionId: string }) => {
        const { actionId } = args;

        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Trace the UI action "${actionId}" from click to outbox persistence.

**Workflow:**
1. Parse the actionId "${actionId}" to extract entityName and commandName.
2. Call \`inspect_command\` with the parsed entityName and commandName to get command details.
3. Identify the UI component that triggers this action (search for the actionId in the codebase).
4. Find the API route that handles this action.
5. Describe the full trace:
   - UI component file
   - API route handler
   - Command invoked
   - Events emitted
   - Outbox entries created

**Note:** If you need to test the actual flow, use \`runtime.runCommand\` with appropriate input.

**Action ID:** ${actionId}`,
              },
            },
          ],
        };
      }
    );

    // ── explain_422_with_ir ─────────────────────────────────────────────
    server.registerPrompt(
      "explain_422_with_ir",
      {
        title: "Explain 422 with IR",
        description:
          "Explains a 422 error using IR context. Chains: route resolution → " +
          "command inspection → constraint/guard matching → fix suggestions.",
        argsSchema: {
          url: z.string().describe("The API URL that returned 422"),
          responseBodyJson: z
            .string()
            .describe("JSON string of the 422 response body"),
        },
      },
      (args: { url: string; responseBodyJson: string }) => {
        const { url, responseBodyJson } = args;

        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Explain this 422 error using the IR context.

**URL:** ${url}
**Response:** ${responseBodyJson}

**Workflow:**
1. Parse the URL to identify the entity and command (e.g., /api/prep-tasks/123/claim → PrepTask.claim).
2. Call \`inspect_command\` with the identified entityName and commandName.
3. Compare the response body error codes/fields with:
   - Command constraints (look for matching constraint codes)
   - Command guards (check if guard conditions failed)
   - Entity constraints (check entity-level validation)
4. For each matching constraint/guard:
   - Show the expression that failed
   - Explain why it failed in plain language
   - Suggest what input would make it pass
5. Generate a comprehensive explanation with:
   - Which constraint(s) failed
   - The exact condition that wasn't met
   - How to fix the input to pass validation`,
              },
            },
          ],
        };
      }
    );

    // ── verify_command_permission ────────────────────────────────────────
    server.registerPrompt(
      "verify_command_permission",
      {
        title: "Verify Command Permission",
        description:
          "Verifies if a command can be executed via MCP and explains the access policy.",
        argsSchema: {
          entityName: z.string().describe("Entity name (e.g., 'PrepTask')"),
          commandName: z.string().describe("Command name (e.g., 'claim')"),
        },
      },
      (args: { entityName: string; commandName: string }) => {
        const { entityName, commandName } = args;

        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Verify if ${entityName}.${commandName} can be executed via MCP.

**Workflow:**
1. Call \`inspect_command\` with entityName="${entityName}" and commandName="${commandName}".
2. Check the \`mcpAccess\` field in the response:
   - ALLOW: Command can be executed immediately
   - CONFIRM: Command requires confirmation (destructive operation)
   - DENY: Command is not available via MCP
3. If ALLOW, describe what the command does and when to use it.
4. If CONFIRM, explain why confirmation is needed and the risks.
5. If DENY, explain why it's blocked and suggest alternatives if any.

**Entity:** ${entityName}
**Command:** ${commandName}`,
              },
            },
          ],
        };
      }
    );
  },
};
