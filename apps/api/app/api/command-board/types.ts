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
  id: string;
  tenant_id: string;
  board_id: string;
  title: string;
  content: string | null;
  card_type: CardType;
  status: CardStatus;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  z_index: number;
  color: string | null;
  metadata: Record<string, unknown>;
  vector_clock: Record<string, number> | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Command Board response shape
 */
export interface CommandBoard {
  id: string;
  tenant_id: string;
  event_id: string | null;
  name: string;
  description: string | null;
  status: BoardStatus;
  is_template: boolean;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
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
  name?: string;
  description?: string;
  status?: BoardStatus;
  is_template?: boolean;
  tags?: string[];
  event_id?: string | null;
}

/**
 * Create card request
 */
export interface CreateCardRequest {
  title: string;
  content?: string;
  cardType?: CardType;
  status?: CardStatus;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Update command board card request
 */
export interface UpdateCommandBoardCardRequest {
  title?: string;
  content?: string | null;
  card_type?: CardType;
  status?: CardStatus;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  z_index?: number;
  color?: string | null;
  metadata?: Record<string, unknown>;
  /**
   * Version for optimistic locking and conflict detection
   * Must match the current version on the server for update to succeed
   */
  version: number;
}

/**
 * Create command board request
 */
export interface CreateCommandBoardRequest {
  name: string;
  description?: string;
  event_id?: string;
  status?: BoardStatus;
  is_template?: boolean;
  tags?: string[];
}

/**
 * List filters
 */
export interface CommandBoardListFilters {
  search?: string;
  status?: BoardStatus;
  event_id?: string;
  is_template?: boolean;
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
  id: string;
  tenant_id: string;
  board_id: string;
  name: string;
  color: string | null;
  collapsed: boolean;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  z_index: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Create group request
 */
export interface CreateGroupRequest {
  name: string;
  color?: string;
  collapsed?: boolean;
  positionX?: number;
  positionY?: number;
  width?: number;
  height?: number;
  zIndex?: number;
}

/**
 * Update group request
 */
export interface UpdateGroupRequest {
  name?: string;
  color?: string | null;
  collapsed?: boolean;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
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
  id: string;
  tenant_id: string;
  board_id: string;
  from_card_id: string;
  to_card_id: string;
  relationship_type: ConnectionType;
  label: string | null;
  visible: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Create connection request
 */
export interface CreateConnectionRequest {
  fromCardId: string;
  toCardId: string;
  relationshipType?: ConnectionType;
  label?: string;
  visible?: boolean;
}

/**
 * Update connection request
 */
export interface UpdateConnectionRequest {
  relationshipType?: ConnectionType;
  label?: string | null;
  visible?: boolean;
}

/**
 * Viewport state for command board layouts
 */
export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Command Board Layout shape
 */
export interface CommandBoardLayout {
  id: string;
  tenant_id: string;
  board_id: string;
  user_id: string;
  name: string;
  viewport: ViewportState;
  visible_cards: string[];
  grid_size: number;
  show_grid: boolean;
  snap_to_grid: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Create layout request
 */
export interface CreateLayoutRequest {
  boardId: string;
  name: string;
  viewport?: ViewportState;
  visibleCards?: string[];
  gridSize?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
}

/**
 * Update layout request
 */
export interface UpdateLayoutRequest {
  name?: string;
  viewport?: ViewportState;
  visibleCards?: string[];
  gridSize?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
}

// Simulation status values
export const SIMULATION_STATUSES = ["active", "applied", "discarded"] as const;
export type SimulationStatus = (typeof SIMULATION_STATUSES)[number];

/**
 * Board Projection shape for simulations
 */
export interface BoardProjection {
  id: string;
  tenant_id: string;
  board_id: string;
  entity_type: string;
  entity_id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  z_index: number;
  color_override: string | null;
  collapsed: boolean;
  group_id: string | null;
  pinned: boolean;
}

/**
 * Board Group shape for simulations
 */
export interface BoardGroup {
  id: string;
  tenant_id: string;
  board_id: string;
  name: string;
  color: string | null;
  collapsed: boolean;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  z_index: number;
}

/**
 * Board Annotation shape for simulations
 */
export interface BoardAnnotation {
  id: string;
  board_id: string;
  annotation_type: string;
  from_projection_id: string | null;
  to_projection_id: string | null;
  label: string | null;
  color: string | null;
  style: string | null;
}

/**
 * Simulation Context - full simulation state
 */
export interface SimulationContext {
  id: string;
  tenant_id: string;
  source_board_id: string;
  simulation_name: string;
  created_at: Date;
  status: SimulationStatus;
  projections: BoardProjection[];
  groups: BoardGroup[];
  annotations: BoardAnnotation[];
}

/**
 * Create simulation request
 */
export interface CreateSimulationRequest {
  source_board_id: string;
  simulation_name: string;
}

/**
 * Board Delta - changes between original and simulated
 */
export interface BoardDelta {
  added_projections: BoardProjection[];
  removed_projection_ids: string[];
  modified_projections: Array<{
    id: string;
    field: string;
    original: unknown;
    simulated: unknown;
  }>;
  added_groups: BoardGroup[];
  removed_group_ids: string[];
  added_annotations: BoardAnnotation[];
  removed_annotation_ids: string[];
  summary: {
    additions: number;
    removals: number;
    modifications: number;
    total_changes: number;
  };
}

/**
 * Simulation list item
 */
export interface SimulationListItem {
  id: string;
  tenant_id: string;
  source_board_id: string;
  simulation_name: string;
  created_at: Date;
  status: SimulationStatus;
  projections_count: number;
  groups_count: number;
  annotations_count: number;
}
