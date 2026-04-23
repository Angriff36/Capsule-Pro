"use client";

import { apiFetch } from "@/app/lib/api";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  ArrowLeft,
  Building2,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Save,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate } from "../../components/po-shared";
import {
  formatPaymentTerms,
  PAYMENT_TERMS_OPTIONS,
  RATING_CATEGORIES,
  RatingStars,
  type Vendor,
  VendorAddress,
  type VendorContact,
  type VendorRating,
} from "../../components/vendor-shared";

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params?.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [ratings, setRatings] = useState<VendorRating[]>([]);
  const [catalogItemCount, setCatalogItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit form
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

  // Contact dialog
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactRole: "",
    isPrimary: false,
    notes: "",
  });

  // Rating dialog
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingForm, setRatingForm] = useState({
    category: "overall",
    rating: 5,
    comment: "",
  });

  useEffect(() => {
    if (vendorId) loadVendor();
  }, [vendorId]);

  const loadVendor = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/procurement/vendors/${vendorId}`);
      const data = await res.json();
      if (data.success) {
        const v = data.data.vendor as Vendor;
        setVendor(v);
        setContacts(data.data.contacts || []);
        setRatings(data.data.ratings || []);
        setCatalogItemCount(data.data.catalogItemCount || 0);
        setForm({
          name: v.name || "",
          contactPerson: v.contact_person || "",
          email: v.email || "",
          phone: v.phone || "",
          paymentTerms: v.payment_terms || "NET_30",
          addressLine1: v.address_line1 || "",
          addressLine2: v.address_line2 || "",
          city: v.city || "",
          state: v.state || "",
          postalCode: v.postal_code || "",
          country: v.country || "US",
          taxId: v.tax_id || "",
          website: v.website || "",
          notes: v.notes || "",
        });
      } else {
        router.push("/procurement/vendors");
      }
    } catch (error) {
      console.error("Failed to load vendor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/procurement/vendors/commands/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, ...form }),
      });
      const data = await res.json();
      if (data.success) {
        setEditing(false);
        loadVendor();
      } else {
        alert(data.error || "Failed to update vendor");
      }
    } catch (error) {
      console.error("Failed to update vendor:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddContact = async () => {
    if (!contactForm.contactName.trim()) return;
    try {
      const res = await apiFetch("/api/procurement/vendors/commands/add-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, ...contactForm }),
      });
      const data = await res.json();
      if (data.success) {
        setContactDialogOpen(false);
        setContactForm({
          contactName: "",
          contactEmail: "",
          contactPhone: "",
          contactRole: "",
          isPrimary: false,
          notes: "",
        });
        loadVendor();
      }
    } catch (error) {
      console.error("Failed to add contact:", error);
    }
  };

  const handleRate = async () => {
    try {
      const res = await apiFetch("/api/procurement/vendors/commands/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, ...ratingForm }),
      });
      const data = await res.json();
      if (data.success) {
        setRatingDialogOpen(false);
        setRatingForm({ category: "overall", rating: 5, comment: "" });
        loadVendor();
      }
    } catch (error) {
      console.error("Failed to add rating:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/procurement/vendors">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {vendor.name}
              </h1>
              <Badge variant="secondary">{vendor.supplier_number}</Badge>
            </div>
            <p className="text-muted-foreground flex items-center gap-4">
              <RatingStars rating={vendor.performance_rating} size="md" />
              <span>{formatPaymentTerms(vendor.payment_terms)}</span>
              <span>{catalogItemCount} catalog items</span>
              {vendor.tax_id && <span>Tax: {vendor.tax_id}</span>}
            </p>
          </div>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setEditing(false);
                loadVendor();
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)} variant="outline">
            Edit Vendor
          </Button>
        )}
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="ratings">Ratings ({ratings.length})</TabsTrigger>
          <TabsTrigger value="catalog">
            Catalog ({catalogItemCount})
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <div className="grid gap-6 md:grid-cols-2">
            {editing ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Vendor Name *</Label>
                      <Input
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        value={form.name}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tax ID / EIN</Label>
                        <Input
                          onChange={(e) =>
                            setForm({ ...form, taxId: e.target.value })
                          }
                          value={form.taxId}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Terms</Label>
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
                            {PAYMENT_TERMS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Primary Contact</Label>
                        <Input
                          onChange={(e) =>
                            setForm({ ...form, contactPerson: e.target.value })
                          }
                          value={form.contactPerson}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                          value={form.email}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                          value={form.phone}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input
                          onChange={(e) =>
                            setForm({ ...form, website: e.target.value })
                          }
                          value={form.website}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        onChange={(e) =>
                          setForm({ ...form, notes: e.target.value })
                        }
                        rows={3}
                        value={form.notes}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Address</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Street Address</Label>
                      <Input
                        onChange={(e) =>
                          setForm({ ...form, addressLine1: e.target.value })
                        }
                        value={form.addressLine1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address Line 2</Label>
                      <Input
                        onChange={(e) =>
                          setForm({ ...form, addressLine2: e.target.value })
                        }
                        value={form.addressLine2}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          onChange={(e) =>
                            setForm({ ...form, city: e.target.value })
                          }
                          value={form.city}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input
                          onChange={(e) =>
                            setForm({ ...form, state: e.target.value })
                          }
                          value={form.state}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ZIP</Label>
                        <Input
                          onChange={(e) =>
                            setForm({ ...form, postalCode: e.target.value })
                          }
                          value={form.postalCode}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{vendor.name}</span>
                    </div>
                    {vendor.tax_id && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Tax ID: </span>
                        <span>{vendor.tax_id}</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Payment Terms:{" "}
                      </span>
                      <span>{formatPaymentTerms(vendor.payment_terms)}</span>
                    </div>
                    {vendor.contact_person && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Primary Contact:{" "}
                        </span>
                        <span>{vendor.contact_person}</span>
                      </div>
                    )}
                    {vendor.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{vendor.email}</span>
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                    {vendor.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a
                          className="text-blue-600 hover:underline"
                          href={
                            vendor.website.startsWith("http")
                              ? vendor.website
                              : `https://${vendor.website}`
                          }
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {vendor.website}
                        </a>
                      </div>
                    )}
                    {vendor.tags && vendor.tags.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex gap-1 flex-wrap">
                          {vendor.tags.map((tag) => (
                            <Badge
                              className="text-xs"
                              key={tag}
                              variant="secondary"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {vendor.notes && (
                      <div className="text-sm mt-2 pt-2 border-t">
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{vendor.notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <VendorAddress vendor={vendor} />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <div className="flex justify-end mb-4">
            <Dialog
              onOpenChange={setContactDialogOpen}
              open={contactDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Contact Name *</Label>
                    <Input
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          contactName: e.target.value,
                        })
                      }
                      placeholder="Jane Smith"
                      value={contactForm.contactName}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            contactEmail: e.target.value,
                          })
                        }
                        type="email"
                        value={contactForm.contactEmail}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            contactPhone: e.target.value,
                          })
                        }
                        value={contactForm.contactPhone}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            contactRole: e.target.value,
                          })
                        }
                        placeholder="Sales Manager"
                        value={contactForm.contactRole}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Contact</Label>
                      <Select
                        onValueChange={(v) =>
                          setContactForm({
                            ...contactForm,
                            isPrimary: v === "yes",
                          })
                        }
                        value={contactForm.isPrimary ? "yes" : "no"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          notes: e.target.value,
                        })
                      }
                      rows={2}
                      value={contactForm.notes}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={() => setContactDialogOpen(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={!contactForm.contactName.trim()}
                      onClick={handleAddContact}
                    >
                      Add Contact
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {contacts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No contacts yet. Add a contact for this vendor.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {contacts.map((contact) => (
                <Card key={contact.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {contact.contact_name}
                          </span>
                          {contact.is_primary && (
                            <Badge className="bg-blue-100 text-blue-700">
                              Primary
                            </Badge>
                          )}
                          {contact.contact_role && (
                            <span className="text-sm text-muted-foreground">
                              {contact.contact_role}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          {contact.contact_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.contact_email}
                            </span>
                          )}
                          {contact.contact_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.contact_phone}
                            </span>
                          )}
                        </div>
                        {contact.notes && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {contact.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Ratings Tab */}
        <TabsContent value="ratings">
          <div className="flex justify-end mb-4">
            <Dialog onOpenChange={setRatingDialogOpen} open={ratingDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Star className="h-4 w-4 mr-2" />
                  Add Rating
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rate Vendor</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      onValueChange={(v) =>
                        setRatingForm({ ...ratingForm, category: v })
                      }
                      value={ratingForm.category}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RATING_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Button
                          key={i}
                          onClick={() =>
                            setRatingForm({ ...ratingForm, rating: i })
                          }
                          size="icon"
                          type="button"
                          variant={
                            ratingForm.rating >= i ? "default" : "outline"
                          }
                        >
                          <Star
                            className={`h-4 w-4 ${ratingForm.rating >= i ? "fill-current" : ""}`}
                          />
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Comment</Label>
                    <Textarea
                      onChange={(e) =>
                        setRatingForm({
                          ...ratingForm,
                          comment: e.target.value,
                        })
                      }
                      placeholder="What went well or could be improved..."
                      rows={3}
                      value={ratingForm.comment}
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={() => setRatingDialogOpen(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleRate}>Submit Rating</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {ratings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No ratings yet. Rate this vendor's performance.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {ratings.map((rating) => (
                <Card key={rating.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{rating.category}</Badge>
                          <RatingStars rating={rating.rating} />
                        </div>
                        {rating.comment && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {rating.comment}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{rating.rated_by_name || "Anonymous"}</div>
                        <div>{formatDate(rating.created_at)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Catalog Tab */}
        <TabsContent value="catalog">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {catalogItemCount} catalog item
                {catalogItemCount !== 1 ? "s" : ""} linked to this vendor.
              </p>
              <p className="text-sm mt-1">
                Catalog management is available through the inventory module.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
