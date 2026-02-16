/**
 * Auto-Assignment Service for Staff Shifts
 *
 * This service handles intelligent shift assignment by matching employees
 * to open shifts based on availability, skills, seniority, and labor budget.
 */

import { database, Prisma } from "@repo/database";
import { checkBudgetForShift } from "./labor-budget";

export interface ShiftRequirement {
  shiftId: string;
  scheduleId: string;
  locationId: string;
  shiftStart: Date;
  shiftEnd: Date;
  roleDuringShift?: string;
  requiredSkills?: string[];
  eventId?: string;
  notes?: string;
}

export interface EmployeeCandidate {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  isActive: boolean;
  hourlyRate: number | null;
  seniority?: {
    level: string;
    rank: number;
  };
  skills?: Array<{
    skillId: string;
    skillName: string;
    proficiencyLevel: number;
  }>;
  availability?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
  hasConflictingShift: boolean;
  conflictingShifts: Array<{
    id: string;
    shiftStart: Date;
    shiftEnd: Date;
    locationName: string;
  }>;
}

export interface AssignmentSuggestion {
  employee: EmployeeCandidate;
  score: number;
  reasoning: string[];
  confidence: "high" | "medium" | "low";
  matchDetails: {
    skillsMatch: boolean;
    skillsMatched: string[];
    skillsMissing: string[];
    seniorityScore: number;
    availabilityMatch: boolean;
    hasConflicts: boolean;
    costEstimate: number;
  };
}

export interface AutoAssignmentResult {
  shiftId: string;
  suggestions: AssignmentSuggestion[];
  bestMatch: AssignmentSuggestion | null;
  canAutoAssign: boolean;
  laborBudgetWarning?: string;
}

interface DbEmployee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  hourly_rate: number | null;
  seniority_level: string | null;
  seniority_rank: number | null;
  skills: Array<{
    skill_id: string;
    skill_name: string;
    proficiency_level: number;
  }>;
  availability: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>;
  has_conflicting_shift: boolean;
  conflicting_shifts: Array<{
    id: string;
    shift_start: Date;
    shift_end: Date;
    location_name: string;
  }>;
}

interface ScoreBreakdown {
  totalScore: number;
  skillsMatched: string[];
  skillsMissing: string[];
  skillsMatch: boolean;
  seniorityScore: number;
  availabilityMatch: boolean;
  reasoning: string[];
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
  const canAutoAssign =
    bestMatch && bestMatch.confidence === "high" && suggestions.length > 0;

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
function fetchEmployeesForShift(
  tenantId: string,
  shiftId: string,
  shiftStart: Date,
  shiftEnd: Date,
  roleDuringShift?: string
): Promise<DbEmployee[]> {
  return database.$queryRaw<DbEmployee[]>(
    Prisma.sql`
      WITH employee_seniority_current AS (
        SELECT DISTINCT ON (employee_id)
          employee_id,
          level AS seniority_level,
          rank AS seniority_rank
        FROM tenant_staff.employee_seniority
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          AND effective_at <= CURRENT_TIMESTAMP
        ORDER BY employee_id, effective_at DESC
      ),
      employee_skills_with_names AS (
        SELECT
          es.employee_id,
          es.skill_id,
          s.name AS skill_name,
          es.proficiency_level
        FROM tenant_staff.employee_skills es
        JOIN tenant_staff.skills s ON s.tenant_id = es.tenant_id AND s.id = es.skill_id
        WHERE es.tenant_id = ${tenantId}
          AND s.deleted_at IS NULL
      ),
      employee_conflicts AS (
        SELECT DISTINCT
          ss.employee_id,
          true AS has_conflicting_shift,
          jsonb_agg(
            jsonb_build_object(
              'id', ss.id,
              'shiftStart', ss.shift_start,
              'shiftEnd', ss.shift_end,
              'locationName', l.name
            )
          ) AS conflicting_shifts
        FROM tenant_staff.schedule_shifts ss
        JOIN tenant.locations l ON l.tenant_id = ss.tenant_id AND l.id = ss.location_id
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          AND ss.id != ${shiftId}
          AND (ss.shift_start < ${shiftEnd}) AND (ss.shift_end > ${shiftStart})
        GROUP BY ss.employee_id
      )
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.role,
        e.is_active,
        e.hourly_rate,
        esc.seniority_level,
        esc.seniority_rank,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'skillId', esw.skill_id,
              'skillName', esw.skill_name,
              'proficiencyLevel', esw.proficiency_level
            )
          ) FILTER (WHERE esw.skill_id IS NOT NULL),
          '[]'::jsonb
        ) AS skills,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'dayOfWeek', ea.day_of_week,
              'startTime', ea.start_time,
              'endTime', ea.end_time,
              'isAvailable', ea.is_available
            )
          ) FILTER (WHERE ea.day_of_week IS NOT NULL),
          '[]'::jsonb
        ) AS availability,
        COALESCE(ec.has_conflicting_shift, false) AS has_conflicting_shift,
        COALESCE(ec.conflicting_shifts, '[]'::jsonb) AS conflicting_shifts
      FROM tenant_staff.employees e
      LEFT JOIN employee_seniority_current esc ON esc.employee_id = e.id
      LEFT JOIN employee_skills_with_names esw ON esw.employee_id = e.id
      LEFT JOIN tenant_staff.employee_availability ea ON ea.employee_id = e.id AND ea.deleted_at IS NULL
      LEFT JOIN employee_conflicts ec ON ec.employee_id = e.id
      WHERE e.tenant_id = ${tenantId}
        AND e.deleted_at IS NULL
        AND e.is_active = true
        ${roleDuringShift ? Prisma.sql`AND e.role = ${roleDuringShift}` : Prisma.empty}
      GROUP BY e.id, e.first_name, e.last_name, e.email, e.role, e.is_active, e.hourly_rate, esc.seniority_level, esc.seniority_rank, ec.has_conflicting_shift, ec.conflicting_shifts
      ORDER BY
        ec.has_conflicting_shift ASC,
        COALESCE(esc.seniority_rank, 0) DESC,
        e.last_name ASC,
        e.first_name ASC
    `
  );
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

  const availabilityMatch = availability.some((avail) => {
    return (
      avail.day_of_week === shiftDayOfWeek &&
      avail.is_available &&
      avail.start_time <= shiftStartTime &&
      avail.end_time >= shiftEndTime
    );
  });

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
    const shift = await database.$queryRaw<
      Array<{
        tenant_id: string;
        id: string;
        schedule_id: string;
      }>
    >(Prisma.sql`
      SELECT tenant_id, id, schedule_id
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND id = ${shiftId}
        AND deleted_at IS NULL
    `);

    if (!shift || shift.length === 0) {
      return {
        success: false,
        message: "Shift not found",
        shiftId,
        employeeId,
      };
    }

    const employee = await database.$queryRaw<
      Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
      }>
    >(Prisma.sql`
      SELECT id, first_name, last_name
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND id = ${employeeId}
        AND deleted_at IS NULL
        AND is_active = true
    `);

    if (!employee || employee.length === 0) {
      return {
        success: false,
        message: "Employee not found or inactive",
        shiftId,
        employeeId,
      };
    }

    await database.$queryRaw(Prisma.sql`
      UPDATE tenant_staff.schedule_shifts
      SET employee_id = ${employeeId}, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId}
        AND id = ${shiftId}
        AND deleted_at IS NULL
    `);

    return {
      success: true,
      message: `Successfully assigned ${employee[0].first_name} ${employee[0].last_name} to shift`,
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
