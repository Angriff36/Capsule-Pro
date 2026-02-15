/**
 * Helper functions for bulk shift assignment
 * Extracted to reduce cognitive complexity of the main route handler
 */

import { database, Prisma } from "@repo/database";
import {
  autoAssignShift,
  getAssignmentSuggestionsForMultipleShifts,
  type ShiftRequirement,
} from "@/lib/staff/auto-assignment";

// Types
export interface ShiftAssignmentInput {
  shiftId: string;
  employeeId?: string | null;
  requiredSkills?: string[];
}

export interface AssignmentResult {
  shiftId: string;
  success: boolean;
  message: string;
  employeeId?: string;
  employeeName?: string;
  confidence?: "high" | "medium" | "low";
  skipped: boolean;
}

export interface BulkAssignmentRequest {
  shifts: ShiftAssignmentInput[];
  dryRun?: boolean;
  onlyHighConfidence?: boolean;
}

/**
 * Fetch shift details from database for auto-assignment
 */
export async function fetchShiftsForAutoAssignment(
  tenantId: string,
  shiftsToAutoAssign: ShiftAssignmentInput[]
) {
  const shiftIds = shiftsToAutoAssign.map((s) => s.shiftId);

  const shiftsFromDb = await database.$queryRaw<
    Array<{
      tenant_id: string;
      id: string;
      schedule_id: string;
      location_id: string;
      shift_start: Date;
      shift_end: Date;
      role_during_shift: string | null;
    }>
  >(
    Prisma.sql`
      SELECT
        tenant_id,
        id,
        schedule_id,
        location_id,
        shift_start,
        shift_end,
        role_during_shift
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ANY(${shiftIds})
        AND deleted_at IS NULL
    `
  );

  return shiftsFromDb;
}

/**
 * Build shift requirements for auto-assignment from database records
 */
export function buildShiftRequirements(
  shiftsFromDb: Array<{
    tenant_id: string;
    id: string;
    schedule_id: string;
    location_id: string;
    shift_start: Date;
    shift_end: Date;
    role_during_shift: string | null;
  }>,
  shiftsToAutoAssign: ShiftAssignmentInput[]
): ShiftRequirement[] {
  return shiftsFromDb.map((shift) => {
    const requestShift = shiftsToAutoAssign.find((s) => s.shiftId === shift.id);
    return {
      shiftId: shift.id,
      scheduleId: shift.schedule_id,
      locationId: shift.location_id,
      shiftStart: shift.shift_start,
      shiftEnd: shift.shift_end,
      roleDuringShift: shift.role_during_shift || undefined,
      requiredSkills: requestShift?.requiredSkills || [],
    };
  });
}

/**
 * Separate shifts into pre-selected and auto-assign categories
 */
export function separateShiftsByAssignmentType(
  shifts: ShiftAssignmentInput[]
): {
  shiftsPreSelected: ShiftAssignmentInput[];
  shiftsToAutoAssign: ShiftAssignmentInput[];
} {
  return {
    shiftsPreSelected: shifts.filter((s) => s.employeeId),
    shiftsToAutoAssign: shifts.filter((s) => !s.employeeId),
  };
}

/**
 * Validate employee exists for dry-run mode
 */
async function validateEmployeeForDryRun(
  tenantId: string,
  employeeId: string
): Promise<{
  valid: boolean;
  firstName: string | null;
  lastName: string | null;
}> {
  const employee = await database.$queryRaw<
    Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
    }>
  >(
    Prisma.sql`
      SELECT id, first_name, last_name
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND id = ${employeeId}
        AND deleted_at IS NULL
        AND is_active = true
    `
  );

  if (!employee || employee.length === 0) {
    return { valid: false, firstName: null, lastName: null };
  }

  return {
    valid: true,
    firstName: employee[0].first_name,
    lastName: employee[0].last_name,
  };
}

/**
 * Process a shift with a pre-selected employee
 */
export async function processPreSelectedShift(
  tenantId: string,
  shiftAssignment: ShiftAssignmentInput,
  dryRun: boolean
): Promise<AssignmentResult> {
  const { shiftId, employeeId } = shiftAssignment;

  if (!employeeId) {
    return {
      shiftId,
      success: false,
      message: "No employee ID provided",
      skipped: true,
    };
  }

  if (dryRun) {
    const validation = await validateEmployeeForDryRun(tenantId, employeeId);

    if (!validation.valid) {
      return {
        shiftId,
        success: false,
        message: "Employee not found or inactive",
        skipped: true,
      };
    }

    return {
      shiftId,
      success: true,
      message: `[DRY RUN] Would assign ${validation.firstName} ${validation.lastName} to shift`,
      employeeId,
      employeeName: `${validation.firstName} ${validation.lastName}`,
      skipped: false,
    };
  }

  // Actually assign the pre-selected employee
  const assignResult = await autoAssignShift(tenantId, shiftId, employeeId);

  return {
    shiftId,
    success: assignResult.success,
    message: assignResult.message,
    employeeId,
    skipped: false,
  };
}

/**
 * Process all shifts with pre-selected employees
 */
export async function processPreSelectedShifts(
  tenantId: string,
  shiftsPreSelected: ShiftAssignmentInput[],
  dryRun: boolean
): Promise<AssignmentResult[]> {
  const results: AssignmentResult[] = [];

  for (const shiftAssignment of shiftsPreSelected) {
    const result = await processPreSelectedShift(
      tenantId,
      shiftAssignment,
      dryRun
    );
    results.push(result);
  }

  return results;
}

/**
 * Check if assignment should be skipped based on confidence
 */
