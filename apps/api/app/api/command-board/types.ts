/**
 * Command Board Management API Types
 */

// Board status values
export const BOARD_STATUSES = ["draft", "active", "archived"] as const;
export type BoardStatus = (typeof BOARD_STATUSES)[number];

// Card type values
export const CARD_TYPES = [
  "generic",
  "event",
  "client",
  "task",
  "employee",
  "inventory",
  "recipe",
  "note",
  "alert",
  "info",
] as const;
export type CardType = (typeof CARD_TYPES)[number];

// Card status values
export const CARD_STATUSES = [
  "active",
  "completed",
  "archived",
  "pending",
  "in_progress",
  "blocked",
] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

/**
 * Command Board Card shape
 */
export interface CommandBoardCard {
  board_id: string;
  card_type: CardType;
  color: string | null;
  content: string | null;
  created_at: Date;
  deleted_at: Date | null;
  height: number;
  id: string;
  metadata: Record<string, unknown>;
  position_x: number;
  position_y: number;
  status: CardStatus;
  tenant_id: string;
  title: string;
  updated_at: Date;
  vector_clock: Record<string, number> | null;
  version: number;
  width: number;
  z_index: number;
}

/**
 * Command Board response shape
 */
export interface CommandBoard {
  created_at: Date;
  deleted_at: Date | null;
  description: string | null;
  event_id: string | null;
  id: string;
  is_template: boolean;
  name: string;
  status: BoardStatus;
  tags: string[];
  tenant_id: string;
  updated_at: Date;
}

/**
 * Command Board with cards response
 */
export interface CommandBoardWithCards extends CommandBoard {
  cards: CommandBoardCard[];
}

/**
 * Update command board request
 */
export interface UpdateCommandBoardRequest {
  description?: string;
  event_id?: string | null;
  is_template?: boolean;
  name?: string;
  status?: BoardStatus;
  tags?: string[];
}

/**
 * Create card request
 */
export interface CreateCardRequest {
  cardType?: CardType;
  color?: string;
  content?: string;
  height?: number;
  metadata?: Record<string, unknown>;
  positionX?: number;
  positionY?: number;
  status?: CardStatus;
  title: string;
  width?: number;
  zIndex?: number;
}

/**
 * Update command board card request
 */
export interface UpdateCommandBoardCardRequest {
  card_type?: CardType;
  color?: string | null;
  content?: string | null;
  height?: number;
  metadata?: Record<string, unknown>;
  position_x?: number;
  position_y?: number;
  status?: CardStatus;
  title?: string;
  /**
   * Version for optimistic locking and conflict detection
   * Must match the current version on the server for update to succeed
   */
  version: number;
  width?: number;
  z_index?: number;
}

/**
 * Create command board request
 */
export interface CreateCommandBoardRequest {
  description?: string;
  event_id?: string;
  is_template?: boolean;
  name: string;
  status?: BoardStatus;
  tags?: string[];
}

/**
 * List filters
 */
export interface CommandBoardListFilters {
  event_id?: string;
  is_template?: boolean;
  search?: string;
  status?: BoardStatus;
  tags?: string[];
}

/**
 * Command Board with cards count
 */
export interface CommandBoardWithCardsCount extends CommandBoard {
  cards_count: number;
}

/**
 * Paginated list response
 */
