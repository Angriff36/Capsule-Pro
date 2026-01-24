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
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const SEVERITY_ORDER = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
/**
 * Detect scheduling conflicts (double-booked staff, overlapping shifts)
 */
async function detectSchedulingConflicts(tenantId, timeRange) {
  const conflicts = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Find overlapping shifts for the same employee
  const overlappingShifts = await database_1.database.$queryRaw`
    SELECT
      e.id as employee_id,
      e.name as employee_name,
      COUNT(*) as shift_count,
      s.date
    FROM tenant_staff.schedule_shifts ss
    JOIN tenant_staff.shifts s ON ss.shift_id = s.id
    JOIN public.users e ON s.employee_id = e.id
    WHERE ss.tenant_id = ${tenantId}::uuid
      AND ss.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND s.date BETWEEN ${startDate} AND ${endDate}
      AND s.status != 'cancelled'
    GROUP BY e.id, e.name, s.date
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
async function detectStaffConflicts(tenantId, timeRange) {
  const conflicts = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Find shifts scheduled during time-off requests
  const shiftsDuringTimeOff = await database_1.database.$queryRaw`
    SELECT
      e.id as employee_id,
      e.name as employee_name,
      tor.start_date as time_off_date,
      COUNT(*) as shift_count
    FROM tenant_staff.time_off_requests tor
    JOIN public.users e ON tor.employee_id = e.id
    JOIN tenant_staff.schedule_shifts ss ON ss.tenant_id = tor.tenant_id
    JOIN tenant_staff.shifts s ON s.id = ss.shift_id
    WHERE tor.tenant_id = ${tenantId}::uuid
      AND tor.deleted_at IS NULL
      AND tor.status = 'approved'
      AND s.deleted_at IS NULL
      AND s.date = tor.start_date::date
      AND s.date BETWEEN ${startDate} AND ${endDate}
    GROUP BY e.id, e.name, tor.start_date
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
async function detectInventoryConflicts(tenantId, timeRange) {
  const conflicts = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Find active inventory alerts
  const activeAlerts = await database_1.database.$queryRaw`
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
 * Detect timeline conflicts (task dependency violations, deadline risks)
 */
async function detectTimelineConflicts(tenantId, timeRange) {
  const conflicts = [];
  const now = new Date();
  const startDate = timeRange?.start || now;
  const endDate =
    timeRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Find incomplete high-priority tasks past due date
  const overdueTasks = await database_1.database.$queryRaw`
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
 * Build conflict summary
 */
function buildConflictSummary(conflicts) {
  const summary = {
    total: conflicts.length,
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    byType: {
      scheduling: 0,
      resource: 0,
      staff: 0,
      inventory: 0,
      timeline: 0,
    },
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
async function POST(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const body = await request.json();
    const { timeRange, entityTypes } = body;
    const conflicts = [];
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
    if (!entityTypes || entityTypes.includes("timeline")) {
      conflicts.push(...(await detectTimelineConflicts(tenantId, timeRange)));
    }
    // Sort by severity (critical first)
    conflicts.sort(
      (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
    );
    const result = {
      conflicts,
      summary: buildConflictSummary(conflicts),
      analyzedAt: new Date(),
    };
    return server_2.NextResponse.json(result);
  } catch (error) {
    console.error("Conflicts detection error:", error);
    return server_2.NextResponse.json(
      {
        message: "Failed to detect conflicts",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
