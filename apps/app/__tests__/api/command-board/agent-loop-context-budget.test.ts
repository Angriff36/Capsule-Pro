// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildPlanningInstructions } from "@/app/api/command-board/chat/agent-loop";
import {
  buildSimulationPlanSchema,
  loadCommandCatalog,
  resolveAliases,
} from "@/app/api/command-board/chat/manifest-command-tools";

// gpt-4o-mini (the default COMMAND_BOARD_AI_MODEL) has a 128K-token context
// window. The planning call previously embedded the full command registry as
// pretty-printed JSON (~130K tokens for 999 commands), which exceeded the
// window on its own and made every write request fail with
// "context_length_exceeded". These tests pin the prompt to a budget that
// leaves room for the system prompt, user message, and model output.
const MODEL_CONTEXT_WINDOW_TOKENS = 128_000;

function estimateTokens(text: string): number {
  // Conservative heuristic: ~4 characters per token.
  return Math.ceil(text.length / 4);
}

describe("planning prompt context budget", () => {
  it("keeps instructions + response schema under half the model context window", () => {
    const request = "create a new event with a menu";
    const catalog = loadCommandCatalog();
    const instructions = buildPlanningInstructions(
      catalog,
      request,
      resolveAliases(request)
    );
    const schemaTokens = estimateTokens(
      JSON.stringify(buildSimulationPlanSchema(catalog))
    );

    const totalTokens = estimateTokens(instructions) + schemaTokens;
    expect(totalTokens).toBeLessThan(MODEL_CONTEXT_WINDOW_TOKENS / 2);
  });

  it("still includes every command with its params and required markers", () => {
    const request = "create a new event with a menu";
    const catalog = loadCommandCatalog();
    const instructions = buildPlanningInstructions(
      catalog,
      request,
      resolveAliases(request)
    );

    // Every catalog command must appear so the model can plan any of them.
    for (const command of catalog.commands) {
      expect(instructions).toContain(
        `${command.source.entity}.${command.source.command}(`
      );
    }

    // Required params must be visible so the model fills them in (the plan
    // validator rejects steps with missing required args).
    const eventCreate = catalog.byEntityCommand.get("Event.create");
    expect(eventCreate).toBeDefined();
    for (const param of eventCreate?.params ?? []) {
      if (param.required) {
        expect(instructions).toContain(`${param.name}:${param.type}*`);
      }
    }
  });
});
