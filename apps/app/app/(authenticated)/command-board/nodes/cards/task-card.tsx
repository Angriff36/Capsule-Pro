"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChefHat,
  ClipboardList,
} from "lucide-react";
import { memo } from "react";
import type {
  ResolvedKitchenTask,
  ResolvedPrepTask,
} from "../../types/entities";
import { ENTITY_TYPE_COLORS } from "../../types/entities";

interface TaskNodeCardProps {
  data: ResolvedPrepTask | ResolvedKitchenTask;
  entityType: "prep_task" | "kitchen_task";
  stale: boolean;
}

const priorityConfig = {
  critical: { label: "Critical", color: "bg-rose-500 text-white" },
  high: { label: "High", color: "bg-orange-500 text-white" },
  medium: { label: "Medium", color: "bg-yellow-500 text-white" },
  low: { label: "Low", color: "bg-green-500 text-white" },
} as const;

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  canceled: {
    label: "Canceled",
    color: "bg-slate-100 text-slate-500 border-slate-200",
  },
} as const;

export const TaskNodeCard = memo(function TaskNodeCard({
  data,
  entityType,
  stale,
}: TaskNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS[entityType];
  const isPrepTask = entityType === "prep_task";
  const TypeIcon = isPrepTask ? ClipboardList : ChefHat;

  const title = isPrepTask
    ? (data as ResolvedPrepTask).name
    : (data as ResolvedKitchenTask).title;

  const priority = isPrepTask
    ? (data as ResolvedPrepTask).priority
    : (data as ResolvedKitchenTask).priority;

  const dueDate = isPrepTask
    ? (data as ResolvedPrepTask).dueByDate
    : (data as ResolvedKitchenTask).dueDate;

  const eventTitle = isPrepTask ? (data as ResolvedPrepTask).eventTitle : null;

  const statusItem =
    statusConfig[data.status as keyof typeof statusConfig] ??
    statusConfig.pending;

  const priorityItem = priority
    ? (priorityConfig[priority as keyof typeof priorityConfig] ?? null)
    : null;

  const dueDateObj = dueDate ? new Date(dueDate) : null;
  const isOverdue = dueDateObj ? dueDateObj < new Date() : false;

  return (
    <div className={cn("flex h-full flex-col", stale && "opacity-50")}>
      {/* Header */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TypeIcon className={cn("size-3.5 shrink-0", colors.icon)} />
          <span className={cn("font-medium text-xs", colors.text)}>
            {isPrepTask ? "Prep Task" : "Kitchen Task"}
          </span>
        </div>
        {priorityItem && (
          <Badge className={cn("border-0 text-xs", priorityItem.color)}>
            {priorityItem.label}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-1.5 line-clamp-2 font-semibold text-sm leading-tight">
        {title}
      </h3>

      {/* Status and due date */}
      <div className="space-y-1">
        <Badge
          className={cn("gap-1 text-xs", statusItem.color)}
          variant="outline"
        >
          <CheckCircle2 className="size-3" />
          {statusItem.label}
        </Badge>

        {dueDateObj && (
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs",
              isOverdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {isOverdue ? (
              <AlertCircle className="size-3 shrink-0" />
            ) : (
              <Calendar className="size-3 shrink-0" />
            )}
            <span>
              {isOverdue ? "Overdue: " : ""}
              {dueDateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}

        {eventTitle && (
          <div className="text-muted-foreground text-xs line-clamp-1">
            Event: {eventTitle}
          </div>
        )}
      </div>
    </div>
  );
});
