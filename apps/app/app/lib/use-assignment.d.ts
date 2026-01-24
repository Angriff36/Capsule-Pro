export type ConfidenceLevel = "high" | "medium" | "low";
export type SeniorityInfo = {
  level: string;
  rank: number;
};
export type EmployeeSkill = {
  skillId: string;
  skillName: string;
  proficiencyLevel: number;
};
export type ConflictShift = {
  id: string;
  shiftStart: Date;
  shiftEnd: Date;
  locationName: string;
};
export type EmployeeCandidate = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  isActive: boolean;
  hourlyRate: number | null;
  seniority?: SeniorityInfo;
  skills?: EmployeeSkill[];
  availability?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
  hasConflictingShift: boolean;
  conflictingShifts: ConflictShift[];
};
export type MatchDetails = {
  skillsMatch: boolean;
  skillsMatched: string[];
  skillsMissing: string[];
  seniorityScore: number;
  availabilityMatch: boolean;
  hasConflicts: boolean;
  costEstimate: number;
};
export type AssignmentSuggestion = {
  employee: EmployeeCandidate;
  score: number;
  reasoning: string[];
  confidence: ConfidenceLevel;
  matchDetails: MatchDetails;
};
export type ShiftRequirement = {
  shiftId: string;
  scheduleId: string;
  locationId: string;
  shiftStart: Date;
  shiftEnd: Date;
  roleDuringShift?: string;
  requiredSkills?: string[];
  notes?: string;
};
export type AutoAssignmentResult = {
  shiftId: string;
  suggestions: AssignmentSuggestion[];
  bestMatch: AssignmentSuggestion | null;
  canAutoAssign: boolean;
  laborBudgetWarning?: string;
};
export type BulkAssignmentRequest = {
  shifts: Array<{
    shiftId: string;
    locationId?: string;
    requiredSkills?: string[];
  }>;
};
export type BulkAssignmentResponse = {
  results: AutoAssignmentResult[];
  summary: {
    total: number;
    canAutoAssign: number;
    hasSuggestions: number;
    noSuggestions: number;
  };
};
export type AutoAssignRequest = {
  employeeId?: string;
  force?: boolean;
};
export type AssignmentSuccessResponse = {
  success: boolean;
  shiftId: string;
  employeeId: string;
  message: string;
};
/**
 * Client-side functions for shift assignment operations
 */
export declare function getAssignmentSuggestions(
  shiftId: string,
  params?: {
    locationId?: string;
    requiredSkills?: string[];
  }
): Promise<AutoAssignmentResult>;
export declare function autoAssignShift(
  shiftId: string,
  request: AutoAssignRequest
): Promise<AssignmentSuccessResponse>;
export declare function getBulkAssignmentSuggestions(params?: {
  scheduleId?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<BulkAssignmentResponse>;
export declare function getBulkSuggestionsForShifts(
  request: BulkAssignmentRequest
): Promise<BulkAssignmentResponse>;
export declare function getConfidenceColor(confidence: ConfidenceLevel): string;
export declare function getConfidenceLabel(confidence: ConfidenceLevel): string;
export declare function getConfidenceIcon(confidence: ConfidenceLevel): string;
export declare function formatScore(score: number): string;
export declare function formatEmployeeName(employee: EmployeeCandidate): string;
export declare function getScoreColor(score: number): string;
export declare function getScoreBarWidth(score: number): string;
export declare function getScoreBarColor(score: number): string;
//# sourceMappingURL=use-assignment.d.ts.map
