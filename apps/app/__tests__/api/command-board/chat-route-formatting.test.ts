import { describe, expect, it } from "vitest";
import { formatStructuredAgentResponseForDisplay } from "@/app/api/command-board/chat/response-format";

describe("formatStructuredAgentResponseForDisplay", () => {
  it("renders structured agent responses as readable text instead of raw JSON", () => {
    const text = formatStructuredAgentResponseForDisplay({
      summary:
        "The event creation request failed due to an invalid format, while the menu creation was successful.",
      actionsTaken: [
        "Attempted to create a new event.",
        "Successfully created a new menu item.",
      ],
      errors: [
        "The request format was invalid. Please rephrase and try again.",
      ],
      nextSteps: [
        "Review and correct the parameters for the event creation request.",
        "Attempt to recreate the event with the corrected format.",
      ],
    });

    expect(text).toContain(
      "The event creation request failed due to an invalid format, while the menu creation was successful."
    );
    expect(text).toContain("Actions taken:");
    expect(text).toContain("Errors:");
    expect(text).toContain("Next steps:");
    expect(text).toContain("- Attempted to create a new event.");
    expect(text).not.toContain('"summary"');
    expect(text.trim().startsWith("{")).toBe(false);
  });
});
