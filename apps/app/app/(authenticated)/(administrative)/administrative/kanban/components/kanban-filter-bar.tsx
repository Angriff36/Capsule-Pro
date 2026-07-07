"use client";

import { Input } from "@repo/design-system/components/ui/input";
import type { Employee } from "../lib/board-types";

interface KanbanFilterBarProps {
  employees: Employee[];
  filters: Record<string, string>;
  onFiltersChange: (filters: Record<string, string>) => void;
}

export function KanbanFilterBar({
  employees,
  filters,
  onFiltersChange,
}: KanbanFilterBarProps) {
  const update = (key: string, value: string) => {
    const next = { ...filters };
    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
    onFiltersChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        className="h-8 w-[200px]"
        onChange={(e) => update("search", e.target.value)}
        placeholder="Search tasks..."
        value={filters.search ?? ""}
      />
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        onChange={(e) => update("priority", e.target.value)}
        value={filters.priority ?? ""}
      >
        <option value="">All priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        onChange={(e) => update("assignedTo", e.target.value)}
        value={filters.assignedTo ?? ""}
      >
        <option value="">All assignees</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.firstName} {emp.lastName}
          </option>
        ))}
      </select>
    </div>
  );
}
