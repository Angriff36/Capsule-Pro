/**
 * Tests for the shared pagination clamps.
 *
 * Why these tests exist:
 *   `clampLimit` and `clampOffset` are the single point of trust for keeping
 *   client-supplied pagination inputs in a safe range across every list
 *   route. Drifting from any contract here re-opens DoS-by-pagination, NaN
 *   silent-zero footguns, or negative-offset behavior nobody owns.
 */

import { describe, expect, it } from "vitest";
import {
  clampLimit,
  clampOffset,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from "../../lib/pagination";

describe("pagination", () => {
  describe("clampLimit", () => {
    it("returns DEFAULT_LIMIT for null (param missing)", () => {
      expect(clampLimit(null)).toBe(DEFAULT_LIMIT);
    });

    it("returns DEFAULT_LIMIT for empty string", () => {
      expect(clampLimit("")).toBe(DEFAULT_LIMIT);
    });

    it("returns DEFAULT_LIMIT for non-numeric input", () => {
      // `parseInt("abc")` is `NaN` — without the guard we would call
      // `Math.min(NaN, MAX_LIMIT)` which returns `NaN` and Prisma silently
      // returns zero rows, masking client bugs.
      expect(clampLimit("abc")).toBe(DEFAULT_LIMIT);
      expect(clampLimit("not-a-number")).toBe(DEFAULT_LIMIT);
    });

    it("returns DEFAULT_LIMIT for zero or negative input", () => {
      // `take: 0` returns no rows; `take: -1` is a Prisma runtime error.
      // Both should fall back to the safe default.
      expect(clampLimit("0")).toBe(DEFAULT_LIMIT);
      expect(clampLimit("-1")).toBe(DEFAULT_LIMIT);
      expect(clampLimit("-9999")).toBe(DEFAULT_LIMIT);
    });

    it("passes through valid values below the ceiling", () => {
      expect(clampLimit("1")).toBe(1);
      expect(clampLimit("25")).toBe(25);
      expect(clampLimit("100")).toBe(100);
      expect(clampLimit(String(MAX_LIMIT))).toBe(MAX_LIMIT);
    });

    it("clamps values above MAX_LIMIT down to MAX_LIMIT", () => {
      // The DoS-prevention contract: a hostile `?limit=999999` must never
      // make it past this helper.
      expect(clampLimit("201")).toBe(MAX_LIMIT);
      expect(clampLimit("9999")).toBe(MAX_LIMIT);
      expect(clampLimit("999999999")).toBe(MAX_LIMIT);
    });

    it("ignores trailing non-digit characters (parseInt semantics)", () => {
      // `parseInt` stops at first non-digit, which is fine here — the
      // numeric prefix is still safe and bounded.
      expect(clampLimit("100abc")).toBe(100);
      expect(clampLimit("50.7")).toBe(50);
    });

    it("honors a custom fallback (per-route default page size)", () => {
      // A route whose default page is 100 (not DEFAULT_LIMIT=50) passes its
      // own fallback so a missing/invalid param preserves that default.
      expect(clampLimit(null, MAX_LIMIT, 100)).toBe(100);
      expect(clampLimit("abc", MAX_LIMIT, 100)).toBe(100);
      expect(clampLimit("0", MAX_LIMIT, 100)).toBe(100);
      expect(clampLimit("-5", MAX_LIMIT, 20)).toBe(20);
    });

    it("honors a custom max ceiling for routes that legitimately need more rows", () => {
      // CSV export allows up to 5000; IoT time-series up to 1000. A hostile
      // value above the custom ceiling still clamps down.
      expect(clampLimit("9999", 1000, 1000)).toBe(1000);
      expect(clampLimit("999999", 5000, 1000)).toBe(5000);
      expect(clampLimit("5001", 5000, 1000)).toBe(5000);
      // Values under the custom ceiling pass through unchanged.
      expect(clampLimit("100", 5000, 1000)).toBe(100);
    });

    it("stays backwards-compatible when overrides are omitted", () => {
      // Every existing caller passes only the raw value; the shared policy
      // (DEFAULT_LIMIT / MAX_LIMIT) must still apply.
      expect(clampLimit(null)).toBe(DEFAULT_LIMIT);
      expect(clampLimit("abc")).toBe(DEFAULT_LIMIT);
      expect(clampLimit("999999")).toBe(MAX_LIMIT);
    });
  });

  describe("clampOffset", () => {
    it("returns 0 for null (param missing)", () => {
      expect(clampOffset(null)).toBe(0);
    });

    it("returns 0 for empty string", () => {
      expect(clampOffset("")).toBe(0);
    });

    it("returns 0 for non-numeric input", () => {
      expect(clampOffset("abc")).toBe(0);
    });

    it("returns 0 for negative input", () => {
      // `skip: -1` is a Prisma runtime error; clamp to zero so callers
      // never pass a negative through.
      expect(clampOffset("-1")).toBe(0);
      expect(clampOffset("-100")).toBe(0);
    });

    it("passes through 0 and positive values unchanged", () => {
      // Unlike clampLimit, 0 is a valid offset (the first page).
      expect(clampOffset("0")).toBe(0);
      expect(clampOffset("1")).toBe(1);
      expect(clampOffset("100")).toBe(100);
      expect(clampOffset("999999")).toBe(999_999);
    });
  });

  describe("constants", () => {
    it("exposes a sane default below the ceiling", () => {
      // Sanity check on the policy itself: DEFAULT must fit under MAX so
      // an unsuspecting caller cannot accidentally exceed the ceiling.
      expect(DEFAULT_LIMIT).toBeGreaterThan(0);
      expect(DEFAULT_LIMIT).toBeLessThanOrEqual(MAX_LIMIT);
      expect(MAX_LIMIT).toBeGreaterThan(0);
    });
  });
});
