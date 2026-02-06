"use client";

import type {
  User as DbUser,
  KitchenTask,
  KitchenTaskClaim,
} from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
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
import { ChevronRight, Clock, MoreVertical, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/app/lib/api";

type UserSelect = Pick<
  DbUser,
  "id" | "firstName" | "lastName" | "email" | "avatarUrl"
>;

type TaskWithRelations = KitchenTask & {
  claims: Array<KitchenTaskClaim & { user: UserSelect | null }>;
};

interface TaskCardProps {
  task: TaskWithRelations;
  currentUserId?: string | null;
  compact?: boolean;
}

const priorityConfig = {
  1: { label: "Critical", color: "bg-rose-500 text-white", dot: "bg-rose-500" },
  2: { label: "Urgent", color: "bg-red-500 text-white", dot: "bg-red-500" },
  3: { label: "High", color: "bg-orange-500 text-white", dot: "bg-orange-500" },
  4: {
    label: "Medium-High",
    color: "bg-amber-500 text-white",
    dot: "bg-amber-500",
  },
  5: {
    label: "Medium",
    color: "bg-yellow-500 text-white",
    dot: "bg-yellow-500",
  },
  6: {
    label: "Medium-Low",
    color: "bg-lime-500 text-white",
    dot: "bg-lime-500",
  },
  7: { label: "Low", color: "bg-green-500 text-white", dot: "bg-green-500" },
  8: {
    label: "Very Low",
    color: "bg-emerald-500 text-white",
    dot: "bg-emerald-500",
  },
  9: { label: "Minimal", color: "bg-teal-500 text-white", dot: "bg-teal-500" },
  10: { label: "None", color: "bg-slate-400 text-white", dot: "bg-slate-400" },
};

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
    bgColor: "bg-slate-100",
    textColor: "text-slate-600",
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    icon: ChevronRight,
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
  },
  completed: {
    label: "Completed",
    variant: "default" as const,
    icon: ChevronRight,
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-600",
  },
  canceled: {
    label: "Canceled",
    variant: "secondary" as const,
    icon: ChevronRight,
    bgColor: "bg-slate-100",
    textColor: "text-slate-400",
  },
};

