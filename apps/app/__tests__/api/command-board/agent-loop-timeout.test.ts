import { describe, expect, it, vi } from "vitest";

// Mock dependencies before importing
vi.mock("@repo/observability/log", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock the manifest command tools dependency
vi.mock("../../../app/api/command-board/chat/manifest-command-tools", () => ({
  buildSimulationPlanSchema: vi.fn(() => ({})),
  loadCommandCatalog: vi.fn(() => ({
    commands: [],
    byEntityCommand: new Map(),
    canonicalEntityCommandPairs: [],
    canonicalEntityCommandByNormalizedKey: new Map(),
    canonicalEntityCommandByLooseNormalizedKey: new Map(),
    toolNameByEntityCommand: new Map(),
    toolToEntityCommand: new Map(),
    toolDefinitions: [],
    generatedAt: null,
  })),
  resolveAliases: vi.fn(() => []),
  resolveCanonicalEntityCommandPairFromPair: vi.fn(),
}));

describe("agent-loop module exports", () => {
  it("exports all expected public functions", async () => {
    const mod = await import("../../../app/api/command-board/chat/agent-loop");

    expect(typeof mod.normalizeStructuredAgentResponse).toBe("function");
    expect(typeof mod.isBoardStateReadIntent).toBe("function");
    expect(typeof mod.detectQueryIntent).toBe("function");
    expect(typeof mod.parseSimulationPlan).toBe("function");
    expect(typeof mod.buildFallbackSimulationPlan).toBe("function");
    expect(typeof mod.isMissingRequiredArgValue).toBe("function");
    expect(typeof mod.runManifestActionAgent).toBe("function");
    expect(typeof mod.runManifestActionAgentSafe).toBe("function");
  });
});

describe("normalizeStructuredAgentResponse", () => {
  it("parses valid JSON model text into structured response", async () => {
    const { normalizeStructuredAgentResponse } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    const jsonText = JSON.stringify({
      summary: "Created event successfully",
      actionsTaken: ["Event.create executed"],
      errors: [],
      nextSteps: ["Review the event details"],
    });

    const result = normalizeStructuredAgentResponse(jsonText, []);
    expect(result.summary).toBe("Created event successfully");
    expect(result.actionsTaken).toEqual(["Event.create executed"]);
    expect(result.errors).toEqual([]);
    expect(result.nextSteps).toEqual(["Review the event details"]);
  });

  it("falls back to tool execution summaries when model text is unparseable", async () => {
    const { normalizeStructuredAgentResponse } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    const result = normalizeStructuredAgentResponse("unparseable text", [
      { toolName: "Event.create", status: "success", summary: "Created event" },
      { toolName: "User.create", status: "error", summary: "Missing email" },
    ]);

    expect(result.actionsTaken).toEqual(["Created event"]);
    expect(result.errors).toEqual(["Missing email"]);
  });

  it("returns structured error envelope from tool execution errors", async () => {
    const { normalizeStructuredAgentResponse } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    const result = normalizeStructuredAgentResponse("", [
      {
        toolName: "test",
        status: "error",
        summary:
          "The operation timed out or encountered a transient error. Please try again.",
      },
    ]);

    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("actionsTaken");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("nextSteps");
    expect(Array.isArray(result.actionsTaken)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.nextSteps)).toBe(true);
  });

  it("extracts JSON from markdown-fenced code blocks", async () => {
    const { normalizeStructuredAgentResponse } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    const fenced =
      "```json\n" +
      JSON.stringify({
        summary: "Fenced response",
        actionsTaken: ["did a thing"],
        errors: [],
        nextSteps: [],
      }) +
      "\n```";

    const result = normalizeStructuredAgentResponse(fenced, []);
    expect(result.summary).toBe("Fenced response");
  });

  it("handles empty model text with no tool executions", async () => {
    const { normalizeStructuredAgentResponse } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    const result = normalizeStructuredAgentResponse("", []);
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("actionsTaken");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("nextSteps");
  });
});

describe("isBoardStateReadIntent", () => {
  it("detects read-only board state queries", async () => {
    const { isBoardStateReadIntent } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    expect(isBoardStateReadIntent("what's on this board?")).toBe(true);
    expect(isBoardStateReadIntent("show me the board state")).toBe(true);
    expect(isBoardStateReadIntent("board summary")).toBe(true);
    expect(isBoardStateReadIntent("any conflicts?")).toBe(true);
  });

  it("does not flag write intents as read-only", async () => {
    const { isBoardStateReadIntent } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    expect(isBoardStateReadIntent("create a new event")).toBe(false);
    expect(isBoardStateReadIntent("add staff to the board")).toBe(false);
    expect(isBoardStateReadIntent("delete the menu")).toBe(false);
  });

  it("returns false for empty string", async () => {
    const { isBoardStateReadIntent } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );
    expect(isBoardStateReadIntent("")).toBe(false);
  });
});

