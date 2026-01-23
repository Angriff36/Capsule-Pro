"use client";

import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type InventoryItemWithStatus,
  type StockStatus,
  type FSAStatus,
  type ItemCategory,
  listInventoryItems,
  deleteInventoryItem,
  getStockStatusColor,
  getStockStatusLabel,
  getFSAStatusColor,
  getFSAStatusLabel,
  getCategoryLabel,
  formatCurrency,
  ITEM_CATEGORIES,
  FSA_STATUSES,
} from "../../../lib/use-inventory";
import { Button } from "@repo/design-system/components/ui/button";
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
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { CreateInventoryItemModal } from "./components/create-inventory-item-modal";

export const InventoryItemsPageClient = () => {
  const [items, setItems] = useState<InventoryItemWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | "all">(
    "all"
  );
  const [stockStatusFilter, setStockStatusFilter] = useState<
    StockStatus | "all"
  >("all");
  const [fsaStatusFilter, setFsaStatusFilter] = useState<FSAStatus | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] =
    useState<InventoryItemWithStatus | null>(null);
  const [editItem, setEditItem] = useState<InventoryItemWithStatus | null>(
    null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listInventoryItems({
        page,
        limit: 20,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        stockStatus: stockStatusFilter === "all" ? undefined : stockStatusFilter,
        fsaStatus: fsaStatusFilter === "all" ? undefined : fsaStatusFilter,
      });
      setItems(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Failed to load inventory items:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load inventory items"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter, stockStatusFilter, fsaStatusFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.item_number.toLowerCase().includes(query)
    );
  });

  const handleDelete = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      await deleteInventoryItem(itemToDelete.id);
      toast.success("Inventory item deleted successfully");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      loadItems();
    } catch (error) {
      console.error("Failed to delete inventory item:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete inventory item"
      );
    }
  }, [itemToDelete, loadItems]);

  const confirmDelete = (item: InventoryItemWithStatus) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const openEditModal = (item: InventoryItemWithStatus) => {
    setEditItem(item);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditItem(null);
  };

  // Calculate summary stats
  const totalValue = items.reduce((sum, item) => sum + item.total_value, 0);
  const lowStockCount = items.filter(
    (item) => item.stock_status === "low_stock"
  ).length;
  const outOfStockCount = items.filter(
    (item) => item.stock_status === "out_of_stock"
  ).length;

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Header with filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Input
                className="w-64"
                placeholder="Search items..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              onValueChange={(value) =>
                setCategoryFilter(
                  value === "all" ? "all" : (value as ItemCategory)
                )
              }
              value={categoryFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {ITEM_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) =>
                setStockStatusFilter(
                  value === "all" ? "all" : (value as StockStatus)
                )
              }
              value={stockStatusFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) =>
                setFsaStatusFilter(
                  value === "all" ? "all" : (value as FSAStatus)
                )
              }
              value={fsaStatusFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="FSA Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All FSA Statuses</SelectItem>
                {FSA_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getFSAStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            New Item
          </Button>
        </div>

        {/* Summary stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-muted-foreground text-sm">Total Items</div>
            <div className="text-2xl font-bold">{totalCount}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-muted-foreground text-sm">Total Value</div>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-muted-foreground text-sm">Low Stock</div>
            <div className="text-2xl font-bold text-yellow-600">
              {lowStockCount}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-muted-foreground text-sm">Out of Stock</div>
            <div className="text-2xl font-bold text-red-600">
              {outOfStockCount}
            </div>
          </div>
        </div>

        {/* Items table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <PlusIcon className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">
              {searchQuery ||
              categoryFilter !== "all" ||
              stockStatusFilter !== "all" ||
              fsaStatusFilter !== "all"
                ? "No items found"
                : "No inventory items yet"}
            </h3>
            <p className="mb-4 text-muted-foreground text-sm">
              {searchQuery ||
              categoryFilter !== "all" ||
              stockStatusFilter !== "all" ||
              fsaStatusFilter !== "all"
                ? "Try adjusting your filters or search query"
                : "Create your first inventory item to get started"}
            </p>
            {!searchQuery &&
              categoryFilter === "all" &&
              stockStatusFilter === "all" &&
              fsaStatusFilter === "all" && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <PlusIcon className="mr-2 size-4" />
                  Create Item
                </Button>
              )}
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Stock Status</TableHead>
                  <TableHead>FSA Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      {item.item_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 2).map((tag) => (
                            <Badge
                              className="text-xs"
                              key={tag}
                              variant="outline"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {item.tags.length > 2 && (
                            <Badge className="text-xs" variant="outline">
                              +{item.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getCategoryLabel(item.category as ItemCategory)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">
                        {item.quantity_on_hand.toFixed(3)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Reorder at: {item.reorder_level.toFixed(3)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unit_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">
                        {formatCurrency(item.total_value)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getStockStatusColor(item.stock_status)}
                        variant="outline"
                      >
                        {getStockStatusLabel(item.stock_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getFSAStatusColor(
                          item.fsa_status ?? "unknown"
                        )}
                        variant="outline"
                      >
                        {getFSAStatusLabel(item.fsa_status ?? "unknown")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => openEditModal(item)}
                          size="sm"
                          variant="ghost"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => confirmDelete(item)}
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-4">
                <div className="text-muted-foreground text-sm">
                  Showing {Math.min((page - 1) * 20 + 1, totalCount)} to{" "}
                  {Math.min(page * 20, totalCount)} of {totalCount} items
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center px-3 text-sm">
                    Page {page} of {totalPages}
                  </div>
                  <Button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <CreateInventoryItemModal
        editItem={editItem}
        onClose={handleCloseModal}
        onCreated={loadItems}
        open={isCreateModalOpen}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Inventory Item?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
