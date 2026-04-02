"use client";

import { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Fuel,
  Weight,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Wrench,
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

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  plate_number: string | null;
  vin: string | null;
  capacity_weight: number | null;
  capacity_volume: number | null;
  fuel_type: string | null;
  mileage: number | null;
  status: string;
  notes: string | null;
  assigned_drivers: number;
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  available: {
    label: "Available",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  in_use: {
    label: "In Use",
    color: "bg-blue-100 text-blue-700",
    icon: Truck,
  },
  maintenance: {
    label: "Maintenance",
    color: "bg-amber-100 text-amber-700",
    icon: Wrench,
  },
  out_of_service: {
    label: "Out of Service",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    make: "",
    model: "",
    year: "",
    plateNumber: "",
    vin: "",
    capacityWeight: "",
    capacityVolume: "",
    fuelType: "",
    mileage: "",
    status: "available",
    notes: "",
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logistics/vehicles/list");
      const data = await res.json();
      if (data.success) setVehicles(data.data.vehicles || []);
    } catch (e) {
      console.error("Failed to load vehicles:", e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      make: "",
      model: "",
      year: "",
      plateNumber: "",
      vin: "",
      capacityWeight: "",
      capacityVolume: "",
      fuelType: "",
      mileage: "",
      status: "available",
      notes: "",
    });
    setShowDialog(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditing(vehicle);
    setForm({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year?.toString() || "",
      plateNumber: vehicle.plate_number || "",
      vin: vehicle.vin || "",
      capacityWeight: vehicle.capacity_weight?.toString() || "",
      capacityVolume: vehicle.capacity_volume?.toString() || "",
      fuelType: vehicle.fuel_type || "",
      mileage: vehicle.mileage?.toString() || "",
      status: vehicle.status,
      notes: vehicle.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.make.trim() || !form.model.trim()) return;
    setSaving(true);
    try {
      const endpoint = editing
        ? "/api/logistics/vehicles/commands/update"
        : "/api/logistics/vehicles/commands/create";
      const body = editing
        ? {
            vehicleId: editing.id,
            make: form.make,
            model: form.model,
            year: form.year ? parseInt(form.year) : null,
            plateNumber: form.plateNumber || null,
            vin: form.vin || null,
            capacityWeight: form.capacityWeight
              ? parseFloat(form.capacityWeight)
              : null,
            capacityVolume: form.capacityVolume
              ? parseFloat(form.capacityVolume)
              : null,
            fuelType: form.fuelType || null,
            mileage: form.mileage ? parseFloat(form.mileage) : null,
            status: form.status,
            notes: form.notes || null,
          }
        : {
            make: form.make,
            model: form.model,
            year: form.year ? parseInt(form.year) : null,
            plateNumber: form.plateNumber || null,
            vin: form.vin || null,
            capacityWeight: form.capacityWeight
              ? parseFloat(form.capacityWeight)
              : null,
            capacityVolume: form.capacityVolume
              ? parseFloat(form.capacityVolume)
              : null,
            fuelType: form.fuelType || null,
            notes: form.notes || null,
          };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await loadVehicles();
        setShowDialog(false);
      }
    } catch (e) {
      console.error("Failed to save:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    setDeleting(vehicleId);
    try {
      await fetch("/api/logistics/vehicles/commands/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    } catch (e) {
      console.error("Failed to delete:", e);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground">
            Manage fleet vehicles, capacity, and maintenance status.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {(["available", "in_use", "maintenance", "out_of_service"] as const).map(
          (status) => {
            const config = STATUS_CONFIG[status];
            const count = vehicles.filter((v) => v.status === status).length;
            return (
              <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {config.label}
                  </CardTitle>
                  <config.icon
                    className={`h-4 w-4 ${
                      status === "available"
                        ? "text-green-500"
                        : status === "in_use"
                          ? "text-blue-500"
                          : status === "maintenance"
                            ? "text-amber-500"
                            : "text-red-500"
                    }`}
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      {/* Vehicle List */}
      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No vehicles found. Add a vehicle to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vehicles.map((vehicle) => {
            const config =
              STATUS_CONFIG[vehicle.status] || STATUS_CONFIG.available;
            const Icon = config.icon;
            return (
              <Card
                key={vehicle.id}
                className="hover:shadow-sm transition-shadow"
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
                        <span className="font-semibold">
                          {vehicle.year ? `${vehicle.year} ` : ""}
                          {vehicle.make} {vehicle.model}
                        </span>
                        <Badge className={config.color}>{config.label}</Badge>
                        {vehicle.assigned_drivers > 0 && (
                          <Badge variant="secondary">
                            {vehicle.assigned_drivers} driver
                            {vehicle.assigned_drivers > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {vehicle.plate_number && (
                          <span>{vehicle.plate_number}</span>
                        )}
                        {vehicle.fuel_type && (
                          <span className="flex items-center gap-1">
                            <Fuel className="h-3 w-3" />
                            {vehicle.fuel_type}
                          </span>
                        )}
                        {vehicle.capacity_weight && (
                          <span className="flex items-center gap-1">
                            <Weight className="h-3 w-3" />
                            {vehicle.capacity_weight} lbs
                          </span>
                        )}
                        {vehicle.mileage && (
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            {vehicle.mileage.toLocaleString()} mi
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(vehicle)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(vehicle.id)}
                        disabled={deleting === vehicle.id}
                      >
                        {deleting === vehicle.id ? (
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update vehicle information."
                : "Add a new vehicle to the fleet."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Make *</Label>
                <Input
                  value={form.make}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, make: e.target.value }))
                  }
                  placeholder="Ford"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Model *</Label>
                <Input
                  value={form.model}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, model: e.target.value }))
                  }
                  placeholder="Transit"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  min="1900"
                  max="2030"
                  value={form.year}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, year: e.target.value }))
                  }
                  placeholder="2024"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plate Number</Label>
                <Input
                  value={form.plateNumber}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, plateNumber: e.target.value }))
                  }
                  placeholder="ABC-1234"
                />
              </div>
              <div className="space-y-2">
                <Label>VIN</Label>
                <Input
                  value={form.vin}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, vin: e.target.value }))
                  }
                  placeholder="1HGBH41JXMN109186"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="out_of_service">
                      Out of Service
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fuel Type</Label>
                <Select
                  value={form.fuelType}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, fuelType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gasoline">Gasoline</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="propane">Propane</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Capacity (lbs)</Label>
                <Input
                  type="number"
                  value={form.capacityWeight}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, capacityWeight: e.target.value }))
                  }
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label>Capacity (cu ft)</Label>
                <Input
                  type="number"
                  value={form.capacityVolume}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, capacityVolume: e.target.value }))
                  }
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label>Mileage</Label>
                <Input
                  type="number"
                  value={form.mileage}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, mileage: e.target.value }))
                  }
                  placeholder="45000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                rows={2}
                placeholder="Vehicle notes..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.make.trim() || !form.model.trim() || saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Add"} Vehicle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
