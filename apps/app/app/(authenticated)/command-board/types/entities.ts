// ============================================================================
// Entity Types — Resolved entity data for command board cards
// ============================================================================

/** Entity types that can be projected onto a board */
export type EntityType =
  | "event"
  | "client"
  | "prep_task"
  | "kitchen_task"
  | "employee"
  | "inventory_item"
  | "recipe"
  | "dish"
  | "proposal"
  | "shipment"
  | "note"
  | "risk";

// ============================================================================
// Resolved Entity Interfaces
// ============================================================================

/** Resolved event data for display on the board */
export interface ResolvedEvent {
  id: string;
  title: string;
  eventDate: Date | null;
  guestCount: number | null;
  status: string;
  budget: number | null;
  clientName: string | null;
  venueName: string | null;
  assignedTo: string | null;
}

/** Resolved client data for display on the board */
export interface ResolvedClient {
  id: string;
  clientType: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

/** Resolved prep task data for display on the board */
export interface ResolvedPrepTask {
  id: string;
  name: string;
  status: string;
  priority: string | null;
  dueByDate: Date | null;
  eventTitle: string | null;
  eventId: string | null;
  assigneeName: string | null;
  assigneeId: string | null;
}

/** Resolved kitchen task data for display on the board */
export interface ResolvedKitchenTask {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  dueDate: Date | null;
}

/** Resolved employee data for display on the board */
export interface ResolvedEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  roleName: string | null;
  isActive: boolean;
}

/** Resolved inventory item data for display on the board */
export interface ResolvedInventoryItem {
  id: string;
  name: string;
  category: string | null;
  quantityOnHand: number;
  parLevel: number | null;
  unit: string | null;
}

/** Resolved recipe data for display on the board */
export interface ResolvedRecipe {
  id: string;
  name: string;
  category: string | null;
  cuisineType: string | null;
  latestVersion: {
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    yieldQuantity: number | null;
    totalCost: number | null;
  } | null;
}

/** Resolved dish data for display on the board */
export interface ResolvedDish {
  id: string;
  name: string;
  category: string | null;
  serviceStyle: string | null;
  pricePerPerson: number | null;
  dietaryTags: string[];
}

/** Resolved proposal data for display on the board */
export interface ResolvedProposal {
  id: string;
  proposalNumber: string | null;
  title: string;
  status: string;
  total: number | null;
  clientName: string | null;
}

/** Resolved shipment data for display on the board */
export interface ResolvedShipment {
  id: string;
  shipmentNumber: string | null;
  status: string;
  eventTitle: string | null;
  supplierName: string | null;
  itemCount: number;
}

/** Resolved note data for display on the board */
export interface ResolvedNote {
  id: string;
  title: string;
  content: string | null;
  color: string | null;
  tags: string[];
}

/** Risk severity levels */
export const RiskSeverity = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
} as const;

export type RiskSeverity = (typeof RiskSeverity)[keyof typeof RiskSeverity];

/** Risk categories */
export const RiskCategory = {
  scheduling: "scheduling",
  resource: "resource",
  staff: "staff",
  inventory: "inventory",
  timeline: "timeline",
  financial: "financial",
  compliance: "compliance",
} as const;

export type RiskCategory = (typeof RiskCategory)[keyof typeof RiskCategory];

/** Resolved risk data for display on the board */
export interface ResolvedRisk {
  id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  category: RiskCategory;
  status: "identified" | "monitoring" | "mitigating" | "resolved";
  affectedEntityType: EntityType;
  affectedEntityId: string;
  affectedEntityName: string;
  probability: number | null;
  impact: number | null;
  mitigationSteps: string[];
  createdAt: Date | null;
  resolvedAt: Date | null;
}

// ============================================================================
// Discriminated Union
// ============================================================================

/** Discriminated union of all resolved entity types */
export type ResolvedEntity =
  | { type: "event"; data: ResolvedEvent }
  | { type: "client"; data: ResolvedClient }
  | { type: "prep_task"; data: ResolvedPrepTask }
  | { type: "kitchen_task"; data: ResolvedKitchenTask }
  | { type: "employee"; data: ResolvedEmployee }
  | { type: "inventory_item"; data: ResolvedInventoryItem }
  | { type: "recipe"; data: ResolvedRecipe }
  | { type: "dish"; data: ResolvedDish }
  | { type: "proposal"; data: ResolvedProposal }
  | { type: "shipment"; data: ResolvedShipment }
  | { type: "note"; data: ResolvedNote }
  | { type: "risk"; data: ResolvedRisk };

