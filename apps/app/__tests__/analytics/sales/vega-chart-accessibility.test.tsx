import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock vega-embed so we don't need canvas/DOM measurement in jsdom.
// The component lazy-imports it; we intercept that dynamic import.
vi.mock("vega-embed", () => ({
  default: vi.fn().mockResolvedValue({
    finalize: vi.fn(),
    view: { toCanvas: vi.fn(), toSVG: vi.fn() },
  }),
}));

import {
  barChartSpec,
  VegaChart,
} from "../../../app/(authenticated)/analytics/sales/components/vega-chart";

const SAMPLE_DATA = [
  { label: "Wedding", value: 5000 },
  { label: "Birthday", value: 1200 },
  { label: "Gala", value: 7800 },
];

describe("VegaChart accessibility", () => {
  it("exposes role=img on the chart figure", () => {
    render(
      <VegaChart
        data={SAMPLE_DATA}
        spec={barChartSpec()}
        title="Revenue by Event Type"
      />
    );
    const figure = screen.getByRole("img");
    expect(figure).toBeDefined();
  });

  it("composes aria-label from title + derived data summary", () => {
    render(
      <VegaChart
        data={SAMPLE_DATA}
        description="Monthly breakdown."
        spec={barChartSpec()}
        title="Revenue by Event Type"
      />
    );
    const figure = screen.getByRole("img");
    const label = figure.getAttribute("aria-label") ?? "";
    expect(label).toContain("Revenue by Event Type");
    expect(label).toContain("Monthly breakdown");
    // Derived summary includes point count.
    expect(label).toMatch(/3 points/);
  });

  it("renders the visible data-summary companion panel with narration", () => {
    render(
      <VegaChart
        data={SAMPLE_DATA}
        spec={barChartSpec({ showCurrency: true })}
        summaryOptions={{ currency: true, unit: "revenue" }}
        title="Revenue by Event Type"
      />
    );
    // The companion panel narrates the top performer.
    expect(screen.getByText("Data summary:")).toBeDefined();
    // "Gala" is the top performer at 7800.
    const panel = screen.getByText("Data summary:").parentElement;
    expect(panel?.textContent ?? "").toContain("Gala");
    expect(panel?.textContent ?? "").toContain("$7,800");
  });

  it("wires aria-describedby to an existing element", () => {
    render(
      <VegaChart
        data={SAMPLE_DATA}
        spec={barChartSpec()}
        title="Revenue by Event Type"
      />
    );
    const figure = screen.getByRole("img");
    const describedBy = figure.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    // The referenced element must exist in the document.
    const el = describedBy ? document.getElementById(describedBy) : null;
    expect(el).not.toBeNull();
  });

  it("includes an aria-live polite status region", () => {
    render(
      <VegaChart
        data={SAMPLE_DATA}
        spec={barChartSpec()}
        title="Revenue by Event Type"
      />
    );
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it("hides loading/error overlays from screen readers with aria-hidden", () => {
    render(
      <VegaChart
        data={SAMPLE_DATA}
        spec={barChartSpec()}
        title="Revenue by Event Type"
      />
    );
    // Loading overlay should be aria-hidden so it doesn't compete with
    // the live region announcement.
    const overlays = document.querySelectorAll('[aria-hidden="true"]');
    expect(overlays.length).toBeGreaterThan(0);
  });

  it("respects a caller-provided accessibilitySummary override", () => {
    render(
      <VegaChart
        accessibilitySummary="Custom narration for this chart."
        data={SAMPLE_DATA}
        spec={barChartSpec()}
        title="Custom"
      />
    );
    const figure = screen.getByRole("img");
    expect(figure.getAttribute("aria-label")).toContain(
      "Custom narration for this chart."
    );
  });

  it("omits the summary panel when showSummary is false", () => {
    render(
      <VegaChart
        data={SAMPLE_DATA}
        showSummary={false}
        spec={barChartSpec()}
        title="No Summary"
      />
    );
    expect(screen.queryByText("Data summary:")).toBeNull();
  });
});
