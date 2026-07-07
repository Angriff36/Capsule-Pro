"use client";

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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { listShipments } from "@/app/lib/manifest-client.generated";

const fmtCurrency = (v: number | null) =>
  formatCurrency(v, { nullDisplay: "\u2014" });

// Types matching the API
interface Shipment {
  actualDeliveryDate: string | null;
  carrier: string | null;
  createdAt: string;
  estimatedDeliveryDate: string | null;
  eventId: string | null;
  id: string;
  notes: string | null;
  scheduledDate: string | null;
  shipmentNumber: string;
  shippedDate: string | null;
  shippingCost: number | null;
  shippingMethod: string | null;
  status: string;
  supplierId: string | null;
  totalItems: number;
  totalValue: number | null;
  trackingNumber: string | null;
}

function normalizeShipment(payload: Record<string, unknown>): Shipment {
  return {
    id: String(payload.id ?? ""),
    shipmentNumber: String(
      payload.shipmentNumber ?? payload.shipment_number ?? ""
    ),
    status: String(payload.status ?? "draft"),
    eventId:
      typeof (payload.eventId ?? payload.event_id) === "string"
        ? String(payload.eventId ?? payload.event_id)
        : null,
    supplierId:
      typeof (payload.supplierId ?? payload.supplier_id) === "string"
        ? String(payload.supplierId ?? payload.supplier_id)
        : null,
    scheduledDate:
      typeof (payload.scheduledDate ?? payload.scheduled_date) === "string"
        ? String(payload.scheduledDate ?? payload.scheduled_date)
        : null,
    shippedDate:
      typeof (payload.shippedDate ?? payload.shipped_date) === "string"
        ? String(payload.shippedDate ?? payload.shipped_date)
        : null,
    estimatedDeliveryDate:
      typeof (
        payload.estimatedDeliveryDate ?? payload.estimated_delivery_date
      ) === "string"
        ? String(
            payload.estimatedDeliveryDate ?? payload.estimated_delivery_date
          )
        : null,
    actualDeliveryDate:
      typeof (payload.actualDeliveryDate ?? payload.actual_delivery_date) ===
      "string"
        ? String(payload.actualDeliveryDate ?? payload.actual_delivery_date)
        : null,
    totalItems: Number(payload.totalItems ?? payload.total_items ?? 0),
    shippingCost:
      (payload.shippingCost ?? payload.shipping_cost)
        ? Number(payload.shippingCost ?? payload.shipping_cost)
        : null,
    totalValue:
      (payload.totalValue ?? payload.total_value)
        ? Number(payload.totalValue ?? payload.total_value)
        : null,
    trackingNumber:
      typeof (payload.trackingNumber ?? payload.tracking_number) === "string"
        ? String(payload.trackingNumber ?? payload.tracking_number)
        : null,
    carrier:
      typeof payload.carrier === "string" ? String(payload.carrier) : null,
    shippingMethod:
      typeof (payload.shippingMethod ?? payload.shipping_method) === "string"
        ? String(payload.shippingMethod ?? payload.shipping_method)
        : null,
    notes: typeof payload.notes === "string" ? String(payload.notes) : null,
    createdAt: String(payload.createdAt ?? payload.created_at ?? ""),
  };
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  draft: {
    label: "Draft",
    color: "bg-muted/50 text-foreground",
    icon: Package,
  },
  scheduled: {
    label: "Scheduled",
    color: "bg-muted/50 text-foreground",
    icon: Calendar,
  },
  preparing: {
    label: "Preparing",
    color: "bg-muted/50 text-foreground",
    icon: Clock,
  },
  in_transit: {
    label: "In Transit",
    color: "bg-muted/50 text-foreground",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "bg-muted/50 text-foreground",
    icon: CheckCircle2,
  },
  returned: {
    label: "Returned",
    color: "bg-muted/50 text-foreground",
    icon: AlertCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-muted/50 text-foreground",
    icon: XCircle,
  },
};

/** Non-null status lookup for `noUncheckedIndexedAccess`. */
const getShipmentStatusConfig = (status: string) =>
  STATUS_CONFIG[status] ??
  (STATUS_CONFIG.draft as NonNullable<(typeof STATUS_CONFIG)[string]>);

const STATUS_ORDER = [
  "draft",
  "scheduled",
  "preparing",
  "in_transit",
  "delivered",
  "returned",
  "cancelled",
];

