import { describe, expect, it } from "vitest";
import {
  buildChartAriaLabel,
  generateChartSummary,
  narrateSummary,
  summarizeForScreenReader,
} from "../../../app/(authenticated)/analytics/sales/lib/chart-accessibility";

describe("generateChartSummary", () => {
  it("returns a zeroed summary for null/empty input", () => {
    const expected = {
      count: 0,
      total: 0,
      min: 0,
      max: 0,
      average: 0,
      topLabel: null,
      bottomLabel: null,
      trend: "unknown",
      isFlat: true,
    };
    expect(generateChartSummary(null)).toEqual(expected);
    expect(generateChartSummary([])).toEqual(expected);
    expect(generateChartSummary(undefined)).toEqual(expected);
  });

  it("ignores rows with non-numeric values", () => {
    const data = [
      { label: "A", value: 10 },
      { label: "B", value: "not-a-number" },
      { label: "C", value: 30 },
    ];
    const summary = generateChartSummary(data);
    expect(summary.count).toBe(2);
    expect(summary.total).toBe(40);
    expect(summary.max).toBe(30);
    expect(summary.topLabel).toBe("C");
  });

  it("parses currency-formatted string values", () => {
    const data = [
      { label: "A", value: "$1,000" },
      { label: "B", value: "$2,500" },
    ];
    const summary = generateChartSummary(data);
    expect(summary.count).toBe(2);
    expect(summary.total).toBe(3500);
    expect(summary.topLabel).toBe("B");
    expect(summary.bottomLabel).toBe("A");
  });

  it("derives trend as 'up' when last > first", () => {
    const summary = generateChartSummary([
      { label: "Jan", value: 10 },
      { label: "Feb", value: 20 },
      { label: "Mar", value: 30 },
    ]);
    expect(summary.trend).toBe("up");
    expect(summary.isFlat).toBe(false);
  });

  it("derives trend as 'down' when last < first", () => {
    const summary = generateChartSummary([
      { label: "Jan", value: 30 },
      { label: "Feb", value: 10 },
    ]);
    expect(summary.trend).toBe("down");
  });

  it("derives trend as 'flat' when first === last (>= 2 points)", () => {
    const summary = generateChartSummary([
      { label: "Jan", value: 20 },
      { label: "Feb", value: 30 },
      { label: "Mar", value: 20 },
    ]);
    expect(summary.trend).toBe("flat");
  });

  it("reports trend 'unknown' for single-point series", () => {
    const summary = generateChartSummary([{ label: "A", value: 5 }]);
    expect(summary.trend).toBe("unknown");
    expect(summary.count).toBe(1);
    expect(summary.average).toBe(5);
  });

  it("marks isFlat true when all values are identical", () => {
    const summary = generateChartSummary([
      { label: "A", value: 7 },
      { label: "B", value: 7 },
    ]);
    expect(summary.isFlat).toBe(true);
    expect(summary.min).toBe(7);
    expect(summary.max).toBe(7);
  });

  it("respects custom field names", () => {
    const summary = generateChartSummary(
      [
        { category: "X", amount: 100 },
        { category: "Y", amount: 200 },
      ],
      { labelField: "category", valueField: "amount" }
    );
    expect(summary.count).toBe(2);
    expect(summary.topLabel).toBe("Y");
    expect(summary.max).toBe(200);
  });
});

describe("summarizeForScreenReader", () => {
  it("announces empty state", () => {
    const empty = generateChartSummary([]);
    expect(summarizeForScreenReader(empty)).toBe(
      "Chart has no data to display."
    );
  });

  it("includes count, range, average, top label, and trend", () => {
    const summary = generateChartSummary([
      { label: "Jan", value: 100 },
      { label: "Feb", value: 300 },
    ]);
    const text = summarizeForScreenReader(summary);
    expect(text).toContain("2 points");
    expect(text).toContain("100");
    expect(text).toContain("300");
    expect(text).toContain("Feb");
    expect(text).toContain("trending upward");
  });

  it("formats values as currency when requested", () => {
    const summary = generateChartSummary([{ label: "A", value: 1500 }]);
    const text = summarizeForScreenReader(summary, { currency: true });
    expect(text).toContain("$1,500");
  });
});

describe("narrateSummary", () => {
  it("returns a no-data sentence when empty", () => {
    expect(narrateSummary(generateChartSummary([]))).toBe(
      "No data is available for this chart."
    );
  });

  it("leads with the top performer", () => {
    const summary = generateChartSummary([
      { label: "Wedding", value: 5000 },
      { label: "Birthday", value: 1000 },
    ]);
    const text = narrateSummary(summary, { currency: true, unit: "revenue" });
    expect(text.startsWith("Wedding leads")).toBe(true);
    expect(text).toContain("$5,000");
    expect(text).toContain("Birthday");
    expect(text).toContain("$1,000");
  });
});

describe("buildChartAriaLabel", () => {
  it("joins title, description, and summary", () => {
    const label = buildChartAriaLabel({
      title: "Revenue by Type",
      description: "Monthly breakdown.",
      summaryText: "Chart shows 3 points.",
    });
    expect(label).toBe(
      "Revenue by Type Monthly breakdown. Chart shows 3 points."
    );
  });

  it("omits missing segments", () => {
    expect(
      buildChartAriaLabel({ title: null, description: null, summaryText: "X" })
    ).toBe("X");
    expect(
      buildChartAriaLabel({
        title: "T",
        description: undefined,
        summaryText: "S",
      })
    ).toBe("T S");
  });
});
