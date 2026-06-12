"use client";

import { useState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Employee, KanbanTask } from "../lib/board-types";
import { SEVERITY_OPTIONS, ENVIRONMENT_OPTIONS } from "../lib/board-defaults";
import * as routes from "@/app/lib/routes";

const priorities = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "urgent", label: "Urgent" },
];

interface AdminTaskDialogProps {
  employees: Employee[];
  isDevMode: boolean;
  onCreated: (task: KanbanTask) => void;
}

export function AdminTaskDialog({
  employees,
  isDevMode,
  onCreated,
}: AdminTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    const body: Record<string, unknown> = {
      title: data.get("title"),
      description: data.get("description") || undefined,
      category: data.get("category") || undefined,
      priority: data.get("priority") || "medium",
      status: "backlog",
      assignedTo: data.get("assignedTo") || undefined,
    };

    if (isDevMode) {
      body.sourceType = "dev_bug";
    }

    try {
      const res = await fetch(routes.adminTasks(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create task");
      }

      const result = await res.json();
      const created = result.data ?? result;

      onCreated({
        id: created.id,
        title: created.title ?? (body.title as string),
        description: (created.description ?? body.description ?? null) as
          | string
          | null,
        status: created.status ?? "backlog",
        priority: created.priority ?? "medium",
        category: (created.category ?? body.category ?? null) as string | null,
        position: created.position ?? 0,
        labels: created.labels ?? [],
        estimatedHours: created.estimatedHours ?? null,
        dueDate: created.dueDate ?? null,
        assignedTo: created.assignedTo ?? null,
        createdBy: created.createdBy ?? null,
        sourceType: created.sourceType ?? null,
        sourceId: created.sourceId ?? null,
        ownerName: "You",
      });

      setOpen(false);
      form.reset();
    } catch {
      // Errors would be handled by a toast in production
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="outline">
          {isDevMode ? "Report bug" : "Add board item"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isDevMode ? "Report a bug" : "New administrative task"}
          </DialogTitle>
          <DialogDescription>
            {isDevMode
              ? "File a development bug to track on the board."
              : "Create a task to track administrative follow-ups and approvals."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder={isDevMode ? "Bug summary" : "Task title"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder={
                isDevMode
                  ? "Steps to reproduce, expected vs actual behavior"
                  : "Optional details or context"
              }
            />
          </div>
          {!isDevMode && (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                placeholder="Payroll, vendor, compliance"
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="medium"
                id="priority"
                name="priority"
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assignee</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
                id="assignedTo"
                name="assignedTo"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {isDevMode && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="medium"
                  id="severity"
                  name="severity"
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                  id="environment"
                  name="environment"
                >
                  <option value="">Select</option>
                  {ENVIRONMENT_OPTIONS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Creating..."
                : isDevMode
                  ? "Report bug"
                  : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
