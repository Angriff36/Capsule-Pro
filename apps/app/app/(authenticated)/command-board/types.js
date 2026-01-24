/**
 * TypeScript types for the Strategic Command Board Canvas
 *
 * These types define the board state, card positions, viewport state,
 * and related data structures for the drag-and-drop canvas implementation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_DRAG_STATE =
  exports.INITIAL_BOARD_STATE =
  exports.RelationshipConfig =
  exports.RelationshipType =
  exports.CardType =
  exports.CardStatus =
  exports.BoardStatus =
  exports.CARD_DEFAULTS =
  exports.GRID_DEFAULTS =
  exports.VIEWPORT_DEFAULTS =
    void 0;
exports.dbCardToCard = dbCardToCard;
exports.dbBoardToBoard = dbBoardToBoard;
exports.selectionBoxToBounds = selectionBoxToBounds;
exports.screenToCanvas = screenToCanvas;
exports.canvasToScreen = canvasToScreen;
exports.snapToGrid = snapToGrid;
exports.snapPointToGrid = snapPointToGrid;
exports.clamp = clamp;
exports.clampZoom = clampZoom;
exports.boxesIntersect = boxesIntersect;
exports.pointInBox = pointInBox;
exports.calculateAnchorPoint = calculateAnchorPoint;
exports.calculateCurvePath = calculateCurvePath;
exports.calculateStraightPath = calculateStraightPath;
exports.calculateMidPoint = calculateMidPoint;
exports.detectRelationshipType = detectRelationshipType;
// =============================================================================
// Constants
// =============================================================================
/**
 * Default viewport configuration values
 */
exports.VIEWPORT_DEFAULTS = {
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 2,
  DEFAULT_ZOOM: 1,
  ZOOM_STEP: 0.1,
  PAN_STEP: 50,
};
/**
 * Default grid configuration values
 */
exports.GRID_DEFAULTS = {
  SIZE: 20,
  SNAP_ENABLED: true,
};
/**
 * Default card dimensions
 */
exports.CARD_DEFAULTS = {
  WIDTH: 280,
  HEIGHT: 180,
  MIN_WIDTH: 150,
  MIN_HEIGHT: 100,
  MAX_WIDTH: 800,
  MAX_HEIGHT: 600,
};
// =============================================================================
// Enums and Constants as Types
// =============================================================================
/**
 * Board status values
 */
exports.BoardStatus = {
  draft: "draft",
  active: "active",
  archived: "archived",
};
/**
 * Card status values
 */
exports.CardStatus = {
  active: "active",
  completed: "completed",
  archived: "archived",
};
/**
 * Card type values for different entity types
 */
exports.CardType = {
  generic: "generic",
  event: "event",
  client: "client",
  task: "task",
  employee: "employee",
  inventory: "inventory",
  recipe: "recipe",
  note: "note",
};
/**
 * Relationship type values for connections between cards
 */
exports.RelationshipType = {
  client_to_event: "client_to_event",
  event_to_task: "event_to_task",
  task_to_employee: "task_to_employee",
  event_to_inventory: "event_to_inventory",
  generic: "generic",
};
/**
 * Relationship configuration with visual properties
 */
exports.RelationshipConfig = {
  [exports.RelationshipType.client_to_event]: {
    label: "has",
    color: "#3b82f6",
    dashArray: undefined,
    strokeWidth: 2,
  },
  [exports.RelationshipType.event_to_task]: {
    label: "includes",
    color: "#10b981",
    dashArray: undefined,
    strokeWidth: 2,
  },
  [exports.RelationshipType.task_to_employee]: {
    label: "assigned",
    color: "#f59e0b",
    dashArray: "5,5",
    strokeWidth: 2,
  },
  [exports.RelationshipType.event_to_inventory]: {
    label: "uses",
    color: "#8b5cf6",
    dashArray: undefined,
    strokeWidth: 2,
  },
  [exports.RelationshipType.generic]: {
    label: "related",
    color: "#6b7280",
    dashArray: "4,4",
    strokeWidth: 1.5,
  },
};
/**
 * Create a CommandBoardCard from database model
 */
