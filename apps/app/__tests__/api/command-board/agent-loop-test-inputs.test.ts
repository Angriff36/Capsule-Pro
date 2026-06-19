// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildTestArgValue,
  CONTEXT_INJECTED_PARAM_NAMES,
  isCommandProbeIntent,
} from "@/app/api/command-board/chat/agent-loop";

describe("isCommandProbeIntent", () => {
  it("detects smoke/test/sample-data probe requests", () => {
    expect(isCommandProbeIntent("smoke test the create command")).toBe(true);
    expect(isCommandProbeIntent("does this command work?")).toBe(true);
    expect(
      isCommandProbeIntent("fill the fields with test data and run it")
    ).toBe(true);
    expect(isCommandProbeIntent("verify the command works")).toBe(true);
  });

  it("does not treat a normal create request as a probe", () => {
    expect(
      isCommandProbeIntent(
        "add tasks for hyperlinks, settings, and ui polish to the board"
      )
    ).toBe(false);
  });
});

describe("buildTestArgValue", () => {
  it("uses type before name heuristics", () => {
    expect(buildTestArgValue({ name: "count", type: "number" })).toBe(1);
    expect(buildTestArgValue({ name: "isActive", type: "boolean" })).toBe(true);
  });

  it("derives plausible strings from the param name", () => {
    expect(buildTestArgValue({ name: "email", type: "string" })).toBe(
      "test@example.com"
    );
    expect(buildTestArgValue({ name: "metadata", type: "string" })).toBe("{}");
    expect(buildTestArgValue({ name: "startsAt", type: "string" })).toBe(
      "2026-01-01T00:00:00.000Z"
    );
    expect(buildTestArgValue({ name: "title", type: "string" })).toBe(
      "test-title"
    );
  });

  it("is deterministic (reproducible bug reports)", () => {
    const first = buildTestArgValue({ name: "dueAt", type: "string" });
    const second = buildTestArgValue({ name: "dueAt", type: "string" });
    expect(first).toBe(second);
  });
});

describe("context-injected params", () => {
  it("covers the ids the dispatch layer fills from session context", () => {
    expect(CONTEXT_INJECTED_PARAM_NAMES.has("boardId")).toBe(true);
    expect(CONTEXT_INJECTED_PARAM_NAMES.has("userId")).toBe(true);
  });
});
