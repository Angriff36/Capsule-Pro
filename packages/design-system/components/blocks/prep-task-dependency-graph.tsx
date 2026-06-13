"use client";

import { AlertTriangle, CheckCircle2, CircleDashed, Clock } from "lucide-react";
import React, { useMemo } from "react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";

// ============================================================================
// Types
// ============================================================================

export interface TaskNode {
  duration: number;
  earliestFinish: number;
  earliestStart: number;
  isCritical: boolean;
  latestFinish: number;
  latestStart: number;
  slack: number;
  taskId: string;
  taskName: string;
}

export interface CriticalPathData {
  allNodes: TaskNode[];
  conflicts: Array<{
    type: string;
    message: string;
    tasks: string[];
  }>;
  criticalPath: Array<{ id: string; name: string; estimatedMinutes: number }>;
  eventId: string;
  flexibleConstraintCount: number;
  hardConstraintCount: number;
  slackTime: Record<string, number>;
  totalDuration: number;
  totalDurationHours: number;
  warnings: string[];
}

export interface PrepTaskDependencyGraphProps {
  data: CriticalPathData | null;
  error?: string | null;
  isLoading?: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getSlackColor(slack: number): string {
  if (slack <= 0) {
    return "text-red-500";
  }
  if (slack < 30) {
    return "text-orange-500";
  }
  if (slack < 60) {
    return "text-yellow-500";
  }
  return "text-green-500";
}

function getSlackLabel(slack: number): string {
  if (slack <= 0) {
    return "Critical";
  }
  if (slack < 30) {
    return "Tight";
  }
  if (slack < 60) {
    return "Moderate";
  }
  return "Flexible";
}

// ============================================================================
// Components
// ============================================================================

/**
 * Dependency Graph Node Component
 * Displays a single task with its timing information
 */
function TaskNodeCard({ node }: { node: TaskNode }) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border p-3 transition-all ${
        node.isCritical
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-sm">{node.taskName}</span>
        {node.isCritical && (
          <Badge className="shrink-0" variant="destructive">
            Critical
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground text-xs">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Duration: {formatMinutes(node.duration)}</span>
        </div>
        <div className={`flex items-center gap-1 ${getSlackColor(node.slack)}`}>
          <CircleDashed className="h-3 w-3" />
          <span>Slack: {getSlackLabel(node.slack)}</span>
          {node.slack > 0 && <span>({formatMinutes(node.slack)})</span>}
        </div>
      </div>

      {/* Timeline bar */}
      <div className="mt-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full ${
              node.isCritical
                ? "bg-red-500"
                : node.slack < 60
                  ? "bg-orange-500"
                  : "bg-green-500"
            }`}
            style={{
              width: `${Math.min(100, (node.duration / node.latestFinish) * 100)}%`,
            }}
          />
        </div>
        <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
          <span>Start: {formatMinutes(node.earliestStart)}</span>
          <span>End: {formatMinutes(node.earliestFinish)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Critical Path Visualization Component
 * Shows the critical path as a horizontal flow
 */
function CriticalPathView({ data }: { data: CriticalPathData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Critical Path</h4>
        <Badge className="gap-1" variant="outline">
          <Clock className="h-3 w-3" />
          {formatMinutes(data.totalDuration)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {data.criticalPath.map((task, index) => (
          <React.Fragment key={task.id}>
            <Badge
              className="whitespace-nowrap px-3 py-1 text-sm"
              variant="destructive"
            >
              {task.name}
            </Badge>
            {index < data.criticalPath.length - 1 && (
              <span className="text-muted-foreground">→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="text-muted-foreground text-xs">
        {data.criticalPath.length} task
        {data.criticalPath.length === 1 ? "" : "s"} on critical path •{" "}
        {data.hardConstraintCount} hard constraint
        {data.hardConstraintCount === 1 ? "" : "s"}•{" "}
        {data.flexibleConstraintCount} flexible constraint
        {data.flexibleConstraintCount === 1 ? "" : "s"}
      </div>
    </div>
  );
}

/**
 * All Tasks Grid Component
 * Shows all tasks with their timing info
 */
function AllTasksGrid({ nodes }: { nodes: TaskNode[] }) {
  // Sort by earliest start time, then by critical status
  const sortedNodes = useMemo(
    () =>
      [...nodes].sort((a, b) => {
        if (a.isCritical && !b.isCritical) {
          return -1;
        }
        if (!a.isCritical && b.isCritical) {
          return 1;
        }
        return a.earliestStart - b.earliestStart;
      }),
    [nodes]
  );

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {sortedNodes.map((node) => (
        <TaskNodeCard key={node.taskId} node={node} />
      ))}
    </div>
  );
}

/**
 * Warnings and Conflicts Component
 */
function WarningsPanel({
  conflicts,
  warnings,
}: {
  conflicts: CriticalPathData["conflicts"];
  warnings: CriticalPathData["warnings"];
}) {
  if (conflicts.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>No dependency conflicts detected</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conflicts.map((conflict, index) => (
        <div
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"
          key={index}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="text-sm">
            <div className="font-medium text-red-700 dark:text-red-400">
              {conflict.type === "circular"
                ? "Circular Dependency"
                : "Conflict"}
            </div>
            <div className="text-red-600 dark:text-red-500">
              {conflict.message}
            </div>
          </div>
        </div>
      ))}

      {warnings.map((warning, index) => (
        <div
          className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950"
          key={index}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
          <div className="text-sm text-yellow-700 dark:text-yellow-400">
            {warning}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PrepTaskDependencyGraph
 *
 * Visualizes the dependency graph for prep tasks with:
 * - Critical path highlighting
 * - Slack time visualization
 * - Timeline bars for each task
 * - Conflict and warning display
 */
export function PrepTaskDependencyGraph({
  data,
  isLoading = false,
  error = null,
}: PrepTaskDependencyGraphProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton className="h-24" key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.allNodes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground text-sm">
            No prep tasks with dependencies found for this event.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Task Dependencies & Critical Path</span>
          <Badge className="gap-1" variant="outline">
            <Clock className="h-3 w-3" />
            {formatMinutes(data.totalDuration)} total
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Critical Path */}
        <CriticalPathView data={data} />

        <Separator />

        {/* Warnings and Conflicts */}
        <WarningsPanel conflicts={data.conflicts} warnings={data.warnings} />

        <Separator />

        {/* All Tasks Grid */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">All Tasks</h4>
          <AllTasksGrid nodes={data.allNodes} />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 border-t pt-4 text-muted-foreground text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span>Critical (no slack)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-orange-500" />
            <span>Tight (&lt;30m slack)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-yellow-500" />
            <span>Moderate (&lt;1h slack)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-green-500" />
            <span>Flexible (≥1h slack)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-components for reusability
// ============================================================================

/**
 * Dependency Creation Dialog Component
 * Props for creating a new dependency
 */
export interface DependencyFormData {
  dependencyType:
    | "finish_to_start"
    | "start_to_start"
    | "finish_to_finish"
    | "start_to_finish";
  isHardConstraint: boolean;
  lagMinutes: number;
  predecessorTaskId: string;
  successorTaskId: string;
}

export interface CreateDependencyDialogProps {
  availableTasks: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onSubmit: (data: DependencyFormData) => void;
}

export function CreateDependencyForm({
  availableTasks,
  onSubmit,
  onCancel,
}: CreateDependencyDialogProps) {
  const [formData, setFormData] = React.useState<DependencyFormData>({
    predecessorTaskId: "",
    successorTaskId: "",
    dependencyType: "finish_to_start",
    lagMinutes: 0,
    isHardConstraint: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="font-medium text-sm">
          Predecessor Task (must finish first)
        </label>
        <select
          className="w-full rounded-sm border px-3 py-2"
          onChange={(e) =>
            setFormData({ ...formData, predecessorTaskId: e.target.value })
          }
          required
          value={formData.predecessorTaskId}
        >
          <option value="">Select a task...</option>
          {availableTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="font-medium text-sm">
          Successor Task (depends on predecessor)
        </label>
        <select
          className="w-full rounded-sm border px-3 py-2"
          disabled={!formData.predecessorTaskId}
          onChange={(e) =>
            setFormData({ ...formData, successorTaskId: e.target.value })
          }
          required
          value={formData.successorTaskId}
        >
          <option value="">Select a task...</option>
          {availableTasks
            .filter((t) => t.id !== formData.predecessorTaskId)
            .map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="font-medium text-sm">Dependency Type</label>
        <select
          className="w-full rounded-sm border px-3 py-2"
          onChange={(e) =>
            setFormData({ ...formData, dependencyType: e.target.value as any })
          }
          value={formData.dependencyType}
        >
          <option value="finish_to_start">Finish to Start (default)</option>
          <option value="start_to_start">Start to Start</option>
          <option value="finish_to_finish">Finish to Finish</option>
          <option value="start_to_finish">Start to Finish</option>
        </select>
        <p className="text-muted-foreground text-xs">
          {formData.dependencyType === "finish_to_start" &&
            "Predecessor must finish before successor starts"}
          {formData.dependencyType === "start_to_start" &&
            "Predecessor must start before successor starts"}
          {formData.dependencyType === "finish_to_finish" &&
            "Predecessor must finish before successor finishes"}
          {formData.dependencyType === "start_to_finish" &&
            "Predecessor must start before successor finishes"}
        </p>
      </div>

      <div className="space-y-2">
        <label className="font-medium text-sm">Lag Time (minutes)</label>
        <input
          className="w-full rounded-sm border px-3 py-2"
          min="0"
          onChange={(e) =>
            setFormData({
              ...formData,
              lagMinutes: Number.parseInt(e.target.value, 10) || 0,
            })
          }
          type="number"
          value={formData.lagMinutes}
        />
        <p className="text-muted-foreground text-xs">
          Additional wait time after the dependency is satisfied
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          checked={formData.isHardConstraint}
          className="rounded"
          id="hardConstraint"
          onChange={(e) =>
            setFormData({ ...formData, isHardConstraint: e.target.checked })
          }
          type="checkbox"
        />
        <label className="text-sm" htmlFor="hardConstraint">
          Hard constraint (cannot be bypassed)
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          className="rounded-sm border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-sm bg-primary px-4 py-2 text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
          disabled={!(formData.predecessorTaskId && formData.successorTaskId)}
          type="submit"
        >
          Create Dependency
        </button>
      </div>
    </form>
  );
}
