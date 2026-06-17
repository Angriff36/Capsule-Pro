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
import {
  adminTaskCreate,
  adminTaskDevMetaCreate,
} from "@/app/lib/manifest-client.generated";
import { ENVIRONMENT_OPTIONS, SEVERITY_OPTIONS } from "../lib/board-defaults";
import { mapAdminTaskToKanban } from "../lib/admin-task-mappers";
import type { Employee, KanbanTask } from "../lib/board-types";

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

    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const category = String(data.get("category") ?? "").trim();
    const priority = String(data.get("priority") ?? "medium");
    const assignedTo = String(data.get("assignedTo") ?? "").trim();

    try {
      const result = await adminTaskCreate({
        title,
        description: description || undefined,
        category: category || undefined,
        priority,
        status: "backlog",
        assignedTo: assignedTo || undefined,
        sourceType: isDevMode ? "dev_bug" : undefined,
        position: 0,
      });

      if (!result) {
        throw new Error("Failed to create task");
      }

      if (isDevMode) {
        const severity = String(data.get("severity") ?? "medium");
        const environment = String(data.get("environment") ?? "");
        await adminTaskDevMetaCreate({
          taskId: result.id,
          severity,
          environment,
          stepsToRepro: description,
          expectedResult: "",
          actualResult: "",
        });
      }

      const mapped = mapAdminTaskToKanban(result);
      const assignee = assignedTo
        ? employees.find((employee) => employee.id === assignedTo)
        : undefined;

      onCreated({
        ...mapped,
        ownerName: assignee
          ? `${assignee.firstName} ${assignee.lastName}`.trim()
          : "You",
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
                    <option key={s.value} value={s.value}>
                      {s.label}
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
                  {ENVIRONMENT_OPTIONS.map((env) => (
                    <option key={env.value} value={env.value}>
                      {env.label}
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
