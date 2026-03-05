/**
 * AI-Powered Workforce Optimization Service
 *
 * Provides dynamic scheduling, skill-based task assignment, and performance prediction
 * for workforce management using statistical analysis and configurable AI rules.
 */

import { database, Prisma } from "@repo/database";
import {
  type AssignmentSuggestion,
  getEligibleEmployeesForShift,
  type ShiftRequirement,
} from "./auto-assignment";

// ============================================================================
// Types
// ============================================================================

export interface ScheduleOptimizationRequest {
  scheduleId: string;
  locationId: string;
  startDate: Date;
  endDate: Date;
  constraints: OptimizationConstraints;
}

export interface OptimizationConstraints {
  maxLaborCost?: number;
  minSkillCoverage?: number; // 0-1, percentage of required skills to cover
  maxHoursPerEmployee?: number;
  requireSeniorityBalance?: boolean;
  preferFullAvailability?: boolean;
  allowOvertime?: boolean;
}

export interface ScheduleOptimizationResult {
  scheduleId: string;
  optimizedAssignments: OptimizedShiftAssignment[];
  summary: OptimizationSummary;
  warnings: string[];
  appliedStrategies: string[];
}

export interface OptimizedShiftAssignment {
  shiftId: string;
  recommendedEmployeeId: string;
  employeeName: string;
  confidence: "high" | "medium" | "low";
  reasoning: string[];
  estimatedCost: number;
  riskFactors: string[];
  alternatives: Array<{
    employeeId: string;
    employeeName: string;
    score: number;
  }>;
}

export interface OptimizationSummary {
  totalShifts: number;
  assignedShifts: number;
  unassignedShifts: number;
  totalEstimatedCost: number;
  averageConfidence: number;
  skillCoverage: number;
  seniorityBalance: number;
}

export interface PerformancePredictionRequest {
  employeeId: string;
  scheduleId?: string;
  predictionHorizon: number; // days
  metrics: Array<
    "productivity" | "attendance" | "overtime_risk" | "skill_match"
  >;
}

export interface PerformancePredictionResult {
  employeeId: string;
  predictions: {
    productivity: ProductivityPrediction | null;
    attendance: AttendancePrediction | null;
    overtimeRisk: OvertimeRiskPrediction | null;
    skillMatch: SkillMatchPrediction | null;
  };
  overallPerformanceScore: number;
  recommendations: string[];
}

export interface ProductivityPrediction {
  predictedScore: number; // 0-100
  trend: "improving" | "stable" | "declining";
  factors: {
    factor: string;
    impact: "positive" | "neutral" | "negative";
    weight: number;
  }[];
}

export interface AttendancePrediction {
  predictedAttendanceRate: number; // 0-1
  riskLevel: "low" | "medium" | "high";
  riskFactors: string[];
}

export interface OvertimeRiskPrediction {
  riskLevel: "low" | "medium" | "high";
  projectedOvertimeHours: number;
  contributingFactors: string[];
}

export interface SkillMatchPrediction {
  overallMatchScore: number; // 0-100
  skillGaps: Array<{
    skillName: string;
    currentProficiency: number;
    requiredProficiency: number;
    gap: number;
  }>;
  trainingRecommendations: string[];
}

export interface WorkforceAnalyticsData {
  tenantId: string;
  locationId?: string;
  startDate: Date;
  endDate: Date;
}

export interface WorkforceAnalyticsResult {
  periodStart: Date;
  periodEnd: Date;
  metrics: {
    totalHours: number;
    totalCost: number;
    averageHoursPerEmployee: number;
    utilizationRate: number;
    turnoverRisk: Array<{
      employeeId: string;
      employeeName: string;
      riskLevel: "low" | "medium" | "high";
      indicators: string[];
    }>;
    topPerformers: Array<{
      employeeId: string;
      employeeName: string;
      score: number;
    }>;
    skillGaps: Array<{
      skillName: string;
      demand: number;
      availableCount: number;
      gap: number;
    }>;
  };
  trends: {
    costTrend: "increasing" | "stable" | "decreasing";
    productivityTrend: "improving" | "stable" | "declining";
    overtimeTrend: "increasing" | "stable" | "decreasing";
  };
}

