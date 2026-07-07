"use client";

import {
  KitchenDashboardFilterAside,
  KitchenOperationalCanvas,
  KitchenOperationalHero,
  KitchenOperationalMetricTile,
  KitchenOperationalMetricTiles,
  KitchenOperationalSectionLead,
} from "@repo/design-system/components/blocks/page-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
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
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  Loader2Icon,
  MoreHorizontalIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listInventorySuppliers,
  listVendorCatalogs,
  vendorCatalogCreate,
  vendorCatalogDeactivate,
  vendorCatalogReactivate,
  vendorCatalogSoftDelete,
  vendorCatalogUpdate,
  vendorCatalogUpdatePrice,
} from "../../../lib/manifest-client.generated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VendorCatalog {
  baseUnitCost: number;
  category: string | null;
  createdAt: string;
  currency: string;
  deletedAt: string | null;
  description: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  id: string;
  isActive: boolean;
  itemName: string;
  itemNumber: string;
  lastCostUpdate: string | null;
  leadTimeDays: number | null;
  leadTimeMaxDays: number | null;
  leadTimeMinDays: number | null;
  minimumOrderQuantity: number | null;
  notes: string | null;
  orderMultiple: number | null;
  supplierId: string;
  supplierSku: string | null;
  tags: string[];
  tenantId: string;
  unitOfMeasure: string;
  updatedAt: string;
}

interface Supplier {
  code: string | null;
  id: string;
  name: string;
}

type CatalogFormData = {
  supplierId: string;
  itemNumber: string;
  itemName: string;
  description: string;
  category: string;
  baseUnitCost: string;
  currency: string;
  unitOfMeasure: string;
  leadTimeDays: string;
  minimumOrderQuantity: string;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
};

const EMPTY_FORM: CatalogFormData = {
  supplierId: "",
  itemNumber: "",
  itemName: "",
  description: "",
  category: "",
  baseUnitCost: "0",
  currency: "USD",
  unitOfMeasure: "each",
  leadTimeDays: "",
  minimumOrderQuantity: "1",
  effectiveFrom: "",
  effectiveTo: "",
  notes: "",
};

const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat",
  "Seafood",
  "Dry Goods",
  "Beverages",
  "Frozen",
  "Bakery",
  "Spices & Seasonings",
  "Cleaning Supplies",
  "Packaging",
  "Equipment",
  "Other",
] as const;