// ============================================================================
// Utility Functions
// ============================================================================

/** Get display title for any resolved entity */
export function getEntityTitle(entity: ResolvedEntity): string {
  switch (entity.type) {
    case "event":
      return entity.data.title;
    case "client":
      return (
        entity.data.companyName ??
        (`${entity.data.firstName ?? ""} ${entity.data.lastName ?? ""}`.trim() ||
          "Unknown Client")
      );
    case "prep_task":
      return entity.data.name;
    case "kitchen_task":
      return entity.data.title;
    case "employee":
      return `${entity.data.firstName} ${entity.data.lastName}`;
    case "inventory_item":
      return entity.data.name;
    case "recipe":
      return entity.data.name;
    case "dish":
      return entity.data.name;
    case "proposal":
      return entity.data.title;
    case "shipment":
      return (
        entity.data.shipmentNumber ?? `Shipment ${entity.data.id.slice(0, 8)}`
      );
    case "note":
      return entity.data.title;
    case "risk":
      return entity.data.title;
  }
}

/** Get status string for any resolved entity (if applicable) */
export function getEntityStatus(entity: ResolvedEntity): string | null {
  switch (entity.type) {
    case "event":
      return entity.data.status;
    case "prep_task":
      return entity.data.status;
    case "kitchen_task":
      return entity.data.status;
    case "proposal":
      return entity.data.status;
    case "shipment":
      return entity.data.status;
    case "risk":
      return entity.data.status;
    default:
      return null;
  }
}

// ============================================================================
// Constants
// ============================================================================

/** Color mapping for entity types — uses Tailwind utility classes with dark mode */
export const ENTITY_TYPE_COLORS = {
  event: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-900 dark:text-orange-100",
    icon: "text-orange-600 dark:text-orange-400",
  },
  client: {
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-900 dark:text-green-100",
    icon: "text-green-600 dark:text-green-400",
  },
  prep_task: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-900 dark:text-emerald-100",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  kitchen_task: {
    bg: "bg-teal-50 dark:bg-teal-950/30",
    border: "border-teal-200 dark:border-teal-800",
    text: "text-teal-900 dark:text-teal-100",
    icon: "text-teal-600 dark:text-teal-400",
  },
  employee: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-900 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-400",
  },
  inventory_item: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-900 dark:text-blue-100",
    icon: "text-blue-600 dark:text-blue-400",
  },
  recipe: {
    bg: "bg-pink-50 dark:bg-pink-950/30",
    border: "border-pink-200 dark:border-pink-800",
    text: "text-pink-900 dark:text-pink-100",
    icon: "text-pink-600 dark:text-pink-400",
  },
  dish: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-900 dark:text-rose-100",
    icon: "text-rose-600 dark:text-rose-400",
  },
  proposal: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    text: "text-violet-900 dark:text-violet-100",
    icon: "text-violet-600 dark:text-violet-400",
  },
  shipment: {
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    border: "border-cyan-200 dark:border-cyan-800",
    text: "text-cyan-900 dark:text-cyan-100",
    icon: "text-cyan-600 dark:text-cyan-400",
  },
  note: {
    bg: "bg-stone-50 dark:bg-stone-950/30",
    border: "border-stone-200 dark:border-stone-800",
    text: "text-stone-900 dark:text-stone-100",
    icon: "text-stone-600 dark:text-stone-400",
  },
  risk: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-900 dark:text-red-100",
    icon: "text-red-600 dark:text-red-400",
  },
} as const satisfies Record<
  EntityType,
  { bg: string; border: string; text: string; icon: string }
>;

/** Human-readable labels for entity types */
export const ENTITY_TYPE_LABELS = {
  event: "Event",
  client: "Client",
  prep_task: "Prep Task",
  kitchen_task: "Kitchen Task",
  employee: "Employee",
  inventory_item: "Inventory",
  recipe: "Recipe",
  dish: "Dish",
  proposal: "Proposal",
  shipment: "Shipment",
  note: "Note",
  risk: "Risk",
} as const satisfies Record<EntityType, string>;