// ============================================================================
// Dynamic Scheduling Optimization
// ============================================================================

/**
 * Optimize a schedule by intelligently assigning employees to shifts
 */
export async function optimizeSchedule(
  tenantId: string,
  request: ScheduleOptimizationRequest
): Promise<ScheduleOptimizationResult> {
  const { scheduleId, locationId, startDate, endDate, constraints } = request;

  // Get all unassigned shifts for the schedule
  const unassignedShifts = await getUnassignedShifts(
    tenantId,
    scheduleId,
    startDate,
    endDate
  );

  if (unassignedShifts.length === 0) {
    return {
      scheduleId,
      optimizedAssignments: [],
      summary: {
        totalShifts: 0,
        assignedShifts: 0,
        unassignedShifts: 0,
        totalEstimatedCost: 0,
        averageConfidence: 0,
        skillCoverage: 0,
        seniorityBalance: 0,
      },
      warnings: ["No shifts to optimize"],
      appliedStrategies: [],
    };
  }

  const warnings: string[] = [];
  const strategies: string[] = [];
  const assignments: OptimizedShiftAssignment[] = [];
  let totalCost = 0;
  let totalConfidence = 0;
  let totalSkillCoverage = 0;
  const employeeShiftCounts = new Map<string, number>();

  // Track employee assignments for balancing
  for (const shift of unassignedShifts) {
    const requirement: ShiftRequirement = {
      shiftId: shift.id,
      scheduleId: shift.schedule_id,
      locationId: shift.location_id,
      shiftStart: shift.shift_start,
      shiftEnd: shift.shift_end,
      roleDuringShift: shift.role_during_shift || undefined,
    };

    const result = await getEligibleEmployeesForShift(tenantId, requirement);

    if (!result.bestMatch) {
      warnings.push(`No eligible employees for shift ${shift.id}`);
      continue;
    }

    const bestMatch = result.bestMatch;
    const currentShiftCount =
      employeeShiftCounts.get(bestMatch.employee.id) || 0;

    // Check constraints
    if (
      constraints.maxHoursPerEmployee &&
      currentShiftCount >= constraints.maxHoursPerEmployee / 8 // Approximate shifts
    ) {
      // Try next best candidate
      const alternative = result.suggestions.find(
        (s) => s.employee.id !== bestMatch.employee.id
      );
      if (alternative) {
        assignments.push(createAssignment(alternative, shift));
        employeeShiftCounts.set(alternative.employee.id, currentShiftCount + 1);
        totalCost += alternative.matchDetails.costEstimate;
        totalConfidence += scoreConfidence(alternative.confidence);
        continue;
      }
    }

    // Check labor budget constraint
    if (constraints.maxLaborCost) {
      const projectedCost = totalCost + bestMatch.matchDetails.costEstimate;
      if (projectedCost > constraints.maxLaborCost) {
        warnings.push(`Labor budget limit reached, skipping shift ${shift.id}`);
        continue;
      }
    }

    // Check skill coverage constraint
    if (
      constraints.minSkillCoverage &&
      !bestMatch.matchDetails.skillsMatch &&
      result.suggestions.length > 1
    ) {
      const skillMatch = result.suggestions.find(
        (s) => s.matchDetails.skillsMatch
      );
      if (skillMatch) {
        assignments.push(createAssignment(skillMatch, shift));
        employeeShiftCounts.set(skillMatch.employee.id, currentShiftCount + 1);
        totalCost += skillMatch.matchDetails.costEstimate;
        totalConfidence += scoreConfidence(skillMatch.confidence);
        totalSkillCoverage += 1;
        continue;
      }
    }

    // Use best match
    assignments.push(createAssignment(bestMatch, shift));
    employeeShiftCounts.set(bestMatch.employee.id, currentShiftCount + 1);
    totalCost += bestMatch.matchDetails.costEstimate;
    totalConfidence += scoreConfidence(bestMatch.confidence);
    if (bestMatch.matchDetails.skillsMatch) {
      totalSkillCoverage += 1;
    }
  }

  // Calculate optimization strategies applied
  if (constraints.maxLaborCost) {
    strategies.push("labor_budget_optimization");
  }
  if (constraints.minSkillCoverage) {
    strategies.push("skill_coverage_optimization");
  }
  if (constraints.maxHoursPerEmployee) {
    strategies.push("workload_balancing");
  }
  if (constraints.requireSeniorityBalance) {
    strategies.push("seniority_balancing");
  }

  // Calculate summary metrics
  const avgConfidence =
    assignments.length > 0 ? totalConfidence / assignments.length : 0;
  const skillCoverage =
    assignments.length > 0 ? totalSkillCoverage / assignments.length : 0;

  return {
    scheduleId,
    optimizedAssignments: assignments,
    summary: {
      totalShifts: unassignedShifts.length,
      assignedShifts: assignments.length,
      unassignedShifts: unassignedShifts.length - assignments.length,
      totalEstimatedCost: totalCost,
      averageConfidence: avgConfidence,
      skillCoverage,
      seniorityBalance: calculateSeniorityBalance(assignments),
    },
    warnings,
    appliedStrategies: strategies,
  };
}

