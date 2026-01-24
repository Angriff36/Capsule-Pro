"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssignmentSuggestions = getAssignmentSuggestions;
exports.autoAssignShift = autoAssignShift;
exports.getBulkAssignmentSuggestions = getBulkAssignmentSuggestions;
exports.getBulkSuggestionsForShifts = getBulkSuggestionsForShifts;
exports.getConfidenceColor = getConfidenceColor;
exports.getConfidenceLabel = getConfidenceLabel;
exports.getConfidenceIcon = getConfidenceIcon;
exports.formatScore = formatScore;
exports.formatEmployeeName = formatEmployeeName;
exports.getScoreColor = getScoreColor;
exports.getScoreBarWidth = getScoreBarWidth;
exports.getScoreBarColor = getScoreBarColor;
/**
 * Client-side functions for shift assignment operations
 */
// Get assignment suggestions for a single shift
async function getAssignmentSuggestions(shiftId, params) {
  const searchParams = new URLSearchParams();
  if (params?.locationId) {
    searchParams.set("locationId", params.locationId);
  }
  if (params?.requiredSkills) {
    searchParams.set("requiredSkills", params.requiredSkills.join(","));
  }
  const response = await fetch(
    `/api/staff/shifts/${shiftId}/assignment-suggestions?${searchParams.toString()}`
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get assignment suggestions");
  }
  return response.json();
}
// Auto-assign an employee to a shift
async function autoAssignShift(shiftId, request) {
  const response = await fetch(
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
async function getBulkAssignmentSuggestions(params) {
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
  const response = await fetch(
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
async function getBulkSuggestionsForShifts(request) {
  const response = await fetch(
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
function getConfidenceColor(confidence) {
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
function getConfidenceLabel(confidence) {
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
function getConfidenceIcon(confidence) {
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
function formatScore(score) {
  return Math.round(score).toString();
}
// Helper to format employee name
function formatEmployeeName(employee) {
  const first = employee.firstName || "";
  const last = employee.lastName || "";
  if (first && last) {
    return `${first} ${last}`;
  }
  return first || last || employee.email;
}
// Helper to get score color
function getScoreColor(score) {
  if (score >= 70) {
    return "text-green-700 dark:text-green-300";
  }
  if (score >= 40) {
    return "text-yellow-700 dark:text-yellow-300";
  }
  return "text-red-700 dark:text-red-300";
}
// Helper to get score bar width
function getScoreBarWidth(score) {
  return `${Math.min(score, 100)}%`;
}
// Helper to get score bar color
function getScoreBarColor(score) {
  if (score >= 70) {
    return "bg-green-500";
  }
  if (score >= 40) {
    return "bg-yellow-500";
  }
  return "bg-red-500";
}
