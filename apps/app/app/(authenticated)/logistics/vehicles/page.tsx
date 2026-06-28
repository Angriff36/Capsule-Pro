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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
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
import type { ComponentType, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listVehicles,
  vehicleCreate,
  vehicleRemove,
  vehicleUpdate,
} from "@/app/lib/manifest-client.generated";
import { OperationalPageShell } from "../../components/operational-page-shell";
import { SampleDataImportButton } from "../../components/sample-data-import-button";

type VehicleStatus = "available" | "in_use" | "maintenance" | "out_of_service";

interface VehicleForm {
  capacityVolume: string;
  capacityWeight: string;
  fuelType: string;
  make: string;
  mileage: string;
  model: string;
  notes: string;
  plateNumber: string;
  status: VehicleStatus;
  vin: string;
  year: string;
}

interface Vehicle {
  assigned_drivers: number;
  capacity_volume: number | null;
  capacity_weight: number | null;
  fuel_type: string | null;
  id: string;
  make: string;
  mileage: number | null;
  model: string;
  notes: string | null;
  plate_number: string | null;
  status: VehicleStatus | string;
  vin: string | null;
  year: number | null;
}

const STATUS_CONFIG: Record<
  VehicleStatus,
  {
    color: string;
    icon: ComponentType<{ className?: string }>;
    iconColor: string;
    label: string;
  }
> = {
  available: {
    color: "bg-muted/50 text-foreground",
    icon: CheckCircle2,
    iconColor: "text-green-500",
    label: "Available",
  },
  in_use: {
    color: "bg-muted/50 text-foreground",
    icon: Truck,
    iconColor: "text-blue-500",
    label: "In Use",
  },
  maintenance: {
    color: "bg-muted/50 text-foreground",
    icon: Wrench,
    iconColor: "text-amber-500",
    label: "Maintenance",
  },
  out_of_service: {
    color: "bg-muted/50 text-foreground",
    icon: AlertTriangle,
    iconColor: "text-red-500",
    label: "Out of Service",
  },
};

const STATUS_ORDER = [
  "available",
  "in_use",
  "maintenance",
  "out_of_service",
] as const satisfies readonly VehicleStatus[];

const DEFAULT_FORM: VehicleForm = {
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
};

const getVehicleName = (vehicle: Pick<Vehicle, "make" | "model" | "year">) =>
  `${vehicle.year ? `${vehicle.year} ` : ""}${vehicle.make} ${vehicle.model}`;

const optionalFloat = (value: string) =>
  value ? Number.parseFloat(value) : undefined;

const optionalInt = (value: string) =>
  value ? Number.parseInt(value, 10) : undefined;

const emptyToUndefined = (value: string) => value || undefined;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const getStatusConfig = (status: string) =>
  status in STATUS_CONFIG
    ? STATUS_CONFIG[status as VehicleStatus]
    : STATUS_CONFIG.available;

