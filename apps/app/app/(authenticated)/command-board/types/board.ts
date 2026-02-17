// ============================================================================
// Board & Projection Types — Core board data structures
// ============================================================================

import type { EntityType } from "./entities";

// ============================================================================
// Board Projection
// ============================================================================

/** A single entity projected onto a board at a specific position */
export interface BoardProjection {
  id: string;
  tenantId: string;
  boardId: string;
  entityType: EntityType;
  entityId: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  zIndex: number;
  colorOverride: string | null;
  collapsed: boolean;
  groupId: string | null;
  pinned: boolean;
}

// ============================================================================
// Board Scope & Configuration
// ============================================================================

/** Filtering scope for auto-populating a board */
export interface BoardScope {
  entityTypes: EntityType[];
  dateRange?: { start: string; end: string };
  statuses?: string[];
  assignedTo?: string[];
  tags?: string[];
}

/** Top-level command board definition */
export interface CommandBoard {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: string;
  scope: BoardScope | null;
  autoPopulate: boolean;
  tags: string[];
}

// ============================================================================
// Groups & Annotations
// ============================================================================

/** A visual group container on the board */
export interface BoardGroup {
  id: string;
  tenantId: string;
  boardId: string;
  name: string;
  color: string | null;
  collapsed: boolean;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  zIndex: number;
}

/** A manual annotation (connection, label, or region) on the board */
export interface BoardAnnotation {
  id: string;
  boardId: string;
  annotationType: "connection" | "label" | "region";
  fromProjectionId: string | null;
  toProjectionId: string | null;
  label: string | null;
  color: string | null;
  style: string | null;
}

// ============================================================================
// Derived Connections
// ============================================================================

/** An automatically derived connection between two projections */
export interface DerivedConnection {
  id: string;
  fromProjectionId: string;
  toProjectionId: string;
  relationshipType: string;
  label: string;
  derived: true;
}

/** Visual configuration for relationship types */
export const RELATIONSHIP_STYLES = {
  client_to_event: { color: "#c66b2b", label: "has event" },
  event_to_task: { color: "#3f4a39", label: "includes" },
  event_to_employee: {
    color: "#e2a13b",
    strokeDasharray: "5,5",
    label: "assigned",
  },
  event_to_shipment: { color: "#6366f1", label: "delivery" },
  client_to_proposal: {
    color: "#8b5cf6",
    strokeDasharray: "5,5",
    label: "proposal",
  },
  risk_to_entity: {
    color: "#ef4444",
    strokeDasharray: "5,5",
    label: "threatens",
  },
  dish_to_recipe: {
    color: "#ec4899",
    label: "based on",
  },
  recipe_to_dish: {
    color: "#f43f5e",
    label: "used in",
  },
  generic: { color: "#9ca3af", strokeDasharray: "3,3", label: "related" },
} as const satisfies Record<
  string,
  { color: string; strokeDasharray?: string; label: string }
>;
