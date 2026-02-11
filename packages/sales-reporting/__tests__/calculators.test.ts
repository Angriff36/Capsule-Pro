/**
 * Unit tests for metrics calculators.
 */

import { describe, expect, it } from "vitest";
import { calculateWeeklyMetrics } from "../src/calculators/weekly";
import { calculateMonthlyMetrics } from "../src/calculators/monthly";
import { calculateQuarterlyMetrics } from "../src/calculators/quarterly";
import type { SalesRecord } from "../src/types";

const createMockRecord = (
  overrides: Partial<SalesRecord> = {}
): SalesRecord => ({
  date: new Date("2024-01-15"),
  eventName: "Test Event",
  eventType: "Wedding",
  clientName: "Test Client",
  leadSource: "Referral",
  status: "pending",
  proposalDate: null,
  closeDate: null,
  revenue: 10000,
  eventDate: null,
  ...overrides,
});

describe("calculateWeeklyMetrics", () => {
  it("calculates basic weekly metrics", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", revenue: 15000 }),
      createMockRecord({ date: new Date("2024-01-16"), status: "lost", revenue: 5000 }),
      createMockRecord({ date: new Date("2024-01-17"), status: "proposal_sent", revenue: 20000 }),
      createMockRecord({ date: new Date("2024-01-18"), status: "pending", revenue: 25000 }),
    ];

    const start = new Date("2024-01-14");
    const end = new Date("2024-01-20");

    const metrics = calculateWeeklyMetrics(records, start, end);

    expect(metrics.leadsReceived).toBe(4);
    expect(metrics.proposalsSent).toBe(3); // won + lost + proposal_sent
    expect(metrics.eventsClosed).toBe(1);
    expect(metrics.closingRatio).toBeCloseTo(0.333, 2);
  });

  it("calculates revenue by event type", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", eventType: "Wedding", revenue: 15000 }),
      createMockRecord({ date: new Date("2024-01-16"), status: "won", eventType: "Wedding", revenue: 10000 }),
      createMockRecord({ date: new Date("2024-01-17"), status: "won", eventType: "Corporate", revenue: 20000 }),
      createMockRecord({ date: new Date("2024-01-18"), status: "won", eventType: "Corporate", revenue: 5000 }),
    ];

    const start = new Date("2024-01-14");
    const end = new Date("2024-01-20");

    const metrics = calculateWeeklyMetrics(records, start, end);

    expect(metrics.revenueByEventType.Wedding).toBe(25000);
    expect(metrics.revenueByEventType.Corporate).toBe(25000);
  });

  it("calculates lost opportunities", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "lost", revenue: 5000, eventName: "Lost Deal 1" }),
      createMockRecord({ date: new Date("2024-01-16"), status: "lost", revenue: 10000, eventName: "Lost Deal 2" }),
      createMockRecord({ date: new Date("2024-01-17"), status: "won", revenue: 15000 }),
    ];

    const start = new Date("2024-01-14");
    const end = new Date("2024-01-20");

    const metrics = calculateWeeklyMetrics(records, start, end);

    expect(metrics.lostOpportunities.count).toBe(2);
    expect(metrics.lostOpportunities.totalValue).toBe(15000);
    expect(metrics.lostOpportunities.records).toHaveLength(2);
  });

  it("identifies top pending deals", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "pending", revenue: 5000, eventName: "Small Deal" }),
      createMockRecord({ date: new Date("2024-01-16"), status: "pending", revenue: 30000, eventName: "Big Deal" }),
      createMockRecord({ date: new Date("2024-01-17"), status: "proposal_sent", revenue: 20000, eventName: "Medium Deal" }),
      createMockRecord({ date: new Date("2024-01-18"), status: "pending", revenue: 25000, eventName: "Large Deal" }),
    ];

    const start = new Date("2024-01-14");
    const end = new Date("2024-01-20");

    const metrics = calculateWeeklyMetrics(records, start, end);

    expect(metrics.topPendingDeals).toHaveLength(3);
    expect(metrics.topPendingDeals[0].revenue).toBe(30000);
    expect(metrics.topPendingDeals[0].eventName).toBe("Big Deal");
    expect(metrics.topPendingDeals[1].revenue).toBe(25000);
    expect(metrics.topPendingDeals[2].revenue).toBe(20000);
  });

  it("filters records by date range", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-10"), status: "won", revenue: 10000 }), // Before range
      createMockRecord({ date: new Date("2024-01-15"), status: "won", revenue: 15000 }), // In range
      createMockRecord({ date: new Date("2024-01-20"), status: "won", revenue: 20000 }), // In range
      createMockRecord({ date: new Date("2024-01-25"), status: "won", revenue: 25000 }), // After range
    ];

    const start = new Date("2024-01-14");
    const end = new Date("2024-01-20");

    const metrics = calculateWeeklyMetrics(records, start, end);

    expect(metrics.leadsReceived).toBe(2);
  });

  it("handles edge case with no records", () => {
    const start = new Date("2024-01-14");
    const end = new Date("2024-01-20");

    const metrics = calculateWeeklyMetrics([], start, end);

    expect(metrics.leadsReceived).toBe(0);
    expect(metrics.proposalsSent).toBe(0);
    expect(metrics.eventsClosed).toBe(0);
    expect(metrics.closingRatio).toBe(0);
    expect(metrics.lostOpportunities.count).toBe(0);
    expect(metrics.lostOpportunities.totalValue).toBe(0);
    expect(metrics.topPendingDeals).toHaveLength(0);
  });

  it("handles edge case with no proposals", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "pending", revenue: 10000 }),
      createMockRecord({ date: new Date("2024-01-16"), status: "pending", revenue: 15000 }),
    ];

    const start = new Date("2024-01-14");
    const end = new Date("2024-01-20");

    const metrics = calculateWeeklyMetrics(records, start, end);

    expect(metrics.leadsReceived).toBe(2);
    expect(metrics.proposalsSent).toBe(0);
    expect(metrics.eventsClosed).toBe(0);
    expect(metrics.closingRatio).toBe(0);
  });
});

