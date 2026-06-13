"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  PencilIcon,
  PlusIcon,
  Sparkles,
  XIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for AI bulk-task endpoints (/api/ai/bulk-tasks, /api/ai/bulk-tasks/confirm) — no generated client for AI operations
import { apiFetch } from "@/app/lib/api";

// --- Types ---

interface GeneratedTask {
  dishId: string | null;
  dishName: string | null;
  dueByOffsetDays: number;
  dueByTime: string;
  estimatedMinutes: number;
  id: string;
  name: string;
  notes: string | null;
  priority: number;
  quantityTotal: number;
  startByOffsetDays: number;
  taskType: string;
}

interface TaskGroup {
  stationName: string;
  stationType: string;
  tasks: GeneratedTask[];
}

interface GenerateResponse {
  eventDate: string;
  eventId: string;
  eventTitle: string;
  generatedAt: string;
  guestCount: number;
  locationId: string;
  model: string;
  taskGroups: TaskGroup[];
  warnings: string[];
}

// --- Helpers ---

const TASK_TYPE_LABELS: Record<string, string> = {
  prep: "Prep",
  setup: "Setup",
  service: "Service",
  "follow-up": "Follow-up",
};

const STATION_TYPE_ICONS: Record<string, string> = {
  "hot-line": "\uD83D\uDD25",
  "cold-prep": "\u2744\uFE0F",
  bakery: "\uD83C\uDF5E",
  garnish: "\uD83E\uDEB4",
  "prep-station": "\uD83E\uDDCA",
  setup: "\uD83D\uDEE0\uFE0F",
  general: "\uD83D\uDCCB",
};

function priorityColor(
  priority: number
): "destructive" | "default" | "secondary" | "outline" {
  if (priority <= 2) {
    return "destructive";
  }
  if (priority <= 5) {
    return "default";
  }
  return "secondary";
}

