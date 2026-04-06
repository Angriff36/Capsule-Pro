import type { ModuleKey } from "../module-nav";

interface QuickPrompt {
  label: string;
  prompt: string;
}

const MODULE_PROMPTS: Partial<Record<ModuleKey, QuickPrompt[]>> = {
  calendar: [
    {
      label: "What's coming up?",
      prompt: "What events are scheduled this week?",
    },
    { label: "Find conflicts", prompt: "Are there any scheduling conflicts?" },
  ],
  events: [
    { label: "Create event", prompt: "Help me create a new event" },
    {
      label: "Event summary",
      prompt: "Summarize upcoming events and their status",
    },
  ],
  kitchen: [
    { label: "Prep status", prompt: "What's the current prep list status?" },
    { label: "Recipe lookup", prompt: "Search recipes for me" },
  ],
  inventory: [
    { label: "Low stock", prompt: "What items are running low?" },
    { label: "Import items", prompt: "Help me import inventory items" },
  ],
  staffing: [
    {
      label: "Coverage gaps",
      prompt: "Are there any staffing coverage gaps this week?",
    },
    {
      label: "Availability",
      prompt: "Show me staff availability for this week",
    },
  ],
  logistics: [
    {
      label: "Deliveries today",
      prompt: "What deliveries are scheduled today?",
    },
    { label: "Route status", prompt: "Show me current route status" },
  ],
  procurement: [
    { label: "Pending orders", prompt: "What purchase orders are pending?" },
    { label: "Budget check", prompt: "How is procurement budget tracking?" },
  ],
  analytics: [
    {
      label: "This week",
      prompt: "Give me a summary of this week's key metrics",
    },
    { label: "Revenue", prompt: "How is revenue trending?" },
  ],
};

const DEFAULT_PROMPTS: QuickPrompt[] = [
  {
    label: "What needs attention?",
    prompt: "What items need my attention right now?",
  },
  {
    label: "Suggest actions",
    prompt: "What actions should I take based on current state?",
  },
  {
    label: "Find conflicts",
    prompt: "Are there any conflicts or issues I should know about?",
  },
];

export function getModulePrompts(moduleKey: ModuleKey): QuickPrompt[] {
  return MODULE_PROMPTS[moduleKey] ?? DEFAULT_PROMPTS;
}

export type { QuickPrompt };
