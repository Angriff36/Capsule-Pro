"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryItemsPageClient = void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const use_inventory_1 = require("../../../lib/use-inventory");
const create_inventory_item_modal_1 = require("./components/create-inventory-item-modal");
const InventoryItemsPageClient = () => {
  const [items, setItems] = (0, react_1.useState)([]);
  const [isLoading, setIsLoading] = (0, react_1.useState)(true);
  const [page, setPage] = (0, react_1.useState)(1);
  const [totalPages, setTotalPages] = (0, react_1.useState)(1);
  const [totalCount, setTotalCount] = (0, react_1.useState)(0);
  const [categoryFilter, setCategoryFilter] = (0, react_1.useState)("all");
  const [stockStatusFilter, setStockStatusFilter] = (0, react_1.useState)(
    "all"
  );
  const [fsaStatusFilter, setFsaStatusFilter] = (0, react_1.useState)("all");
  const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
  const [isCreateModalOpen, setIsCreateModalOpen] = (0, react_1.useState)(
    false
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = (0, react_1.useState)(false);
  const [itemToDelete, setItemToDelete] = (0, react_1.useState)(null);
  const [editItem, setEditItem] = (0, react_1.useState)(null);
  const loadItems = (0, react_1.useCallback)(async () => {
    setIsLoading(true);
    try {
      const response = await (0, use_inventory_1.listInventoryItems)({
        page,
        limit: 20,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        stockStatus:
          stockStatusFilter === "all" ? undefined : stockStatusFilter,
        fsaStatus: fsaStatusFilter === "all" ? undefined : fsaStatusFilter,
      });
      setItems(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Failed to load inventory items:", error);
      sonner_1.toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load inventory items"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter, stockStatusFilter, fsaStatusFilter]);
  (0, react_1.useEffect)(() => {
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
  const handleDelete = (0, react_1.useCallback)(async () => {
    if (!itemToDelete) return;
    try {
      await (0, use_inventory_1.deleteInventoryItem)(itemToDelete.id);
      sonner_1.toast.success("Inventory item deleted successfully");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      loadItems();
    } catch (error) {
      console.error("Failed to delete inventory item:", error);
      sonner_1.toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete inventory item"
      );
    }
  }, [itemToDelete, loadItems]);
  const confirmDelete = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };
  const openEditModal = (item) => {
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
              <input_1.Input
                className="w-64"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                type="text"
                value={searchQuery}
              />
            </div>
            <select_1.Select
              onValueChange={(value) =>
                setCategoryFilter(value === "all" ? "all" : value)
              }
              value={categoryFilter}
            >
              <select_1.SelectTrigger className="w-40">
                <select_1.SelectValue placeholder="Category" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">
                  All Categories
                </select_1.SelectItem>
                {use_inventory_1.ITEM_CATEGORIES.map((cat) => (
                  <select_1.SelectItem key={cat} value={cat}>
                    {(0, use_inventory_1.getCategoryLabel)(cat)}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>
            <select_1.Select
              onValueChange={(value) =>
                setStockStatusFilter(value === "all" ? "all" : value)
              }
              value={stockStatusFilter}
            >
              <select_1.SelectTrigger className="w-40">
                <select_1.SelectValue placeholder="Stock Status" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">
                  All Stock Levels
                </select_1.SelectItem>
                <select_1.SelectItem value="in_stock">
                  In Stock
                </select_1.SelectItem>
                <select_1.SelectItem value="low_stock">
                  Low Stock
                </select_1.SelectItem>
                <select_1.SelectItem value="out_of_stock">
                  Out of Stock
                </select_1.SelectItem>
              </select_1.SelectContent>
            </select_1.Select>
            <select_1.Select
              onValueChange={(value) =>
                setFsaStatusFilter(value === "all" ? "all" : value)
              }
              value={fsaStatusFilter}
            >
              <select_1.SelectTrigger className="w-40">
                <select_1.SelectValue placeholder="FSA Status" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">
                  All FSA Statuses
                </select_1.SelectItem>
                {use_inventory_1.FSA_STATUSES.map((status) => (
                  <select_1.SelectItem key={status} value={status}>
                    {(0, use_inventory_1.getFSAStatusLabel)(status)}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>
          <button_1.Button onClick={() => setIsCreateModalOpen(true)}>
            <lucide_react_1.PlusIcon className="mr-2 size-4" />
            New Item
          </button_1.Button>
        </div>

        {/* Summary stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-muted-foreground text-sm">Total Items</div>
            <div className="text-2xl font-bold">{totalCount}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-muted-foreground text-sm">Total Value</div>
            <div className="text-2xl font-bold">
              {(0, use_inventory_1.formatCurrency)(totalValue)}
            </div>
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
              <lucide_react_1.PlusIcon className="size-8 text-muted-foreground" />
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
                <button_1.Button onClick={() => setIsCreateModalOpen(true)}>
                  <lucide_react_1.PlusIcon className="mr-2 size-4" />
                  Create Item
                </button_1.Button>
              )}
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead>Item Number</table_1.TableHead>
                  <table_1.TableHead>Name</table_1.TableHead>
                  <table_1.TableHead>Category</table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Quantity
                  </table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Unit Cost
                  </table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Total Value
                  </table_1.TableHead>
                  <table_1.TableHead>Stock Status</table_1.TableHead>
                  <table_1.TableHead>FSA Status</table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Actions
                  </table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {filteredItems.map((item) => (
                  <table_1.TableRow key={item.id}>
                    <table_1.TableCell className="font-mono text-sm">
                      {item.item_number}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 2).map((tag) => (
                            <badge_1.Badge
                              className="text-xs"
                              key={tag}
                              variant="outline"
                            >
                              {tag}
                            </badge_1.Badge>
                          ))}
                          {item.tags.length > 2 && (
                            <badge_1.Badge
                              className="text-xs"
                              variant="outline"
                            >
                              +{item.tags.length - 2}
                            </badge_1.Badge>
                          )}
                        </div>
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {(0, use_inventory_1.getCategoryLabel)(item.category)}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      <div className="font-medium">
                        {item.quantity_on_hand.toFixed(3)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Reorder at: {item.reorder_level.toFixed(3)}
                      </div>
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {(0, use_inventory_1.formatCurrency)(item.unit_cost)}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      <div className="font-medium">
                        {(0, use_inventory_1.formatCurrency)(item.total_value)}
                      </div>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <badge_1.Badge
                        className={(0, use_inventory_1.getStockStatusColor)(
                          item.stock_status
                        )}
                        variant="outline"
                      >
                        {(0, use_inventory_1.getStockStatusLabel)(
                          item.stock_status
                        )}
                      </badge_1.Badge>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <badge_1.Badge
                        className={(0, use_inventory_1.getFSAStatusColor)(
                          item.fsa_status ?? "unknown"
                        )}
                        variant="outline"
                      >
                        {(0, use_inventory_1.getFSAStatusLabel)(
                          item.fsa_status ?? "unknown"
                        )}
                      </badge_1.Badge>
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <button_1.Button
                          onClick={() => openEditModal(item)}
                          size="sm"
                          variant="ghost"
                        >
                          Edit
                        </button_1.Button>
                        <button_1.Button
                          className="text-destructive hover:text-destructive"
                          onClick={() => confirmDelete(item)}
                          size="sm"
                          variant="ghost"
                        >
                          Delete
                        </button_1.Button>
                      </div>
                    </table_1.TableCell>
                  </table_1.TableRow>
                ))}
              </table_1.TableBody>
            </table_1.Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-4">
                <div className="text-muted-foreground text-sm">
                  Showing {Math.min((page - 1) * 20 + 1, totalCount)} to{" "}
                  {Math.min(page * 20, totalCount)} of {totalCount} items
                </div>
                <div className="flex gap-2">
                  <button_1.Button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </button_1.Button>
                  <div className="flex items-center px-3 text-sm">
                    Page {page} of {totalPages}
                  </div>
                  <button_1.Button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </button_1.Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <create_inventory_item_modal_1.CreateInventoryItemModal
        editItem={editItem}
        onClose={handleCloseModal}
        onCreated={loadItems}
        open={isCreateModalOpen}
      />

      {/* Delete Confirmation Dialog */}
      <dialog_1.Dialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      >
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Delete Inventory Item?</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{itemToDelete?.name}</strong>? This action cannot be
              undone.
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <dialog_1.DialogFooter>
            <button_1.Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button onClick={handleDelete} variant="destructive">
              Delete
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </>
  );
};
exports.InventoryItemsPageClient = InventoryItemsPageClient;
