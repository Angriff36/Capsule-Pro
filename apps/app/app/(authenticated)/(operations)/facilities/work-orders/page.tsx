"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
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
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  facilityWorkOrderComplete,
  facilityWorkOrderStart,
  listFacilityWorkOrders,
} from "@/app/lib/manifest-client.generated";
import { createWorkOrder } from "../actions";
import { FacilitiesNavigation } from "../components/facilities-navigation";

interface WorkOrder {
  assigned_to: string | null;
  assigned_vendor: string | null;
  description: string | null;
  id: string;
  priority: string;
  reported_at: string;
  scheduled_date: string | null;
  status: string;
  title: string;
  work_order_number: string;
  work_order_type: string;
}

const STATUS_FLOW: Record<string, string[]> = {
  open: ["in_progress"],
  in_progress: ["completed"],
  completed: [],
  assigned: ["in_progress"],
  parts_ordered: ["in_progress", "completed"],
  cancelled: [],
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  assigned: "Assigned",
  parts_ordered: "Parts Ordered",
  cancelled: "Cancelled",
};

export default function FacilitiesWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewWorkOrder, setViewWorkOrder] = useState<WorkOrder | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completingWorkOrder, setCompletingWorkOrder] =
    useState<WorkOrder | null>(null);
  const [completeForm, setCompleteForm] = useState({
    laborHours: "",
    partsCost: "",
    laborCost: "",
    notes: "",
  });
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    workOrderType: "corrective",
    scheduledDate: "",
    assignedVendor: "",
  });

  useEffect(() => {
    loadWorkOrders();
  }, []);

  const loadWorkOrders = async () => {
    setLoadError(null);
    try {
      const result = await listFacilityWorkOrders({ status: "all" });
      setWorkOrders(result.data as unknown as WorkOrder[]);
    } catch {
      // A failed fetch must not render as "no work orders yet".
      setLoadError("Could not load work orders. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      return;
    }

    setCreating(true);
    try {
      const result = (await createWorkOrder({
        title: createForm.title,
        description: createForm.description || undefined,
        priority: createForm.priority,
        workOrderType: createForm.workOrderType,
        scheduledDate: createForm.scheduledDate || undefined,
      })) as Record<string, unknown>;
      setWorkOrders((prev) => [
        {
          id: (result.id as string) ?? "",
          work_order_number: (result.workOrderNumber as string) ?? "",
          priority: (result.priority as string) ?? "medium",
          title: (result.title as string) ?? "",
          status: (result.status as string) ?? "open",
          work_order_type: (result.workOrderType as string) ?? "corrective",
          description: (result.description as string) ?? "",
          assigned_to: (result.assignedTo as string) ?? "",
          assigned_vendor: null,
          scheduled_date: result.scheduledDate
            ? new Date(result.scheduledDate as string).toISOString()
            : null,
          reported_at: result.createdAt
            ? new Date(result.createdAt as string).toISOString()
            : new Date().toISOString(),
        },
        ...prev,
      ]);
      setShowCreateDialog(false);
      setCreateForm({
        title: "",
        description: "",
        priority: "medium",
        workOrderType: "corrective",
        scheduledDate: "",
        assignedVendor: "",
      });
    } catch (error) {
      console.error("Failed to create work order:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (workOrderId: string, newStatus: string) => {
    if (newStatus === "completed") {
      const wo = workOrders.find((w) => w.id === workOrderId);
      if (wo) {
        setCompletingWorkOrder(wo);
        setCompleteForm({
          laborHours: "",
          partsCost: "",
          laborCost: "",
          notes: "",
        });
        setShowCompleteDialog(true);
      }
      return;
    }

    setUpdatingStatus(workOrderId);
    try {
      if (newStatus === "in_progress") {
        await facilityWorkOrderStart({ id: workOrderId });
      } else if (newStatus === "completed") {
        await facilityWorkOrderComplete({ id: workOrderId });
      }
      await loadWorkOrders();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingWorkOrder) {
      return;
    }
    setUpdatingStatus(completingWorkOrder.id);
    try {
      const partsCost = Number.parseFloat(completeForm.partsCost) || 0;
      const laborCost = Number.parseFloat(completeForm.laborCost) || 0;
      await facilityWorkOrderComplete({
        actualCost: partsCost + laborCost,
        id: completingWorkOrder.id,
        ...(completeForm.notes.trim()
          ? { completionNotes: completeForm.notes }
          : {}),
      });
      await loadWorkOrders();
      setShowCompleteDialog(false);
      setCompletingWorkOrder(null);
    } catch (error) {
      console.error("Failed to complete work order:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "secondary";
      case "medium":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) {
      return "Not scheduled";
    }
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <FacilitiesNavigation />

      <div className="container mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">Work Orders</h1>
            <p className="text-muted-foreground">
              Track maintenance issues, repairs, and inspections
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Work Order
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge variant="destructive">
                {workOrders.filter((w) => w.priority === "critical").length}{" "}
                Critical
              </Badge>
              <Badge variant="secondary">
                {workOrders.filter((w) => w.priority === "high").length} High
              </Badge>
              <Badge variant="outline">
                {workOrders.filter((w) => w.priority === "medium").length}{" "}
                Medium
              </Badge>
            </div>

            {loadError ? (
              <Card>
                <CardContent className="py-8">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Wrench />
                      </EmptyMedia>
                      <EmptyTitle>Couldn't load work orders</EmptyTitle>
                      <EmptyDescription>{loadError}</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button onClick={loadWorkOrders} variant="outline">
                        Retry
                      </Button>
                    </EmptyContent>
                  </Empty>
                </CardContent>
              </Card>
            ) : workOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Wrench />
                      </EmptyMedia>
                      <EmptyTitle>No work orders yet</EmptyTitle>
                      <EmptyDescription>
                        Create work orders to track maintenance issues, repairs,
                        and inspections.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <p className="text-muted-foreground text-xs">
                        Click <strong>New Work Order</strong> above to report
                        your first issue.
                      </p>
                    </EmptyContent>
                  </Empty>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {workOrders.map((wo) => {
                  const nextStatuses = STATUS_FLOW[wo.status] || [];
                  return (
                    <Card key={wo.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(wo.status)}
                              <span className="font-mono text-muted-foreground text-sm">
                                {wo.work_order_number}
                              </span>
                              <span className="font-medium">{wo.title}</span>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground text-sm">
                              <span className="capitalize">
                                {wo.work_order_type}
                              </span>
                              <span>
                                Assigned: {wo.assigned_vendor || "Unassigned"}
                              </span>
                              <span>Due: {formatDate(wo.scheduled_date)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                getPriorityColor(wo.priority) as
                                  | "destructive"
                                  | "secondary"
                                  | "outline"
                              }
                            >
                              {wo.priority}
                            </Badge>
                            {nextStatuses.map((nextStatus) => (
                              <Button
                                disabled={updatingStatus === wo.id}
                                key={nextStatus}
                                onClick={() =>
                                  handleStatusUpdate(wo.id, nextStatus)
                                }
                                size="sm"
                                variant={
                                  nextStatus === "completed"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {updatingStatus === wo.id ? (
                                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : null}
                                {nextStatus === "in_progress"
                                  ? "Start"
                                  : STATUS_LABELS[nextStatus] || nextStatus}
                              </Button>
                            ))}
                            <Button
                              onClick={() => setViewWorkOrder(wo)}
                              size="sm"
                              variant="outline"
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Work Order Dialog */}
      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
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
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Walk-in cooler not cooling"
                required
                value={createForm.title}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  onValueChange={(v) =>
                    setCreateForm((prev) => ({ ...prev, priority: v }))
                  }
                  value={createForm.priority}
                >
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
                <Select
                  onValueChange={(v) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      workOrderType: v,
                    }))
                  }
                  value={createForm.workOrderType}
                >
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
              <DatePicker
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    scheduledDate: e.target.value,
                  }))
                }
                value={createForm.scheduledDate}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Vendor</Label>
              <Input
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    assignedVendor: e.target.value,
                  }))
                }
                placeholder="e.g., HVAC Services Inc."
                value={createForm.assignedVendor}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe the issue..."
                value={createForm.description}
              />
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
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Work Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Work Order Dialog */}
      <Dialog onOpenChange={setShowCompleteDialog} open={showCompleteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Work Order</DialogTitle>
            <DialogDescription>
              Record final details for{" "}
              <span className="font-semibold">
                {completingWorkOrder?.title}
              </span>
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleComplete}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Labor Hours</Label>
                <Input
                  onChange={(e) =>
                    setCompleteForm((p) => ({
                      ...p,
                      laborHours: e.target.value,
                    }))
                  }
                  placeholder="0"
                  step="0.5"
                  type="number"
                  value={completeForm.laborHours}
                />
              </div>
              <div className="space-y-2">
                <Label>Parts Cost ($)</Label>
                <Input
                  onChange={(e) =>
                    setCompleteForm((p) => ({
                      ...p,
                      partsCost: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={completeForm.partsCost}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Labor Cost ($)</Label>
              <Input
                onChange={(e) =>
                  setCompleteForm((p) => ({
                    ...p,
                    laborCost: e.target.value,
                  }))
                }
                placeholder="0.00"
                step="0.01"
                type="number"
                value={completeForm.laborCost}
              />
            </div>
            <div className="space-y-2">
              <Label>Completion Notes</Label>
              <Textarea
                onChange={(e) =>
                  setCompleteForm((p) => ({
                    ...p,
                    notes: e.target.value,
                  }))
                }
                placeholder="Describe what was done..."
                rows={3}
                value={completeForm.notes}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowCompleteDialog(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={updatingStatus === completingWorkOrder?.id}
                type="submit"
              >
                {updatingStatus === completingWorkOrder?.id && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Mark Completed
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Work Order Dialog */}
      <Dialog
        onOpenChange={() => setViewWorkOrder(null)}
        open={!!viewWorkOrder}
      >
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
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusIcon(viewWorkOrder.status)}
                    <span className="capitalize">
                      {viewWorkOrder.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Priority</Label>
                  <div className="mt-1">
                    <Badge
                      variant={
                        getPriorityColor(viewWorkOrder.priority) as
                          | "destructive"
                          | "secondary"
                          | "outline"
                      }
                    >
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
                <p>{viewWorkOrder.assigned_vendor || "Unassigned"}</p>
              </div>
              {viewWorkOrder.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm">{viewWorkOrder.description}</p>
                </div>
              )}
              <div className="text-muted-foreground text-xs">
                Reported: {new Date(viewWorkOrder.reported_at).toLocaleString()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewWorkOrder(null)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
