"use client";

import { memo } from "react";
import type { CommandBoardCard } from "../types";
import { ClientCard } from "./cards/client-card";
import { EmployeeCard } from "./cards/employee-card";
import { EventCard } from "./cards/event-card";
import { InventoryCard } from "./cards/inventory-card";
import { TaskCard } from "./cards/task-card";
import { DraggableCard } from "./draggable-card";

type BoardCardProps = {
  card: CommandBoardCard;
  isSelected: boolean;
  canDrag: boolean;
  gridSize: number;
  snapToGridEnabled: boolean;
  viewportZoom: number;
  onClick: () => void;
  onPositionChange: (
    cardId: string,
    position: { x: number; y: number }
  ) => void;
  onSizeChange?: (cardId: string, width: number, height: number) => void;
  onDelete: (cardId: string) => void;
  className?: string;
};

export const BoardCard = memo(function BoardCard({
  card,
  isSelected,
  canDrag,
  gridSize,
  snapToGridEnabled,
  viewportZoom,
  onClick,
  onPositionChange,
  onSizeChange,
  onDelete,
  className,
}: BoardCardProps) {
  // Render specialized card component based on cardType
  const renderCardContent = () => {
    switch (card.cardType) {
      case "task":
        return <TaskCard card={card} />;
      case "event":
        return <EventCard card={card} />;
      case "client":
        return <ClientCard card={card} />;
      case "employee":
        return <EmployeeCard card={card} />;
      case "inventory":
        return <InventoryCard card={card} />;
      case "recipe":
      case "note":
      case "generic":
      default: {
        // Generic card with better visual hierarchy
        return (
          <div className="flex h-full flex-col">
            {/* Card header with type indicator */}
            <div className="flex items-start justify-between border-b px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10">
                  <svg
                    className="h-3.5 w-3.5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <rect height="20" rx="2" width="20" x="2" y="2" />
                    <line x1="8" x2="16" y1="12" y2="12" />
                  </svg>
                </div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {card.cardType === "generic" ? "Note" : card.cardType}
                </span>
              </div>

              {isSelected && canDrag && (
                <button
                  aria-label={`Delete ${card.title}`}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(card.id);
                  }}
                  type="button"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>

            {/* Card content area */}
            <div className="flex flex-1 flex-col px-3 py-2">
              <h3 className="font-semibold text-sm text-foreground">
                {card.title}
              </h3>

              {card.content ? (
                <p className="text-muted-foreground mt-1.5 line-clamp-4 text-xs leading-relaxed">
                  {card.content}
                </p>
              ) : (
                <p className="text-muted-foreground/40 mt-1.5 text-xs italic">
                  No description
                </p>
              )}
            </div>

            {/* Card footer with metadata */}
            <div className="flex items-center justify-between border-t px-3 py-2">
              <div className="flex items-center gap-1.5">
                {card.status && card.status !== "active" && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {card.status}
                  </span>
                )}
              </div>

              {/* Drag affordance indicator */}
              {canDrag && (
                <div className="flex gap-0.5">
                  <div className="h-3.5 w-0.5 rounded-full bg-muted-foreground/20" />
                  <div className="h-3.5 w-0.5 rounded-full bg-muted-foreground/20" />
                  <div className="h-3.5 w-0.5 rounded-full bg-muted-foreground/20" />
                  <div className="h-3.5 w-0.5 rounded-full bg-muted-foreground/20" />
                  <div className="h-3.5 w-0.5 rounded-full bg-muted-foreground/20" />
                  <div className="h-3.5 w-0.5 rounded-full bg-muted-foreground/20" />
                </div>
              )}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <DraggableCard
      canDrag={canDrag}
      canResize={canDrag}
      card={card}
      className={className}
      gridSize={gridSize}
      isSelected={isSelected}
      onClick={onClick}
      onDelete={onDelete}
      onPositionChange={onPositionChange}
      onSizeChange={onSizeChange}
      snapToGridEnabled={snapToGridEnabled}
      viewportZoom={viewportZoom}
    >
      {renderCardContent()}
    </DraggableCard>
  );
});
