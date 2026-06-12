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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Loader2,
  Package,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listVendors,
  vendorCreate,
  vendorRemove,
} from "@/app/lib/manifest-client.generated";
import {
  formatPaymentTerms,
  PAYMENT_TERMS_OPTIONS,
  RatingStars,
  type Vendor,
} from "../components/vendor-shared";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    paymentTerms: "NET_30",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    taxId: "",
    website: "",
    notes: "",
  });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const result = await listVendors();
      setVendors(result.data as unknown as Vendor[]);
    } catch (error) {
      console.error("Failed to load vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      return;
    }
    setSaving(true);
    try {
      await vendorCreate(form);
      setDialogOpen(false);
      setForm({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        paymentTerms: "NET_30",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "US",
        taxId: "",
        website: "",
        notes: "",
      });
      loadVendors();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create vendor"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(vendor);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      await vendorRemove({ id: deleteTarget.id });
      loadVendors();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete vendor"
      );
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery) {
      return vendors;
    }
    const q = searchQuery.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.contact_person?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.supplier_number.toLowerCase().includes(q)
    );
  }, [vendors, searchQuery]);

  const totalCatalogItems = vendors.reduce(
    (sum, v) => sum + v.catalog_item_count,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="font-semibold text-2xl tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            Manage suppliers and vendor relationships.
          </p>
        </div>
        <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Basic Info */}
              <div className="grid gap-2">
                <h3 className="font-semibold text-muted-foreground text-sm">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Vendor Name *</Label>
                    <Input
                      id="name"
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Acme Supplies Inc."
                      value={form.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / EIN</Label>
                    <Input
                      id="taxId"
                      onChange={(e) =>
                        setForm({ ...form, taxId: e.target.value })
                      }
                      placeholder="XX-XXXXXXX"
                      value={form.taxId}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Primary Contact</Label>
                    <Input
                      id="contactPerson"
                      onChange={(e) =>
                        setForm({ ...form, contactPerson: e.target.value })
                      }
                      placeholder="Jane Smith"
                      value={form.contactPerson}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Select
                      onValueChange={(v) =>
                        setForm({ ...form, paymentTerms: v })
                      }
                      value={form.paymentTerms}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="contact@acme.com"
                      type="email"
                      value={form.email}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="(555) 123-4567"
                      value={form.phone}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="grid gap-2">
                <h3 className="font-semibold text-muted-foreground text-sm">
                  Address
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Street Address</Label>
                  <Input
                    id="addressLine1"
                    onChange={(e) =>
                      setForm({ ...form, addressLine1: e.target.value })
                    }
                    placeholder="123 Main St"
                    value={form.addressLine1}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    onChange={(e) =>
                      setForm({ ...form, addressLine2: e.target.value })
                    }
                    placeholder="Suite 100"
                    value={form.addressLine2}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                      value={form.city}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      onChange={(e) =>
                        setForm({ ...form, state: e.target.value })
                      }
                      value={form.state}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">ZIP</Label>
                    <Input
                      id="postalCode"
                      onChange={(e) =>
                        setForm({ ...form, postalCode: e.target.value })
                      }
                      value={form.postalCode}
                    />
                  </div>
                </div>
              </div>

              {/* Website & Notes */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    onChange={(e) =>
                      setForm({ ...form, website: e.target.value })
                    }
                    placeholder="https://acme.com"
                    value={form.website}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Internal notes about this vendor..."
                    rows={3}
                    value={form.notes}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={() => setDialogOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button
                  disabled={!form.name.trim() || saving}
                  onClick={handleCreate}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Vendor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{vendors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Catalog Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{totalCatalogItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {vendors.length
                ? (
                    vendors.reduce(
                      (sum, v) => sum + (v.performance_rating || 0),
                      0
                    ) / vendors.filter((v) => v.performance_rating).length || 0
                  ).toFixed(1)
                : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Total Contacts
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {vendors.reduce((sum, v) => sum + v.contact_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, contact, email, or vendor #..."
          value={searchQuery}
        />
      </div>

      {/* Vendor List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>
              {vendors.length === 0
                ? "No vendors yet. Add your first vendor to get started."
                : "No vendors match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((vendor) => (
            <Card
              className="transition-shadow hover:border-primary/40"
              key={vendor.id}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Link
                        className="font-semibold hover:underline"
                        href={`/procurement/vendors/${vendor.id}`}
                      >
                        {vendor.name}
                      </Link>
                      <Badge className="text-xs" variant="secondary">
                        {vendor.supplier_number}
                      </Badge>
                      {vendor.tax_id && (
                        <Badge className="text-xs" variant="outline">
                          Tax: {vendor.tax_id}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                      {vendor.contact_person && (
                        <span>{vendor.contact_person}</span>
                      )}
                      {vendor.email && <span>{vendor.email}</span>}
                      {vendor.phone && <span>{vendor.phone}</span>}
                      <span>{formatPaymentTerms(vendor.payment_terms)}</span>
                      <RatingStars rating={vendor.performance_rating} />
                      {vendor.catalog_item_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {vendor.catalog_item_count} items
                        </span>
                      )}
                      {vendor.contact_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {vendor.contact_count} contacts
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/procurement/vendors/${vendor.id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                    <Button
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={(e) => handleDelete(vendor, e)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
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
            <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              Delete vendor &quot;{deleteTarget?.name}&quot;? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
