import { describe, expect, it } from "vitest";
import { pickConflictErrorDetail } from "@/app/(authenticated)/command-board/actions/conflicts-error";

describe("pickConflictErrorDetail", () => {
  it("prefers backend error over generic message", () => {
    const detail = pickConflictErrorDetail({
      message: "Failed to detect conflicts",
      error: "column e.name does not exist",
    });

    expect(detail).toBe("column e.name does not exist");
  });
});
