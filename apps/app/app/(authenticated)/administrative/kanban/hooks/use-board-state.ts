"use client";

import { useCallback, useMemo, useState } from "react";
import { adminTaskMoveCard } from "@/app/lib/manifest-client.generated";
import type { KanbanTask } from "../lib/board-types";
import { fetchKanbanTasks } from "../lib/kanban-data-loaders";

interface BoardStateParams {
  initialTasks: KanbanTask[];
  columns: Array<{ status: string; title: string }>;
  settings?: {
    devModeEnabled?: boolean;
  };
}

interface UseBoardStateReturn {
  tasks: KanbanTask[];
  tasksByColumn: Record<string, KanbanTask[]>;
  isDevMode: boolean;
  setDevMode: (enabled: boolean) => void;
  handleDragEnd: (activeId: string, overId: string, overColumnStatus: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  updateTask: (id: string, updates: Partial<KanbanTask>) => void;
  addTask: (task: KanbanTask) => void;
}

export function useBoardState({
  initialTasks,
  columns,
  settings = {},
}: BoardStateParams): UseBoardStateReturn {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [isDevMode, setIsDevMode] = useState(settings.devModeEnabled ?? false);
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Record<string, Partial<KanbanTask>>
  >({});

  const filteredTasks = useMemo(() => {
    if (!isDevMode) {
      return tasks;
    }
    return tasks.filter((task) => task.sourceType === "dev_bug");
  }, [tasks, isDevMode]);

  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, KanbanTask[]> = {};

    columns.forEach((col) => {
      grouped[col.status] = [];
    });

    filteredTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    Object.keys(grouped).forEach((status) => {
      grouped[status].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [filteredTasks, columns]);

  const handleDragEnd = useCallback(
    async (activeId: string, overId: string, overColumnStatus: string) => {
      const sourceTask = tasks.find((t) => t.id === activeId);
      if (!sourceTask) return;

      const targetColumnTasks = tasksByColumn[overColumnStatus] || [];
      const targetIndex = targetColumnTasks.findIndex((t) => t.id === overId);
      const newPosition =
        targetIndex >= 0
          ? targetColumnTasks[targetIndex].position
          : targetColumnTasks.length;

      const updatedTask: KanbanTask = {
        ...sourceTask,
        status: overColumnStatus,
        position: newPosition,
      };

      setOptimisticUpdates((prev) => ({
        ...prev,
        [activeId]: { status: overColumnStatus, position: newPosition },
      }));

      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? updatedTask : t))
      );

      try {
        const result = await adminTaskMoveCard({
          id: activeId,
          status: overColumnStatus,
          position: newPosition,
        });

        if (!result) {
          throw new Error("Failed to move task");
        }

        setOptimisticUpdates((prev) => {
          const updated = { ...prev };
          delete updated[activeId];
          return updated;
        });
      } catch (error) {
        console.error("Error moving task:", error);
        setTasks((prev) =>
          prev.map((t) => (t.id === activeId ? sourceTask : t))
        );
        setOptimisticUpdates((prev) => {
          const updated = { ...prev };
          delete updated[activeId];
          return updated;
        });
      }
    },
    [tasks, tasksByColumn]
  );

  const refreshTasks = useCallback(async () => {
    try {
      const nextTasks = await fetchKanbanTasks();
      setTasks(nextTasks);
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    }
  }, []);

  const updateTask = useCallback(
    (id: string, updates: Partial<KanbanTask>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    },
    []
  );

  const addTask = useCallback((task: KanbanTask) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  const setDevMode = useCallback((enabled: boolean) => {
    setIsDevMode(enabled);
  }, []);

  return {
    tasks: filteredTasks,
    tasksByColumn,
    isDevMode,
    setDevMode,
    handleDragEnd,
    refreshTasks,
    updateTask,
    addTask,
  };
}
