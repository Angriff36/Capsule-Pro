"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { memo, useCallback, useRef, useState } from "react";
import Moveable, { type OnDrag, type OnResize } from "react-moveable";
import type { CommandBoardGroup, Point } from "../types";
import { snapToGrid as snapToGridUtil } from "../types";

interface GroupContainerProps {
  /** The group to render */
  group: CommandBoardGroup;
  /** Whether the group is selected */
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
  /** Callback when group position changes */
  onPositionChange: (groupId: string, position: Point) => void;
  /** Callback when group size changes */
  onSizeChange?: (groupId: string, width: number, height: number) => void;
  /** Callback when group is clicked */
  onClick: (e: React.MouseEvent) => void;
  /** Callback when group is deleted */
  onDelete?: (groupId: string) => void;
  /** Callback when collapse state changes */
  onToggleCollapse?: (groupId: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Group content (cards inside) */
  children?: React.ReactNode;
}

/**
 * GroupContainer - A visual container for grouping cards on the command board
 *
 * Provides drag/resize functionality, collapse/expand, and a header with group name.
 */
export const GroupContainer = memo(function GroupContainer({
  group,
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
  onToggleCollapse,
  className,
  children,
}: GroupContainerProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState<Point | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Handle drag start - store initial canvas position
  const handleDragStart = useCallback(() => {
    if (!canDrag) {
      return;
    }
    setDragStartPosition({ x: group.position.x, y: group.position.y });
    setIsDragging(true);
    setShowMenu(false);
  }, [canDrag, group.position.x, group.position.y]);

  // Handle drag
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

      // Apply snapping if enabled
      const finalX = snapToGridEnabled
        ? snapToGridUtil(newCanvasX, gridSize)
        : newCanvasX;
      const finalY = snapToGridEnabled
        ? snapToGridUtil(newCanvasY, gridSize)
        : newCanvasY;

      onPositionChange(group.id, { x: finalX, y: finalY });
    },
    [
      canDrag,
      dragStartPosition,
      viewportZoom,
      snapToGridEnabled,
      gridSize,
      group.id,
      onPositionChange,
    ]
  );

  const handleDragEnd = useCallback(() => {
    const wasDragging = isDragging;
    setIsDragging(false);

    // Apply final snap on drag end if we were dragging
    if (wasDragging && snapToGridEnabled) {
      const finalX = snapToGridUtil(group.position.x, gridSize);
      const finalY = snapToGridUtil(group.position.y, gridSize);

      // Only update if position changed
      if (finalX !== group.position.x || finalY !== group.position.y) {
        onPositionChange(group.id, { x: finalX, y: finalY });
      }
    }

    setDragStartPosition(null);
  }, [
    isDragging,
    snapToGridEnabled,
    group.position.x,
    group.position.y,
    gridSize,
    group.id,
    onPositionChange,
  ]);

  // Handle resize end
  const handleResize = useCallback(
    (e: OnResize) => {
      if (!canResize) {
        return;
      }

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

      onSizeChange?.(group.id, finalWidth, finalHeight);
    },
    [
      canResize,
      viewportZoom,
      snapToGridEnabled,
      gridSize,
      group.id,
      onSizeChange,
    ]
  );

  const handleToggleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onToggleCollapse?.(group.id);
    },
    [group.id, onToggleCollapse]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete?.(group.id);
    },
    [group.id, onDelete]
  );

  const handleMenuToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowMenu((prev) => !prev);
    },
    []
  );

  // Handle keyboard delete
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && onDelete) {
        e.preventDefault();
        e.stopPropagation();
        onDelete(group.id);
      }
    },
    [group.id, onDelete]
  );

  // Calculate the border style based on group color
  const borderStyle = group.color
    ? { borderColor: group.color, backgroundColor: `${group.color}10` }
    : {};

  return (
    <>
      <div
        aria-label={`${group.name} - Group with ${group.cardIds.length} cards`}
        className={cn(
          "absolute rounded-lg border-2 bg-background/95 backdrop-blur-sm transition-all duration-200",
          // Default state
          !isSelected &&
            "border-border shadow-sm hover:shadow-md hover:border-border/80",
          // Selected state
          isSelected &&
            "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/10",
          // Read-only state
          !canDrag && "cursor-default opacity-80",
          // Drag states
          canDrag && !isDragging && "cursor-move",
          isDragging && "cursor-grabbing scale-[1.01] shadow-xl",
          // Collapsed state
          group.collapsed && "overflow-hidden",
          className
        )}
        data-group-id={group.id}
        onClick={(e) => onClick(e)}
        onKeyDown={(e) => {
          handleKeyDown(e);
        }}
        ref={groupRef}
        style={{
          left: group.position.x,
          top: group.position.y,
          width: group.position.width,
          height: group.collapsed ? 40 : group.position.height,
          zIndex: group.position.zIndex ?? 0,
          transform: "none",
          ...borderStyle,
        }}
        tabIndex={canDrag ? 0 : -1}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2 border-b bg-muted/30",
            group.color && "border-opacity-20",
            !group.collapsed && "rounded-t-lg"
          )}
          style={{
            borderColor: group.color || undefined,
            backgroundColor: group.color ? `${group.color}15` : undefined,
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              className="h-6 w-6 p-0 shrink-0"
              onClick={handleToggleCollapse}
              size="sm"
              variant="ghost"
            >
              {group.collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <span className="font-medium text-sm truncate">
              {group.name}
              <span className="text-muted-foreground ml-2">
                ({group.cardIds.length})
              </span>
            </span>
          </div>

          {/* Actions menu */}
          <div className="relative flex items-center gap-1">
            {showMenu && onDelete && (
              <Button
                className="h-7 w-7 p-0 text-destructive"
                onClick={handleDelete}
                size="sm"
                title="Delete group"
                variant="ghost"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              className="h-7 w-7 p-0"
              onClick={handleMenuToggle}
              size="sm"
              title="Group options"
              variant="ghost"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content area (visible when not collapsed) */}
        {!group.collapsed && (
          <div className="p-2 min-h-0">
            {children || (
              <p className="text-muted-foreground text-center text-sm py-4">
                Drag cards here or select cards and add to group
              </p>
            )}
          </div>
        )}
      </div>

      {/* react-moveable overlay */}
      {isSelected && (canDrag || canResize) && groupRef.current && (
        <Moveable
          draggable={canDrag}
          edge={false}
          elementGuidelines={[]}
          elementSnapDirections={{}}
          gap={0}
          handleClassName="bg-primary/80"
          maxHeight={800 * viewportZoom}
          maxWidth={1000 * viewportZoom}
          minHeight={60 * viewportZoom}
          minWidth={200 * viewportZoom}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onResize={handleResize}
          preventClickDefault={true}
          renderDirections={
            !group.collapsed && canResize
              ? ["nw", "n", "ne", "w", "e", "sw", "s", "se"]
              : ["nw", "ne", "sw", "se"]
          }
          renderHandleProps={{
            "n,r,e,s,w,se,sw,ne,nw": {
              className: "bg-primary border-2 border-background rounded-sm",
            },
          }}
          resizable={canResize}
          snapElement={false}
          snapGap={false}
          snapThreshold={0}
          target={groupRef.current}
          throttleDrag={1}
          throttleResize={1}
        />
      )}
    </>
  );
});
