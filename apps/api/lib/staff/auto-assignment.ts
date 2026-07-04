/**
 * Auto-Assignment Service for Staff Shifts
 *
 * This service handles intelligent shift assignment by matching employees
 * to open shifts based on availability, skills, seniority, and labor budget.
 */

import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { checkBudgetForShift } from "./labor-budget";

export interface ShiftRequirement {
  eventId?: string;
  locationId: string;
  notes?: string;
  requiredSkills?: string[];
  roleDuringShift?: string;
  scheduleId: string;
  shiftEnd: Date;
  shiftId: string;
  shiftStart: Date;
}

export interface EmployeeCandidate {
  availability?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
  conflictingShifts: Array<{
    id: string;
    shiftStart: Date;
    shiftEnd: Date;
    locationName: string;
  }>;
  email: string;
  firstName: string | null;
  hasConflictingShift: boolean;
  hourlyRate: number | null;
  id: string;
  isActive: boolean;
  lastName: string | null;
  role: string;
  seniority?: {
    level: string;
    rank: number;
  };
  skills?: Array<{
    skillId: string;
    skillName: string;
    proficiencyLevel: number;
  }>;
}

export interface AssignmentSuggestion {
  confidence: "high" | "medium" | "low";
  employee: EmployeeCandidate;
  matchDetails: {
    skillsMatch: boolean;
    skillsMatched: string[];
    skillsMissing: string[];
    seniorityScore: number;
    availabilityMatch: boolean;
    hasConflicts: boolean;
    costEstimate: number;
  };
  reasoning: string[];
  score: number;
}

export interface AutoAssignmentResult {
  bestMatch: AssignmentSuggestion | null;
  canAutoAssign: boolean;
  laborBudgetWarning?: string;
  shiftId: string;
  suggestions: AssignmentSuggestion[];
}

interface DbEmployee {
  availability: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>;
  conflicting_shifts: Array<{
    id: string;
    shift_start: Date;
    shift_end: Date;
    location_name: string;
  }>;
  email: string;
  first_name: string | null;
  has_conflicting_shift: boolean;
  hourly_rate: number | null;
  id: string;
  is_active: boolean;
  last_name: string | null;
  role: string;
  seniority_level: string | null;
  seniority_rank: number | null;
  skills: Array<{
    skill_id: string;
    skill_name: string;
    proficiency_level: number;
  }>;
}

interface ScoreBreakdown {
  availabilityMatch: boolean;
  reasoning: string[];
  seniorityScore: number;
  skillsMatch: boolean;
  skillsMatched: string[];
  skillsMissing: string[];
  totalScore: number;
}

/**
 * Get eligible employees for a shift with scoring
 */
export async function getEligibleEmployeesForShift(
  tenantId: string,
  requirement: ShiftRequirement
): Promise<AutoAssignmentResult> {
  const { shiftId, locationId, shiftStart, shiftEnd, roleDuringShift } =
    requirement;

  const employees = await fetchEmployeesForShift(
    tenantId,
    shiftId,
    shiftStart,
    shiftEnd,
    roleDuringShift
  );

  const suggestions: AssignmentSuggestion[] = employees
    .filter((e) => !e.has_conflicting_shift)
    .map((employee) => scoreEmployeeForShift(employee, requirement));

  suggestions.sort((a, b) => b.score - a.score);

  const bestMatch = suggestions[0] || null;
  const canAutoAssign = Boolean(
    bestMatch && bestMatch.confidence === "high" && suggestions.length > 0
  );

  const budgetResult = await checkLaborBudget(
    canAutoAssign,
    bestMatch,
    tenantId,
    requirement,
    locationId,
    shiftStart,
    shiftEnd
  );

  return {
    shiftId,
    suggestions,
    bestMatch,
    canAutoAssign: budgetResult.canAutoAssign,
    laborBudgetWarning: budgetResult.laborBudgetWarning,
  };
}

/**
 * Fetches employees from database with seniority, skills, and conflict info
 */
function formatTime(value: Date): string {
  return [
    value.getUTCHours().toString().padStart(2, "0"),
    value.getUTCMinutes().toString().padStart(2, "0"),
  ].join(":");
}

