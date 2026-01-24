"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getShifts = getShifts;
exports.getShift = getShift;
exports.getAvailableEmployees = getAvailableEmployees;
exports.createShift = createShift;
exports.updateShift = updateShift;
exports.deleteShift = deleteShift;
exports.getEmployees = getEmployees;
exports.getLocations = getLocations;
exports.getSchedules = getSchedules;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const cache_1 = require("next/cache");
const tenant_1 = require("@/app/lib/tenant");
/**
 * Get all shifts with optional filters
 */
async function getShifts(params) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Not authenticated");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) {
    throw new Error("No tenant found");
  }
  const limit = params.limit ?? 50;
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;
  // Build filters
  const hasStartDate = params.startDate !== undefined;
  const hasEndDate = params.endDate !== undefined;
  const hasEmployeeId = params.employeeId !== undefined;
  const hasLocationId = params.locationId !== undefined;
  const hasRole = params.role !== undefined;
  // Fetch shifts and count
  const [shifts, totalCount] = await Promise.all([
    database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT
          ss.id,
          ss.schedule_id,
          ss.employee_id,
          e.first_name AS employee_first_name,
          e.last_name AS employee_last_name,
          e.email AS employee_email,
          e.role AS employee_role,
          ss.location_id,
          l.name AS location_name,
          ss.shift_start,
          ss.shift_end,
          ss.role_during_shift,
          ss.notes,
          ss.created_at,
          ss.updated_at
        FROM tenant_staff.schedule_shifts ss
        JOIN tenant_staff.employees e
          ON e.tenant_id = ss.tenant_id
         AND e.id = ss.employee_id
        JOIN tenant.locations l
          ON l.tenant_id = ss.tenant_id
         AND l.id = ss.location_id
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          ${hasStartDate ? database_1.Prisma.sql`AND ss.shift_start >= ${new Date(params.startDate)}` : database_1.Prisma.empty}
          ${hasEndDate ? database_1.Prisma.sql`AND ss.shift_end <= ${new Date(params.endDate)}` : database_1.Prisma.empty}
          ${hasEmployeeId ? database_1.Prisma.sql`AND ss.employee_id = ${params.employeeId}` : database_1.Prisma.empty}
          ${hasLocationId ? database_1.Prisma.sql`AND ss.location_id = ${params.locationId}` : database_1.Prisma.empty}
          ${hasRole ? database_1.Prisma.sql`AND ss.role_during_shift = ${params.role}` : database_1.Prisma.empty}
        ORDER BY ss.shift_start ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `),
    database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.schedule_shifts ss
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          ${hasStartDate ? database_1.Prisma.sql`AND ss.shift_start >= ${new Date(params.startDate)}` : database_1.Prisma.empty}
          ${hasEndDate ? database_1.Prisma.sql`AND ss.shift_end <= ${new Date(params.endDate)}` : database_1.Prisma.empty}
          ${hasEmployeeId ? database_1.Prisma.sql`AND ss.employee_id = ${params.employeeId}` : database_1.Prisma.empty}
          ${hasLocationId ? database_1.Prisma.sql`AND ss.location_id = ${params.locationId}` : database_1.Prisma.empty}
          ${hasRole ? database_1.Prisma.sql`AND ss.role_during_shift = ${params.role}` : database_1.Prisma.empty}
      `),
  ]);
  return {
    shifts,
    pagination: {
      page,
      limit,
      total: Number(totalCount[0].count),
      totalPages: Math.ceil(Number(totalCount[0].count) / limit),
    },
  };
}
/**
 * Get a single shift by ID
 */
