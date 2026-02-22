/**
 * Severity Threshold Tests for Conflict Detection
 *
 * Tests verify that severity mapping aligns with kitchen/events/staff domain thresholds.
 * Uses fixture-backed tests to assert threshold behavior for all conflict types.
 */

import { describe, expect, it } from "vitest";
import {
  CONFLICT_SEVERITY_THRESHOLDS,
  getEquipmentSeverity,
  getFinancialSeverity,
  getInventorySeverity,
  getSchedulingSeverity,
  getStaffSeverity,
  getTimelineSeverity,
  getVenueSeverity,
  EQUIPMENT_THRESHOLDS,
  FINANCIAL_THRESHOLDS,
  INVENTORY_THRESHOLDS,
  SCHEDULING_THRESHOLDS,
  STAFF_THRESHOLDS,
  TIMELINE_THRESHOLDS,
  VENUE_THRESHOLDS,
} from "../../app/api/conflicts/detect/severity-thresholds";

// ============================================================================
// FIXTURES - Test data representing real-world conflict scenarios
// ============================================================================

const schedulingFixtures = {
  doubleBooked: { shiftCount: 2, expected: "high" as const },
  tripleBooked: { shiftCount: 3, expected: "critical" as const },
  quadrupleBooked: { shiftCount: 4, expected: "critical" as const },
  singleShift: { shiftCount: 1, expected: "medium" as const },
};

const staffFixtures = {
  singleShiftTimeOff: { shiftCount: 1, expected: "high" as const },
  doubleShiftTimeOff: { shiftCount: 2, expected: "high" as const },
  tripleShiftTimeOff: { shiftCount: 3, expected: "critical" as const },
};

const inventoryFixtures = {
  criticalAlert: { alertType: "critical", expected: "critical" as const },
  warningAlert: { alertType: "warning", expected: "medium" as const },
  lowStockAlert: { alertType: "low", expected: "medium" as const },
  outOfStockAlert: { alertType: "out_of_stock", expected: "medium" as const },
};

const venueFixtures = {
  twoEventsSameVenue: { eventCount: 2, expected: "high" as const },
  threeEventsSameVenue: { eventCount: 3, expected: "critical" as const },
  fourEventsSameVenue: { eventCount: 4, expected: "critical" as const },
  singleEvent: { eventCount: 1, expected: "medium" as const },
};

const equipmentFixtures = {
  twoEventsSameEquipment: { eventCount: 2, expected: "high" as const },
  threeEventsSameEquipment: { eventCount: 3, expected: "critical" as const },
  fourEventsSameEquipment: { eventCount: 4, expected: "critical" as const },
  singleEvent: { eventCount: 1, expected: "medium" as const },
};

const timelineFixtures = {
  urgentPriority: { priority: 1, expected: "critical" as const },
  highPriority: { priority: 2, expected: "critical" as const },
  mediumPriority: { priority: 3, expected: "high" as const },
  lowPriority: { priority: 4, expected: "medium" as const },
};

const financialFixtures = {
  unprofitableEvent: {
    actualMarginPct: -5,
    marginVariance: -15,
    costVariance: 1000,
    budgetedCost: 5000,
    expected: "critical" as const,
  },
  severeMarginErosion: {
    actualMarginPct: 10,
    marginVariance: -15,
    costVariance: 500,
    budgetedCost: 5000,
    expected: "critical" as const,
  },
  costOverrun25Percent: {
    actualMarginPct: 15,
    marginVariance: -3,
    costVariance: 1500,
    budgetedCost: 5000,
    expected: "high" as const,
  },
  moderateMarginErosion: {
    actualMarginPct: 15,
    marginVariance: -8,
    costVariance: 500,
    budgetedCost: 5000,
    expected: "high" as const,
  },
  minorCostVariance: {
    actualMarginPct: 20,
    marginVariance: -2,
    costVariance: 500,
    budgetedCost: 5000,
    expected: "medium" as const,
  },
};

// ============================================================================
// THRESHOLD CONSTANTS TESTS
// ============================================================================

