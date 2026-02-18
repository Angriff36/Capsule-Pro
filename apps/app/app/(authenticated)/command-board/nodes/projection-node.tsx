"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { cn } from "@repo/design-system/lib/utils";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
  AlertTriangle,
  Check,
  Clock,
  Eye,
  MoreHorizontal,
  Pin,
  PinOff,
  Play,
  Trash2,
  XCircle,
} from "lucide-react";
import { memo, useCallback, useState } from "react";
import { ENTITY_TYPE_COLORS } from "../types/entities";
import type {
  EventQuickAction,
  ProjectionNodeData,
  TaskQuickAction,
} from "../types/flow";
import { ClientNodeCard } from "./cards/client-card";
import { EmployeeNodeCard } from "./cards/employee-card";
import { EventNodeCard } from "./cards/event-card";
import { FinancialProjectionNodeCard } from "./cards/financial-projection-card";
import { GenericNodeCard } from "./cards/generic-card";
import { InventoryNodeCard } from "./cards/inventory-card";
import { NoteNodeCard } from "./cards/note-card";
import { RiskNodeCard } from "./cards/risk-card";
import { TaskNodeCard } from "./cards/task-card";

/** Left border color per entity type — 4px accent stripe */
const entityBorderColors: Record<string, string> = {
  event: "border-l-orange-500",
  client: "border-l-green-500",
  prep_task: "border-l-emerald-500",
  kitchen_task: "border-l-teal-500",
  employee: "border-l-amber-500",
  inventory_item: "border-l-blue-500",
  recipe: "border-l-pink-500",
  dish: "border-l-rose-500",
  proposal: "border-l-violet-500",
  shipment: "border-l-cyan-500",
  note: "border-l-stone-400",
  risk: "border-l-red-500",
  financial_projection: "border-l-yellow-500",
};

/** Handle shared className for consistent styling */
const handleClassName = "!bg-muted-foreground/50 !w-2 !h-2";

/** Task quick action configuration */
interface QuickActionConfig {
  action: TaskQuickAction | EventQuickAction;
  icon: React.ReactNode;
  label: string;
}

/** Get available quick actions for a task based on its status */
function getTaskQuickActions(status: string | null): QuickActionConfig[] {
  if (!status) {
    return [];
  }

  const actions: QuickActionConfig[] = [];

  if (status === "pending") {
    actions.push({
      action: "start",
      icon: <Play className="size-3.5" />,
      label: "Start",
    });
  }
  if (status === "pending" || status === "in_progress") {
    actions.push({
      action: "complete",
      icon: <Check className="size-3.5" />,
      label: "Mark Complete",
    });
  }
  if (status === "in_progress") {
    actions.push({
      action: "release",
      icon: <Clock className="size-3.5" />,
      label: "Release",
    });
  }
  if (status !== "completed" && status !== "canceled") {
    actions.push({
      action: "cancel",
      icon: <XCircle className="size-3.5" />,
      label: "Cancel",
    });
  }

  return actions;
}

/** Get available quick actions for an event based on its status */
function getEventQuickActions(status: string | null): QuickActionConfig[] {
  if (!status) {
    return [];
  }

  const actions: QuickActionConfig[] = [];

  if (status === "tentative" || status === "draft") {
    actions.push({
      action: "confirm",
      icon: <Check className="size-3.5" />,
      label: "Confirm Event",
    });
  }
  if (status === "confirmed") {
    actions.push({
      action: "complete",
      icon: <Check className="size-3.5" />,
      label: "Mark Completed",
    });
  }
  if (status !== "cancelled" && status !== "completed") {
    actions.push({
      action: "cancel",
      icon: <XCircle className="size-3.5" />,
      label: "Cancel Event",
    });
  }

  return actions;
}

