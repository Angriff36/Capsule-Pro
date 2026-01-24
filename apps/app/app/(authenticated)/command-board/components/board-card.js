"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardCard = void 0;
const react_1 = require("react");
const client_card_1 = require("./cards/client-card");
const employee_card_1 = require("./cards/employee-card");
const event_card_1 = require("./cards/event-card");
const inventory_card_1 = require("./cards/inventory-card");
const task_card_1 = require("./cards/task-card");
const draggable_card_1 = require("./draggable-card");
exports.BoardCard = (0, react_1.memo)(function BoardCard({
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
}) {
  // Render specialized card component based on cardType
  const renderCardContent = () => {
    switch (card.cardType) {
      case "task":
        return <task_card_1.TaskCard card={card} />;
      case "event":
        return <event_card_1.EventCard card={card} />;
      case "client":
        return <client_card_1.ClientCard card={card} />;
      case "employee":
        return <employee_card_1.EmployeeCard card={card} />;
      case "inventory":
        return <inventory_card_1.InventoryCard card={card} />;
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
    <draggable_card_1.DraggableCard
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
    </draggable_card_1.DraggableCard>
  );
});