describe("detectQueryIntent", () => {
  it("detects event/calendar queries", async () => {
    const { detectQueryIntent } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    expect(detectQueryIntent("what events are coming up?")).toBe("list_events");
    expect(detectQueryIntent("show me the calendar")).toBe("list_events");
  });

  it("detects inventory queries via stock/supply keywords", async () => {
    const { detectQueryIntent } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    expect(detectQueryIntent("show stock levels")).toBe("list_inventory");
    expect(detectQueryIntent("check supply levels")).toBe("list_inventory");
    expect(detectQueryIntent("what items need reorder?")).toBe(
      "list_inventory"
    );
  });

  it("returns null for write intents", async () => {
    const { detectQueryIntent } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    expect(detectQueryIntent("create a new event")).toBeNull();
    expect(detectQueryIntent("add a staff member")).toBeNull();
    expect(detectQueryIntent("delete the menu")).toBeNull();
  });

  it("returns null for unrecognized queries", async () => {
    const { detectQueryIntent } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );
    expect(detectQueryIntent("hello world")).toBeNull();
  });
});

describe("isMissingRequiredArgValue", () => {
  it("detects missing and placeholder values", async () => {
    const { isMissingRequiredArgValue } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    expect(isMissingRequiredArgValue(undefined, "string")).toBe(true);
    expect(isMissingRequiredArgValue(null, "string")).toBe(true);
    expect(isMissingRequiredArgValue("", "string")).toBe(true);
    expect(isMissingRequiredArgValue("TBD", "string")).toBe(true);
    expect(isMissingRequiredArgValue("todo", "string")).toBe(true);
    expect(isMissingRequiredArgValue("placeholder", "string")).toBe(true);
  });

  it("accepts real values as not missing", async () => {
    const { isMissingRequiredArgValue } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    expect(isMissingRequiredArgValue("Main Hall", "string")).toBe(false);
    expect(isMissingRequiredArgValue(42, "number")).toBe(false);
    expect(isMissingRequiredArgValue(true, "boolean")).toBe(false);
  });

  it("handles edge cases", async () => {
    const { isMissingRequiredArgValue } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    expect(isMissingRequiredArgValue("N/A", "string")).toBe(true);
    expect(isMissingRequiredArgValue("  ", "string")).toBe(true);
    expect(isMissingRequiredArgValue(0, "number")).toBe(false);
  });
});

describe("parseSimulationPlan", () => {
  const emptyCatalog = {
    commands: [],
    byEntityCommand: new Map(),
    canonicalEntityCommandPairs: [],
    canonicalEntityCommandByNormalizedKey: new Map(),
    canonicalEntityCommandByLooseNormalizedKey: new Map(),
    toolNameByEntityCommand: new Map(),
    toolToEntityCommand: new Map(),
    toolDefinitions: [],
    generatedAt: null,
  };

  it("returns null for empty input", async () => {
    const { parseSimulationPlan } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );
    expect(parseSimulationPlan("", emptyCatalog)).toBeNull();
    expect(parseSimulationPlan("  ", emptyCatalog)).toBeNull();
  });

  it("returns null for non-JSON input", async () => {
    const { parseSimulationPlan } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );
    expect(parseSimulationPlan("not json at all", emptyCatalog)).toBeNull();
  });

  it("returns null for JSON missing required fields", async () => {
    const { parseSimulationPlan } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );
    expect(
      parseSimulationPlan(
        JSON.stringify({ summary: "no plan fields" }),
        emptyCatalog
      )
    ).toBeNull();
  });

  it("parses a valid plan with empty command sequence", async () => {
    const { parseSimulationPlan } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );
    const catalog = { ...emptyCatalog };
    const plan = {
      requestedSimulation: "create an event",
      resolvedAliases: [],
      commandSequence: [],
      unfulfilledIntents: [],
    };
    const result = parseSimulationPlan(JSON.stringify(plan), catalog);
    expect(result).not.toBeNull();
    expect(result!.requestedSimulation).toBe("create an event");
    expect(result!.commandSequence).toEqual([]);
  });
});

describe("buildFallbackSimulationPlan", () => {
  const emptyCatalog = {
    commands: [],
    byEntityCommand: new Map(),
    canonicalEntityCommandPairs: [],
    canonicalEntityCommandByNormalizedKey: new Map(),
    canonicalEntityCommandByLooseNormalizedKey: new Map(),
    toolNameByEntityCommand: new Map(),
    toolToEntityCommand: new Map(),
    toolDefinitions: [],
    generatedAt: null,
  };

  it("builds an empty plan for unrecognized requests", async () => {
    const { buildFallbackSimulationPlan } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );
    const result = buildFallbackSimulationPlan("hello world", emptyCatalog, []);
    expect(result.commandSequence).toEqual([]);
    expect(result.requestedSimulation).toBe("hello world");
  });

  it("builds a plan for event creation requests", async () => {
    const { buildFallbackSimulationPlan } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );
    const byEntityCommand = new Map();
    byEntityCommand.set("Event.create", { path: "/api/events/create" });
    const catalog = { ...emptyCatalog, byEntityCommand };
    const result = buildFallbackSimulationPlan("create an event", catalog, []);
    expect(result.commandSequence.length).toBeGreaterThanOrEqual(1);
    expect(result.commandSequence[0]!.entity).toBe("Event");
  });

  it("includes unfulfilled intents for unsupported features", async () => {
    const { buildFallbackSimulationPlan } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );
    // Empty catalog — everything is unsupported
    const catalog = { ...emptyCatalog };
    const result = buildFallbackSimulationPlan(
      "I want a venue and a bill",
      catalog,
      []
    );
    expect(result.unfulfilledIntents.length).toBeGreaterThan(0);
  });
});

