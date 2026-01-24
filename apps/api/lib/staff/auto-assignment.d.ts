/**
 * Auto-Assignment Service for Staff Shifts
 *
 * This service handles intelligent shift assignment by matching employees
 * to open shifts based on availability, skills, seniority, and labor budget.
 */
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
  availability?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
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
/**
 * Get eligible employees for a shift with scoring
 */
export declare function getEligibleEmployeesForShift(
  tenantId: string,
  requirement: ShiftRequirement
): Promise<AutoAssignmentResult>;
/**
 * Auto-assign an employee to a shift
 */
export declare function autoAssignShift(
  tenantId: string,
  shiftId: string,
  employeeId: string
): Promise<{
  success: boolean;
  message: string;
  shiftId: string;
  employeeId: string;
}>;
/**
 * Get assignment suggestions for multiple open shifts
 */
export declare function getAssignmentSuggestionsForMultipleShifts(
  tenantId: string,
  shiftRequirements: ShiftRequirement[]
): Promise<AutoAssignmentResult[]>;
//# sourceMappingURL=auto-assignment.d.ts.map
