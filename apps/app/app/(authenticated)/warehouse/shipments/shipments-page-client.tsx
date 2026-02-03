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
import { Separator } from "@repo/design-system/components/ui/separator";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  BoxIcon,
  DollarSignIcon,
  PlusIcon,
  RefreshCwIcon,
  TruckIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { listInventoryItems } from "../../../lib/use-inventory";
import {
  type CreateShipmentRequest,
  createShipment,
  formatCurrency,
  formatDate,
  getAllowedStatusTransitions,
  getItemConditionLabel,
  getShipmentStatusColor,
  getShipmentStatusLabel,
  listShipments,
  type Shipment,
  type ShipmentItem,
  type ShipmentStatus,
  type UpdateShipmentStatusRequest,
  updateShipmentStatus,
} from "../../../lib/use-shipments";

// Status filter options
const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "preparing", label: "Preparing" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const ShipmentsPageClient = () => {
  // Main data state
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null
  );
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Summary stats
  const [summary, setSummary] = useState({
    totalShipments: 0,
    byStatus: {} as Record<ShipmentStatus, number>,
    totalValue: 0,
    inTransitCount: 0,
    preparingCount: 0,
  });

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState<CreateShipmentRequest>({
    shipment_number: "",
    status: "draft",
    scheduled_date: "",
    estimated_delivery_date: "",
    shipping_cost: 0,
    tracking_number: "",
    carrier: "",
    shipping_method: "",
    notes: "",
    internal_notes: "",
  });

  // Status update form
  const [statusForm, setStatusForm] = useState<UpdateShipmentStatusRequest>({
    status: "draft",
    actual_delivery_date: "",
    delivered_by: "",
    received_by: "",
    signature: "",
    notes: "",
  });

  // Available inventory items for adding to shipment
  const [_inventoryItems, setInventoryItems] = useState<
    Array<{
      id: string;
      item_number: string;
      name: string;
      quantity_on_hand: number;
    }>
  >([]);

  // Add item form
  const [addItemForm, setAddItemForm] = useState({
    item_id: "",
    quantity_shipped: 0,
    unit_cost: 0,
    condition: "good",
    condition_notes: "",
    lot_number: "",
  });

  // Load shipments
  const loadShipments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listShipments({
        page,
        limit,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      setShipments(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
      setSummary(response.summary);
    } catch (error) {
      console.error("Failed to load shipments:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load shipments"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, searchQuery]);

  // Load inventory items for dropdown
  const loadInventoryItems = useCallback(async () => {
    try {
      const response = await listInventoryItems({
        limit: 100,
        stockStatus: "in_stock",
      });
      setInventoryItems(response.data);
    } catch (error) {
      console.error("Failed to load inventory items:", error);
    }
  }, []);

  // Load shipment items
  const loadShipmentItems = useCallback(async (shipmentId: string) => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/items`);
      if (response.ok) {
        const items = await response.json();
        setShipmentItems(items);
      }
    } catch (error) {
      console.error("Failed to load shipment items:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadShipments();
    loadInventoryItems();
  }, [loadShipments, loadInventoryItems]);

  // Handle create shipment
  const handleCreateShipment = async () => {
    setIsSubmitting(true);
    try {
      await createShipment(createForm);
      toast.success("Shipment created successfully");
      setIsCreateModalOpen(false);
      setCreateForm({
        shipment_number: "",
        status: "draft",
        scheduled_date: "",
        estimated_delivery_date: "",
        shipping_cost: 0,
        tracking_number: "",
        carrier: "",
        shipping_method: "",
        notes: "",
        internal_notes: "",
      });
      loadShipments();
    } catch (error) {
      console.error("Failed to create shipment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create shipment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedShipment) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateShipmentStatus(selectedShipment.id, statusForm);
      toast.success("Shipment status updated successfully");
      setIsStatusModalOpen(false);
      setSelectedShipment(null);
      loadShipments();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open status modal
  const openStatusModal = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setStatusForm({
      status: shipment.status,
      actual_delivery_date: shipment.actual_delivery_date
        ? new Date(shipment.actual_delivery_date).toISOString().split("T")[0]
        : "",
      delivered_by: shipment.delivered_by || "",
      received_by: shipment.received_by || "",
      signature: shipment.signature || "",
      notes: "",
    });
    setIsStatusModalOpen(true);
  };

  // Handle add item to shipment
  const _handleAddItem = async () => {
    if (!selectedShipment) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/shipments/${selectedShipment.id}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: addItemForm.item_id,
            quantity_shipped: addItemForm.quantity_shipped,
            unit_cost: addItemForm.unit_cost || 0,
            condition: addItemForm.condition,
            condition_notes: addItemForm.condition_notes || undefined,
            lot_number: addItemForm.lot_number || undefined,
          }),
        }
      );

      if (response.ok) {
        toast.success("Item added to shipment");
        setAddItemForm({
          item_id: "",
          quantity_shipped: 0,
          unit_cost: 0,
          condition: "good",
          condition_notes: "",
          lot_number: "",
        });
        loadShipmentItems(selectedShipment.id);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to add item");
      }
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add item"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get allowed status transitions
  const getAllowedTransitions = (shipment: Shipment): ShipmentStatus[] => {
    return getAllowedStatusTransitions(shipment.status);
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Warehouse Shipments</h1>
        <p className="text-muted-foreground">
          Manage warehouse shipments, tracking, and delivery status
        </p>
      </div>

      <Separator />

      {/* Performance Overview Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Performance Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Total Shipments</CardDescription>
              <BoxIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle>{summary.totalShipments}</CardTitle>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Total Value</CardDescription>
              <DollarSignIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle>{formatCurrency(summary.totalValue)}</CardTitle>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>In Transit</CardDescription>
              <TruckIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle>{summary.inTransitCount}</CardTitle>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>Preparing</CardDescription>
              <RefreshCwIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardTitle>{summary.preparingCount}</CardTitle>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Shipments Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Shipments ({totalCount})
          </h2>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            New Shipment
          </Button>
        </div>
        <Card>
          <CardContent className="space-y-4 pt-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search shipments..."
                value={searchQuery}
              />
            </div>
            <div className="min-w-[180px]">
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={(v) => {
                  setStatusFilter(v as ShipmentStatus | "all");
                  setPage(1);
                }}
                value={statusFilter}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Shipments Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-muted-foreground"
                      colSpan={8}
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : shipments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-center text-muted-foreground"
                      colSpan={8}
                    >
                      No shipments found
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium">
                        {shipment.shipment_number ||
                          `SHP-${shipment.id.slice(0, 8)}`}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getShipmentStatusColor(shipment.status)}
                        >
                          {getShipmentStatusLabel(shipment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {shipment.scheduled_date
                          ? formatDate(shipment.scheduled_date)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {shipment.location_id || shipment.event_id
                          ? `${shipment.location_id ? "Warehouse" : "Event"} → ${shipment.event_id || shipment.location_id || ""}`
                          : "-"}
                      </TableCell>
                      <TableCell>{shipment.total_items || 0}</TableCell>
                      <TableCell>
                        {shipment.total_value
                          ? formatCurrency(shipment.total_value)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {shipment.carrier || shipment.tracking_number
                          ? `${shipment.carrier || ""} ${shipment.tracking_number ? `(${shipment.tracking_number})` : ""}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedShipment(shipment);
                              loadShipmentItems(shipment.id);
                            }}
                            size="sm"
                            variant="outline"
                          >
                            View
                          </Button>
                          {getAllowedTransitions(shipment).length > 0 && (
                            <Button
                              onClick={() => openStatusModal(shipment)}
                              size="sm"
                              variant="outline"
                            >
                              Update Status
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalCount)} of {totalCount} shipments
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </section>

      {/* Selected Shipment Detail View */}
      {selectedShipment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedShipment.shipment_number ||
                    `SHP-${selectedShipment.id.slice(0, 8)}`}
                </CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge
                    className={getShipmentStatusColor(selectedShipment.status)}
                  >
                    {getShipmentStatusLabel(selectedShipment.status)}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={() => setSelectedShipment(null)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Shipment Details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Scheduled Date</Label>
                <div className="text-sm">
                  {selectedShipment.scheduled_date
                    ? formatDate(selectedShipment.scheduled_date)
                    : "-"}
                </div>
              </div>
              <div>
                <Label>Estimated Delivery</Label>
                <div className="text-sm">
                  {selectedShipment.estimated_delivery_date
                    ? formatDate(selectedShipment.estimated_delivery_date)
                    : "-"}
                </div>
              </div>
              <div>
                <Label>Carrier</Label>
                <div className="text-sm">{selectedShipment.carrier || "-"}</div>
              </div>
              <div>
                <Label>Tracking Number</Label>
                <div className="text-sm">
                  {selectedShipment.tracking_number || "-"}
                </div>
              </div>
              <div>
                <Label>Shipping Method</Label>
                <div className="text-sm">
                  {selectedShipment.shipping_method || "-"}
                </div>
              </div>
              <div>
                <Label>Shipping Cost</Label>
                <div className="text-sm">
                  {selectedShipment.shipping_cost
                    ? formatCurrency(selectedShipment.shipping_cost)
                    : "-"}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <div className="text-sm">{selectedShipment.notes || "-"}</div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Packing List ({selectedShipment.total_items} items)
                </h3>
                <Button
                  onClick={() => {
                    /* Open add item modal */
                  }}
                  size="sm"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {shipmentItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items in this shipment yet. Add items to create a packing
                  list.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity Shipped</TableHead>
                        <TableHead>Quantity Received</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipmentItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_id}</TableCell>
                          <TableCell>{item.quantity_shipped}</TableCell>
                          <TableCell>{item.quantity_received || 0}</TableCell>
                          <TableCell>
                            {item.condition ? (
                              <Badge variant="outline">
                                {getItemConditionLabel(item.condition)}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {item.unit_cost
                              ? formatCurrency(item.unit_cost)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(item.total_cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Shipment Modal */}
      <Dialog onOpenChange={setIsCreateModalOpen} open={isCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Shipment</DialogTitle>
            <DialogDescription>
              Create a new shipment for warehouse items
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="shipment_number">
                Shipment Number (Optional)
              </Label>
              <Input
                id="shipment_number"
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    shipment_number: e.target.value,
                  })
                }
                placeholder="Auto-generated if blank"
                value={createForm.shipment_number || ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scheduled_date">Scheduled Date *</Label>
              <Input
                id="scheduled_date"
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    scheduled_date: e.target.value,
                  })
                }
                type="date"
                value={createForm.scheduled_date || ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estimated_delivery_date">
                Estimated Delivery Date
              </Label>
              <Input
                id="estimated_delivery_date"
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    estimated_delivery_date: e.target.value,
                  })
                }
                type="date"
                value={createForm.estimated_delivery_date || ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Input
                  id="carrier"
                  onChange={(e) =>
                    setCreateForm({ ...createForm, carrier: e.target.value })
                  }
                  placeholder="FedEx, UPS, etc."
                  value={createForm.carrier || ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipping_method">Shipping Method</Label>
                <Input
                  id="shipping_method"
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      shipping_method: e.target.value,
                    })
                  }
                  placeholder="Ground, Overnight, etc."
                  value={createForm.shipping_method || ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="shipping_cost">Shipping Cost</Label>
                <Input
                  id="shipping_cost"
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      shipping_cost: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={createForm.shipping_cost || ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tracking_number">Tracking Number</Label>
                <Input
                  id="tracking_number"
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      tracking_number: e.target.value,
                    })
                  }
                  placeholder="Tracking number"
                  value={createForm.tracking_number || ""}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                onChange={(e) =>
                  setCreateForm({ ...createForm, notes: e.target.value })
                }
                placeholder="Delivery instructions, special handling, etc."
                value={createForm.notes || ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="internal_notes">Internal Notes</Label>
              <Textarea
                id="internal_notes"
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    internal_notes: e.target.value,
                  })
                }
                placeholder="Internal notes not visible to recipients"
                value={createForm.internal_notes || ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsCreateModalOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !createForm.scheduled_date}
              onClick={handleCreateShipment}
            >
              {isSubmitting ? "Creating..." : "Create Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog onOpenChange={setIsStatusModalOpen} open={isStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Shipment Status</DialogTitle>
            <DialogDescription>
              Update the status and delivery information for this shipment
            </DialogDescription>
          </DialogHeader>
          {selectedShipment && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="status">New Status *</Label>
                <Select
                  onValueChange={(v) =>
                    setStatusForm({
                      ...statusForm,
                      status: v as ShipmentStatus,
                    })
                  }
                  value={statusForm.status}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllowedTransitions(selectedShipment).map((status) => (
                      <SelectItem key={status} value={status}>
                        {getShipmentStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(statusForm.status === "delivered" ||
                statusForm.status === "returned") && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="actual_delivery_date">
                      Actual Delivery Date *
                    </Label>
                    <Input
                      id="actual_delivery_date"
                      onChange={(e) =>
                        setStatusForm({
                          ...statusForm,
                          actual_delivery_date: e.target.value,
                        })
                      }
                      type="date"
                      value={statusForm.actual_delivery_date || ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="received_by">Received By *</Label>
                    <Input
                      id="received_by"
                      onChange={(e) =>
                        setStatusForm({
                          ...statusForm,
                          received_by: e.target.value,
                        })
                      }
                      placeholder="Recipient name"
                      value={statusForm.received_by || ""}
                    />
                  </div>
                </>
              )}

              {statusForm.status === "in_transit" && (
                <div className="grid gap-2">
                  <Label htmlFor="tracking_number">Tracking Number</Label>
                  <Input
                    id="tracking_number"
                    onChange={(e) => {
                      if (selectedShipment) {
                        setSelectedShipment({
                          ...selectedShipment,
                          tracking_number: e.target.value,
                        });
                      }
                    }}
                    placeholder="Carrier tracking number"
                    value={selectedShipment.tracking_number || ""}
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="delivery_notes">Delivery Notes</Label>
                <Textarea
                  id="delivery_notes"
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, notes: e.target.value })
                  }
                  placeholder="Any additional notes about the delivery"
                  value={statusForm.notes || ""}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setIsStatusModalOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} onClick={handleStatusUpdate}>
              {isSubmitting ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
