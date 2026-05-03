"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { createWorkOrder } from "../../actions";
import { FacilitiesNavigation } from "../components/facilities-navigation";

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

export default function FacilitiesWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewWorkOrder, setViewWorkOrder] = useState<WorkOrder | null>(null);
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
    try {
      const res = await apiFetch("/api/facilities/work-orders/list?status=all");
      const data = await res.json();
      if (data.success) {
        setWorkOrders(data.data.workOrders || []);
      }
    } catch (error) {
      console.error("Failed to load work orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    setCreating(true);
    try {
      const result = await createWorkOrder({
        title: createForm.title,
        description: createForm.description || undefined,
        priority: createForm.priority,
        workOrderType: createForm.workOrderType,
        scheduledDate: createForm.scheduledDate || undefined,
        vendorId: createForm.assignedVendor || undefined,
      });
      setWorkOrders((prev) => [result, ...prev]);
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
    if (!dateStr) return "Not scheduled";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <FacilitiesNavigation />

      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Work Orders</h1>
            <p className="text-muted-foreground">
              Track maintenance issues, repairs, and inspections
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
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
                            <span className="font-mono text-sm text-muted-foreground">
                              {wo.work_order_number}
                            </span>
                            <span className="font-medium">{wo.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
                ))}
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
              <Input
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    scheduledDate: e.target.value,
                  }))
                }
                type="date"
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
                  <div className="flex items-center gap-2 mt-1">
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
              <div className="text-xs text-muted-foreground">
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