export function ShipmentsClient() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null
  );
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    trackingNumber: "",
    carrier: "",
    shippingMethod: "standard",
    estimatedDeliveryDate: "",
    shippingCost: "",
    notes: "",
  });
  const [createForm, setCreateForm] = useState({
    trackingNumber: "",
    carrier: "",
    shippingMethod: "standard",
    scheduledDate: "",
    estimatedDeliveryDate: "",
    shippingCost: "",
    notes: "",
  });

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listShipments();
      const shipmentData = result.data as unknown as Record<string, unknown>[];
      setShipments(
        shipmentData.map((shipment: Record<string, unknown>) =>
          normalizeShipment(shipment)
        )
      );
    } catch {
      // A failed fetch must not render as "no shipments".
      setLoadError("Could not load shipments. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await apiFetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: createForm.trackingNumber || undefined,
          carrier: createForm.carrier || undefined,
          shippingMethod: createForm.shippingMethod || undefined,
          scheduledDate: createForm.scheduledDate || undefined,
          estimatedDeliveryDate: createForm.estimatedDeliveryDate || undefined,
          shippingCost: createForm.shippingCost
            ? Number.parseFloat(createForm.shippingCost)
            : undefined,
          notes: createForm.notes || undefined,
        }),
      });
      if (res.ok) {
        await loadShipments();
        setShowCreateDialog(false);
        setCreateForm({
          trackingNumber: "",
          carrier: "",
          shippingMethod: "standard",
          scheduledDate: "",
          estimatedDeliveryDate: "",
          shippingCost: "",
          notes: "",
        });
      }
    } catch (error) {
      console.error("Failed to create shipment:", error);
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (shipment: Shipment) => {
    setEditForm({
      trackingNumber: shipment.trackingNumber || "",
      carrier: shipment.carrier || "",
      shippingMethod: shipment.shippingMethod || "standard",
      estimatedDeliveryDate:
        shipment.estimatedDeliveryDate?.split("T")[0] || "",
      shippingCost: shipment.shippingCost?.toString() || "",
      notes: shipment.notes || "",
    });
    setSelectedShipment(shipment);
    setShowEditDialog(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) {
      return;
    }
    setUpdating(true);
    try {
      const res = await apiFetch(`/api/shipments/${selectedShipment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: editForm.trackingNumber || undefined,
          carrier: editForm.carrier || undefined,
          shippingMethod: editForm.shippingMethod || undefined,
          shippingCost: editForm.shippingCost
            ? Number.parseFloat(editForm.shippingCost)
            : undefined,
          estimatedDeliveryDate: editForm.estimatedDeliveryDate || undefined,
          notes: editForm.notes || undefined,
        }),
      });
      if (res.ok) {
        const updated = normalizeShipment(await res.json());
        setShipments((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        setSelectedShipment(updated);
        setShowEditDialog(false);
      }
    } catch (error) {
      console.error("Failed to update shipment:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (shipmentId: string, status: string) => {
    try {
      const commandMap: Record<string, string> = {
        scheduled: "schedule",
        preparing: "start-preparing",
        in_transit: "ship",
        delivered: "mark-delivered",
        cancelled: "cancel",
      };

      if (!commandMap[status]) {
        return;
      }

      const res = await apiFetch(`/api/shipments/${shipmentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        const updatedShipment = normalizeShipment(
          data as Record<string, unknown>
        );
        setShipments((prev) =>
          prev.map((s) => (s.id === shipmentId ? updatedShipment : s))
        );
      }
    } catch (error) {
      console.error("Failed to update shipment status:", error);
    }
  };

  const filteredShipments = useMemo(
    () =>
      shipments.filter((s) => {
        const matchesTab = activeTab === "all" || s.status === activeTab;
        const matchesSearch =
          !searchQuery ||
          s.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.carrier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
      }),
    [shipments, activeTab, searchQuery]
  );

  const stats = useMemo(
    () => ({
      total: shipments.length,
      active: shipments.filter((s) =>
        ["scheduled", "preparing", "in_transit"].includes(s.status)
      ).length,
      delivered: shipments.filter((s) => s.status === "delivered").length,
      totalValue: shipments.reduce(
        (sum, s) => sum + (Number(s.totalValue) || 0),
        0
      ),
    }),
    [shipments]
  );

  const getNextStatus = (currentStatus: string): string | null => {
    const idx = STATUS_ORDER.indexOf(currentStatus);
    if (idx === -1 || idx >= STATUS_ORDER.length - 2) {
      return null; // Don't suggest "returned"
    }
    return STATUS_ORDER[idx + 1] ?? null;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) {
      return "—";
    }
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl">Shipments</h1>
          <p className="text-muted-foreground">
            Track incoming and outgoing shipments across your supply chain.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Shipment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Total Shipments
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.total}</div>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Active</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.active}</div>
            <p className="text-muted-foreground text-xs">In progress</p>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {fmtCurrency(stats.totalValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shipment #, carrier, or tracking..."
            value={searchQuery}
          />
        </div>
      </div>

      {/* Tabs & Table */}
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="all">All ({shipments.length})</TabsTrigger>
          {STATUS_ORDER.slice(0, 5).map((status) => {
            const count = shipments.filter((s) => s.status === status).length;
            if (count === 0) {
              return null;
            }
            const config = STATUS_CONFIG[status];
            return (
              <TabsTrigger key={status} value={status}>
                {config?.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab}>
          {loadError ? (
            <Card tone="canvas">
              <CardContent className="py-8">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Package />
                    </EmptyMedia>
                    <EmptyTitle>Couldn't load shipments</EmptyTitle>
                    <EmptyDescription>{loadError}</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button onClick={loadShipments} variant="outline">
                      Retry
                    </Button>
                  </EmptyContent>
                </Empty>
              </CardContent>
            </Card>
          ) : filteredShipments.length === 0 ? (
            <Card tone="canvas">
              <CardContent className="py-8">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Package />
                    </EmptyMedia>
                    <EmptyTitle>No shipments found</EmptyTitle>
                    <EmptyDescription>
                      {searchQuery
                        ? "Try adjusting your search or clear the filter."
                        : "Create shipments to track incoming and outgoing deliveries."}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <p className="text-muted-foreground text-xs">
                      {searchQuery
                        ? "Modify your search terms above."
                        : "Click "}
                      {!searchQuery && (
                        <>
                          <strong>New Shipment</strong> above to create your
                          first shipment.
                        </>
                      )}
                    </p>
                  </EmptyContent>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredShipments.map((shipment) => {
                const statusConfig = getShipmentStatusConfig(shipment.status);
                const StatusIcon = statusConfig.icon;
                const nextStatus = getNextStatus(shipment.status);

                return (
                  <Card
                    className="transition-shadow hover:border-primary/40"
                    key={shipment.id}
                    tone="canvas"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Status indicator */}
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${statusConfig.color}`}
                        >
                          <StatusIcon className="h-5 w-5" />
                        </div>

                        {/* Main info */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <button
                              className="text-left font-semibold hover:underline"
                              onClick={() => {
                                setSelectedShipment(shipment);
                                setShowDetailDialog(true);
                              }}
                            >
                              {shipment.shipmentNumber}
                            </button>
                            <Badge className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-muted-foreground text-sm">
                            {shipment.carrier && (
                              <span className="flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                {shipment.carrier}
                              </span>
                            )}
                            {shipment.trackingNumber && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {shipment.trackingNumber}
                              </span>
                            )}
                            <span>{shipment.totalItems} items</span>
                            {shipment.totalValue && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {fmtCurrency(shipment.totalValue)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="hidden flex-col items-end gap-1 text-muted-foreground text-sm md:flex">
                          {shipment.scheduledDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Scheduled: {formatDate(shipment.scheduledDate)}
                            </span>
                          )}
                          {shipment.estimatedDeliveryDate && (
                            <span>
                              ETA: {formatDate(shipment.estimatedDeliveryDate)}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {!["delivered", "cancelled", "returned"].includes(
                            shipment.status
                          ) && (
                            <Button
                              onClick={() => openEditDialog(shipment)}
                              size="icon"
                              title="Edit shipment details"
                              variant="ghost"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {nextStatus && (
                            <Button
                              onClick={() =>
                                handleStatusUpdate(shipment.id, nextStatus)
                              }
                              size="sm"
                              variant="outline"
                            >
                              {nextStatus === "scheduled" && "Schedule"}
                              {nextStatus === "preparing" && "Start Preparing"}
                              {nextStatus === "in_transit" && "Ship"}
                              {nextStatus === "delivered" && "Mark Delivered"}
                            </Button>
                          )}
                          {shipment.status === "draft" && (
                            <Button
                              onClick={() =>
                                handleStatusUpdate(shipment.id, "cancelled")
                              }
                              size="sm"
                              variant="destructive"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Shipment Dialog */}
      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Shipment</DialogTitle>
            <DialogDescription>
              Add a new shipment to track in your logistics pipeline.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      trackingNumber: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                  value={createForm.trackingNumber}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Input
                  id="carrier"
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, carrier: e.target.value }))
                  }
                  placeholder="e.g., FedEx, UPS"
                  value={createForm.carrier}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shippingMethod">Shipping Method</Label>
                <Select
                  onValueChange={(v) =>
                    setCreateForm((p) => ({ ...p, shippingMethod: v }))
                  }
                  value={createForm.shippingMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="express">Express</SelectItem>
                    <SelectItem value="overnight">Overnight</SelectItem>
                    <SelectItem value="freight">Freight</SelectItem>
                    <SelectItem value="will_call">
                      Will Call / Pickup
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingCost">Shipping Cost</Label>
                <Input
                  id="shippingCost"
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      shippingCost: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={createForm.shippingCost}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <DatePicker
                  id="scheduledDate"
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      scheduledDate: e.target.value,
                    }))
                  }
                  value={createForm.scheduledDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedDeliveryDate">Est. Delivery</Label>
                <DatePicker
                  id="estimatedDeliveryDate"
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      estimatedDeliveryDate: e.target.value,
                    }))
                  }
                  value={createForm.estimatedDeliveryDate}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Internal notes about this shipment..."
                rows={3}
                value={createForm.notes}
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
              <Button disabled={creating} type="submit">
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Shipment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shipment Detail Dialog */}
      <Dialog onOpenChange={setShowDetailDialog} open={showDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedShipment?.shipmentNumber}
              {selectedShipment && (
                <Badge
                  className={STATUS_CONFIG[selectedShipment.status]?.color}
                >
                  {STATUS_CONFIG[selectedShipment.status]?.label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>Shipment details</DialogDescription>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Carrier</p>
                  <p className="font-medium">
                    {selectedShipment.carrier || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Method</p>
                  <p className="font-medium capitalize">
                    {selectedShipment.shippingMethod || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tracking #</p>
                  <p className="font-medium">
                    {selectedShipment.trackingNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Items</p>
                  <p className="font-medium">{selectedShipment.totalItems}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Shipping Cost</p>
                  <p className="font-medium">
                    {fmtCurrency(selectedShipment.shippingCost)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Value</p>
                  <p className="font-medium">
                    {fmtCurrency(selectedShipment.totalValue)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Scheduled</p>
                  <p className="font-medium">
                    {formatDate(selectedShipment.scheduledDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. Delivery</p>
                  <p className="font-medium">
                    {formatDate(selectedShipment.estimatedDeliveryDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Shipped</p>
                  <p className="font-medium">
                    {formatDate(selectedShipment.shippedDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Delivered</p>
                  <p className="font-medium">
                    {formatDate(selectedShipment.actualDeliveryDate)}
                  </p>
                </div>
              </div>
              {selectedShipment.notes && (
                <div>
                  <p className="mb-1 text-muted-foreground text-sm">Notes</p>
                  <p className="rounded-md bg-muted p-3 text-sm">
                    {selectedShipment.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Shipment Dialog */}
      <Dialog onOpenChange={setShowEditDialog} open={showEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Shipment</DialogTitle>
            <DialogDescription>
              Update tracking, carrier, and delivery details for{" "}
              {selectedShipment?.shipmentNumber}.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEdit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-trackingNumber">Tracking Number</Label>
                <Input
                  id="edit-trackingNumber"
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      trackingNumber: e.target.value,
                    }))
                  }
                  value={editForm.trackingNumber}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-carrier">Carrier</Label>
                <Input
                  id="edit-carrier"
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, carrier: e.target.value }))
                  }
                  value={editForm.carrier}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-shippingMethod">Shipping Method</Label>
                <Select
                  onValueChange={(v) =>
                    setEditForm((p) => ({ ...p, shippingMethod: v }))
                  }
                  value={editForm.shippingMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="express">Express</SelectItem>
                    <SelectItem value="overnight">Overnight</SelectItem>
                    <SelectItem value="freight">Freight</SelectItem>
                    <SelectItem value="will_call">
                      Will Call / Pickup
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-shippingCost">Shipping Cost</Label>
                <Input
                  id="edit-shippingCost"
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      shippingCost: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={editForm.shippingCost}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-estimatedDeliveryDate">
                Est. Delivery Date
              </Label>
              <DatePicker
                id="edit-estimatedDeliveryDate"
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    estimatedDeliveryDate: e.target.value,
                  }))
                }
                value={editForm.estimatedDeliveryDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, notes: e.target.value }))
                }
                rows={3}
                value={editForm.notes}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowEditDialog(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={updating} type="submit">
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
