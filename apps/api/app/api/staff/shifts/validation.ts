import { database } from "@repo/database";
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
  const employee = await database.user.findFirst({
    where: { tenantId, id: employeeId, deletedAt: null },
    select: { id: true, role: true, isActive: true },
  });

  if (!employee) {
    return {
      employee: null,
      error: NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      ),
    };
  }

  if (!employee.isActive) {
    return {
      employee: null,
      error: NextResponse.json(
        { message: "Cannot assign shift to inactive employee" },
        { status: 400 }
      ),
    };
  }

  return {
    employee: {
      id: employee.id,
      role: employee.role,
      is_active: employee.isActive,
    },
    error: null,
  };
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
  const overlappingShifts = await database.scheduleShift.findMany({
    where: {
      tenantId,
      employeeId,
      ...(excludeShiftId ? { id: { not: excludeShiftId } } : {}),
      deletedAt: null,
      shiftStart: { lt: shiftEnd },
      shiftEnd: { gt: shiftStart },
    },
    select: { id: true, shiftStart: true, shiftEnd: true },
  });

  return {
    overlaps: overlappingShifts.map((s) => ({
      id: s.id,
      shift_start: s.shiftStart,
      shift_end: s.shiftEnd,
    })),
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
  const schedule = await database.schedule.findFirst({
    where: { tenantId, id: scheduleId, deletedAt: null },
    select: { id: true, status: true },
  });

  if (!schedule) {
    return {
      schedule: null,
      error: NextResponse.json(
        { message: "Schedule not found" },
        { status: 404 }
      ),
    };
  }

  return { schedule, error: null };
}

/**
 * Overtime warning threshold (hours per week)
 */
const OVERTIME_WARNING_THRESHOLD_HOURS = 40;
const OVERTIME_BLOCK_THRESHOLD_HOURS = 60;

function formatTime(value: Date): string {
  return [
    value.getUTCHours().toString().padStart(2, "0"),
    value.getUTCMinutes().toString().padStart(2, "0"),
    value.getUTCSeconds().toString().padStart(2, "0"),
  ].join(":");
}

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
  const proposedHours = (shiftEnd.getTime() - shiftStart.getTime()) / 3_600_000;

  // Query existing shifts for the week
  const existingShifts = await database.scheduleShift.findMany({
    where: {
      tenantId,
      employeeId,
      deletedAt: null,
      shiftStart: { gte: weekStart },
      shiftEnd: { lt: weekEnd },
      ...(excludeShiftId ? { id: { not: excludeShiftId } } : {}),
    },
    select: { id: true, shiftStart: true, shiftEnd: true },
  });

  // Calculate current week hours
  let currentWeekHours = 0;
  for (const shift of existingShifts) {
    currentWeekHours +=
      (shift.shiftEnd.getTime() - shift.shiftStart.getTime()) / 3_600_000;
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
  const requiredCerts = ROLE_CERTIFICATION_REQUIREMENTS[normalizedRole] || [];

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
  const certificationRecords = await database.employeeCertification.findMany({
    where: { tenantId, employeeId, deletedAt: null },
    select: {
      id: true,
      certificationType: true,
      certificationName: true,
      expiryDate: true,
    },
  });
  const certifications = certificationRecords.map((certification) => ({
    id: certification.id,
    certification_type: certification.certificationType,
    certification_name: certification.certificationName,
    expiry_date: certification.expiryDate,
  }));

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
 * Checks if a shift falls within the employee's declared availability window.
 * Returns WARN if the shift is outside availability (not BLOCK — managers can override).
 */
export async function checkShiftAgainstAvailability(
  tenantId: string,
  employeeId: string,
  shiftStart: Date,
  shiftEnd: Date
): Promise<{
  withinAvailability: boolean;
  availabilityWindows: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
  severity: "OK" | "WARN";
  message: string;
}> {
  // Get day of week for shift (0=Sunday, 1=Monday, etc.)
  const dayOfWeek = shiftStart.getUTCDay();

  const availabilityRecords = await database.employeeAvailability.findMany({
    where: {
      tenantId,
      employeeId,
      dayOfWeek,
      deletedAt: null,
    },
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      isAvailable: true,
    },
  });
  const availability = availabilityRecords.map((record) => ({
    day_of_week: record.dayOfWeek,
    start_time: formatTime(record.startTime),
    end_time: formatTime(record.endTime),
    is_available: record.isAvailable,
  }));

  // If no availability records exist for this day, we can't warn
  if (availability.length === 0) {
    return {
      withinAvailability: true,
      availabilityWindows: [],
      severity: "OK",
      message: "",
    };
  }

  // Check if any "available" window covers the shift
  const shiftStartMinutes =
    shiftStart.getUTCHours() * 60 + shiftStart.getUTCMinutes();
  const shiftEndMinutes =
    shiftEnd.getUTCHours() * 60 + shiftEnd.getUTCMinutes();

  const availableWindows = availability.filter(
    (a) => a.is_available && a.start_time && a.end_time
  );

  const isCovered = availableWindows.some((window) => {
    const [wStartH, wStartM] = window.start_time!.split(":").map(Number);
    const [wEndH, wEndM] = window.end_time!.split(":").map(Number);
    const windowStart = wStartH * 60 + wStartM;
    const windowEnd = wEndH * 60 + wEndM;
    return shiftStartMinutes >= windowStart && shiftEndMinutes <= windowEnd;
  });

  if (!isCovered) {
    const formattedWindows = availableWindows.map((w) => {
      const dayName = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][w.day_of_week];
      return `${dayName} ${w.start_time}-${w.end_time}`;
    });
    return {
      withinAvailability: false,
      availabilityWindows: availability.map((a) => ({
        dayOfWeek: a.day_of_week,
        startTime: a.start_time ?? "",
        endTime: a.end_time ?? "",
        isAvailable: a.is_available,
      })),
      severity: "WARN",
      message: `Shift falls outside employee's availability window. Available: ${formattedWindows.join(", ") || "no regular hours on this day"}`,
    };
  }

  return {
    withinAvailability: true,
    availabilityWindows: availability.map((a) => ({
      dayOfWeek: a.day_of_week,
      startTime: a.start_time ?? "",
      endTime: a.end_time ?? "",
      isAvailable: a.is_available,
    })),
    severity: "OK",
    message: "",
  };
}

