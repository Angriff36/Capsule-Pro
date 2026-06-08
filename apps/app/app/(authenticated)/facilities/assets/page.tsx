"use client";

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
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { facilityAssetRemove, facilityAssetUpdate, listFacilityAssets, listFacilityAreas } from "@/app/lib/manifest-client.generated";
import type { FacilityAsset, FacilityArea } from "@/app/lib/manifest-types.generated";
import { createFacilityAsset } from "../actions";
import { FacilitiesNavigation } from "../components/facilities-navigation";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  maintenance: {
    label: "Maintenance",
    color: "bg-amber-100 text-amber-700",
    icon: Wrench,
  },
  retired: {
    label: "Retired",
    color: "bg-gray-100 text-gray-700",
    icon: Archive,
  },
  disposed: {
    label: "Disposed",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  hvac: "HVAC",
  refrigeration: "Refrigeration",
  cooking: "Cooking Equipment",
  dishwashing: "Dishwashing",
  plumbing: "Plumbing",
  electrical: "Electrical",
  furniture: "Furniture",
  technology: "Technology",
  safety: "Safety Equipment",
  vehicle: "Vehicle",
  tool: "Tool",
  other: "Other",
};

const NO_AREA_ID = "__none__";

const formatCurrencyWithDash = (n: number | null) =>
  formatCurrency(n, { nullDisplay: "\u2014" });

