"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { memo, useCallback } from "react";
import { ENTITY_TYPE_COLORS } from "../types/entities";
import type { ProjectionNodeData } from "../types/flow";
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
  } = data as ProjectionNodeData;

  const entityType = projection.entityType;
  const colors = ENTITY_TYPE_COLORS[entityType] ?? ENTITY_TYPE_COLORS.note;
  const borderColor = entityBorderColors[entityType] ?? "border-l-stone-400";

  const handleClick = useCallback(() => {
    if (entity && !stale) {
      onOpenDetail(entityType, projection.entityId);
    }
  }, [entity, stale, onOpenDetail, entityType, projection.entityId]);

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
          "h-full w-[280px] rounded-lg border bg-card p-3 transition-all duration-150",
          // 4px colored left border
          "border-l-4",
          borderColor,
          // Entity type background tint
          colors.bg,
          // Default border
          "border-border",
          // Selection state
          selected &&
            "ring-2 ring-primary/40 border-primary shadow-lg shadow-primary/10",
          // Hover effect
          !selected && "hover:shadow-md hover:border-border/80",
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

        {renderCard()}
      </div>
    </>
  );
});