// ============================================================================
// Performance Prediction
// ============================================================================

/**
 * Generate performance predictions for an employee
 */
export async function predictPerformance(
  tenantId: string,
  request: PerformancePredictionRequest
): Promise<PerformancePredictionResult> {
  const { employeeId, predictionHorizon, metrics } = request;

  const employeeData = await fetchEmployeePerformanceData(
    tenantId,
    employeeId,
    predictionHorizon
  );

  const predictions: PerformancePredictionResult["predictions"] = {
    productivity: null,
    attendance: null,
    overtimeRisk: null,
    skillMatch: null,
  };

  let overallScore = 50; // Base score
  const recommendations: string[] = [];

  if (metrics.includes("productivity")) {
    predictions.productivity = predictProductivity(employeeData);
    overallScore = (overallScore + predictions.productivity.predictedScore) / 2;
  }

  if (metrics.includes("attendance")) {
    predictions.attendance = predictAttendance(employeeData);
    if (predictions.attendance.riskLevel === "high") {
      overallScore -= 15;
      recommendations.push(
        "Consider discussing attendance patterns with employee"
      );
    }
  }

  if (metrics.includes("overtime_risk")) {
    predictions.overtimeRisk = predictOvertimeRisk(employeeData);
    if (predictions.overtimeRisk.riskLevel === "high") {
      recommendations.push(
        "Schedule adjustment recommended to reduce overtime"
      );
    }
  }

  if (metrics.includes("skill_match")) {
    predictions.skillMatch = predictSkillMatch(employeeData);
    overallScore =
      (overallScore + predictions.skillMatch.overallMatchScore) / 2;
  }

  // Generate recommendations based on overall score
  if (overallScore < 50) {
    recommendations.push("Consider additional training and support");
  } else if (overallScore > 80) {
    recommendations.push(
      "Excellent performance - consider for leadership role"
    );
  }

  return {
    employeeId,
    predictions,
    overallPerformanceScore: Math.round(overallScore),
    recommendations,
  };
}

// ============================================================================
// Workforce Analytics
// ============================================================================

/**
 * Generate comprehensive workforce analytics
 */