/**
 * Combined validation result for shift operations
 */
export interface ShiftValidationResult {
  availability: {
    severity: "OK" | "WARN";
    withinAvailability: boolean;
    message: string;
    availabilityWindows: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }[];
  };
  certifications: {
    severity: "OK" | "WARN" | "BLOCK";
    missingCerts: string[];
    expiredCerts: { type: string; name: string; expiryDate: Date }[];
    message: string;
  };
  employee: { id: string; role: string; is_active: boolean } | null;
  error: NextResponse | null;
  overlaps: ShiftOverlap[];
  overtime: {
    severity: "OK" | "WARN" | "BLOCK";
    currentWeekHours: number;
    projectedHours: number;
    message: string;
  };
  schedule: { id: string; status: string } | null;
  valid: boolean;
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
  excludeShiftId?: string,
  options?: { allowOverlap?: boolean; ignoreAvailabilityWarning?: boolean }
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
      overtime: {
        severity: "OK",
        currentWeekHours: 0,
        projectedHours: 0,
        message: "",
      },
      certifications: {
        severity: "OK",
        missingCerts: [],
        expiredCerts: [],
        message: "",
      },
      availability: {
        severity: "OK",
        withinAvailability: true,
        message: "",
        availabilityWindows: [],
      },
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
      overtime: {
        severity: "OK",
        currentWeekHours: 0,
        projectedHours: 0,
        message: "",
      },
      certifications: {
        severity: "OK",
        missingCerts: [],
        expiredCerts: [],
        message: "",
      },
      availability: {
        severity: "OK",
        withinAvailability: true,
        message: "",
        availabilityWindows: [],
      },
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

  if (overlaps.length > 0 && !options?.allowOverlap) {
    return {
      valid: false,
      employee,
      schedule,
      overlaps,
      overtime: {
        severity: "OK",
        currentWeekHours: 0,
        projectedHours: 0,
        message: "",
      },
      certifications: {
        severity: "OK",
        missingCerts: [],
        expiredCerts: [],
        message: "",
      },
      availability: {
        severity: "OK",
        withinAvailability: true,
        message: "",
        availabilityWindows: [],
      },
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
      certifications: {
        severity: "OK",
        missingCerts: [],
        expiredCerts: [],
        message: "",
      },
      availability: {
        severity: "OK",
        withinAvailability: true,
        message: "",
        availabilityWindows: [],
      },
      error: overtimeResult.error,
    };
  }

  // 5. Check certification requirements (if role specified)
  let certResult: {
    severity: "OK" | "WARN" | "BLOCK";
    missingCerts: string[];
    expiredCerts: { type: string; name: string; expiryDate: Date }[];
    message: string;
  } = {
    severity: "OK",
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
        availability: {
          severity: "OK",
          withinAvailability: true,
          message: "",
          availabilityWindows: [],
        },
        error: certCheck.error,
      };
    }
  }

  // 6. Check shift against employee availability
  const availabilityResult = await checkShiftAgainstAvailability(
    tenantId,
    body.employeeId,
    shiftStart,
    shiftEnd
  );

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
    availability: {
      severity: availabilityResult.severity,
      withinAvailability: availabilityResult.withinAvailability,
      message: availabilityResult.message,
      availabilityWindows: availabilityResult.availabilityWindows,
    },
    error: null,
  };
}
