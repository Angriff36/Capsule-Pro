/**
 * Command Board Management API Types
 */

// Board status values
export const BOARD_STATUSES = ["draft", "active", "archived"] as const;
export type BoardStatus = (typeof BOARD_STATUSES)[number];

// Card type values
export const CARD_TYPES = ["task", "note", "alert", "info"] as const;
export type CardType = (typeof CARD_TYPES)[number];

// Card status values
export const CARD_STATUSES = [
  "pending",
  "in_progress",
  "completed",
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
