"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  facilityScheduleEdit,
  facilityScheduleRemove,
} from "@/app/lib/manifest-client.generated";
import {
  completeSchedule,
  createPMSchedule,
  getFacilityAssets,
  getSchedules,
} from "../actions";
import { FacilitiesNavigation } from "../components/facilities-navigation";
import { OperationalPageShell } from "../../../components/operational-page-shell";

interface Schedule {
  areaId: string | null;
  assignedTo: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  description: string | null;
  equipmentId: string | null;
  estimatedCost: { toNumber(): number } | null;
  estimatedHours: { toNumber(): number } | null;
  frequency: string;
  id: string;
  intervalDays: number;
  lastCompletedAt: Date | null;
  nextDueAt: Date;
  scheduleNumber: string;
  status: string;
  tenantId: string;
  title: string;
  updatedAt: Date;
}

interface Asset {
  assetType: string;
  id: string;
  name: string;
  status: string;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [view, setView] = useState<"cards" | "calendar">("cards");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    frequency: "monthly",
    nextDueDate: "",
    estimatedHours: "",
    estimatedCost: "",
    equipmentId: "__none__",
  });

  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    setLoading(true);
    try {
      const [schedulesData, assetsData] = await Promise.all([
        getSchedules(),
        getFacilityAssets(),
      ]);
      setSchedules(schedulesData || []);
      setAssets(assetsData || []);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleComplete = async (scheduleId: string) => {
    setCompleting(scheduleId);
    try {
      await completeSchedule(scheduleId);
      await loadData();
    } catch (error) {
      console.error("Failed to complete schedule:", error);
    } finally {
      setCompleting(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      frequency: "monthly",
      nextDueDate: "",
      estimatedHours: "",
      estimatedCost: "",
      equipmentId: "__none__",
    });
    setShowDialog(true);
  };

  const openEdit = (schedule: Schedule) => {
    setEditing(schedule);
    setForm({
      title: schedule.title,
      description: schedule.description || "",
      frequency: schedule.frequency,
      nextDueDate: new Date(schedule.nextDueAt).toISOString().slice(0, 10),
      estimatedHours: schedule.estimatedHours
        ? schedule.estimatedHours.toNumber().toString()
        : "",
      estimatedCost: schedule.estimatedCost
        ? schedule.estimatedCost.toNumber().toString()
        : "",
      equipmentId: schedule.equipmentId || "__none__",
    });
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await facilityScheduleEdit({
          id: editing.id,
          title: form.title,
          description: form.description || undefined,
        });
        await loadData();
        setShowDialog(false);
      } else {
        await createPMSchedule({
          title: form.title,
          description: form.description || undefined,
          frequency: form.frequency,
          nextDueAt: form.nextDueDate || new Date().toISOString().slice(0, 10),
          estimatedHours: form.estimatedHours
            ? Number.parseFloat(form.estimatedHours)
            : undefined,
          estimatedCost: form.estimatedCost
            ? Number.parseFloat(form.estimatedCost)
            : undefined,
          equipmentId:
            form.equipmentId === "__none__"
              ? undefined
              : form.equipmentId || undefined,
        });
        await loadData();
        setShowDialog(false);
      }
    } catch (error) {
      console.error("Failed to save schedule:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    setDeleting(scheduleId);
    try {
      await facilityScheduleRemove({ id: scheduleId });
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    } finally {
      setDeleting(null);
    }
  };

  const confirmDelete = (schedule: Schedule) => {
    setScheduleToDelete({ id: schedule.id, title: schedule.title });
    setDeleteDialogOpen(true);
  };

  const frequencyColors: Record<string, string> = {
    daily: "bg-muted/50 text-foreground",
    weekly: "bg-muted/50 text-foreground",
    biweekly: "bg-muted/50 text-foreground",
    monthly: "bg-muted/50 text-foreground",
    quarterly: "bg-muted/50 text-foreground",
    semiannual: "bg-muted/50 text-foreground",
    annual: "bg-muted/50 text-foreground",
  };

  const now = new Date();
  const overdueCount = schedules.filter(
    (s) => new Date(s.nextDueAt) < now
  ).length;

  // Calendar logic
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const getSchedulesForDay = (day: Date) =>
    schedules.filter((s) => isSameDay(new Date(s.nextDueAt), day));

  const selectedDaySchedules = selectedDate
    ? getSchedulesForDay(selectedDate)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FacilitiesNavigation />

      <OperationalPageShell
        actions={
          <>
            <Tabs
              onValueChange={(v) => setView(v as "cards" | "calendar")}
              value={view}
            >
              <TabsList>
                <TabsTrigger value="cards">
                  <LayoutGrid className="mr-1 h-4 w-4" />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="calendar">
                  <Calendar className="mr-1 h-4 w-4" />
                  Calendar
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </>
        }
        description="Preventive maintenance scheduling and tracking."
        eyebrow="Facilities / Schedules"
        title="PM schedules"
      >

        <div className="flex gap-2">
          {overdueCount > 0 && (
            <Badge variant="destructive">{overdueCount} Overdue</Badge>
          )}
          <Badge variant="secondary">{schedules.length} Schedules</Badge>
        </div>

        {view === "calendar" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            {/* Calendar Grid */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() =>
                        setCurrentMonth(subMonths(currentMonth, 1))
                      }
                      size="icon"
                      variant="ghost"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <Button
                      onClick={() =>
                        setCurrentMonth(addMonths(currentMonth, 1))
                      }
                      size="icon"
                      variant="ghost"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => setCurrentMonth(new Date())}
                    size="sm"
                    variant="outline"
                  >
                    Today
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="mb-2 grid grid-cols-7 gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        className="py-2 text-center font-medium text-muted-foreground text-xs"
                        key={day}
                      >
                        {day}
                      </div>
                    )
                  )}
                </div>
                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const daySchedules = getSchedulesForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isCurrentDay = isToday(day);
                    const isSelected =
                      selectedDate && isSameDay(day, selectedDate);
                    const hasOverdue = daySchedules.some(
                      (s) => new Date(s.nextDueAt) < now
                    );

                    return (
                      <button
                        className={`min-h-[80px] rounded-lg border p-1 text-left transition-colors ${isCurrentMonth ? "bg-white" : "bg-muted/20 text-muted-foreground"}
                          ${isCurrentDay ? "ring-2 ring-primary" : "border-hairline"}
                          ${isSelected ? "border-primary bg-primary/10" : ""}hover:border-hairline`}
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div
                          className={`mb-1 font-medium text-sm ${isCurrentDay ? "text-primary" : ""}`}
                        >
                          {format(day, "d")}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {daySchedules.slice(0, 2).map((s) => (
                            <div
                              className={`truncate rounded px-1 py-0.5 text-[10px] ${
                                hasOverdue
                                  ? "bg-red-100 text-red-700"
                                  : "bg-muted/50 text-foreground"
                              }`}
                              key={s.id}
                              title={s.title}
                            >
                              {s.title}
                            </div>
                          ))}
                          {daySchedules.length > 2 && (
                            <div className="pl-1 text-[10px] text-muted-foreground">
                              +{daySchedules.length - 2} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected Day Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {selectedDate
                    ? format(selectedDate, "EEEE, MMMM d")
                    : "Select a day"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate && selectedDaySchedules.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No schedules due this day.
                  </p>
                ) : selectedDate ? (
                  <div className="space-y-2">
                    {selectedDaySchedules.map((s) => {
                      const isOverdue = new Date(s.nextDueAt) < now;
                      return (
                        <div
                          className={`rounded border p-2 ${isOverdue ? "border-red-300 bg-red-50" : "border-hairline"}`}
                          key={s.id}
                        >
                          <div className="font-medium text-sm">{s.title}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              className={
                                frequencyColors[s.frequency] || "bg-muted/20"
                              }
                            >
                              {s.frequency}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive">Overdue</Badge>
                            )}
                          </div>
                          <Button
                            className="mt-2 w-full"
                            disabled={completing === s.id}
                            onClick={() => handleComplete(s.id)}
                            size="sm"
                          >
                            {completing === s.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : null}
                            Complete
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Click a day to see schedules.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : /* Cards View */
        schedules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No preventive maintenance schedules found. Create one to get
              started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schedules.map((schedule) => {
              const isOverdue = new Date(schedule.nextDueAt) < now;
              const linkedAsset = schedule.equipmentId
                ? assets.find((a) => a.id === schedule.equipmentId)
                : null;
              return (
                <Card
                  className={isOverdue ? "border-red-300" : ""}
                  key={schedule.id}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {schedule.title}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        {isOverdue && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <Button
                          onClick={() => openEdit(schedule)}
                          size="sm"
                          variant="ghost"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          className="text-red-500 hover:text-red-700"
                          disabled={deleting === schedule.id}
                          onClick={() => confirmDelete(schedule)}
                          size="sm"
                          variant="ghost"
                        >
                          {deleting === schedule.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="font-mono text-muted-foreground text-xs">
                      {schedule.scheduleNumber}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          Frequency
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs ${frequencyColors[schedule.frequency] || "bg-muted/20"}`}
                        >
                          {schedule.frequency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          Next Due
                        </span>
                        <span
                          className={`text-sm ${isOverdue ? "font-medium text-red-600" : ""}`}
                        >
                          {new Date(schedule.nextDueAt).toLocaleDateString()}
                        </span>
                      </div>
                      {linkedAsset && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-sm">
                            Equipment
                          </span>
                          <span className="flex items-center gap-1 text-sm">
                            <Wrench className="h-3 w-3" /> {linkedAsset.name}
                          </span>
                        </div>
                      )}
                      {schedule.estimatedHours && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-sm">
                            Est. Hours
                          </span>
                          <span className="text-sm">
                            {schedule.estimatedHours?.toNumber()}h
                          </span>
                        </div>
                      )}
                      {schedule.estimatedCost && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-sm">
                            Est. Cost
                          </span>
                          <span className="text-sm">
                            ${schedule.estimatedCost?.toNumber().toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <Button
                        className="w-full"
                        disabled={completing === schedule.id}
                        onClick={() => handleComplete(schedule.id)}
                        size="sm"
                      >
                        {completing === schedule.id ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : null}
                        Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </OperationalPageShell>

        {/* Create/Edit Schedule Dialog */}
        <Dialog onOpenChange={setShowDialog} open={showDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit PM Schedule" : "Create PM Schedule"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update schedule information."
                  : "Add a new preventive maintenance schedule."}
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSave}>
              <div className="space-y-2">
                <Label htmlFor="pmTitle">Title *</Label>
                <Input
                  id="pmTitle"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g., HVAC Filter Replacement"
                  required
                  value={form.title}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe the maintenance task..."
                  rows={2}
                  value={form.description}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, frequency: v }))
                    }
                    value={form.frequency}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semiannual">Semi-annual</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Next Due Date</Label>
                  <DatePicker
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        nextDueDate: e.target.value,
                      }))
                    }
                    value={form.nextDueDate}
                  />
                </div>
              </div>
              {!editing && (
                <div className="space-y-2">
                  <Label>Linked Equipment</Label>
                  <Select
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, equipmentId: v }))
                    }
                    value={form.equipmentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Est. Hours</Label>
                  <Input
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        estimatedHours: e.target.value,
                      }))
                    }
                    placeholder="0"
                    step="0.5"
                    type="number"
                    value={form.estimatedHours}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Est. Cost</Label>
                  <Input
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        estimatedCost: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={form.estimatedCost}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setShowDialog(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={!form.title.trim() || saving} type="submit">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Update" : "Create"} Schedule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setScheduleToDelete(null);
            }
          }}
          open={deleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {scheduleToDelete?.title || "this schedule"}
                </span>
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={deleting === scheduleToDelete?.id}
                onClick={() => {
                  if (scheduleToDelete) {
                    handleDelete(scheduleToDelete.id);
                  }
                }}
              >
                {deleting === scheduleToDelete?.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