function dbCardToCard(dbCard) {
  return {
    id: dbCard.id,
    tenantId: dbCard.tenantId,
    boardId: dbCard.boardId,
    title: dbCard.title,
    content: dbCard.content,
    cardType: dbCard.cardType || exports.CardType.generic,
    status: dbCard.status || exports.CardStatus.active,
    position: {
      x: dbCard.positionX,
      y: dbCard.positionY,
      width: dbCard.width,
      height: dbCard.height,
      zIndex: dbCard.zIndex,
    },
    color: dbCard.color,
    metadata: dbCard.metadata || {},
    createdAt: dbCard.createdAt,
    updatedAt: dbCard.updatedAt,
    deletedAt: dbCard.deletedAt,
  };
}
/**
 * Create a CommandBoard from database model
 */
function dbBoardToBoard(dbBoard) {
  return {
    id: dbBoard.id,
    tenantId: dbBoard.tenantId,
    eventId: dbBoard.eventId,
    name: dbBoard.name,
    description: dbBoard.description,
    status: dbBoard.status || exports.BoardStatus.draft,
    isTemplate: dbBoard.isTemplate,
    tags: dbBoard.tags,
    createdAt: dbBoard.createdAt,
    updatedAt: dbBoard.updatedAt,
    deletedAt: dbBoard.deletedAt,
  };
}
/**
 * Initial/default board state
 */
exports.INITIAL_BOARD_STATE = {
  board: null,
  cards: [],
  connections: [],
  viewport: {
    zoom: exports.VIEWPORT_DEFAULTS.DEFAULT_ZOOM,
    panX: 0,
    panY: 0,
  },
  selectedCardIds: [],
  selectedConnectionId: null,
  isLoading: false,
  error: null,
  isDirty: false,
};
/**
 * Initial drag state
 */
exports.INITIAL_DRAG_STATE = {
  isDragging: false,
  cardId: null,
  startPosition: null,
  currentPosition: null,
  offset: null,
};
/**
 * Calculate bounding box from selection box
 */
function selectionBoxToBounds(box) {
  return {
    x: Math.min(box.start.x, box.end.x),
    y: Math.min(box.start.y, box.end.y),
    width: Math.abs(box.end.x - box.start.x),
    height: Math.abs(box.end.y - box.start.y),
  };
}
/**
 * Transform screen coordinates to canvas coordinates
 */
function screenToCanvas(screenPoint, viewport) {
  return {
    x: (screenPoint.x - viewport.panX) / viewport.zoom,
    y: (screenPoint.y - viewport.panY) / viewport.zoom,
  };
}
/**
 * Transform canvas coordinates to screen coordinates
 */
function canvasToScreen(canvasPoint, viewport) {
  return {
    x: canvasPoint.x * viewport.zoom + viewport.panX,
    y: canvasPoint.y * viewport.zoom + viewport.panY,
  };
}
/**
 * Snap a value to the nearest grid point
 */
function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}
/**
 * Snap a point to the nearest grid point
 */
function snapPointToGrid(point, gridSize) {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
}
/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
/**
 * Clamp zoom level to valid range
 */
function clampZoom(
  zoom,
  minZoom = exports.VIEWPORT_DEFAULTS.MIN_ZOOM,
  maxZoom = exports.VIEWPORT_DEFAULTS.MAX_ZOOM
) {
  return clamp(zoom, minZoom, maxZoom);
}
/**
 * Check if two bounding boxes intersect
 */
function boxesIntersect(a, b) {
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
function pointInBox(point, box) {
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
function calculateAnchorPoint(cardBox, targetPoint) {
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
function calculateCurvePath(startPoint, endPoint, curvature) {
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
function calculateStraightPath(startPoint, endPoint) {
  return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
}
/**
 * Calculate mid-point along a curve path for label positioning
 */
function calculateMidPoint(startPoint, endPoint) {
  return {
    x: (startPoint.x + endPoint.x) / 2,
    y: (startPoint.y + endPoint.y) / 2,
  };
}
/**
 * Auto-detect relationship type based on card types
 */
function detectRelationshipType(fromCardType, toCardType) {
  if (fromCardType === "client" && toCardType === "event") {
    return exports.RelationshipType.client_to_event;
  }
  if (fromCardType === "event" && toCardType === "task") {
    return exports.RelationshipType.event_to_task;
  }
  if (fromCardType === "task" && toCardType === "employee") {
    return exports.RelationshipType.task_to_employee;
  }
  if (fromCardType === "event" && toCardType === "inventory") {
    return exports.RelationshipType.event_to_inventory;
  }
  return exports.RelationshipType.generic;
}
