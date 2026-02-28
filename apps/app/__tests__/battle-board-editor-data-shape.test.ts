import { describe, expect, it } from "vitest";

import { normalizeBoardData } from "../app/(authenticated)/events/battle-boards/[boardId]/battle-board-editor-client";

describe("normalizeBoardData", () => {
  it("guarantees staff/timeline/layouts/attachments are arrays", () => {
    const normalized = normalizeBoardData({
      meta: {
        eventName: "",
        eventNumber: "",
        eventDate: "",
        staffRestrooms: "",
        staffParking: "",
      },
      staff: null,
      timeline: undefined,
      layouts: "bad",
      attachments: 42,
    } as unknown as Record<string, unknown>);

    expect(Array.isArray(normalized.staff)).toBe(true);
    expect(Array.isArray(normalized.timeline)).toBe(true);
    expect(Array.isArray(normalized.layouts)).toBe(true);
    expect(Array.isArray(normalized.attachments)).toBe(true);
  });
});
