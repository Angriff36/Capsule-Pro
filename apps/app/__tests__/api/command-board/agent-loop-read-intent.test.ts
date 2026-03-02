import { describe, expect, it } from "vitest";
import { isBoardStateReadIntent } from "@/app/api/command-board/chat/agent-loop";

describe("isBoardStateReadIntent", () => {
  it("detects board summary queries as read-only", () => {
    expect(
      isBoardStateReadIntent("Give me a summary of what's on this board.")
    ).toBe(true);
    expect(isBoardStateReadIntent("Show entities on the board")).toBe(true);
  });

  it("does not classify write requests as read-only", () => {
    expect(
      isBoardStateReadIntent("Create an event and add it to the board")
    ).toBe(false);
    expect(isBoardStateReadIntent("Update event status and assign staff")).toBe(
      false
    );
  });
});
