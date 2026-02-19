/**
 * Conflicts Detection API Endpoint
 *
 * POST /api/conflicts/detect - Detect conflicts in operations data
 *
 * Detects various types of conflicts:
 * - Scheduling: Double-booked staff, overlapping shifts
 * - Resource: Equipment conflicts, venue conflicts
 * - Staff: Availability conflicts, time-off conflicts
 * - Inventory: Stock shortages for events
 * - Timeline: Task dependency violations, deadline risks
 * - Financial: Cost overruns, margin erosion, profitability risks
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  Conflict,
  ConflictDetectionRequest,
  ConflictDetectionResult,
  ConflictSeverity,
  ConflictType,
} from "./types";

const SEVERITY_ORDER: Record<ConflictSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Detect scheduling conflicts (double-booked staff, overlapping shifts)
 */
async function detectSchedulingConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find overlapping shifts for the same employee
  const overlappingShifts = await database.$queryRaw<
    Array<{
      employee_id: string;
      employee_name: string;
      shift_count: number;
      date: Date;
    }>
  >`
    SELECT
      e.id as employee_id,
      TRIM(CONCAT_WS(' ', e.first_name, e.last_name)) as employee_name,
      COUNT(*) as shift_count,
      s.date
    FROM tenant_staff.schedule_shifts ss
    JOIN tenant_staff.shifts s ON ss.shift_id = s.id
    JOIN tenant_staff.employees e ON s.employee_id = e.id
      AND e.tenant_id = ss.tenant_id
      AND e.deleted_at IS NULL
    WHERE ss.tenant_id = ${tenantId}::uuid
      AND ss.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND s.date BETWEEN ${startDate} AND ${endDate}
      AND s.status != 'cancelled'
    GROUP BY e.id, e.first_name, e.last_name, s.date
    HAVING COUNT(*) > 1
    ORDER BY s.date, shift_count DESC
    LIMIT 20
  `;

  for (const overlap of overlappingShifts) {
    conflicts.push({
      id: `scheduling-overlap-${overlap.employee_id}-${overlap.date.toISOString()}`,
      type: "scheduling",
      severity: overlap.shift_count > 2 ? "critical" : "high",
      title: `Double-booked employee: ${overlap.employee_name}`,
      description: `${overlap.employee_name} is scheduled for ${overlap.shift_count} shifts on ${overlap.date.toLocaleDateString()}`,
      affectedEntities: [
        {
          type: "employee",
          id: overlap.employee_id,
          name: overlap.employee_name,
        },
      ],
      suggestedAction: "Review and resolve conflicting shift assignments",
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Detect staff conflicts (availability vs scheduled shifts, time-off)
 */
async function detectStaffConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find shifts scheduled during time-off requests
  const shiftsDuringTimeOff = await database.$queryRaw<
    Array<{
      employee_id: string;
      employee_name: string;
      time_off_date: Date;
      shift_count: number;
    }>
  >`
    SELECT
      e.id as employee_id,
      TRIM(CONCAT_WS(' ', e.first_name, e.last_name)) as employee_name,
      tor.start_date as time_off_date,
      COUNT(*) as shift_count
    FROM tenant_staff.time_off_requests tor
    JOIN tenant_staff.employees e ON tor.employee_id = e.id
      AND e.tenant_id = tor.tenant_id
      AND e.deleted_at IS NULL
    JOIN tenant_staff.schedule_shifts ss ON ss.tenant_id = tor.tenant_id
    JOIN tenant_staff.shifts s ON s.id = ss.shift_id
    WHERE tor.tenant_id = ${tenantId}::uuid
      AND tor.deleted_at IS NULL
      AND tor.status = 'approved'
      AND s.deleted_at IS NULL
      AND s.date = tor.start_date::date
      AND s.date BETWEEN ${startDate} AND ${endDate}
    GROUP BY e.id, e.first_name, e.last_name, tor.start_date
    ORDER BY tor.start_date
    LIMIT 20
  `;

  for (const conflict of shiftsDuringTimeOff) {
    conflicts.push({
      id: `staff-timeoff-${conflict.employee_id}-${conflict.time_off_date.toISOString()}`,
      type: "staff",
      severity: "high",
      title: `Shift during approved time-off: ${conflict.employee_name}`,
      description: `${conflict.employee_name} has ${conflict.shift_count} shift(s) scheduled during approved time-off on ${conflict.time_off_date.toLocaleDateString()}`,
      affectedEntities: [
        {
          type: "employee",
          id: conflict.employee_id,
          name: conflict.employee_name,
        },
      ],
      suggestedAction: "Reassign shifts or adjust time-off request",
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Detect inventory conflicts (stock shortages for upcoming events)
 */
async function detectInventoryConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const _endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find active inventory alerts
  const activeAlerts = await database.$queryRaw<
    Array<{
      alert_id: string;
      item_id: string;
      item_name: string;
      alert_type: string;
      threshold_value: string;
      triggered_at: Date;
    }>
  >`
    SELECT
      ia.id as alert_id,
      ia.item_id,
      COALESCE(ii.name, 'Unknown Item') as item_name,
      ia.alert_type,
      ia.threshold_value::text as threshold_value,
      ia.triggered_at
    FROM tenant_inventory.inventory_alerts ia
    LEFT JOIN tenant_inventory.inventory_items ii ON ii.id = ia.item_id
    WHERE ia.tenant_id = ${tenantId}::uuid
      AND ia.deleted_at IS NULL
      AND ia.resolved_at IS NULL
      AND ia.triggered_at >= ${startDate}
    ORDER BY ia.triggered_at DESC
    LIMIT 20
  `;

  for (const alert of activeAlerts) {
    const severity = alert.alert_type === "critical" ? "critical" : "medium";

    conflicts.push({
      id: `inventory-alert-${alert.alert_id}`,
      type: "inventory",
      severity,
      title: `Inventory ${alert.alert_type}: ${alert.item_name}`,
      description: `${alert.item_name} is ${alert.alert_type} (threshold: ${alert.threshold_value})`,
      affectedEntities: [
        {
          type: "inventory",
          id: alert.item_id,
          name: alert.item_name,
        },
      ],
      suggestedAction:
        severity === "critical"
          ? "Reorder stock immediately or find alternative"
          : "Monitor stock levels and consider reordering",
      createdAt: alert.triggered_at,
    });
  }

  return conflicts;
}

/**
 * Detect venue conflicts (multiple events at same venue on same date)
 */
async function detectVenueConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find multiple events at same venue on same date
  const venueConflicts = await database.$queryRaw<
    Array<{
      venue_id: string;
      venue_name: string;
      event_date: Date;
      event_count: number;
      event_ids: string[];
      event_titles: string[];
    }>
  >`
    SELECT
      v.id as venue_id,
      v.name as venue_name,
      e.event_date,
      COUNT(*) as event_count,
      ARRAY_AGG(e.id ORDER BY e.title) as event_ids,
      ARRAY_AGG(e.title ORDER BY e.title) as event_titles
    FROM tenant_events.events e
    JOIN tenant.locations v ON e.venue_id = v.id
    WHERE e.tenant_id = ${tenantId}::uuid
      AND e.deleted_at IS NULL
      AND v.deleted_at IS NULL
      AND e.venue_id IS NOT NULL
      AND e.event_date BETWEEN ${startDate}::date AND ${endDate}::date
      AND e.status NOT IN ('cancelled', 'completed')
    GROUP BY v.id, v.name, e.event_date
    HAVING COUNT(*) > 1
    ORDER BY e.event_date, event_count DESC
    LIMIT 20
  `;

  for (const conflict of venueConflicts) {
    let severity: "critical" | "high" | "medium";
    if (conflict.event_count > 2) {
      severity = "critical";
    } else if (conflict.event_count > 1) {
      severity = "high";
    } else {
      severity = "medium";
    }

    conflicts.push({
      id: `venue-conflict-${conflict.venue_id}-${conflict.event_date.toISOString()}`,
      type: "venue",
      severity,
      title: `Multiple events at ${conflict.venue_name} on ${conflict.event_date.toLocaleDateString()}`,
      description: `${conflict.event_count} event(s) scheduled at ${conflict.venue_name} on ${conflict.event_date.toLocaleDateString()}: ${conflict.event_titles.join(", ")}`,
      affectedEntities: [
        {
          type: "venue",
          id: conflict.venue_id,
          name: conflict.venue_name,
        },
        ...conflict.event_ids.map((eventId, index) => ({
          type: "event" as const,
          id: eventId,
          name: conflict.event_titles[index] ?? "Unknown Event",
        })),
      ],
      suggestedAction:
        conflict.event_count > 2
          ? "Critical: Review all events immediately - reschedule some to alternative venues"
          : "Review event schedules and consider rescheduling to an alternative venue or date",
      resolutionOptions: [
        {
          type: "reschedule",
          description: "Move one or more events to a different date",
          affectedEntities: conflict.event_ids.map((eventId, index) => ({
            type: "event" as const,
            id: eventId,
            name: conflict.event_titles[index] ?? "Unknown Event",
          })),
          estimatedImpact: conflict.event_count > 2 ? "high" : "medium",
        },
      ],
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Detect timeline conflicts (task dependency violations, deadline risks)
 */
async function detectTimelineConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const _startDate = timeRange?.start || now;
  const _endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find incomplete high-priority tasks past due date
  const overdueTasks = await database.$queryRaw<
    Array<{
      task_id: string;
      task_name: string;
      due_date: Date;
      priority: string;
      days_overdue: number;
    }>
  >`
    SELECT
      pt.id as task_id,
      pt.name as task_name,
      pt.due_by_date as due_date,
      pt.priority,
      EXTRACT(DAY FROM (${now} - pt.due_by_date))::int as days_overdue
    FROM tenant_kitchen.prep_tasks pt
    WHERE pt.tenant_id = ${tenantId}::uuid
      AND pt.deleted_at IS NULL
      AND pt.status != 'completed'
      AND pt.due_by_date < ${now}
      AND pt.priority IN ('high', 'urgent')
    ORDER BY pt.due_by_date ASC
    LIMIT 20
  `;

  for (const task of overdueTasks) {
    conflicts.push({
      id: `timeline-overdue-${task.task_id}`,
      type: "timeline",
      severity: task.priority === "urgent" ? "critical" : "high",
      title: `Overdue ${task.priority} task: ${task.task_name}`,
      description: `${task.task_name} is ${task.days_overdue} day(s) overdue (was due ${task.due_date.toLocaleDateString()})`,
      affectedEntities: [
        {
          type: "task",
          id: task.task_id,
          name: task.task_name,
        },
      ],
      suggestedAction: "Prioritize this task immediately or adjust timeline",
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Determine financial risk severity and messaging
 */
function getFinancialRiskInfo(
  eventTitle: string,
  budgetedCost: number,
  actualMarginPct: number,
  budgetedMarginPct: number,
  costVariance: number,
  marginVariance: number
): {
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
} {
  if (actualMarginPct < 0) {
    return {
      severity: "critical",
      title: `Unprofitable event: ${eventTitle}`,
      description: `${eventTitle} has a negative margin (${actualMarginPct.toFixed(1)}%). Immediate review required.`,
    };
  }

  if (marginVariance < -10) {
    return {
      severity: "critical",
      title: `Severe margin erosion: ${eventTitle}`,
      description: `${eventTitle} margin dropped ${Math.abs(marginVariance).toFixed(1)}% (from ${budgetedMarginPct.toFixed(1)}% to ${actualMarginPct.toFixed(1)}%).`,
    };
  }

  if (budgetedCost > 0 && costVariance > budgetedCost * 0.25) {
    const percentOver = ((costVariance / budgetedCost) * 100).toFixed(0);
    return {
      severity: "high",
      title: `Cost overrun: ${eventTitle}`,
      description: `${eventTitle} is over budget by $${costVariance.toFixed(0)} (${percentOver}% over budget).`,
    };
  }

  if (marginVariance < -5) {
    return {
      severity: "high",
      title: `Margin erosion: ${eventTitle}`,
      description: `${eventTitle} margin dropped ${Math.abs(marginVariance).toFixed(1)}% (from ${budgetedMarginPct.toFixed(1)}% to ${actualMarginPct.toFixed(1)}%).`,
    };
  }

  const percentOver =
    budgetedCost > 0 ? ((costVariance / budgetedCost) * 100).toFixed(0) : "0";
  return {
    severity: "medium",
    title: `Cost variance: ${eventTitle}`,
    description: `${eventTitle} has cost variance of $${costVariance.toFixed(0)} (${percentOver}% over budget).`,
  };
}

/**
 * Detect financial conflicts (cost overruns, margin erosion, profitability risks)
 */
async function detectFinancialConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate =
    timeRange?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate =
    timeRange?.end || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const financialRisks = await database.$queryRaw<
    Array<{
      event_id: string;
      event_title: string;
      budgeted_total_cost: string;
      budgeted_gross_margin_pct: string;
      actual_gross_margin_pct: string;
      cost_variance: string;
      margin_variance_pct: string;
    }>
  >`
    SELECT
      e.id as event_id,
      e.title as event_title,
      COALESCE(ep.budgeted_total_cost, 0)::text as budgeted_total_cost,
      COALESCE(ep.budgeted_gross_margin_pct, 0)::text as budgeted_gross_margin_pct,
      COALESCE(ep.actual_gross_margin_pct, 0)::text as actual_gross_margin_pct,
      COALESCE(ep.total_cost_variance, 0)::text as cost_variance,
      COALESCE(ep.margin_variance_pct, 0)::text as margin_variance_pct
    FROM tenant_events.events e
    LEFT JOIN tenant_events.event_profitability ep ON ep.event_id = e.id AND ep.deleted_at IS NULL
    WHERE e.tenant_id = ${tenantId}::uuid
      AND e.deleted_at IS NULL
      AND e.event_date BETWEEN ${startDate}::date AND ${endDate}::date
      AND e.status NOT IN ('cancelled', 'completed')
      AND (
        (ep.actual_total_cost > ep.budgeted_total_cost * 1.1)
        OR (ep.budgeted_gross_margin_pct - ep.actual_gross_margin_pct) > 5
        OR (ep.actual_gross_margin_pct < 0)
      )
    ORDER BY ABS(ep.margin_variance_pct) DESC
    LIMIT 20
  `;

  for (const risk of financialRisks) {
    const budgetedCost = Number.parseFloat(risk.budgeted_total_cost) || 0;
    const actualMarginPct =
      Number.parseFloat(risk.actual_gross_margin_pct) || 0;
    const budgetedMarginPct =
      Number.parseFloat(risk.budgeted_gross_margin_pct) || 0;
    const costVariance = Number.parseFloat(risk.cost_variance) || 0;
    const marginVariance = Number.parseFloat(risk.margin_variance_pct) || 0;

    const { severity, title, description } = getFinancialRiskInfo(
      risk.event_title,
      budgetedCost,
      actualMarginPct,
      budgetedMarginPct,
      costVariance,
      marginVariance
    );

    conflicts.push({
      id: `financial-risk-${risk.event_id}`,
      type: "financial",
      severity,
      title,
      description,
      affectedEntities: [
        {
          type: "event",
          id: risk.event_id,
          name: risk.event_title,
        },
      ],
      suggestedAction:
        severity === "critical"
          ? "Review event costs immediately - consider menu adjustments, staffing changes, or price renegotiation"
          : "Analyze cost breakdown and identify areas for optimization",
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Detect equipment conflicts (same equipment needed at overlapping events)
 */
async function detectEquipmentConflicts(
  tenantId: string,
  timeRange?: { start: Date; end: Date }
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find equipment being used at multiple events on the same date
  // Equipment is tracked via stations (equipmentList) linked through prep lists to events
  const equipmentConflicts = await database.$queryRaw<
    Array<{
      equipment_name: string;
      event_date: Date;
      event_count: number;
      event_ids: string[];
      event_titles: string[];
      station_ids: string[];
      station_names: string[];
    }>
  >`
    WITH event_equipment AS (
      SELECT DISTINCT
        e.id as event_id,
        e.title as event_title,
        e.event_date,
        s.id as station_id,
        s.name as station_name,
        unnest(s.equipment_list) as equipment_name
      FROM tenant_events.events e
      JOIN tenant_kitchen.prep_lists pl ON pl.event_id = e.id AND pl.tenant_id = e.tenant_id AND pl.deleted_at IS NULL
      JOIN tenant_kitchen.prep_list_items pli ON pli.prep_list_id = pl.id AND pli.tenant_id = pl.tenant_id AND pli.deleted_at IS NULL
      JOIN tenant_kitchen.stations s ON s.id = pli.station_id AND s.tenant_id = pli.tenant_id AND s.deleted_at IS NULL
      WHERE e.tenant_id = ${tenantId}::uuid
        AND e.deleted_at IS NULL
        AND e.event_date BETWEEN ${startDate}::date AND ${endDate}::date
        AND e.status NOT IN ('cancelled', 'completed')
        AND cardinality(s.equipment_list) > 0
    )
    SELECT
      equipment_name,
      event_date,
      COUNT(DISTINCT event_id) as event_count,
      ARRAY_AGG(DISTINCT event_id ORDER BY event_id) as event_ids,
      ARRAY_AGG(DISTINCT event_title ORDER BY event_id) as event_titles,
      ARRAY_AGG(DISTINCT station_id) as station_ids,
      ARRAY_AGG(DISTINCT station_name) as station_names
    FROM event_equipment
    GROUP BY equipment_name, event_date
    HAVING COUNT(DISTINCT event_id) > 1
    ORDER BY event_date, event_count DESC
    LIMIT 20
  `;

  for (const conflict of equipmentConflicts) {
    let severity: "critical" | "high" | "medium";
    if (conflict.event_count > 2) {
      severity = "critical";
    } else if (conflict.event_count > 1) {
      severity = "high";
    } else {
      severity = "medium";
    }

    conflicts.push({
      id: `equipment-conflict-${conflict.equipment_name.replace(/\s+/g, "-").toLowerCase()}-${conflict.event_date.toISOString()}`,
      type: "equipment",
      severity,
      title: `Equipment conflict: ${conflict.equipment_name}`,
      description: `${conflict.equipment_name} is needed at ${conflict.event_count} event(s) on ${conflict.event_date.toLocaleDateString()}: ${conflict.event_titles.filter((t): t is string => t !== null).join(", ")}`,
      affectedEntities: [
        {
          type: "equipment",
          id: conflict.equipment_name,
          name: conflict.equipment_name,
        },
        ...conflict.event_ids.map((eventId, index) => ({
          type: "event" as const,
          id: eventId,
          name: conflict.event_titles[index] ?? "Unknown Event",
        })),
      ],
      suggestedAction:
        conflict.event_count > 2
          ? `Critical: ${conflict.equipment_name} is required by multiple events - arrange additional equipment or adjust schedules`
          : `Review if ${conflict.equipment_name} can be shared between events or arrange alternative equipment`,
      resolutionOptions: [
        {
          type: "substitute",
          description:
            "Rent or source additional equipment for one or more events",
          affectedEntities: conflict.event_ids.map((eventId, index) => ({
            type: "event" as const,
            id: eventId,
            name: conflict.event_titles[index] ?? "Unknown Event",
          })),
          estimatedImpact: conflict.event_count > 2 ? "high" : "medium",
        },
        {
          type: "reschedule",
          description:
            "Adjust event timing to allow equipment sharing with setup/breakdown buffer",
          affectedEntities: conflict.event_ids.map((eventId, index) => ({
            type: "event" as const,
            id: eventId,
            name: conflict.event_titles[index] ?? "Unknown Event",
          })),
          estimatedImpact: "medium",
        },
      ],
      createdAt: new Date(),
    });
  }

  return conflicts;
}

/**
 * Build conflict summary
 */
function buildConflictSummary(conflicts: Conflict[]) {
  const summary = {
    total: conflicts.length,
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    } as Record<ConflictSeverity, number>,
    byType: {
      scheduling: 0,
      resource: 0,
      staff: 0,
      inventory: 0,
      equipment: 0,
      timeline: 0,
      venue: 0,
      financial: 0,
    } as Record<ConflictType, number>,
  };

  for (const conflict of conflicts) {
    summary.bySeverity[conflict.severity]++;
    summary.byType[conflict.type]++;
  }

  return summary;
}

/**
 * POST /api/conflicts/detect
 * Detect conflicts across operations data
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as ConflictDetectionRequest;
    const { timeRange, entityTypes } = body;

    const conflicts: Conflict[] = [];

    // Detect conflicts by type
    if (!entityTypes || entityTypes.includes("scheduling")) {
      conflicts.push(...(await detectSchedulingConflicts(tenantId, timeRange)));
    }

    if (!entityTypes || entityTypes.includes("staff")) {
      conflicts.push(...(await detectStaffConflicts(tenantId, timeRange)));
    }

    if (!entityTypes || entityTypes.includes("inventory")) {
      conflicts.push(...(await detectInventoryConflicts(tenantId, timeRange)));
    }

    if (!entityTypes || entityTypes.includes("equipment")) {
      conflicts.push(...(await detectEquipmentConflicts(tenantId, timeRange)));
    }

    if (!entityTypes || entityTypes.includes("timeline")) {
      conflicts.push(...(await detectTimelineConflicts(tenantId, timeRange)));
    }

    if (!entityTypes || entityTypes.includes("venue")) {
      conflicts.push(...(await detectVenueConflicts(tenantId, timeRange)));
    }

    if (!entityTypes || entityTypes.includes("financial")) {
      conflicts.push(...(await detectFinancialConflicts(tenantId, timeRange)));
    }

    // Sort by severity (critical first)
    conflicts.sort(
      (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
    );

    const result: ConflictDetectionResult = {
      conflicts,
      summary: buildConflictSummary(conflicts),
      analyzedAt: new Date(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Conflicts detection error:", error);
    return NextResponse.json(
      {
        message: "Failed to detect conflicts",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
