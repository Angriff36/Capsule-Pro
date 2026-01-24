"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.StockLevelsPageClient = void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const tabs_1 = require("@repo/design-system/components/ui/tabs");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const use_stock_levels_1 = require("../../../lib/use-stock-levels");
const use_inventory_1 = require("../../../lib/use-inventory");
// Filter options
const REORDER_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "below_par", label: "Below Par" },
  { value: "at_par", label: "At Par" },
  { value: "above_par", label: "Above Par" },
];
const StockLevelsPageClient = () => {
  // Main data state
  const [stockLevels, setStockLevels] = (0, react_1.useState)([]);
  const [transactions, setTransactions] = (0, react_1.useState)([]);
  const [locations, setLocations] = (0, react_1.useState)([]);
  // Loading state
  const [isLoading, setIsLoading] = (0, react_1.useState)(true);
  // Pagination
  const [page, setPage] = (0, react_1.useState)(1);
  const [totalPages, setTotalPages] = (0, react_1.useState)(1);
  const [totalCount, setTotalCount] = (0, react_1.useState)(0);
  // Filters
  const [categoryFilter, setCategoryFilter] = (0, react_1.useState)("all");
  const [locationFilter, setLocationFilter] = (0, react_1.useState)("all");
  const [reorderStatusFilter, setReorderStatusFilter] = (0, react_1.useState)(
    "all"
  );
  const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
  // Summary stats
  const [summary, setSummary] = (0, react_1.useState)({
    totalItems: 0,
    totalValue: 0,
    belowParCount: 0,
    outOfStockCount: 0,
  });
  // Modal state
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = (0,
  react_1.useState)(false);
  const [adjustmentItem, setAdjustmentItem] = (0, react_1.useState)(null);
  const [adjustmentForm, setAdjustmentForm] = (0, react_1.useState)({
    quantity: "",
    adjustmentType: "increase",
    reason: "correction",
    notes: "",
  });
  // Tab state
  const [activeTab, setActiveTab] = (0, react_1.useState)("stock");
  // Transaction filters
  const [transactionPage, setTransactionPage] = (0, react_1.useState)(1);
  const [transactionTotalPages, setTransactionTotalPages] = (0,
  react_1.useState)(1);
  // Load stock levels
  const loadStockLevels = (0, react_1.useCallback)(async () => {
    setIsLoading(true);
    try {
      const response = await (0, use_stock_levels_1.listStockLevels)({
        page,
        limit: 20,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        locationId: locationFilter === "all" ? undefined : locationFilter,
        reorderStatus:
          reorderStatusFilter === "all" ? undefined : reorderStatusFilter,
        search: searchQuery || undefined,
      });
      setStockLevels(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
      setSummary(response.summary);
    } catch (error) {
      console.error("Failed to load stock levels:", error);
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to load stock levels"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter, locationFilter, reorderStatusFilter, searchQuery]);
  // Load transactions
  const loadTransactions = (0, react_1.useCallback)(async () => {
    try {
      const response = await (0, use_stock_levels_1.listTransactions)({
        page: transactionPage,
        limit: 50,
      });
      setTransactions(response.data);
      setTransactionTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to load transactions"
      );
    }
  }, [transactionPage]);
  // Load locations
  const loadLocations = (0, react_1.useCallback)(async () => {
    try {
      const response = await (0, use_stock_levels_1.listLocations)();
      setLocations(response.data);
    } catch (error) {
      console.error("Failed to load locations:", error);
    }
  }, []);
  // Initial load
  (0, react_1.useEffect)(() => {
    loadStockLevels();
    loadLocations();
  }, [loadStockLevels, loadLocations]);
  // Load transactions when tab changes
  (0, react_1.useEffect)(() => {
    if (activeTab === "transactions" && transactions.length === 0) {
      loadTransactions();
    }
  }, [activeTab, transactions.length, loadTransactions]);
  // Handle adjustment form submit
  const handleAdjustmentSubmit = async () => {
    if (!adjustmentItem) return;
    try {
      const request = {
        inventoryItemId: adjustmentItem.inventoryItemId,
        storageLocationId: adjustmentItem.storageLocationId,
        quantity: Number.parseFloat(adjustmentForm.quantity),
        adjustmentType: adjustmentForm.adjustmentType,
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes || undefined,
      };
      await (0, use_stock_levels_1.createAdjustment)(request);
      sonner_1.toast.success("Stock adjustment created successfully");
      // Reset and close modal
      setIsAdjustmentModalOpen(false);
      setAdjustmentItem(null);
      setAdjustmentForm({
        quantity: "",
        adjustmentType: "increase",
        reason: "correction",
        notes: "",
      });
      // Reload stock levels
      loadStockLevels();
    } catch (error) {
      console.error("Failed to create adjustment:", error);
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to create adjustment"
      );
    }
  };
  // Open adjustment modal
  const openAdjustmentModal = (item) => {
    setAdjustmentItem(item);
    setAdjustmentForm({
      quantity: "",
      adjustmentType: "increase",
      reason: "correction",
      notes: "",
    });
    setIsAdjustmentModalOpen(true);
  };
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Total Items
            </card_1.CardTitle>
            <lucide_react_1.BoxIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
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
              {(0, use_stock_levels_1.formatCurrency)(summary.totalValue)}
            </div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Below Par
            </card_1.CardTitle>
            <lucide_react_1.AlertTriangleIcon className="h-4 w-4 text-yellow-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.belowParCount}
            </div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Out of Stock
            </card_1.CardTitle>
            <lucide_react_1.ActivityIcon className="h-4 w-4 text-red-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary.outOfStockCount}
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Tabs */}
      <tabs_1.Tabs onValueChange={(v) => setActiveTab(v)} value={activeTab}>
        <tabs_1.TabsList>
          <tabs_1.TabsTrigger value="stock">Stock Levels</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="transactions">
            Transaction History
          </tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        {/* Stock Levels Tab */}
        <tabs_1.TabsContent className="space-y-4" value="stock">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <input_1.Input
              className="max-w-sm"
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search items..."
              value={searchQuery}
            />

            <select_1.Select
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
              value={categoryFilter}
            >
              <select_1.SelectTrigger className="w-[180px]">
                <select_1.SelectValue placeholder="Category" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">
                  All Categories
                </select_1.SelectItem>
                {use_inventory_1.ITEM_CATEGORIES.map((cat) => (
                  <select_1.SelectItem key={cat} value={cat}>
                    {cat
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>

            <select_1.Select
              onValueChange={(v) => {
                setLocationFilter(v);
                setPage(1);
              }}
              value={locationFilter}
            >
              <select_1.SelectTrigger className="w-[180px]">
                <select_1.SelectValue placeholder="Location" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">
                  All Locations
                </select_1.SelectItem>
                {locations.map((loc) => (
                  <select_1.SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>

            <select_1.Select
              onValueChange={(v) => {
                setReorderStatusFilter(v);
                setPage(1);
              }}
              value={reorderStatusFilter}
            >
              <select_1.SelectTrigger className="w-[180px]">
                <select_1.SelectValue placeholder="Status" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {REORDER_STATUSES.map((status) => (
                  <select_1.SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>

          {/* Stock Levels Table */}
          <card_1.Card>
            <table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead>Item</table_1.TableHead>
                  <table_1.TableHead>Category</table_1.TableHead>
                  <table_1.TableHead>Location</table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Quantity
                  </table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Par Level
                  </table_1.TableHead>
                  <table_1.TableHead>Status</table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Total Value
                  </table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Actions
                  </table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {isLoading ? (
                  <table_1.TableRow>
                    <table_1.TableCell className="text-center" colSpan={8}>
                      Loading...
                    </table_1.TableCell>
                  </table_1.TableRow>
                ) : stockLevels.length === 0 ? (
                  <table_1.TableRow>
                    <table_1.TableCell className="text-center" colSpan={8}>
                      No stock levels found
                    </table_1.TableCell>
                  </table_1.TableRow>
                ) : (
                  stockLevels.map((level) => (
                    <table_1.TableRow key={level.id}>
                      <table_1.TableCell className="font-medium">
                        <div>
                          <div>{level.item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {level.item.itemNumber}
                          </div>
                        </div>
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {level.item.category.replace(/_/g, " ")}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {level.storageLocation?.name || "All Locations"}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        {(0, use_stock_levels_1.formatQuantity)(
                          level.quantityOnHand
                        )}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        {level.parLevel
                          ? (0, use_stock_levels_1.formatQuantity)(
                              level.parLevel
                            )
                          : "Not set"}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <badge_1.Badge
                          className={(0,
                          use_stock_levels_1.getReorderStatusColor)(
                            level.reorderStatus
                          )}
                        >
                          {(0, use_stock_levels_1.getReorderStatusLabel)(
                            level.reorderStatus
                          )}
                        </badge_1.Badge>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        {(0, use_stock_levels_1.formatCurrency)(
                          level.totalValue
                        )}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        <button_1.Button
                          onClick={() => openAdjustmentModal(level)}
                          size="sm"
                          variant="outline"
                        >
                          Adjust
                        </button_1.Button>
                      </table_1.TableCell>
                    </table_1.TableRow>
                  ))
                )}
              </table_1.TableBody>
            </table_1.Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {stockLevels.length} of {totalCount} items
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
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  size="sm"
                  variant="outline"
                >
                  Next
                </button_1.Button>
              </div>
            </div>
          </card_1.Card>
        </tabs_1.TabsContent>

        {/* Transactions Tab */}
        <tabs_1.TabsContent className="space-y-4" value="transactions">
          <card_1.Card>
            <table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead>Date</table_1.TableHead>
                  <table_1.TableHead>Item</table_1.TableHead>
                  <table_1.TableHead>Type</table_1.TableHead>
                  <table_1.TableHead>Quantity</table_1.TableHead>
                  <table_1.TableHead>Reason</table_1.TableHead>
                  <table_1.TableHead>User</table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {transactions.length === 0 ? (
                  <table_1.TableRow>
                    <table_1.TableCell className="text-center" colSpan={6}>
                      No transactions found
                    </table_1.TableCell>
                  </table_1.TableRow>
                ) : (
                  transactions.map((tx) => (
                    <table_1.TableRow key={tx.id}>
                      <table_1.TableCell>
                        {(0, use_stock_levels_1.formatDate)(tx.createdAt)}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {tx.item?.name || "Unknown"} (
                        {tx.item?.itemNumber || ""})
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <badge_1.Badge
                          className={(0,
                          use_stock_levels_1.getTransactionTypeColor)(
                            tx.transactionType
                          )}
                        >
                          {(0, use_stock_levels_1.getTransactionTypeLabel)(
                            tx.transactionType
                          )}
                        </badge_1.Badge>
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {tx.quantity > 0 ? "+" : ""}
                        {(0, use_stock_levels_1.formatQuantity)(tx.quantity)}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {tx.reason
                          ? (0, use_stock_levels_1.getAdjustmentReasonLabel)(
                              tx.reason
                            )
                          : "-"}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {tx.performedByUser?.name || "System"}
                      </table_1.TableCell>
                    </table_1.TableRow>
                  ))
                )}
              </table_1.TableBody>
            </table_1.Table>

            {/* Transaction Pagination */}
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Page {transactionPage} of {transactionTotalPages}
              </div>
              <div className="flex gap-2">
                <button_1.Button
                  disabled={transactionPage === 1}
                  onClick={() => setTransactionPage((p) => Math.max(1, p - 1))}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </button_1.Button>
                <button_1.Button
                  disabled={transactionPage >= transactionTotalPages}
                  onClick={() =>
                    setTransactionPage((p) =>
                      Math.min(transactionTotalPages, p + 1)
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  Next
                </button_1.Button>
              </div>
            </div>
          </card_1.Card>
        </tabs_1.TabsContent>
      </tabs_1.Tabs>

      {/* Adjustment Modal */}
      <dialog_1.Dialog
        onOpenChange={setIsAdjustmentModalOpen}
        open={isAdjustmentModalOpen}
      >
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Adjust Stock Level</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Adjust stock quantity for {adjustmentItem?.item.name}
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Current quantity:{" "}
              {adjustmentItem
                ? (0, use_stock_levels_1.formatQuantity)(
                    adjustmentItem.quantityOnHand
                  )
                : "0"}
            </div>

            <div className="grid gap-2">
              <label_1.Label htmlFor="adjustmentType">
                Adjustment Type
              </label_1.Label>
              <select_1.Select
                onValueChange={(v) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    adjustmentType: v,
                  })
                }
                value={adjustmentForm.adjustmentType}
              >
                <select_1.SelectTrigger id="adjustmentType">
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  <select_1.SelectItem value="increase">
                    Increase Stock
                  </select_1.SelectItem>
                  <select_1.SelectItem value="decrease">
                    Decrease Stock
                  </select_1.SelectItem>
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            <div className="grid gap-2">
              <label_1.Label htmlFor="quantity">Quantity</label_1.Label>
              <input_1.Input
                id="quantity"
                min="0"
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    quantity: e.target.value,
                  })
                }
                step="0.01"
                type="number"
                value={adjustmentForm.quantity}
              />
            </div>

            <div className="grid gap-2">
              <label_1.Label htmlFor="reason">Reason</label_1.Label>
              <select_1.Select
                onValueChange={(v) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    reason: v,
                  })
                }
                value={adjustmentForm.reason}
              >
                <select_1.SelectTrigger id="reason">
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {(0, use_stock_levels_1.getAdjustmentReasons)().map(
                    (reason) => (
                      <select_1.SelectItem key={reason} value={reason}>
                        {(0, use_stock_levels_1.getAdjustmentReasonLabel)(
                          reason
                        )}
                      </select_1.SelectItem>
                    )
                  )}
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            <div className="grid gap-2">
              <label_1.Label htmlFor="notes">Notes (Optional)</label_1.Label>
              <input_1.Input
                id="notes"
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    notes: e.target.value,
                  })
                }
                value={adjustmentForm.notes}
              />
            </div>
          </div>

          <dialog_1.DialogFooter>
            <button_1.Button
              onClick={() => setIsAdjustmentModalOpen(false)}
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button onClick={handleAdjustmentSubmit}>
              Submit Adjustment
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>
  );
};
exports.StockLevelsPageClient = StockLevelsPageClient;
