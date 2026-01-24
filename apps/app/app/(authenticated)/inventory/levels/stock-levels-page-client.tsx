"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
import { ActivityIcon, AlertTriangleIcon, BoxIcon, DollarSignIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createAdjustment,
  formatDate,
  formatCurrency,
  formatQuantity,
  getAdjustmentReasonLabel,
  getAdjustmentReasons,
  getReorderStatusColor,
  getReorderStatusLabel,
  getTransactionTypeColor,
  getTransactionTypeLabel,
  listLocations,
  listStockLevels,
  listTransactions,
  type CreateAdjustmentRequest,
  type StockLevelWithStatus,
  type StockReorderStatus,
  type InventoryTransaction,
  type StorageLocation,
  type AdjustmentReason,
  type TransactionType,
} from "../../../lib/use-stock-levels";
import { ITEM_CATEGORIES, type ItemCategory } from "../../../lib/use-inventory";

// Filter options
const REORDER_STATUSES: Array<{ value: StockReorderStatus | "all"; label: string }> =
  [
    { value: "all", label: "All Statuses" },
    { value: "below_par", label: "Below Par" },
    { value: "at_par", label: "At Par" },
    { value: "above_par", label: "Above Par" },
  ];

export const StockLevelsPageClient = () => {
  // Main data state
  const [stockLevels, setStockLevels] = useState<StockLevelWithStatus[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | "all">(
    "all"
  );
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [reorderStatusFilter, setReorderStatusFilter] = useState<
    StockReorderStatus | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Summary stats
  const [summary, setSummary] = useState({
    totalItems: 0,
    totalValue: 0,
    belowParCount: 0,
    outOfStockCount: 0,
  });

  // Modal state
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentItem, setAdjustmentItem] =
    useState<StockLevelWithStatus | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState({
    quantity: "",
    adjustmentType: "increase" as "increase" | "decrease",
    reason: "correction" as AdjustmentReason,
    notes: "",
  });

  // Tab state
  const [activeTab, setActiveTab] = useState<"stock" | "transactions">(
    "stock"
  );

  // Transaction filters
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionTotalPages, setTransactionTotalPages] = useState(1);

  // Load stock levels
  const loadStockLevels = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listStockLevels({
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
      toast.error(
        error instanceof Error ? error.message : "Failed to load stock levels"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter, locationFilter, reorderStatusFilter, searchQuery]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      const response = await listTransactions({
        page: transactionPage,
        limit: 50,
      });
      setTransactions(response.data);
      setTransactionTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load transactions"
      );
    }
  }, [transactionPage]);

  // Load locations
  const loadLocations = useCallback(async () => {
    try {
      const response = await listLocations();
      setLocations(response.data);
    } catch (error) {
      console.error("Failed to load locations:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStockLevels();
    loadLocations();
  }, [loadStockLevels, loadLocations]);

  // Load transactions when tab changes
  useEffect(() => {
    if (activeTab === "transactions" && transactions.length === 0) {
      loadTransactions();
    }
  }, [activeTab, transactions.length, loadTransactions]);

  // Handle adjustment form submit
  const handleAdjustmentSubmit = async () => {
    if (!adjustmentItem) return;

    try {
      const request: CreateAdjustmentRequest = {
        inventoryItemId: adjustmentItem.inventoryItemId,
        storageLocationId: adjustmentItem.storageLocationId,
        quantity: Number.parseFloat(adjustmentForm.quantity),
        adjustmentType: adjustmentForm.adjustmentType,
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes || undefined,
      };

      await createAdjustment(request);
      toast.success("Stock adjustment created successfully");

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
      toast.error(
        error instanceof Error ? error.message : "Failed to create adjustment"
      );
    }
  };

  // Open adjustment modal
  const openAdjustmentModal = (item: StockLevelWithStatus) => {
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <BoxIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalValue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Below Par</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.belowParCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <ActivityIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary.outOfStockCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        {/* Stock Levels Tab */}
        <TabsContent value="stock" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="max-w-sm"
            />

            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {ITEM_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={locationFilter}
              onValueChange={(v) => {
                setLocationFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={reorderStatusFilter}
              onValueChange={(v) => {
                setReorderStatusFilter(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {REORDER_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock Levels Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Par Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : stockLevels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No stock levels found
                    </TableCell>
                  </TableRow>
                ) : (
                  stockLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{level.item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {level.item.itemNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {level.item.category.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        {level.storageLocation?.name || "All Locations"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatQuantity(level.quantityOnHand)}
                      </TableCell>
                      <TableCell className="text-right">
                        {level.parLevel
                          ? formatQuantity(level.parLevel)
                          : "Not set"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getReorderStatusColor(level.reorderStatus)}>
                          {getReorderStatusLabel(level.reorderStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(level.totalValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustmentModal(level)}
                        >
                          Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {stockLevels.length} of {totalCount} items
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        {tx.item?.name || "Unknown"} ({tx.item?.itemNumber || ""})
                      </TableCell>
                      <TableCell>
                        <Badge className={getTransactionTypeColor(tx.transactionType)}>
                          {getTransactionTypeLabel(tx.transactionType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.quantity > 0 ? "+" : ""}
                        {formatQuantity(tx.quantity)}
                      </TableCell>
                      <TableCell>
                        {tx.reason
                          ? getAdjustmentReasonLabel(tx.reason)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {tx.performedByUser?.name || "System"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Transaction Pagination */}
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Page {transactionPage} of {transactionTotalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTransactionPage((p) => Math.max(1, p - 1))
                  }
                  disabled={transactionPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTransactionPage((p) =>
                      Math.min(transactionTotalPages, p + 1)
                    )
                  }
                  disabled={transactionPage >= transactionTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjustment Modal */}
      <Dialog
        open={isAdjustmentModalOpen}
        onOpenChange={setIsAdjustmentModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock Level</DialogTitle>
            <DialogDescription>
              Adjust stock quantity for {adjustmentItem?.item.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Current quantity:{" "}
              {adjustmentItem ? formatQuantity(adjustmentItem.quantityOnHand) : "0"}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="adjustmentType">Adjustment Type</Label>
              <Select
                value={adjustmentForm.adjustmentType}
                onValueChange={(v) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    adjustmentType: v as "increase" | "decrease",
                  })
                }
              >
                <SelectTrigger id="adjustmentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase Stock</SelectItem>
                  <SelectItem value="decrease">Decrease Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={adjustmentForm.quantity}
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    quantity: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={adjustmentForm.reason}
                onValueChange={(v) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    reason: v as AdjustmentReason,
                  })
                }
              >
                <SelectTrigger id="reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAdjustmentReasons().map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {getAdjustmentReasonLabel(reason)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={adjustmentForm.notes}
                onChange={(e) =>
                  setAdjustmentForm({
                    ...adjustmentForm,
                    notes: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAdjustmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAdjustmentSubmit}>
              Submit Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
