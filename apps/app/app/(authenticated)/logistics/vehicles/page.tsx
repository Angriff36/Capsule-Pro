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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  Fuel,
  Gauge,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Truck,
  Weight,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { createVehicle } from "../actions";

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
      const res = await apiFetch("/api/logistics/vehicles/list");
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
    if (!(form.make.trim() && form.model.trim())) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await apiFetch("/api/logistics/vehicles/commands/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleId: editing.id,
            make: form.make,
            model: form.model,
            year: form.year ? Number.parseInt(form.year) : null,
            plateNumber: form.plateNumber || null,
            vin: form.vin || null,
            capacityWeight: form.capacityWeight
              ? Number.parseFloat(form.capacityWeight)
              : null,
            capacityVolume: form.capacityVolume
              ? Number.parseFloat(form.capacityVolume)
              : null,
            fuelType: form.fuelType || null,
            mileage: form.mileage ? Number.parseFloat(form.mileage) : null,
            status: form.status,
            notes: form.notes || null,
          }),
        });
        if (res.ok) {
          toast.success("Vehicle updated successfully");
          await loadVehicles();
          setShowDialog(false);
        }
      } else {
        // Use the server action for creation
        const fd = new FormData();
        fd.set("make", form.make);
        fd.set("model", form.model);
        if (form.year) fd.set("year", form.year);
        fd.set("plateNumber", form.plateNumber);
        fd.set("vin", form.vin);
        if (form.capacityWeight) fd.set("capacityWeight", form.capacityWeight);
        if (form.capacityVolume) fd.set("capacityVolume", form.capacityVolume);
        fd.set("fuelType", form.fuelType);
        if (form.mileage) fd.set("mileage", form.mileage);
        fd.set("status", form.status);
        fd.set("notes", form.notes);
        await createVehicle(fd);
      }
    } catch (e) {
      console.error("Failed to save:", e);
      toast.error("Failed to save vehicle", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    setDeleting(vehicleId);
    try {
      await apiFetch("/api/logistics/vehicles/commands/delete", {
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
        {(
          ["available", "in_use", "maintenance", "out_of_service"] as const
        ).map((status) => {
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
        })}
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
                className="hover:shadow-sm transition-shadow"
                key={vehicle.id}
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
                        onClick={() => openEdit(vehicle)}
                        size="sm"
                        variant="outline"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        className="text-red-500 hover:text-red-700"
                        disabled={deleting === vehicle.id}
                        onClick={() => handleDelete(vehicle.id)}
                        size="sm"
                        variant="outline"
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
      <Dialog onOpenChange={setShowDialog} open={showDialog}>
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
          <form action={createVehicle} className="space-y-4" onSubmit={handleSave}>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Make *</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, make: e.target.value }))
                  }
                  placeholder="Ford"
                  required
                  value={form.make}
                />
              </div>
              <div className="space-y-2">
                <Label>Model *</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, model: e.target.value }))
                  }
                  placeholder="Transit"
                  required
                  value={form.model}
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  max="2030"
                  min="1900"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, year: e.target.value }))
                  }
                  placeholder="2024"
                  type="number"
                  value={form.year}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plate Number</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, plateNumber: e.target.value }))
                  }
                  placeholder="ABC-1234"
                  value={form.plateNumber}
                />
              </div>
              <div className="space-y-2">
                <Label>VIN</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, vin: e.target.value }))
                  }
                  placeholder="1HGBH41JXMN109186"
                  value={form.vin}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  onValueChange={(v) => setForm((p) => ({ ...p, fuelType: v }))}
                  value={form.fuelType}
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
                  onChange={(e) =>
                    setForm((p) => ({ ...p, capacityWeight: e.target.value }))
                  }
                  placeholder="10000"
                  type="number"
                  value={form.capacityWeight}
                />
              </div>
              <div className="space-y-2">
                <Label>Capacity (cu ft)</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, capacityVolume: e.target.value }))
                  }
                  placeholder="500"
                  type="number"
                  value={form.capacityVolume}
                />
              </div>
              <div className="space-y-2">
                <Label>Mileage</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, mileage: e.target.value }))
                  }
                  placeholder="45000"
                  type="number"
                  value={form.mileage}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Vehicle notes..."
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
              <Button
                disabled={!(form.make.trim() && form.model.trim()) || saving}
                type="submit"
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
