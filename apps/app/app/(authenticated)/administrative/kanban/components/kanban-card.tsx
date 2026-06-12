"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { KanbanTask } from "../lib/board-types";
import { PRIORITY_COLORS } from "../lib/board-defaults";

interface KanbanCardProps {
  task: KanbanTask;
  onClick?: () => void;
  isDragOverlay?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function KanbanCard({
  task,
  onClick,
  isDragOverlay,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isDragOverlay });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityClass =
    PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium;

  return (
    <div
      className={`cursor-grab rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md ${isDragOverlay ? "shadow-lg rotate-2" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      ref={setNodeRef}
      role="button"
      style={style}
      tabIndex={0}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-tight line-clamp-2">
          {task.title}
        </h4>
        {task.category ? (
          <Badge className="shrink-0 text-[10px] uppercase" variant="outline">
            {task.category}
          </Badge>
        ) : null}
      </div>
      {task.description ? (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{task.ownerName}</span>
        <span>
          {task.dueDate
            ? `Due ${dateFormatter.format(new Date(task.dueDate))}`
            : ""}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span
          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${priorityClass}`}
        >
          {task.priority}
        </span>
        {task.labels.map((label) => (
          <Badge className="text-[10px]" key={label} variant="secondary">
            {label}
          </Badge>
        ))}
        {task.sourceType === "dev_bug" ? (
          <Badge className="text-[10px]" variant="destructive">
            Bug
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
