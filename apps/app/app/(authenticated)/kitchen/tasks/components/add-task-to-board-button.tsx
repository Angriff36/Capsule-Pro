"use client";

import { AddToBoardDialog } from "../../../command-board/components/add-to-board-dialog";

export interface AddTaskToBoardButtonProps {
  taskId: string;
  taskTitle: string;
  taskSummary?: string | null;
}

export function AddTaskToBoardButton({
  taskId,
  taskTitle,
  taskSummary,
}: AddTaskToBoardButtonProps) {
  return (
    <AddToBoardDialog
      defaultBoardDescription={taskSummary ?? undefined}
      defaultBoardName={`Task: ${taskTitle}`}
      entityId={taskId}
      entityType="task"
    />
  );
}