async function getShift(shiftId) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  const [shift] = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        ss.id,
        ss.schedule_id,
        ss.employee_id,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        e.role AS employee_role,
        ss.location_id,
        l.name AS location_name,
        ss.shift_start,
        ss.shift_end,
        ss.role_during_shift,
        ss.notes,
        ss.created_at,
        ss.updated_at
      FROM tenant_staff.schedule_shifts ss
      JOIN tenant_staff.employees e
        ON e.tenant_id = ss.tenant_id
       AND e.id = ss.employee_id
      JOIN tenant.locations l
        ON l.tenant_id = ss.tenant_id
       AND l.id = ss.location_id
      WHERE ss.tenant_id = ${tenantId}
        AND ss.id = ${shiftId}
        AND ss.deleted_at IS NULL
    `);
  if (!shift) {
    throw new Error("Shift not found");
  }
  return { shift };
}
/**
 * Get available employees for a shift time slot
 */
async function getAvailableEmployees(params) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  const startDate = new Date(params.shiftStart);
  const endDate = new Date(params.shiftEnd);
  // Get all active employees
  const employees = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.role,
        e.is_active,
        COALESCE(
          EXISTS(
            SELECT 1
            FROM tenant_staff.schedule_shifts ss
            WHERE ss.tenant_id = e.tenant_id
              AND ss.employee_id = e.id
              AND ss.deleted_at IS NULL
              AND ss.shift_start < ${endDate}
              AND ss.shift_end > ${startDate}
              ${params.excludeShiftId ? database_1.Prisma.sql`AND ss.id != ${params.excludeShiftId}` : database_1.Prisma.empty}
          ),
          false
        ) AS has_conflicting_shift
      FROM tenant_staff.employees e
      WHERE e.tenant_id = ${tenantId}
        AND e.deleted_at IS NULL
        AND e.is_active = true
        ${params.requiredRole ? database_1.Prisma.sql`AND e.role = ${params.requiredRole}` : database_1.Prisma.empty}
      ORDER BY e.last_name ASC, e.first_name ASC
    `);
  // For employees with conflicts, get their conflicting shifts
  const employeesWithConflicts = await Promise.all(
    employees.map(async (emp) => {
      if (!emp.has_conflicting_shift) {
        return {
          ...emp,
          hasConflictingShift: false,
          conflictingShifts: [],
        };
      }
      const conflictingShifts = await database_1.database.$queryRaw(database_1
        .Prisma.sql`
          SELECT
            ss.id,
            ss.shift_start,
            ss.shift_end,
            l.name AS location_name
          FROM tenant_staff.schedule_shifts ss
          JOIN tenant.locations l ON l.id = ss.location_id
          WHERE ss.tenant_id = ${tenantId}
            AND ss.employee_id = ${emp.id}
            AND ss.deleted_at IS NULL
            AND ss.shift_start < ${endDate}
            AND ss.shift_end > ${startDate}
            ${params.excludeShiftId ? database_1.Prisma.sql`AND ss.id != ${params.excludeShiftId}` : database_1.Prisma.empty}
          ORDER BY ss.shift_start ASC
        `);
      return {
        ...emp,
        hasConflictingShift: true,
        conflictingShifts: conflictingShifts.map((cs) => ({
          id: cs.id,
          shiftStart: cs.shift_start,
          shiftEnd: cs.shift_end,
          locationName: cs.location_name,
        })),
      };
    })
  );
  return { employees: employeesWithConflicts };
}
/**
 * Create a new shift
 */
