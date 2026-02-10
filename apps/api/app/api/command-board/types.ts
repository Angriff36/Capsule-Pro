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

// Connection type values
export const CONNECTION_TYPES = [
  "generic",
  "dependency",
  "blocks",
  "related_to",
  "part_of",
] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

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
