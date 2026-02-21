/**
 * Severity Threshold Configuration for Conflict Detection
 *
 * This module centralizes domain-specific severity thresholds for all conflict types.
 * Thresholds are based on operational requirements from kitchen, events, and staff domains.
 *
 * Severity Levels (from types.ts):
 * - low: Minor issues that should be reviewed but don't require immediate action
 * - medium: Notable issues that need attention soon
 * - high: Significant issues requiring prompt resolution
 * - critical: Urgent issues requiring immediate action
 */

import type { ConflictSeverity } from "./types";

// ============================================================================
// SCHEDULING CONFLICTS (Double-booked staff, overlapping shifts)
// ============================================================================

/**
 * Thresholds for scheduling conflicts based on number of overlapping shifts
 * per employee on the same day.
 */
export const SCHEDULING_THRESHOLDS = {
  /** 3+ shifts for same employee on same day = critical */
  criticalShiftCount: 3,
  /** Exactly 2 overlapping shifts = high */
  highShiftCount: 2,
} as const;

/**
 * Determine scheduling conflict severity based on shift count
 */
export function getSchedulingSeverity(shiftCount: number): ConflictSeverity {
  if (shiftCount >= SCHEDULING_THRESHOLDS.criticalShiftCount) {
    return "critical";
  }
  if (shiftCount >= SCHEDULING_THRESHOLDS.highShiftCount) {
    return "high";
  }
  return "medium";
}

// ============================================================================
// STAFF CONFLICTS (Shifts during approved time-off)
// ============================================================================

/**
 * Staff conflicts are always high severity because they violate approved
 * time-off requests, which impacts employee trust and labor compliance.
 */
export const STAFF_THRESHOLDS = {
  /** All shifts during time-off are high priority */
  defaultSeverity: "high" as ConflictSeverity,
  /** Number of shifts that would escalate to critical */
  criticalShiftCount: 3,
} as const;

/**
 * Determine staff conflict severity based on shift count
 */
export function getStaffSeverity(shiftCount: number): ConflictSeverity {
  if (shiftCount >= STAFF_THRESHOLDS.criticalShiftCount) {
    return "critical";
  }
  return STAFF_THRESHOLDS.defaultSeverity;
}

// ============================================================================
// INVENTORY CONFLICTS (Stock shortages)
// ============================================================================

/**
 * Inventory alert types map to severity levels.
 * The alertType comes from the database inventoryAlert.alertType field.
 */
export const INVENTORY_THRESHOLDS = {
  /** Critical alerts (stock-out imminent) */
  criticalAlertType: "critical" as const,
  /** Warning/low stock alerts */
  mediumAlertTypes: ["warning", "low", "out_of_stock"] as const,
} as const;

/**
 * Determine inventory conflict severity based on alert type
 */
export function getInventorySeverity(alertType: string): ConflictSeverity {
  if (alertType === INVENTORY_THRESHOLDS.criticalAlertType) {
    return "critical";
  }
  return "medium";
}

// ============================================================================
// VENUE CONFLICTS (Multiple events at same venue)
// ============================================================================

/**
 * Thresholds for venue conflicts based on number of events at same venue
 * on the same date.
 */
export const VENUE_THRESHOLDS = {
  /** 3+ events at same venue on same day = critical */
  criticalEventCount: 3,
  /** 2 events = high */
  highEventCount: 2,
} as const;

/**
 * Determine venue conflict severity based on event count
 */
export function getVenueSeverity(eventCount: number): ConflictSeverity {
  if (eventCount >= VENUE_THRESHOLDS.criticalEventCount) {
    return "critical";
  }
  if (eventCount >= VENUE_THRESHOLDS.highEventCount) {
    return "high";
  }
  return "medium";
}

// ============================================================================
// EQUIPMENT CONFLICTS (Same equipment at overlapping events)
// ============================================================================

/**
 * Thresholds for equipment conflicts based on number of events needing
 * the same equipment on the same date.
 */
export const EQUIPMENT_THRESHOLDS = {
  /** 3+ events needing same equipment = critical */
  criticalEventCount: 3,
  /** 2 events = high */
  highEventCount: 2,
} as const;

/**
 * Determine equipment conflict severity based on event count
 */
export function getEquipmentSeverity(eventCount: number): ConflictSeverity {
  if (eventCount >= EQUIPMENT_THRESHOLDS.criticalEventCount) {
    return "critical";
  }
  if (eventCount >= EQUIPMENT_THRESHOLDS.highEventCount) {
    return "high";
  }
  return "medium";
}

// ============================================================================
// TIMELINE CONFLICTS (Overdue tasks)
// ============================================================================

/**
 * Timeline conflicts are based on task priority (1=urgent, 2=high, 3=medium, 4=low).
 * Higher priority overdue tasks are more severe.
 */
export const TIMELINE_THRESHOLDS = {
  /** Priority 1-2 (urgent/high) overdue = critical */
  criticalPriorityMax: 2,
  /** Priority 3 (medium) overdue = high */
  highPriorityMax: 3,
  /** Days overdue threshold for escalating severity */
  daysOverdueEscalation: 7,
} as const;

/**
 * Determine timeline conflict severity based on task priority
 */
export function getTimelineSeverity(priority: number): ConflictSeverity {
  if (priority <= TIMELINE_THRESHOLDS.criticalPriorityMax) {
    return "critical";
  }
  if (priority <= TIMELINE_THRESHOLDS.highPriorityMax) {
    return "high";
  }
  return "medium";
}

// ============================================================================
// FINANCIAL CONFLICTS (Cost overruns, margin erosion)
// ============================================================================

/**
 * Financial conflicts use percentage-based thresholds for cost and margin variance.
 */
export const FINANCIAL_THRESHOLDS = {
  /** Negative margin (unprofitable) = critical */
  criticalMarginThreshold: 0,
  /** Margin erosion > 10% = critical */
  criticalMarginVariance: -10,
  /** Cost overrun > 25% of budget = high */
  highCostOverrunPercent: 0.25,
  /** Margin erosion > 5% = high */
  highMarginVariance: -5,
} as const;

/**
 * Determine financial conflict severity based on margin and cost metrics
 */
export function getFinancialSeverity(
  actualMarginPct: number,
  marginVariance: number,
  costVariance: number,
  budgetedCost: number
): ConflictSeverity {
  // Negative margin (unprofitable event) is always critical
  if (actualMarginPct < FINANCIAL_THRESHOLDS.criticalMarginThreshold) {
    return "critical";
  }

  // Severe margin erosion (> 10%)
  if (marginVariance < FINANCIAL_THRESHOLDS.criticalMarginVariance) {
    return "critical";
  }

  // Cost overrun > 25% of budget
  if (
    budgetedCost > 0 &&
    costVariance > budgetedCost * FINANCIAL_THRESHOLDS.highCostOverrunPercent
  ) {
    return "high";
  }

  // Moderate margin erosion (> 5%)
  if (marginVariance < FINANCIAL_THRESHOLDS.highMarginVariance) {
    return "high";
  }

  return "medium";
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * All threshold configurations grouped by conflict type for easy access
 */
export const CONFLICT_SEVERITY_THRESHOLDS = {
  scheduling: SCHEDULING_THRESHOLDS,
  staff: STAFF_THRESHOLDS,
  inventory: INVENTORY_THRESHOLDS,
  venue: VENUE_THRESHOLDS,
  equipment: EQUIPMENT_THRESHOLDS,
  timeline: TIMELINE_THRESHOLDS,
  financial: FINANCIAL_THRESHOLDS,
} as const;
