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
import type {
  ResolvedKitchenTask,
  ResolvedPrepTask,
} from "../../types/entities";

// ============================================================================
// Task Detail View — handles both prep_task and kitchen_task
// ============================================================================

interface TaskDetailProps {
  data: ResolvedPrepTask | ResolvedKitchenTask;
  taskType: "prep_task" | "kitchen_task";
}

/** Status → Badge variant mapping */
const statusVariantMap = {
  pending: "outline" as const,
  in_progress: "secondary" as const,
  completed: "default" as const,
  cancelled: "destructive" as const,
  overdue: "destructive" as const,
};

/** Priority → Badge variant mapping */
const priorityVariantMap = {
  high: "destructive" as const,
  medium: "secondary" as const,
  low: "outline" as const,
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

/** Type guard: check if data is a ResolvedPrepTask */
function isPrepTask(
  data: ResolvedPrepTask | ResolvedKitchenTask
): data is ResolvedPrepTask {
  return "name" in data && "eventTitle" in data;
}

export function TaskDetail({ data, taskType }: TaskDetailProps) {
  const _title = isPrepTask(data) ? data.name : data.title;
  const statusVariant =
    statusVariantMap[data.status as keyof typeof statusVariantMap] ?? "outline";
  const priority = data.priority;
  const priorityLabel =
    typeof priority === "string"
      ? priority
      : priority != null
        ? `P${priority}`
        : null;
  const priorityVariant =
    typeof priority === "string"
      ? (priorityVariantMap[priority as keyof typeof priorityVariantMap] ??
        "outline")
      : "outline";

  const dueDate = isPrepTask(data) ? data.dueByDate : data.dueDate;

  return (
    <div className="space-y-4">
      {/* Status & Priority Badges */}
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant}>{data.status}</Badge>
        {priorityLabel && (
          <Badge variant={priorityVariant}>{priorityLabel}</Badge>
        )}
      </div>

      <Separator />

      {/* Due Date */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="size-4 text-muted-foreground" />
          Schedule
        </h4>
        <div className="grid gap-2 pl-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Due Date</span>
            <span className="font-medium">
              {formatDate(dueDate) ?? "Not set"}
            </span>
          </div>
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