export default function AssetsPage() {
  const [assets, setAssets] = useState<FacilityAsset[]>([]);
  const [areas, setAreas] = useState<FacilityArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<FacilityAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    assetType: "other",
    serialNumber: "",
    manufacturer: "",
    model: "",
    purchaseDate: "",
    purchaseCost: "",
    warrantyExpiry: "",
    areaId: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsResult, areasResult] = await Promise.all([
        listFacilityAssets({ status: "all" }),
        listFacilityAreas({ status: "all" }),
      ]);
      setAssets(assetsResult.data || []);
      setAreas(areasResult.data || []);
    } catch (e) {
      console.error("Failed to load:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.serialNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.manufacturer || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.areaId || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      assetType: "other",
      serialNumber: "",
      manufacturer: "",
      model: "",
      purchaseDate: "",
      purchaseCost: "",
      warrantyExpiry: "",
      areaId: "",
      status: "active",
      notes: "",
    });
    setShowDialog(true);
  };

  const openEdit = (asset: FacilityAsset) => {
    setEditing(asset);
    setForm({
      name: asset.name,
      assetType: asset.assetType ?? "other",
      serialNumber: asset.serialNumber || "",
      manufacturer: asset.manufacturer || "",
      model: asset.model || "",
      purchaseDate: asset.purchaseDate?.slice(0, 10) || "",
      purchaseCost: asset.purchasePrice?.toString() || "",
      warrantyExpiry: asset.warrantyExpiry?.slice(0, 10) || "",
      areaId: asset.areaId || "",
      status: asset.status ?? "active",
      notes: asset.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await facilityAssetUpdate({
          assetId: editing.id,
          name: form.name,
          assetType: form.assetType,
          serialNumber: form.serialNumber || null,
          manufacturer: form.manufacturer || null,
          model: form.model || null,
          purchaseDate: form.purchaseDate || null,
          purchaseCost: form.purchaseCost
            ? Number.parseFloat(form.purchaseCost)
            : null,
          warrantyExpiry: form.warrantyExpiry || null,
          status: form.status,
          areaId: form.areaId || null,
          notes: form.notes || null,
        });
        await loadData();
        setShowDialog(false);
      } else {
        await createFacilityAsset({
          name: form.name,
          assetType: form.assetType,
          serialNumber: form.serialNumber || undefined,
          manufacturer: form.manufacturer || undefined,
          model: form.model || undefined,
          purchaseDate: form.purchaseDate || undefined,
          purchaseCost: form.purchaseCost
            ? Number.parseFloat(form.purchaseCost)
            : undefined,
          warrantyExpiry: form.warrantyExpiry || undefined,
          areaId: form.areaId || undefined,
          notes: form.notes || undefined,
        });
        await loadData();
        setShowDialog(false);
      }
    } catch (e) {
      console.error("Failed to save:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assetId: string) => {
    setDeleting(assetId);
    try {
      await facilityAssetRemove({ assetId });
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    } catch (e) {
      console.error("Failed to delete:", e);
    } finally {
      setDeleting(null);
    }
  };

  const confirmDelete = (asset: FacilityAsset) => {
    setAssetToDelete({ id: asset.id, name: asset.name });
    setDeleteDialogOpen(true);
  };

  const totalValue = assets
    .filter((a) => a.status === "active")
    .reduce((sum, a) => sum + (a.purchasePrice || 0), 0);

  const warrantyExpiring = assets.filter(
    (a) =>
      a.warrantyExpiry &&
      a.status === "active" &&
      new Date(a.warrantyExpiry) < new Date(Date.now() + 90 * 86_400_000)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FacilitiesNavigation />

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
            <p className="text-muted-foreground">
              Track equipment, warranty status, and maintenance needs.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>

        {/* Summary */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary">{assets.length} Assets</Badge>
          <Badge variant="outline">
            Active value: {formatCurrencyWithDash(totalValue)}
          </Badge>
          {warrantyExpiring > 0 && (
            <Badge variant="destructive">
              {warrantyExpiring} warranty expiring soon
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            value={search}
          />
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {(["active", "maintenance", "retired"] as const).map((status) => {
            const config = STATUS_CONFIG[status];
            const count = assets.filter((a) => a.status === status).length;
            return (
              <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {config.label}
                  </CardTitle>
                  <config.icon
                    className={`h-4 w-4 ${status === "active" ? "text-green-500" : status === "maintenance" ? "text-amber-500" : "text-gray-500"}`}
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Asset List */}
        {filteredAssets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {search
                  ? "No assets match your search."
                  : "No assets found. Add an asset to get started."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map((asset) => {
              const config =
                STATUS_CONFIG[asset.status ?? "active"] || STATUS_CONFIG.active;
              const Icon = config.icon;
              const isWarrantyExpiring =
                asset.warrantyExpiry &&
                asset.status === "active" &&
                new Date(asset.warrantyExpiry) <
                  new Date(Date.now() + 90 * 86_400_000);
              return (
                <Card
                  className="hover:border-primary/40 transition-shadow"
                  key={asset.id}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{asset.name}</span>
                          <Badge className={config.color}>{config.label}</Badge>
                          <Badge variant="outline">
                            {ASSET_TYPE_LABELS[asset.assetType ?? "other"] ??
                              asset.assetType ?? "Other"}
                          </Badge>
                          {isWarrantyExpiring && (
                            <Badge variant="destructive">
                              Warranty expiring
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {asset.serialNumber && (
                            <span>SN: {asset.serialNumber}</span>
                          )}
                          {asset.manufacturer && (
                            <span>
                              {asset.manufacturer}
                              {asset.model ? ` ${asset.model}` : ""}
                            </span>
                          )}
                          {asset.areaId && <span>📍 {asset.areaId}</span>}
                          {asset.purchasePrice != null && (
                            <span>
                              {formatCurrencyWithDash(asset.purchasePrice)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => openEdit(asset)}
                          size="sm"
                          variant="outline"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          className="text-red-500 hover:text-red-700"
                          disabled={deleting === asset.id}
                          onClick={() => confirmDelete(asset)}
                          size="sm"
                          variant="outline"
                        >
                          {deleting === asset.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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

      {/* Create/Edit Dialog */}
      <Dialog onOpenChange={setShowDialog} open={showDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Asset" : "Add Asset"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update asset information."
                : "Register a new asset or piece of equipment."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                  value={form.name}
                />
              </div>
              <div className="space-y-2">
                <Label>Asset Type</Label>
                <Select
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, assetType: v }))
                  }
                  value={form.assetType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Manufacturer</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, manufacturer: e.target.value }))
                  }
                  placeholder="Vulcan"
                  value={form.manufacturer}
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, model: e.target.value }))
                  }
                  placeholder="VSH96E"
                  value={form.model}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, serialNumber: e.target.value }))
                  }
                  placeholder="SN-12345"
                  value={form.serialNumber}
                />
              </div>
              {editing && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                    value={form.status}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="disposed">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <DatePicker
                  onChange={(e) =>
                    setForm((p) => ({ ...p, purchaseDate: e.target.value }))
                  }
                  value={form.purchaseDate}
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Cost</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, purchaseCost: e.target.value }))
                  }
                  placeholder="5000.00"
                  step="0.01"
                  type="number"
                  value={form.purchaseCost}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Warranty Expiry</Label>
                <DatePicker
                  onChange={(e) =>
                    setForm((p) => ({ ...p, warrantyExpiry: e.target.value }))
                  }
                  value={form.warrantyExpiry}
                />
              </div>
              <div className="space-y-2">
                <Label>Facility Area</Label>
                <Select
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      areaId: v === NO_AREA_ID ? "" : v,
                    }))
                  }
                  value={form.areaId || NO_AREA_ID}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No area assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_AREA_ID}>None</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                        {area.code ? ` (${area.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Additional notes..."
                rows={2}
                value={form.notes}
              />
            </div>

            <DialogFooter>
              <Button
                onClick={() => setShowDialog(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={!form.name.trim() || saving} type="submit">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Add"} Asset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setAssetToDelete(null);
        }}
        open={deleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {assetToDelete?.name || "this asset"}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting === assetToDelete?.id}
              onClick={() => {
                if (assetToDelete) handleDelete(assetToDelete.id);
              }}
            >
              {deleting === assetToDelete?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
