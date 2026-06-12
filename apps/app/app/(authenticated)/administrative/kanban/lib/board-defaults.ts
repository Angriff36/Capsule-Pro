import type { BoardColumn, BoardSettings } from "./board-types";

export const DEFAULT_COLUMNS: BoardColumn[] = [
  { status: "backlog", title: "Backlog", color: "neutral", wipLimit: 0 },
  { status: "todo", title: "To Do", color: "blue", wipLimit: 0 },
  {
    status: "in_progress",
    title: "In Progress",
    color: "amber",
    wipLimit: 5,
  },
  { status: "review", title: "Review", color: "purple", wipLimit: 3 },
  { status: "done", title: "Done", color: "green", wipLimit: 0 },
];

export const DEV_MODE_COLUMNS: BoardColumn[] = [
  { status: "backlog", title: "Backlog", color: "neutral", wipLimit: 0 },
  {
    status: "in_progress",
    title: "In Progress",
    color: "amber",
    wipLimit: 0,
  },
  { status: "blocked", title: "Blocked", color: "red", wipLimit: 0 },
  {
    status: "ready_for_qa",
    title: "Ready for QA",
    color: "purple",
    wipLimit: 0,
  },
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
