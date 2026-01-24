"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraggableCard = void 0;
const utils_1 = require("@repo/design-system/lib/utils");
const react_1 = require("react");
const react_moveable_1 = __importDefault(require("react-moveable"));
const types_1 = require("../types");
/**
 * DraggableCard - A card component with drag and resize capabilities using react-moveable
 *
 * This component wraps card content and provides drag/resize functionality.
 * It works in world coordinates (canvas space) and respects the viewport transform.
 */
exports.DraggableCard = (0, react_1.memo)(function DraggableCard({
  card,
  isSelected,
  canDrag,
  canResize = true,
  gridSize,
  snapToGridEnabled,
  viewportZoom,
  onPositionChange,
  onSizeChange,
  onClick,
  onDelete,
  className,
  children,
}) {
  const cardRef = (0, react_1.useRef)(null);
  const [isDragging, setIsDragging] = (0, react_1.useState)(false);
  const [dragStartPosition, setDragStartPosition] = (0, react_1.useState)(null);
  // Handle drag start - store initial canvas position
  const handleDragStart = (0, react_1.useCallback)(() => {
    if (!canDrag) {
      return;
    }
    setDragStartPosition({ x: card.position.x, y: card.position.y });
    setIsDragging(true);
  }, [canDrag, card.position.x, card.position.y]);
  // Handle drag - react-moveable provides translate delta in screen coordinates
  // We need to convert this delta to canvas coordinates and add to original position
  const handleDrag = (0, react_1.useCallback)(
    (e) => {
      if (!canDrag || dragStartPosition === null) {
        return;
      }
      // e.translate is the delta from the original position in screen coordinates
      // Convert delta to canvas coordinates
      const deltaX = e.translate[0] / viewportZoom;
      const deltaY = e.translate[1] / viewportZoom;
      // Add delta to original canvas position
      const newCanvasX = dragStartPosition.x + deltaX;
      const newCanvasY = dragStartPosition.y + deltaY;
      // Apply snapping if enabled (but don't update dragStartPosition yet)
      const finalX = snapToGridEnabled
        ? (0, types_1.snapToGrid)(newCanvasX, gridSize)
        : newCanvasX;
      const finalY = snapToGridEnabled
        ? (0, types_1.snapToGrid)(newCanvasY, gridSize)
        : newCanvasY;
      onPositionChange(card.id, { x: finalX, y: finalY });
    },
    [
      canDrag,
      dragStartPosition,
      viewportZoom,
      snapToGridEnabled,
      gridSize,
      card.id,
      onPositionChange,
    ]
  );
  const handleDragEnd = (0, react_1.useCallback)(() => {
    const wasDragging = isDragging;
    setIsDragging(false);
    // Apply final snap on drag end if we were dragging
    if (wasDragging && snapToGridEnabled) {
      const finalX = (0, types_1.snapToGrid)(card.position.x, gridSize);
      const finalY = (0, types_1.snapToGrid)(card.position.y, gridSize);
      // Only update if position changed
      if (finalX !== card.position.x || finalY !== card.position.y) {
        onPositionChange(card.id, { x: finalX, y: finalY });
      }
    }
    setDragStartPosition(null);
  }, [
    isDragging,
    snapToGridEnabled,
    card.position.x,
    card.position.y,
    gridSize,
    card.id,
    onPositionChange,
  ]);
  // Handle resize end - convert screen dimensions back to canvas dimensions
  const handleResize = (0, react_1.useCallback)(
    (e) => {
      if (!canResize) {
        return;
      }
      // Get the new size in screen coordinates
      const newScreenWidth = e.width;
      const newScreenHeight = e.height;
      // Convert to canvas coordinates
      const canvasWidth = newScreenWidth / viewportZoom;
      const canvasHeight = newScreenHeight / viewportZoom;
      // Apply snapping if enabled
      const finalWidth = snapToGridEnabled
        ? (0, types_1.snapToGrid)(canvasWidth, gridSize)
        : canvasWidth;
      const finalHeight = snapToGridEnabled
        ? (0, types_1.snapToGrid)(canvasHeight, gridSize)
        : canvasHeight;
      onSizeChange?.(card.id, finalWidth, finalHeight);
    },
    [
      canResize,
      viewportZoom,
      snapToGridEnabled,
      gridSize,
      card.id,
      onSizeChange,
    ]
  );
  // Handle keyboard delete
  const handleKeyDown = (0, react_1.useCallback)(
    (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && onDelete) {
        e.preventDefault();
        e.stopPropagation();
        onDelete(card.id);
      }
    },
    [card.id, onDelete]
  );
  return (
    <>
      <div
        aria-label={`${card.title} - Position: ${card.position.x}, ${card.position.y}`}
        className={(0, utils_1.cn)(
          "absolute rounded-lg border-2 bg-card transition-all duration-200",
          // Default state
          !isSelected &&
            "border-border shadow-sm hover:shadow-md hover:border-border/80",
          // Selected state - more prominent
          isSelected &&
            "border-primary shadow-lg shadow-primary/20 ring-4 ring-primary/10",
          // Read-only state
          !canDrag && "cursor-default opacity-80",
          // Drag states
          canDrag && !isDragging && "cursor-move",
          isDragging && "cursor-grabbing scale-[1.02] shadow-xl",
          className
        )}
        data-card-id={card.id}
        onClick={onClick}
        onKeyDown={(e) => {
          handleKeyDown(e);
        }}
        ref={cardRef}
        style={{
          left: card.position.x,
          top: card.position.y,
          width: card.position.width,
          height: card.position.height,
          zIndex: card.position.zIndex ?? 1,
          transform: "none", // No transform here - handled by viewport
        }}
        tabIndex={canDrag ? 0 : -1}
      >
        {children}
      </div>

      {/* react-moveable overlay - only show when selected and editable */}
      {isSelected && (canDrag || canResize) && cardRef.current && (
        <react_moveable_1.default
          // Target the card element
          draggable={canDrag}
          // Don't set translate - let react-moveable track from element's current position
          edge={false}
          elementGuidelines={[]}
          // Snapping configuration - disable react-moveable's built-in snapping
          // We handle snapping manually in our handlers
          elementSnapDirections={{}}
          gap={0}
          // Grid snapping disabled - we handle it manually
          handleClassName="bg-primary/80"
          maxHeight={600 * viewportZoom}
          maxWidth={800 * viewportZoom}
          // Resize handles
          minHeight={100 * viewportZoom}
          // Minimum size constraints in screen coordinates (will be converted in handler)
          minWidth={150 * viewportZoom}
          onDrag={handleDrag}
          // Maximum size constraints in screen coordinates
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          // Event handlers
          onResize={handleResize}
          preventClickDefault={true}
          renderDirections={
            canResize ? ["nw", "n", "ne", "w", "e", "sw", "s", "se"] : []
          }
          renderHandleProps={{
            "n,r,e,s,w,se,sw,ne,nw": {
              className: "bg-primary border-2 border-background rounded-sm",
            },
          }}
          // Prevent default drag behavior
          resizable={canResize}
          // Throttle updates for performance
          snapElement={false}
          snapGap={false}
          // Edge and gap for better UX
          snapThreshold={0}
          target={cardRef.current}
          // Custom handle styles for better visibility
          throttleDrag={1}
          throttleResize={1}
        />
      )}
    </>
  );
});
