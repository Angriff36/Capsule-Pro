"use client";

/**
 * Facilities Hub
 *
 * Lists every top-level facility (building/site) the tenant has registered,
 * plus the four domain links (Work Orders, PM Schedules, Areas, Assets).
 * The "Add Facility" CTA opens the create dialog and persists via
 * the Manifest runtime (Facility.create command).
 */

import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
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
  Building2,
  Calendar,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { facilityEdit, facilityRemove } from "@/app/lib/manifest-client.generated";
import { createFacility, getFacilities } from "./actions";
import { UpcomingMaintenanceWidget } from "./components/upcoming-maintenance-widget";

interface Facility {
  id: string;
  name: string;
  code: string | null;
  facilityType: string;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
}

const FACILITY_TYPE_LABELS: Record<string, string> = {
  kitchen: "Kitchen",
  warehouse: "Warehouse",
  commissary: "Commissary",
  office: "Office",
  other: "Other",
};

const DOMAIN_LINKS = [
  {
    href: "/facilities/work-orders",
    icon: Wrench,
    label: "Work Orders",
    description: "Report issues, track repairs, and manage maintenance tasks.",
  },
  {
    href: "/facilities/schedules",
    icon: Calendar,
    label: "PM Schedules",
    description: "Preventive maintenance scheduling with calendar view.",
  },
  {
    href: "/facilities/areas",
    icon: MapPin,
    label: "Areas",
    description: "Define and manage areas within your facility.",
  },
  {
    href: "/facilities/assets",
    icon: Package,
    label: "Assets",
    description: "Track equipment, warranties, and maintenance needs.",
  },
];

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    facilityType: "kitchen",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const facilities = await getFacilities();
      setFacilities(facilities || []);
    } catch {
      // Graceful fallback — empty list
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      code: "",
      facilityType: "kitchen",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      phone: "",
      notes: "",
    });
    setShowDialog(true);
  };

  const openEdit = (facility: Facility) => {
    setEditing(facility);
    setForm({
      name: facility.name,
      code: facility.code || "",
      facilityType: facility.facilityType,
      addressLine1: facility.addressLine1 || "",
      city: facility.city || "",
      state: facility.state || "",
      postalCode: facility.postalCode || "",
      phone: facility.phone || "",
      notes: facility.notes || "",
    });
    setShowDialog(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(form.name.trim() && editing)) return;
    setSaving(true);
    try {
      await facilityEdit({
        facilityId: editing.id,
        name: form.name,
        code: form.code || null,
        facilityType: form.facilityType,
        addressLine1: form.addressLine1 || null,
        city: form.city || null,
        state: form.state || null,
        postalCode: form.postalCode || null,
        phone: form.phone || null,
        notes: form.notes || null,
      });
      await loadFacilities();
      setShowDialog(false);
    } catch {
      // Graceful fallback
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (facilityId: string) => {
    setDeleting(facilityId);
    try {
      await facilityRemove({ facilityId });
      setFacilities((prev) => prev.filter((f) => f.id !== facilityId));
      setDeleteDialogOpen(false);
      setFacilityToDelete(null);
    } catch {
      // Graceful fallback
    } finally {
      setDeleting(null);
    }
  };

  const confirmDelete = (facility: Facility) => {
    setFacilityToDelete({ id: facility.id, name: facility.name });
    setDeleteDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("code", form.code);
      formData.append("facilityType", form.facilityType);
      formData.append("addressLine1", form.addressLine1);
      formData.append("city", form.city);
      formData.append("state", form.state);
      formData.append("postalCode", form.postalCode);
      formData.append("phone", form.phone);
      formData.append("notes", form.notes);
      await createFacility(formData);
      await loadFacilities();
      setShowDialog(false);
    } catch {
      // Graceful fallback
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Facilities</MonoLabel>
            <DisplayHeading>Facility Management</DisplayHeading>
            <CommandBandLede>
              Maintenance scheduling, work orders, and facility management.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              onClick={openCreate}
              size="sm"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Facility
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <UpcomingMaintenanceWidget />

        <section className="space-y-4">
          <SectionHeader
            count={`${facilities.length} site${facilities.length !== 1 ? "s" : ""}`}
            description="Registered buildings and sites (kitchens, warehouses, offices)."
            eyebrow="Sites"
            title="Your Facilities"
          />

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : facilities.length === 0 ? (
            <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-10 text-center">
              <Building2 className="mx-auto h-10 w-10 opacity-50" />
              <p className="mt-3 text-ink text-sm leading-relaxed">
                No facilities yet. Click &quot;Add Facility&quot; to register
                your first site.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {facilities.map((facility) => (
                <div
                  className="rounded-[22px] border border-hairline bg-canvas p-5"
                  key={facility.id}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink border border-hairline">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{facility.name}</span>
                        <Badge variant="outline">
                          {FACILITY_TYPE_LABELS[facility.facilityType] ||
                            facility.facilityType}
                        </Badge>
                        {facility.code ? (
                          <Badge variant="secondary">{facility.code}</Badge>
                        ) : null}
                      </div>
                      <div className="space-y-0.5 text-sm text-muted-foreground">
                        {facility.addressLine1 ? (
                          <div>{facility.addressLine1}</div>
                        ) : null}
                        {facility.city || facility.state ? (
                          <div>
                            {[facility.city, facility.state]
                              .filter(Boolean)
                              .join(", ")}
                            {facility.postalCode
                              ? ` ${facility.postalCode}`
                              : ""}
                          </div>
                        ) : null}
                        {facility.phone ? <div>{facility.phone}</div> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => openEdit(facility)}
                        size="sm"
                        variant="ghost"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        className="text-red-500 hover:text-red-700"
                        disabled={deleting === facility.id}
                        onClick={() => confirmDelete(facility)}
                        size="sm"
                        variant="ghost"
                      >
                        {deleting === facility.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader
            description="Navigate to facility sub-modules."
            eyebrow="Modules"
            title="Domain Links"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DOMAIN_LINKS.map((link) => (
              <Link href={link.href} key={link.href}>
                <div className="group rounded-[22px] border border-hairline bg-canvas p-5 transition-colors hover:bg-accent">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink border border-hairline">
                      <link.icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold">{link.label}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {link.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </OperationalColumn>

      {/* Create/Edit Facility Dialog */}
      <Dialog onOpenChange={setShowDialog} open={showDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Facility" : "Add Facility"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update facility information."
                : "Register a new building or site (kitchen, warehouse, office, …)."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={editing ? handleEdit : handleSave}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  name="name"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  required
                  value={form.name}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, facilityType: v }))
                  }
                  value={form.facilityType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FACILITY_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                {!editing && (
                  <input
                    name="facilityType"
                    type="hidden"
                    value={form.facilityType}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  name="code"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                  }
                  placeholder="MAIN-KIT"
                  value={form.code}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  name="phone"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="+1 555 123 4567"
                  value={form.phone}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                name="addressLine1"
                onChange={(e) =>
                  setForm((p) => ({ ...p, addressLine1: e.target.value }))
                }
                placeholder="123 Main Street"
                value={form.addressLine1}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  name="city"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, city: e.target.value }))
                  }
                  placeholder="Austin"
                  value={form.city}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  name="state"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, state: e.target.value }))
                  }
                  placeholder="TX"
                  value={form.state}
                />
              </div>
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input
                  name="postalCode"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, postalCode: e.target.value }))
                  }
                  placeholder="78701"
                  value={form.postalCode}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                name="notes"
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Additional notes…"
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
                {editing ? "Update" : "Add"} Facility
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setFacilityToDelete(null);
        }}
        open={deleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Facility</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {facilityToDelete?.name || "this facility"}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting === facilityToDelete?.id}
              onClick={() => {
                if (facilityToDelete) handleDelete(facilityToDelete.id);
              }}
            >
              {deleting === facilityToDelete?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageCanvas>
  );
}
