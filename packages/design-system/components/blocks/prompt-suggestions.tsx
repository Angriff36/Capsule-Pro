/**
 * PromptSuggestions - Dynamic contextual prompt suggestions for empty states
 *
 * When a section is empty, this component displays 3-5 dynamically generated
 * prompt suggestions tailored to the user's role, industry, or prior activity.
 * Users can click a suggestion to auto-populate a starting template.
 */

import { cn } from "@repo/design-system/lib/utils";
import {
  ArrowRight,
  Calendar,
  ChefHat,
  ClipboardList,
  FileText,
  type LucideIcon,
  Package,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { Button } from "../ui/button";

// =============================================================================
// TYPES
// =============================================================================

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "kitchen_lead"
  | "kitchen_staff"
  | "staff";

export type SectionContext =
  | "events"
  | "clients"
  | "tasks"
  | "inventory"
  | "shipments"
  | "recipes"
  | "prep-lists"
  | "schedules"
  | "invoices"
  | "reports"
  | "general";

export interface PromptSuggestion {
  id: string;
  label: string;
  description: string;
  icon?: LucideIcon;
  template?: Record<string, unknown>;
  href?: string;
  action?: () => void;
  roles?: UserRole[];
  priority?: number;
}

export interface UserActivityContext {
  recentEvents?: number;
  recentClients?: number;
  recentTasks?: number;
  hasImportedData?: boolean;
  completedOnboarding?: boolean;
  daysSinceLastActivity?: number;
}

export interface PromptSuggestionsProps {
  section: SectionContext;
  userRole?: UserRole;
  activityContext?: UserActivityContext;
  suggestions?: PromptSuggestion[];
  onSuggestionClick?: (suggestion: PromptSuggestion) => void;
  maxSuggestions?: number;
  className?: string;
  variant?: "default" | "compact";
}

// =============================================================================
// DEFAULT PROMPT TEMPLATES BY SECTION
// =============================================================================

const DEFAULT_PROMPTS: Record<SectionContext, PromptSuggestion[]> = {
  events: [
    {
      id: "wedding-event",
      label: "Wedding reception",
      description: "Create a wedding event with guest count and venue details",
      icon: Sparkles,
      template: { eventType: "wedding", expectedGuests: 150 },
      href: "/events/new?type=wedding",
    },
    {
      id: "corporate-event",
      label: "Corporate luncheon",
      description: "Business catering with dietary accommodations",
      icon: Users,
      template: { eventType: "corporate", expectedGuests: 50 },
      href: "/events/new?type=corporate",
    },
    {
      id: "birthday-party",
      label: "Birthday celebration",
      description: "Private party with custom menu options",
      icon: Calendar,
      template: { eventType: "birthday", expectedGuests: 30 },
      href: "/events/new?type=birthday",
    },
    {
      id: "import-event",
      label: "Import from PDF",
      description:
        "Upload an event proposal or contract to auto-extract details",
      icon: FileText,
      href: "/events/import",
    },
  ],
  clients: [
    {
      id: "corporate-client",
      label: "Corporate account",
      description: "Add a business client with billing contacts",
      icon: Users,
      template: { clientType: "company" },
      href: "/crm/clients/new?type=company",
    },
    {
      id: "individual-client",
      label: "Individual client",
      description: "Add a personal client for private events",
      icon: Users,
      template: { clientType: "individual" },
      href: "/crm/clients/new?type=individual",
    },
    {
      id: "venue-partner",
      label: "Venue partner",
      description: "Add a venue as a partner location",
      icon: FileText,
      template: { clientType: "venue" },
      href: "/crm/clients/new?type=venue",
    },
  ],
  tasks: [
    {
      id: "prep-task",
      label: "Prep list item",
      description: "Add a standard prep task",
      icon: ChefHat,
      template: { taskType: "prep" },
    },
    {
      id: "inventory-task",
      label: "Inventory check",
      description: "Create a stock verification task",
      icon: Package,
      template: { taskType: "inventory" },
    },
    {
      id: "cleaning-task",
      label: "Cleaning duty",
      description: "Assign a cleaning or maintenance task",
      icon: ClipboardList,
      template: { taskType: "cleaning" },
    },
  ],
  inventory: [
    {
      id: "add-ingredient",
      label: "Add ingredient",
      description: "Add a raw ingredient with supplier info",
      icon: ChefHat,
      template: { itemType: "ingredient" },
      href: "/inventory/items/new?type=ingredient",
    },
    {
      id: "add-supply",
      label: "Add supply item",
      description: "Add disposable or reusable supplies",
      icon: Package,
      template: { itemType: "supply" },
      href: "/inventory/items/new?type=supply",
    },
    {
      id: "start-audit",
      label: "Start inventory audit",
      description: "Begin a count session to verify stock levels",
      icon: ClipboardList,
      href: "/warehouse/audit",
    },
  ],
  shipments: [
    {
      id: "receive-shipment",
      label: "Receive delivery",
      description: "Log incoming supplier delivery",
      icon: Truck,
      template: { shipmentType: "incoming" },
      href: "/warehouse/shipments/new?type=incoming",
    },
    {
      id: "send-shipment",
      label: "Send to event",
      description: "Create outgoing shipment for an event",
      icon: Truck,
      template: { shipmentType: "outgoing" },
      href: "/warehouse/shipments/new?type=outgoing",
    },
    {
      id: "track-shipment",
      label: "Track packages",
      description: "View and update shipment status",
      icon: Package,
      href: "/warehouse/shipments",
    },
  ],
  recipes: [
    {
      id: "add-recipe",
      label: "Add new recipe",
      description: "Create a recipe with ingredients and steps",
      icon: ChefHat,
      href: "/kitchen/recipes/new",
    },
    {
      id: "import-recipe",
      label: "Import from file",
      description: "Upload a recipe document to extract details",
      icon: FileText,
      href: "/kitchen/recipes/import",
    },
    {
      id: "copy-recipe",
      label: "Duplicate existing",
      description: "Copy and modify an existing recipe",
      icon: ClipboardList,
      href: "/kitchen/recipes",
    },
  ],
  "prep-lists": [
    {
      id: "create-prep-list",
      label: "Daily prep list",
      description: "Create a prep list for today's service",
      icon: ClipboardList,
      href: "/kitchen/prep/new",
    },
    {
      id: "event-prep",
      label: "Event prep list",
      description: "Generate prep list from upcoming events",
      icon: Calendar,
      template: { listType: "event" },
    },
  ],
  schedules: [
    {
      id: "create-schedule",
      label: "Weekly schedule",
      description: "Create staff schedule for the week",
      icon: Calendar,
      href: "/scheduling/new",
    },
    {
      id: "copy-schedule",
      label: "Copy last week",
      description: "Duplicate the previous week's schedule",
      icon: ClipboardList,
    },
  ],
  invoices: [
    {
      id: "create-invoice",
      label: "Event invoice",
      description: "Generate invoice for a completed event",
      icon: FileText,
    },
    {
      id: "recurring-invoice",
      label: "Recurring billing",
      description: "Set up recurring invoice for retainer clients",
      icon: Calendar,
    },
  ],
  reports: [
    {
      id: "event-report",
      label: "Event profitability",
      description: "Analyze revenue and costs by event",
      icon: FileText,
      href: "/events/reports",
    },
    {
      id: "inventory-report",
      label: "Inventory valuation",
      description: "Current stock value and variance",
      icon: Package,
      href: "/warehouse/reports",
    },
  ],
  general: [
    {
      id: "get-started",
      label: "Get started",
      description: "Begin with a guided tour",
      icon: Sparkles,
    },
    {
      id: "explore-features",
      label: "Explore features",
      description: "Discover all available tools",
      icon: ArrowRight,
    },
  ],
};

// =============================================================================
// ROLE-BASED PROMPT FILTERING
// =============================================================================

function filterByRole(
  suggestions: PromptSuggestion[],
  role?: UserRole
): PromptSuggestion[] {
  if (!role) return suggestions;
  return suggestions.filter(
    (s) => !s.roles || s.roles.length === 0 || s.roles.includes(role)
  );
}

// =============================================================================
// ACTIVITY-BASED PROMPT PRIORITIZATION
// =============================================================================

function prioritizeByActivity(
  suggestions: PromptSuggestion[],
  activity?: UserActivityContext
): PromptSuggestion[] {
  if (!activity) return suggestions;

  const scored = suggestions.map((s) => {
    let score = s.priority ?? 0;

    // New users should see onboarding-related prompts first
    if (!activity.completedOnboarding && s.id.includes("get-started")) {
      score += 10;
    }

    // If user has events but no clients, suggest adding clients
    if (
      (activity.recentEvents ?? 0) > 0 &&
      (activity.recentClients ?? 0) === 0 &&
      s.id.includes("client")
    ) {
      score += 5;
    }

    // If user hasn't been active, suggest quick-start options
    if ((activity.daysSinceLastActivity ?? 0) > 7 && s.id.includes("import")) {
      score += 3;
    }

    return { ...s, priority: score };
  });

  return scored.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PromptSuggestions({
  section,
  userRole,
  activityContext,
  suggestions: customSuggestions,
  onSuggestionClick,
  maxSuggestions = 5,
  className,
  variant = "default",
}: PromptSuggestionsProps) {
  // Get base suggestions for this section
  const baseSuggestions = customSuggestions ?? DEFAULT_PROMPTS[section] ?? [];

  // Apply role filtering
  const roleFiltered = filterByRole(baseSuggestions, userRole);

  // Apply activity-based prioritization
  const prioritized = prioritizeByActivity(roleFiltered, activityContext);

  // Limit to max suggestions
  const displaySuggestions = prioritized.slice(0, maxSuggestions);

  if (displaySuggestions.length === 0) {
    return null;
  }

  const handleSuggestionClick = (suggestion: PromptSuggestion) => {
    if (suggestion.action) {
      suggestion.action();
    }
    onSuggestionClick?.(suggestion);
  };

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {displaySuggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <Button
              asChild={!!suggestion.href}
              className="h-auto py-1.5"
              key={suggestion.id}
              onClick={
                suggestion.href
                  ? undefined
                  : () => handleSuggestionClick(suggestion)
              }
              size="sm"
              variant="outline"
            >
              {suggestion.href ? (
                <a href={suggestion.href}>
                  {Icon && <Icon className="size-3.5 mr-1.5" />}
                  {suggestion.label}
                </a>
              ) : (
                <>
                  {Icon && <Icon className="size-3.5 mr-1.5" />}
                  {suggestion.label}
                </>
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="text-sm font-medium text-muted-foreground mb-3">
        Quick start suggestions
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {displaySuggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <Button
              asChild={!!suggestion.href}
              className="h-auto justify-start py-3 px-4 text-left"
              key={suggestion.id}
              onClick={
                suggestion.href
                  ? undefined
                  : () => handleSuggestionClick(suggestion)
              }
              variant="outline"
            >
              {suggestion.href ? (
                <a
                  className="flex items-start gap-3 w-full"
                  href={suggestion.href}
                >
                  {Icon && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{suggestion.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.description}
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 ml-auto" />
                </a>
              ) : (
                <div className="flex items-start gap-3 w-full">
                  {Icon && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{suggestion.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.description}
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground/50 ml-auto" />
                </div>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// CONVENIENCE HOOK
// =============================================================================

export function usePromptSuggestions(
  section: SectionContext,
  userRole?: UserRole,
  activityContext?: UserActivityContext
) {
  const baseSuggestions = DEFAULT_PROMPTS[section] ?? [];
  const roleFiltered = filterByRole(baseSuggestions, userRole);
  const prioritized = prioritizeByActivity(roleFiltered, activityContext);

  return prioritized;
}