describe("Severity threshold constants", () => {
  it("defines scheduling thresholds", () => {
    expect(SCHEDULING_THRESHOLDS.criticalShiftCount).toBe(3);
    expect(SCHEDULING_THRESHOLDS.highShiftCount).toBe(2);
  });

  it("defines staff thresholds", () => {
    expect(STAFF_THRESHOLDS.defaultSeverity).toBe("high");
    expect(STAFF_THRESHOLDS.criticalShiftCount).toBe(3);
  });

  it("defines inventory thresholds", () => {
    expect(INVENTORY_THRESHOLDS.criticalAlertType).toBe("critical");
    expect(INVENTORY_THRESHOLDS.mediumAlertTypes).toContain("warning");
    expect(INVENTORY_THRESHOLDS.mediumAlertTypes).toContain("low");
    expect(INVENTORY_THRESHOLDS.mediumAlertTypes).toContain("out_of_stock");
  });

  it("defines venue thresholds", () => {
    expect(VENUE_THRESHOLDS.criticalEventCount).toBe(3);
    expect(VENUE_THRESHOLDS.highEventCount).toBe(2);
  });

  it("defines equipment thresholds", () => {
    expect(EQUIPMENT_THRESHOLDS.criticalEventCount).toBe(3);
    expect(EQUIPMENT_THRESHOLDS.highEventCount).toBe(2);
  });

  it("defines timeline thresholds", () => {
    expect(TIMELINE_THRESHOLDS.criticalPriorityMax).toBe(2);
    expect(TIMELINE_THRESHOLDS.highPriorityMax).toBe(3);
    expect(TIMELINE_THRESHOLDS.daysOverdueEscalation).toBe(7);
  });

  it("defines financial thresholds", () => {
    expect(FINANCIAL_THRESHOLDS.criticalMarginThreshold).toBe(0);
    expect(FINANCIAL_THRESHOLDS.criticalMarginVariance).toBe(-10);
    expect(FINANCIAL_THRESHOLDS.highCostOverrunPercent).toBe(0.25);
    expect(FINANCIAL_THRESHOLDS.highMarginVariance).toBe(-5);
  });

  it("exports all thresholds in CONFLICT_SEVERITY_THRESHOLDS", () => {
    expect(CONFLICT_SEVERITY_THRESHOLDS.scheduling).toBeDefined();
    expect(CONFLICT_SEVERITY_THRESHOLDS.staff).toBeDefined();
    expect(CONFLICT_SEVERITY_THRESHOLDS.inventory).toBeDefined();
    expect(CONFLICT_SEVERITY_THRESHOLDS.venue).toBeDefined();
    expect(CONFLICT_SEVERITY_THRESHOLDS.equipment).toBeDefined();
    expect(CONFLICT_SEVERITY_THRESHOLDS.timeline).toBeDefined();
    expect(CONFLICT_SEVERITY_THRESHOLDS.financial).toBeDefined();
  });
});

// ============================================================================
// SCHEDULING SEVERITY TESTS
// ============================================================================

describe("getSchedulingSeverity", () => {
  it("returns critical for 3+ overlapping shifts (triple-booked)", () => {
    expect(getSchedulingSeverity(schedulingFixtures.tripleBooked.shiftCount)).toBe(
      schedulingFixtures.tripleBooked.expected
    );
    expect(getSchedulingSeverity(schedulingFixtures.quadrupleBooked.shiftCount)).toBe(
      schedulingFixtures.quadrupleBooked.expected
    );
  });

  it("returns high for exactly 2 overlapping shifts (double-booked)", () => {
    expect(getSchedulingSeverity(schedulingFixtures.doubleBooked.shiftCount)).toBe(
      schedulingFixtures.doubleBooked.expected
    );
  });

  it("returns medium for single shift (no conflict scenario)", () => {
    expect(getSchedulingSeverity(schedulingFixtures.singleShift.shiftCount)).toBe(
      schedulingFixtures.singleShift.expected
    );
  });

  it("uses threshold constants consistently", () => {
    // At critical threshold
    expect(getSchedulingSeverity(SCHEDULING_THRESHOLDS.criticalShiftCount)).toBe("critical");
    // Just below critical threshold
    expect(getSchedulingSeverity(SCHEDULING_THRESHOLDS.criticalShiftCount - 1)).toBe("high");
    // At high threshold
    expect(getSchedulingSeverity(SCHEDULING_THRESHOLDS.highShiftCount)).toBe("high");
  });
});