async function fetchEmployeesForShift(
  tenantId: string,
  shiftId: string,
  shiftStart: Date,
  shiftEnd: Date,
  roleDuringShift?: string
): Promise<DbEmployee[]> {
  const employees = await database.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      isActive: true,
      ...(roleDuringShift ? { role: roleDuringShift } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      hourlyRate: true,
    },
  });
  const employeeIds = employees.map((employee) => employee.id);

  const [seniorityRows, skillRows, availabilityRows, conflictRows] =
    await Promise.all([
      database.employee_seniority.findMany({
        where: {
          tenant_id: tenantId,
          employee_id: { in: employeeIds },
          deleted_at: null,
          effective_at: { lte: new Date() },
        },
        orderBy: [{ employee_id: "asc" }, { effective_at: "desc" }],
        select: {
          employee_id: true,
          level: true,
          rank: true,
        },
      }),
      database.employee_skills.findMany({
        where: {
          tenant_id: tenantId,
          employee_id: { in: employeeIds },
        },
        select: {
          employee_id: true,
          skill_id: true,
          proficiency_level: true,
        },
      }),
      database.employeeAvailability.findMany({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          deletedAt: null,
        },
        select: {
          employeeId: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          isAvailable: true,
        },
      }),
      database.scheduleShift.findMany({
        where: {
          tenantId,
          deletedAt: null,
          id: { not: shiftId },
          shift_start: { lt: shiftEnd },
          shift_end: { gt: shiftStart },
        },
        select: {
          id: true,
          employeeId: true,
          locationId: true,
          shift_start: true,
          shift_end: true,
        },
      }),
    ]);

  const skillNames = await database.skills.findMany({
    where: {
      tenant_id: tenantId,
      id: { in: [...new Set(skillRows.map((skill) => skill.skill_id))] },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
    },
  });
  const locations = await database.location.findMany({
    where: {
      tenantId,
      id: { in: [...new Set(conflictRows.map((shift) => shift.locationId))] },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const seniorityByEmployeeId = new Map<
    string,
    { seniority_level: string | null; seniority_rank: number | null }
  >();
  for (const seniority of seniorityRows) {
    if (!seniorityByEmployeeId.has(seniority.employee_id)) {
      seniorityByEmployeeId.set(seniority.employee_id, {
        seniority_level: seniority.level,
        seniority_rank: seniority.rank,
      });
    }
  }

  const skillNamesById = new Map(
    skillNames.map((skill) => [skill.id, skill.name])
  );
  const skillsByEmployeeId = new Map<string, DbEmployee["skills"]>();
  for (const skill of skillRows) {
    const employeeSkills = skillsByEmployeeId.get(skill.employee_id) ?? [];
    employeeSkills.push({
      skill_id: skill.skill_id,
      skill_name: skillNamesById.get(skill.skill_id) ?? "",
      proficiency_level: skill.proficiency_level,
    });
    skillsByEmployeeId.set(skill.employee_id, employeeSkills);
  }

  const availabilityByEmployeeId = new Map<
    string,
    DbEmployee["availability"]
  >();
  for (const availability of availabilityRows) {
    const employeeAvailability =
      availabilityByEmployeeId.get(availability.employeeId) ?? [];
    employeeAvailability.push({
      day_of_week: availability.dayOfWeek,
      start_time: formatTime(availability.startTime),
      end_time: formatTime(availability.endTime),
      is_available: availability.isAvailable,
    });
    availabilityByEmployeeId.set(availability.employeeId, employeeAvailability);
  }

  const locationNamesById = new Map(
    locations.map((location) => [location.id, location.name])
  );
  const conflictsByEmployeeId = new Map<
    string,
    DbEmployee["conflicting_shifts"]
  >();
  for (const shift of conflictRows) {
    const employeeConflicts = conflictsByEmployeeId.get(shift.employeeId) ?? [];
    employeeConflicts.push({
      id: shift.id,
      shift_start: shift.shift_start,
      shift_end: shift.shift_end,
      location_name: locationNamesById.get(shift.locationId) ?? "",
    });
    conflictsByEmployeeId.set(shift.employeeId, employeeConflicts);
  }

  return employees
    .map((employee) => {
      const seniority = seniorityByEmployeeId.get(employee.id);
      const conflictingShifts = conflictsByEmployeeId.get(employee.id) ?? [];
      return {
        id: employee.id,
        first_name: employee.firstName,
        last_name: employee.lastName,
        email: employee.email,
        role: employee.role,
        is_active: employee.isActive,
        hourly_rate: employee.hourlyRate ? Number(employee.hourlyRate) : null,
        seniority_level: seniority?.seniority_level ?? null,
        seniority_rank: seniority?.seniority_rank ?? null,
        skills: skillsByEmployeeId.get(employee.id) ?? [],
        availability: availabilityByEmployeeId.get(employee.id) ?? [],
        has_conflicting_shift: conflictingShifts.length > 0,
        conflicting_shifts: conflictingShifts,
      };
    })
    .sort((a, b) => {
      if (a.has_conflicting_shift !== b.has_conflicting_shift) {
        return a.has_conflicting_shift ? 1 : -1;
      }
      return (
        (b.seniority_rank ?? 0) - (a.seniority_rank ?? 0) ||
        (a.last_name ?? "").localeCompare(b.last_name ?? "") ||
        (a.first_name ?? "").localeCompare(b.first_name ?? "")
      );
    });
}

/**
 * Checks labor budget for auto-assignment
 */
async function checkLaborBudget(
  canAutoAssign: boolean,
  bestMatch: AssignmentSuggestion | null,
  tenantId: string,
  requirement: ShiftRequirement,
  locationId: string,
  shiftStart: Date,
  shiftEnd: Date
): Promise<{ canAutoAssign: boolean; laborBudgetWarning?: string }> {
  if (!(canAutoAssign && bestMatch)) {
    return { canAutoAssign };
  }

  const budgetCheck = await checkBudgetForShift(tenantId, {
    locationId,
    eventId: requirement.eventId,
    shiftStart,
    shiftEnd,
    hourlyRate: bestMatch.employee.hourlyRate || undefined,
  });

  if (!budgetCheck.withinBudget) {
    return {
      canAutoAssign: false,
      laborBudgetWarning: budgetCheck.budgetWarning,
    };
  }

  return {
    canAutoAssign,
    laborBudgetWarning: budgetCheck.budgetWarning,
  };
}

/**
 * Calculates skills score and returns match details
 */
function calculateSkillsScore(
  employeeSkills: DbEmployee["skills"],
  requiredSkills: string[]
): Pick<
  ScoreBreakdown,
  "totalScore" | "skillsMatched" | "skillsMissing" | "skillsMatch" | "reasoning"
> {
  const employeeSkillIds = new Set(employeeSkills.map((s) => s.skill_id));
  const skillsMatched: string[] = [];
  const skillsMissing: string[] = [];
  let score = 0;
  const reasoning: string[] = [];

  if (requiredSkills.length > 0) {
    for (const skillId of requiredSkills) {
      if (employeeSkillIds.has(skillId)) {
        const skill = employeeSkills.find((s) => s.skill_id === skillId);
        if (skill) {
          skillsMatched.push(skill.skill_name);
          score += 10 + skill.proficiency_level * 2;
        }
      } else {
        skillsMissing.push("Missing required skill");
      }
    }
  }

  const skillsMatch = skillsMissing.length === 0;
  if (skillsMatch) {
    reasoning.push(`All required skills matched: ${skillsMatched.join(", ")}`);
  } else {
    reasoning.push(`Missing ${skillsMissing.length} required skills`);
  }

  return {
    totalScore: score,
    skillsMatched,
    skillsMissing,
    skillsMatch,
    reasoning,
  };
}

/**
 * Calculates seniority score
 */
function calculateSeniorityScore(
  seniorityLevel: string | null,
  seniorityRank: number | null
): Pick<ScoreBreakdown, "totalScore" | "seniorityScore" | "reasoning"> {
  const seniorityScore = seniorityRank || 0;
  const score = Math.min(seniorityScore * 4, 20);
  const reasoning: string[] = [];

  if (seniorityLevel) {
    reasoning.push(
      `Seniority level: ${seniorityLevel} (rank ${seniorityScore})`
    );
  }

  return { totalScore: score, seniorityScore, reasoning };
}

/**
 * Checks availability and returns score
 */
function checkAvailabilityMatch(
  availability: DbEmployee["availability"],
  shiftStart: Date,
  shiftEnd: Date
): Pick<ScoreBreakdown, "totalScore" | "availabilityMatch" | "reasoning"> {
  const shiftDayOfWeek = shiftStart.getDay();
  const shiftStartTime = shiftStart.toTimeString().slice(0, 5);
  const shiftEndTime = shiftEnd.toTimeString().slice(0, 5);

  const availabilityMatch = availability.some(
    (avail) =>
      avail.day_of_week === shiftDayOfWeek &&
      avail.is_available &&
      avail.start_time <= shiftStartTime &&
      avail.end_time >= shiftEndTime
  );

  const reasoning: string[] = [];
  let score = 0;

  if (availabilityMatch) {
    score = 20;
    reasoning.push("Available according to schedule preferences");
  } else {
    reasoning.push("No explicit availability set for this time");
  }

  return { totalScore: score, availabilityMatch, reasoning };
}

/**
 * Calculates cost score
 */
function calculateCostScore(
  hourlyRate: number | null
): Pick<ScoreBreakdown, "totalScore" | "reasoning"> {
  let score = 0;
  const rate = hourlyRate || 0;

  if (rate > 0) {
    if (rate >= 15 && rate <= 25) {
      score = 10;
    } else if (rate >= 10 && rate < 30) {
      score = 5;
    }
  }

  return { totalScore: score, reasoning: [] };
}

/**
 * Calculates role match score
 */
function calculateRoleScore(
  employeeRole: string,
  requiredRole: string | undefined
): Pick<ScoreBreakdown, "totalScore" | "reasoning"> {
  let score = 0;
  const reasoning: string[] = [];

  if (requiredRole && employeeRole === requiredRole) {
    score = 10;
    reasoning.push(`Role matches: ${employeeRole}`);
  }

  return { totalScore: score, reasoning };
}

/**
 * Determines confidence level based on scoring
 */
function determineConfidence(
  skillsMatch: boolean,
  hasConflictingShift: boolean,
  availabilityMatch: boolean,
  totalScore: number
): "high" | "medium" | "low" {
  if (
    skillsMatch &&
    !hasConflictingShift &&
    availabilityMatch &&
    totalScore >= 50
  ) {
    return "high";
  }

  if (!hasConflictingShift && totalScore >= 30) {
    return "medium";
  }

  return "low";
}

/**
 * Converts database employee to employee candidate
 */
function toEmployeeCandidate(employee: DbEmployee): EmployeeCandidate {
  return {
    id: employee.id,
    firstName: employee.first_name,
    lastName: employee.last_name,
    email: employee.email,
    role: employee.role,
    isActive: employee.is_active,
    hourlyRate: employee.hourly_rate,
    seniority: employee.seniority_level
      ? {
          level: employee.seniority_level,
          rank: employee.seniority_rank || 0,
        }
      : undefined,
    skills: employee.skills.map((s) => ({
      skillId: s.skill_id,
      skillName: s.skill_name,
      proficiencyLevel: s.proficiency_level,
    })),
    availability: employee.availability.map((a) => ({
      dayOfWeek: a.day_of_week,
      startTime: a.start_time,
      endTime: a.end_time,
      isAvailable: a.is_available,
    })),
    hasConflictingShift: employee.has_conflicting_shift,
    conflictingShifts: employee.conflicting_shifts.map((cs) => ({
      id: cs.id,
      shiftStart: cs.shift_start,
      shiftEnd: cs.shift_end,
      locationName: cs.location_name,
    })),
  };
}

/**
 * Score an employee for a shift based on multiple factors
 */
function scoreEmployeeForShift(
  employee: DbEmployee,
  requirement: ShiftRequirement
): AssignmentSuggestion {
  const { shiftStart, shiftEnd, requiredSkills = [] } = requirement;

  const skillsResult = calculateSkillsScore(employee.skills, requiredSkills);
  const seniorityResult = calculateSeniorityScore(
    employee.seniority_level,
    employee.seniority_rank
  );
  const availabilityResult = checkAvailabilityMatch(
    employee.availability,
    shiftStart,
    shiftEnd
  );
  const costResult = calculateCostScore(employee.hourly_rate);
  const roleResult = calculateRoleScore(
    employee.role,
    requirement.roleDuringShift
  );

  const totalScore =
    skillsResult.totalScore +
    seniorityResult.totalScore +
    availabilityResult.totalScore +
    costResult.totalScore +
    roleResult.totalScore;

  const reasoning = [
    ...skillsResult.reasoning,
    ...seniorityResult.reasoning,
    ...availabilityResult.reasoning,
    ...roleResult.reasoning,
  ];

  const confidence = determineConfidence(
    skillsResult.skillsMatch,
    employee.has_conflicting_shift,
    availabilityResult.availabilityMatch,
    totalScore
  );

  const hourlyRate = employee.hourly_rate || 0;
  const shiftHours =
    (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
  const costEstimate = hourlyRate * shiftHours;

  return {
    employee: toEmployeeCandidate(employee),
    score: totalScore,
    reasoning,
    confidence,
    matchDetails: {
      skillsMatch: skillsResult.skillsMatch,
      skillsMatched: skillsResult.skillsMatched,
      skillsMissing: skillsResult.skillsMissing,
      seniorityScore: seniorityResult.seniorityScore,
      availabilityMatch: availabilityResult.availabilityMatch,
      hasConflicts: employee.has_conflicting_shift,
      costEstimate,
    },
  };
}

/**
 * Auto-assign an employee to a shift
 */
export async function autoAssignShift(
  tenantId: string,
  shiftId: string,
  employeeId: string
): Promise<{
  success: boolean;
  message: string;
  shiftId: string;
  employeeId: string;
}> {
  try {
    const shift = await database.scheduleShift.findFirst({
      where: {
        tenantId,
        id: shiftId,
        deletedAt: null,
      },
      select: {
        locationId: true,
        shiftStart: true,
        shiftEnd: true,
        roleDuringShift: true,
        notes: true,
      },
    });

    if (!shift) {
      return {
        success: false,
        message: "Shift not found",
        shiftId,
        employeeId,
      };
    }

    const employee = await database.user.findFirst({
      where: {
        tenantId,
        id: employeeId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    if (!employee) {
      return {
        success: false,
        message: "Employee not found or inactive",
        shiftId,
        employeeId,
      };
    }

    // Resolve a system user identity for the Manifest command context
    const systemUser = await database.user.findFirst({
      where: { tenantId, role: { in: ["owner", "admin"] }, deletedAt: null },
      select: { id: true, role: true },
    });
    const userId = systemUser?.id ?? "";
    const userRole = systemUser?.role ?? "admin";

    const result = await runManifestCommandCore(
      {
        createRuntime: ({ user, entityName }) =>
          createManifestRuntime({
            user: { id: user.id, tenantId: user.tenantId, role: user.role },
            entityName,
          }),
      },
      {
        entity: "ScheduleShift",
        command: "update",
        instanceId: shiftId,
        user: { id: userId, tenantId, role: userRole },
        body: {
          employeeId,
          locationId: shift.locationId,
          shiftStart: shift.shiftStart.getTime(),
          shiftEnd: shift.shiftEnd.getTime(),
          roleDuringShift: shift.roleDuringShift ?? "",
          notes: shift.notes ?? "",
        },
      }
    );

    if (!result.ok) {
      return {
        success: false,
        message: result.message ?? "Manifest command failed",
        shiftId,
        employeeId,
      };
    }

    return {
      success: true,
      message: `Successfully assigned ${employee.firstName} ${employee.lastName} to shift`,
      shiftId,
      employeeId,
    };
  } catch (error) {
    console.error("Error auto-assigning shift:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to assign shift",
      shiftId,
      employeeId,
    };
  }
}

/**
 * Get assignment suggestions for multiple open shifts
 */
export async function getAssignmentSuggestionsForMultipleShifts(
  tenantId: string,
  shiftRequirements: ShiftRequirement[]
): Promise<AutoAssignmentResult[]> {
  const results = await Promise.all(
    shiftRequirements.map((requirement) =>
      getEligibleEmployeesForShift(tenantId, requirement)
    )
  );

  return results;
}
