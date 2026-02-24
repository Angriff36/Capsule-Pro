import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import type { ShiftOverlap } from "./types";

/**
 * Validates shift timing requirements
 */
export function validateShiftTimes(
  shiftStart: Date,
  shiftEnd: Date,
  allowHistorical?: boolean
): NextResponse | null {
  if (shiftEnd <= shiftStart) {
    return NextResponse.json(
      { message: "Shift end time must be after start time" },
      { status: 400 }
    );
  }

  const now = new Date();
  if (shiftEnd < now && !allowHistorical) {
    return NextResponse.json(
      {
        message:
          "Cannot create shifts in the past. Use allowHistorical flag for historical data entry.",
      },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Verifies an employee exists and is active
 */
export async function verifyEmployee(
  tenantId: string,
  employeeId: string
): Promise<{
  employee: { id: string; role: string; is_active: boolean } | null;
  error: NextResponse | null;
}> {
  const employee = await database.$queryRaw<
    Array<{ id: string; role: string; is_active: boolean }>
  >(
    Prisma.sql`
      SELECT id, role, is_active
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND id = ${employeeId}
        AND deleted_at IS NULL
    `
  );

  if (!employee[0]) {
    return {
      employee: null,
      error: NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      ),
    };
  }

  if (!employee[0].is_active) {
    return {
      employee: null,
      error: NextResponse.json(
        { message: "Cannot assign shift to inactive employee" },
        { status: 400 }
      ),
    };
  }

  return { employee: employee[0], error: null };
}

/**
 * Validates employee role matches required role
 */
export function validateEmployeeRole(
  employeeRole: string,
  requiredRole?: string
): NextResponse | null {
  if (requiredRole && employeeRole !== requiredRole) {
    return NextResponse.json(
      {
        message: `Employee role (${employeeRole}) does not match required role (${requiredRole})`,
      },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Checks for overlapping shifts for an employee
 */
export async function checkOverlappingShifts(
  tenantId: string,
  employeeId: string,
  shiftStart: Date,
  shiftEnd: Date,
  excludeShiftId?: string
): Promise<{ overlaps: ShiftOverlap[]; error: NextResponse | null }> {
  const overlappingShifts = await database.$queryRaw<
    Array<{ id: string; shift_start: Date; shift_end: Date }>
  >(
    Prisma.sql`
      SELECT id, shift_start, shift_end
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        ${excludeShiftId ? Prisma.sql`AND id != ${excludeShiftId}` : Prisma.empty}
        AND deleted_at IS NULL
        AND (
          (shift_start < ${shiftEnd}) AND (shift_end > ${shiftStart})
        )
    `
  );

  return {
    overlaps: overlappingShifts,
    error: null,
  };
}

/**
 * Verifies a schedule exists
 */
export async function verifySchedule(
  tenantId: string,
  scheduleId: string
): Promise<{
  schedule: { id: string; status: string } | null;
  error: NextResponse | null;
}> {
  const schedule = await database.$queryRaw<
    Array<{ id: string; status: string }>
  >(
    Prisma.sql`
      SELECT id, status
      FROM tenant_staff.schedules
      WHERE tenant_id = ${tenantId}
        AND id = ${scheduleId}
        AND deleted_at IS NULL
    `
  );

  if (!schedule[0]) {
    return {
      schedule: null,
      error: NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      ),
    };
  }

  return { schedule: schedule[0], error: null };
}

/**
 * Overtime warning threshold (hours per week)
 */
const OVERTIME_WARNING_THRESHOLD_HOURS = 40;
const OVERTIME_BLOCK_THRESHOLD_HOURS = 60;

/**
 * Calculates weekly hours for an employee including the proposed shift
 * Returns WARN if approaching overtime, BLOCK if would exceed maximum
 */
export async function checkOvertimeHours(
  tenantId: string,
  employeeId: string,
  shiftStart: Date,
  shiftEnd: Date,
  excludeShiftId?: string
): Promise<{
  currentWeekHours: number;
  projectedHours: number;
  severity: "OK" | "WARN" | "BLOCK";
  message: string;
  error: NextResponse | null;
}> {
  // Get start of week (Monday)
  const weekStart = new Date(shiftStart);
  weekStart.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = weekStart.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setUTCDate(weekStart.getUTCDate() - diffToMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  // Calculate proposed shift duration in hours
  const proposedHours = (shiftEnd.getTime() - shiftStart.getTime()) / 3600000;

  // Query existing shifts for the week
  const existingShifts = await database.$queryRaw<
    Array<{ id: string; shift_start: Date; shift_end: Date }>
  >(
    Prisma.sql`
      SELECT id, shift_start, shift_end
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        AND deleted_at IS NULL
        AND shift_start >= ${weekStart}
        AND shift_end < ${weekEnd}
        ${excludeShiftId ? Prisma.sql`AND id != ${excludeShiftId}` : Prisma.empty}
    `
  );

  // Calculate current week hours
  let currentWeekHours = 0;
  for (const shift of existingShifts) {
    currentWeekHours +=
      (shift.shift_end.getTime() - shift.shift_start.getTime()) / 3600000;
  }

  const projectedHours = currentWeekHours + proposedHours;

  if (projectedHours > OVERTIME_BLOCK_THRESHOLD_HOURS) {
    return {
      currentWeekHours,
      projectedHours,
      severity: "BLOCK",
      message: `Shift would result in ${projectedHours.toFixed(1)} hours this week, exceeding the maximum of ${OVERTIME_BLOCK_THRESHOLD_HOURS} hours`,
      error: NextResponse.json(
        {
          message: "Overtime limit exceeded",
          code: "overtime_limit_exceeded",
          severity: "BLOCK",
          details: {
            currentWeekHours: currentWeekHours.toFixed(1),
            projectedHours: projectedHours.toFixed(1),
            proposedShiftHours: proposedHours.toFixed(1),
            maxHours: OVERTIME_BLOCK_THRESHOLD_HOURS,
          },
        },
        { status: 422 }
      ),
    };
  }

  if (projectedHours > OVERTIME_WARNING_THRESHOLD_HOURS) {
    return {
      currentWeekHours,
      projectedHours,
      severity: "WARN",
      message: `Shift would result in ${projectedHours.toFixed(1)} hours this week, exceeding standard ${OVERTIME_WARNING_THRESHOLD_HOURS} hour threshold`,
      error: null, // WARN doesn't block, but UI should display the warning
    };
  }

  return {
    currentWeekHours,
    projectedHours,
    severity: "OK",
    message: "",
    error: null,
  };
}

/**
 * Role-to-certification mapping
 * Maps role names to required certification types
 */
const ROLE_CERTIFICATION_REQUIREMENTS: Record<string, string[]> = {
  chef: ["food_safety"],
  line_cook: ["food_safety"],
  prep_cook: ["food_safety"],
  sous_chef: ["food_safety", "culinary_certification"],
  kitchen_lead: ["food_safety", "management_certification"],
  manager: ["food_safety", "management_certification"],
  bartender: ["alcohol_service"],
  server: ["food_safety"],
};

/**
 * Checks if employee has required certifications for a role
 * Returns BLOCK if required certification is missing or expired
 */
export async function checkCertificationRequirements(
  tenantId: string,
  employeeId: string,
  roleDuringShift: string
): Promise<{
  hasRequiredCerts: boolean;
  missingCerts: string[];
  expiredCerts: { type: string; name: string; expiryDate: Date }[];
  severity: "OK" | "WARN" | "BLOCK";
  message: string;
  error: NextResponse | null;
}> {
  // Normalize role name
  const normalizedRole = roleDuringShift.toLowerCase().replace(/\s+/g, "_");

  // Get required certifications for role
  const requiredCerts =
    ROLE_CERTIFICATION_REQUIREMENTS[normalizedRole] || [];

  // No certification requirements for this role
  if (requiredCerts.length === 0) {
    return {
      hasRequiredCerts: true,
      missingCerts: [],
      expiredCerts: [],
      severity: "OK",
      message: "",
      error: null,
    };
  }

  // Get employee's certifications
  const certifications = await database.$queryRaw<
    Array<{
      id: string;
      certification_type: string;
      certification_name: string;
      expiry_date: Date | null;
    }>
  >(
    Prisma.sql`
      SELECT id, certification_type, certification_name, expiry_date
      FROM tenant_staff.employee_certifications
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        AND deleted_at IS NULL
    `
  );

  const now = new Date();
  const missingCerts: string[] = [];
  const expiredCerts: { type: string; name: string; expiryDate: Date }[] = [];

  // Check each required certification
  for (const requiredType of requiredCerts) {
    const cert = certifications.find(
      (c) => c.certification_type === requiredType
    );

    if (!cert) {
      missingCerts.push(requiredType);
    } else if (cert.expiry_date && new Date(cert.expiry_date) < now) {
      expiredCerts.push({
        type: requiredType,
        name: cert.certification_name,
        expiryDate: new Date(cert.expiry_date),
      });
    }
  }

  if (missingCerts.length > 0 || expiredCerts.length > 0) {
    const messages: string[] = [];
    if (missingCerts.length > 0) {
      messages.push(`Missing certifications: ${missingCerts.join(", ")}`);
    }
    if (expiredCerts.length > 0) {
      messages.push(
        `Expired certifications: ${expiredCerts.map((e) => e.name).join(", ")}`
      );
    }

    return {
      hasRequiredCerts: false,
      missingCerts,
      expiredCerts,
      severity: "BLOCK",
      message: messages.join("; "),
      error: NextResponse.json(
        {
          message: "Certification requirements not met",
          code: "certification_required",
          severity: "BLOCK",
          details: {
            roleDuringShift,
            missingCerts,
            expiredCerts: expiredCerts.map((e) => ({
              type: e.type,
              name: e.name,
              expiryDate: e.expiryDate.toISOString(),
            })),
          },
        },
        { status: 422 }
      ),
    };
  }

  return {
    hasRequiredCerts: true,
    missingCerts: [],
    expiredCerts: [],
    severity: "OK",
    message: "",
    error: null,
  };
}

/**
 * Combined validation result for shift operations
 */
export interface ShiftValidationResult {
  valid: boolean;
  employee: { id: string; role: string; is_active: boolean } | null;
  schedule: { id: string; status: string } | null;
  overlaps: ShiftOverlap[];
  overtime: {
    severity: "OK" | "WARN" | "BLOCK";
    currentWeekHours: number;
    projectedHours: number;
    message: string;
  };
  certifications: {
    severity: "OK" | "WARN" | "BLOCK";
    missingCerts: string[];
    expiredCerts: { type: string; name: string; expiryDate: Date }[];
    message: string;
  };
  error: NextResponse | null;
}

/**
 * Performs all shift validations and returns combined result
 * Use this for comprehensive pre-validation before manifest runtime
 */
export async function validateShift(
  tenantId: string,
  body: {
    scheduleId: string;
    employeeId: string;
    shiftStart: number;
    shiftEnd: number;
    roleDuringShift?: string;
  },
  excludeShiftId?: string
): Promise<ShiftValidationResult> {
  // 1. Verify employee exists and is active
  const { employee, error: employeeError } = await verifyEmployee(
    tenantId,
    body.employeeId
  );
  if (employeeError) {
    return {
      valid: false,
      employee: null,
      schedule: null,
      overlaps: [],
      overtime: { severity: "OK", currentWeekHours: 0, projectedHours: 0, message: "" },
      certifications: { severity: "OK", missingCerts: [], expiredCerts: [], message: "" },
      error: employeeError,
    };
  }

  // 2. Verify schedule exists
  const { schedule, error: scheduleError } = await verifySchedule(
    tenantId,
    body.scheduleId
  );
  if (scheduleError) {
    return {
      valid: false,
      employee,
      schedule: null,
      overlaps: [],
      overtime: { severity: "OK", currentWeekHours: 0, projectedHours: 0, message: "" },
      certifications: { severity: "OK", missingCerts: [], expiredCerts: [], message: "" },
      error: scheduleError,
    };
  }

  const shiftStart = new Date(body.shiftStart);
  const shiftEnd = new Date(body.shiftEnd);

  // 3. Check for overlapping shifts
  const { overlaps } = await checkOverlappingShifts(
    tenantId,
    body.employeeId,
    shiftStart,
    shiftEnd,
    excludeShiftId
  );

  if (overlaps.length > 0) {
    return {
      valid: false,
      employee,
      schedule,
      overlaps,
      overtime: { severity: "OK", currentWeekHours: 0, projectedHours: 0, message: "" },
      certifications: { severity: "OK", missingCerts: [], expiredCerts: [], message: "" },
      error: NextResponse.json(
        {
          message: "Overlapping shifts detected",
          code: "shift_overlap",
          severity: "BLOCK",
          details: {
            overlappingShifts: overlaps.map((o) => ({
              id: o.id,
              start: o.shift_start.toISOString(),
              end: o.shift_end.toISOString(),
            })),
          },
        },
        { status: 422 }
      ),
    };
  }

  // 4. Check overtime hours
  const overtimeResult = await checkOvertimeHours(
    tenantId,
    body.employeeId,
    shiftStart,
    shiftEnd,
    excludeShiftId
  );

  if (overtimeResult.severity === "BLOCK") {
    return {
      valid: false,
      employee,
      schedule,
      overlaps: [],
      overtime: {
        severity: overtimeResult.severity,
        currentWeekHours: overtimeResult.currentWeekHours,
        projectedHours: overtimeResult.projectedHours,
        message: overtimeResult.message,
      },
      certifications: { severity: "OK", missingCerts: [], expiredCerts: [], message: "" },
      error: overtimeResult.error,
    };
  }

  // 5. Check certification requirements (if role specified)
  let certResult = {
    severity: "OK" as const,
    missingCerts: [] as string[],
    expiredCerts: [] as { type: string; name: string; expiryDate: Date }[],
    message: "",
  };

  if (body.roleDuringShift) {
    const certCheck = await checkCertificationRequirements(
      tenantId,
      body.employeeId,
      body.roleDuringShift
    );
    certResult = {
      severity: certCheck.severity,
      missingCerts: certCheck.missingCerts,
      expiredCerts: certCheck.expiredCerts,
      message: certCheck.message,
    };

    if (certCheck.severity === "BLOCK") {
      return {
        valid: false,
        employee,
        schedule,
        overlaps: [],
        overtime: {
          severity: overtimeResult.severity,
          currentWeekHours: overtimeResult.currentWeekHours,
          projectedHours: overtimeResult.projectedHours,
          message: overtimeResult.message,
        },
        certifications: certResult,
        error: certCheck.error,
      };
    }
  }

  // All validations passed (may have warnings)
  return {
    valid: true,
    employee,
    schedule,
    overlaps: [],
    overtime: {
      severity: overtimeResult.severity,
      currentWeekHours: overtimeResult.currentWeekHours,
      projectedHours: overtimeResult.projectedHours,
      message: overtimeResult.message,
    },
    certifications: certResult,
    error: null,
  };
}
