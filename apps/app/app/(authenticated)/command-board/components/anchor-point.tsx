"use client";

import { cn } from "@repo/design-system/lib/utils";
import type React from "react";
import { memo, useCallback } from "react";
import type { AnchorEdge, AnchorPoint as AnchorPointType } from "../types";
import { ANCHOR_DEFAULTS } from "../types";

interface AnchorPointProps {
  /** The anchor point data */
  anchor: AnchorPointType;
  /** Position in screen coordinates */
  position: { x: number; y: number };
  /** Whether this anchor is currently hovered */
  isHovered: boolean;
  /** Whether this anchor is currently active (being dragged) */
  isActive: boolean;
  /** Whether anchors are visible on the board */
  isVisible: boolean;
  /** Callback when mouse down on anchor (start drag) */
  onMouseDown: (
    anchor: AnchorPointType,
    position: { x: number; y: number }
  ) => void;
  /** Callback when mouse enters anchor */
  onMouseEnter: (anchor: AnchorPointType) => void;
  /** Callback when mouse leaves anchor */
  onMouseLeave: () => void;
}

/**
 * Visual anchor point indicator on card edge
 *
 * Renders a small circular handle that users can drag from
 * to create connections to other cards.
 */
export const AnchorPoint = memo(function AnchorPoint({
  anchor,
  position,
  isHovered,
  isActive,
  isVisible,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}: AnchorPointProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMouseDown(anchor, position);
    },
    [anchor, position, onMouseDown]
  );

  const handleMouseEnter = useCallback(() => {
    onMouseEnter(anchor);
  }, [anchor, onMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    onMouseLeave();
  }, [onMouseLeave]);

  // Don't render if not visible (unless hovered or active for smooth transitions)
  if (!(isVisible || isHovered || isActive)) {
    return null;
  }

  // Calculate position based on edge
  // For top/bottom: centered horizontally at x
  // For left/right: centered vertically at y
  const size =
    isHovered || isActive ? ANCHOR_DEFAULTS.HOVER_SIZE : ANCHOR_DEFAULTS.SIZE;
  const offset = size / 2;

  // Adjust position to center the anchor point on the edge
  const getStyle = (): React.CSSProperties => {
    switch (anchor.edge) {
      case "top":
        return {
          left: `${position.x - offset}px`,
          top: `${position.y - offset}px`,
        };
      case "bottom":
        return {
          left: `${position.x - offset}px`,
          top: `${position.y - offset}px`,
        };
      case "left":
        return {
          left: `${position.x - offset}px`,
          top: `${position.y - offset}px`,
        };
      case "right":
        return {
          left: `${position.x - offset}px`,
          top: `${position.y - offset}px`,
        };
    }
  };

  return (
    <div
      aria-label={`Connection point on ${anchor.edge} edge`}
      className={cn(
        "absolute z-50 rounded-full border-2 transition-all duration-200",
        // Active/hover state - larger and more prominent
        (isHovered || isActive) && "scale-150",
        // Base styling
        "bg-white border-primary shadow-md",
        // Active state - different color
        isActive && "bg-primary border-primary-foreground",
        // Hover state - different background
        isHovered && !isActive && "bg-primary/80 border-primary-foreground",
        // Cursor for interaction
        "cursor-crosshair hover:cursor-grab active:cursor-grabbing"
      )}
      data-anchor-id={anchor.id}
      data-card-id={anchor.cardId}
      data-edge={anchor.edge}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleMouseDown(e as unknown as React.MouseEvent);
        }
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ...getStyle(),
      }}
      tabIndex={0}
    />
  );
});

/**
 * Render all anchor points for a card
 *
 * This component renders multiple anchor points positioned
 * around a card's perimeter for connection creation.
 */
interface CardAnchorsProps {
  /** Card ID */
  cardId: string;
  /** Card bounding box in canvas coordinates */
  cardBox: { x: number; y: number; width: number; height: number };
  /** Whether anchors are visible */
  showAnchors: boolean;
  /** Hovered anchor ID */
  hoveredAnchorId: string | null;
  /** Active (dragging) anchor ID */
  activeAnchorId: string | null;
  /** Function to convert canvas to screen coordinates */
  canvasToScreen: (point: { x: number; y: number }) => { x: number; y: number };
  /** Callback when anchor mouse down */
  onAnchorMouseDown: (
    anchor: AnchorPointType,
    position: { x: number; y: number }
  ) => void;
  /** Callback when anchor mouse enter */
  onAnchorMouseEnter: (anchor: AnchorPointType) => void;
  /** Callback when anchor mouse leave */
  onAnchorMouseLeave: () => void;
}

export const CardAnchors = memo(function CardAnchors({
  cardId,
  cardBox,
  showAnchors,
  hoveredAnchorId,
  activeAnchorId,
  canvasToScreen,
  onAnchorMouseDown,
  onAnchorMouseEnter,
  onAnchorMouseLeave,
}: CardAnchorsProps) {
  // For now, we'll generate anchors on-the-fly
  // In the future, this could be stored in board state
  const edges: AnchorEdge[] = ["top", "right", "bottom", "left"];
  const anchorsPerEdge = ANCHOR_DEFAULTS.ANCHORS_PER_EDGE;

  // Generate anchor points for each edge
  const anchorPoints: Array<{
    anchor: AnchorPointType;
    canvasPos: { x: number; y: number };
  }> = [];

  for (const edge of edges) {
    for (let i = 0; i < anchorsPerEdge; i++) {
      const offset = i / (anchorsPerEdge - 1);
      const anchorId = `${cardId}-${edge}-${i}`;

      // Calculate canvas position
      let canvasPos: { x: number; y: number };
      switch (edge) {
        case "top":
          canvasPos = {
            x: cardBox.x + cardBox.width * offset,
            y: cardBox.y,
          };
          break;
        case "right":
          canvasPos = {
            x: cardBox.x + cardBox.width,
            y: cardBox.y + cardBox.height * offset,
          };
          break;
        case "bottom":
          canvasPos = {
            x: cardBox.x + cardBox.width * offset,
            y: cardBox.y + cardBox.height,
          };
          break;
        case "left":
          canvasPos = {
            x: cardBox.x,
            y: cardBox.y + cardBox.height * offset,
          };
          break;
      }

      anchorPoints.push({
        anchor: {
          id: anchorId,
          cardId,
          edge,
          offset,
          type: "bidirectional",
          visible: showAnchors,
        },
        canvasPos,
      });
    }
  }

  return (
    <>
      {anchorPoints.map(({ anchor, canvasPos }) => {
        const screenPos = canvasToScreen(canvasPos);
        return (
          <AnchorPoint
            anchor={anchor}
            isActive={activeAnchorId === anchor.id}
            isHovered={hoveredAnchorId === anchor.id}
            isVisible={showAnchors}
            key={anchor.id}
            onMouseDown={onAnchorMouseDown}
            onMouseEnter={onAnchorMouseEnter}
            onMouseLeave={onAnchorMouseLeave}
            position={screenPos}
          />
        );
      })}
    </>
  );
});