// ============================================================================
// STAFF SEVERITY TESTS
// ============================================================================

describe("getStaffSeverity", () => {
  it("returns critical for 3+ shifts during time-off", () => {
    expect(getStaffSeverity(staffFixtures.tripleShiftTimeOff.shiftCount)).toBe(
      staffFixtures.tripleShiftTimeOff.expected
    );
  });

  it("returns high for 1-2 shifts during time-off (default)", () => {
    expect(getStaffSeverity(staffFixtures.singleShiftTimeOff.shiftCount)).toBe(
      staffFixtures.singleShiftTimeOff.expected
    );
    expect(getStaffSeverity(staffFixtures.doubleShiftTimeOff.shiftCount)).toBe(
      staffFixtures.doubleShiftTimeOff.expected
    );
  });

  it("uses threshold constants consistently", () => {
    expect(getStaffSeverity(STAFF_THRESHOLDS.criticalShiftCount)).toBe("critical");
    expect(getStaffSeverity(STAFF_THRESHOLDS.criticalShiftCount - 1)).toBe(
      STAFF_THRESHOLDS.defaultSeverity
    );
  });
});

// ============================================================================
// INVENTORY SEVERITY TESTS
// ============================================================================

describe("getInventorySeverity", () => {
  it("returns critical for critical alert type", () => {
    expect(getInventorySeverity(inventoryFixtures.criticalAlert.alertType)).toBe(
      inventoryFixtures.criticalAlert.expected
    );
  });

  it("returns medium for warning/low/out_of_stock alert types", () => {
    expect(getInventorySeverity(inventoryFixtures.warningAlert.alertType)).toBe(
      inventoryFixtures.warningAlert.expected
    );
    expect(getInventorySeverity(inventoryFixtures.lowStockAlert.alertType)).toBe(
      inventoryFixtures.lowStockAlert.expected
    );
    expect(getInventorySeverity(inventoryFixtures.outOfStockAlert.alertType)).toBe(
      inventoryFixtures.outOfStockAlert.expected
    );
  });

  it("returns medium for unknown alert types", () => {
    expect(getInventorySeverity("unknown")).toBe("medium");
    expect(getInventorySeverity("info")).toBe("medium");
  });
});

// ============================================================================
// VENUE SEVERITY TESTS
// ============================================================================

describe("getVenueSeverity", () => {
  it("returns critical for 3+ events at same venue", () => {
    expect(getVenueSeverity(venueFixtures.threeEventsSameVenue.eventCount)).toBe(
      venueFixtures.threeEventsSameVenue.expected
    );
    expect(getVenueSeverity(venueFixtures.fourEventsSameVenue.eventCount)).toBe(
      venueFixtures.fourEventsSameVenue.expected
    );
  });

  it("returns high for exactly 2 events at same venue", () => {
    expect(getVenueSeverity(venueFixtures.twoEventsSameVenue.eventCount)).toBe(
      venueFixtures.twoEventsSameVenue.expected
    );
  });

  it("returns medium for single event (no conflict)", () => {
    expect(getVenueSeverity(venueFixtures.singleEvent.eventCount)).toBe(
      venueFixtures.singleEvent.expected
    );
  });

  it("uses threshold constants consistently", () => {
    expect(getVenueSeverity(VENUE_THRESHOLDS.criticalEventCount)).toBe("critical");
    expect(getVenueSeverity(VENUE_THRESHOLDS.highEventCount)).toBe("high");
  });
});

// ============================================================================
// EQUIPMENT SEVERITY TESTS
// ============================================================================