describe("calculateMonthlyMetrics", () => {
  it("calculates total revenue for the month", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", revenue: 15000 }),
      createMockRecord({ date: new Date("2024-01-20"), status: "won", revenue: 20000 }),
      createMockRecord({ date: new Date("2024-02-01"), status: "won", revenue: 10000 }), // Next month
    ];

    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    const metrics = calculateMonthlyMetrics(records, start, end);

    expect(metrics.totalRevenue).toBe(35000);
  });

  it("calculates average event value", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", revenue: 15000 }),
      createMockRecord({ date: new Date("2024-01-20"), status: "won", revenue: 25000 }),
      createMockRecord({ date: new Date("2024-01-25"), status: "won", revenue: 20000 }),
    ];

    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    const metrics = calculateMonthlyMetrics(records, start, end);

    expect(metrics.avgEventValue).toBeCloseTo(20000, 0);
  });

  it("calculates funnel metrics", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "pending", revenue: 10000 }),
      createMockRecord({ date: new Date("2024-01-16"), status: "proposal_sent", revenue: 15000 }),
      createMockRecord({ date: new Date("2024-01-17"), status: "won", revenue: 20000 }),
      createMockRecord({ date: new Date("2024-01-18"), status: "lost", revenue: 5000 }),
    ];

    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    const metrics = calculateMonthlyMetrics(records, start, end);

    expect(metrics.funnelMetrics.leads).toBe(4);
    expect(metrics.funnelMetrics.proposals).toBe(3); // proposal_sent + won + lost
    expect(metrics.funnelMetrics.won).toBe(1);
    expect(metrics.funnelMetrics.lost).toBe(1);
  });

  it("calculates pipeline forecast", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "pending", revenue: 30000, eventName: "Deal 1" }),
      createMockRecord({ date: new Date("2024-01-16"), status: "pending", revenue: 20000, eventName: "Deal 2" }),
      createMockRecord({ date: new Date("2024-01-17"), status: "proposal_sent", revenue: 15000, eventName: "Deal 3" }),
    ];

    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    const metrics = calculateMonthlyMetrics(records, start, end);

    expect(metrics.pipelineForecast.pendingCount).toBe(3);
    expect(metrics.pipelineForecast.pendingValue).toBe(65000);
    expect(metrics.pipelineForecast.deals).toHaveLength(3);
  });

  it("calculates lead source breakdown", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", leadSource: "Referral", revenue: 15000 }),
      createMockRecord({ date: new Date("2024-01-16"), status: "won", leadSource: "Referral", revenue: 10000 }),
      createMockRecord({ date: new Date("2024-01-17"), status: "lost", leadSource: "Website", revenue: 5000 }),
      createMockRecord({ date: new Date("2024-01-18"), status: "won", leadSource: "Website", revenue: 20000 }),
    ];

    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    const metrics = calculateMonthlyMetrics(records, start, end);

    expect(metrics.leadSourceBreakdown.Referral).toEqual({
      count: 2,
      revenue: 25000,
      conversionRate: 1, // 2 out of 2 won
    });
    expect(metrics.leadSourceBreakdown.Website).toEqual({
      count: 2,
      revenue: 20000, // Only won revenue counted
      conversionRate: 0.5, // 1 out of 2 won
    });
  });

  it("handles empty records", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-01-31");

    const metrics = calculateMonthlyMetrics([], start, end);

    expect(metrics.totalRevenue).toBe(0);
    expect(metrics.avgEventValue).toBe(0);
    expect(metrics.funnelMetrics.leads).toBe(0);
    expect(metrics.pipelineForecast.pendingCount).toBe(0);
  });
});