describe("runManifestActionAgentSafe — error envelope", () => {
  const baseParams = {
    apiKey: "test-key",
    model: "gpt-4",
    systemPrompt: "You are a helpful assistant.",
    messages: [],
    context: {
      tenantId: "tenant-1",
      userId: "user-1",
      correlationId: "corr-1",
    },
  };

  it("catches fetch failures and returns structured error envelope", async () => {
    const { runManifestActionAgentSafe } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    // Mock global fetch to reject, simulating network failure in callResponsesApi.
    // The agent loop detects "get_dashboard_summary" query intent for empty
    // messages, executes the tool (mocked registry), then tries to summarize
    // via OpenAI API — which fails because fetch throws.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() => {
      throw new Error("Network request failed: ETIMEDOUT");
    });

    const result = await runManifestActionAgentSafe(baseParams);

    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("actionsTaken");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("nextSteps");
    expect(result.summary).toBe("Agent failed while processing the request.");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("ETIMEDOUT");
    expect(result.nextSteps).toEqual([
      "Retry the request or check observability logs for details.",
    ]);

    globalThis.fetch = originalFetch;
  });

  it("catches non-Error thrown values and returns generic message", async () => {
    const { runManifestActionAgentSafe } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    const originalFetch = globalThis.fetch;
    // Throw a non-Error value to test the fallback branch
    globalThis.fetch = vi.fn(() => {
      throw "unexpected string error"; // eslint-disable-line no-throw-literal -- intentional non-Error
    });

    const result = await runManifestActionAgentSafe(baseParams);

    expect(result.errors).toEqual(["Unexpected command board agent error"]);
    expect(result.summary).toBe("Agent failed while processing the request.");
    expect(result.nextSteps).toEqual([
      "Retry the request or check observability logs for details.",
    ]);

    globalThis.fetch = originalFetch;
  });

  it("reports caught errors to Sentry via captureException", async () => {
    const { runManifestActionAgentSafe } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );
    const { captureException } = await import("@sentry/nextjs");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() => {
      throw new Error("Sentry tracking test error");
    });

    // Clear any previous calls from other tests
    vi.mocked(captureException).mockClear();

    await runManifestActionAgentSafe(baseParams);

    expect(captureException).toHaveBeenCalledTimes(1);
    // Verify Sentry received the actual Error object, not just a string
    const capturedError = vi.mocked(captureException).mock.calls[0]![0];
    expect(capturedError).toBeInstanceOf(Error);
    expect((capturedError as Error).message).toContain(
      "Sentry tracking test error"
    );

    globalThis.fetch = originalFetch;
  });
});

describe("normalizeStructuredAgentResponse — retry exhaustion envelope", () => {
  it("produces error envelope from tool executions with transient error summaries", async () => {
    // The production code in executeToolWithRetry returns this exact message
    // when all retries are exhausted due to timeout or transient failures.
    const { normalizeStructuredAgentResponse } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    const transientErrorMessage =
      "The operation timed out or encountered a transient error. Please try again.";

    const result = normalizeStructuredAgentResponse("", [
      {
        toolName: "execute_manifest_command",
        status: "error",
        summary: transientErrorMessage,
      },
    ]);

    expect(result.errors).toContain(transientErrorMessage);
    // With errors but no successes, nextSteps should suggest resolving errors
    expect(result.nextSteps).toContain(
      "Resolve the listed errors and retry the request."
    );
  });

  it("produces nextSteps with both error resolution and success review when mixed", async () => {
    const { normalizeStructuredAgentResponse } = await import(
      "../../../app/api/command-board/chat/agent-loop"
    );

    const result = normalizeStructuredAgentResponse("", [
      { toolName: "Event.create", status: "success", summary: "Created event" },
      { toolName: "Menu.create", status: "error", summary: "Network timeout" },
    ]);

    expect(result.actionsTaken).toEqual(["Created event"]);
    expect(result.errors).toEqual(["Network timeout"]);
    expect(result.nextSteps).toContain(
      "Resolve the listed errors and retry the request."
    );
    expect(result.nextSteps).toContain(
      "Review applied actions on the board and confirm expected state."
    );
  });
});
