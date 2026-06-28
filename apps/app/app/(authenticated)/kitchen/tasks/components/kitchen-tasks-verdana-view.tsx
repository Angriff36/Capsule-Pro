import type {
  KitchenTask,
  KitchenTaskClaim,
} from "@repo/database";
import { format } from "date-fns";
import { Calendar, Clock, Plus, User } from "lucide-react";
import Link from "next/link";
import { KitchenTasksEmptyState } from "./kitchen-tasks-empty-state";

const PRIORITY_LABELS: Record<number, string> = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  5: "Low",
  10: "Backlog",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function statusChipClass(status: string): string {
  if (status === "completed") {
    return "vh-chip vh-chip-success";
  }
  if (status === "in_progress") {
    return "vh-chip vh-chip-active";
  }
  if (status === "cancelled") {
    return "vh-chip vh-chip-error";
  }
  return "vh-chip vh-chip-neutral";
}

function priorityChipClass(priority: number): string {
  if (priority === 1) {
    return "vh-chip vh-chip-error";
  }
  if (priority === 2) {
    return "vh-chip vh-chip-warning";
  }
  if (priority === 3) {
    return "vh-chip vh-chip-neutral";
  }
  return "vh-chip vh-chip-neutral";
}

export interface KitchenTasksVerdanaViewProps {
  myClaims: KitchenTaskClaim[];
  tasks: KitchenTask[];
}

export function KitchenTasksVerdanaView({
  tasks,
  myClaims,
}: Readonly<KitchenTasksVerdanaViewProps>) {
  const openCount = tasks.filter((t) => t.status === "open").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;

  return (
    <div className="vh-shell">
      <p className="vh-preview-note">
        Preview:{" "}
        <a
          href="https://designmd.ai/chef/verdana-health-design-system"
          rel="noopener noreferrer"
          target="_blank"
        >
          Verdana Health Design System
        </a>{" "}
        — scoped to this page only.
      </p>

      <header className="vh-hero">
        <p className="vh-eyebrow">Kitchen / Operations</p>
        <h1 className="vh-title">Kitchen Tasks</h1>
        <p className="vh-lede">
          Manage prep, cleaning, and operational work with a calm clinical
          workspace built for clarity and trust.
        </p>
        <div className="vh-hero-actions">
          <Link className="vh-btn-primary" href="/kitchen/tasks/new">
            <Plus aria-hidden className="mr-2 inline size-4" />
            New task
          </Link>
          <Link className="vh-btn-secondary" href="/kitchen">
            Back to kitchen
          </Link>
        </div>
      </header>

      <section aria-labelledby="vh-metrics-heading">
        <h2 className="sr-only" id="vh-metrics-heading">
          Performance overview
        </h2>
        <div className="vh-metrics">
          <article className="vh-metric-card">
            <p className="vh-metric-label">Total tasks</p>
            <p className="vh-metric-value">{tasks.length}</p>
          </article>
          <article className="vh-metric-card">
            <p className="vh-metric-label">Open</p>
            <p className="vh-metric-value">{openCount}</p>
          </article>
          <article className="vh-metric-card">
            <p className="vh-metric-label">In progress</p>
            <p className="vh-metric-value">{inProgressCount}</p>
          </article>
          <article className="vh-metric-card">
            <p className="vh-metric-label">My claims</p>
            <p className="vh-metric-value">{myClaims.length}</p>
          </article>
        </div>
      </section>

      <section aria-labelledby="vh-tasks-heading">
        <div className="vh-section-header">
          <div>
            <h2 className="vh-section-title" id="vh-tasks-heading">
              All kitchen tasks
            </h2>
            <p className="vh-section-desc">
              Status, priority, ownership, and due dates at a glance.
            </p>
          </div>
        </div>

        <div className="vh-panel">
          {tasks.length === 0 ? (
            <div className="vh-empty">
              <KitchenTasksEmptyState />
            </div>
          ) : (
            <>
              <div aria-hidden className="vh-list-header">
                <span>Status</span>
                <span>Priority</span>
                <span>Task</span>
                <span>Claimed by</span>
                <span>Due date</span>
                <span>Created</span>
              </div>
              <ul className="m-0 list-none p-0">
                {tasks.map((task) => {
                  const claimedBy = myClaims.find((c) => c.taskId === task.id);
                  return (
                    <li className="vh-list-row" key={task.id}>
                      <div>
                        <span className="vh-field-label">Status</span>
                        <span className={statusChipClass(task.status)}>
                          {STATUS_LABELS[task.status] ?? task.status}
                        </span>
                      </div>
                      <div>
                        <span className="vh-field-label">Priority</span>
                        <span className={priorityChipClass(task.priority)}>
                          {PRIORITY_LABELS[task.priority] ?? task.priority}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="vh-field-label">Task</span>
                        <p className="vh-task-title">{task.title}</p>
                        {task.summary ? (
                          <p className="vh-task-summary line-clamp-1">
                            {task.summary}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <span className="vh-field-label">Claimed by</span>
                        {claimedBy ? (
                          <span className="vh-meta">
                            <User aria-hidden className="size-3.5" />
                            You
                          </span>
                        ) : (
                          <span className="vh-meta">Unclaimed</span>
                        )}
                      </div>
                      <div>
                        <span className="vh-field-label">Due date</span>
                        {task.dueDate ? (
                          <span className="vh-meta">
                            <Calendar aria-hidden className="size-3.5" />
                            {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="vh-meta">—</span>
                        )}
                      </div>
                      <div>
                        <span className="vh-field-label">Created</span>
                        <span className="vh-meta">
                          <Clock aria-hidden className="size-3.5" />
                          {format(new Date(task.createdAt), "MMM d")}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
