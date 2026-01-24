"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipmentsPageClient = void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const use_shipments_1 = require("../../../lib/use-shipments");
const use_inventory_1 = require("../../../lib/use-inventory");
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
];
const ShipmentsPageClient = () => {
  // Main data state
  const [shipments, setShipments] = (0, react_1.useState)([]);
  const [selectedShipment, setSelectedShipment] = (0, react_1.useState)(null);
  const [shipmentItems, setShipmentItems] = (0, react_1.useState)([]);
  // Loading state
  const [isLoading, setIsLoading] = (0, react_1.useState)(true);
  const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
  // Pagination
  const [page, setPage] = (0, react_1.useState)(1);
  const [limit] = (0, react_1.useState)(20);
  const [totalPages, setTotalPages] = (0, react_1.useState)(1);
  const [totalCount, setTotalCount] = (0, react_1.useState)(0);
  // Filters
  const [statusFilter, setStatusFilter] = (0, react_1.useState)("all");
  const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
  // Summary stats
  const [summary, setSummary] = (0, react_1.useState)({
    totalShipments: 0,
    byStatus: {},
    totalValue: 0,
    inTransitCount: 0,
    preparingCount: 0,
  });
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = (0, react_1.useState)(
    false
  );
  const [isStatusModalOpen, setIsStatusModalOpen] = (0, react_1.useState)(
    false
  );
  // Create form state
  const [createForm, setCreateForm] = (0, react_1.useState)({
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
  const [statusForm, setStatusForm] = (0, react_1.useState)({
    status: "draft",
    actual_delivery_date: "",
    delivered_by: "",
    received_by: "",
    signature: "",
    notes: "",
  });
  // Available inventory items for adding to shipment
  const [inventoryItems, setInventoryItems] = (0, react_1.useState)([]);
  // Add item form
  const [addItemForm, setAddItemForm] = (0, react_1.useState)({
    item_id: "",
    quantity_shipped: 0,
    unit_cost: 0,
    condition: "good",
    condition_notes: "",
    lot_number: "",
  });
  // Load shipments
  const loadShipments = (0, react_1.useCallback)(async () => {
    setIsLoading(true);
    try {
      const response = await (0, use_shipments_1.listShipments)({
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
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to load shipments"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, searchQuery]);
  // Load inventory items for dropdown
  const loadInventoryItems = (0, react_1.useCallback)(async () => {
    try {
      const response = await (0, use_inventory_1.listInventoryItems)({
        limit: 100,
        stockStatus: "in_stock",
      });
      setInventoryItems(response.data);
    } catch (error) {
      console.error("Failed to load inventory items:", error);
    }
  }, []);
  // Load shipment items
  const loadShipmentItems = (0, react_1.useCallback)(async (shipmentId) => {
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
  (0, react_1.useEffect)(() => {
    loadShipments();
    loadInventoryItems();
  }, [loadShipments, loadInventoryItems]);
  // Handle create shipment
  const handleCreateShipment = async () => {
    setIsSubmitting(true);
    try {
      await (0, use_shipments_1.createShipment)(createForm);
      sonner_1.toast.success("Shipment created successfully");
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
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to create shipment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedShipment) return;
    setIsSubmitting(true);
    try {
      await (0, use_shipments_1.updateShipmentStatus)(
        selectedShipment.id,
        statusForm
      );
      sonner_1.toast.success("Shipment status updated successfully");
      setIsStatusModalOpen(false);
      setSelectedShipment(null);
      loadShipments();
    } catch (error) {
      console.error("Failed to update status:", error);
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  // Open status modal
  const openStatusModal = (shipment) => {
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
  const handleAddItem = async () => {
    if (!selectedShipment) return;
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
        sonner_1.toast.success("Item added to shipment");
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
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to add item"
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  // Get allowed status transitions
  const getAllowedTransitions = (shipment) => {
    return (0, use_shipments_1.getAllowedStatusTransitions)(shipment.status);
  };
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Total Shipments
            </card_1.CardTitle>
            <lucide_react_1.BoxIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{summary.totalShipments}</div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Total Value
            </card_1.CardTitle>
            <lucide_react_1.DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              {(0, use_shipments_1.formatCurrency)(summary.totalValue)}
            </div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              In Transit
            </card_1.CardTitle>
            <lucide_react_1.TruckIcon className="h-4 w-4 text-purple-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summary.inTransitCount}
            </div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Preparing
            </card_1.CardTitle>
            <lucide_react_1.RefreshCwIcon className="h-4 w-4 text-yellow-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.preparingCount}
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Main Content Card */}
      <card_1.Card>
        <card_1.CardHeader>
          <div className="flex items-center justify-between">
            <card_1.CardTitle>Warehouse Shipments</card_1.CardTitle>
            <button_1.Button onClick={() => setIsCreateModalOpen(true)}>
              <lucide_react_1.PlusIcon className="mr-2 h-4 w-4" />
              New Shipment
            </button_1.Button>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label_1.Label htmlFor="search">Search</label_1.Label>
              <input_1.Input
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
              <label_1.Label htmlFor="status">Status</label_1.Label>
              <select_1.Select
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
                value={statusFilter}
              >
                <select_1.SelectTrigger id="status">
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {STATUS_FILTERS.map((filter) => (
                    <select_1.SelectItem
                      key={filter.value}
                      value={filter.value}
                    >
                      {filter.label}
                    </select_1.SelectItem>
                  ))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>
          </div>

          {/* Shipments Table */}
          <div className="rounded-md border">
            <table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead>Shipment #</table_1.TableHead>
                  <table_1.TableHead>Status</table_1.TableHead>
                  <table_1.TableHead>Scheduled Date</table_1.TableHead>
                  <table_1.TableHead>Route</table_1.TableHead>
                  <table_1.TableHead>Items</table_1.TableHead>
                  <table_1.TableHead>Value</table_1.TableHead>
                  <table_1.TableHead>Carrier</table_1.TableHead>
                  <table_1.TableHead>Actions</table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {isLoading ? (
                  <table_1.TableRow>
                    <table_1.TableCell
                      className="text-center text-muted-foreground"
                      colSpan={8}
                    >
                      Loading...
                    </table_1.TableCell>
                  </table_1.TableRow>
                ) : shipments.length === 0 ? (
                  <table_1.TableRow>
                    <table_1.TableCell
                      className="text-center text-muted-foreground"
                      colSpan={8}
                    >
                      No shipments found
                    </table_1.TableCell>
                  </table_1.TableRow>
                ) : (
                  shipments.map((shipment) => (
                    <table_1.TableRow key={shipment.id}>
                      <table_1.TableCell className="font-medium">
                        {shipment.shipment_number ||
                          `SHP-${shipment.id.slice(0, 8)}`}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <badge_1.Badge
                          className={(0,
                          use_shipments_1.getShipmentStatusColor)(
                            shipment.status
                          )}
                        >
                          {(0, use_shipments_1.getShipmentStatusLabel)(
                            shipment.status
                          )}
                        </badge_1.Badge>
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {shipment.scheduled_date
                          ? (0, use_shipments_1.formatDate)(
                              shipment.scheduled_date
                            )
                          : "-"}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {shipment.location_id || shipment.event_id
                          ? `${shipment.location_id ? "Warehouse" : "Event"} → ${shipment.event_id || shipment.location_id || ""}`
                          : "-"}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {shipment.total_items || 0}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {shipment.total_value
                          ? (0, use_shipments_1.formatCurrency)(
                              shipment.total_value
                            )
                          : "-"}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {shipment.carrier || shipment.tracking_number
                          ? `${shipment.carrier || ""} ${shipment.tracking_number ? `(${shipment.tracking_number})` : ""}`
                          : "-"}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <div className="flex gap-2">
                          <button_1.Button
                            onClick={() => {
                              setSelectedShipment(shipment);
                              loadShipmentItems(shipment.id);
                            }}
                            size="sm"
                            variant="outline"
                          >
                            View
                          </button_1.Button>
                          {getAllowedTransitions(shipment).length > 0 && (
                            <button_1.Button
                              onClick={() => openStatusModal(shipment)}
                              size="sm"
                              variant="outline"
                            >
                              Update Status
                            </button_1.Button>
                          )}
                        </div>
                      </table_1.TableCell>
                    </table_1.TableRow>
                  ))
                )}
              </table_1.TableBody>
            </table_1.Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalCount)} of {totalCount} shipments
              </div>
              <div className="flex gap-2">
                <button_1.Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </button_1.Button>
                <button_1.Button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  size="sm"
                  variant="outline"
                >
                  Next
                </button_1.Button>
              </div>
            </div>
          )}
        </card_1.CardContent>
      </card_1.Card>

      {/* Selected Shipment Detail View */}
      {selectedShipment && (
        <card_1.Card>
          <card_1.CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <card_1.CardTitle>
                  {selectedShipment.shipment_number ||
                    `SHP-${selectedShipment.id.slice(0, 8)}`}
                </card_1.CardTitle>
                <div className="flex gap-2 mt-2">
                  <badge_1.Badge
                    className={(0, use_shipments_1.getShipmentStatusColor)(
                      selectedShipment.status
                    )}
                  >
                    {(0, use_shipments_1.getShipmentStatusLabel)(
                      selectedShipment.status
                    )}
                  </badge_1.Badge>
                </div>
              </div>
              <button_1.Button
                onClick={() => setSelectedShipment(null)}
                variant="outline"
              >
                Close
              </button_1.Button>
            </div>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-6">
            {/* Shipment Details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label_1.Label>Scheduled Date</label_1.Label>
                <div className="text-sm">
                  {selectedShipment.scheduled_date
                    ? (0, use_shipments_1.formatDate)(
                        selectedShipment.scheduled_date
                      )
                    : "-"}
                </div>
              </div>
              <div>
                <label_1.Label>Estimated Delivery</label_1.Label>
                <div className="text-sm">
                  {selectedShipment.estimated_delivery_date
                    ? (0, use_shipments_1.formatDate)(
                        selectedShipment.estimated_delivery_date
                      )
                    : "-"}
                </div>
              </div>
              <div>
                <label_1.Label>Carrier</label_1.Label>
                <div className="text-sm">{selectedShipment.carrier || "-"}</div>
              </div>
              <div>
                <label_1.Label>Tracking Number</label_1.Label>
                <div className="text-sm">
                  {selectedShipment.tracking_number || "-"}
                </div>
              </div>
              <div>
                <label_1.Label>Shipping Method</label_1.Label>
                <div className="text-sm">
                  {selectedShipment.shipping_method || "-"}
                </div>
              </div>
              <div>
                <label_1.Label>Shipping Cost</label_1.Label>
                <div className="text-sm">
                  {selectedShipment.shipping_cost
                    ? (0, use_shipments_1.formatCurrency)(
                        selectedShipment.shipping_cost
                      )
                    : "-"}
                </div>
              </div>
              <div className="md:col-span-2">
                <label_1.Label>Notes</label_1.Label>
                <div className="text-sm">{selectedShipment.notes || "-"}</div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Packing List ({selectedShipment.total_items} items)
                </h3>
                <button_1.Button
                  onClick={() => {
                    /* Open add item modal */
                  }}
                  size="sm"
                >
                  <lucide_react_1.PlusIcon className="mr-2 h-4 w-4" />
                  Add Item
                </button_1.Button>
              </div>

              {shipmentItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items in this shipment yet. Add items to create a packing
                  list.
                </div>
              ) : (
                <div className="rounded-md border">
                  <table_1.Table>
                    <table_1.TableHeader>
                      <table_1.TableRow>
                        <table_1.TableHead>Item</table_1.TableHead>
                        <table_1.TableHead>Quantity Shipped</table_1.TableHead>
                        <table_1.TableHead>Quantity Received</table_1.TableHead>
                        <table_1.TableHead>Condition</table_1.TableHead>
                        <table_1.TableHead>Unit Cost</table_1.TableHead>
                        <table_1.TableHead>Total Cost</table_1.TableHead>
                      </table_1.TableRow>
                    </table_1.TableHeader>
                    <table_1.TableBody>
                      {shipmentItems.map((item) => (
                        <table_1.TableRow key={item.id}>
                          <table_1.TableCell>{item.item_id}</table_1.TableCell>
                          <table_1.TableCell>
                            {item.quantity_shipped}
                          </table_1.TableCell>
                          <table_1.TableCell>
                            {item.quantity_received || 0}
                          </table_1.TableCell>
                          <table_1.TableCell>
                            {item.condition ? (
                              <badge_1.Badge variant="outline">
                                {(0, use_shipments_1.getItemConditionLabel)(
                                  item.condition
                                )}
                              </badge_1.Badge>
                            ) : (
                              "-"
                            )}
                          </table_1.TableCell>
                          <table_1.TableCell>
                            {item.unit_cost
                              ? (0, use_shipments_1.formatCurrency)(
                                  item.unit_cost
                                )
                              : "-"}
                          </table_1.TableCell>
                          <table_1.TableCell>
                            {(0, use_shipments_1.formatCurrency)(
                              item.total_cost
                            )}
                          </table_1.TableCell>
                        </table_1.TableRow>
                      ))}
                    </table_1.TableBody>
                  </table_1.Table>
                </div>
              )}
            </div>
          </card_1.CardContent>
        </card_1.Card>
      )}

      {/* Create Shipment Modal */}
      <dialog_1.Dialog
        onOpenChange={setIsCreateModalOpen}
        open={isCreateModalOpen}
      >
        <dialog_1.DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Create New Shipment</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Create a new shipment for warehouse items
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label_1.Label htmlFor="shipment_number">
                Shipment Number (Optional)
              </label_1.Label>
              <input_1.Input
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
              <label_1.Label htmlFor="scheduled_date">
                Scheduled Date *
              </label_1.Label>
              <input_1.Input
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
              <label_1.Label htmlFor="estimated_delivery_date">
                Estimated Delivery Date
              </label_1.Label>
              <input_1.Input
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
                <label_1.Label htmlFor="carrier">Carrier</label_1.Label>
                <input_1.Input
                  id="carrier"
                  onChange={(e) =>
                    setCreateForm({ ...createForm, carrier: e.target.value })
                  }
                  placeholder="FedEx, UPS, etc."
                  value={createForm.carrier || ""}
                />
              </div>
              <div className="grid gap-2">
                <label_1.Label htmlFor="shipping_method">
                  Shipping Method
                </label_1.Label>
                <input_1.Input
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
                <label_1.Label htmlFor="shipping_cost">
                  Shipping Cost
                </label_1.Label>
                <input_1.Input
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
                <label_1.Label htmlFor="tracking_number">
                  Tracking Number
                </label_1.Label>
                <input_1.Input
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
              <label_1.Label htmlFor="notes">Notes</label_1.Label>
              <textarea_1.Textarea
                id="notes"
                onChange={(e) =>
                  setCreateForm({ ...createForm, notes: e.target.value })
                }
                placeholder="Delivery instructions, special handling, etc."
                value={createForm.notes || ""}
              />
            </div>
            <div className="grid gap-2">
              <label_1.Label htmlFor="internal_notes">
                Internal Notes
              </label_1.Label>
              <textarea_1.Textarea
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
          <dialog_1.DialogFooter>
            <button_1.Button
              onClick={() => setIsCreateModalOpen(false)}
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button
              disabled={isSubmitting || !createForm.scheduled_date}
              onClick={handleCreateShipment}
            >
              {isSubmitting ? "Creating..." : "Create Shipment"}
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* Status Update Modal */}
      <dialog_1.Dialog
        onOpenChange={setIsStatusModalOpen}
        open={isStatusModalOpen}
      >
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Update Shipment Status</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Update the status and delivery information for this shipment
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          {selectedShipment && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label_1.Label htmlFor="status">New Status *</label_1.Label>
                <select_1.Select
                  onValueChange={(v) =>
                    setStatusForm({ ...statusForm, status: v })
                  }
                  value={statusForm.status}
                >
                  <select_1.SelectTrigger id="status">
                    <select_1.SelectValue />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    {getAllowedTransitions(selectedShipment).map((status) => (
                      <select_1.SelectItem key={status} value={status}>
                        {(0, use_shipments_1.getShipmentStatusLabel)(status)}
                      </select_1.SelectItem>
                    ))}
                  </select_1.SelectContent>
                </select_1.Select>
              </div>

              {(statusForm.status === "delivered" ||
                statusForm.status === "returned") && (
                <>
                  <div className="grid gap-2">
                    <label_1.Label htmlFor="actual_delivery_date">
                      Actual Delivery Date *
                    </label_1.Label>
                    <input_1.Input
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
                    <label_1.Label htmlFor="received_by">
                      Received By *
                    </label_1.Label>
                    <input_1.Input
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
                <>
                  <div className="grid gap-2">
                    <label_1.Label htmlFor="tracking_number">
                      Tracking Number
                    </label_1.Label>
                    <input_1.Input
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
                </>
              )}

              <div className="grid gap-2">
                <label_1.Label htmlFor="delivery_notes">
                  Delivery Notes
                </label_1.Label>
                <textarea_1.Textarea
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
          <dialog_1.DialogFooter>
            <button_1.Button
              onClick={() => setIsStatusModalOpen(false)}
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button
              disabled={isSubmitting}
              onClick={handleStatusUpdate}
            >
              {isSubmitting ? "Updating..." : "Update Status"}
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>
  );
};
exports.ShipmentsPageClient = ShipmentsPageClient;
