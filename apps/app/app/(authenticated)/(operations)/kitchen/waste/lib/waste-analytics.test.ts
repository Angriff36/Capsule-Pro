import { describe, expect, it } from "vitest";
import {
  parseWasteReportResponse,
  parseWasteTrendsResponse,
} from "./waste-analytics";

describe("parseWasteTrendsResponse", () => {
  it("throws a descriptive invariant when trends are missing", () => {
    expect(() => parseWasteTrendsResponse({})).toThrow(
      "payload.trends must be an object"
    );
  });
});

describe("parseWasteReportResponse", () => {
  it("throws a descriptive invariant when report is missing", () => {
    expect(() => parseWasteReportResponse({})).toThrow(
      "payload.report must be an object"
    );
  });
});
