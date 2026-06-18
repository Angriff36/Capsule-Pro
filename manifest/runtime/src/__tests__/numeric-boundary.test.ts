import { describe, expect, it } from "vitest";
import {
  isMoneyGreaterThan,
  percentOf,
  sumPrecise,
} from "../numeric-boundary.js";

describe("numeric-boundary", () => {
  it("sumPrecise avoids float drift", () => {
    expect(sumPrecise([0.1, 0.2])).toBe(0.3);
    expect(sumPrecise([0.1, 0.2, 0.3])).toBe(0.6);
  });

  it("isMoneyGreaterThan compares decimal money safely", () => {
    expect(isMoneyGreaterThan(0.3, 0.29)).toBe(true);
    expect(isMoneyGreaterThan("100.00", "99.99")).toBe(true);
    expect(isMoneyGreaterThan(100, 100)).toBe(false);
  });

  it("percentOf matches guarded ratio math", () => {
    expect(percentOf(50, 200)).toBe(25);
    expect(percentOf(1, 3)).toBeCloseTo(33.333333333333336, 10);
    expect(percentOf(50, 0)).toBe(0);
  });
});