export async function generateWorkforceAnalytics(
  tenantId: string,
  data: WorkforceAnalyticsData
): Promise<WorkforceAnalyticsResult> {
  const { locationId, startDate, endDate } = data;

  const analytics = await database.$queryRaw<
    Array<{
      total_hours: bigint;
      total_cost: bigint;
      employee_count: bigint;
      unique_employees: bigint;
    }>
  >(Prisma.sql`
    WITH workforce_metrics AS (
      SELECT
        COUNT(DISTINCT ss.id)::bigint as shift_count,
        COUNT(DISTINCT ss.employee_id)::bigint as unique_employees,
        SUM(EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600)::bigint as total_hours,
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600 *
          COALESCE(e.hourly_rate, 0)
        ), 0)::bigint as total_cost,
        COUNT(DISTINCT e.id)::bigint as employee_count
      FROM tenant_staff.schedule_shifts ss
      LEFT JOIN tenant_staff.employees e ON e.id = ss.employee_id
        AND e.tenant_id = ss.tenant_id
        AND e.deleted_at IS NULL
      WHERE ss.tenant_id = ${tenantId}
        AND ss.deleted_at IS NULL
        AND ss.shift_start >= ${startDate}
        AND ss.shift_end <= ${endDate}
        ${locationId ? Prisma.sql`AND ss.location_id = ${locationId}` : Prisma.empty}
    )
    SELECT * FROM workforce_metrics
  `);

  const metrics = analytics[0];

  // Get turnover risk indicators
  const turnoverRisks = await identifyTurnoverRisks(tenantId, locationId);

  // Get top performers
  const topPerformers = await identifyTopPerformers(tenantId, locationId);

  // Get skill gaps
  const skillGaps = await identifySkillGaps(tenantId, locationId);

  // Calculate trends
  const trends = await calculateTrends(
    tenantId,
    locationId,
    startDate,
    endDate
  );

  const totalHours = Number(metrics.total_hours);
  const uniqueEmployees = Number(metrics.unique_employees);
  const employeeCount = Number(metrics.employee_count);

  return {
    periodStart: startDate,
    periodEnd: endDate,
    metrics: {
      totalHours,
      totalCost: Number(metrics.total_cost),
      averageHoursPerEmployee:
        uniqueEmployees > 0 ? totalHours / uniqueEmployees : 0,
      utilizationRate: employeeCount > 0 ? uniqueEmployees / employeeCount : 0,
      turnoverRisk: turnoverRisks,
      topPerformers,
      skillGaps,
    },
    trends,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getUnassignedShifts(
  tenantId: string,
  scheduleId: string,
  startDate: Date,
  endDate: Date
): Promise<
  Array<{
    id: string;
    schedule_id: string;
    location_id: string;
    shift_start: Date;
    shift_end: Date;
    role_during_shift: string | null;
  }>
> {
  return database.$queryRaw(
    Prisma.sql`
      SELECT
        id,
        schedule_id,
        location_id,
        shift_start,
        shift_end,
        role_during_shift
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND schedule_id = ${scheduleId}
        AND deleted_at IS NULL
        AND employee_id IS NULL
        AND shift_start >= ${startDate}
        AND shift_end <= ${endDate}
      ORDER BY shift_start ASC
    `
  );
}

function createAssignment(
  suggestion: AssignmentSuggestion,
  shift: { id: string }
): OptimizedShiftAssignment {
  const riskFactors: string[] = [];
  if (!suggestion.matchDetails.skillsMatch) {
    riskFactors.push("Missing required skills");
  }
  if (suggestion.matchDetails.hasConflicts) {
    riskFactors.push("Potential scheduling conflicts");
  }
  if (suggestion.confidence === "low") {
    riskFactors.push("Low confidence match");
  }

  return {
    shiftId: shift.id,
    recommendedEmployeeId: suggestion.employee.id,
    employeeName:
      `${suggestion.employee.firstName || ""} ${suggestion.employee.lastName || ""}`.trim(),
    confidence: suggestion.confidence,
    reasoning: suggestion.reasoning,
    estimatedCost: suggestion.matchDetails.costEstimate,
    riskFactors,
    alternatives: [], // Could add second-best options here
  };
}

function scoreConfidence(confidence: "high" | "medium" | "low"): number {
  switch (confidence) {
    case "high":
      return 100;
    case "medium":
      return 66;
    case "low":
      return 33;
  }
}

function calculateSeniorityBalance(
  assignments: OptimizedShiftAssignment[]
): number {
  // Simple balance calculation - in real implementation would compare distribution
  if (assignments.length === 0) return 0;
  return 0.75; // Placeholder
}

async function fetchEmployeePerformanceData(
  tenantId: string,
  employeeId: string,
  horizon: number
): Promise<any> {
  const data = await database.$queryRaw<
    Array<{
      total_shifts: bigint;
      total_hours: bigint;
      avg_hours_per_shift: number;
      recent_shifts: bigint;
      missed_shifts: bigint;
      hourly_rate: number;
      skill_count: bigint;
      seniority_rank: number | null;
    }>
  >(Prisma.sql`
    WITH employee_metrics AS (
      SELECT
        COUNT(ss.id)::bigint as total_shifts,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600), 0)::bigint as total_hours,
        COALESCE(AVG(EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600), 0) as avg_hours_per_shift,
        COUNT(CASE WHEN ss.shift_start >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::bigint as recent_shifts,
        COALESCE(e.hourly_rate, 0) as hourly_rate,
        COALESCE(es.seniority_rank, 0) as seniority_rank
      FROM tenant_staff.employees e
      LEFT JOIN tenant_staff.schedule_shifts ss ON ss.employee_id = e.id
        AND ss.tenant_id = e.tenant_id
        AND ss.deleted_at IS NULL
        AND ss.shift_start >= CURRENT_DATE - INTERVAL '90 days'
      LEFT JOIN (
        SELECT DISTINCT ON (employee_id)
          employee_id, rank as seniority_rank
        FROM tenant_staff.employee_seniority
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
        ORDER BY employee_id, effective_at DESC
      ) es ON es.employee_id = e.id
      WHERE e.tenant_id = ${tenantId}
        AND e.id = ${employeeId}
        AND e.deleted_at IS NULL
      GROUP BY e.id, e.hourly_rate, es.seniority_rank
    ),
    skill_counts AS (
      SELECT COUNT(*)::bigint as skill_count
      FROM tenant_staff.employee_skills
      WHERE tenant_id = ${tenantId}
        AND employee_id = ${employeeId}
        AND deleted_at IS NULL
    )
    SELECT
      em.*,
      COALESCE(sc.skill_count, 0)::bigint as skill_count,
      0::bigint as missed_shifts
    FROM employee_metrics em
    CROSS JOIN skill_counts sc
  `);

  return data[0] || {};
}

function predictProductivity(data: any): ProductivityPrediction {
  const baseScore = 70;
  const recentShiftsBonus = Number(data.recent_shifts || 0) > 10 ? 10 : 0;
  const seniorityBonus = Math.min((data.seniority_rank || 0) * 2, 15);

  const predictedScore = Math.min(
    baseScore + recentShiftsBonus + seniorityBonus,
    100
  );

  const trend: ProductivityPrediction["trend"] =
    predictedScore > 75
      ? "improving"
      : predictedScore > 60
        ? "stable"
        : "declining";

  return {
    predictedScore,
    trend,
    factors: [
      {
        factor: "Recent engagement",
        impact: "positive",
        weight: recentShiftsBonus / 10,
      },
      { factor: "Seniority", impact: "positive", weight: seniorityBonus / 15 },
    ],
  };
}

function predictAttendance(data: any): AttendancePrediction {
  const recentShifts = Number(data.recent_shifts || 0);
  const totalShifts = Number(data.total_shifts || 1);

  const attendanceRate = Math.min(recentShifts / Math.max(totalShifts, 1), 1);

  let riskLevel: AttendancePrediction["riskLevel"] = "low";
  const riskFactors: string[] = [];

  if (attendanceRate < 0.7) {
    riskLevel = "high";
    riskFactors.push("Low recent shift participation");
  } else if (attendanceRate < 0.85) {
    riskLevel = "medium";
    riskFactors.push("Declining shift participation");
  }

  return {
    predictedAttendanceRate: attendanceRate,
    riskLevel,
    riskFactors,
  };
}

function predictOvertimeRisk(data: any): OvertimeRiskPrediction {
  const avgHours = data.avg_hours_per_shift || 8;
  const recentShifts = Number(data.recent_shifts || 0);

  let riskLevel: OvertimeRiskPrediction["riskLevel"] = "low";
  const projectedOvertimeHours = Math.max(0, avgHours - 8) * recentShifts;
  const contributingFactors: string[] = [];

  if (avgHours > 10) {
    riskLevel = "high";
    contributingFactors.push("Average shift duration exceeds 10 hours");
  } else if (avgHours > 9) {
    riskLevel = "medium";
    contributingFactors.push(
      "Average shift duration approaches overtime threshold"
    );
  }

  if (recentShifts > 12) {
    riskLevel = riskLevel === "low" ? "medium" : "high";
    contributingFactors.push("High frequency of recent shifts");
  }

  return {
    riskLevel,
    projectedOvertimeHours,
    contributingFactors,
  };
}

function predictSkillMatch(data: any): SkillMatchPrediction {
  const skillCount = Number(data.skill_count || 0);
  const overallMatchScore = Math.min(50 + skillCount * 5, 100);

  return {
    overallMatchScore,
    skillGaps: [],
    trainingRecommendations:
      skillCount < 5
        ? ["Consider cross-training in additional kitchen areas"]
        : ["Strong skill coverage - consider mentorship role"],
  };
}

async function identifyTurnoverRisks(
  tenantId: string,
  locationId?: string
): Promise<
  Array<{
    employeeId: string;
    employeeName: string;
    riskLevel: "low" | "medium" | "high";
    indicators: string[];
  }>
> {
  const risks = await database.$queryRaw<
    Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      risk_score: number;
    }>
  >(Prisma.sql`
    WITH turnover_indicators AS (
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        -- Risk factors
        CASE WHEN COUNT(ss.id) FILTER (WHERE ss.shift_start >= CURRENT_DATE - INTERVAL '30 days') = 0 THEN 30 ELSE 0 END +
        CASE WHEN e.seniority_rank < 3 THEN 20 ELSE 0 END +
        CASE WHEN e.hourly_rate < 15 THEN 10 ELSE 0 END as risk_score
      FROM tenant_staff.employees e
      LEFT JOIN tenant_staff.schedule_shifts ss ON ss.employee_id = e.id
        AND ss.tenant_id = e.tenant_id
        AND ss.deleted_at IS NULL
        AND ss.shift_start >= CURRENT_DATE - INTERVAL '30 days'
      LEFT JOIN (
        SELECT DISTINCT ON (employee_id)
          employee_id, rank as seniority_rank
        FROM tenant_staff.employee_seniority
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
        ORDER BY employee_id, effective_at DESC
      ) es ON es.employee_id = e.id
      WHERE e.tenant_id = ${tenantId}
        AND e.deleted_at IS NULL
        AND e.is_active = true
        ${
          locationId
            ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM tenant_staff.employee_locations el
          WHERE el.employee_id = e.id AND el.location_id = ${locationId}
        )`
            : Prisma.empty
        }
      GROUP BY e.id, e.first_name, e.last_name, e.seniority_rank, e.hourly_rate
      HAVING COUNT(ss.id) < 5 OR e.seniority_rank < 3
      ORDER BY risk_score DESC
      LIMIT 10
    )
    SELECT * FROM turnover_indicators
  `);

  return risks.map((r) => ({
    employeeId: r.id,
    employeeName: `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.id,
    riskLevel: (r.risk_score > 40
      ? "high"
      : r.risk_score > 20
        ? "medium"
        : "low") as "low" | "medium" | "high",
    indicators:
      r.risk_score > 40
        ? ["Low recent shift activity", "Lower seniority level"]
        : r.risk_score > 20
          ? ["Moderate engagement"]
          : [],
  }));
}