function getInitials(
  firstName?: string | null,
  lastName?: string | null
): string {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return first + last || "?";
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-100 text-blue-600",
    "bg-emerald-100 text-emerald-600",
    "bg-violet-100 text-violet-600",
    "bg-amber-100 text-amber-600",
    "bg-rose-100 text-rose-600",
    "bg-cyan-100 text-cyan-600",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function formatDueStatus(dueDate: Date | null): {
  label: string;
  className: string;
  isOverdue: boolean;
  isUrgent: boolean;
} | null {
  if (!dueDate) {
    return null;
  }

  const now = new Date();
  const due = new Date(dueDate);
  const diffMins = differenceInMinutes(due, now);

  if (isPast(due) && diffMins < -30) {
    return {
      label: "Overdue",
      className: "text-rose-600 bg-rose-50",
      isOverdue: true,
      isUrgent: true,
    };
  }

  if (diffMins < 0) {
    return {
      label: `${Math.abs(diffMins)}m late`,
      className: "text-rose-600 bg-rose-50",
      isOverdue: false,
      isUrgent: true,
    };
  }

  if (diffMins < 60) {
    return {
      label: `Due in ${diffMins}m`,
      className: "text-amber-600 bg-amber-50",
      isOverdue: false,
      isUrgent: true,
    };
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 4) {
    return {
      label: `Due in ${diffHours}h`,
      className: "text-slate-600 bg-slate-50",
      isOverdue: false,
      isUrgent: false,
    };
  }

  return {
    label: format(due, "h:mm a"),
    className: "text-slate-500 bg-slate-50",
    isOverdue: false,
    isUrgent: false,
  };
}

export function TaskCard({
  task,
  currentUserId,
  compact = false,
}: TaskCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const userClaim = task.claims.find(
    (claim) => claim.employeeId === currentUserId && !claim.releasedAt
  );

  const assignedUsers = task.claims.filter((c) => c.user && !c.releasedAt);
  const priority =
    priorityConfig[task.priority as keyof typeof priorityConfig] ||
    priorityConfig[5];
  const status =
    statusConfig[task.status as keyof typeof statusConfig] ||
    statusConfig.pending;
  const dueStatus = formatDueStatus(
    task.dueDate ? new Date(task.dueDate) : null
  );

  const handleClaim = async () => {
    if (!currentUserId) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/kitchen/tasks/${task.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: currentUserId }),
      });
      if (!response.ok) {
        throw new Error("Failed to claim task");
      }
      router.refresh();
    } catch (error) {
      console.error("Error claiming task:", error);
      alert("Failed to claim task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!currentUserId) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/kitchen/tasks/${task.id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: currentUserId }),
      });
      if (!response.ok) {
        throw new Error("Failed to release task");
      }
      router.refresh();
    } catch (error) {
      console.error("Error releasing task:", error);
      alert("Failed to release task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/kitchen/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error("Failed to update task status");
      }
      router.refresh();
    } catch (error) {
      console.error("Error updating task status:", error);
      alert("Failed to update task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
        <div className={`h-2 w-2 shrink-0 rounded-full ${priority.dot}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-800 text-sm">
            {task.title}
          </p>
          {task.summary && (
            <p className="truncate text-slate-500 text-xs">{task.summary}</p>
          )}
        </div>
        {dueStatus && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 font-medium text-xs ${dueStatus.className}`}
          >
            {dueStatus.label}
          </span>
        )}
        {assignedUsers.length > 0 && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={assignedUsers[0].user?.avatarUrl || undefined} />
            <AvatarFallback className="text-[10px]">
              {getInitials(
                assignedUsers[0].user?.firstName,
                assignedUsers[0].user?.lastName
              )}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md ${
        dueStatus?.isUrgent ? "ring-1 ring-rose-200" : ""
      }`}
    >
      {/* Priority indicator bar */}
      <div className={`absolute top-0 bottom-0 left-0 w-1 ${priority.dot}`} />

      <div className="pl-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="line-clamp-1 font-semibold text-slate-800">
              {task.title}
            </h4>
            {task.summary && (
              <p className="mt-1 line-clamp-2 text-slate-500 text-sm">
                {task.summary}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                disabled={isLoading}
                size="icon"
                variant="ghost"
              >
                <MoreVertical className="h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {task.status !== "completed" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("completed")}
                >
                  Mark as Completed
                </DropdownMenuItem>
              )}
              {task.status === "in_progress" && (
                <DropdownMenuItem onClick={() => handleStatusChange("pending")}>
                  Reopen Task
                </DropdownMenuItem>
              )}
              {task.status !== "canceled" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("canceled")}
                >
                  Cancel Task
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Metadata row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Priority badge */}
          <Badge className={`${priority.color} border-0 font-medium text-xs`}>
            {priority.label}
          </Badge>

          {/* Status badge */}
          <Badge className="font-medium text-xs" variant={status.variant}>
            {status.label}
          </Badge>

          {/* Due time */}
          {dueStatus && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs ${dueStatus.className}`}
            >
              <Clock className="h-3 w-3" />
              {dueStatus.label}
            </span>
          )}
        </div>

        {/* Assignees */}
        {assignedUsers.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2">
              {assignedUsers.slice(0, 3).map((claim, index) => (
                <Avatar
                  className="h-7 w-7 border-2 border-white"
                  key={claim.user?.id || index}
                >
                  <AvatarImage src={claim.user?.avatarUrl || undefined} />
                  <AvatarFallback
                    className={`text-xs ${getAvatarColor(
                      claim.user?.firstName || "U"
                    )}`}
                  >
                    {getInitials(claim.user?.firstName, claim.user?.lastName)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignedUsers.length > 3 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 font-medium text-slate-600 text-xs">
                  +{assignedUsers.length - 3}
                </div>
              )}
            </div>
            <span className="text-slate-500 text-xs">
              {assignedUsers.length === 1
                ? assignedUsers[0].user
                  ? `${assignedUsers[0].user.firstName} ${assignedUsers[0].user.lastName}`
                  : "Unknown"
                : `${assignedUsers.length} assigned`}
            </span>
          </div>
        )}

        {/* Action button */}
        <div className="mt-3">
          {task.status === "pending" && !userClaim && (
            <Button
              className="w-full gap-2 bg-slate-900 text-white hover:bg-slate-800"
              disabled={isLoading}
              onClick={handleClaim}
              size="sm"
            >
              <User className="h-4 w-4" />
              Claim Task
            </Button>
          )}
          {userClaim &&
            task.status !== "completed" &&
            task.status !== "canceled" && (
              <Button
                className="w-full gap-2"
                disabled={isLoading}
                onClick={handleRelease}
                size="sm"
                variant="outline"
              >
                <User className="h-4 w-4" />
                Release Task
              </Button>
            )}
          {task.status === "in_progress" && userClaim && (
            <Button
              className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={isLoading}
              onClick={() => handleStatusChange("completed")}
              size="sm"
            >
              <ChevronRight className="h-4 w-4" />
              Mark Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
