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

const severityColors = {
  critical: "bg-red-500 text-white",
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
      const res = await apiFetch("/api/workorder/list");
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

  function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  function getUsagePercentage(equip: Equipment): number {
    return equip.maxUsageHours > 0
      ? (equip.usageHours / equip.maxUsageHours) * 100
      : 0;
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
                High
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {alertSummary.bySeverity.high}
              </div>
            </CardContent>
          </Card>
          <Card tone="canvas">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Medium
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {alertSummary.bySeverity.medium}
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
                          <Button disabled size="sm" variant="outline">
                            Schedule maintenance — not implemented
                          </Button>
                          <Button disabled size="sm" variant="ghost">
                            Details — not implemented
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
                <Button disabled type="button" variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  New work order — not implemented
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
                        <Button disabled size="sm" variant="outline">
                          Update status — not implemented
                        </Button>
                        <Button disabled size="sm" variant="ghost">
                          Details — not implemented
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
                            ? "#ef4444"
                            : alert.severity === "high"
                              ? "#f97316"
                              : alert.severity === "medium"
                                ? "#eab308"
                                : "#3b82f6",
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
                        <Button disabled size="sm" variant="outline">
                          Take action — not implemented
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
