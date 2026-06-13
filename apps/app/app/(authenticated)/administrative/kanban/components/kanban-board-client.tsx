"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@repo/design-system/components/ui/button";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Separator } from "@repo/design-system/components/ui/separator";
import type {
  KanbanTask,
  BoardColumn,
  BoardSettings,
  Employee,
  BoardConfigData,
} from "../lib/board-types";
import { DEV_MODE_COLUMNS, COLUMN_COLORS } from "../lib/board-defaults";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { KanbanCardDetail } from "./kanban-card-detail";
import { AdminTaskDialog } from "./admin-task-dialog";
import { KanbanFilterBar } from "./kanban-filter-bar";
import { DevModeToggle } from "./dev-mode-toggle";
import { useBoardState } from "../hooks/use-board-state";
import { useCardMutations } from "../hooks/use-card-mutations";

interface KanbanBoardClientProps {
  initialTasks: KanbanTask[];
  boardConfig: BoardConfigData;
  employees: Employee[];
}

export function KanbanBoardClient({
  initialTasks,
  boardConfig,
  employees,
}: KanbanBoardClientProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const columns = boardConfig.columns;
  const settings = boardConfig.settings;

  const {
    tasks,
    tasksByColumn,
    isDevMode,
    setDevMode,
    handleDragEnd: onDragEnd,
    updateTask,
    addTask,
  } = useBoardState({
    initialTasks,
    columns,
    settings,
  });

  const mutations = useCardMutations();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const activeColumns = useMemo(() => {
    if (isDevMode && settings.devColumns?.length) {
      return settings.devColumns;
    }
    if (isDevMode) {
      return DEV_MODE_COLUMNS;
    }
    return columns;
  }, [isDevMode, columns, settings.devColumns]);

  const filteredTasksByColumn = useMemo(() => {
    const result: Record<string, KanbanTask[]> = {};
    for (const col of activeColumns) {
      let colTasks = tasksByColumn[col.status] ?? [];
      // Apply filters
      if (filters.priority) {
        colTasks = colTasks.filter((t) => t.priority === filters.priority);
      }
      if (filters.assignedTo) {
        colTasks = colTasks.filter((t) => t.assignedTo === filters.assignedTo);
      }
      if (filters.category) {
        colTasks = colTasks.filter((t) => t.category === filters.category);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        colTasks = colTasks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.description?.toLowerCase().includes(q) ?? false)
        );
      }
      result[col.status] = colTasks;
    }
    return result;
  }, [activeColumns, tasksByColumn, filters]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;
  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEndEvent = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over) return;

      // Determine target column
      const overId = String(over.id);
      // over.id could be a column id ("column-{status}") or a card id
      let targetStatus: string;
      if (overId.startsWith("column-")) {
        targetStatus = overId.replace("column-", "");
      } else {
        // Dropped on a card - find which column it belongs to
        const overTask = tasks.find((t) => t.id === overId);
        targetStatus = overTask?.status ?? "";
      }

      if (!targetStatus) return;

      const taskId = String(active.id);
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // The hook derives the new position from the card/column dropped on.
      onDragEnd(taskId, overId, targetStatus);
    },
    [tasks, onDragEnd]
  );

  // AdminTaskDialog performs the POST itself and hands back the created task;
  // the board only needs to add it to local state.
  const handleCreateTask = useCallback(
    (task: KanbanTask) => {
      addTask(task);
    },
    [addTask]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isDevMode ? "Dev Board" : "Operational Kanban"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isDevMode
              ? "Track bugs and development tasks in isolation."
              : "Keep critical cross-functional requests visible and moving."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DevModeToggle enabled={isDevMode} onToggle={setDevMode} />
          <AdminTaskDialog
            employees={employees}
            isDevMode={isDevMode}
            onCreated={handleCreateTask}
          />
        </div>
      </div>

      <Separator />

      <KanbanFilterBar
        employees={employees}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Board */}
      <DndContext
        collisionDetection={closestCorners}
        onDragEnd={handleDragEndEvent}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {activeColumns.map((column) => {
            const colTasks = filteredTasksByColumn[column.status] ?? [];
            return (
              <KanbanColumn
                column={column}
                key={column.status}
                onCardClick={setSelectedTaskId}
                tasks={colTasks}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <KanbanCard isDragOverlay task={activeTask} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Card Detail Drawer */}
      {selectedTask ? (
        <KanbanCardDetail
          employees={employees}
          isDevMode={isDevMode}
          mutations={mutations}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={(updated) => updateTask(updated.id, updated)}
          open
          task={selectedTask}
        />
      ) : null}
    </div>
  );
}
