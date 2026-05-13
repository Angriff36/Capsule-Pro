"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import { DateTimePicker } from "@repo/design-system/components/ui/date-time-picker";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Plus,
  Thermometer,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface QualityCheckItem {
  id: string;
  itemName: string;
  criterion: string;
}

interface QualityCheck {
  id: string;
  checkType: string;
  title: string;
  status: string;
  items: QualityCheckItem[];
  completedAt: string | null;
  scheduledAt: string | null;
}

interface TemperatureLog {
  id: string;
  logType: string;
  temperature: number;
  unit: string;
  withinRange: boolean | null;
  itemName: string | null;
  loggedAt: string;
}

interface CorrectiveAction {
  id: string;
  title: string;
  status: string;
  severity: string;
  dueDate: string | null;
}

// ---------------------------------------------------------------------------
// Lookup maps
// ---------------------------------------------------------------------------

const checkTypeLabels: Record<string, string> = {
  receiving: "Receiving",
  storage: "Storage",
  prep: "Prep",
  cooking: "Cooking",
  cooling: "Cooling",
  holding: "Holding",
  transport: "Transport",
};

const checkStatusBadge: Record<
  string,
  "destructive" | "default" | "secondary" | "outline"
> = {
  pending: "secondary",
  passed: "default",
  failed: "destructive",
  needs_review: "outline",
};

const logTypeLabels: Record<string, string> = {
  cooler: "Cooler",
  freezer: "Freezer",
  hot_hold: "Hot Hold",
  cooking: "Cooking",
  receiving: "Receiving",
  cooling: "Cooling",
};

const severityBadge: Record<
  string,
  "destructive" | "default" | "secondary" | "outline"
> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const actionStatusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  verified: "Verified",
};

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function submitCommand(path: string, body: unknown): Promise<Response> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ??
        `Request failed (${res.status})`
    );
  }
  return res;
}

// ---------------------------------------------------------------------------
// 1. Create Quality Check Dialog
// ---------------------------------------------------------------------------

const CHECK_TYPES = [
  { value: "receiving", label: "Receiving" },
  { value: "storage", label: "Storage" },
  { value: "prep", label: "Prep" },
  { value: "cooking", label: "Cooking" },
  { value: "cooling", label: "Cooling" },
  { value: "holding", label: "Holding" },
  { value: "transport", label: "Transport" },
] as const;

