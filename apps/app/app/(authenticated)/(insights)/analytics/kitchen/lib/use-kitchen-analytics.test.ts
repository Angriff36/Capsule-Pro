import { describe, expect, it } from "vitest";
import { parseKitchenAnalyticsResponse } from "./use-kitchen-analytics";

describe("parseKitchenAnalyticsResponse", () => {
  it("throws a descriptive invariant when summary is missing", () => {
    expect(() => parseKitchenAnalyticsResponse({})).toThrow(
      "payload.summary must be an object"
    );
  });
});
