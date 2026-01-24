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
/**
 * Default viewport configuration values
 */
export declare const VIEWPORT_DEFAULTS: {
  readonly MIN_ZOOM: 0.25;
  readonly MAX_ZOOM: 2;
  readonly DEFAULT_ZOOM: 1;
  readonly ZOOM_STEP: 0.1;
  readonly PAN_STEP: 50;
};
/**
 * Default grid configuration values
 */
export declare const GRID_DEFAULTS: {
  readonly SIZE: 20;
  readonly SNAP_ENABLED: true;
};
/**
 * Default card dimensions
 */
export declare const CARD_DEFAULTS: {
  readonly WIDTH: 280;
  readonly HEIGHT: 180;
  readonly MIN_WIDTH: 150;
  readonly MIN_HEIGHT: 100;
  readonly MAX_WIDTH: 800;
  readonly MAX_HEIGHT: 600;
};
/**
 * Board status values
 */
export declare const BoardStatus: {
  readonly draft: "draft";
  readonly active: "active";
  readonly archived: "archived";
};
export type BoardStatus = (typeof BoardStatus)[keyof typeof BoardStatus];
/**
 * Card status values
 */
export declare const CardStatus: {
  readonly active: "active";
  readonly completed: "completed";
  readonly archived: "archived";
};
export type CardStatus = (typeof CardStatus)[keyof typeof CardStatus];
/**
 * Card type values for different entity types
 */
export declare const CardType: {
  readonly generic: "generic";
  readonly event: "event";
  readonly client: "client";
  readonly task: "task";
  readonly employee: "employee";
  readonly inventory: "inventory";
  readonly recipe: "recipe";
  readonly note: "note";
};
export type CardType = (typeof CardType)[keyof typeof CardType];
/**
 * Relationship type values for connections between cards
 */
export declare const RelationshipType: {
  readonly client_to_event: "client_to_event";
  readonly event_to_task: "event_to_task";
  readonly task_to_employee: "task_to_employee";
  readonly event_to_inventory: "event_to_inventory";
  readonly generic: "generic";
};
export type RelationshipType =
  (typeof RelationshipType)[keyof typeof RelationshipType];
/**
 * Relationship configuration with visual properties
 */
export declare const RelationshipConfig: Record<
  RelationshipType,
  {
    label: string;
    color: string;
    dashArray?: string;
    strokeWidth: number;
  }
>;
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
export declare function dbCardToCard(
  dbCard: DbCommandBoardCard
): CommandBoardCard;
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
export declare function dbBoardToBoard(dbBoard: DbCommandBoard): CommandBoard;
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
export declare const INITIAL_BOARD_STATE: BoardState;
/**
 * Board action types for reducer
 */
export type BoardAction =
  | {
      type: "SET_BOARD";
      payload: CommandBoard;
    }
  | {
      type: "SET_CARDS";
      payload: CommandBoardCard[];
    }
  | {
      type: "ADD_CARD";
      payload: CommandBoardCard;
    }
  | {
      type: "UPDATE_CARD";
      payload: UpdateCardInput;
    }
  | {
      type: "REMOVE_CARD";
      payload: string;
    }
  | {
      type: "UPDATE_CARD_POSITION";
      payload: {
        id: string;
        position: CardPositionUpdate;
      };
    }
  | {
      type: "SET_VIEWPORT";
      payload: Partial<ViewportState>;
    }
  | {
      type: "SELECT_CARD";
      payload: string;
    }
  | {
      type: "DESELECT_CARD";
      payload: string;
    }
  | {
      type: "SELECT_CARDS";
      payload: string[];
    }
  | {
      type: "CLEAR_SELECTION";
    }
  | {
      type: "BRING_TO_FRONT";
      payload: string;
    }
  | {
      type: "SEND_TO_BACK";
      payload: string;
    }
  | {
      type: "SET_LOADING";
      payload: boolean;
    }
  | {
      type: "SET_ERROR";
      payload: string | null;
    }
  | {
      type: "SET_DIRTY";
      payload: boolean;
    }
  | {
      type: "RESET";
    };
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
export declare const INITIAL_DRAG_STATE: DragState;
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
export declare function selectionBoxToBounds(box: SelectionBox): BoundingBox;
/**
 * Result type for async operations
 */
export type BoardResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };
/**
 * Transform screen coordinates to canvas coordinates
 */
export declare function screenToCanvas(
  screenPoint: Point,
  viewport: ViewportState
): Point;
/**
 * Transform canvas coordinates to screen coordinates
 */
export declare function canvasToScreen(
  canvasPoint: Point,
  viewport: ViewportState
): Point;
/**
 * Snap a value to the nearest grid point
 */
export declare function snapToGrid(value: number, gridSize: number): number;
/**
 * Snap a point to the nearest grid point
 */
export declare function snapPointToGrid(point: Point, gridSize: number): Point;
/**
 * Clamp a value between min and max
 */
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Clamp zoom level to valid range
 */
export declare function clampZoom(
  zoom: number,
  minZoom?: number,
  maxZoom?: number
): number;
/**
 * Check if two bounding boxes intersect
 */
export declare function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean;
/**
 * Check if a point is inside a bounding box
 */
export declare function pointInBox(point: Point, box: BoundingBox): boolean;
/**
 * Calculate anchor point on card edge for connection line
 * Returns the closest point on the card's edge to the target point
 */
export declare function calculateAnchorPoint(
  cardBox: BoundingBox,
  targetPoint: Point
): Point;
/**
 * Calculate cubic bezier curve path for connection line
 * Creates a smooth curve between two points
 */
export declare function calculateCurvePath(
  startPoint: Point,
  endPoint: Point,
  curvature: number
): string;
/**
 * Calculate straight line path for connection
 */
export declare function calculateStraightPath(
  startPoint: Point,
  endPoint: Point
): string;
/**
 * Calculate mid-point along a curve path for label positioning
 */
export declare function calculateMidPoint(
  startPoint: Point,
  endPoint: Point
): Point;
/**
 * Auto-detect relationship type based on card types
 */
export declare function detectRelationshipType(
  fromCardType: CardType,
  toCardType: CardType
): RelationshipType;
//# sourceMappingURL=types.d.ts.map
