import { describe, expect, it } from "vitest";
import {
  CHART_TYPES,
  replaceFields,
} from "../../../app/(authenticated)/(insights)/analytics/sales/lib/chart-catalog";

// Regression: column names with spaces (e.g. "Balance Due") produced invalid
// Vega expressions like `datum.Balance Due >= 0` — parse error at render time.
// Non-identifier names must be bracket-quoted in expression contexts while
// plain JSON field values keep the raw name.
describe("replaceFields", () => {
  const barNegative = CHART_TYPES.find((c) => c.id === "bar-negative");
  if (!barNegative) {
    throw new Error("bar-negative chart type missing from catalog");
  }

  it("bracket-quotes non-identifier column names in datum expressions", () => {
    const spec = replaceFields(barNegative.spec, {
      FIELD_X: "Client",
      FIELD_Y: "Balance Due",
    }) as Record<string, Record<string, Record<string, unknown>>>;

    expect(spec.encoding?.y?.field).toBe("Balance Due");
    expect(
      (spec.encoding?.color?.condition as Record<string, unknown>)?.test
    ).toBe("datum['Balance Due'] >= 0");
  });

  it("keeps dot access for identifier-safe column names", () => {
    const spec = replaceFields(barNegative.spec, {
      FIELD_X: "client",
      FIELD_Y: "balance",
    }) as Record<string, Record<string, Record<string, unknown>>>;

    expect(
      (spec.encoding?.color?.condition as Record<string, unknown>)?.test
    ).toBe("datum.balance >= 0");
  });

  it("escapes single quotes inside bracket-quoted names", () => {
    const spec = replaceFields(barNegative.spec, {
      FIELD_X: "x",
      FIELD_Y: "O'Brien Total",
    }) as Record<string, Record<string, Record<string, unknown>>>;

    expect(spec.encoding?.y?.field).toBe("O'Brien Total");
    expect(
      (spec.encoding?.color?.condition as Record<string, unknown>)?.test
    ).toBe("datum['O\\'Brien Total'] >= 0");
  });
});
