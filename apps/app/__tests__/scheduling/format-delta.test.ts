import { describe, expect, it } from "vitest";

import { formatDelta } from "../../app/(authenticated)/(tenant-team)/scheduling/format-delta";

describe("formatDelta", () => {
  it("handles string aggregate values without producing NaN", () => {
    expect(formatDelta("42" as never, "21" as never)).toBe("+100%");
    expect(formatDelta("0" as never, "0" as never)).toBe("0%");
    expect(formatDelta("120.5" as never, "100.5" as never)).not.toContain(
      "NaN"
    );
  });
});
