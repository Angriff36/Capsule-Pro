import { describe, expect, it } from "vitest";
import {
  type AgentToolExecution,
  normalizeStructuredAgentResponse,
} from "@/app/api/command-board/chat/agent-loop";

describe("normalizeStructuredAgentResponse", () => {
  it("synthesizes structured output when model returns no content", () => {
    const toolExecutions: AgentToolExecution[] = [
      {
        toolName: "detect_conflicts",
        status: "success",
        summary: "Detected 2 scheduling conflicts",
      },
      {
        toolName: "execute_manifest_command",
        status: "error",
        summary: "Command failed: validation error",
      },
    ];

    const response = normalizeStructuredAgentResponse("", toolExecutions);

    expect(response.summary.length).toBeGreaterThan(0);
    expect(response.actionsTaken.length).toBeGreaterThan(0);
    expect(response.errors.length).toBeGreaterThan(0);
    expect(response.nextSteps.length).toBeGreaterThan(0);
  });
});
