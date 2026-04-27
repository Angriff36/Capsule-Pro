"use client";

/**
 * Facilities Hub
 *
 * Lists every top-level facility (a building/site such as a commissary
 * kitchen, warehouse, or office) the tenant has registered, plus the four
 * domain links (Work Orders, PM Schedules, Areas, Assets). The "Add
 * Facility" CTA opens the create dialog and persists via
 * POST /api/facilities/commands/create — closing P0.2 of
 * IMPLEMENTATION_PLAN.md by giving the New Facility E2E backpressure spec
 * a real UI control + API + DB round trip to verify.
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
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
  Plus,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { UpcomingMaintenanceWidget } from "./components/upcoming-maintenance-widget";

interface Facility {
  id: string;
  name: string;
  code: string | null;
  facility_type: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
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

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
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
      const res = await apiFetch("/api/facilities/list?status=all");
      const data = await res.json();
      // manifestSuccessResponse spreads the payload onto the envelope, so
      // the canonical access path is `data.facilities`, NOT `data.data.facilities`.
      if (data.success) {
        setFacilities(data.facilities || []);
      }
    } catch (e) {
      console.error("Failed to load facilities:", e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/facilities/commands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code || null,
          facilityType: form.facilityType,
          addressLine1: form.addressLine1 || null,
          city: form.city || null,
          state: form.state || null,
          postalCode: form.postalCode || null,
          phone: form.phone || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        await loadFacilities();
        setShowDialog(false);
      }
    } catch (err) {
      console.error("Failed to save facility:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Facilities</h1>
          <p className="text-muted-foreground">
            Maintenance scheduling, work orders, and facility management.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Facility
        </Button>
      </div>

      {/* Upcoming Maintenance Widget */}
      <UpcomingMaintenanceWidget />

      {/* Facilities list — small/empty by design; the cards below are the
          real navigation surface. The list exists so the create flow has a
          place to render its result and so the E2E reload check has
          something to assert against. */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Facilities</h2>
          <Badge variant="secondary">{facilities.length}</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : facilities.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>
                No facilities yet. Click "Add Facility" to register your first
                site.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility) => (
              <Card key={facility.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold">{facility.name}</span>
                        <Badge variant="outline">
                          {FACILITY_TYPE_LABELS[facility.facility_type] ||
                            facility.facility_type}
                        </Badge>
                        {facility.code ? (
                          <Badge variant="secondary">{facility.code}</Badge>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        {facility.address_line1 ? (
                          <div>{facility.address_line1}</div>
                        ) : null}
                        {facility.city || facility.state ? (
                          <div>
                            {[facility.city, facility.state]
                              .filter(Boolean)
                              .join(", ")}
                            {facility.postal_code
                              ? ` ${facility.postal_code}`
                              : ""}
                          </div>
                        ) : null}
                        {facility.phone ? <div>{facility.phone}</div> : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/facilities/work-orders">
          <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Wrench className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Work Orders</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Report issues, track repairs, and manage maintenance tasks.
            </p>
          </div>
        </Link>

        <Link href="/facilities/schedules">
          <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">PM Schedules</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Preventive maintenance scheduling with calendar view.
            </p>
          </div>
        </Link>

        <Link href="/facilities/areas">
          <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Areas</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Define and manage areas within your facility.
            </p>
          </div>
        </Link>

        <Link href="/facilities/assets">
          <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                <Package className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Assets</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Track equipment, warranties, and maintenance needs.
            </p>
          </div>
        </Link>
      </div>

      {/* Create Facility Dialog */}
      <Dialog onOpenChange={setShowDialog} open={showDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Facility</DialogTitle>
            <DialogDescription>
              Register a new building or site (kitchen, warehouse, office, …).
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
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
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
                Add Facility
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
