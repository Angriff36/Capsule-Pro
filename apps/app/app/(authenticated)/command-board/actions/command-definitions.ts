// ============================================================================
// Board Command Definitions — shared between server actions and client UI
// ============================================================================
// This file intentionally does NOT have "use server" because it exports
// non-function values (constants, types) that client components need.

/** Available board command identifiers */
export type BoardCommandId =
  | "clear_board"
  | "auto_populate"
  | "show_this_week"
  | "show_overdue"
  | "show_all_events"
  | "show_all_tasks";

/** Metadata for a board command shown in the command palette */
export interface CommandDefinition {
  id: BoardCommandId;
  label: string;
  description: string;
  group: "board" | "quick_action";
  keywords: string[];
}

/** All available board commands */
export const BOARD_COMMANDS: CommandDefinition[] = [
  {
    id: "clear_board",
    label: "Clear Board",
    description: "Remove all projections from this board",
    group: "board",
    keywords: ["clear", "remove", "reset", "empty", "clean"],
  },
  {
    id: "auto_populate",
    label: "Auto-Populate Board",
    description: "Add matching entities based on board scope",
    group: "board",
    keywords: ["auto", "populate", "fill", "add", "refresh"],
  },
  {
    id: "show_this_week",
    label: "Show This Week",
    description: "Populate board with this week's events and tasks",
    group: "quick_action",
    keywords: ["week", "this week", "upcoming", "schedule"],
  },
  {
    id: "show_overdue",
    label: "Show Overdue",
    description: "Show all overdue tasks and past-due events",
    group: "quick_action",
    keywords: ["overdue", "late", "past due", "behind", "missed"],
  },
  {
    id: "show_all_events",
    label: "Show All Events",
    description: "Add all active events to the board",
    group: "quick_action",
    keywords: ["events", "all events", "every event"],
  },
  {
    id: "show_all_tasks",
    label: "Show All Tasks",
    description: "Add all pending tasks to the board",
    group: "quick_action",
    keywords: ["tasks", "all tasks", "every task", "prep", "kitchen"],
  },
];
