"use server";

// Re-export server actions so they are bound to this route segment (fixes POST 404)
// biome-ignore lint: intentional route-scoped action binding for server action POST
export {
  deleteEventSummary,
  type GeneratedEventSummary,
  generateEventSummary,
  getEventSummary,
} from "../actions/event-summary";
export {
  generateTaskBreakdown,
  saveTaskBreakdown,
  type TaskBreakdown,
  type TaskBreakdownItem,
} from "../actions/task-breakdown";