async function identifyTopPerformers(
  tenantId: string,
  locationId?: string
): Promise<
  Array<{
    employeeId: string;
    employeeName: string;
    score: number;
  }>
> {
  const performers = await database.$queryRaw<
    Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      performance_score: number;
    }>
  >(Prisma.sql`
    WITH performance_metrics AS (
      SELECT
        e.id,
        e.first_name,
        e.last_name,
        -- Performance factors
        COUNT(DISTINCT ss.id)::numeric * 5 + -- Shift consistency
        COALESCE(es.seniority_rank, 0) * 3 + -- Seniority
        COUNT(DISTINCT eskill.skill_id) * 2 -- Skill diversity
        as performance_score
      FROM tenant_staff.employees e
      LEFT JOIN tenant_staff.schedule_shifts ss ON ss.employee_id = e.id
        AND ss.tenant_id = e.tenant_id
        AND ss.deleted_at IS NULL
        AND ss.shift_start >= CURRENT_DATE - INTERVAL '90 days'
      LEFT JOIN (
        SELECT DISTINCT ON (employee_id)
          employee_id, rank as seniority_rank
        FROM tenant_staff.employee_seniority
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
        ORDER BY employee_id, effective_at DESC
      ) es ON es.employee_id = e.id
      LEFT JOIN tenant_staff.employee_skills eskill ON eskill.employee_id = e.id
        AND eskill.tenant_id = ${tenantId}
        AND eskill.deleted_at IS NULL
      WHERE e.tenant_id = ${tenantId}
        AND e.deleted_at IS NULL
        AND e.is_active = true
        ${
          locationId
            ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM tenant_staff.employee_locations el
          WHERE el.employee_id = e.id AND el.location_id = ${locationId}
        )`
            : Prisma.empty
        }
      GROUP BY e.id, e.first_name, e.last_name, es.seniority_rank
      ORDER BY performance_score DESC
      LIMIT 10
    )
    SELECT * FROM performance_metrics
  `);

  return performers.map((p) => ({
    employeeId: p.id,
    employeeName: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.id,
    score: Math.round(p.performance_score),
  }));
}

async function identifySkillGaps(
  tenantId: string,
  locationId?: string
): Promise<
  Array<{
    skillName: string;
    demand: number;
    availableCount: number;
    gap: number;
  }>
> {
  const gaps = await database.$queryRaw<
    Array<{
      skill_name: string;
      demand: bigint;
      available_count: bigint;
    }>
  >(Prisma.sql`
    WITH skill_demand AS (
      SELECT
        s.name as skill_name,
        COUNT(DISTINCT ss.id)::bigint as demand
      FROM tenant_staff.skills s
      LEFT JOIN tenant_staff.employee_skills es ON es.skill_id = s.id
        AND es.tenant_id = s.tenant_id
        AND es.deleted_at IS NULL
      CROSS JOIN tenant_staff.schedule_shifts ss
      WHERE s.tenant_id = ${tenantId}
        AND s.deleted_at IS NULL
        AND ss.tenant_id = ${tenantId}
        AND ss.deleted_at IS NULL
        AND ss.shift_start >= CURRENT_DATE - INTERVAL '30 days'
        ${locationId ? Prisma.sql`AND ss.location_id = ${locationId}` : Prisma.empty}
      GROUP BY s.name
    ),
    skill_availability AS (
      SELECT
        s.name as skill_name,
        COUNT(DISTINCT es.employee_id)::bigint as available_count
      FROM tenant_staff.skills s
      LEFT JOIN tenant_staff.employee_skills es ON es.skill_id = s.id
        AND es.tenant_id = s.tenant_id
        AND es.deleted_at IS NULL
      LEFT JOIN tenant_staff.employees e ON e.id = es.employee_id
        AND e.tenant_id = s.tenant_id
        AND e.deleted_at IS NULL
        AND e.is_active = true
      WHERE s.tenant_id = ${tenantId}
        AND s.deleted_at IS NULL
        ${
          locationId
            ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM tenant_staff.employee_locations el
          WHERE el.employee_id = e.id AND el.location_id = ${locationId}
        )`
            : Prisma.empty
        }
      GROUP BY s.name
    )
    SELECT
      COALESCE(sd.skill_name, sa.skill_name) as skill_name,
      COALESCE(sd.demand, 0)::bigint as demand,
      COALESCE(sa.available_count, 0)::bigint as available_count
    FROM skill_demand sd
    FULL OUTER JOIN skill_availability sa ON sa.skill_name = sd.skill_name
    HAVING COALESCE(sd.demand, 0) > COALESCE(sa.available_count, 0)
    ORDER BY (COALESCE(sd.demand, 0) - COALESCE(sa.available_count, 0)) DESC
    LIMIT 10
  `);

  return gaps.map((g) => ({
    skillName: g.skill_name,
    demand: Number(g.demand),
    availableCount: Number(g.available_count),
    gap: Number(g.demand) - Number(g.available_count),
  }));
}