function shouldSkipForConfidence(
  onlyHighConfidence: boolean,
  canAutoAssign: boolean,
  bestMatch: { confidence: "high" | "medium" | "low" }
): { skip: boolean; reason?: string } {
  if (onlyHighConfidence && !canAutoAssign) {
    return {
      skip: true,
      reason: `Best match confidence is ${bestMatch.confidence}, but only high confidence assignments are allowed`,
    };
  }
  return { skip: false };
}

/**
 * Check if assignment should be skipped due to labor budget warning
 */
function shouldSkipForBudget(laborBudgetWarning?: string): {
  skip: boolean;
  reason?: string;
} {
  if (laborBudgetWarning) {
    return {
      skip: true,
      reason: `Labor budget warning: ${laborBudgetWarning}`,
    };
  }
  return { skip: false };
}

/**
 * Build result for auto-assignment suggestion
 */
export function buildAutoAssignmentResult(
  shiftId: string,
  suggestion: {
    bestMatch: {
      employee: {
        id: string;
        firstName: string | null;
        lastName: string | null;
      };
      confidence: "high" | "medium" | "low";
      score: number;
    } | null;
    canAutoAssign: boolean;
    laborBudgetWarning?: string;
  },
  onlyHighConfidence: boolean,
  dryRun: boolean,
  assignResult?: { success: boolean; message: string }
): AssignmentResult {
  const { bestMatch, canAutoAssign, laborBudgetWarning } = suggestion;

  // Skip if no suggestions
  if (!bestMatch) {
    return {
      shiftId,
      success: false,
      message: "No eligible employees found for this shift",
      skipped: true,
    };
  }

  const employeeName = `${bestMatch.employee.firstName} ${bestMatch.employee.lastName}`;

  // Skip if only high confidence and this isn't high confidence
  const confidenceCheck = shouldSkipForConfidence(
    onlyHighConfidence,
    canAutoAssign,
    bestMatch
  );
  if (confidenceCheck.skip && confidenceCheck.reason) {
    return {
      shiftId,
      success: false,
      message: confidenceCheck.reason,
      employeeId: bestMatch.employee.id,
      employeeName,
      confidence: bestMatch.confidence,
      skipped: true,
    };
  }

  // Skip if labor budget warning
  const budgetCheck = shouldSkipForBudget(laborBudgetWarning);
  if (budgetCheck.skip && budgetCheck.reason) {
    return {
      shiftId,
      success: false,
      message: budgetCheck.reason,
      employeeId: bestMatch.employee.id,
      employeeName,
      confidence: bestMatch.confidence,
      skipped: true,
    };
  }

  // Dry run mode - just return what would be assigned
  if (dryRun) {
    return {
      shiftId,
      success: true,
      message: `[DRY RUN] Would assign ${employeeName} (confidence: ${bestMatch.confidence}, score: ${bestMatch.score})`,
      employeeId: bestMatch.employee.id,
      employeeName,
      confidence: bestMatch.confidence,
      skipped: false,
    };
  }

  // Actually assigned the employee
  if (assignResult) {
    return {
      shiftId,
      success: assignResult.success,
      message: assignResult.success
        ? `Auto-assigned ${employeeName} (confidence: ${bestMatch.confidence}, score: ${bestMatch.score})`
        : assignResult.message,
      employeeId: bestMatch.employee.id,
      employeeName,
      confidence: bestMatch.confidence,
      skipped: false,
    };
  }

  // Fallback - shouldn't reach here
  return {
    shiftId,
    success: false,
    message: "Unexpected error in auto-assignment",
    skipped: true,
  };
}

/**
 * Process shifts that need auto-assignment
 */
export async function processAutoAssignShifts(
  tenantId: string,
  shiftsToAutoAssign: ShiftAssignmentInput[],
  onlyHighConfidence: boolean,
  dryRun: boolean
): Promise<AssignmentResult[]> {
  const results: AssignmentResult[] = [];

  if (shiftsToAutoAssign.length === 0) {
    return results;
  }

  // Get shift details from database
  const shiftsFromDb = await fetchShiftsForAutoAssignment(
    tenantId,
    shiftsToAutoAssign
  );

  // Build requirements for auto-assignment
  const requirements = buildShiftRequirements(shiftsFromDb, shiftsToAutoAssign);

  // Get assignment suggestions
  const suggestions = await getAssignmentSuggestionsForMultipleShifts(
    tenantId,
    requirements
  );

  // Execute assignments based on suggestions
  for (const suggestion of suggestions) {
    let assignResult: { success: boolean; message: string } | undefined;

    if (
      !dryRun &&
      suggestion.bestMatch &&
      suggestion.canAutoAssign &&
      !suggestion.laborBudgetWarning
    ) {
      assignResult = await autoAssignShift(
        tenantId,
        suggestion.shiftId,
        suggestion.bestMatch.employee.id
      );
    }

    const result = buildAutoAssignmentResult(
      suggestion.shiftId,
      suggestion,
      onlyHighConfidence,
      dryRun,
      assignResult
    );

    results.push(result);
  }

  return results;
}

/**
 * Sort results to match input order
 */
export function sortResultsByInputOrder(
  results: AssignmentResult[],
  shifts: ShiftAssignmentInput[]
): AssignmentResult[] {
  return [...results].sort((a, b) => {
    const aIndex = shifts.findIndex((s) => s.shiftId === a.shiftId);
    const bIndex = shifts.findIndex((s) => s.shiftId === b.shiftId);
    return aIndex - bIndex;
  });
}

/**
 * Build summary statistics from results
 */
export function buildSummary(results: AssignmentResult[], dryRun: boolean) {
  return {
    total: results.length,
    assigned: results.filter((r) => r.success && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => !(r.success || r.skipped)).length,
    dryRun,
  };
}
