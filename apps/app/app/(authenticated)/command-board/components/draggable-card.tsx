"use client";

import { cn } from "@repo/design-system/lib/utils";
import { memo, useCallback, useRef, useState } from "react";
import Moveable, { type OnDrag, type OnResize } from "react-moveable";
import type { CommandBoardCard, Point } from "../types";
import { snapToGrid as snapToGridUtil } from "../types";

type DraggableCardProps = {
  /** The card to render */
  card: CommandBoardCard;
  /** Whether the card is selected */
  isSelected: boolean;
  /** Whether dragging is enabled */
  canDrag: boolean;
  /** Whether resizing is enabled */
  canResize?: boolean;
  /** Grid size for snapping */
  gridSize: number;
  /** Whether snap to grid is enabled */
  snapToGridEnabled: boolean;
  /** Current viewport zoom level */
  viewportZoom: number;
  /** Callback when card position changes */
  onPositionChange: (cardId: string, position: Point) => void;
  /** Callback when card size changes */
  onSizeChange?: (cardId: string, width: number, height: number) => void;
  /** Callback when card is clicked */
  onClick: () => void;
  /** Callback when card is deleted */
  onDelete?: (cardId: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Card content renderer */
  children: React.ReactNode;
};

/**
 * DraggableCard - A card component with drag and resize capabilities using react-moveable
 *
 * This component wraps card content and provides drag/resize functionality.
 * It works in world coordinates (canvas space) and respects the viewport transform.
 */
export const DraggableCard = memo(function DraggableCard({
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
}: DraggableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState<Point | null>(
    null
  );

  // Handle drag start - store initial canvas position
  const handleDragStart = useCallback(() => {
    if (!canDrag) {
      return;
    }
    setDragStartPosition({ x: card.position.x, y: card.position.y });
    setIsDragging(true);
  }, [canDrag, card.position.x, card.position.y]);

  // Handle drag - react-moveable provides translate delta in screen coordinates
  // We need to convert this delta to canvas coordinates and add to original position
  const handleDrag = useCallback(
    (e: OnDrag) => {
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
        ? snapToGridUtil(newCanvasX, gridSize)
        : newCanvasX;
      const finalY = snapToGridEnabled
        ? snapToGridUtil(newCanvasY, gridSize)
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

  const handleDragEnd = useCallback(() => {
    const wasDragging = isDragging;
    setIsDragging(false);

    // Apply final snap on drag end if we were dragging
    if (wasDragging && snapToGridEnabled) {
      const finalX = snapToGridUtil(card.position.x, gridSize);
      const finalY = snapToGridUtil(card.position.y, gridSize);

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
  const handleResize = useCallback(
    (e: OnResize) => {
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
        ? snapToGridUtil(canvasWidth, gridSize)
        : canvasWidth;
      const finalHeight = snapToGridEnabled
        ? snapToGridUtil(canvasHeight, gridSize)
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
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
        className={cn(
          "absolute rounded-lg border-2 bg-card transition-all duration-200",
          // Default state
          !isSelected && "border-border shadow-sm hover:shadow-md hover:border-border/80",
          // Selected state - more prominent
          isSelected && "border-primary shadow-lg shadow-primary/20 ring-4 ring-primary/10",
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
        <Moveable
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
          maxHeight={600 * viewportZoom}
          maxWidth={800 * viewportZoom}
          minHeight={100 * viewportZoom}
          // Resize handles
          minWidth={150 * viewportZoom}
          // Minimum size constraints in screen coordinates (will be converted in handler)
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          // Maximum size constraints in screen coordinates
          onDragStart={handleDragStart}
          onResize={handleResize}
          // Event handlers
          preventClickDefault={true}
          renderDirections={
            canResize ? ["nw", "n", "ne", "w", "e", "sw", "s", "se"] : []
          }
          resizable={canResize}
          snapElement={false}
          // Prevent default drag behavior
          snapGap={false}
          // Throttle updates for performance
          snapThreshold={0}
          target={cardRef.current}
          // Edge and gap for better UX
          throttleDrag={1}
          throttleResize={1}
          // Custom handle styles for better visibility
          renderHandleProps={{
            "n,r,e,s,w,se,sw,ne,nw": {
              className: "bg-primary border-2 border-background rounded-sm",
            },
          }}
          handleClassName="bg-primary/80"
        />
      )}
    </>
  );
});
