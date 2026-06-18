import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import {
  parseDatetimeToEpochMs,
  parseToDate,
  toDayStartEpochMs,
} from "../datetime-boundary.js";

describe("datetime-boundary", () => {
  it("parses date-only strings as UTC midnight", () => {
    const expected = Temporal.PlainDate.from("2026-06-18")
      .toZonedDateTime("UTC")
      .epochMilliseconds;
    expect(parseDatetimeToEpochMs("2026-06-18")).toBe(expected);
    expect(parseToDate("2026-06-18")?.getTime()).toBe(expected);
  });

  it("parses ISO datetimes with Z to the same instant as Date.parse", () => {
    const iso = "2026-06-20T12:00:00.000Z";
    expect(parseDatetimeToEpochMs(iso)).toBe(Date.parse(iso));
  });

  it("treats naive ISO datetimes as UTC", () => {
    const naive = "2026-06-20T12:00:00";
    expect(parseDatetimeToEpochMs(naive)).toBe(
      Temporal.Instant.from("2026-06-20T12:00:00Z").epochMilliseconds
    );
  });

  it("passes epoch-ms numbers through unchanged", () => {
    expect(parseDatetimeToEpochMs(1_750_000_000_000)).toBe(1_750_000_000_000);
  });

  it("normalizes to UTC day start", () => {
    const noonUtc = Temporal.Instant.from("2026-06-18T15:30:00Z")
      .epochMilliseconds;
    const dayStart = Temporal.PlainDate.from("2026-06-18")
      .toZonedDateTime("UTC")
      .epochMilliseconds;
    expect(toDayStartEpochMs(noonUtc)).toBe(dayStart);
    expect(toDayStartEpochMs("2026-06-18")).toBe(dayStart);
  });
});
