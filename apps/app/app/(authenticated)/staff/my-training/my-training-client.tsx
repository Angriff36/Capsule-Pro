"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import {
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface TrainingRow {
  readonly id: string;
  readonly module_id: string;
  readonly module_title: string;
  readonly module_description: string | null;
  readonly content_type: string;
  readonly duration_minutes: number | null;
  readonly category: string | null;
  readonly is_required: boolean;
  readonly status: string;
  readonly due_date: string | null;
  readonly assigned_at: string;
  readonly content_url: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly score: number | null;
  readonly passed: boolean;
}

interface MyTrainingClientProperties {
  readonly assignments: TrainingRow[];
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function MyTrainingClient({
  assignments,
}: MyTrainingClientProperties) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleStart(assignmentId: string) {
    setLoading(assignmentId);
    try {
      const response = await fetch("/api/training/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", assignmentId }),
      });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleComplete(assignmentId: string) {
    setLoading(assignmentId);
    try {
      const response = await fetch("/api/training/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", assignmentId, passed: true }),
      });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-hairline bg-canvas px-6 py-16 text-center">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          No training assignments yet. Check back when your manager assigns
          modules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => {
        const days = daysUntilDue(assignment.due_date);
        const isLoading = loading === assignment.id;
        const isOverdue = assignment.status === "overdue";
        const isCompleted = assignment.status === "completed";
        const isInProgress = assignment.status === "in_progress";

        return (
          <div
            className={cn(
              "rounded-[22px] border border-hairline bg-canvas p-5 transition-colors",
              isOverdue && "border-red-200",
            )}
            key={assignment.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-background text-ink">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-ink">
                    {assignment.module_title}
                    {assignment.is_required && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Required
                      </span>
                    )}
                  </div>
                  {assignment.module_description && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {assignment.module_description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span>{assignment.content_type}</span>
                    {assignment.duration_minutes != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {assignment.duration_minutes} min
                      </span>
                    )}
                    {assignment.category && (
                      <Badge className="text-[10px]" variant="outline">
                        {assignment.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isOverdue && (
                  <Badge variant="destructive">Overdue</Badge>
                )}
                {isCompleted && (
                  <Badge variant="secondary">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Done
                  </Badge>
                )}
                {isInProgress && (
                  <Badge variant="outline">In progress</Badge>
                )}
                {assignment.status === "assigned" && (
                  <Button
                    className="bg-ink text-white hover:bg-ink/90"
                    disabled={isLoading}
                    onClick={() => handleStart(assignment.id)}
                    size="sm"
                  >
                    {isLoading ? "Starting\u2026" : "Start"}
                  </Button>
                )}
                {isInProgress && (
                  <Button
                    className="bg-ink text-white hover:bg-ink/90"
                    disabled={isLoading}
                    onClick={() => handleComplete(assignment.id)}
                    size="sm"
                  >
                    {isLoading ? "Completing\u2026" : "Complete"}
                  </Button>
                )}
                {assignment.content_url && assignment.status !== "assigned" && (
                  <a
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-muted-foreground transition-colors hover:text-ink"
                    href={assignment.content_url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {(assignment.due_date || assignment.completed_at) && (
              <div className="mt-3 flex items-center gap-4 border-t border-hairline pt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {assignment.due_date && !isCompleted && (
                  <span
                    className={cn(
                      isOverdue && "text-red-600",
                      !isOverdue && days !== null && days <= 3 && "text-amber-600",
                    )}
                  >
                    Due {formatDate(assignment.due_date)}
                    {days !== null && days >= 0 && ` (${days}d remaining)`}
                    {days !== null && days < 0 && ` (${-days}d overdue)`}
                  </span>
                )}
                {assignment.completed_at && (
                  <span>Completed {formatDate(assignment.completed_at)}</span>
                )}
                {assignment.score !== null && (
                  <span>Score: {assignment.score}/100</span>
                )}
                {assignment.started_at && !assignment.completed_at && (
                  <span>Started {formatDate(assignment.started_at)}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