async function createShift(formData) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  const scheduleId = formData.get("scheduleId");
  const employeeId = formData.get("employeeId");
  const locationId = formData.get("locationId");
  const shiftStart = formData.get("shiftStart");
  const shiftEnd = formData.get("shiftEnd");
  const roleDuringShift = formData.get("roleDuringShift");
  const notes = formData.get("notes");
  const allowHistorical = formData.get("allowHistorical") === "true";
  const allowOverlap = formData.get("allowOverlap") === "true";
  // Validate required fields
  if (!(scheduleId && employeeId && locationId && shiftStart && shiftEnd)) {
    throw new Error("Schedule, employee, location, and times are required");
  }
  const startDate = new Date(shiftStart);
  const endDate = new Date(shiftEnd);
  // Validate shift times
  if (endDate <= startDate) {
    throw new Error("End time must be after start time");
  }
  if (!allowHistorical && endDate < new Date()) {
    throw new Error("Cannot create shifts in the past");
  }
  // Check for overlapping shifts
  if (!allowOverlap) {
    const [overlap] = await database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.schedule_shifts
        WHERE tenant_id = ${tenantId}
          AND employee_id = ${employeeId}
          AND deleted_at IS NULL
          AND shift_start < ${endDate}
          AND shift_end > ${startDate}
      `);
    if (Number(overlap.count) > 0) {
      throw new Error("Employee has overlapping shifts");
    }
  }
  // Create the shift
  const shift = await database_1.database.scheduleShift.create({
    data: {
      tenantId,
      scheduleId,
      employeeId,
      locationId,
      shift_start: startDate,
      shift_end: endDate,
      role_during_shift: roleDuringShift || null,
      notes: notes || null,
    },
  });
  (0, cache_1.revalidatePath)("/scheduling/shifts");
  return { shift };
}
/**
 * Update an existing shift
 */
async function updateShift(shiftId, formData) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  const scheduleId = formData.get("scheduleId");
  const employeeId = formData.get("employeeId");
  const locationId = formData.get("locationId");
  const shiftStart = formData.get("shiftStart");
  const shiftEnd = formData.get("shiftEnd");
  const roleDuringShift = formData.get("roleDuringShift");
  const notes = formData.get("notes");
  const allowOverlap = formData.get("allowOverlap") === "true";
  // Validate required fields
  if (!(scheduleId && employeeId && locationId && shiftStart && shiftEnd)) {
    throw new Error("Schedule, employee, location, and times are required");
  }
  const startDate = new Date(shiftStart);
  const endDate = new Date(shiftEnd);
  // Validate shift times
  if (endDate <= startDate) {
    throw new Error("End time must be after start time");
  }
  // Check for overlapping shifts (excluding current shift)
  if (!allowOverlap) {
    const [overlap] = await database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT COUNT(*)::bigint
        FROM tenant_staff.schedule_shifts
        WHERE tenant_id = ${tenantId}
          AND employee_id = ${employeeId}
          AND id != ${shiftId}
          AND deleted_at IS NULL
          AND shift_start < ${endDate}
          AND shift_end > ${startDate}
      `);
    if (Number(overlap.count) > 0) {
      throw new Error("Employee has overlapping shifts");
    }
  }
  // Update the shift
  const shift = await database_1.database.scheduleShift.update({
    where: {
      tenantId_id: {
        tenantId,
        id: shiftId,
      },
    },
    data: {
      scheduleId,
      employeeId,
      locationId,
      shift_start: startDate,
      shift_end: endDate,
      role_during_shift: roleDuringShift || null,
      notes: notes || null,
    },
  });
  (0, cache_1.revalidatePath)("/scheduling/shifts");
  return { shift };
}
/**
 * Delete a shift
 */
async function deleteShift(shiftId) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  await database_1.database.scheduleShift.update({
    where: {
      tenantId_id: {
        tenantId,
        id: shiftId,
      },
    },
    data: {
      deletedAt: new Date(),
    },
  });
  (0, cache_1.revalidatePath)("/scheduling/shifts");
  return { success: true };
}
/**
 * Get all employees for dropdown
 */
async function getEmployees() {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  const employees = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        is_active
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY last_name ASC, first_name ASC
    `);
  return { employees };
}
/**
 * Get all locations for dropdown
 */
async function getLocations() {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  const locations = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        id,
        name,
        is_active
      FROM tenant.locations
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY name ASC
    `);
  return { locations };
}
/**
 * Get all schedules for dropdown
 */
async function getSchedules() {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) throw new Error("Not authenticated");
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  if (!tenantId) throw new Error("No tenant found");
  const schedules = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        id,
        schedule_date,
        status
      FROM tenant_staff.schedules
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY schedule_date DESC
      LIMIT 100
    `);
  return { schedules };
}
