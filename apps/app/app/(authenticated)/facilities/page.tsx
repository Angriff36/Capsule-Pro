"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
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
import { useState, useEffect } from "react";
import {
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react";

interface WorkOrder {
  id: string;
  work_order_number: string;
  priority: string;
  title: string;
  status: string;
  work_order_type: string;
  description: string | null;
  assigned_to: string | null;
  assigned_vendor: string | null;
  scheduled_date: string | null;
  reported_at: string;
}

export default function FacilitiesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewWorkOrder, setViewWorkOrder] = useState<WorkOrder | null>(null);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Facility Management</h1>
          <p className="text-muted-foreground">Maintenance scheduling, work orders, and preventive care</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Work Order
        </Button>
      </div>

      <Tabs defaultValue="work-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="work-orders">
            <Wrench className="h-4 w-4 mr-2" />
            Work Orders
          </TabsTrigger>
          <TabsTrigger value="schedules">
            <Calendar className="h-4 w-4 mr-2" />
            PM Schedules
          </TabsTrigger>
          <TabsTrigger value="areas">
            <MapPin className="h-4 w-4 mr-2" />
            Areas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work-orders" className="space-y-4">
          <WorkOrdersTab
            showCreateDialog={showCreateDialog}
            setShowCreateDialog={setShowCreateDialog}
            viewWorkOrder={viewWorkOrder}
            setViewWorkOrder={setViewWorkOrder}
          />
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <PreventiveMaintenanceTab />
        </TabsContent>

        <TabsContent value="areas" className="space-y-4">
          <AreasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkOrdersTab({
  showCreateDialog,
  setShowCreateDialog,
  viewWorkOrder,
  setViewWorkOrder,
}: {
  showCreateDialog: boolean;
  setShowCreateDialog: (show: boolean) => void;
  viewWorkOrder: WorkOrder | null;
  setViewWorkOrder: (wo: WorkOrder | null) => void;
}) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    workOrderType: 'corrective',
    scheduledDate: '',
    assignedVendor: '',
  });

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const loadWorkOrders = async () => {
    try {
      const res = await fetch('/api/facilities/work-orders/list?status=all');
      const data = await res.json();
      if (data.success) {
        setWorkOrders(data.data.workOrders || []);
      }
    } catch (error) {
      console.error('Failed to load work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/facilities/work-orders/commands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description || null,
          priority: createForm.priority,
          workOrderType: createForm.workOrderType,
          scheduledDate: createForm.scheduledDate || null,
          assignedVendor: createForm.assignedVendor || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWorkOrders((prev) => [data.data.workOrder, ...prev]);
        setShowCreateDialog(false);
        setCreateForm({
          title: '',
          description: '',
          priority: 'medium',
          workOrderType: 'corrective',
          scheduledDate: '',
          assignedVendor: '',
        });
      }
    } catch (error) {
      console.error('Failed to create work order:', error);
    } finally {
      setCreating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "secondary";
      case "medium": return "outline";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-500" />;
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not scheduled';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Badge variant="destructive">{workOrders.filter(w => w.priority === 'critical').length} Critical</Badge>
          <Badge variant="secondary">{workOrders.filter(w => w.priority === 'high').length} High</Badge>
          <Badge variant="outline">{workOrders.filter(w => w.priority === 'medium').length} Medium</Badge>
        </div>

        {workOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No work orders found. Create a new work order to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {workOrders.map((wo) => (
              <Card key={wo.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(wo.status)}
                        <span className="font-mono text-sm text-muted-foreground">{wo.work_order_number}</span>
                        <span className="font-medium">{wo.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="capitalize">{wo.work_order_type}</span>
                        <span>Assigned: {wo.assigned_vendor || "Unassigned"}</span>
                        <span>Due: {formatDate(wo.scheduled_date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(wo.priority) as "destructive" | "secondary" | "outline"}>
                        {wo.priority}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => setViewWorkOrder(wo)}>View</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Work Order Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
            <DialogDescription>
              Report a maintenance issue or create a new work order.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateWorkOrder}>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Walk-in cooler not cooling"
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={createForm.priority} onValueChange={(v) => setCreateForm((prev) => ({ ...prev, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={createForm.workOrderType} onValueChange={(v) => setCreateForm((prev) => ({ ...prev, workOrderType: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={createForm.scheduledDate}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, scheduledDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Vendor</Label>
              <Input
                placeholder="e.g., HVAC Services Inc."
                value={createForm.assignedVendor}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, assignedVendor: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the issue..."
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={!createForm.title.trim() || creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Work Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Work Order Dialog */}
      <Dialog open={!!viewWorkOrder} onOpenChange={() => setViewWorkOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewWorkOrder?.title}</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {viewWorkOrder?.work_order_number}
            </DialogDescription>
          </DialogHeader>
          {viewWorkOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(viewWorkOrder.status)}
                    <span className="capitalize">{viewWorkOrder.status.replace('_', ' ')}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Priority</Label>
                  <div className="mt-1">
                    <Badge variant={getPriorityColor(viewWorkOrder.priority) as "destructive" | "secondary" | "outline"}>
                      {viewWorkOrder.priority}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="capitalize">{viewWorkOrder.work_order_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Scheduled</Label>
                  <p>{formatDate(viewWorkOrder.scheduled_date)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Assigned To</Label>
                <p>{viewWorkOrder.assigned_vendor || 'Unassigned'}</p>
              </div>
              {viewWorkOrder.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm">{viewWorkOrder.description}</p>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Reported: {new Date(viewWorkOrder.reported_at).toLocaleString()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewWorkOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PreventiveMaintenanceTab() {
  const schedules = [
    { 
      id: 1, 
      scheduleNumber: "PM-2026-0001",
      title: "HVAC Filter Replacement",
      frequency: "monthly",
      nextDue: "Mar 25, 2026",
      status: "upcoming",
      assignedTo: "HVAC Services Inc."
    },
    { 
      id: 2, 
      scheduleNumber: "PM-2026-0002",
      title: "Grease Trap Cleaning",
      frequency: "quarterly",
      nextDue: "Apr 1, 2026",
      status: "upcoming",
      assignedTo: "Plumbing Pro"
    },
    { 
      id: 3, 
      scheduleNumber: "PM-2026-0003",
      title: "Fire Suppression Inspection",
      frequency: "semiannual",
      nextDue: "Mar 20, 2026",
      status: "overdue",
      assignedTo: "Fire Safety Co."
    },
  ];

  const frequencyColors: Record<string, string> = {
    daily: "bg-blue-100 text-blue-800",
    weekly: "bg-cyan-100 text-cyan-800",
    monthly: "bg-green-100 text-green-800",
    quarterly: "bg-yellow-100 text-yellow-800",
    semiannual: "bg-orange-100 text-orange-800",
    annual: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Badge variant="destructive">1 Overdue</Badge>
        <Badge variant="secondary">2 Due This Week</Badge>
        <Badge variant="outline">5 Due This Month</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schedules.map((schedule) => (
          <Card key={schedule.id} className={schedule.status === "overdue" ? "border-red-300" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{schedule.title}</CardTitle>
                {schedule.status === "overdue" && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="font-mono text-xs text-muted-foreground">{schedule.scheduleNumber}</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Frequency</span>
                  <span className={`text-xs px-2 py-1 rounded ${frequencyColors[schedule.frequency] || "bg-gray-100"}`}>
                    {schedule.frequency}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Next Due</span>
                  <span className={`text-sm ${schedule.status === "overdue" ? "text-red-600 font-medium" : ""}`}>
                    {schedule.nextDue}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Assigned</span>
                  <span className="text-sm">{schedule.assignedTo}</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1">Complete</Button>
                <Button size="sm" variant="outline">Reschedule</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AreasTab() {
  const areas = [
    { id: 1, name: "Main Kitchen", code: "KIT-01", areaType: "kitchen", status: "active", squareFeet: 1200 },
    { id: 2, name: "Prep Area", code: "PREP-01", areaType: "prep", status: "active", squareFeet: 400 },
    { id: 3, name: "Walk-in Cooler", code: "COOL-01", areaType: "storage", status: "active", squareFeet: 300 },
    { id: 4, name: "Dry Storage", code: "STOR-01", areaType: "storage", status: "active", squareFeet: 500 },
    { id: 5, name: "Loading Dock", code: "DOCK-01", areaType: "loading_dock", status: "active", squareFeet: 600 },
  ];

  const areaTypeIcons: Record<string, string> = {
    kitchen: "🍳",
    prep: "🔪",
    storage: "📦",
    dining: "🍽️",
    office: "💼",
    loading_dock: "🚚",
    restroom: "🚻",
    other: "🏢",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Badge variant="secondary">5 Areas</Badge>
          <Badge variant="outline">3,000 sq ft total</Badge>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Area
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <Card key={area.id}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{areaTypeIcons[area.areaType] || "🏢"}</div>
                <div className="flex-1">
                  <div className="font-medium">{area.name}</div>
                  <div className="text-sm text-muted-foreground">{area.code}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{area.areaType.replace("_", " ")}</Badge>
                    <span className="text-xs text-muted-foreground">{area.squareFeet} sq ft</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
