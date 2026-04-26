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
  Plus,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { FacilitiesNavigation } from "../components/facilities-navigation";

interface Schedule {
  id: string;
  schedule_number: string;
  area_id: string | null;
  equipment_id: string | null;
  title: string;
  description: string | null;
  frequency: string;
  interval_days: number;
  last_completed_at: string | null;
  next_due_at: string;
  assigned_to: string | null;
  estimated_hours: number | null;
  estimated_cost: number | null;
  status: string;
  created_at: string;
}

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  status: string;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"cards" | "calendar">("cards");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    frequency: "monthly",
    nextDueDate: "",
    estimatedHours: "",
    estimatedCost: "",
    equipmentId: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedulesRes, assetsRes] = await Promise.all([
        apiFetch("/api/facilities/schedules/list?status=all"),
        apiFetch("/api/facilities/assets/list?status=active"),
      ]);
      const schedulesData = await schedulesRes.json();
      const assetsData = await assetsRes.json();
      if (schedulesData.success)
        setSchedules(schedulesData.data.schedules || []);
      if (assetsData.success) setAssets(assetsData.data.assets || []);
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (scheduleId: string) => {
    setCompleting(scheduleId);
    try {
      const res = await apiFetch(
        "/api/facilities/schedules/commands/complete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleId }),
        }
      );
      const data = await res.json();
      if (data.success) await loadData();
    } catch (error) {
      console.error("Failed to complete schedule:", error);
    } finally {
      setCompleting(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/facilities/schedules/commands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description || null,
          frequency: createForm.frequency,
          nextDueDate: createForm.nextDueDate || undefined,
          estimatedHours: createForm.estimatedHours
            ? Number.parseFloat(createForm.estimatedHours)
            : undefined,
          estimatedCost: createForm.estimatedCost
            ? Number.parseFloat(createForm.estimatedCost)
            : undefined,
          equipmentId: createForm.equipmentId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        setShowCreateDialog(false);
        setCreateForm({
          title: "",
          description: "",
          frequency: "monthly",
          nextDueDate: "",
          estimatedHours: "",
          estimatedCost: "",
          equipmentId: "",
        });
      }
    } catch (error) {
      console.error("Failed to create schedule:", error);
    } finally {
      setCreating(false);
    }
  };

  const frequencyColors: Record<string, string> = {
    daily: "bg-blue-100 text-blue-800",
    weekly: "bg-cyan-100 text-cyan-800",
    biweekly: "bg-teal-100 text-teal-800",
    monthly: "bg-green-100 text-green-800",
    quarterly: "bg-yellow-100 text-yellow-800",
    semiannual: "bg-orange-100 text-orange-800",
    annual: "bg-purple-100 text-purple-800",
  };

  const now = new Date();
  const overdueCount = schedules.filter(
    (s) => new Date(s.next_due_at) < now
  ).length;

  // Calendar logic
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const getSchedulesForDay = (day: Date) => {
    return schedules.filter((s) => isSameDay(new Date(s.next_due_at), day));
  };

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

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold tracking-tight">PM Schedules</h1>
            <p className="text-muted-foreground">
              Preventive maintenance scheduling and tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs
              onValueChange={(v) => setView(v as "cards" | "calendar")}
              value={view}
            >
              <TabsList>
                <TabsTrigger value="cards">
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="calendar">
                  <Calendar className="h-4 w-4 mr-1" />
                  Calendar
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </div>
        </div>

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
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        className="text-center text-xs font-medium text-muted-foreground py-2"
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
                      (s) => new Date(s.next_due_at) < now
                    );

                    return (
                      <button
                        className={`
                          min-h-[80px] p-1 rounded-lg border text-left transition-colors
                          ${isCurrentMonth ? "bg-white" : "bg-gray-50 text-muted-foreground"}
                          ${isCurrentDay ? "ring-2 ring-primary" : "border-gray-200"}
                          ${isSelected ? "bg-primary/10 border-primary" : ""}
                          hover:border-gray-300
                        `}
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div
                          className={`text-sm font-medium mb-1 ${isCurrentDay ? "text-primary" : ""}`}
                        >
                          {format(day, "d")}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {daySchedules.slice(0, 2).map((s) => (
                            <div
                              className={`text-[10px] px-1 py-0.5 rounded truncate ${
                                hasOverdue
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                              key={s.id}
                              title={s.title}
                            >
                              {s.title}
                            </div>
                          ))}
                          {daySchedules.length > 2 && (
                            <div className="text-[10px] text-muted-foreground pl-1">
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
                  <p className="text-sm text-muted-foreground">
                    No schedules due this day.
                  </p>
                ) : selectedDate ? (
                  <div className="space-y-2">
                    {selectedDaySchedules.map((s) => {
                      const isOverdue = new Date(s.next_due_at) < now;
                      return (
                        <div
                          className={`p-2 rounded border ${isOverdue ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                          key={s.id}
                        >
                          <div className="font-medium text-sm">{s.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              className={
                                frequencyColors[s.frequency] || "bg-gray-100"
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
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            Complete
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
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
              const isOverdue = new Date(schedule.next_due_at) < now;
              const linkedAsset = schedule.equipment_id
                ? assets.find((a) => a.id === schedule.equipment_id)
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
                      {isOverdue && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {schedule.schedule_number}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Frequency
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${frequencyColors[schedule.frequency] || "bg-gray-100"}`}
                        >
                          {schedule.frequency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Next Due
                        </span>
                        <span
                          className={`text-sm ${isOverdue ? "text-red-600 font-medium" : ""}`}
                        >
                          {new Date(schedule.next_due_at).toLocaleDateString()}
                        </span>
                      </div>
                      {linkedAsset && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Equipment
                          </span>
                          <span className="text-sm flex items-center gap-1">
                            <Wrench className="h-3 w-3" /> {linkedAsset.name}
                          </span>
                        </div>
                      )}
                      {schedule.estimated_hours && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Est. Hours
                          </span>
                          <span className="text-sm">
                            {schedule.estimated_hours}h
                          </span>
                        </div>
                      )}
                      {schedule.estimated_cost && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Est. Cost
                          </span>
                          <span className="text-sm">
                            ${Number(schedule.estimated_cost).toFixed(2)}
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
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
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

        {/* Create Schedule Dialog */}
        <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create PM Schedule</DialogTitle>
              <DialogDescription>
                Add a new preventive maintenance schedule.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="pmTitle">Title *</Label>
                <Input
                  id="pmTitle"
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g., HVAC Filter Replacement"
                  required
                  value={createForm.title}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe the maintenance task..."
                  rows={2}
                  value={createForm.description}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    onValueChange={(v) =>
                      setCreateForm((p) => ({ ...p, frequency: v }))
                    }
                    value={createForm.frequency}
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
                  <Input
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        nextDueDate: e.target.value,
                      }))
                    }
                    type="date"
                    value={createForm.nextDueDate}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Linked Equipment</Label>
                <Select
                  onValueChange={(v) =>
                    setCreateForm((p) => ({ ...p, equipmentId: v }))
                  }
                  value={createForm.equipmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Est. Hours</Label>
                  <Input
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        estimatedHours: e.target.value,
                      }))
                    }
                    placeholder="0"
                    step="0.5"
                    type="number"
                    value={createForm.estimatedHours}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Est. Cost</Label>
                  <Input
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        estimatedCost: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={createForm.estimatedCost}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setShowCreateDialog(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!createForm.title.trim() || creating}
                  type="submit"
                >
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Schedule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