describe("getEquipmentSeverity", () => {
  it("returns critical for 3+ events needing same equipment", () => {
    expect(getEquipmentSeverity(equipmentFixtures.threeEventsSameEquipment.eventCount)).toBe(
      equipmentFixtures.threeEventsSameEquipment.expected
    );
    expect(getEquipmentSeverity(equipmentFixtures.fourEventsSameEquipment.eventCount)).toBe(
      equipmentFixtures.fourEventsSameEquipment.expected
    );
  });

  it("returns high for exactly 2 events needing same equipment", () => {
    expect(getEquipmentSeverity(equipmentFixtures.twoEventsSameEquipment.eventCount)).toBe(
      equipmentFixtures.twoEventsSameEquipment.expected
    );
  });

  it("returns medium for single event (no conflict)", () => {
    expect(getEquipmentSeverity(equipmentFixtures.singleEvent.eventCount)).toBe(
      equipmentFixtures.singleEvent.expected
    );
  });

  it("uses threshold constants consistently", () => {
    expect(getEquipmentSeverity(EQUIPMENT_THRESHOLDS.criticalEventCount)).toBe("critical");
    expect(getEquipmentSeverity(EQUIPMENT_THRESHOLDS.highEventCount)).toBe("high");
  });
});

// ============================================================================
// TIMELINE SEVERITY TESTS
// ============================================================================

describe("getTimelineSeverity", () => {
  it("returns critical for urgent tasks (priority 1-2)", () => {
    expect(getTimelineSeverity(timelineFixtures.urgentPriority.priority)).toBe(
      timelineFixtures.urgentPriority.expected
    );
    expect(getTimelineSeverity(timelineFixtures.highPriority.priority)).toBe(
      timelineFixtures.highPriority.expected
    );
  });

  it("returns high for medium priority tasks (priority 3)", () => {
    expect(getTimelineSeverity(timelineFixtures.mediumPriority.priority)).toBe(
      timelineFixtures.mediumPriority.expected
    );
  });

  it("returns medium for low priority tasks (priority 4+)", () => {
    expect(getTimelineSeverity(timelineFixtures.lowPriority.priority)).toBe(
      timelineFixtures.lowPriority.expected
    );
  });

  it("uses threshold constants consistently", () => {
    expect(getTimelineSeverity(TIMELINE_THRESHOLDS.criticalPriorityMax)).toBe("critical");
    expect(getTimelineSeverity(TIMELINE_THRESHOLDS.highPriorityMax)).toBe("high");
  });
});

// ============================================================================
// FINANCIAL SEVERITY TESTS
// ============================================================================

describe("getFinancialSeverity", () => {
  it("returns critical for unprofitable events (negative margin)", () => {
    const fixture = financialFixtures.unprofitableEvent;
    expect(
      getFinancialSeverity(
        fixture.actualMarginPct,
        fixture.marginVariance,
        fixture.costVariance,
        fixture.budgetedCost
      )
    ).toBe(fixture.expected);
  });

  it("returns critical for severe margin erosion (>10%)", () => {
    const fixture = financialFixtures.severeMarginErosion;
    expect(
      getFinancialSeverity(
        fixture.actualMarginPct,
        fixture.marginVariance,
        fixture.costVariance,
        fixture.budgetedCost
      )
    ).toBe(fixture.expected);
  });

  it("returns high for cost overrun >25% of budget", () => {
    const fixture = financialFixtures.costOverrun25Percent;
    expect(
      getFinancialSeverity(
        fixture.actualMarginPct,
        fixture.marginVariance,
        fixture.costVariance,
        fixture.budgetedCost
      )
    ).toBe(fixture.expected);
  });

  it("returns high for moderate margin erosion (>5%)", () => {
    const fixture = financialFixtures.moderateMarginErosion;
    expect(
      getFinancialSeverity(
        fixture.actualMarginPct,
        fixture.marginVariance,
        fixture.costVariance,
        fixture.budgetedCost
      )
    ).toBe(fixture.expected);
  });

  it("returns medium for minor cost variance", () => {
    const fixture = financialFixtures.minorCostVariance;
    expect(
      getFinancialSeverity(
        fixture.actualMarginPct,
        fixture.marginVariance,
        fixture.costVariance,
        fixture.budgetedCost
      )
    ).toBe(fixture.expected);
  });

  it("uses threshold constants consistently", () => {
    // Negative margin = critical
    expect(
      getFinancialSeverity(
        FINANCIAL_THRESHOLDS.criticalMarginThreshold - 1,
        0,
        0,
        1000
      )
    ).toBe("critical");

    // Exactly at critical margin variance = high (not < -10)
    expect(
      getFinancialSeverity(
        10,
        FINANCIAL_THRESHOLDS.criticalMarginVariance,
        0,
        1000
      )
    ).toBe("high");

    // Just below critical margin variance = critical
    expect(
      getFinancialSeverity(
        10,
        FINANCIAL_THRESHOLDS.criticalMarginVariance - 0.1,
        0,
        1000
      )
    ).toBe("critical");
  });

  it("handles zero budgeted cost gracefully", () => {
    // Zero budget shouldn't cause division by zero
    expect(getFinancialSeverity(10, -3, 500, 0)).toBe("medium");
    expect(getFinancialSeverity(10, -8, 500, 0)).toBe("high");
  });

  it("handles edge cases at threshold boundaries", () => {
    // Exactly at high margin variance = medium (not < -5)
    expect(getFinancialSeverity(15, FINANCIAL_THRESHOLDS.highMarginVariance, 100, 1000)).toBe(
      "medium"
    );

    // Just below high margin variance = high
    expect(
      getFinancialSeverity(15, FINANCIAL_THRESHOLDS.highMarginVariance - 0.1, 100, 1000)
    ).toBe("high");

    // Exactly at 25% cost overrun = medium (not > 0.25)
    expect(
      getFinancialSeverity(
        15,
        0,
        1000 * FINANCIAL_THRESHOLDS.highCostOverrunPercent,
        1000
      )
    ).toBe("medium");

    // Just above 25% cost overrun = high
    expect(
      getFinancialSeverity(
        15,
        0,
        1000 * FINANCIAL_THRESHOLDS.highCostOverrunPercent + 1,
        1000
      )
    ).toBe("high");
  });
});

