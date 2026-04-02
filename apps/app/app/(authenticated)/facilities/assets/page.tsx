"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Search,
  Wrench,
  Archive,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { FacilitiesNavigation } from "../components/facilities-navigation";

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  warranty_expiry: string | null;
  status: string;
  area_id: string | null;
  area_name: string | null;
  area_code: string | null;
  notes: string | null;
}

interface Area {
  id: string;
  name: string;
  code: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  maintenance: { label: "Maintenance", color: "bg-amber-100 text-amber-700", icon: Wrench },
  retired: { label: "Retired", color: "bg-gray-100 text-gray-700", icon: Archive },
  disposed: { label: "Disposed", color: "bg-red-100 text-red-700", icon: AlertTriangle },
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

const formatCurrency = (n: number | null) =>
  n ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n) : "—";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
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
      const [assetsRes, areasRes] = await Promise.all([
        fetch("/api/facilities/assets/list?status=all"),
        fetch("/api/facilities/areas/list?status=all"),
      ]);
      const assetsData = await assetsRes.json();
      const areasData = await areasRes.json();
      if (assetsData.success) setAssets(assetsData.data.assets || []);
      if (areasData.success) setAreas(areasData.data.areas || []);
    } catch (e) {
      console.error("Failed to load:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.serial_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.manufacturer || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.area_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "", assetType: "other", serialNumber: "", manufacturer: "",
      model: "", purchaseDate: "", purchaseCost: "", warrantyExpiry: "",
      areaId: "", status: "active", notes: "",
    });
    setShowDialog(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      name: asset.name,
      assetType: asset.asset_type,
      serialNumber: asset.serial_number || "",
      manufacturer: asset.manufacturer || "",
      model: asset.model || "",
      purchaseDate: asset.purchase_date?.slice(0, 10) || "",
      purchaseCost: asset.purchase_cost?.toString() || "",
      warrantyExpiry: asset.warranty_expiry?.slice(0, 10) || "",
      areaId: asset.area_id || "",
      status: asset.status,
      notes: asset.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const endpoint = editing
        ? "/api/facilities/assets/commands/update"
        : "/api/facilities/assets/commands/create";
      const body = editing
        ? {
            assetId: editing.id,
            name: form.name,
            assetType: form.assetType,
            serialNumber: form.serialNumber || null,
            manufacturer: form.manufacturer || null,
            model: form.model || null,
            purchaseDate: form.purchaseDate || null,
            purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : null,
            warrantyExpiry: form.warrantyExpiry || null,
            status: form.status,
            areaId: form.areaId || null,
            notes: form.notes || null,
          }
        : {
            name: form.name,
            assetType: form.assetType,
            serialNumber: form.serialNumber || null,
            manufacturer: form.manufacturer || null,
            model: form.model || null,
            purchaseDate: form.purchaseDate || null,
            purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : null,
            warrantyExpiry: form.warrantyExpiry || null,
            areaId: form.areaId || null,
            notes: form.notes || null,
          };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
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
      await fetch("/api/facilities/assets/commands/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (e) {
      console.error("Failed to delete:", e);
    } finally {
      setDeleting(null);
    }
  };

  const totalValue = assets
    .filter((a) => a.status === "active")
    .reduce((sum, a) => sum + (a.purchase_cost || 0), 0);

  const warrantyExpiring = assets.filter(
    (a) =>
      a.warranty_expiry &&
      a.status === "active" &&
      new Date(a.warranty_expiry) < new Date(Date.now() + 90 * 86400000)
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
            <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
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
          <Badge variant="outline">Active value: {formatCurrency(totalValue)}</Badge>
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
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
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
                  <config.icon className={`h-4 w-4 ${status === "active" ? "text-green-500" : status === "maintenance" ? "text-amber-500" : "text-gray-500"}`} />
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
              <p>{search ? "No assets match your search." : "No assets found. Add an asset to get started."}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAssets.map((asset) => {
              const config = STATUS_CONFIG[asset.status] || STATUS_CONFIG.active;
              const Icon = config.icon;
              const isWarrantyExpiring =
                asset.warranty_expiry &&
                asset.status === "active" &&
                new Date(asset.warranty_expiry) < new Date(Date.now() + 90 * 86400000);
              return (
                <Card key={asset.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{asset.name}</span>
                          <Badge className={config.color}>{config.label}</Badge>
                          <Badge variant="outline">{ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</Badge>
                          {isWarrantyExpiring && (
                            <Badge variant="destructive">Warranty expiring</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {asset.serial_number && <span>SN: {asset.serial_number}</span>}
                          {asset.manufacturer && <span>{asset.manufacturer}{asset.model ? ` ${asset.model}` : ""}</span>}
                          {asset.area_name && <span>📍 {asset.area_name}</span>}
                          {asset.purchase_cost != null && <span>{formatCurrency(asset.purchase_cost)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(asset)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(asset.id)}
                          disabled={deleting === asset.id}
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
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Asset" : "Add Asset"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update asset information." : "Register a new asset or piece of equipment."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Asset Type</Label>
                <Select value={form.assetType} onValueChange={(v) => setForm((p) => ({ ...p, assetType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Manufacturer</Label>
                <Input value={form.manufacturer} onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))} placeholder="Vulcan" />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="VSH96E" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input value={form.serialNumber} onChange={(e) => setForm((p) => ({ ...p, serialNumber: e.target.value }))} placeholder="SN-12345" />
              </div>
              {editing && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input type="date" value={form.purchaseDate} onChange={(e) => setForm((p) => ({ ...p, purchaseDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Purchase Cost</Label>
                <Input type="number" step="0.01" value={form.purchaseCost} onChange={(e) => setForm((p) => ({ ...p, purchaseCost: e.target.value }))} placeholder="5000.00" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Warranty Expiry</Label>
                <Input type="date" value={form.warrantyExpiry} onChange={(e) => setForm((p) => ({ ...p, warrantyExpiry: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Facility Area</Label>
                <Select value={form.areaId} onValueChange={(v) => setForm((p) => ({ ...p, areaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="No area assigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}{area.code ? ` (${area.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional notes..." />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.name.trim() || saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Add"} Asset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