export interface CommandBoardListResponse {
  data: CommandBoardWithCardsCount[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Command Board Group response shape
 */
export interface CommandBoardGroup {
  board_id: string;
  collapsed: boolean;
  color: string | null;
  created_at: Date;
  deleted_at: Date | null;
  height: number;
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  tenant_id: string;
  updated_at: Date;
  width: number;
  z_index: number;
}

/**
 * Create group request
 */
export interface CreateGroupRequest {
  collapsed?: boolean;
  color?: string;
  height?: number;
  name: string;
  positionX?: number;
  positionY?: number;
  width?: number;
  zIndex?: number;
}

/**
 * Update group request
 */
export interface UpdateGroupRequest {
  collapsed?: boolean;
  color?: string | null;
  height?: number;
  name?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  z_index?: number;
}

/**
 * Add cards to group request
 */
export interface AddCardsToGroupRequest {
  cardIds: string[];
}

/**
 * Remove cards from group request
 */
export interface RemoveCardsFromGroupRequest {
  cardIds: string[];
}

// Connection type values - semantic relationship types that match UI rendering
// These types have visual meaning (colors, labels, dash patterns) in the UI
export const CONNECTION_TYPES = [
  "client_to_event",
  "event_to_task",
  "task_to_employee",
  "event_to_inventory",
  "generic",
] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

// Relationship configuration for visual rendering
// Matches the UI's RelationshipConfig for consistency
export const RelationshipConfig: Record<
  ConnectionType,
  { label: string; color: string; dashArray?: string; strokeWidth: number }
> = {
  client_to_event: {
    label: "has",
    color: "#3b82f6",
    dashArray: undefined,
    strokeWidth: 2,
  },
  event_to_task: {
    label: "includes",
    color: "#10b981",
    dashArray: undefined,
    strokeWidth: 2,
  },
  task_to_employee: {
    label: "assigned",
    color: "#f59e0b",
    dashArray: "5,5",
    strokeWidth: 2,
  },
  event_to_inventory: {
    label: "uses",
    color: "#8b5cf6",
    dashArray: undefined,
    strokeWidth: 2,
  },
  generic: {
    label: "related",
    color: "#6b7280",
    dashArray: "4,4",
    strokeWidth: 1.5,
  },
};

/**
 * Command Board Connection shape
 */
export interface CommandBoardConnection {
  board_id: string;
  created_at: Date;
  deleted_at: Date | null;
  from_card_id: string;
  id: string;
  label: string | null;
  relationship_type: ConnectionType;
  tenant_id: string;
  to_card_id: string;
  updated_at: Date;
  visible: boolean;
}

/**
 * Create connection request
 */
export interface CreateConnectionRequest {
  fromCardId: string;
  label?: string;
  relationshipType?: ConnectionType;
  toCardId: string;
  visible?: boolean;
}

/**
 * Update connection request
 */
export interface UpdateConnectionRequest {
  label?: string | null;
  relationshipType?: ConnectionType;
  visible?: boolean;
}

/**
 * Viewport state for command board layouts
 */
export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

/**
 * Command Board Layout shape
 */
export interface CommandBoardLayout {
  board_id: string;
  created_at: Date;
  deleted_at: Date | null;
  grid_size: number;
  id: string;
  name: string;
  show_grid: boolean;
  snap_to_grid: boolean;
  tenant_id: string;
  updated_at: Date;
  user_id: string;
  viewport: ViewportState;
  visible_cards: string[];
}

/**
 * Create layout request
 */
export interface CreateLayoutRequest {
  boardId: string;
  gridSize?: number;
  name: string;
  showGrid?: boolean;
  snapToGrid?: boolean;
  viewport?: ViewportState;
  visibleCards?: string[];
}

/**
 * Update layout request
 */
export interface UpdateLayoutRequest {
  gridSize?: number;
  name?: string;
  showGrid?: boolean;
  snapToGrid?: boolean;
  viewport?: ViewportState;
  visibleCards?: string[];
}

// ============================================================================
// Simulation Types (Phase 5.1)
// ============================================================================

/** Entity types that can be projected onto a board - matches Prisma enum */
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
  | "risk"
  | "financial_projection";

/** Simulation status values */
export const SIMULATION_STATUSES = ["active", "applied", "discarded"] as const;
export type SimulationStatus = (typeof SIMULATION_STATUSES)[number];

/** A single entity projected onto a board at a specific position (API snake_case format) */
export interface BoardProjection {
  board_id: string;
  collapsed: boolean;
  color_override: string | null;
  entity_id: string;
  entity_type: EntityType;
  group_id: string | null;
  height: number;
  id: string;
  pinned: boolean;
  position_x: number;
  position_y: number;
  tenant_id: string;
  width: number;
  z_index: number;
}

/** A visual group container on the board (API snake_case format) */
export interface BoardGroup {
  board_id: string;
  collapsed: boolean;
  color: string | null;
  height: number;
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  tenant_id: string;
  width: number;
  z_index: number;
}

/** A manual annotation (connection, label, or region) on the board (API snake_case format) */
export interface BoardAnnotation {
  annotation_type: string;
  board_id: string;
  color: string | null;
  from_projection_id: string | null;
  id: string;
  label: string | null;
  style: string | null;
  to_projection_id: string | null;
}

/** Delta between original and simulated board state */
export interface BoardDelta {
  added_annotations: BoardAnnotation[];
  added_groups: BoardGroup[];
  added_projections: BoardProjection[];
  modified_projections: Array<{
    id: string;
    field: string;
    original: unknown;
    simulated: unknown;
  }>;
  removed_annotation_ids: string[];
  removed_group_ids: string[];
  removed_projection_ids: string[];
  summary: {
    additions: number;
    removals: number;
    modifications: number;
    total_changes: number;
  };
}

/** Request to create a new simulation */
export interface CreateSimulationRequest {
  simulation_name: string;
  source_board_id: string;
}

/** Simulation list item for listing endpoints */
export interface SimulationListItem {
  annotations_count: number;
  created_at: Date;
  groups_count: number;
  id: string;
  projections_count: number;
  simulation_name: string;
  source_board_id: string;
  status: SimulationStatus;
  tenant_id: string;
}

/** Full simulation context with all data */
export interface SimulationContext {
  annotations: BoardAnnotation[];
  created_at: Date;
  groups: BoardGroup[];
  id: string;
  projections: BoardProjection[];
  simulation_name: string;
  source_board_id: string;
  status: SimulationStatus;
  tenant_id: string;
}
