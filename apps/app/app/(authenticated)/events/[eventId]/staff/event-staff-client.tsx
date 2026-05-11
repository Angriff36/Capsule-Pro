"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Loader2, Plus, UserMinus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface Assignment {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
}

interface AvailableEmployee {
  id: string;
  name: string;
  role: string;
}

interface EventStaffClientProps {
  eventId: string;
  initialAssignments: Assignment[];
  initialAvailable: AvailableEmployee[];
}

const SHIFT_STATUS: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "success" | "coral" | "outline";
  }
> = {
  upcoming: { label: "Upcoming", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "success" },
  completed: { label: "Completed", variant: "default" },
  no_shift: { label: "No shift", variant: "outline" },
};

function getShiftStatus(
  startTime: string | null,
  endTime: string | null
): string {
  if (!(startTime || endTime)) {
    return "no_shift";
  }
  const now = Date.now();
  const start = startTime ? new Date(startTime).getTime() : null;
  const end = endTime ? new Date(endTime).getTime() : null;
  if (start && start > now) {
    return "upcoming";
  }
  if (end && end < now) {
    return "completed";
  }
  return "in_progress";
}

function formatTime(iso: string | null): string {
  if (!iso) {
    return "\u2014";
  }
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const COMMON_ROLES = [
  "manager",
  "chef",
  "server",
  "bartender",
  "host",
  "setup",
  "cleanup",
  "security",
  "dj",
  "photographer",
  "coordinator",
  "staff",
];

export function EventStaffClient({
  eventId,
  initialAssignments,
  initialAvailable,
}: EventStaffClientProps) {
  const [assignments, setAssignments] =
    useState<Assignment[]>(initialAssignments);
  const [available, setAvailable] =
    useState<AvailableEmployee[]>(initialAvailable);
  const [isPending, startTransition] = useTransition();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [assignRole, setAssignRole] = useState("staff");
  const [assignNotes, setAssignNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const _refreshData = () => {
    startTransition(async () => {
      try {
        const [assignRes, _availRes] = await Promise.all([
          fetch(`/api/events/staff/list?eventId=${eventId}`),
          fetch("/api/events/staff/commands/assign", { method: "GET" }).catch(
            () => null
          ),
        ]);

        const assignJson = await assignRes.json();
        if (assignJson.eventStaffs) {
          setAssignments(
            assignJson.eventStaffs.map(
              (s: {
                id: string;
                employeeId: string;
                role: string;
                startTime?: string | null;
                endTime?: string | null;
                notes?: string | null;
              }) => ({
                id: s.id,
                employeeId: s.employeeId,
                employeeName: "Staff", // The list endpoint doesn't join names
                role: s.role,
                startTime: s.startTime ?? null,
                endTime: s.endTime ?? null,
                notes: s.notes ?? null,
              })
            )
          );
        }

        // Refresh available list via page reload for simplicity
      } catch {
        toast.error("Failed to refresh staff list");
      }
    });
  };

  const handleAssign = () => {
    if (!selectedEmployee) {
      toast.error("Select an employee to assign");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/events/staff/commands/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            employeeId: selectedEmployee,
            role: assignRole,
            notes: assignNotes.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            json.message || json.error || "Failed to assign staff"
          );
        }

        const emp = available.find((e) => e.id === selectedEmployee);
        toast.success(`${emp?.name ?? "Staff"} assigned as ${assignRole}`);
        setAssignOpen(false);
        setSelectedEmployee("");
        setAssignRole("staff");
        setAssignNotes("");

        // Optimistically update local state
        if (emp) {
          setAssignments((prev) => [
            ...prev,
            {
              id: json.result?.id ?? crypto.randomUUID(),
              employeeId: selectedEmployee,
              employeeName: emp.name,
              role: assignRole,
              startTime: null,
              endTime: null,
              notes: assignNotes.trim() || null,
            },
          ]);
          setAvailable((prev) => prev.filter((e) => e.id !== selectedEmployee));
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to assign staff"
        );
      }
    });
  };

  const handleUnassign = (assignmentId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/events/staff/commands/unassign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: assignmentId }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            json.message || json.error || "Failed to unassign staff"
          );
        }

        toast.success("Staff unassigned");
        setDeleteTarget(null);

        // Remove from assignments optimistically
        setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to unassign staff"
        );
      }
    });
  };

  // Group assignments by role for the OperationalColumn view
  const _roles = [...new Set(assignments.map((a) => a.role))];

  return (
    <div className="space-y-6">
      {/* Assign staff dialog */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {assignments.length} assigned, {available.length} available
        </div>
        <Dialog onOpenChange={setAssignOpen} open={assignOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Assign Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Employee *</Label>
                <Select
                  onValueChange={setSelectedEmployee}
                  value={selectedEmployee}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.length === 0 ? (
                      <SelectItem disabled value="__none">
                        No available employees
                      </SelectItem>
                    ) : (
                      available.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Role</Label>
                <Select onValueChange={setAssignRole} value={assignRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Optional notes"
                  value={assignNotes}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setAssignOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button
                  disabled={isPending || !selectedEmployee}
                  onClick={handleAssign}
                >
                  {isPending && (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  )}
                  Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assignments table grouped by role */}
      {assignments.length === 0 ? (
        <div className="rounded-[22px] border border-hairline bg-canvas p-6 text-center">
          <p className="text-muted-foreground text-sm">
            No staff assigned yet. Assign the first team member to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Shift Start</TableHead>
                <TableHead>Shift End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const shiftStatus = getShiftStatus(
                  assignment.startTime,
                  assignment.endTime
                );
                const statusCfg =
                  SHIFT_STATUS[shiftStatus] ?? SHIFT_STATUS.no_shift;

                return (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium text-ink">
                      {assignment.employeeName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{assignment.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(assignment.startTime)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(assignment.endTime)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusCfg.variant}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                      {assignment.notes || "\u2014"}
                    </TableCell>
                    <TableCell className="text-right">
                      {deleteTarget === assignment.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            disabled={isPending}
                            onClick={() => handleUnassign(assignment.id)}
                            size="sm"
                            variant="destructive"
                          >
                            {isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Confirm"
                            )}
                          </Button>
                          <Button
                            onClick={() => setDeleteTarget(null)}
                            size="sm"
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setDeleteTarget(assignment.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Available employees pool */}
      {available.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Available employees ({available.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {available.map((emp) => (
              <Badge className="py-1.5 px-3" key={emp.id} variant="outline">
                {emp.name}
                <span className="ml-1.5 text-muted-foreground">
                  ({emp.role})
                </span>
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
