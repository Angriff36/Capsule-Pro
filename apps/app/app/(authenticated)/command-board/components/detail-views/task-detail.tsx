"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  ExternalLink,
  User,
} from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { toast } from "sonner";
import type {
  ResolvedKitchenTask,
  ResolvedPrepTask,
} from "../../types/entities";
import { EditableField, EditableSelectField } from "./editable-field";

// ============================================================================
// Task Detail View — handles both prep_task and kitchen_task with inline editing
// ============================================================================

interface TaskDetailProps {
  data: ResolvedPrepTask | ResolvedKitchenTask;
  taskType: "prep_task" | "kitchen_task";
  onFieldChange?: (field: string, value: string) => Promise<void>;
}

/** Status options for tasks */
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/** Priority options for tasks */
const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/** Status → Badge variant mapping */
const statusVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  in_progress: "secondary",
  completed: "default",
  cancelled: "destructive",
  overdue: "destructive",
};

/** Priority → Badge variant mapping */
const priorityVariantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

/** Format a date for display using Intl */
function formatDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/** Format a date for the date input (YYYY-MM-DD) */
function formatDateForInput(date: Date | null): string {
  if (!date) {
    return "";
  }
  const d = new Date(date);
  return d.toISOString().split("T")[0] ?? "";
}

/** Type guard: check if data is a ResolvedPrepTask */
function isPrepTask(
  data: ResolvedPrepTask | ResolvedKitchenTask
): data is ResolvedPrepTask {
  return "name" in data && "eventTitle" in data;
}

export function TaskDetail({ data, taskType, onFieldChange }: TaskDetailProps) {
  const _title = isPrepTask(data) ? data.name : data.title;
  const statusVariant = statusVariantMap[data.status] ?? "outline";
  const priority = data.priority;
  const priorityLabel =
    typeof priority === "string"
      ? priority
      : priority != null
        ? `P${priority}`
        : null;
  const priorityVariant =
    typeof priority === "string"
      ? (priorityVariantMap[priority] ?? "outline")
      : "outline";

  const dueDate = isPrepTask(data) ? data.dueByDate : data.dueDate;

  // Handler for field updates
  const handleFieldSave = useCallback(
    async (field: string, value: string) => {
      if (!onFieldChange) {
        toast.error("Editing not available");
        return;
      }

      try {
        await onFieldChange(field, value);
        toast.success("Updated successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update");
        throw error; // Re-throw to let the editable field show the error
      }
    },
    [onFieldChange]
  );

  // Determine the field name for the task title based on type
  const titleField = isPrepTask(data) ? "name" : "title";
  const titleValue = isPrepTask(data) ? data.name : data.title;

  return (
    <div className="space-y-4">
      {/* Status & Priority Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {onFieldChange ? (
          <EditableSelectField
            label="Status"
            onSave={(value) => handleFieldSave("status", value)}
            options={STATUS_OPTIONS}
            value={data.status}
          />
        ) : (
          <Badge variant={statusVariant}>{data.status}</Badge>
        )}
        {onFieldChange ? (
          <EditableSelectField
            label="Priority"
            onSave={(value) => handleFieldSave("priority", value)}
            options={PRIORITY_OPTIONS}
            value={typeof priority === "string" ? priority : null}
          />
        ) : (
          priorityLabel && <Badge variant={priorityVariant}>{priorityLabel}</Badge>
        )}
      </div>

      <Separator />

      {/* Task Title */}
      {onFieldChange && (
        <>
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="size-4 text-muted-foreground" />
              Task Name
            </h4>
            <div className="pl-6">
              <EditableField
                label={isPrepTask(data) ? "Name" : "Title"}
                onSave={(value) => handleFieldSave(titleField, value)}
                placeholder="Untitled"
                value={titleValue}
              />
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Due Date */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="size-4 text-muted-foreground" />
          Schedule
        </h4>
        <div className="grid gap-2 pl-6 text-sm">
          {onFieldChange ? (
            <EditableField
              displayFormatter={() => formatDate(dueDate) ?? "Not set"}
              label="Due Date"
              onSave={(value) => handleFieldSave(isPrepTask(data) ? "dueByDate" : "dueDate", value)}
              placeholder="Not set"
              type="date"
              value={formatDateForInput(dueDate)}
            />
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span className="font-medium">
                {formatDate(dueDate) ?? "Not set"}
              </span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Task Details */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="size-4 text-muted-foreground" />
          Details
        </h4>
        <div className="grid gap-2 pl-6 text-sm">
          {/* Linked event (prep tasks only) */}
          {isPrepTask(data) && data.eventTitle && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Event</span>
              <span className="font-medium">{data.eventTitle}</span>
            </div>
          )}

          {/* Assignee (prep tasks only) */}
          {isPrepTask(data) && data.assigneeName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                <User className="mr-1 inline size-3" />
                Assignee
              </span>
              <span className="font-medium">{data.assigneeName}</span>
            </div>
          )}

          {/* Priority warning for high priority */}
          {priorityLabel === "high" && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-destructive">
              <AlertTriangle className="size-4" />
              <span className="text-xs font-medium">High Priority</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Open Full Page */}
      <Button asChild className="w-full" variant="outline">
        <Link href="/kitchen/tasks">
          <ExternalLink className="mr-2 size-4" />
          Open in Kitchen
        </Link>
      </Button>
    </div>
  );
}