export const ProjectionNode = memo(function ProjectionNode({
  data,
  selected,
}: NodeProps) {
  const {
    projection,
    entity,
    stale,
    onOpenDetail,
    onRemove: _onRemove,
    onTogglePin,
    onTaskAction,
    onEventAction,
  } = data as ProjectionNodeData;

  const [isHovered, setIsHovered] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const entityType = projection.entityType;
  const colors = ENTITY_TYPE_COLORS[entityType] ?? ENTITY_TYPE_COLORS.note;
  const borderColor = entityBorderColors[entityType] ?? "border-l-stone-400";
  const isPinned = projection.pinned;

  // Check if this is a task entity
  const isTaskEntity =
    entityType === "prep_task" || entityType === "kitchen_task";
  const isEventEntity = entityType === "event";

  // Get task status for conditional action buttons
  const taskStatus =
    isTaskEntity && entity?.data
      ? (entity.data as { status?: string }).status
      : null;

  // Get event status for conditional action buttons
  const eventStatus =
    isEventEntity && entity?.data
      ? (entity.data as { status?: string }).status
      : null;

  const handleClick = useCallback(() => {
    if (entity && !stale) {
      onOpenDetail(entityType, projection.entityId);
    }
  }, [entity, stale, onOpenDetail, entityType, projection.entityId]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      _onRemove(projection.id);
    },
    [_onRemove, projection.id]
  );

  const handleTogglePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin(projection.id);
    },
    [onTogglePin, projection.id]
  );

  const handleOpenDetail = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (entity && !stale) {
        onOpenDetail(entityType, projection.entityId);
      }
    },
    [entity, stale, onOpenDetail, entityType, projection.entityId]
  );

  // Handle task quick action
  const handleTaskAction = useCallback(
    async (e: React.MouseEvent, action: TaskQuickAction) => {
      e.stopPropagation();
      if (!onTaskAction || actionLoading) {
        return;
      }
      setActionLoading(true);
      try {
        await onTaskAction(entityType, projection.entityId, action);
      } finally {
        setActionLoading(false);
      }
    },
    [onTaskAction, entityType, projection.entityId, actionLoading]
  );

  // Handle event quick action
  const handleEventAction = useCallback(
    async (e: React.MouseEvent, action: EventQuickAction) => {
      e.stopPropagation();
      if (!onEventAction || actionLoading) {
        return;
      }
      setActionLoading(true);
      try {
        await onEventAction(projection.entityId, action);
      } finally {
        setActionLoading(false);
      }
    },
    [onEventAction, projection.entityId, actionLoading]
  );

  // Get available quick actions using extracted functions
  const taskActions = isTaskEntity ? getTaskQuickActions(taskStatus) : [];
  const eventActions = isEventEntity ? getEventQuickActions(eventStatus) : [];
  const hasQuickActions = taskActions.length > 0 || eventActions.length > 0;

  /** Route to the correct card component based on entity type */
  function renderCard() {
    // Stale or missing entity — show generic fallback
    if (!entity || stale) {
      return <GenericNodeCard entityType={entityType} stale={stale} />;
    }

    switch (entity.type) {
      case "event":
        return <EventNodeCard data={entity.data} stale={false} />;
      case "client":
        return <ClientNodeCard data={entity.data} stale={false} />;
      case "prep_task":
        return (
          <TaskNodeCard
            data={entity.data}
            entityType="prep_task"
            stale={false}
          />
        );
      case "kitchen_task":
        return (
          <TaskNodeCard
            data={entity.data}
            entityType="kitchen_task"
            stale={false}
          />
        );
      case "employee":
        return <EmployeeNodeCard data={entity.data} stale={false} />;
      case "inventory_item":
        return <InventoryNodeCard data={entity.data} stale={false} />;
      case "note":
        return <NoteNodeCard data={entity.data} stale={false} />;
      case "risk":
        return <RiskNodeCard data={entity.data} stale={false} />;
      case "financial_projection":
        return <FinancialProjectionNodeCard data={entity.data} stale={false} />;
      default:
        return <GenericNodeCard entityType={entityType} stale={false} />;
    }
  }

  return (
    <>
      {/* Connection handles on all 4 sides */}
      <Handle
        className={handleClassName}
        position={Position.Top}
        type="target"
      />
      <Handle
        className={handleClassName}
        position={Position.Bottom}
        type="source"
      />
      <Handle
        className={handleClassName}
        id="left"
        position={Position.Left}
        type="target"
      />
      <Handle
        className={handleClassName}
        id="right"
        position={Position.Right}
        type="source"
      />

      {/* Card container */}
      <div
        className={cn(
          "h-full w-[280px] rounded-lg border bg-card p-3 relative group",
          // 4px colored left border
          "border-l-4",
          borderColor,
          // Entity type background tint
          colors.bg,
          // Default border
          "border-border",
          // Smooth transitions for all properties
          "transition-[transform,box-shadow,border-color,opacity] duration-200 ease-out",
          // Selection state with ring and shadow
          selected &&
            "ring-2 ring-primary/40 border-primary shadow-lg shadow-primary/10 scale-[1.02]",
          // Hover effect with subtle lift and scale
          !selected &&
            "hover:shadow-lg hover:border-border/80 hover:scale-[1.01]",
          // Stale state
          stale && "opacity-60",
          // Clickable cursor
          entity && !stale ? "cursor-pointer" : "cursor-default"
        )}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="button"
        tabIndex={0}
      >
        {/* Stale warning badge */}
        {stale && (
          <Badge
            className="absolute -top-2 -right-2 gap-1 text-[10px] z-10"
            variant="destructive"
          >
            <AlertTriangle className="size-3" />
            Stale
          </Badge>
        )}

        {/* Pinned indicator */}
        {isPinned && (
          <div className="absolute -top-1 -left-1 z-10">
            <Pin className="size-3 text-primary fill-primary" />
          </div>
        )}

        {/* Hover action buttons with fade-in animation */}
        {entity && !stale && (
          <div
            className={cn(
              "absolute top-1 right-1 flex gap-0.5 z-20 transition-all duration-200 ease-out",
              isHovered
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-2 pointer-events-none"
            )}
          >
            <button
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleOpenDetail}
              title="View details"
              type="button"
            >
              <Eye className="size-3.5" />
            </button>
            <button
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleTogglePin}
              title={isPinned ? "Unpin" : "Pin"}
              type="button"
            >
              {isPinned ? (
                <PinOff className="size-3.5" />
              ) : (
                <Pin className="size-3.5" />
              )}
            </button>

            {/* Quick Actions Dropdown - only for tasks and events */}
            {hasQuickActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    disabled={actionLoading}
                    onClick={(e) => e.stopPropagation()}
                    title="Quick actions"
                    type="button"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-40"
                  onClick={(e) => e.stopPropagation()}
                >
                  {taskActions.length > 0 &&
                    taskActions.map((item) => (
                      <DropdownMenuItem
                        disabled={actionLoading}
                        key={item.action}
                        onClick={(e) =>
                          handleTaskAction(e, item.action as TaskQuickAction)
                        }
                      >
                        {item.icon}
                        <span className="ml-2">{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                  {eventActions.length > 0 &&
                    eventActions.map((item) => (
                      <DropdownMenuItem
                        disabled={actionLoading}
                        key={item.action}
                        onClick={(e) =>
                          handleEventAction(e, item.action as EventQuickAction)
                        }
                      >
                        {item.icon}
                        <span className="ml-2">{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              onClick={handleRemove}
              title="Remove from board"
              type="button"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}

        {renderCard()}
      </div>
    </>
  );
});
