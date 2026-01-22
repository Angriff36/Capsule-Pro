/**
 * TypeScript types for the Strategic Command Board Canvas
 *
 * These types define the board state, card positions, viewport state,
 * and related data structures for the drag-and-drop canvas implementation.
 */

import type {
  CommandBoard as DbCommandBoard,
  CommandBoardCard as DbCommandBoardCard,
} from "@repo/database/types";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default viewport configuration values
 */
export const VIEWPORT_DEFAULTS = {
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 2,
  DEFAULT_ZOOM: 1,
  ZOOM_STEP: 0.1,
  PAN_STEP: 50,
} as const;

/**
 * Default grid configuration values
 */
export const GRID_DEFAULTS = {
  SIZE: 20,
  SNAP_ENABLED: true,
} as const;

/**
 * Default card dimensions
 */
export const CARD_DEFAULTS = {
  WIDTH: 280,
  HEIGHT: 180,
  MIN_WIDTH: 150,
  MIN_HEIGHT: 100,
  MAX_WIDTH: 800,
  MAX_HEIGHT: 600,
} as const;

// =============================================================================
// Enums and Constants as Types
// =============================================================================

/**
 * Board status values
 */
export const BoardStatus = {
  draft: "draft",
  active: "active",
  archived: "archived",
} as const;

export type BoardStatus = (typeof BoardStatus)[keyof typeof BoardStatus];

/**
 * Card status values
 */
export const CardStatus = {
  active: "active",
  completed: "completed",
  archived: "archived",
} as const;

export type CardStatus = (typeof CardStatus)[keyof typeof CardStatus];

/**
 * Card type values for different entity types
 */
export const CardType = {
  generic: "generic",
  event: "event",
  client: "client",
  task: "task",
  employee: "employee",
  inventory: "inventory",
  recipe: "recipe",
  note: "note",
} as const;

export type CardType = (typeof CardType)[keyof typeof CardType];

/**
 * Relationship type values for connections between cards
 */
export const RelationshipType = {
  client_to_event: "client_to_event",
  event_to_task: "event_to_task",
  task_to_employee: "task_to_employee",
  event_to_inventory: "event_to_inventory",
  generic: "generic",
} as const;

export type RelationshipType = (typeof RelationshipType)[keyof typeof RelationshipType];

/**
 * Relationship configuration with visual properties
 */
export const RelationshipConfig: Record<
  RelationshipType,
  { label: string; color: string; dashArray?: string; strokeWidth: number }
> = {
  [RelationshipType.client_to_event]: {
    label: "has",
    color: "#3b82f6",
    dashArray: undefined,
    strokeWidth: 2,
  },
  [RelationshipType.event_to_task]: {
    label: "includes",
    color: "#10b981",
    dashArray: undefined,
    strokeWidth: 2,
  },
  [RelationshipType.task_to_employee]: {
    label: "assigned",
    color: "#f59e0b",
    dashArray: "5,5",
    strokeWidth: 2,
  },
  [RelationshipType.event_to_inventory]: {
    label: "uses",
    color: "#8b5cf6",
    dashArray: undefined,
    strokeWidth: 2,
  },
  [RelationshipType.generic]: {
    label: "related",
    color: "#6b7280",
    dashArray: "4,4",
    strokeWidth: 1.5,
  },
};

// =============================================================================
// Position and Dimension Types
// =============================================================================

/**
 * 2D point coordinates
 */
export type Point = {
  x: number;
  y: number;
};

/**
 * 2D dimensions (width and height)
 */
export type Dimensions = {
  width: number;
  height: number;
};

/**
 * Bounding box with position and dimensions
 */
export type BoundingBox = Point & Dimensions;

/**
 * Card position on the canvas
 * Includes position, dimensions, and z-index for layering
 */
export type CardPosition = {
  /** X coordinate on the canvas (in canvas units) */
  x: number;
  /** Y coordinate on the canvas (in canvas units) */
  y: number;
  /** Width of the card (in canvas units) */
  width: number;
  /** Height of the card (in canvas units) */
  height: number;
  /** Z-index for stacking order (higher = on top) */
  zIndex: number;
};

/**
 * Partial card position for updates
 */
