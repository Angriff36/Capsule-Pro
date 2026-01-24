/**
 * Labor Budget Service
 *
 * This service handles labor budget tracking, utilization calculation,
 * and alert generation for staff scheduling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLaborBudgets = getLaborBudgets;
exports.getLaborBudgetById = getLaborBudgetById;
exports.createLaborBudget = createLaborBudget;
exports.updateLaborBudget = updateLaborBudget;
exports.deleteLaborBudget = deleteLaborBudget;
exports.calculateBudgetUtilization = calculateBudgetUtilization;
exports.checkBudgetForShift = checkBudgetForShift;
exports.createBudgetAlert = createBudgetAlert;
exports.getBudgetAlerts = getBudgetAlerts;
exports.acknowledgeBudgetAlert = acknowledgeBudgetAlert;
exports.resolveBudgetAlert = resolveBudgetAlert;
const database_1 = require("@repo/database");
/**
 * Get all budgets for a tenant with optional filtering
 */
async function getLaborBudgets(tenantId, filters) {
  const whereClause = [database_1.Prisma.sql`lb.tenant_id = ${tenantId}`];
  if (filters?.locationId) {
    whereClause.push(
      database_1.Prisma.sql`AND lb.location_id = ${filters.locationId}`
    );
  }
  if (filters?.eventId) {
    whereClause.push(
      database_1.Prisma.sql`AND lb.event_id = ${filters.eventId}`
    );
  }
  if (filters?.budgetType) {
    whereClause.push(
      database_1.Prisma.sql`AND lb.budget_type = ${filters.budgetType}`
    );
  }
  if (filters?.status) {
    whereClause.push(database_1.Prisma.sql`AND lb.status = ${filters.status}`);
  }
  whereClause.push(database_1.Prisma.sql`AND lb.deleted_at IS NULL`);
  const budgets = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        lb.tenant_id,
        lb.id,
        lb.location_id,
        lb.event_id,
        lb.name,
        lb.description,
        lb.budget_type,
        lb.period_start,
        lb.period_end,
        lb.budget_target,
        lb.budget_unit,
        lb.actual_spend,
        lb.threshold_80_pct,
        lb.threshold_90_pct,
        lb.threshold_100_pct,
        lb.status,
        lb.override_reason,
        lb.created_at,
        lb.updated_at
      FROM tenant_staff.labor_budgets lb
      WHERE ${database_1.Prisma.join(whereClause, " ")}
      ORDER BY lb.created_at DESC
    `);
  return budgets;
}
/**
 * Get a single budget by ID with current utilization
 */
async function getLaborBudgetById(tenantId, budgetId) {
  const budget = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        lb.tenant_id,
        lb.id,
        lb.location_id,
        lb.event_id,
        lb.name,
        lb.description,
        lb.budget_type,
        lb.period_start,
        lb.period_end,
        lb.budget_target,
        lb.budget_unit,
        lb.actual_spend,
        lb.threshold_80_pct,
        lb.threshold_90_pct,
        lb.threshold_100_pct,
        lb.status,
        lb.override_reason,
        lb.created_at,
        lb.updated_at
      FROM tenant_staff.labor_budgets lb
      WHERE lb.tenant_id = ${tenantId}
        AND lb.id = ${budgetId}
        AND lb.deleted_at IS NULL
    `);
  if (!budget || budget.length === 0) {
    return null;
  }
  // Get current utilization
  const utilization = await calculateBudgetUtilization(tenantId, budgetId);
  return {
    ...budget[0],
    utilization,
  };
}
/**
 * Create a new labor budget
 */
async function createLaborBudget(input) {
  const {
    tenantId,
    locationId,
    eventId,
    name,
    description,
    budgetType,
    periodStart,
    periodEnd,
    budgetTarget,
    budgetUnit,
    threshold80Pct = true,
    threshold90Pct = true,
    threshold100Pct = true,
  } = input;
  // Validate event budget has event_id
  if (budgetType === "event" && !eventId) {
    throw new Error("Event budgets must have an event_id");
  }
  // Validate period budgets have dates
  if (
    (budgetType === "week" || budgetType === "month") &&
    !(periodStart && periodEnd)
  ) {
    throw new Error(
      "Period budgets must have period_start and period_end dates"
    );
  }
  const result = await database_1.database.$queryRaw(database_1.Prisma.sql`
      INSERT INTO tenant_staff.labor_budgets (
        tenant_id,
        location_id,
        event_id,
        name,
        description,
        budget_type,
        period_start,
        period_end,
        budget_target,
        budget_unit,
        threshold_80_pct,
        threshold_90_pct,
        threshold_100_pct,
        status
      ) VALUES (
        ${tenantId},
        ${locationId || null},
        ${eventId || null},
        ${name},
        ${description || null},
        ${budgetType},
        ${periodStart || null},
        ${periodEnd || null},
        ${budgetTarget},
        ${budgetUnit},
        ${threshold80Pct},
        ${threshold90Pct},
        ${threshold100Pct},
        'active'
      )
      RETURNING id, name
    `);
  return result[0];
}
/**
 * Update a labor budget
 */
