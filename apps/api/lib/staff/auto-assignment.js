/**
 * Auto-Assignment Service for Staff Shifts
 *
 * This service handles intelligent shift assignment by matching employees
 * to open shifts based on availability, skills, seniority, and labor budget.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEligibleEmployeesForShift = getEligibleEmployeesForShift;
exports.autoAssignShift = autoAssignShift;
exports.getAssignmentSuggestionsForMultipleShifts =
  getAssignmentSuggestionsForMultipleShifts;
const database_1 = require("@repo/database");
const labor_budget_1 = require("./labor-budget");
/**
 * Get eligible employees for a shift with scoring
 */
async function getEligibleEmployeesForShift(tenantId, requirement) {
  const {
    shiftId,
    locationId,
    shiftStart,
    shiftEnd,
    roleDuringShift,
    requiredSkills = [],
  } = requirement;
  // Get employees with their seniority, skills, and conflict information
  const employees = await database_1.database.$queryRaw(database_1.Prisma.sql`
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
        ${roleDuringShift ? database_1.Prisma.sql`AND e.role = ${roleDuringShift}` : database_1.Prisma.empty}
      GROUP BY e.id, e.first_name, e.last_name, e.email, e.role, e.is_active, e.hourly_rate, esc.seniority_level, esc.seniority_rank, ec.has_conflicting_shift, ec.conflicting_shifts
      ORDER BY
        ec.has_conflicting_shift ASC,
        COALESCE(esc.seniority_rank, 0) DESC,
        e.last_name ASC,
        e.first_name ASC
    `);
  // Score each employee
  const suggestions = employees
    .filter((e) => !e.has_conflicting_shift)
    .map((employee) => scoreEmployeeForShift(employee, requirement));
  // Sort by score descending
  suggestions.sort((a, b) => b.score - a.score);
  // Determine if auto-assignment is appropriate
  const bestMatch = suggestions[0] || null;
  const canAutoAssign =
    bestMatch && bestMatch.confidence === "high" && suggestions.length > 0;
  // Check labor budget
  let laborBudgetWarning;
  if (canAutoAssign && bestMatch) {
    const budgetCheck = await (0, labor_budget_1.checkBudgetForShift)(
      tenantId,
      {
        locationId,
        eventId: requirement.eventId,
        shiftStart,
        shiftEnd,
        hourlyRate: bestMatch.employee.hourlyRate || undefined,
      }
    );
    if (!budgetCheck.withinBudget) {
      // Override canAutoAssign if over budget
      return {
        shiftId,
        suggestions,
        bestMatch,
        canAutoAssign: false,
        laborBudgetWarning: budgetCheck.budgetWarning,
      };
    }
    laborBudgetWarning = budgetCheck.budgetWarning;
  }
  return {
    shiftId,
    suggestions,
    bestMatch,
    canAutoAssign,
    laborBudgetWarning,
  };
}
/**
 * Score an employee for a shift based on multiple factors
 */
function scoreEmployeeForShift(employee, requirement) {
  const { shiftStart, shiftEnd, requiredSkills = [] } = requirement;
  const reasoning = [];
  let score = 0;
  // 1. Skills matching (40 points max)
  const employeeSkillIds = new Set(employee.skills.map((s) => s.skill_id));
  const skillsMatched = [];
  const skillsMissing = [];
  if (requiredSkills.length > 0) {
    requiredSkills.forEach((skillId) => {
      if (employeeSkillIds.has(skillId)) {
        const skill = employee.skills.find((s) => s.skill_id === skillId);
        if (skill) {
          skillsMatched.push(skill.skill_name);
          score += 10 + skill.proficiency_level * 2; // 12-20 points per skill
        }
      } else {
        skillsMissing.push("Missing required skill");
      }
    });
  }
  const skillsMatch = skillsMissing.length === 0;
  if (skillsMatch) {
    reasoning.push(`All required skills matched: ${skillsMatched.join(", ")}`);
  } else {
    reasoning.push(`Missing ${skillsMissing.length} required skills`);
  }
  // 2. Seniority scoring (20 points max)
  const seniorityScore = employee.seniority_rank || 0;
  score += Math.min(seniorityScore * 4, 20);
  if (employee.seniority_level) {
    reasoning.push(
      `Seniority level: ${employee.seniority_level} (rank ${seniorityScore})`
    );
  }
  // 3. Availability checking (20 points max)
  const shiftDayOfWeek = shiftStart.getDay();
  const shiftStartTime = shiftStart.toTimeString().slice(0, 5);
  const shiftEndTime = shiftEnd.toTimeString().slice(0, 5);
  const availabilityMatch = employee.availability.some((avail) => {
    return (
      avail.day_of_week === shiftDayOfWeek &&
      avail.is_available &&
      avail.start_time <= shiftStartTime &&
      avail.end_time >= shiftEndTime
    );
  });
  if (availabilityMatch) {
    score += 20;
    reasoning.push("Available according to schedule preferences");
  } else {
    reasoning.push("No explicit availability set for this time");
  }
  // 4. Cost consideration (10 points max) - prefer cost-effective but not too cheap
  const hourlyRate = employee.hourly_rate || 0;
  if (hourlyRate > 0) {
    // Moderate rate is preferred (15-25/hr)
    if (hourlyRate >= 15 && hourlyRate <= 25) {
      score += 10;
    } else if (hourlyRate >= 10 && hourlyRate < 30) {
      score += 5;
    }
  }
  // 5. Role matching (10 points)
  if (
    requirement.roleDuringShift &&
    employee.role === requirement.roleDuringShift
  ) {
    score += 10;
    reasoning.push(`Role matches: ${employee.role}`);
  }
  // Calculate confidence level
  let confidence = "low";
  if (
    skillsMatch &&
    !employee.has_conflicting_shift &&
    availabilityMatch &&
    score >= 50
  ) {
    confidence = "high";
  } else if (!employee.has_conflicting_shift && score >= 30) {
    confidence = "medium";
  }
  // Cost estimate for the shift
  const shiftHours =
    (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
  const costEstimate = hourlyRate * shiftHours;
  return {
    employee: {
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
    },
    score,
    reasoning,
    confidence,
    matchDetails: {
      skillsMatch,
      skillsMatched,
      skillsMissing,
      seniorityScore,
      availabilityMatch,
      hasConflicts: employee.has_conflicting_shift,
      costEstimate,
    },
  };
}
/**
 * Auto-assign an employee to a shift
 */
async function autoAssignShift(tenantId, shiftId, employeeId) {
  try {
    // Get the shift details using raw SQL
    const shift = await database_1.database.$queryRaw(database_1.Prisma.sql`
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
    // Check if employee exists and is active using raw SQL
    const employee = await database_1.database.$queryRaw(database_1.Prisma.sql`
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
    // Update the shift with the employee using raw SQL
    await database_1.database.$queryRaw(database_1.Prisma.sql`
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
async function getAssignmentSuggestionsForMultipleShifts(
  tenantId,
  shiftRequirements
) {
  const results = await Promise.all(
    shiftRequirements.map((requirement) =>
      getEligibleEmployeesForShift(tenantId, requirement)
    )
  );
  return results;
}