function offsetLabel(days: number, eventDateStr: string): string {
  const d = new Date(eventDateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// --- Edit Dialog ---

function EditTaskDialog({
  task,
  open,
  onOpenChange,
  onSave,
}: {
  task: GeneratedTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: GeneratedTask) => void;
}) {
  const [name, setName] = useState(task.name);
  const [quantityTotal, setQuantityTotal] = useState(task.quantityTotal);
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    task.estimatedMinutes
  );
  const [priority, setPriority] = useState(task.priority);
  const [dueByTime, setDueByTime] = useState(task.dueByTime);
  const [notes, setNotes] = useState(task.notes ?? "");

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Task name is required");
      return;
    }
    onSave({
      ...task,
      name: name.trim(),
      quantityTotal,
      estimatedMinutes,
      priority,
      dueByTime,
      notes: notes.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Task Name</Label>
            <Input
              id="edit-name"
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-qty">Quantity</Label>
              <Input
                id="edit-qty"
                min={1}
                onChange={(e) =>
                  setQuantityTotal(Number.parseInt(e.target.value, 10) || 1)
                }
                type="number"
                value={quantityTotal}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mins">Est. Minutes</Label>
              <Input
                id="edit-mins"
                min={5}
                onChange={(e) =>
                  setEstimatedMinutes(Number.parseInt(e.target.value, 10) || 30)
                }
                type="number"
                value={estimatedMinutes}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                onValueChange={(v) => setPriority(Number(v))}
                value={String(priority)}
              >
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Urgent</SelectItem>
                  <SelectItem value="3">3 - High</SelectItem>
                  <SelectItem value="5">5 - Normal</SelectItem>
                  <SelectItem value="7">7 - Low</SelectItem>
                  <SelectItem value="10">10 - Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">Due Time</Label>
              <Input
                id="edit-time"
                onChange={(e) => setDueByTime(e.target.value)}
                placeholder="HH:MM"
                value={dueByTime}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Input
              id="edit-notes"
              onChange={(e) => setNotes(e.target.value)}
              value={notes}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Task Card ---

function TaskCard({
  task,
  eventDate,
  selected,
  onToggle,
  onRemove,
  onEdit,
}: {
  task: GeneratedTask;
  eventDate: string;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border p-3 transition-colors ${
        selected ? "border-primary/50 bg-primary/5" : "border-border"
      }`}
    >
      <input
        checked={selected}
        className="h-4 w-4 shrink-0"
        onChange={onToggle}
        type="checkbox"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-sm">{task.name}</p>
          <Badge className="text-xs" variant={priorityColor(task.priority)}>
            P{task.priority}
          </Badge>
          <Badge className="text-xs" variant="outline">
            {TASK_TYPE_LABELS[task.taskType] ?? task.taskType}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
          {task.dishName && <span>{task.dishName}</span>}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {task.estimatedMinutes}m
          </span>
          <span>
            Due: {offsetLabel(task.dueByOffsetDays, eventDate)} {task.dueByTime}
          </span>
          <span>Qty: {task.quantityTotal}</span>
        </div>
        {task.notes && (
          <p className="mt-1 truncate text-muted-foreground text-xs">
            {task.notes}
          </p>
        )}
      </div>
      <Button onClick={onEdit} size="sm" variant="ghost">
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
      <Button onClick={onRemove} size="sm" variant="ghost">
        <XIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// --- Main Component ---

export function BulkTaskGeneratorTab() {
  const [eventId, setEventId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [editedTasks, setEditedTasks] = useState<Map<string, GeneratedTask>>(
    new Map()
  );
  const [editingTask, setEditingTask] = useState<GeneratedTask | null>(null);

  // Flatten all tasks, applying edits and removals
  const allTasks = data?.taskGroups.flatMap((g) => g.tasks) ?? [];
  const effectiveTasks = allTasks
    .filter((t) => !removedIds.has(t.id))
    .map((t) => editedTasks.get(t.id) ?? t);

  const selectedCount = effectiveTasks.filter((t) =>
    selectedIds.has(t.id)
  ).length;

  const handleGenerate = useCallback(async () => {
    const trimmed = eventId.trim();
    if (!trimmed) {
      toast.error("Please enter an event ID");
      return;
    }

    setGenerating(true);
    setError(null);
    setData(null);
    setSelectedIds(new Set());
    setRemovedIds(new Set());
    setEditedTasks(new Map());

    try {
      const res = await apiFetch("/api/ai/bulk-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: trimmed }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { message?: string };
        throw new Error(
          errData.message || `Request failed with status ${res.status}`
        );
      }

      const json = (await res.json()) as GenerateResponse;
      setData(json);

      // Auto-select all tasks
      const allIds = json.taskGroups.flatMap((g) => g.tasks.map((t) => t.id));
      setSelectedIds(new Set(allIds));
      toast.success(
        `Generated ${allIds.length} task${allIds.length === 1 ? "" : "s"}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate tasks";
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }, [eventId]);

  const handleConfirm = useCallback(async () => {
    if (!data || selectedCount === 0) {
      return;
    }

    setConfirming(true);
    try {
      const eventDate = new Date(data.eventDate);
      const tasks = effectiveTasks
        .filter((t) => selectedIds.has(t.id))
        .map((t) => {
          const startDate = new Date(eventDate);
          startDate.setDate(startDate.getDate() + t.startByOffsetDays);
          const dueDate = new Date(eventDate);
          dueDate.setDate(dueDate.getDate() + t.dueByOffsetDays);
          return {
            taskType: t.taskType,
            name: t.name,
            dishId: t.dishId,
            quantityTotal: t.quantityTotal,
            startByDate: startDate.toISOString().split("T")[0],
            dueByDate: dueDate.toISOString().split("T")[0],
            dueByTime: t.dueByTime,
            priority: t.priority,
            estimatedMinutes: t.estimatedMinutes,
            notes: t.notes,
          };
        });

      const res = await apiFetch("/api/ai/bulk-tasks/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: data.eventId, tasks }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { message?: string };
        throw new Error(
          errData.message || `Request failed with status ${res.status}`
        );
      }

      const result = (await res.json()) as {
        createdCount: number;
        skippedCount: number;
      };
      toast.success(
        `Created ${result.createdCount} task${result.createdCount === 1 ? "" : "s"}${result.skippedCount > 0 ? ` (${result.skippedCount} skipped)` : ""}`
      );
      setData(null);
      setEventId("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create tasks"
      );
    } finally {
      setConfirming(false);
    }
  }, [data, effectiveTasks, selectedIds]);

  const toggleTask = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(effectiveTasks.map((t) => t.id)));
  }, [effectiveTasks]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const removeTask = useCallback((id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const saveEdit = useCallback((updated: GeneratedTask) => {
    setEditedTasks((prev) => new Map(prev).set(updated.id, updated));
  }, []);

  // Group effective tasks by station
  const groupedTasks = data
    ? data.taskGroups
        .map((group) => ({
          ...group,
          tasks: group.tasks
            .filter((t) => !removedIds.has(t.id))
            .map((t) => editedTasks.get(t.id) ?? t),
        }))
        .filter((g) => g.tasks.length > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="bulk-event-id">Event ID</Label>
          <Input
            id="bulk-event-id"
            onChange={(e) => setEventId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleGenerate();
              }
            }}
            placeholder="Enter event ID to generate tasks for..."
            value={eventId}
          />
        </div>
        <Button disabled={generating} onClick={handleGenerate}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Tasks
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 p-4 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {generating && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium text-sm">Generating tasks...</p>
              <p className="text-muted-foreground text-xs">
                Analyzing menu, stations, and timing to create task plan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {data?.warnings && data.warnings.length > 0 && (
        <Card className="border-hairline bg-muted/50">
          <CardContent className="p-4">
            {data.warnings.map((w, i) => (
              <div
                className="flex items-center gap-2 text-foreground text-sm"
                key={i}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Generated tasks review */}
      {data && !generating && (
        <>
          {/* Event header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{data.eventTitle}</CardTitle>
                  <CardDescription className="mt-1">
                    {new Date(data.eventDate).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    &middot; {data.guestCount} guests &middot;{" "}
                    {effectiveTasks.length} tasks
                  </CardDescription>
                </div>
                <Badge className="gap-1" variant="outline">
                  <Sparkles className="h-3 w-3" />
                  {data.model}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Bulk actions */}
          <div className="flex items-center gap-2">
            <Button onClick={selectAll} size="sm" variant="outline">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Select All
            </Button>
            <Button onClick={deselectAll} size="sm" variant="outline">
              Deselect All
            </Button>
            <div className="flex-1" />
            <span className="text-muted-foreground text-sm">
              {selectedCount} of {effectiveTasks.length} selected
            </span>
            <Button
              disabled={confirming || selectedCount === 0}
              onClick={handleConfirm}
              size="sm"
            >
              {confirming ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
              )}
              Accept {selectedCount} Task{selectedCount === 1 ? "" : "s"}
            </Button>
          </div>

          {/* Task groups by station */}
          <div className="space-y-4">
            {groupedTasks.map((group) => (
              <Card key={group.stationName}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-medium text-sm">
                    <span>
                      {STATION_TYPE_ICONS[group.stationType] ?? "\uD83D\uDCCB"}
                    </span>
                    {group.stationName}
                    <Badge className="ml-auto text-xs" variant="secondary">
                      {group.tasks.length} task
                      {group.tasks.length === 1 ? "" : "s"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {group.tasks.map((task) => (
                    <TaskCard
                      eventDate={data.eventDate}
                      key={task.id}
                      onEdit={() => setEditingTask(task)}
                      onRemove={() => removeTask(task.id)}
                      onToggle={() => toggleTask(task.id)}
                      selected={selectedIds.has(task.id)}
                      task={task}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Empty initial state */}
      {!(data || generating || error) && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <ListChecks className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-2 font-medium text-sm">No tasks generated yet</p>
            <p className="text-muted-foreground text-sm">
              Enter an event ID and click &quot;Generate Tasks&quot; to create
              an AI-powered task plan.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit dialog */}
      {editingTask && (
        <EditTaskDialog
          onOpenChange={(open) => {
            if (!open) {
              setEditingTask(null);
            }
          }}
          onSave={saveEdit}
          open={!!editingTask}
          task={editingTask}
        />
      )}
    </div>
  );
}