async function updateLaborBudget(tenantId, budgetId, updates) {
  const updateFields = [];
  const values = [];
  if (updates.name !== undefined) {
    updateFields.push("name = $2");
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    updateFields.push(`description = $${values.length + 2}`);
    values.push(updates.description);
  }
  if (updates.budgetTarget !== undefined) {
    updateFields.push(`budget_target = $${values.length + 2}`);
    values.push(updates.budgetTarget);
  }
  if (updates.status !== undefined) {
    updateFields.push(`status = $${values.length + 2}`);
    values.push(updates.status);
  }
  if (updates.overrideReason !== undefined) {
    updateFields.push(`override_reason = $${values.length + 2}`);
    values.push(updates.overrideReason);
  }
  if (updates.threshold80Pct !== undefined) {
    updateFields.push(`threshold_80_pct = $${values.length + 2}`);
    values.push(updates.threshold80Pct);
  }
  if (updates.threshold90Pct !== undefined) {
    updateFields.push(`threshold_90_pct = $${values.length + 2}`);
    values.push(updates.threshold90Pct);
  }
  if (updates.threshold100Pct !== undefined) {
    updateFields.push(`threshold_100_pct = $${values.length + 2}`);
    values.push(updates.threshold100Pct);
  }
  if (updateFields.length === 0) {
    return null;
  }
  updateFields.push("updated_at = CURRENT_TIMESTAMP");
  const result = await database_1.database.$queryRaw(database_1.Prisma.sql`
      UPDATE tenant_staff.labor_budgets
      SET ${database_1.Prisma.join(
        updateFields.map((f) => database_1.Prisma.raw(f)),
        ", "
      )}
      WHERE tenant_id = ${tenantId}
        AND id = ${budgetId}
        AND deleted_at IS NULL
      RETURNING id, name
    `);
  return result[0] || null;
}
/**
 * Delete (soft delete) a labor budget
 */
async function deleteLaborBudget(tenantId, budgetId) {
  await database_1.database.$queryRaw(database_1.Prisma.sql`
      UPDATE tenant_staff.labor_budgets
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId}
        AND id = ${budgetId}
        AND deleted_at IS NULL
    `);
  return { success: true };
}
/**
 * Calculate budget utilization for a specific budget
 */
async function calculateBudgetUtilization(tenantId, budgetId) {
  const budget = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        id,
        name,
        budget_type,
        budget_target,
        budget_unit,
        period_start,
        period_end,
        location_id,
        event_id
      FROM tenant_staff.labor_budgets
      WHERE tenant_id = ${tenantId}
        AND id = ${budgetId}
        AND deleted_at IS NULL
        AND status = 'active'
    `);
  if (!budget || budget.length === 0) {
    return null;
  }
  const budgetData = budget[0];
  let actualSpend = 0;
  if (budgetData.budget_unit === "hours") {
    actualSpend = await calculateScheduledHours(tenantId, budgetId, budgetData);
  } else {
    actualSpend = await calculateScheduledCost(tenantId, budgetId, budgetData);
  }
  const utilizationPct = (actualSpend / budgetData.budget_target) * 100;
  const remainingBudget = budgetData.budget_target - actualSpend;
  return {
    budgetId: budgetData.id,
    budgetName: budgetData.name,
    budgetType: budgetData.budget_type,
    budgetTarget: budgetData.budget_target,
    budgetUnit: budgetData.budget_unit,
    actualSpend,
    utilizationPct: Math.round(utilizationPct * 100) / 100,
    remainingBudget,
    periodStart: budgetData.period_start || undefined,
    periodEnd: budgetData.period_end || undefined,
    status: "active",
  };
}
/**
 * Calculate scheduled hours for a budget
 */
async function calculateScheduledHours(tenantId, budgetId, budget) {
  const conditions = [
    database_1.Prisma.sql`ss.tenant_id = ${tenantId}`,
    database_1.Prisma.sql`ss.deleted_at IS NULL`,
  ];
  if (budget.location_id) {
    conditions.push(
      database_1.Prisma.sql`ss.location_id = ${budget.location_id}`
    );
  }
  if (budget.event_id) {
    conditions.push(database_1.Prisma.sql`ss.event_id = ${budget.event_id}`);
  }
  if (budget.period_start && budget.period_end) {
    conditions.push(
      database_1.Prisma.sql`ss.shift_start >= ${budget.period_start}`,
      database_1.Prisma.sql`ss.shift_end <= ${budget.period_end}`
    );
  }
  const result = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        COALESCE(SUM(EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600), 0) AS total_hours
      FROM tenant_staff.schedule_shifts ss
      WHERE ${database_1.Prisma.join(conditions, " AND ")}
    `);
  return result[0]?.total_hours || 0;
}
/**
 * Calculate scheduled cost for a budget
 */