const normalizeStatus = (status: string): VehicleStatus =>
  status in STATUS_CONFIG ? (status as VehicleStatus) : "available";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [form, setForm] = useState<VehicleForm>(DEFAULT_FORM);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listVehicles();
      setVehicles(result.data as unknown as Vehicle[]);
    } catch (e) {
      console.error("Failed to load vehicles:", e);
      toast.error("Failed to load vehicles", {
        description: getErrorMessage(e),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles().catch((error: unknown) => {
      console.error("Failed to load vehicles:", error);
    });
  }, [loadVehicles]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(
      STATUS_ORDER.map((status) => [status, 0])
    ) as Record<VehicleStatus, number>;

    for (const vehicle of vehicles) {
      if (vehicle.status in counts) {
        counts[vehicle.status as VehicleStatus] += 1;
      }
    }

    return counts;
  }, [vehicles]);

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
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
      status: normalizeStatus(vehicle.status),
      notes: vehicle.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!(form.make.trim() && form.model.trim())) {
      return;
    }

    const payload = {
      make: form.make.trim(),
      model: form.model.trim(),
      year: optionalInt(form.year),
      plateNumber: emptyToUndefined(form.plateNumber),
      vin: emptyToUndefined(form.vin),
      capacityWeight: optionalFloat(form.capacityWeight),
      capacityVolume: optionalFloat(form.capacityVolume),
      fuelType: emptyToUndefined(form.fuelType),
      mileage: optionalFloat(form.mileage),
      notes: emptyToUndefined(form.notes),
    };

    setSaving(true);
    try {
      if (editing) {
        await vehicleUpdate({
          id: editing.id,
          ...payload,
        });
        toast.success("Vehicle updated successfully");
      } else {
        await vehicleCreate({
          ...payload,
          status: form.status,
        });
        toast.success("Vehicle added successfully");
      }

      await loadVehicles();
      setShowDialog(false);
      setEditing(null);
      setForm(DEFAULT_FORM);
    } catch (e) {
      console.error("Failed to save:", e);
      toast.error("Failed to save vehicle", {
        description: getErrorMessage(e),
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (vehicle: { id: string; name: string }) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async (vehicleId: string) => {
    setDeleting(vehicleId);
    try {
      await vehicleRemove({ id: vehicleId });
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      toast.success("Vehicle deleted successfully");
    } catch (e) {
      console.error("Failed to delete:", e);
      toast.error("Failed to delete vehicle", {
        description: getErrorMessage(e),
      });
    } finally {
      setDeleting(null);
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
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
    <>
      <OperationalPageShell
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        }
        description="Manage fleet vehicles, capacity, and maintenance status."
        eyebrow="Logistics / Vehicles"
        title="Vehicles"
      >
        {/* Status Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {STATUS_ORDER.map((status) => {
            const config = STATUS_CONFIG[status];
            const count = statusCounts[status];
            return (
              <Card key={status} tone="soft-stone">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    {config.label}
                  </CardTitle>
                  <config.icon className={`h-4 w-4 ${config.iconColor}`} />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Vehicle List */}
        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Truck />
                  </EmptyMedia>
                  <EmptyTitle>No vehicles yet</EmptyTitle>
                  <EmptyDescription>
                    Add fleet vehicles to manage capacity, maintenance status,
                    and driver assignments.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <p className="text-muted-foreground text-xs">
                    Click <strong>Add Vehicle</strong> above to register your
                    first vehicle, or import sample data to explore.
                  </p>
                  <SampleDataImportButton onSeeded={loadVehicles} />
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => {
              const config = getStatusConfig(vehicle.status);
              const Icon = config.icon;
              return (
                <Card
                  className="transition-shadow hover:border-primary/40"
                  key={vehicle.id}
                  tone="canvas"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-semibold">
                            {getVehicleName(vehicle)}
                          </span>
                          <Badge className={config.color}>{config.label}</Badge>
                          {vehicle.assigned_drivers > 0 && (
                            <Badge variant="secondary">
                              {vehicle.assigned_drivers} driver
                              {vehicle.assigned_drivers > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground text-sm">
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
                          aria-label={`Edit ${getVehicleName(vehicle)}`}
                          onClick={() => openEdit(vehicle)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </Button>
                        <Button
                          aria-label={`Delete ${getVehicleName(vehicle)}`}
                          className="text-red-500 hover:text-red-700"
                          disabled={deleting === vehicle.id}
                          onClick={() =>
                            confirmDelete({
                              id: vehicle.id,
                              name: getVehicleName(vehicle),
                            })
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {deleting === vehicle.id ? (
                            <Loader2
                              aria-hidden="true"
                              className="h-4 w-4 animate-spin"
                            />
                          ) : (
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
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
      </OperationalPageShell>

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
          <form className="space-y-4" onSubmit={handleSave}>
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
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, status: v as VehicleStatus }))
                  }
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

      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{vehicleToDelete?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                vehicleToDelete && handleDelete(vehicleToDelete.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
