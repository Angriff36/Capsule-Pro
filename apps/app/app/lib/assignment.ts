"use client";

import { apiFetch } from "@/app/lib/api";
// Type definitions matching the API response

export type ConfidenceLevel = "high" | "medium" | "low";

export interface SeniorityInfo {
  level: string;
  rank: number;
}

export interface EmployeeSkill {
  skillId: string;
  skillName: string;
  proficiencyLevel: number;
}

export interface ConflictShift {
  id: string;
  shiftStart: Date;
  shiftEnd: Date;
  locationName: string;
}

export interface EmployeeCandidate {
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
}

export interface MatchDetails {
  skillsMatch: boolean;
  skillsMatched: string[];
  skillsMissing: string[];
  seniorityScore: number;
  availabilityMatch: boolean;
  hasConflicts: boolean;
  costEstimate: number;
}

export interface AssignmentSuggestion {
  employee: EmployeeCandidate;
  score: number;
  reasoning: string[];
  confidence: ConfidenceLevel;
  matchDetails: MatchDetails;
}

export interface ShiftRequirement {
  shiftId: string;
  scheduleId: string;
  locationId: string;
  shiftStart: Date;
  shiftEnd: Date;
  roleDuringShift?: string;
  requiredSkills?: string[];
  notes?: string;
}

export interface AutoAssignmentResult {
  shiftId: string;
  suggestions: AssignmentSuggestion[];
  bestMatch: AssignmentSuggestion | null;
  canAutoAssign: boolean;
  laborBudgetWarning?: string;
}

export interface BulkAssignmentRequest {
  shifts: Array<{
    shiftId: string;
    locationId?: string;
    requiredSkills?: string[];
  }>;
}

export interface BulkAssignmentResponse {
  results: AutoAssignmentResult[];
  summary: {
    total: number;
    canAutoAssign: number;
    hasSuggestions: number;
    noSuggestions: number;
  };
}

export interface AutoAssignRequest {
  employeeId?: string;
  force?: boolean;
}

export interface AssignmentSuccessResponse {
  success: boolean;
  shiftId: string;
  employeeId: string;
  message: string;
}

/**
 * Client-side functions for shift assignment operations
 */

// Get assignment suggestions for a single shift
export async function getAssignmentSuggestions(
  shiftId: string,
  params?: {
    locationId?: string;
    requiredSkills?: string[];
  }
): Promise<AutoAssignmentResult> {
  const searchParams = new URLSearchParams();
  if (params?.locationId) {
    searchParams.set("locationId", params.locationId);
  }
  if (params?.requiredSkills) {
    searchParams.set("requiredSkills", params.requiredSkills.join(","));
  }

  const response = await apiFetch(
    `/api/staff/shifts/${shiftId}/assignment-suggestions?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get assignment suggestions");
  }

  return response.json();
}

// Auto-assign an employee to a shift
export async function autoAssignShift(
  shiftId: string,
  request: AutoAssignRequest
): Promise<AssignmentSuccessResponse> {
  const response = await apiFetch(
    `/api/staff/shifts/${shiftId}/assignment-suggestions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to assign shift");
  }

  return response.json();
}

// Get bulk assignment suggestions for open shifts
export async function getBulkAssignmentSuggestions(params?: {
  scheduleId?: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<BulkAssignmentResponse> {
  const searchParams = new URLSearchParams();
  if (params?.scheduleId) {
    searchParams.set("scheduleId", params.scheduleId);
  }
  if (params?.locationId) {
    searchParams.set("locationId", params.locationId);
  }
  if (params?.startDate) {
    searchParams.set("startDate", params.startDate);
  }
  if (params?.endDate) {
    searchParams.set("endDate", params.endDate);
  }

  const response = await apiFetch(
    `/api/staff/shifts/bulk-assignment-suggestions?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.message || "Failed to get bulk assignment suggestions"
    );
  }

  return response.json();
}

// Get suggestions for specific shifts
export async function getBulkSuggestionsForShifts(
  request: BulkAssignmentRequest
): Promise<BulkAssignmentResponse> {
  const response = await apiFetch(
    "/api/staff/shifts/bulk-assignment-suggestions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get bulk suggestions");
  }

  return response.json();
}

// Helper to get confidence level badge color
export function getConfidenceColor(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "high":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700";
    case "low":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Helper to get confidence level label
export function getConfidenceLabel(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "high":
      return "High Match";
    case "medium":
      return "Medium Match";
    case "low":
      return "Low Match";
    default:
      return "Unknown";
  }
}

// Helper to get confidence level icon
export function getConfidenceIcon(confidence: ConfidenceLevel): string {
  switch (confidence) {
    case "high":
      return "✓";
    case "medium":
      return "~";
    case "low":
      return "!";
    default:
      return "?";
  }
}

// Helper to format score
export function formatScore(score: number): string {
  return Math.round(score).toString();
}

// Helper to format employee name
export function formatEmployeeName(employee: EmployeeCandidate): string {
  const first = employee.firstName || "";
  const last = employee.lastName || "";
  if (first && last) {
    return `${first} ${last}`;
  }
  return first || last || employee.email;
}

// Helper to get score color
export function getScoreColor(score: number): string {
  if (score >= 70) {
    return "text-green-700 dark:text-green-300";
  }
  if (score >= 40) {
    return "text-yellow-700 dark:text-yellow-300";
  }
  return "text-red-700 dark:text-red-300";
}

// Helper to get score bar width
export function getScoreBarWidth(score: number): string {
  return `${Math.min(score, 100)}%`;
}

// Helper to get score bar color
export function getScoreBarColor(score: number): string {
  if (score >= 70) {
    return "bg-green-500";
  }
  if (score >= 40) {
    return "bg-yellow-500";
  }
  return "bg-red-500";
}