async function calculateScheduledCost(tenantId, budgetId, budget) {
  const conditions = [
    database_1.Prisma.sql`ss.tenant_id = ${tenantId}`,
    database_1.Prisma.sql`ss.deleted_at IS NULL`,
  ];
  if (budget.location_id) {
    conditions.push(
      database_1.Prisma.sql`ss.location_id = ${budget.location_id}`
    );
  }
  if (budget.event_id) {
    conditions.push(database_1.Prisma.sql`ss.event_id = ${budget.event_id}`);
  }
  if (budget.period_start && budget.period_end) {
    conditions.push(
      database_1.Prisma.sql`ss.shift_start >= ${budget.period_start}`,
      database_1.Prisma.sql`ss.shift_end <= ${budget.period_end}`
    );
  }
  const result = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        COALESCE(
          SUM(
            EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600 *
            COALESCE(e.hourly_rate, 0)
          ),
          0
        ) AS total_cost
      FROM tenant_staff.schedule_shifts ss
      LEFT JOIN tenant_staff.employees e ON e.tenant_id = ss.tenant_id AND e.id = ss.employee_id AND e.deleted_at IS NULL
      WHERE ss.employee_id IS NOT NULL
        AND ${database_1.Prisma.join(conditions, " AND ")}
    `);
  return result[0]?.total_cost || 0;
}
/**
 * Check if assigning a shift would exceed budget
 */
async function checkBudgetForShift(tenantId, shiftRequirement) {
  // Find applicable budgets
  const budgets = await getApplicableBudgets(
    tenantId,
    shiftRequirement.locationId,
    shiftRequirement.eventId,
    shiftRequirement.shiftStart
  );
  if (budgets.length === 0) {
    return { withinBudget: true };
  }
  // Calculate the cost/hours for this shift
  const shiftHours =
    (shiftRequirement.shiftEnd.getTime() -
      shiftRequirement.shiftStart.getTime()) /
    (1000 * 60 * 60);
  const shiftCost = (shiftRequirement.hourlyRate || 0) * shiftHours;
  const shiftValue = shiftCost > 0 ? shiftCost : shiftHours;
  let worstWarning;
  let worstUtilization = 0;
  for (const budget of budgets) {
    const utilization = await calculateBudgetUtilization(tenantId, budget.id);
    if (!utilization) continue;
    const newUtilization = utilization.actualSpend + shiftValue;
    const newUtilizationPct = (newUtilization / utilization.budgetTarget) * 100;
    if (newUtilizationPct >= 100) {
      return {
        withinBudget: false,
        budgetWarning: `This shift would exceed the "${utilization.budgetName}" budget ($${newUtilization.toFixed(2)} of $${utilization.budgetTarget.toFixed(2)})`,
        utilizationAfter: newUtilizationPct,
      };
    }
    if (newUtilizationPct >= 90 && budget.threshold_90_pct) {
      worstWarning = `Warning: This shift would bring the "${utilization.budgetName}" budget to ${newUtilizationPct.toFixed(0)}%`;
      worstUtilization = Math.max(worstUtilization, newUtilizationPct);
    } else if (newUtilizationPct >= 80 && budget.threshold_80_pct) {
      worstWarning =
        worstWarning ||
        `Notice: This shift would bring the "${utilization.budgetName}" budget to ${newUtilizationPct.toFixed(0)}%`;
      worstUtilization = Math.max(worstUtilization, newUtilizationPct);
    }
  }
  return {
    withinBudget: true,
    budgetWarning: worstWarning,
    utilizationAfter: worstUtilization || undefined,
  };
}
/**
 * Get applicable budgets for a shift
 */
async function getApplicableBudgets(tenantId, locationId, eventId, shiftStart) {
  const conditions = [
    database_1.Prisma.sql`lb.tenant_id = ${tenantId}`,
    database_1.Prisma.sql`lb.status = 'active'`,
    database_1.Prisma.sql`lb.deleted_at IS NULL`,
  ];
  // Match location (location-specific OR tenant-wide)
  conditions.push(
    database_1.Prisma
      .sql`(lb.location_id = ${locationId} OR lb.location_id IS NULL)`
  );
  // Match event if specified
  if (eventId) {
    conditions.push(
      database_1.Prisma.sql`(lb.event_id = ${eventId} OR lb.event_id IS NULL)`
    );
  } else {
    conditions.push(database_1.Prisma.sql`lb.event_id IS NULL`);
  }
  // Match period budgets by date
  if (shiftStart) {
    conditions.push(database_1.Prisma.sql`(
        lb.budget_type = 'event' OR
        (lb.budget_type IN ('week', 'month') AND
         lb.period_start IS NOT NULL AND
         lb.period_end IS NOT NULL AND
         ${shiftStart}::date >= lb.period_start AND
         ${shiftStart}::date <= lb.period_end)
      )`);
  }
  const budgets = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        lb.id,
        lb.threshold_80_pct,
        lb.threshold_90_pct,
        lb.threshold_100_pct
      FROM tenant_staff.labor_budgets lb
      WHERE ${database_1.Prisma.join(conditions, " AND ")}
      ORDER BY
        lb.location_id NULLS LAST,
        lb.event_id NULLS LAST
    `);
  return budgets;
}
/**
 * Create a budget alert
 */