describe("calculateQuarterlyMetrics", () => {
  it("calculates total revenue for the quarter", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", revenue: 15000 }),
      createMockRecord({ date: new Date("2024-02-15"), status: "won", revenue: 20000 }),
      createMockRecord({ date: new Date("2024-03-15"), status: "won", revenue: 25000 }),
      createMockRecord({ date: new Date("2024-04-01"), status: "won", revenue: 10000 }), // Next quarter
    ];

    const start = new Date("2024-01-01");
    const end = new Date("2024-03-31");

    const metrics = calculateQuarterlyMetrics(records, start, end);

    expect(metrics.totalRevenue).toBe(60000);
  });

  it("calculates customer segments", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", eventType: "Wedding", revenue: 15000 }),
      createMockRecord({ date: new Date("2024-02-15"), status: "won", eventType: "Wedding", revenue: 10000 }),
      createMockRecord({ date: new Date("2024-03-15"), status: "won", eventType: "Corporate", revenue: 25000 }),
    ];

    const start = new Date("2024-01-01");
    const end = new Date("2024-03-31");

    const metrics = calculateQuarterlyMetrics(records, start, end);

    expect(metrics.customerSegments.Wedding).toEqual({
      count: 2,
      revenue: 25000,
      avgValue: 12500,
    });
    expect(metrics.customerSegments.Corporate).toEqual({
      count: 1,
      revenue: 25000,
      avgValue: 25000,
    });
  });

  it("calculates sales cycle length statistics", () => {
    const records = [
      createMockRecord({
        date: new Date("2024-01-01"),
        proposalDate: new Date("2024-01-10"),
        closeDate: new Date("2024-01-20"),
        status: "won",
        revenue: 15000,
        eventType: "Wedding",
      }),
      createMockRecord({
        date: new Date("2024-02-01"),
        proposalDate: new Date("2024-02-05"),
        closeDate: new Date("2024-02-15"),
        status: "won",
        revenue: 20000,
        eventType: "Corporate",
      }),
    ];

    const start = new Date("2024-01-01");
    const end = new Date("2024-03-31");

    const metrics = calculateQuarterlyMetrics(records, start, end);

    // Sales cycle is closeDate - proposalDate (in days)
    expect(metrics.salesCycleLength.min).toBeGreaterThan(0);
    expect(metrics.salesCycleLength.max).toBeGreaterThan(0);
    expect(metrics.salesCycleLength.avg).toBeGreaterThan(0);
  });

  it("generates quarterly goals based on performance", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", revenue: 15000 }),
      createMockRecord({ date: new Date("2024-02-15"), status: "won", revenue: 20000 }),
      createMockRecord({ date: new Date("2024-03-15"), status: "won", revenue: 25000 }),
    ];

    const start = new Date("2024-01-01");
    const end = new Date("2024-03-31");

    const metrics = calculateQuarterlyMetrics(records, start, end);

    expect(metrics.nextQuarterGoals.revenueTarget).toBeGreaterThan(0);
    expect(metrics.nextQuarterGoals.leadTarget).toBeGreaterThan(0);
    expect(metrics.nextQuarterGoals.conversionTarget).toBeGreaterThan(0);
  });

  it("generates recommendations", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", leadSource: "Referral", revenue: 15000 }),
      createMockRecord({ date: new Date("2024-02-15"), status: "lost", leadSource: "Website", revenue: 5000 }),
    ];

    const start = new Date("2024-01-01");
    const end = new Date("2024-03-31");

    const metrics = calculateQuarterlyMetrics(records, start, end);

    expect(Array.isArray(metrics.recommendations)).toBe(true);
    expect(metrics.recommendations.length).toBeGreaterThan(0);
  });

  it("handles empty records", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-03-31");

    const metrics = calculateQuarterlyMetrics([], start, end);

    expect(metrics.totalRevenue).toBe(0);
    expect(metrics.recommendations).toBeDefined();
    expect(metrics.nextQuarterGoals).toBeDefined();
  });
});

describe("Calculator edge cases", () => {
  it("handles records with no matching event type", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", eventType: "", revenue: 15000 }),
    ];

    const start = new Date("2024-01-14");
    const end = new Date("2024-01-20");

    const metrics = calculateWeeklyMetrics(records, start, end);

    // Should group under "Other" for empty eventType
    expect(metrics.revenueByEventType.Other).toBeDefined();
    expect(metrics.revenueByEventType.Other).toBe(15000);
  });

  it("handles records with zero revenue", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", revenue: 0 }),
    ];

    const start = new Date("2024-01-14");
    const end = new Date("2024-01-20");

    const metrics = calculateWeeklyMetrics(records, start, end);

    expect(metrics.leadsReceived).toBe(1);
    expect(metrics.eventsClosed).toBe(1);
  });

  it("handles records with negative revenue (invalid but should not crash)", () => {
    const records = [
      createMockRecord({ date: new Date("2024-01-15"), status: "won", revenue: -1000 }),
    ];

    const start = new Date("2024-01-14");
    const end = new Date("2024-01-20");

    // Should not throw
    expect(() => calculateWeeklyMetrics(records, start, end)).not.toThrow();
  });
});
