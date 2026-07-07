"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { BoardColumn, KanbanTask } from "../lib/board-types";
import { COLUMN_COLORS } from "../lib/board-defaults";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  column: BoardColumn;
  tasks: KanbanTask[];
  onCardClick: (taskId: string) => void;
}

export function KanbanColumn({
  column,
  tasks,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.status}`,
  });

  const isOverLimit = column.wipLimit > 0 && tasks.length > column.wipLimit;
  const colorClass = COLUMN_COLORS[column.color] ?? COLUMN_COLORS.neutral;

  return (
    <div
      className={`flex min-w-[280px] max-w-[320px] flex-1 flex-col rounded-lg border-t-2 bg-muted/30 ${colorClass} ${isOver ? "ring-2 ring-primary/30" : ""}`}
      ref={setNodeRef}
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{column.title}</h3>
          <Badge className="text-[10px]" variant="secondary">
            {tasks.length}
          </Badge>
        </div>
        {column.wipLimit > 0 ? (
          <Badge
            className="text-[10px]"
            variant={isOverLimit ? "destructive" : "outline"}
          >
            WIP: {tasks.length}/{column.wipLimit}
          </Badge>
        ) : null}
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 p-2 min-h-[100px]">
          {tasks.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
              No tasks
            </div>
          ) : (
            tasks.map((task) => (
              <KanbanCard
                key={task.id}
                onClick={() => onCardClick(task.id)}
                task={task}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