// ============================================================================
// DOMAIN ALIGNMENT TESTS
// ============================================================================

describe("Domain threshold alignment", () => {
  it("aligns scheduling thresholds with staff availability domain", () => {
    // Domain requirement: Double-booking is high priority
    // Triple-booking is critical (employee cannot physically be in 3 places)
    expect(SCHEDULING_THRESHOLDS.highShiftCount).toBe(2);
    expect(SCHEDULING_THRESHOLDS.criticalShiftCount).toBe(3);
  });

  it("aligns venue thresholds with event planning domain", () => {
    // Domain requirement: 2 events at same venue needs coordination
    // 3+ events at same venue is critical (likely to cause issues)
    expect(VENUE_THRESHOLDS.highEventCount).toBe(2);
    expect(VENUE_THRESHOLDS.criticalEventCount).toBe(3);
  });

  it("aligns equipment thresholds with kitchen operations domain", () => {
    // Kitchen domain: Equipment conflicts are as serious as venue conflicts
    // Same thresholds apply
    expect(EQUIPMENT_THRESHOLDS.highEventCount).toBe(VENUE_THRESHOLDS.highEventCount);
    expect(EQUIPMENT_THRESHOLDS.criticalEventCount).toBe(VENUE_THRESHOLDS.criticalEventCount);
  });

  it("aligns timeline thresholds with prep task domain", () => {
    // Prep tasks: Priority 1-2 are urgent/high (must complete for event)
    // Priority 3 is medium priority
    expect(TIMELINE_THRESHOLDS.criticalPriorityMax).toBe(2);
    expect(TIMELINE_THRESHOLDS.highPriorityMax).toBe(3);
  });

  it("aligns financial thresholds with catering business domain", () => {
    // Catering domain: Negative margin is always critical
    expect(FINANCIAL_THRESHOLDS.criticalMarginThreshold).toBe(0);

    // 10%+ margin erosion is critical for profitability
    expect(FINANCIAL_THRESHOLDS.criticalMarginVariance).toBe(-10);

    // 25%+ cost overrun significantly impacts margins
    expect(FINANCIAL_THRESHOLDS.highCostOverrunPercent).toBe(0.25);
  });

  it("ensures staff time-off violations are always elevated", () => {
    // HR domain: Violating approved time-off is always serious
    // Default is high severity
    expect(STAFF_THRESHOLDS.defaultSeverity).toBe("high");
  });
});
