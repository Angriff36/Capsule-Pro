/**
 * @vitest-environment jsdom
 *
 * Tests for card components handling partial/edge-case data
 *
 * These tests verify that card components render without crashing
 * when receiving missing, null, or unknown values for various fields.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinancialNodeCard } from "../../app/(authenticated)/command-board/nodes/cards/financial-card";
import { RiskNodeCard } from "../../app/(authenticated)/command-board/nodes/cards/risk-card";
import type {
  EntityType,
  FinancialHealthStatus,
  ResolvedFinancialProjection,
  ResolvedRisk,
  RiskCategory,
  RiskSeverity,
} from "../../app/(authenticated)/command-board/types/entities";

describe("FinancialNodeCard", () => {
  const baseData: ResolvedFinancialProjection = {
    id: "fp-1",
    title: "Q1 2026 Projection",
    period: "Q1 2026",
    healthStatus: "healthy" as FinancialHealthStatus,
    projectedRevenue: 100000,
    projectedCosts: 60000,
    grossProfit: 40000,
    grossProfitMargin: 40,
    eventCount: 25,
    totalGuests: 500,
    sourceEventIds: [],
  };

  it("renders complete data without crashing", () => {
    const { container } = render(<FinancialNodeCard data={baseData} stale={false} />);
    expect(container).toBeTruthy();
    expect(screen.getByText("Q1 2026 Projection")).toBeTruthy();
  });

  it("handles null grossProfitMargin gracefully", () => {
    const dataWithNullMargin = {
      ...baseData,
      grossProfitMargin: null as unknown as number,
    };
    const { container } = render(
      <FinancialNodeCard data={dataWithNullMargin} stale={false} />
    );
    expect(container).toBeTruthy();
    // Should show 0.0% when margin is null
    expect(screen.getByText("0.0%")).toBeTruthy();
  });

  it("handles null grossProfit gracefully", () => {
    const dataWithNullProfit = {
      ...baseData,
      grossProfit: null as unknown as number,
    };
    const { container } = render(
      <FinancialNodeCard data={dataWithNullProfit} stale={false} />
    );
    expect(container).toBeTruthy();
  });

  it("handles null projectedRevenue gracefully", () => {
    const dataWithNullRevenue = {
      ...baseData,
      projectedRevenue: null as unknown as number,
    };
    const { container } = render(
      <FinancialNodeCard data={dataWithNullRevenue} stale={false} />
    );
    expect(container).toBeTruthy();
    // Should show $0 for null revenue
    expect(screen.getByText("$0")).toBeTruthy();
  });

  it("handles null projectedCosts gracefully", () => {
    const dataWithNullCosts = {
      ...baseData,
      projectedCosts: null as unknown as number,
    };
    const { container } = render(
      <FinancialNodeCard data={dataWithNullCosts} stale={false} />
    );
    expect(container).toBeTruthy();
  });

  it("handles null eventCount gracefully", () => {
    const dataWithNullEventCount = {
      ...baseData,
      eventCount: null as unknown as number,
    };
    const { container } = render(
      <FinancialNodeCard data={dataWithNullEventCount} stale={false} />
    );
    expect(container).toBeTruthy();
    // Should show 0 events
    expect(screen.getByText("0 events")).toBeTruthy();
  });

  it("handles unknown healthStatus gracefully", () => {
    const dataWithUnknownStatus = {
      ...baseData,
      healthStatus: "invalid_status" as FinancialHealthStatus,
    };
    const { container } = render(
      <FinancialNodeCard data={dataWithUnknownStatus} stale={false} />
    );
    expect(container).toBeTruthy();
    // Should fallback to "Unknown" status
    expect(screen.getByText("Unknown")).toBeTruthy();
  });

  it("applies stale styling when stale is true", () => {
    const { container } = render(
      <FinancialNodeCard data={baseData} stale={true} />
    );
    expect((container.firstChild as HTMLElement)?.className).toContain("opacity-50");
  });
});

describe("RiskNodeCard", () => {
  const baseData: ResolvedRisk = {
    id: "risk-1",
    title: "Staff Shortage Risk",
    description: "Potential shortage of kitchen staff during peak season",
    severity: "high" as RiskSeverity,
    status: "identified",
    category: "staff" as RiskCategory,
    affectedEntityName: "Kitchen Team",
    affectedEntityType: "event" as EntityType,
    affectedEntityId: "entity-1",
    probability: 0.7,
    impact: 0.5,
    mitigationSteps: [],
    createdAt: null,
    resolvedAt: null,
  };

  it("renders complete data without crashing", () => {
    const { container } = render(<RiskNodeCard data={baseData} stale={false} />);
    expect(container).toBeTruthy();
    expect(screen.getByText("Staff Shortage Risk")).toBeTruthy();
  });

  it("handles unknown severity gracefully", () => {
    const dataWithUnknownSeverity = {
      ...baseData,
      severity: "extreme" as RiskSeverity,
    };
    const { container } = render(
      <RiskNodeCard data={dataWithUnknownSeverity} stale={false} />
    );
    expect(container).toBeTruthy();
    // Should fallback to "Medium" severity
    expect(screen.getByText(/Medium/)).toBeTruthy();
  });

  it("handles unknown status gracefully", () => {
    const dataWithUnknownStatus = {
      ...baseData,
      status: "escalated" as ResolvedRisk["status"],
    };
    const { container } = render(
      <RiskNodeCard data={dataWithUnknownStatus} stale={false} />
    );
    expect(container).toBeTruthy();
    // Should render the status text, even if variant is default
    expect(screen.getByText("escalated")).toBeTruthy();
  });

  it("handles null status gracefully", () => {
    const dataWithNullStatus = {
      ...baseData,
      status: null as unknown as ResolvedRisk["status"],
    };
    const { container } = render(
      <RiskNodeCard data={dataWithNullStatus} stale={false} />
    );
    expect(container).toBeTruthy();
    // Should show "unknown" for null status
    expect(screen.getByText("unknown")).toBeTruthy();
  });

  it("handles unknown category gracefully", () => {
    const dataWithUnknownCategory = {
      ...baseData,
      category: "other" as RiskCategory,
    };
    const { container } = render(
      <RiskNodeCard data={dataWithUnknownCategory} stale={false} />
    );
    expect(container).toBeTruthy();
    // Should show the raw category value
    expect(screen.getByText(/other/)).toBeTruthy();
  });

  it("handles null affectedEntityName gracefully", () => {
    const dataWithNullEntity = {
      ...baseData,
      affectedEntityName: null as unknown as string,
    };
    const { container } = render(
      <RiskNodeCard data={dataWithNullEntity} stale={false} />
    );
    expect(container).toBeTruthy();
    // Should show the entity type as fallback
    expect(screen.getByText(/event/)).toBeTruthy();
  });

  it("applies stale styling when stale is true", () => {
    const { container } = render(<RiskNodeCard data={baseData} stale={true} />);
    expect((container.firstChild as HTMLElement)?.className).toContain("opacity-50");
  });
});
