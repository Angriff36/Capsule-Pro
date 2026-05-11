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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  AlertTriangle,
  Bell,
  Calendar,
  Clock,
  Plus,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface Equipment {
  id: string;
  name: string;
  type: string;
  status: string;
  condition: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  nextMaintenanceDate?: Date;
  usageHours: number;
  maxUsageHours: number;
  locationId: string;
}

interface WorkOrder {
  id: string;
  equipmentId: string;
  equipmentName: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  description?: string;
  scheduledDate?: Date;
  createdAt: Date;
}

interface EquipmentAlert {
  equipmentId: string;
  equipmentName: string;
  alertType: string;
  severity: string;
  message: string;
  recommendedAction: string;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-500 text-white",
  warning: "bg-orange-500 text-white",
  info: "bg-yellow-500 text-black",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-blue-500 text-white",
};

const statusColors = {
  active: "bg-green-500 text-white",
  maintenance: "bg-yellow-500 text-black",
  out_of_service: "bg-red-500 text-white",
  retired: "bg-gray-500 text-white",
};

const conditionColors = {
  excellent: "bg-green-600 text-white",
  good: "bg-green-500 text-white",
  fair: "bg-yellow-500 text-black",
  poor: "bg-red-500 text-white",
};

export function EquipmentPageClient() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [alerts, setAlerts] = useState<EquipmentAlert[]>([]);
  const [alertSummary, setAlertSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "general",
    locationId: "",
    serialNumber: "",
    manufacturer: "",
    model: "",
    purchaseDate: "",
    warrantyExpiry: "",
    maintenanceIntervalDays: "90",
    maxUsageHours: "1000",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Dialog state for equipment actions
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<EquipmentAlert | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isEquipmentDetailsOpen, setIsEquipmentDetailsOpen] = useState(false);
  const [isNewWorkOrderOpen, setIsNewWorkOrderOpen] = useState(false);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [isWorkOrderDetailsOpen, setIsWorkOrderDetailsOpen] = useState(false);
  const [isTakeActionOpen, setIsTakeActionOpen] = useState(false);

  const [maintenanceForm, setMaintenanceForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    scheduledDate: "",
    estimatedCost: "",
  });
  const [workOrderForm, setWorkOrderForm] = useState({
    title: "",
    workOrderType: "corrective",
    priority: "medium",
    description: "",
    scheduledDate: "",
  });
  const [statusForm, setStatusForm] = useState({
    status: "in_progress",
    notes: "",
  });

  useEffect(() => {
    Promise.all([fetchEquipment(), fetchWorkOrders(), fetchAlerts()]);
  }, []);

  async function fetchEquipment() {
    try {
      const res = await apiFetch("/api/kitchen/equipment/list");
      const data = await res.json();
      if (data.success) {
        setEquipment(data.equipment || []);
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
    }
  }

  async function fetchWorkOrders() {
    try {
      const res = await apiFetch("/api/facilities/work-orders/list");
      const data = await res.json();
      if (data.success) {
        setWorkOrders(data.workOrders || []);
      }
    } catch (error) {
      console.error("Error fetching work orders:", error);
    }
  }

  async function fetchAlerts() {
    try {
      const res = await apiFetch(
        "/api/kitchen/equipment/alerts?minSeverity=low"
      );
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts || []);
        setAlertSummary(data.summary);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEquipment() {
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.locationId.trim()) {
      toast.error("Location ID is required");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: formData.name,
        type: formData.type,
        locationId: formData.locationId,
        serialNumber: formData.serialNumber || undefined,
        manufacturer: formData.manufacturer || undefined,
        model: formData.model || undefined,
        maintenanceIntervalDays:
          Number.parseInt(formData.maintenanceIntervalDays) || 90,
        maxUsageHours: Number.parseFloat(formData.maxUsageHours) || 1000,
        notes: formData.notes || undefined,
      };
      if (formData.purchaseDate) {
        body.purchaseDate = formData.purchaseDate;
      }
      if (formData.warrantyExpiry) {
        body.warrantyExpiry = formData.warrantyExpiry;
      }
      const res = await apiFetch("/api/kitchen/equipment/commands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error("Failed to create equipment");
      }
      toast.success("Equipment created successfully");
      setIsAddDialogOpen(false);
      setFormData({
        name: "",
        type: "general",
        locationId: "",
        serialNumber: "",
        manufacturer: "",
        model: "",
        purchaseDate: "",
        warrantyExpiry: "",
        maintenanceIntervalDays: "90",
        maxUsageHours: "1000",
        notes: "",
      });
      fetchEquipment();
    } catch (error) {
      console.error("Error creating equipment:", error);
      toast.error("Failed to create equipment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScheduleMaintenance() {
    if (!selectedEquipment) return;
    if (!maintenanceForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(
        "/api/kitchen/equipment/commands/schedule-maintenance",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            equipmentId: selectedEquipment.id,
            title: maintenanceForm.title,
            description: maintenanceForm.description || undefined,
            priority: maintenanceForm.priority,
            scheduledDate: maintenanceForm.scheduledDate || undefined,
            estimatedCost: maintenanceForm.estimatedCost
              ? Number.parseFloat(maintenanceForm.estimatedCost)
              : undefined,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to schedule maintenance");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed");
      toast.success("Maintenance scheduled successfully");
      setIsScheduleDialogOpen(false);
      setMaintenanceForm({
        title: "",
        description: "",
        priority: "medium",
        scheduledDate: "",
        estimatedCost: "",
      });
      fetchEquipment();
      fetchWorkOrders();
    } catch (error) {
      toast.error("Failed to schedule maintenance");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateWorkOrder() {
    if (!workOrderForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(
        "/api/facilities/work-orders/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: workOrderForm.title,
            workOrderType: workOrderForm.workOrderType,
            priority: workOrderForm.priority,
            description: workOrderForm.description || undefined,
            scheduledDate: workOrderForm.scheduledDate || undefined,
            equipmentId: selectedEquipment?.id || undefined,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to create work order");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed");
      toast.success("Work order created successfully");
      setIsNewWorkOrderOpen(false);
      setWorkOrderForm({
        title: "",
        workOrderType: "corrective",
        priority: "medium",
        description: "",
        scheduledDate: "",
      });
      setSelectedEquipment(null);
      fetchWorkOrders();
    } catch (error) {
      toast.error("Failed to create work order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStatus() {
    if (!selectedWorkOrder) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(
        "/api/facilities/work-orders/commands/update-status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workOrderId: selectedWorkOrder.id,
            status: statusForm.status,
            notes: statusForm.notes || undefined,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed");
      toast.success("Status updated successfully");
      setIsUpdateStatusOpen(false);
      setStatusForm({ status: "in_progress", notes: "" });
      setSelectedWorkOrder(null);
      fetchWorkOrders();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  function getUsagePercentage(equip: Equipment): number {
    return equip.maxUsageHours > 0
      ? (equip.usageHours / equip.maxUsageHours) * 100
      : 0;
  }

  function openScheduleMaintenance(equip: Equipment) {
    setSelectedEquipment(equip);
    setMaintenanceForm((prev) => ({
      ...prev,
      title: `Maintenance: ${equip.name}`,
    }));
    setIsScheduleDialogOpen(true);
  }

  function openCreateWorkOrderForAlert(alert: EquipmentAlert) {
    const equip = equipment.find((e) => e.id === alert.equipmentId) || null;
    setSelectedEquipment(equip);
    setWorkOrderForm((prev) => ({
      ...prev,
      title: `Repair: ${alert.equipmentName}`,
      description: alert.message,
    }));
    setIsTakeActionOpen(false);
    setIsNewWorkOrderOpen(true);
  }

  function openScheduleMaintenanceForAlert(alert: EquipmentAlert) {
    const equip = equipment.find((e) => e.id === alert.equipmentId) || null;
    setSelectedEquipment(equip);
    setMaintenanceForm((prev) => ({
      ...prev,
      title: `Maintenance: ${alert.equipmentName}`,
    }));
    setIsTakeActionOpen(false);
    setIsScheduleDialogOpen(true);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Equipment Maintenance
          </h1>
          <p className="text-muted-foreground">
            Track equipment maintenance, work orders, and maintenance alerts
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Equipment
        </Button>
      </div>

      {/* Add Equipment Dialog */}
      <Dialog onOpenChange={setIsAddDialogOpen} open={isAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>
              Add a new piece of kitchen equipment to track maintenance and
              usage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="name">
                Name *
              </Label>
              <Input
                className="col-span-3"
                id="name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Convection Oven"
                value={formData.name}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="type">
                Type
              </Label>
              <Input
                className="col-span-3"
                id="type"
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                placeholder="general"
                value={formData.type}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="locationId">
                Location ID *
              </Label>
              <Input
                className="col-span-3"
                id="locationId"
                onChange={(e) =>
                  setFormData({ ...formData, locationId: e.target.value })
                }
                placeholder="UUID of the facility location"
                value={formData.locationId}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="manufacturer">
                Manufacturer
              </Label>
              <Input
                className="col-span-3"
                id="manufacturer"
                onChange={(e) =>
                  setFormData({ ...formData, manufacturer: e.target.value })
                }
                placeholder="Vulcan, Rational, etc."
                value={formData.manufacturer}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="model">
                Model
              </Label>
              <Input
                className="col-span-3"
                id="model"
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                placeholder="VC4-GD"
                value={formData.model}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="serialNumber">
                Serial #
              </Label>
              <Input
                className="col-span-3"
                id="serialNumber"
                onChange={(e) =>
                  setFormData({ ...formData, serialNumber: e.target.value })
                }
                placeholder="SN-12345"
                value={formData.serialNumber}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="purchaseDate">
                Purchase Date
              </Label>
              <Input
                className="col-span-3"
                id="purchaseDate"
                onChange={(e) =>
                  setFormData({ ...formData, purchaseDate: e.target.value })
                }
                type="date"
                value={formData.purchaseDate}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="warrantyExpiry">
                Warranty Expiry
              </Label>
              <Input
                className="col-span-3"
                id="warrantyExpiry"
                onChange={(e) =>
                  setFormData({ ...formData, warrantyExpiry: e.target.value })
                }
                type="date"
                value={formData.warrantyExpiry}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="maintenanceIntervalDays">
                Maint. Interval (days)
              </Label>
              <Input
                className="col-span-3"
                id="maintenanceIntervalDays"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maintenanceIntervalDays: e.target.value,
                  })
                }
                type="number"
                value={formData.maintenanceIntervalDays}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="maxUsageHours">
                Max Usage Hours
              </Label>
              <Input
                className="col-span-3"
                id="maxUsageHours"
                onChange={(e) =>
                  setFormData({ ...formData, maxUsageHours: e.target.value })
                }
                type="number"
                value={formData.maxUsageHours}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="notes">
                Notes
              </Label>
              <Input
                className="col-span-3"
                id="notes"
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes"
                value={formData.notes}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={submitting}
              onClick={() => setIsAddDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={submitting} onClick={handleCreateEquipment}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Summary */}
      {alertSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            className={
              alertSummary.bySeverity.critical > 0
                ? "border-red-500 bg-red-900/10"
                : ""
            }
            tone="canvas"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {alertSummary.bySeverity.critical}
              </div>
            </CardContent>
          </Card>
          <Card tone="canvas">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Warning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {alertSummary.bySeverity.warning}
              </div>
            </CardContent>
          </Card>
          <Card tone="canvas">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {alertSummary.bySeverity.info}
              </div>
            </CardContent>
          </Card>
          <Card tone="canvas">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{equipment.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs className="space-y-4" defaultValue="equipment">
        <TabsList>
          <TabsTrigger value="equipment">
            <Wrench className="mr-2 h-4 w-4" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="work-orders">
            <Calendar className="mr-2 h-4 w-4" />
            Work Orders
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="mr-2 h-4 w-4" />
            Alerts
            {alerts.length > 0 && (
              <Badge className="ml-2 h-5 px-1.5 text-xs" variant="destructive">
                {alerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="equipment">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Equipment Inventory</CardTitle>
              <CardDescription>
                Manage your kitchen equipment and track maintenance schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading equipment...
                </div>
              ) : equipment.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No equipment found. Add your first piece of equipment to get
                  started.
                </div>
              ) : (
                <div className="space-y-4">
                  {equipment.map((equip) => {
                    const usagePercent = getUsagePercentage(equip);
                    return (
                      <div
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        key={equip.id}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{equip.name}</h3>
                            <Badge
                              className={
                                statusColors[
                                  equip.status as keyof typeof statusColors
                                ]
                              }
                            >
                              {equip.status}
                            </Badge>
                            <Badge
                              className={
                                conditionColors[
                                  equip.condition as keyof typeof conditionColors
                                ]
                              }
                            >
                              {equip.condition}
                            </Badge>
                            <Badge variant="outline">{equip.type}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {equip.manufacturer && (
                              <span>{equip.manufacturer}</span>
                            )}
                            {equip.model && <span>{equip.model}</span>}
                            {equip.serialNumber && (
                              <span>SN: {equip.serialNumber}</span>
                            )}
                          </div>
                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4" />
                              <span>
                                Usage: {equip.usageHours.toFixed(1)} /{" "}
                                {equip.maxUsageHours} hrs
                              </span>
                            </div>
                            {equip.nextMaintenanceDate && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Next maintenance:{" "}
                                  {formatDate(equip.nextMaintenanceDate)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 w-full bg-secondary rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                usagePercent >= 90
                                  ? "bg-red-500"
                                  : usagePercent >= 80
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min(usagePercent, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => openScheduleMaintenance(equip)}
                            size="sm"
                            variant="outline"
                          >
                            <Wrench className="mr-1 h-3 w-3" />
                            Schedule maintenance
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedEquipment(equip);
                              setIsEquipmentDetailsOpen(true);
                            }}
                            size="sm"
                            variant="ghost"
                          >
                            Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4" value="work-orders">
          <Card tone="canvas">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Work Orders</CardTitle>
                  <CardDescription>
                    Track repairs, replacements, and inspections
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setSelectedEquipment(null);
                    setWorkOrderForm({
                      title: "",
                      workOrderType: "corrective",
                      priority: "medium",
                      description: "",
                      scheduledDate: "",
                    });
                    setIsNewWorkOrderOpen(true);
                  }}
                  type="button"
                  variant="default"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New work order
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading work orders...
                </div>
              ) : workOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No work orders found. Create a work order to track equipment
                  repairs.
                </div>
              ) : (
                <div className="space-y-4">
                  {workOrders.map((order) => (
                    <div
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      key={order.id}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{order.title}</h3>
                          <Badge
                            className={
                              severityColors[
                                order.priority as keyof typeof severityColors
                              ]
                            }
                          >
                            {order.priority}
                          </Badge>
                          <Badge variant="outline">{order.type}</Badge>
                          <Badge variant="secondary">
                            {order.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Equipment: {order.equipmentName}
                        </p>
                        {order.description && (
                          <p className="text-sm mt-2">{order.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Created: {formatDate(order.createdAt)}</span>
                          {order.scheduledDate && (
                            <span>
                              Scheduled: {formatDate(order.scheduledDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedWorkOrder(order);
                            setStatusForm({
                              status:
                                order.status === "open"
                                  ? "in_progress"
                                  : order.status === "in_progress"
                                    ? "completed"
                                    : order.status,
                              notes: "",
                            });
                            setIsUpdateStatusOpen(true);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Update status
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedWorkOrder(order);
                            setIsWorkOrderDetailsOpen(true);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4" value="alerts">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Equipment Alerts
              </CardTitle>
              <CardDescription>
                Maintenance and condition alerts for your equipment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading alerts...
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  No alerts at this time. Your equipment is in good standing.
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert, index) => (
                    <div
                      className="p-4 border rounded-lg border-l-4"
                      key={`${alert.equipmentId}-${alert.alertType}-${index}`}
                      style={{
                        borderLeftColor:
                          alert.severity === "critical"
                            ? "var(--ds-severity-critical)"
                            : alert.severity === "warning"
                              ? "var(--ds-severity-high)"
                              : alert.severity === "info"
                                ? "var(--ds-severity-medium)"
                                : "var(--ds-severity-low)",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">
                              {alert.equipmentName}
                            </h3>
                            <Badge
                              className={
                                severityColors[
                                  alert.severity as keyof typeof severityColors
                                ]
                              }
                            >
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline">
                              {alert.alertType.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{alert.message}</p>
                          <p className="text-sm font-medium text-muted-foreground">
                            Recommendation: {alert.recommendedAction}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedAlert(alert);
                            setIsTakeActionOpen(true);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Take action
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Maintenance Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>
              {selectedEquipment
                ? `Schedule maintenance for ${selectedEquipment.name}`
                : "Schedule equipment maintenance"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Title *</Label>
              <Input
                className="col-span-3"
                onChange={(e) =>
                  setMaintenanceForm({ ...maintenanceForm, title: e.target.value })
                }
                placeholder="Maintenance task title"
                value={maintenanceForm.title}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Description</Label>
              <textarea
                className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the maintenance task"
                value={maintenanceForm.description}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Priority</Label>
              <select
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    priority: e.target.value,
                  })
                }
                value={maintenanceForm.priority}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Scheduled Date</Label>
              <Input
                className="col-span-3"
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    scheduledDate: e.target.value,
                  })
                }
                type="date"
                value={maintenanceForm.scheduledDate}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Est. Cost</Label>
              <Input
                className="col-span-3"
                onChange={(e) =>
                  setMaintenanceForm({
                    ...maintenanceForm,
                    estimatedCost: e.target.value,
                  })
                }
                placeholder="0.00"
                type="number"
                value={maintenanceForm.estimatedCost}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={submitting}
              onClick={() => setIsScheduleDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={submitting} onClick={handleScheduleMaintenance}>
              {submitting ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Equipment Details Dialog */}
      <Dialog
        open={isEquipmentDetailsOpen}
        onOpenChange={setIsEquipmentDetailsOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Equipment Details</DialogTitle>
            <DialogDescription>
              {selectedEquipment?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <Badge
                    className={
                      statusColors[
                        selectedEquipment.status as keyof typeof statusColors
                      ]
                    }
                  >
                    {selectedEquipment.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Condition
                  </p>
                  <Badge
                    className={
                      conditionColors[
                        selectedEquipment.condition as keyof typeof conditionColors
                      ]
                    }
                  >
                    {selectedEquipment.condition}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Type
                  </p>
                  <p className="text-sm">{selectedEquipment.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Location
                  </p>
                  <p className="text-sm font-mono text-xs">
                    {selectedEquipment.locationId}
                  </p>
                </div>
              </div>
              {(selectedEquipment.manufacturer ||
                selectedEquipment.model ||
                selectedEquipment.serialNumber) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Product Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedEquipment.manufacturer && (
                      <div>
                        <span className="text-muted-foreground">
                          Manufacturer:{" "}
                        </span>
                        {selectedEquipment.manufacturer}
                      </div>
                    )}
                    {selectedEquipment.model && (
                      <div>
                        <span className="text-muted-foreground">Model: </span>
                        {selectedEquipment.model}
                      </div>
                    )}
                    {selectedEquipment.serialNumber && (
                      <div>
                        <span className="text-muted-foreground">
                          Serial #:{" "}
                        </span>
                        {selectedEquipment.serialNumber}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Usage</h4>
                <div className="flex items-center gap-4 text-sm">
                  <span>
                    {selectedEquipment.usageHours.toFixed(1)} /{" "}
                    {selectedEquipment.maxUsageHours} hours
                  </span>
                  <span className="text-muted-foreground">
                    ({getUsagePercentage(selectedEquipment).toFixed(1)}%)
                  </span>
                </div>
                <div className="mt-2 w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      getUsagePercentage(selectedEquipment) >= 90
                        ? "bg-red-500"
                        : getUsagePercentage(selectedEquipment) >= 80
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        getUsagePercentage(selectedEquipment),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
              {selectedEquipment.nextMaintenanceDate && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Next Maintenance</h4>
                  <p className="text-sm">
                    {formatDate(selectedEquipment.nextMaintenanceDate)}
                  </p>
                </div>
              )}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Related Work Orders</h4>
                {workOrders.filter(
                  (wo) => wo.equipmentId === selectedEquipment.id
                ).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No work orders for this equipment.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {workOrders
                      .filter((wo) => wo.equipmentId === selectedEquipment.id)
                      .map((wo) => (
                        <div
                          key={wo.id}
                          className="flex items-center justify-between p-2 border rounded text-sm"
                        >
                          <div>
                            <span className="font-medium">{wo.title}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {wo.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <span className="text-muted-foreground">
                            {formatDate(wo.createdAt)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setIsEquipmentDetailsOpen(false)}
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Work Order Dialog */}
      <Dialog open={isNewWorkOrderOpen} onOpenChange={setIsNewWorkOrderOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Work Order</DialogTitle>
            <DialogDescription>
              {selectedEquipment
                ? `Create a work order for ${selectedEquipment.name}`
                : "Create a new maintenance work order"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Title *</Label>
              <Input
                className="col-span-3"
                onChange={(e) =>
                  setWorkOrderForm({
                    ...workOrderForm,
                    title: e.target.value,
                  })
                }
                placeholder="Work order title"
                value={workOrderForm.title}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Type</Label>
              <select
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) =>
                  setWorkOrderForm({
                    ...workOrderForm,
                    workOrderType: e.target.value,
                  })
                }
                value={workOrderForm.workOrderType}
              >
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="emergency">Emergency</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Priority</Label>
              <select
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) =>
                  setWorkOrderForm({
                    ...workOrderForm,
                    priority: e.target.value,
                  })
                }
                value={workOrderForm.priority}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Description</Label>
              <textarea
                className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) =>
                  setWorkOrderForm({
                    ...workOrderForm,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the issue or task"
                value={workOrderForm.description}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Scheduled Date</Label>
              <Input
                className="col-span-3"
                onChange={(e) =>
                  setWorkOrderForm({
                    ...workOrderForm,
                    scheduledDate: e.target.value,
                  })
                }
                type="date"
                value={workOrderForm.scheduledDate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={submitting}
              onClick={() => setIsNewWorkOrderOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={submitting} onClick={handleCreateWorkOrder}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={isUpdateStatusOpen} onOpenChange={setIsUpdateStatusOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Work Order Status</DialogTitle>
            <DialogDescription>
              {selectedWorkOrder?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status *</Label>
              <select
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) =>
                  setStatusForm({ ...statusForm, status: e.target.value })
                }
                value={statusForm.status}
              >
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="parts_ordered">Parts Ordered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Notes</Label>
              <textarea
                className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onChange={(e) =>
                  setStatusForm({ ...statusForm, notes: e.target.value })
                }
                placeholder="Add notes about this status change"
                value={statusForm.notes}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={submitting}
              onClick={() => setIsUpdateStatusOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={submitting} onClick={handleUpdateStatus}>
              {submitting ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Work Order Details Dialog */}
      <Dialog
        open={isWorkOrderDetailsOpen}
        onOpenChange={setIsWorkOrderDetailsOpen}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Work Order Details</DialogTitle>
            <DialogDescription>
              {selectedWorkOrder?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedWorkOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <Badge variant="secondary">
                    {selectedWorkOrder.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Priority
                  </p>
                  <Badge
                    className={
                      severityColors[
                        selectedWorkOrder.priority as keyof typeof severityColors
                      ]
                    }
                  >
                    {selectedWorkOrder.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Type
                  </p>
                  <p className="text-sm">{selectedWorkOrder.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Equipment
                  </p>
                  <p className="text-sm">{selectedWorkOrder.equipmentName}</p>
                </div>
              </div>
              {selectedWorkOrder.description && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm">{selectedWorkOrder.description}</p>
                </div>
              )}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created: </span>
                    {formatDate(selectedWorkOrder.createdAt)}
                  </div>
                  {selectedWorkOrder.scheduledDate && (
                    <div>
                      <span className="text-muted-foreground">
                        Scheduled:{" "}
                      </span>
                      {formatDate(selectedWorkOrder.scheduledDate)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setIsWorkOrderDetailsOpen(false)}
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Take Action Dialog */}
      <Dialog open={isTakeActionOpen} onOpenChange={setIsTakeActionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Take Action</DialogTitle>
            <DialogDescription>
              {selectedAlert?.equipmentName} —{" "}
              {selectedAlert?.alertType.replace(/_/g, " ")}
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4 py-4">
              <div
                className="p-3 border rounded-lg border-l-4"
                style={{
                  borderLeftColor:
                    selectedAlert.severity === "critical"
                      ? "var(--ds-severity-critical)"
                      : selectedAlert.severity === "warning"
                        ? "var(--ds-severity-high)"
                        : selectedAlert.severity === "info"
                          ? "var(--ds-severity-medium)"
                          : "var(--ds-severity-low)",
                }}
              >
                <Badge
                  className={
                    severityColors[
                      selectedAlert.severity as keyof typeof severityColors
                    ]
                  }
                >
                  {selectedAlert.severity}
                </Badge>
                <p className="text-sm mt-2">{selectedAlert.message}</p>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  Recommendation: {selectedAlert.recommendedAction}
                </p>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Actions</h4>
                <div className="space-y-2">
                  <Button
                    className="w-full justify-start"
                    onClick={() =>
                      openScheduleMaintenanceForAlert(selectedAlert)
                    }
                    variant="outline"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Maintenance
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={() => openCreateWorkOrderForAlert(selectedAlert)}
                    variant="outline"
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Create Work Order
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setIsTakeActionOpen(false)}
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
