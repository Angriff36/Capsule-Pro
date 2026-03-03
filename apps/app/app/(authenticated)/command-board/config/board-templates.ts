// ============================================================================
// Board Templates — Pre-built board configurations
// ============================================================================

import type { BoardScope } from "../types/board";
import type { EntityType } from "../types/entities";

// ============================================================================
// Template Types
// ============================================================================

/** A pre-built board template configuration */
export interface BoardTemplate {
  /** Unique template identifier */
  id: string;
  /** Display name for the template selector */
  name: string;
  /** Short description of what this template is for */
  description: string;
  /** Icon name from lucide-react */
  icon: string;
  /** Optional prefix for auto-generated board names */
  namePrefix?: string;
  /** Default scope for auto-populating entities */
  scope: BoardScope;
  /** Whether auto-populate is enabled by default */
  autoPopulate: boolean;
  /** Suggested tags for boards created from this template */
  tags: string[];
  /** Optional color theme for the template card */
  color?: {
    bg: string;
    border: string;
    icon: string;
  };
}

// ============================================================================
// Template Definitions
// ============================================================================

/**
 * Template: This Week's Events
 * Shows all events in the next 7 days with their related tasks and staff.
 */
export const TEMPLATE_THIS_WEEKS_EVENTS: BoardTemplate = {
  id: "this-weeks-events",
  name: "This Week's Events",
  description:
    "Auto-populate with events in the next 7 days, their tasks, and assigned staff.",
  icon: "Calendar",
  namePrefix: "Weekly: ",
  scope: {
    entityTypes: ["event", "prep_task", "employee"] as EntityType[],
    dateRange: { start: "now", end: "+7d" },
    statuses: ["pending", "in_progress", "confirmed", "overdue"],
  },
  autoPopulate: true,
  tags: ["weekly", "operations"],
  color: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    icon: "text-orange-600 dark:text-orange-400",
  },
};

/**
 * Template: Kitchen Ops
 * Focus on kitchen tasks and inventory for today's operations.
 */
export const TEMPLATE_KITCHEN_OPS: BoardTemplate = {
  id: "kitchen-ops",
  name: "Kitchen Ops",
  description:
    "Today's kitchen tasks, inventory items needing attention, and prep work.",
  icon: "ChefHat",
  namePrefix: "Kitchen: ",
  scope: {
    entityTypes: ["kitchen_task", "prep_task", "inventory_item"] as EntityType[],
    dateRange: { start: "now", end: "+1d" },
    statuses: ["pending", "in_progress"],
  },
  autoPopulate: true,
  tags: ["kitchen", "daily"],
  color: {
    bg: "bg-teal-50 dark:bg-teal-950/30",
    border: "border-teal-200 dark:border-teal-800",
    icon: "text-teal-600 dark:text-teal-400",
  },
};

/**
 * Template: Staff Management
 * Overview of all employees and their assignments.
 */
export const TEMPLATE_STAFF_MANAGEMENT: BoardTemplate = {
  id: "staff-management",
  name: "Staff Management",
  description: "All active staff members and their upcoming event assignments.",
  icon: "Users",
  namePrefix: "Staff: ",
  scope: {
    entityTypes: ["employee", "event"] as EntityType[],
    dateRange: { start: "now", end: "+14d" },
  },
  autoPopulate: true,
  tags: ["staff", "management"],
  color: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
  },
};

/**
 * Template: Client Overview
 * All clients with their events and proposals.
 */
export const TEMPLATE_CLIENT_OVERVIEW: BoardTemplate = {
  id: "client-overview",
  name: "Client Overview",
  description: "All clients with their associated events and proposals.",
  icon: "Briefcase",
  namePrefix: "Clients: ",
  scope: {
    entityTypes: ["client", "event", "proposal"] as EntityType[],
  },
  autoPopulate: true,
  tags: ["clients", "sales"],
  color: {
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
  },
};

/**
 * Template: Event Prep
 * Deep dive into a specific event's prep tasks and logistics.
 */
export const TEMPLATE_EVENT_PREP: BoardTemplate = {
  id: "event-prep",
  name: "Event Prep",
  description:
    "Focus on prep tasks for upcoming events — sorted by due date.",
  icon: "ListTodo",
  namePrefix: "Prep: ",
  scope: {
    entityTypes: ["prep_task", "event", "shipment"] as EntityType[],
    dateRange: { start: "-7d", end: "+14d" },
    statuses: ["pending", "in_progress", "overdue"],
  },
  autoPopulate: true,
  tags: ["prep", "logistics"],
  color: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
};

/**
 * Template: Inventory Watch
 * Monitor inventory items that need attention.
 */
export const TEMPLATE_INVENTORY_WATCH: BoardTemplate = {
  id: "inventory-watch",
  name: "Inventory Watch",
  description: "Items below par level and upcoming shipments.",
  icon: "Package",
  namePrefix: "Inventory: ",
  scope: {
    entityTypes: ["inventory_item", "shipment"] as EntityType[],
  },
  autoPopulate: true,
  tags: ["inventory", "ordering"],
  color: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
  },
};

/**
 * Template: Blank Board
 * Start fresh with no pre-populated entities.
 */
export const TEMPLATE_BLANK: BoardTemplate = {
  id: "blank",
  name: "Blank Board",
  description: "Start with a clean slate — add entities as you need them.",
  icon: "Plus",
  scope: {
    entityTypes: [],
  },
  autoPopulate: false,
  tags: [],
  color: {
    bg: "bg-slate-50 dark:bg-slate-950/30",
    border: "border-slate-200 dark:border-slate-800",
    icon: "text-slate-600 dark:text-slate-400",
  },
};

// ============================================================================
// All Templates
// ============================================================================

/** All available board templates */
export const BOARD_TEMPLATES: BoardTemplate[] = [
  TEMPLATE_THIS_WEEKS_EVENTS,
  TEMPLATE_KITCHEN_OPS,
  TEMPLATE_STAFF_MANAGEMENT,
  TEMPLATE_CLIENT_OVERVIEW,
  TEMPLATE_EVENT_PREP,
  TEMPLATE_INVENTORY_WATCH,
  TEMPLATE_BLANK,
];

// ============================================================================
// Template Helpers
// ============================================================================

/** Get a template by ID */
export function getTemplateById(id: string): BoardTemplate | undefined {
  return BOARD_TEMPLATES.find((t) => t.id === id);
}

/** Get the default template (blank) */
export function getDefaultTemplate(): BoardTemplate {
  return TEMPLATE_BLANK;
}

/** All template IDs for type-safe referencing */
export type BoardTemplateId = (typeof BOARD_TEMPLATES)[number]["id"];