export function CreateCheckDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkType, setCheckType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [checklistItems, setChecklistItems] = useState<
    { name: string; criterion: string }[]
  >([]);

  const resetForm = useCallback(() => {
    setCheckType("");
    setTitle("");
    setDescription("");
    setScheduledAt("");
    setAssignedTo("");
    setChecklistItems([]);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!(checkType && title.trim())) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, unknown> = {
          checkType,
          title: title.trim(),
        };
        if (description.trim()) {
          body.description = description.trim();
        }
        if (scheduledAt) {
          body.scheduledAt = scheduledAt;
        }
        if (assignedTo.trim()) {
          body.assignedTo = assignedTo.trim();
        }
        const filtered = checklistItems.filter(
          (item) => item.name.trim() || item.criterion.trim()
        );
        if (filtered.length > 0) {
          body.checklistItems = filtered;
        }
        await submitCommand(
          "/api/manifest/QACheck/commands/create",
          body
        );
        toast.success("Quality check created");
        setOpen(false);
        resetForm();
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create check");
      } finally {
        setLoading(false);
      }
    },
    [
      checkType,
      title,
      description,
      scheduledAt,
      assignedTo,
      checklistItems,
      onSuccess,
      resetForm,
    ]
  );

  return (
    <Dialog
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          resetForm();
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Check
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quality Check</DialogTitle>
          <DialogDescription>
            Schedule a new quality check for HACCP compliance.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="qc-checkType">Check Type *</Label>
            <Select onValueChange={setCheckType} value={checkType}>
              <SelectTrigger id="qc-checkType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CHECK_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-title">Title *</Label>
            <Input
              id="qc-title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning receiving inspection"
              required
              value={title}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-desc">Description</Label>
            <Textarea
              id="qc-desc"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              value={description}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-scheduled">Scheduled At</Label>
            <DateTimePicker
              id="qc-scheduled"
              onChange={(e) => setScheduledAt(e.target.value)}
 
              value={scheduledAt}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-assigned">Assigned To</Label>
            <Input
              id="qc-assigned"
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Employee name or ID"
              value={assignedTo}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Checklist Items</Label>
              <Button
                onClick={() =>
                  setChecklistItems((prev) => [
                    ...prev,
                    { name: "", criterion: "" },
                  ])
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            </div>
            {checklistItems.length > 0 && (
              <div className="space-y-2">
                {checklistItems.map((item, i) => (
                  <div
                    className="flex gap-2 items-start"
                    key={`cl-${String(i)}`}
                  >
                    <Input
                      className="flex-1"
                      onChange={(e) =>
                        setChecklistItems((prev) =>
                          prev.map((ci, idx) =>
                            idx === i ? { ...ci, name: e.target.value } : ci
                          )
                        )
                      }
                      placeholder="Item name"
                      value={item.name}
                    />
                    <Input
                      className="flex-1"
                      onChange={(e) =>
                        setChecklistItems((prev) =>
                          prev.map((ci, idx) =>
                            idx === i
                              ? { ...ci, criterion: e.target.value }
                              : ci
                          )
                        )
                      }
                      placeholder="Criterion"
                      value={item.criterion}
                    />
                    <Button
                      onClick={() =>
                        setChecklistItems((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              disabled={loading || !checkType || !title.trim()}
              type="submit"
            >
              {loading ? "Creating..." : "Create Check"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 2. Complete Quality Check Dialog
// ---------------------------------------------------------------------------

const CHECK_STATUSES = [
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
] as const;

export function CompleteCheckDialog({
  checkId,
  checklistItems,
  onSuccess,
}: {
  checkId: string;
  checklistItems: QualityCheckItem[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [itemResults, setItemResults] = useState<
    Record<string, { passed: boolean; value: string; notes: string }>
  >({});

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!status) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, unknown> = { checkId, status };
        if (notes.trim()) {
          body.notes = notes.trim();
        }
        const results = Object.entries(itemResults)
          .filter(([, r]) => r.passed || r.value || r.notes)
          .map(([itemId, r]) => ({
            itemId,
            passed: r.passed,
            ...(r.value ? { value: r.value } : {}),
            ...(r.notes ? { notes: r.notes } : {}),
          }));
        if (results.length > 0) {
          body.itemResults = results;
        }
        await submitCommand(
          "/api/manifest/QACheck/commands/complete",
          body
        );
        toast.success("Check completed");
        setOpen(false);
        onSuccess();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to complete check"
        );
      } finally {
        setLoading(false);
      }
    },
    [checkId, status, notes, itemResults, onSuccess]
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Complete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Quality Check</DialogTitle>
          <DialogDescription>
            Record results for this quality check.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {CHECK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc-notes">Notes</Label>
            <Textarea
              id="cc-notes"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              rows={2}
              value={notes}
            />
          </div>

          {checklistItems.length > 0 && (
            <div className="space-y-2">
              <Label>Checklist Results</Label>
              {checklistItems.map((item) => (
                <div className="border rounded-md p-3 space-y-2" key={item.id}>
                  <div className="font-medium text-sm">{item.itemName}</div>
                  {item.criterion && (
                    <div className="text-xs text-muted-foreground">
                      Criterion: {item.criterion}
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        checked={itemResults[item.id]?.passed ?? false}
                        onChange={(e) =>
                          setItemResults((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              passed: e.target.checked,
                            },
                          }))
                        }
                        type="checkbox"
                      />
                      Passed
                    </label>
                    <Input
                      className="flex-1 h-8 text-sm"
                      onChange={(e) =>
                        setItemResults((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            value: e.target.value,
                          },
                        }))
                      }
                      placeholder="Value"
                      value={itemResults[item.id]?.value ?? ""}
                    />
                    <Input
                      className="flex-1 h-8 text-sm"
                      onChange={(e) =>
                        setItemResults((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            notes: e.target.value,
                          },
                        }))
                      }
                      placeholder="Notes"
                      value={itemResults[item.id]?.notes ?? ""}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button disabled={loading || !status} type="submit">
              {loading ? "Submitting..." : "Complete Check"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 3. Log Temperature Dialog
// ---------------------------------------------------------------------------

const LOG_TYPES = [
  { value: "cooler", label: "Cooler" },
  { value: "freezer", label: "Freezer" },
  { value: "hot_hold", label: "Hot Hold" },
  { value: "cooking", label: "Cooking" },
  { value: "receiving", label: "Receiving" },
  { value: "cooling", label: "Cooling" },
] as const;

const TEMP_UNITS = [
  { value: "F", label: "Fahrenheit" },
  { value: "C", label: "Celsius" },
] as const;

export function LogTemperatureDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logType, setLogType] = useState("");
  const [temperature, setTemperature] = useState("");
  const [unit, setUnit] = useState("F");
  const [itemName, setItemName] = useState("");
  const [targetTemp, setTargetTemp] = useState("");
  const [withinRange, setWithinRange] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = useCallback(() => {
    setLogType("");
    setTemperature("");
    setUnit("F");
    setItemName("");
    setTargetTemp("");
    setWithinRange("");
    setNotes("");
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!(logType && temperature)) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, unknown> = {
          logType,
          temperature: Number.parseFloat(temperature),
          unit,
        };
        if (itemName.trim()) {
          body.itemName = itemName.trim();
        }
        if (targetTemp) {
          body.targetTemp = Number.parseFloat(targetTemp);
        }
        if (withinRange) {
          body.withinRange = withinRange === "true";
        }
        if (notes.trim()) {
          body.notes = notes.trim();
        }
        await submitCommand(
          "/api/manifest/QATemperatureLog/commands/log",
          body
        );
        toast.success("Temperature logged");
        setOpen(false);
        resetForm();
        onSuccess();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to log temperature"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      logType,
      temperature,
      unit,
      itemName,
      targetTemp,
      withinRange,
      notes,
      onSuccess,
      resetForm,
    ]
  );

  return (
    <Dialog
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          resetForm();
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Thermometer className="h-4 w-4 mr-1" />
          Log Temperature
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Temperature</DialogTitle>
          <DialogDescription>
            Record a temperature reading for food safety compliance.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Log Type *</Label>
            <Select onValueChange={setLogType} value={logType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {LOG_TYPES.map((lt) => (
                  <SelectItem key={lt.value} value={lt.value}>
                    {lt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lt-temp">Temperature *</Label>
              <Input
                id="lt-temp"
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g., 36.5"
                required
                step="0.1"
                type="number"
                value={temperature}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select onValueChange={setUnit} value={unit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMP_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lt-item">Item Name</Label>
            <Input
              id="lt-item"
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Chicken breast"
              value={itemName}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lt-target">Target Temp</Label>
              <Input
                id="lt-target"
                onChange={(e) => setTargetTemp(e.target.value)}
                placeholder="e.g., 40"
                step="0.1"
                type="number"
                value={targetTemp}
              />
            </div>
            <div className="space-y-2">
              <Label>Within Range</Label>
              <Select onValueChange={setWithinRange} value={withinRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lt-notes">Notes</Label>
            <Textarea
              id="lt-notes"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
              value={notes}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              disabled={loading || !logType || !temperature}
              type="submit"
            >
              {loading ? "Logging..." : "Log Temperature"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 4. Create Corrective Action Dialog
// ---------------------------------------------------------------------------

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export function CreateCorrectiveActionDialog({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [preventiveAction, setPreventiveAction] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

  const resetForm = useCallback(() => {
    setTitle("");
    setSeverity("medium");
    setDescription("");
    setRootCause("");
    setImmediateAction("");
    setPreventiveAction("");
    setAssignedTo("");
    setDueDate("");
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, unknown> = {
          title: title.trim(),
          severity,
        };
        if (description.trim()) {
          body.description = description.trim();
        }
        if (rootCause.trim()) {
          body.rootCause = rootCause.trim();
        }
        if (immediateAction.trim()) {
          body.immediateAction = immediateAction.trim();
        }
        if (preventiveAction.trim()) {
          body.preventiveAction = preventiveAction.trim();
        }
        if (assignedTo.trim()) {
          body.assignedTo = assignedTo.trim();
        }
        if (dueDate) {
          body.dueDate = dueDate;
        }
        await submitCommand(
          "/api/manifest/QACorrectiveAction/commands/create",
          body
        );
        toast.success("Corrective action created");
        setOpen(false);
        resetForm();
        onSuccess();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create corrective action"
        );
      } finally {
        setLoading(false);
      }
    },
    [
      title,
      severity,
      description,
      rootCause,
      immediateAction,
      preventiveAction,
      assignedTo,
      dueDate,
      onSuccess,
      resetForm,
    ]
  );

  return (
    <Dialog
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          resetForm();
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Action
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Corrective Action</DialogTitle>
          <DialogDescription>
            Document a corrective action for a food safety issue.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="ca-title">Title *</Label>
            <Input
              id="ca-title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cooler temperature above threshold"
              required
              value={title}
            />
          </div>

          <div className="space-y-2">
            <Label>Severity</Label>
            <Select onValueChange={setSeverity} value={severity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ca-desc">Description</Label>
            <Textarea
              id="ca-desc"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened"
              rows={2}
              value={description}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ca-root">Root Cause</Label>
            <Input
              id="ca-root"
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Why did this occur"
              value={rootCause}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ca-immediate">Immediate Action</Label>
            <Textarea
              id="ca-immediate"
              onChange={(e) => setImmediateAction(e.target.value)}
              placeholder="What was done immediately"
              rows={2}
              value={immediateAction}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ca-preventive">Preventive Action</Label>
            <Textarea
              id="ca-preventive"
              onChange={(e) => setPreventiveAction(e.target.value)}
              placeholder="How to prevent recurrence"
              rows={2}
              value={preventiveAction}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ca-assigned">Assigned To</Label>
              <Input
                id="ca-assigned"
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Employee name or ID"
                value={assignedTo}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ca-due">Due Date</Label>
              <DatePicker
                id="ca-due"
                onChange={(e) => setDueDate(e.target.value)}
 
                value={dueDate}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button disabled={loading || !title.trim()} type="submit">
              {loading ? "Creating..." : "Create Action"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 5. Resolve Corrective Action Dialog
// ---------------------------------------------------------------------------

const RESOLVE_STATUSES = [
  { value: "resolved", label: "Resolved" },
  { value: "verified", label: "Verified" },
] as const;

export function ResolveActionDialog({
  actionId,
  onSuccess,
}: {
  actionId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("");

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!status) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, unknown> = { actionId, status };
        if (resolutionNotes.trim()) {
          body.resolutionNotes = resolutionNotes.trim();
        }
        if (status === "verified" && verificationMethod.trim()) {
          body.verificationMethod = verificationMethod.trim();
        }
        await submitCommand(
          "/api/manifest/QACorrectiveAction/commands/resolve",
          body
        );
        toast.success("Action resolved");
        setOpen(false);
        onSuccess();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to resolve action"
        );
      } finally {
        setLoading(false);
      }
    },
    [actionId, status, resolutionNotes, verificationMethod, onSuccess]
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Resolve
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Corrective Action</DialogTitle>
          <DialogDescription>
            Mark this corrective action as resolved or verified.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {RESOLVE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ra-notes">Resolution Notes</Label>
            <Textarea
              id="ra-notes"
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe the resolution"
              rows={3}
              value={resolutionNotes}
            />
          </div>

          {status === "verified" && (
            <div className="space-y-2">
              <Label htmlFor="ra-method">Verification Method</Label>
              <Input
                id="ra-method"
                onChange={(e) => setVerificationMethod(e.target.value)}
                placeholder="e.g., Re-check temperature reading"
                value={verificationMethod}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button disabled={loading || !status} type="submit">
              {loading ? "Submitting..." : "Resolve Action"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tab panel client components
// ---------------------------------------------------------------------------

function useRefresh() {
  const router = useRouter();
  return useCallback(() => router.refresh(), [router]);
}

/** Checks tab content with "New Check" button and per-check "Complete" buttons. */
export function ChecksTabContent({
  qualityChecks,
}: {
  qualityChecks: QualityCheck[];
}) {
  const refresh = useRefresh();

  const checkTypeCounts = new Map<string, { total: number; pending: number }>();
  for (const ct of Object.keys(checkTypeLabels)) {
    checkTypeCounts.set(ct, { total: 0, pending: 0 });
  }
  for (const qc of qualityChecks) {
    const entry = checkTypeCounts.get(qc.checkType) ?? { total: 0, pending: 0 };
    entry.total++;
    if (qc.status === "pending") {
      entry.pending++;
    }
    checkTypeCounts.set(qc.checkType, entry);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateCheckDialog onSuccess={refresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(checkTypeLabels).map(([type, label]) => {
          const counts = checkTypeCounts.get(type) ?? {
            total: 0,
            pending: 0,
          };
          return (
            <Card
              className="hover:border-primary/50 transition-colors"
              key={type}
              tone="soft-stone"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {counts.total} total checks
                </p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="outline">{counts.pending} pending</Badge>
                  <Badge variant="secondary">{counts.total} total</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {qualityChecks.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">
            Recent Checks
          </h3>
          {qualityChecks.slice(0, 10).map((qc) => (
            <Card key={qc.id} tone="canvas">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {qc.status === "passed" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : qc.status === "failed" ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    {qc.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={checkStatusBadge[qc.status] ?? "outline"}>
                      {qc.status.replace("_", " ")}
                    </Badge>
                    {qc.status === "pending" && (
                      <CompleteCheckDialog
                        checkId={qc.id}
                        checklistItems={qc.items}
                        onSuccess={refresh}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    Type: {checkTypeLabels[qc.checkType] ?? qc.checkType}
                  </span>
                  <span>Items: {qc.items.length}</span>
                  {qc.completedAt && (
                    <span>
                      Completed:{" "}
                      {new Date(qc.completedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {!qc.completedAt && qc.scheduledAt && (
                    <span>
                      Scheduled:{" "}
                      {new Date(qc.scheduledAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">
          No quality checks recorded yet.
        </p>
      )}
    </div>
  );
}

/** Temperature tab content with "Log Temperature" button. */
export function TemperatureTabContent({
  temperatureLogs,
}: {
  temperatureLogs: TemperatureLog[];
}) {
  const refresh = useRefresh();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <LogTemperatureDialog onSuccess={refresh} />
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Object.entries(logTypeLabels).map(([type, label]) => {
          const count = temperatureLogs.filter(
            (tl) => tl.logType === type
          ).length;
          return (
            <Card key={type} tone="soft-stone">
              <CardContent className="pt-4">
                <div className="font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">
                  {count} {count === 1 ? "log" : "logs"}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {temperatureLogs.length > 0 ? (
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Recent Temperature Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {temperatureLogs.map((log) => (
                <div
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  key={log.id}
                >
                  <div className="flex items-center gap-3">
                    <Thermometer
                      className={`h-4 w-4 ${
                        log.withinRange === false
                          ? "text-red-500"
                          : log.withinRange === true
                            ? "text-green-500"
                            : "text-yellow-500"
                      }`}
                    />
                    <span className="font-medium capitalize">
                      {logTypeLabels[log.logType] ??
                        log.logType.replace("_", " ")}
                    </span>
                    {log.itemName && (
                      <span className="text-sm text-muted-foreground">
                        {log.itemName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono">
                      {Number(log.temperature)}&deg;{log.unit}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.loggedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {log.withinRange === false ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground py-4">
          No temperature logs recorded yet.
        </p>
      )}
    </div>
  );
}

/** Corrective actions tab content with "New Action" and per-action "Resolve" buttons. */
export function CorrectiveActionsTabContent({
  correctiveActions,
}: {
  correctiveActions: CorrectiveAction[];
}) {
  const refresh = useRefresh();

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const ca of correctiveActions) {
    if (ca.severity in severityCounts) {
      severityCounts[ca.severity as keyof typeof severityCounts]++;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateCorrectiveActionDialog onSuccess={refresh} />
      </div>

      <div className="flex gap-2">
        {severityCounts.critical > 0 && (
          <Badge variant="destructive">
            {severityCounts.critical} Critical
          </Badge>
        )}
        {severityCounts.high > 0 && (
          <Badge variant="destructive">{severityCounts.high} High</Badge>
        )}
        {severityCounts.medium > 0 && (
          <Badge variant="secondary">{severityCounts.medium} Medium</Badge>
        )}
        {severityCounts.low > 0 && (
          <Badge variant="outline">{severityCounts.low} Low</Badge>
        )}
        {correctiveActions.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No corrective actions
          </span>
        )}
      </div>

      {correctiveActions.length > 0 ? (
        <div className="space-y-3">
          {correctiveActions.map((action) => (
            <Card key={action.id} tone="canvas">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {action.status === "open" ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : action.status === "in_progress" ? (
                        <Clock className="h-4 w-4 text-blue-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-medium">{action.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {action.dueDate && (
                        <span>
                          Due:{" "}
                          {new Date(action.dueDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>
                      )}
                      <span>
                        Status:{" "}
                        {actionStatusLabel[action.status] ?? action.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={severityBadge[action.severity] ?? "outline"}
                    >
                      {action.severity}
                    </Badge>
                    {action.status === "open" && (
                      <ResolveActionDialog
                        actionId={action.id}
                        onSuccess={refresh}
                      />
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/kitchen/quality-assurance/${action.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">
          No corrective actions recorded yet.
        </p>
      )}
    </div>
  );
}