export type CardPositionUpdate = Partial<CardPosition>;

// =============================================================================
// Viewport Types
// =============================================================================

/**
 * Viewport state representing the current view of the canvas
 */
export type ViewportState = {
  /** Current zoom level (0.25 to 2.0) */
  zoom: number;
  /** Pan offset X (canvas units translated left/right) */
  panX: number;
  /** Pan offset Y (canvas units translated up/down) */
  panY: number;
};

/**
 * Complete viewport configuration including preferences
 */
export type ViewportConfig = ViewportState & {
  /** Minimum allowed zoom level */
  minZoom: number;
  /** Maximum allowed zoom level */
  maxZoom: number;
  /** Whether grid snapping is enabled */
  gridSnapEnabled: boolean;
  /** Grid size for snapping (in canvas units) */
  gridSize: number;
};

/**
 * Viewport preferences that can be persisted
 */
export type ViewportPreferences = {
  /** Last zoom level used */
  zoom: number;
  /** Last pan X position */
  panX: number;
  /** Last pan Y position */
  panY: number;
  /** User's grid show preference */
  showGrid: boolean;
  /** User's grid snapping preference */
  gridSnapEnabled: boolean;
  /** User's preferred grid size */
  gridSize: number;
};

// =============================================================================
// Card Types
// =============================================================================

/**
 * Card metadata for storing additional card-specific data
 */
export type CommandBoardCardMetadata = Record<string, unknown>;

export type CardMetadata = CommandBoardCardMetadata & {
  /** Reference to external entity ID (event, client, task, etc.) */
  entityId?: string;
};

/**
 * Command board card with all properties
 * Extends the database model with typed fields
 */
