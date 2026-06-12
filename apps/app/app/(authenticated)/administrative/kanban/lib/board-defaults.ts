import type { BoardColumn, BoardSettings } from "./board-types";

// Column statuses MUST match the AdminTask state machine
// (manifest/source/admin-task-rules.manifest): backlog / in_progress /
// review / done (+ cancelled, which is not shown as a board column).
// Moves into any other status are rejected by the governed API.
export const DEFAULT_COLUMNS: BoardColumn[] = [
  { status: "backlog", title: "Backlog", color: "neutral", wipLimit: 0 },
  {
    status: "in_progress",
    title: "In Progress",
    color: "amber",
    wipLimit: 5,
  },
  { status: "review", title: "Review", color: "purple", wipLimit: 3 },
  { status: "done", title: "Done", color: "green", wipLimit: 0 },
];

// Dev mode shows a narrower view of the SAME state machine — no custom
// statuses (the API rejects moves into states the state machine doesn't own).
export const DEV_MODE_COLUMNS: BoardColumn[] = [
  { status: "backlog", title: "Backlog", color: "neutral", wipLimit: 0 },
  {
    status: "in_progress",
    title: "In Progress",
    color: "amber",
    wipLimit: 0,
  },
  { status: "review", title: "Review", color: "purple", wipLimit: 0 },
  { status: "done", title: "Done", color: "green", wipLimit: 0 },
];

export const DEFAULT_SETTINGS: BoardSettings = {
  devModeEnabled: false,
  devColumns: undefined,
  collapseDone: false,
  defaultSort: "position",
};

export const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-600 bg-red-50 border-red-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
  low: "text-slate-600 bg-slate-50 border-slate-200",
};

export const COLUMN_COLORS: Record<string, string> = {
  neutral: "border-t-slate-400",
  blue: "border-t-blue-500",
  amber: "border-t-amber-500",
  purple: "border-t-purple-500",
  green: "border-t-green-500",
  red: "border-t-red-500",
};

export const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export const ENVIRONMENT_OPTIONS = [
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "development", label: "Development" },
  { value: "local", label: "Local" },
];
