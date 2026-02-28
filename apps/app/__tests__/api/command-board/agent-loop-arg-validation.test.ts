import { describe, expect, it } from "vitest";
import { isMissingRequiredArgValue } from "@/app/api/command-board/chat/agent-loop";

describe("isMissingRequiredArgValue", () => {
  it("treats placeholder strings as missing for required string params", () => {
    expect(isMissingRequiredArgValue("TBD", "string")).toBe(true);
    expect(isMissingRequiredArgValue(" placeholder ", "string")).toBe(true);
    expect(isMissingRequiredArgValue("", "string")).toBe(true);
  });

  it("does not treat real values as missing", () => {
    expect(isMissingRequiredArgValue("Event A", "string")).toBe(false);
    expect(isMissingRequiredArgValue(42, "number")).toBe(false);
    expect(isMissingRequiredArgValue(false, "boolean")).toBe(false);
  });
});