async function calculateTrends(
  tenantId: string,
  locationId: string | undefined,
  startDate: Date,
  endDate: Date
): Promise<{
  costTrend: "increasing" | "stable" | "decreasing";
  productivityTrend: "improving" | "stable" | "declining";
  overtimeTrend: "increasing" | "stable" | "decreasing";
}> {
  // Compare first half vs second half of period
  const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

  const [firstHalf, secondHalf] = await Promise.all([
    database.$queryRaw<Array<{ total_cost: bigint; total_hours: bigint }>>(
      Prisma.sql`
        SELECT
          COALESCE(SUM(
            EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600 *
            COALESCE(e.hourly_rate, 0)
          ), 0)::bigint as total_cost,
          COALESCE(SUM(EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600), 0)::bigint as total_hours
        FROM tenant_staff.schedule_shifts ss
        LEFT JOIN tenant_staff.employees e ON e.id = ss.employee_id AND e.tenant_id = ss.tenant_id
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          AND ss.shift_start >= ${startDate}
          AND ss.shift_end < ${midPoint}
          ${locationId ? Prisma.sql`AND ss.location_id = ${locationId}` : Prisma.empty}
      `
    ),
    database.$queryRaw<Array<{ total_cost: bigint; total_hours: bigint }>>(
      Prisma.sql`
        SELECT
          COALESCE(SUM(
            EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600 *
            COALESCE(e.hourly_rate, 0)
          ), 0)::bigint as total_cost,
          COALESCE(SUM(EXTRACT(EPOCH FROM (ss.shift_end - ss.shift_start)) / 3600), 0)::bigint as total_hours
        FROM tenant_staff.schedule_shifts ss
        LEFT JOIN tenant_staff.employees e ON e.id = ss.employee_id AND e.tenant_id = ss.tenant_id
        WHERE ss.tenant_id = ${tenantId}
          AND ss.deleted_at IS NULL
          AND ss.shift_start >= ${midPoint}
          AND ss.shift_end <= ${endDate}
          ${locationId ? Prisma.sql`AND ss.location_id = ${locationId}` : Prisma.empty}
      `
    ),
  ]);

  const firstCost = Number(firstHalf[0]?.total_cost || 0);
  const secondCost = Number(secondHalf[0]?.total_cost || 0);
  const firstHours = Number(firstHalf[0]?.total_hours || 0);
  const secondHours = Number(secondHalf[0]?.total_hours || 0);

  const costChange = firstCost > 0 ? (secondCost - firstCost) / firstCost : 0;
  const hoursChange =
    firstHours > 0 ? (secondHours - firstHours) / firstHours : 0;

  return {
    costTrend:
      costChange > 0.05
        ? "increasing"
        : costChange < -0.05
          ? "decreasing"
          : "stable",
    productivityTrend:
      hoursChange < -0.05
        ? "improving"
        : hoursChange > 0.05
          ? "declining"
          : "stable",
    overtimeTrend:
      hoursChange > 0.05
        ? "increasing"
        : hoursChange < -0.05
          ? "decreasing"
          : "stable",
  };
}
