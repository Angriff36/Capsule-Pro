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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Shield,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listDrivers,
  listVehicles,
  driverRemove,
  driverUpdate,
} from "@/app/lib/manifest-client.generated";
import { createDriver } from "../actions";

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  status: string;
  vehicle_id: string | null;
  vehicle_name: string | null;
  notes: string | null;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  plate_number: string | null;
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
    color: "bg-muted/50 text-foreground",
    icon: CheckCircle2,
  },
  on_route: {
    label: "On Route",
    color: "bg-muted/50 text-foreground",
    icon: Truck,
  },
  off_duty: {
    label: "Off Duty",
    color: "bg-muted/50 text-foreground",
    icon: Clock,
  },
  inactive: {
    label: "Inactive",
    color: "bg-muted/50 text-foreground",
    icon: Shield,
  },
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    licenseNumber: "",
    licenseExpiry: "",
    vehicleId: "__none__",
    status: "available",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversResult, vehiclesResult] = await Promise.all([
        listDrivers(),
        listVehicles(),
      ]);
      setDrivers(driversResult.data as unknown as Driver[]);
      setVehicles(vehiclesResult.data as unknown as Vehicle[]);
    } catch (e) {
      console.error("Failed to load:", e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      phone: "",
      email: "",
      licenseNumber: "",
      licenseExpiry: "",
      vehicleId: "__none__",
      status: "available",
      notes: "",
    });
    setShowDialog(true);
  };

  const openEdit = (driver: Driver) => {
    setEditing(driver);
    setForm({
      name: driver.name,
      phone: driver.phone || "",
      email: driver.email || "",
      licenseNumber: driver.license_number || "",
      licenseExpiry: driver.license_expiry?.slice(0, 10) || "",
      vehicleId: driver.vehicle_id || "__none__",
      status: driver.status,
      notes: driver.notes || "",
    });
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await driverUpdate({
          driverId: editing.id,
          ...form,
          vehicleId:
            form.vehicleId === "__none__" ? null : form.vehicleId || null,
        });
        toast.success("Driver updated successfully");
        await loadData();
        setShowDialog(false);
      } else {
        // Use the server action for creation
        const fd = new FormData();
        fd.set("name", form.name);
        fd.set("phone", form.phone);
        fd.set("email", form.email);
        fd.set("licenseNumber", form.licenseNumber);
        fd.set("licenseExpiry", form.licenseExpiry);
        fd.set("vehicleId", form.vehicleId);
        fd.set("status", form.status);
        fd.set("notes", form.notes);
        await createDriver(fd);
      }
    } catch (e) {
      console.error("Failed to save:", e);
      toast.error("Failed to save driver", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (driver: { id: string; name: string }) => {
    setDriverToDelete(driver);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async (driverId: string) => {
    setDeleting(driverId);
    try {
      await driverRemove({ driverId });
      setDrivers((prev) => prev.filter((d) => d.id !== driverId));
    } catch (e) {
      console.error("Failed to delete:", e);
    } finally {
      setDeleting(null);
      setDeleteDialogOpen(false);
      setDriverToDelete(null);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
          <p className="text-muted-foreground">
            Manage delivery drivers and assignments.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(["available", "on_route", "off_duty"] as const).map((status) => {
          const config = STATUS_CONFIG[status];
          const count = drivers.filter((d) => d.status === status).length;
          return (
            <Card key={status} tone="soft-stone">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {config.label}
                </CardTitle>
                <config.icon
                  className={`h-4 w-4 ${status === "available" ? "text-green-500" : status === "on_route" ? "text-blue-500" : "text-gray-500"}`}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {drivers.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <User />
                </EmptyMedia>
                <EmptyTitle>No drivers yet</EmptyTitle>
                <EmptyDescription>
                  Add delivery drivers to manage assignments and track availability.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <p className="text-muted-foreground text-xs">
                  Click <strong>Add Driver</strong> above to create your first driver.
                </p>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drivers.map((driver) => {
            const config =
              STATUS_CONFIG[driver.status] || STATUS_CONFIG.available;
            const Icon = config.icon;
            return (
              <Card
                className="hover:border-primary/40 transition-shadow"
                key={driver.id}
                tone="canvas"
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
                        <span className="font-semibold">{driver.name}</span>
                        <Badge className={config.color}>{config.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {driver.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {driver.phone}
                          </span>
                        )}
                        {driver.vehicle_name && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {driver.vehicle_name}
                          </span>
                        )}
                        {driver.license_number && (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {driver.license_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => openEdit(driver)}
                        size="sm"
                        variant="outline"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        className="text-red-500 hover:text-red-700"
                        disabled={deleting === driver.id}
                        onClick={() =>
                          confirmDelete({
                            id: driver.id,
                            name: driver.name || "this driver",
                          })
                        }
                        size="sm"
                        variant="outline"
                      >
                        {deleting === driver.id ? (
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
            <DialogTitle>{editing ? "Edit Driver" : "Add Driver"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update driver information."
                : "Add a new delivery driver."}
            </DialogDescription>
          </DialogHeader>
          <form
            action={createDriver}
            className="space-y-4"
            onSubmit={handleSave}
          >
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
                <Label>Phone</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="(555) 000-0000"
                  value={form.phone}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  type="email"
                  value={form.email}
                />
              </div>
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
                    <SelectItem value="on_route">On Route</SelectItem>
                    <SelectItem value="off_duty">Off Duty</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input
                  onChange={(e) =>
                    setForm((p) => ({ ...p, licenseNumber: e.target.value }))
                  }
                  placeholder="CDL-123456"
                  value={form.licenseNumber}
                />
              </div>
              <div className="space-y-2">
                <Label>License Expiry</Label>
                <DatePicker
                  onChange={(e) =>
                    setForm((p) => ({ ...p, licenseExpiry: e.target.value }))
                  }
                  value={form.licenseExpiry}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assigned Vehicle</Label>
              <Select
                onValueChange={(v) => setForm((p) => ({ ...p, vehicleId: v }))}
                value={form.vehicleId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No vehicle assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.make} {v.model}{" "}
                      {v.plate_number ? `(${v.plate_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
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
                {editing ? "Update" : "Add"} Driver
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Driver?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{driverToDelete?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => driverToDelete && handleDelete(driverToDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
