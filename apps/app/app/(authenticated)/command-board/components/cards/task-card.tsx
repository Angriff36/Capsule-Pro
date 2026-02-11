"use client";

import {
  Avatar,
  AvatarFallback,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { differenceInMinutes, format, isPast } from "date-fns";
import { AlertCircle, Calendar, CheckCircle2, MoreVertical } from "lucide-react";
import { memo } from "react";
import type { CommandBoardCard } from "../../types";

interface TaskCardProps {
  card: CommandBoardCard;
}

const priorityConfig = {
  1: { label: "Critical", color: "bg-rose-500 text-white" },
  2: { label: "Urgent", color: "bg-red-500 text-white" },
  3: { label: "High", color: "bg-orange-500 text-white" },
  4: { label: "Medium-High", color: "bg-amber-500 text-white" },
  5: { label: "Medium", color: "bg-yellow-500 text-white" },
  6: { label: "Medium-Low", color: "bg-lime-500 text-white" },
  7: { label: "Low", color: "bg-green-500 text-white" },
  8: { label: "Very Low", color: "bg-emerald-500 text-white" },
  9: { label: "Minimal", color: "bg-teal-500 text-white" },
  10: { label: "None", color: "bg-slate-400 text-white" },
};

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: CheckCircle2,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  canceled: {
    label: "Canceled",
    color: "bg-slate-100 text-slate-500 border-slate-200",
    icon: CheckCircle2,
  },
};

function getDueStatus(
  dueDate: Date | null
): { label: string; isOverdue: boolean } | null {
  if (!dueDate) {
    return null;
  }

  const now = new Date();
  const diffMins = differenceInMinutes(dueDate, now);

  if (isPast(dueDate) && diffMins < -30) {
    return { label: "Overdue", isOverdue: true };
  }

  if (diffMins < 0) {
    return { label: `${Math.abs(diffMins)}m late`, isOverdue: true };
  }

  if (diffMins < 60) {
    return { label: `Due in ${diffMins}m`, isOverdue: false };
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 4) {
    return { label: `Due in ${diffHours}h`, isOverdue: false };
  }

  return { label: format(dueDate, "MMM d"), isOverdue: false };
}

export const TaskCard = memo(function TaskCard({ card }: TaskCardProps) {
  const metadata = card.metadata as {
    priority?: number;
    status?: string;
    dueDate?: string | Date;
    assignee?: { name?: string };
  };
  const priority = metadata.priority || 5;
  const status = metadata.status || "pending";
  const priorityConfigItem =
    priorityConfig[priority as keyof typeof priorityConfig] ||
    priorityConfig[5];
  const statusConfigItem =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const dueDate = metadata.dueDate ? new Date(metadata.dueDate) : null;
  const dueStatus = getDueStatus(dueDate);
  const assignee = metadata.assignee;

  const getInitials = (name?: string) => {
    if (!name) {
      return "?";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const StatusIcon = statusConfigItem.icon;

  return (
    <div className="flex h-full flex-col">
      {/* Header with type icon and priority */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-blue-500" />
          <Badge
            className={`border-0 ${priorityConfigItem.color} font-medium text-xs`}
          >
            {priorityConfigItem.label}
          </Badge>
        </div>
        {dueStatus?.isOverdue && (
          <Badge className="gap-1 text-xs" variant="destructive">
            <AlertCircle className="h-3 w-3" />
            {dueStatus.label}
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-2 line-clamp-2 font-semibold text-sm leading-tight">
        {card.title}
      </h3>

      {/* Description */}
      {card.content && (
        <p className="mb-3 line-clamp-2 text-muted-foreground text-xs">
          {card.content}
        </p>
      )}

      {/* Status and due date row */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge className={`${statusConfigItem.color} gap-1`} variant="outline">
          <StatusIcon className="h-3 w-3" />
          {statusConfigItem.label}
        </Badge>
        {dueDate && !dueStatus?.isOverdue && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Calendar className="h-3 w-3" />
            <span>{dueStatus?.label}</span>
          </div>
        )}
      </div>

      {/* Assignee */}
      {assignee && (
        <div className="mb-3 flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px]">
              {getInitials(assignee.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-muted-foreground text-xs">{assignee.name}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-full justify-start gap-2"
              size="sm"
              variant="ghost"
            >
              <MoreVertical className="h-4 w-4" />
              Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Task</DropdownMenuItem>
            <DropdownMenuItem>Edit Task</DropdownMenuItem>
            {status !== "completed" && (
              <DropdownMenuItem>Mark Complete</DropdownMenuItem>
            )}
            {status === "pending" && (
              <DropdownMenuItem>Start Task</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