export type CommandBoardCard = {
  id: string;
  tenantId: string;
  boardId: string;
  title: string;
  content: string | null;
  cardType: CardType;
  status: CardStatus;
  position: CardPosition;
  color: string | null;
  metadata: CardMetadata;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

/**
 * Connection between two cards
 */
export type CardConnection = {
  /** Unique ID for the connection */
  id: string;
  /** Source card ID */
  fromCardId: string;
  /** Target card ID */
  toCardId: string;
  /** Type of relationship */
  relationshipType: RelationshipType;
  /** Optional label override */
  label?: string;
  /** Whether the connection is visible */
  visible: boolean;
};

/**
 * Create a CommandBoardCard from database model
 */
export function dbCardToCard(dbCard: DbCommandBoardCard): CommandBoardCard {
  return {
    id: dbCard.id,
    tenantId: dbCard.tenantId,
    boardId: dbCard.boardId,
    title: dbCard.title,
    content: dbCard.content,
    cardType: (dbCard.cardType as CardType) || CardType.generic,
    status: (dbCard.status as CardStatus) || CardStatus.active,
    position: {
      x: dbCard.positionX,
      y: dbCard.positionY,
      width: dbCard.width,
      height: dbCard.height,
      zIndex: dbCard.zIndex,
    },
    color: dbCard.color,
    metadata: (dbCard.metadata as CardMetadata) || {},
    createdAt: dbCard.createdAt,
    updatedAt: dbCard.updatedAt,
    deletedAt: dbCard.deletedAt,
  };
}

/**
 * Input for creating a new card
 */
export type CreateCardInput = {
  title: string;
  content?: string;
  cardType?: CardType;
  position?: Partial<CardPosition>;
  color?: string;
  metadata?: CardMetadata;
};

/**
 * Input for updating an existing card
 */
export type UpdateCardInput = {
  id: string;
  title?: string;
  content?: string;
  cardType?: CardType;
  status?: CardStatus;
  position?: CardPositionUpdate;
  color?: string;
  metadata?: CardMetadata;
};

// =============================================================================
// Board Types
// =============================================================================

/**
 * Command board with all properties
 */
export type CommandBoard = {
  id: string;
  tenantId: string;
  eventId: string | null;
  name: string;
  description: string | null;
  status: BoardStatus;
  isTemplate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

/**
 * Create a CommandBoard from database model
 */
export function dbBoardToBoard(dbBoard: DbCommandBoard): CommandBoard {
  return {
    id: dbBoard.id,
    tenantId: dbBoard.tenantId,
    eventId: dbBoard.eventId,
    name: dbBoard.name,
    description: dbBoard.description,
    status: (dbBoard.status as BoardStatus) || BoardStatus.draft,
    isTemplate: dbBoard.isTemplate,
    tags: dbBoard.tags,
    createdAt: dbBoard.createdAt,
    updatedAt: dbBoard.updatedAt,
    deletedAt: dbBoard.deletedAt,
  };
}

/**
 * Command board with its cards
 */
export type CommandBoardWithCards = CommandBoard & {
  cards: CommandBoardCard[];
};

/**
 * Input for creating a new board
 */
export type CreateBoardInput = {
  name: string;
  description?: string;
  eventId?: string;
  isTemplate?: boolean;
  tags?: string[];
};

/**
 * Input for updating an existing board
 */
export type UpdateBoardInput = {
  id: string;
  name?: string;
  description?: string;
  status?: BoardStatus;
  eventId?: string | null;
  isTemplate?: boolean;
  tags?: string[];
};

// =============================================================================
// Board State Types
// =============================================================================

/**
 * Complete board state including viewport and cards
 * Used for client-side state management
 */
export type BoardState = {
  /** The board data */
  board: CommandBoard | null;
  /** All cards on the board */
  cards: CommandBoardCard[];
  /** Connections between cards */
  connections: CardConnection[];
  /** Current viewport state */
  viewport: ViewportState;
  /** Currently selected card IDs */
  selectedCardIds: string[];
  /** Currently selected connection ID */
  selectedConnectionId: string | null;
  /** Whether the board is currently loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether there are unsaved changes */
  isDirty: boolean;
};

/**
 * Initial/default board state
 */
export const INITIAL_BOARD_STATE: BoardState = {
  board: null,
  cards: [],
  connections: [],
  viewport: {
    zoom: VIEWPORT_DEFAULTS.DEFAULT_ZOOM,
    panX: 0,
    panY: 0,
  },
  selectedCardIds: [],
  selectedConnectionId: null,
  isLoading: false,
  error: null,
  isDirty: false,
};

// =============================================================================
// Action Types for State Management
// =============================================================================

/**
 * Board action types for reducer
 */
export type BoardAction =
  | { type: "SET_BOARD"; payload: CommandBoard }
  | { type: "SET_CARDS"; payload: CommandBoardCard[] }
  | { type: "ADD_CARD"; payload: CommandBoardCard }
  | { type: "UPDATE_CARD"; payload: UpdateCardInput }
  | { type: "REMOVE_CARD"; payload: string }
  | {
      type: "UPDATE_CARD_POSITION";
      payload: { id: string; position: CardPositionUpdate };
    }
  | { type: "SET_VIEWPORT"; payload: Partial<ViewportState> }
  | { type: "SELECT_CARD"; payload: string }
  | { type: "DESELECT_CARD"; payload: string }
  | { type: "SELECT_CARDS"; payload: string[] }
  | { type: "CLEAR_SELECTION" }
  | { type: "BRING_TO_FRONT"; payload: string }
  | { type: "SEND_TO_BACK"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_DIRTY"; payload: boolean }
  | { type: "RESET" };

// =============================================================================
// Drag and Drop Types
// =============================================================================

/**
 * Drag state for tracking card movement
 */
export type DragState = {
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** ID of the card being dragged */
  cardId: string | null;
  /** Starting position when drag began */
  startPosition: Point | null;
  /** Current position during drag */
  currentPosition: Point | null;
  /** Offset from card origin to drag point */
  offset: Point | null;
};

/**
 * Initial drag state
 */
export const INITIAL_DRAG_STATE: DragState = {
  isDragging: false,
  cardId: null,
  startPosition: null,
  currentPosition: null,
  offset: null,
};

// =============================================================================
// Selection Types
// =============================================================================

/**
 * Selection box for multi-select
 */
export type SelectionBox = {
  /** Starting corner of selection box */
  start: Point;
  /** Ending corner of selection box */
  end: Point;
};

/**
 * Calculate bounding box from selection box
 */
export function selectionBoxToBounds(box: SelectionBox): BoundingBox {
  return {
    x: Math.min(box.start.x, box.end.x),
    y: Math.min(box.start.y, box.end.y),
    width: Math.abs(box.end.x - box.start.x),
    height: Math.abs(box.end.y - box.start.y),
  };
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Result type for async operations
 */
export type BoardResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Transform screen coordinates to canvas coordinates
 */
export function screenToCanvas(
  screenPoint: Point,
  viewport: ViewportState
): Point {
  return {
    x: (screenPoint.x - viewport.panX) / viewport.zoom,
    y: (screenPoint.y - viewport.panY) / viewport.zoom,
  };
}

/**
 * Transform canvas coordinates to screen coordinates
 */
export function canvasToScreen(
  canvasPoint: Point,
  viewport: ViewportState
): Point {
  return {
    x: canvasPoint.x * viewport.zoom + viewport.panX,
    y: canvasPoint.y * viewport.zoom + viewport.panY,
  };
}

/**
 * Snap a value to the nearest grid point
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a point to the nearest grid point
 */
export function snapPointToGrid(point: Point, gridSize: number): Point {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Clamp zoom level to valid range
 */
export function clampZoom(
  zoom: number,
  minZoom: number = VIEWPORT_DEFAULTS.MIN_ZOOM,
  maxZoom: number = VIEWPORT_DEFAULTS.MAX_ZOOM
): number {
  return clamp(zoom, minZoom, maxZoom);
}

/**
 * Check if two bounding boxes intersect
 */
export function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Check if a point is inside a bounding box
 */
export function pointInBox(point: Point, box: BoundingBox): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

// =============================================================================
// Connection Line Types
// =============================================================================

/**
 * Calculate anchor point on card edge for connection line
 * Returns the closest point on the card's edge to the target point
 */
export function calculateAnchorPoint(
  cardBox: BoundingBox,
  targetPoint: Point
): Point {
  const centerX = cardBox.x + cardBox.width / 2;
  const centerY = cardBox.y + cardBox.height / 2;

  const dx = targetPoint.x - centerX;
  const dy = targetPoint.y - centerY;

  if (Math.abs(dx) > Math.abs(dy) * (cardBox.width / cardBox.height)) {
    return {
      x: dx > 0 ? cardBox.x + cardBox.width : cardBox.x,
      y: centerY,
    };
  }
  return {
    x: centerX,
    y: dy > 0 ? cardBox.y + cardBox.height : cardBox.y,
  };
}

/**
 * Calculate cubic bezier curve path for connection line
 * Creates a smooth curve between two points
 */
export function calculateCurvePath(
  startPoint: Point,
  endPoint: Point,
  curvature: number
): string {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const controlDist = Math.max(Math.abs(dx), Math.abs(dy)) * curvature;

  const cp1 = {
    x: startPoint.x + controlDist,
    y: startPoint.y,
  };
  const cp2 = {
    x: endPoint.x - controlDist,
    y: endPoint.y,
  };

  return `M ${startPoint.x} ${startPoint.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${endPoint.x} ${endPoint.y}`;
}

/**
 * Calculate straight line path for connection
 */
export function calculateStraightPath(
  startPoint: Point,
  endPoint: Point
): string {
  return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
}

/**
 * Calculate mid-point along a curve path for label positioning
 */
export function calculateMidPoint(
  startPoint: Point,
  endPoint: Point
): Point {
  return {
    x: (startPoint.x + endPoint.x) / 2,
    y: (startPoint.y + endPoint.y) / 2,
  };
}

/**
 * Auto-detect relationship type based on card types
 */
export function detectRelationshipType(
  fromCardType: CardType,
  toCardType: CardType
): RelationshipType {
  if (fromCardType === "client" && toCardType === "event") {
    return RelationshipType.client_to_event;
  }
  if (fromCardType === "event" && toCardType === "task") {
    return RelationshipType.event_to_task;
  }
  if (fromCardType === "task" && toCardType === "employee") {
    return RelationshipType.task_to_employee;
  }
  if (fromCardType === "event" && toCardType === "inventory") {
    return RelationshipType.event_to_inventory;
  }

  return RelationshipType.generic;
}