// Must match the VendorCatalog IR vocabulary (vendor-catalog-rules.manifest:
// validCurrency + requireUnitOfMeasure) or create/update is blocked at runtime.
const CURRENCIES = ["USD", "EUR", "JPY", "CAD"] as const;
const UNITS = ["each", "case", "lb", "oz", "kg", "units", "cases"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VendorCatalogsClient() {
  // Data state
  const [catalogs, setCatalogs] = useState<VendorCatalog[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<VendorCatalog | null>(
    null
  );
  const [formData, setFormData] = useState<CatalogFormData>({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<VendorCatalog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cost update dialog
  const [costTarget, setCostTarget] = useState<VendorCatalog | null>(null);
  const [newCost, setNewCost] = useState("");
  const [costReason, setCostReason] = useState("");
  const [isUpdatingCost, setIsUpdatingCost] = useState(false);

  // Deactivate dialog
  const [deactivateTarget, setDeactivateTarget] =
    useState<VendorCatalog | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadCatalogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listVendorCatalogs();
      setCatalogs(result.data as unknown as VendorCatalog[]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load vendor catalogs"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const result = await listInventorySuppliers({ limit: 500 });
      setSuppliers(result.data as unknown as Supplier[]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load suppliers"
      );
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
    loadSuppliers();
  }, [loadCatalogs, loadSuppliers]);

  // ---------------------------------------------------------------------------
  // Filtering + pagination
  // ---------------------------------------------------------------------------

  const filteredCatalogs = catalogs.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.itemName.toLowerCase().includes(q) ||
        c.itemNumber.toLowerCase().includes(q) ||
        (c.category ?? "").toLowerCase().includes(q);
      if (!matchesSearch) {
        return false;
      }
    }
    if (categoryFilter !== "all" && c.category !== categoryFilter) {
      return false;
    }
    if (statusFilter === "active" && !c.isActive) {
      return false;
    }
    if (statusFilter === "inactive" && c.isActive) {
      return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCatalogs.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedCatalogs = filteredCatalogs.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, statusFilter]);

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const activeCount = catalogs.filter((c) => c.isActive).length;
  const avgCost =
    catalogs.length > 0
      ? catalogs.reduce((sum, c) => sum + Number(c.baseUnitCost), 0) /
        catalogs.length
      : 0;
  const withPricingTiers = catalogs.filter((c) =>
    c.tags?.includes("pricing-tier")
  ).length;

  // ---------------------------------------------------------------------------
  // Form handlers
  // ---------------------------------------------------------------------------

  const openCreateModal = () => {
    setEditingCatalog(null);
    setFormData({ ...EMPTY_FORM });
    setFormOpen(true);
  };

  const openEditModal = (catalog: VendorCatalog) => {
    setEditingCatalog(catalog);
    setFormData({
      supplierId: catalog.supplierId,
      itemNumber: catalog.itemNumber,
      itemName: catalog.itemName,
      description: catalog.description ?? "",
      category: catalog.category ?? "",
      baseUnitCost: String(catalog.baseUnitCost),
      currency: catalog.currency,
      unitOfMeasure: catalog.unitOfMeasure,
      leadTimeDays:
        catalog.leadTimeDays == null ? "" : String(catalog.leadTimeDays),
      minimumOrderQuantity:
        catalog.minimumOrderQuantity == null
          ? "1"
          : String(catalog.minimumOrderQuantity),
      effectiveFrom: catalog.effectiveFrom
        ? (catalog.effectiveFrom.split("T")[0] ?? "")
        : "",
      effectiveTo: catalog.effectiveTo
        ? (catalog.effectiveTo.split("T")[0] ?? "")
        : "",
      notes: catalog.notes ?? "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingCatalog(null);
    setFormData({ ...EMPTY_FORM });
  };

  const handleFormChange = (field: keyof CatalogFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const missing = [
      !formData.supplierId && "Supplier",
      !formData.itemNumber && "Item number",
      !formData.itemName && "Item name",
    ].filter(Boolean) as string[];
    if (missing.length > 0) {
      toast.error(
        `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        supplierId: formData.supplierId,
        itemNumber: formData.itemNumber,
        itemName: formData.itemName,
        description: formData.description || null,
        category: formData.category || null,
        baseUnitCost: Number(formData.baseUnitCost) || 0,
        currency: formData.currency || "USD",
        unitOfMeasure: formData.unitOfMeasure || "each",
        leadTimeDays: formData.leadTimeDays
          ? Number(formData.leadTimeDays)
          : null,
        minimumOrderQuantity: formData.minimumOrderQuantity
          ? Number(formData.minimumOrderQuantity)
          : null,
        // DatePicker emits "yyyy-MM-dd"; Number() of that is NaN (→ JSON null).
        // IR datetime contract = epoch ms.
        effectiveFrom: formData.effectiveFrom
          ? new Date(`${formData.effectiveFrom}T00:00:00`).getTime()
          : null,
        effectiveTo: formData.effectiveTo
          ? new Date(`${formData.effectiveTo}T00:00:00`).getTime()
          : null,
        notes: formData.notes || null,
      };

      if (editingCatalog) {
        await vendorCatalogUpdate({ id: editingCatalog.id, ...payload });
      } else {
        await vendorCatalogCreate(payload);
      }

      toast.success(
        editingCatalog
          ? "Catalog entry updated successfully"
          : "Catalog entry created successfully"
      );
      closeForm();
      loadCatalogs();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save catalog entry"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setIsDeleting(true);
    try {
      await vendorCatalogSoftDelete({ id: deleteTarget.id });
      toast.success("Catalog entry deleted");
      setDeleteTarget(null);
      loadCatalogs();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete catalog entry"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Deactivate
  // ---------------------------------------------------------------------------

  const handleDeactivate = async () => {
    if (!deactivateTarget) {
      return;
    }
    setIsDeactivating(true);
    try {
      if (deactivateTarget.isActive) {
        await vendorCatalogDeactivate({ id: deactivateTarget.id });
      } else {
        await vendorCatalogReactivate({ id: deactivateTarget.id });
      }
      toast.success(
        deactivateTarget.isActive
          ? "Catalog entry deactivated"
          : "Catalog entry activated"
      );
      setDeactivateTarget(null);
      loadCatalogs();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Cost update
  // ---------------------------------------------------------------------------

  const openCostDialog = (catalog: VendorCatalog) => {
    setCostTarget(catalog);
    setNewCost(String(catalog.baseUnitCost));
    setCostReason("");
  };

  const handleCostUpdate = async () => {
    if (!(costTarget && newCost && costReason)) {
      toast.error("New cost and reason are required");
      return;
    }

    const parsedCost = Number(newCost);
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      toast.error("Please enter a valid cost amount");
      return;
    }

    setIsUpdatingCost(true);
    try {
      const result = await vendorCatalogUpdatePrice({
        id: costTarget.id,
        newBaseUnitCost: parsedCost,
        reason: costReason,
      });

      const propagation = (result as Record<string, unknown> | undefined)
        ?.costPropagation as Record<string, unknown> | undefined;
      if (propagation) {
        toast.success(
          `Cost updated. ${propagation.itemsUpdated ?? 0} inventory items affected.`
        );
      } else {
        toast.success("Cost updated successfully");
      }
      setCostTarget(null);
      loadCatalogs();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update cost"
      );
    } finally {
      setIsUpdatingCost(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Supplier name lookup
  // ---------------------------------------------------------------------------

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.name ?? "Unknown Supplier";
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <KitchenOperationalCanvas>
        <KitchenOperationalHero
          actions={
            <Button
              className="rounded-full bg-white px-5 font-medium text-[#17171c] text-[13px] hover:bg-white/90"
              onClick={openCreateModal}
            >
              <PlusIcon className="mr-2 size-4" />
              Add Entry
            </Button>
          }
          eyebrow="Inventory / Vendor Catalogs"
          lede="Manage vendor catalog entries, pricing, and lead times across all suppliers."
          metrics={
            <KitchenOperationalMetricTiles>
              <KitchenOperationalMetricTile
                caption="All entries in the catalog"
                label="Total Catalogs"
                value={String(catalogs.length)}
              />
              <KitchenOperationalMetricTile
                caption="Currently available for ordering"
                label="Active"
                value={String(activeCount)}
              />
              <KitchenOperationalMetricTile
                accent="coral"
                caption="Across all active entries"
                label="Average Cost"
                value={formatCurrency(avgCost)}
              />
              <KitchenOperationalMetricTile
                caption="Entries with tiered pricing"
                label="Pricing Tiers"
                value={String(withPricingTiers)}
              />
            </KitchenOperationalMetricTiles>
          }
          title="Vendor Catalogs"
        />

        <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
          <KitchenDashboardFilterAside>
            <div className="space-y-4">
              <div className="space-y-2.5">
                <Label className="font-mono text-muted-foreground text-xs uppercase tracking-[0.28em]">
                  Search
                </Label>
                <div className="relative">
                  <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name, number, category..."
                    value={searchQuery}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="font-mono text-muted-foreground text-xs uppercase tracking-[0.28em]">
                  Category
                </Label>
                <Select
                  onValueChange={(v) =>
                    setCategoryFilter(v === "all" ? "all" : v)
                  }
                  value={categoryFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5">
                <Label className="font-mono text-muted-foreground text-xs uppercase tracking-[0.28em]">
                  Status
                </Label>
                <Select
                  onValueChange={(v) =>
                    setStatusFilter(v as "all" | "active" | "inactive")
                  }
                  value={statusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </KitchenDashboardFilterAside>

          <div className="min-w-0 space-y-10">
            <KitchenOperationalSectionLead
              countBadge={`${filteredCatalogs.length} entries`}
              eyebrow="Operations"
              subtitle="Sortable grid of vendor catalog entries. Use the actions menu to edit, update cost, or deactivate entries."
              title="Catalog entries"
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCatalogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <PackageIcon className="size-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">
                  {searchQuery ||
                  categoryFilter !== "all" ||
                  statusFilter !== "all"
                    ? "No catalogs found"
                    : "No vendor catalog entries yet"}
                </h3>
                <p className="mb-4 text-muted-foreground text-sm">
                  {searchQuery ||
                  categoryFilter !== "all" ||
                  statusFilter !== "all"
                    ? "Try adjusting your filters or search query"
                    : "Add your first vendor catalog entry to get started"}
                </p>
                {!searchQuery &&
                  categoryFilter === "all" &&
                  statusFilter === "all" && (
                    <Button onClick={openCreateModal}>
                      <PlusIcon className="mr-2 size-4" />
                      Add Entry
                    </Button>
                  )}
              </div>
            ) : (
              <div className="rounded-xl border border-hairline bg-canvas">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Number</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Lead Time</TableHead>
                      <TableHead className="text-right">Min Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedCatalogs.map((catalog) => (
                      <TableRow key={catalog.id}>
                        <TableCell className="font-mono text-sm">
                          {catalog.itemNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{catalog.itemName}</div>
                          {catalog.supplierSku && (
                            <div className="text-muted-foreground text-xs">
                              SKU: {catalog.supplierSku}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getSupplierName(catalog.supplierId)}
                        </TableCell>
                        <TableCell>
                          {catalog.category ? (
                            <Badge variant="outline">{catalog.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(catalog.baseUnitCost), {
                            currency: catalog.currency,
                          })}
                        </TableCell>
                        <TableCell>{catalog.unitOfMeasure}</TableCell>
                        <TableCell className="text-right">
                          {catalog.leadTimeDays == null
                            ? "--"
                            : `${catalog.leadTimeDays}d`}
                        </TableCell>
                        <TableCell className="text-right">
                          {catalog.minimumOrderQuantity == null
                            ? "--"
                            : Number(catalog.minimumOrderQuantity)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              catalog.isActive
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-gray-200 bg-gray-50 text-gray-500"
                            }
                            variant="outline"
                          >
                            {catalog.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditModal(catalog)}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openCostDialog(catalog)}
                              >
                                Update Cost
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeactivateTarget(catalog)}
                              >
                                {catalog.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(catalog)}
                              >
                                <TrashIcon className="mr-2 size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-hairline border-t px-4 py-4">
                    <div className="text-muted-foreground text-sm">
                      Showing{" "}
                      {Math.min(
                        (safePage - 1) * pageSize + 1,
                        filteredCatalogs.length
                      )}{" "}
                      to{" "}
                      {Math.min(safePage * pageSize, filteredCatalogs.length)}{" "}
                      of {filteredCatalogs.length} entries
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={safePage === 1}
                        onClick={() => setPage(safePage - 1)}
                        size="sm"
                        variant="outline"
                      >
                        Previous
                      </Button>
                      <div className="flex items-center px-3 text-sm">
                        Page {safePage} of {totalPages}
                      </div>
                      <Button
                        disabled={safePage === totalPages}
                        onClick={() => setPage(safePage + 1)}
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
        </div>
      </KitchenOperationalCanvas>

      {/* ----------------------------------------------------------------- */}
      {/* Create / Edit Modal                                                */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeForm();
          }
        }}
        open={formOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCatalog ? "Edit Catalog Entry" : "Add Catalog Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingCatalog
                ? "Update vendor catalog entry details."
                : "Add a new item to the vendor catalog."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Supplier */}
              <div className="space-y-2">
                <Label htmlFor="supplierId">Supplier *</Label>
                <Select
                  onValueChange={(v) => handleFormChange("supplierId", v)}
                  value={formData.supplierId}
                >
                  <SelectTrigger id="supplierId">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length === 0 ? (
                      <div className="px-2 py-1.5 text-muted-foreground text-sm">
                        No inventory suppliers found. Add a supplier before
                        creating catalog entries.
                      </div>
                    ) : (
                      suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  onValueChange={(v) => handleFormChange("category", v)}
                  value={formData.category || "none"}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Item Number */}
              <div className="space-y-2">
                <Label htmlFor="itemNumber">Item Number *</Label>
                <Input
                  id="itemNumber"
                  onChange={(e) =>
                    handleFormChange("itemNumber", e.target.value)
                  }
                  placeholder="e.g. VNDR-001"
                  value={formData.itemNumber}
                />
              </div>

              {/* Item Name */}
              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name *</Label>
                <Input
                  id="itemName"
                  onChange={(e) => handleFormChange("itemName", e.target.value)}
                  placeholder="e.g. Organic Flour"
                  value={formData.itemName}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                onChange={(e) =>
                  handleFormChange("description", e.target.value)
                }
                placeholder="Optional item description"
                rows={2}
                value={formData.description}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Base Unit Cost */}
              <div className="space-y-2">
                <Label htmlFor="baseUnitCost">Unit Cost</Label>
                <Input
                  id="baseUnitCost"
                  min="0"
                  onChange={(e) =>
                    handleFormChange("baseUnitCost", e.target.value)
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={formData.baseUnitCost}
                />
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  onValueChange={(v) => handleFormChange("currency", v)}
                  value={formData.currency}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit of Measure */}
              <div className="space-y-2">
                <Label htmlFor="unitOfMeasure">Unit</Label>
                <Select
                  onValueChange={(v) => handleFormChange("unitOfMeasure", v)}
                  value={formData.unitOfMeasure}
                >
                  <SelectTrigger id="unitOfMeasure">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Lead Time Days */}
              <div className="space-y-2">
                <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
                <Input
                  id="leadTimeDays"
                  min="0"
                  onChange={(e) =>
                    handleFormChange("leadTimeDays", e.target.value)
                  }
                  placeholder="7"
                  type="number"
                  value={formData.leadTimeDays}
                />
              </div>

              {/* Minimum Order Quantity */}
              <div className="space-y-2">
                <Label htmlFor="minimumOrderQuantity">Min Order Qty</Label>
                <Input
                  id="minimumOrderQuantity"
                  min="0"
                  onChange={(e) =>
                    handleFormChange("minimumOrderQuantity", e.target.value)
                  }
                  placeholder="1"
                  step="0.001"
                  type="number"
                  value={formData.minimumOrderQuantity}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Effective From */}
              <div className="space-y-2">
                <Label htmlFor="effectiveFrom">Effective From</Label>
                <DatePicker
                  id="effectiveFrom"
                  onChange={(e) =>
                    handleFormChange("effectiveFrom", e.target.value)
                  }
                  value={formData.effectiveFrom}
                />
              </div>

              {/* Effective To */}
              <div className="space-y-2">
                <Label htmlFor="effectiveTo">Effective To</Label>
                <DatePicker
                  id="effectiveTo"
                  onChange={(e) =>
                    handleFormChange("effectiveTo", e.target.value)
                  }
                  value={formData.effectiveTo}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                onChange={(e) => handleFormChange("notes", e.target.value)}
                placeholder="Optional notes"
                rows={2}
                value={formData.notes}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={closeForm} variant="outline">
              Cancel
            </Button>
            <Button disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting && (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              )}
              {editingCatalog ? "Save Changes" : "Create Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Delete Confirmation                                                */}
      {/* ----------------------------------------------------------------- */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        open={!!deleteTarget}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Catalog Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.itemName}</strong>? This will soft-delete
              the entry and it will no longer appear in the catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting && (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ----------------------------------------------------------------- */}
      {/* Deactivate / Activate Confirmation                                 */}
      {/* ----------------------------------------------------------------- */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null);
          }
        }}
        open={!!deactivateTarget}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivateTarget?.isActive ? "Deactivate" : "Activate"} Catalog
              Entry?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget?.isActive
                ? "This will mark the entry as inactive. It will remain in the system but won't appear in active catalogs."
                : "This will reactivate the catalog entry and make it available again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeactivating}
              onClick={handleDeactivate}
            >
              {isDeactivating && (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              )}
              {deactivateTarget?.isActive ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ----------------------------------------------------------------- */}
      {/* Cost Update Dialog                                                 */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setCostTarget(null);
          }
        }}
        open={!!costTarget}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Cost</DialogTitle>
            <DialogDescription>
              Update the unit cost for <strong>{costTarget?.itemName}</strong>.
              Cost changes will propagate to related inventory items and
              recipes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Current Cost</Label>
                <span className="text-muted-foreground text-sm">
                  {costTarget
                    ? formatCurrency(Number(costTarget.baseUnitCost), {
                        currency: costTarget.currency,
                      })
                    : "--"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newCost">New Cost *</Label>
              <Input
                id="newCost"
                min="0"
                onChange={(e) => setNewCost(e.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={newCost}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costReason">Reason *</Label>
              <Textarea
                id="costReason"
                onChange={(e) => setCostReason(e.target.value)}
                placeholder="e.g. Supplier price increase, new contract terms"
                rows={2}
                value={costReason}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCostTarget(null)} variant="outline">
              Cancel
            </Button>
            <Button disabled={isUpdatingCost} onClick={handleCostUpdate}>
              {isUpdatingCost && (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              )}
              Update Cost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