async function createBudgetAlert(input) {
  await database_1.database.$queryRaw(database_1.Prisma.sql`
      INSERT INTO tenant_staff.budget_alerts (
        tenant_id,
        budget_id,
        alert_type,
        utilization,
        message
      ) VALUES (
        ${input.tenantId},
        ${input.budgetId},
        ${input.alertType},
        ${input.utilization},
        ${input.message}
      )
    `);
  return { success: true };
}
/**
 * Get budget alerts for a tenant
 */
async function getBudgetAlerts(tenantId, filters) {
  const conditions = [
    database_1.Prisma.sql`ba.tenant_id = ${tenantId}`,
    database_1.Prisma.sql`ba.deleted_at IS NULL`,
  ];
  if (filters?.budgetId) {
    conditions.push(database_1.Prisma.sql`ba.budget_id = ${filters.budgetId}`);
  }
  if (filters?.isAcknowledged !== undefined) {
    conditions.push(
      database_1.Prisma.sql`ba.is_acknowledged = ${filters.isAcknowledged}`
    );
  }
  if (filters?.alertType) {
    conditions.push(
      database_1.Prisma.sql`ba.alert_type = ${filters.alertType}`
    );
  }
  const alerts = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        ba.id,
        ba.budget_id,
        ba.alert_type,
        ba.utilization,
        ba.message,
        ba.is_acknowledged,
        ba.acknowledged_by,
        ba.acknowledged_at,
        ba.resolved,
        ba.resolved_at,
        ba.created_at
      FROM tenant_staff.budget_alerts ba
      WHERE ${database_1.Prisma.join(conditions, " AND ")}
      ORDER BY ba.created_at DESC
    `);
  return alerts;
}
/**
 * Acknowledge a budget alert
 */
async function acknowledgeBudgetAlert(tenantId, alertId, acknowledgedBy) {
  await database_1.database.$queryRaw(database_1.Prisma.sql`
      UPDATE tenant_staff.budget_alerts
      SET
        is_acknowledged = true,
        acknowledged_by = ${acknowledgedBy},
        acknowledged_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId}
        AND id = ${alertId}
        AND deleted_at IS NULL
    `);
  return { success: true };
}
/**
 * Resolve a budget alert
 */
async function resolveBudgetAlert(tenantId, alertId) {
  await database_1.database.$queryRaw(database_1.Prisma.sql`
      UPDATE tenant_staff.budget_alerts
      SET
        resolved = true,
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId}
        AND id = ${alertId}
        AND deleted_at IS NULL
    `);
  return { success: true };
}
