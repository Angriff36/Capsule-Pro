"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Plus,
  Loader2,
  Calendar,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Wrench,
} from "lucide-react";
import { FacilitiesNavigation } from "../components/facilities-navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";

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
    title: '',
    description: '',
    frequency: 'monthly',
    nextDueDate: '',
    estimatedHours: '',
    estimatedCost: '',
    equipmentId: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedulesRes, assetsRes] = await Promise.all([
        fetch('/api/facilities/schedules/list?status=all'),
        fetch('/api/facilities/assets/list?status=active'),
      ]);
      const schedulesData = await schedulesRes.json();
      const assetsData = await assetsRes.json();
      if (schedulesData.success) setSchedules(schedulesData.data.schedules || []);
      if (assetsData.success) setAssets(assetsData.data.assets || []);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (scheduleId: string) => {
    setCompleting(scheduleId);
    try {
      const res = await fetch('/api/facilities/schedules/commands/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      });
      const data = await res.json();
      if (data.success) await loadData();
    } catch (error) {
      console.error('Failed to complete schedule:', error);
    } finally {
      setCompleting(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/facilities/schedules/commands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description || null,
          frequency: createForm.frequency,
          nextDueDate: createForm.nextDueDate || undefined,
          estimatedHours: createForm.estimatedHours ? parseFloat(createForm.estimatedHours) : undefined,
          estimatedCost: createForm.estimatedCost ? parseFloat(createForm.estimatedCost) : undefined,
          equipmentId: createForm.equipmentId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
        setShowCreateDialog(false);
        setCreateForm({ title: '', description: '', frequency: 'monthly', nextDueDate: '', estimatedHours: '', estimatedCost: '', equipmentId: '' });
      }
    } catch (error) {
      console.error('Failed to create schedule:', error);
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
  const overdueCount = schedules.filter(s => new Date(s.next_due_at) < now).length;

  // Calendar logic
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const getSchedulesForDay = (day: Date) => {
    return schedules.filter(s => isSameDay(new Date(s.next_due_at), day));
  };

  const selectedDaySchedules = selectedDate ? getSchedulesForDay(selectedDate) : [];

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <FacilitiesNavigation />

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold tracking-tight">PM Schedules</h1>
            <p className="text-muted-foreground">Preventive maintenance scheduling and tracking.</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as "cards" | "calendar")}>
              <TabsList>
                <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4 mr-1" />Cards</TabsTrigger>
                <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1" />Calendar</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Schedule
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          {overdueCount > 0 && <Badge variant="destructive">{overdueCount} Overdue</Badge>}
          <Badge variant="secondary">{schedules.length} Schedules</Badge>
        </div>

        {view === "calendar" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            {/* Calendar Grid */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
                  ))}
                </div>
                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(day => {
                    const daySchedules = getSchedulesForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isCurrentDay = isToday(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const hasOverdue = daySchedules.some(s => new Date(s.next_due_at) < now);

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          min-h-[80px] p-1 rounded-lg border text-left transition-colors
                          ${isCurrentMonth ? "bg-white" : "bg-gray-50 text-muted-foreground"}
                          ${isCurrentDay ? "ring-2 ring-primary" : "border-gray-200"}
                          ${isSelected ? "bg-primary/10 border-primary" : ""}
                          hover:border-gray-300
                        `}
                      >
                        <div className={`text-sm font-medium mb-1 ${isCurrentDay ? "text-primary" : ""}`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {daySchedules.slice(0, 2).map(s => (
                            <div
                              key={s.id}
                              className={`text-[10px] px-1 py-0.5 rounded truncate ${
                                hasOverdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                              }`}
                              title={s.title}
                            >
                              {s.title}
                            </div>
                          ))}
                          {daySchedules.length > 2 && (
                            <div className="text-[10px] text-muted-foreground pl-1">+{daySchedules.length - 2} more</div>
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
                  {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a day"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate && selectedDaySchedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No schedules due this day.</p>
                ) : selectedDate ? (
                  <div className="space-y-2">
                    {selectedDaySchedules.map(s => {
                      const isOverdue = new Date(s.next_due_at) < now;
                      return (
                        <div key={s.id} className={`p-2 rounded border ${isOverdue ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                          <div className="font-medium text-sm">{s.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={frequencyColors[s.frequency] || "bg-gray-100"}>{s.frequency}</Badge>
                            {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                          </div>
                          <Button
                            size="sm"
                            className="mt-2 w-full"
                            disabled={completing === s.id}
                            onClick={() => handleComplete(s.id)}
                          >
                            {completing === s.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Complete
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Click a day to see schedules.</p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Cards View */
          schedules.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No preventive maintenance schedules found. Create one to get started.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {schedules.map((schedule) => {
                const isOverdue = new Date(schedule.next_due_at) < now;
                const linkedAsset = schedule.equipment_id ? assets.find(a => a.id === schedule.equipment_id) : null;
                return (
                  <Card key={schedule.id} className={isOverdue ? "border-red-300" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{schedule.title}</CardTitle>
                        {isOverdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{schedule.schedule_number}</div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Frequency</span>
                          <span className={`text-xs px-2 py-1 rounded ${frequencyColors[schedule.frequency] || "bg-gray-100"}`}>{schedule.frequency}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Next Due</span>
                          <span className={`text-sm ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                            {new Date(schedule.next_due_at).toLocaleDateString()}
                          </span>
                        </div>
                        {linkedAsset && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Equipment</span>
                            <span className="text-sm flex items-center gap-1">
                              <Wrench className="h-3 w-3" /> {linkedAsset.name}
                            </span>
                          </div>
                        )}
                        {schedule.estimated_hours && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Est. Hours</span>
                            <span className="text-sm">{schedule.estimated_hours}h</span>
                          </div>
                        )}
                        {schedule.estimated_cost && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Est. Cost</span>
                            <span className="text-sm">${Number(schedule.estimated_cost).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <Button size="sm" className="w-full" disabled={completing === schedule.id} onClick={() => handleComplete(schedule.id)}>
                          {completing === schedule.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                          Complete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        )}

        {/* Create Schedule Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create PM Schedule</DialogTitle>
              <DialogDescription>Add a new preventive maintenance schedule.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="pmTitle">Title *</Label>
                <Input id="pmTitle" placeholder="e.g., HVAC Filter Replacement" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the maintenance task..." value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={createForm.frequency} onValueChange={(v) => setCreateForm((p) => ({ ...p, frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Input type="date" value={createForm.nextDueDate} onChange={(e) => setCreateForm((p) => ({ ...p, nextDueDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Linked Equipment</Label>
                <Select value={createForm.equipmentId} onValueChange={(v) => setCreateForm((p) => ({ ...p, equipmentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select equipment (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {assets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Est. Hours</Label>
                  <Input type="number" step="0.5" placeholder="0" value={createForm.estimatedHours} onChange={(e) => setCreateForm((p) => ({ ...p, estimatedHours: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Est. Cost</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={createForm.estimatedCost} onChange={(e) => setCreateForm((p) => ({ ...p, estimatedCost: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={!createForm.title.trim() || creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
