"use client";

import { AddToBoardDialog } from "../../../command-board/components/add-to-board-dialog";

export interface AddEmployeeToBoardButtonProps {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
}

export function AddEmployeeToBoardButton({
  employeeId,
  employeeName,
  employeeRole,
}: AddEmployeeToBoardButtonProps) {
  return (
    <AddToBoardDialog
      defaultBoardDescription={`${employeeRole} • ${employeeName}`}
      defaultBoardName={`Employee: ${employeeName}`}
      entityId={employeeId}
      entityType="employee"
    />
  );
}
