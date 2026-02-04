"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Building2Icon,
  CheckIcon,
  FileTextIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { updateClient } from "../../../actions";

interface ContactInfoTabProps {
  client: {
    id: string;
    clientType: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    stateProvince: string | null;
    postalCode: string | null;
    countryCode: string | null;
    defaultPaymentTerms: number | null;
    taxExempt: boolean;
    taxId: string | null;
    notes: string | null;
    tags: string[];
    source: string | null;
  };
  onEdit?: () => void;
}

export function ContactInfoTab({ client, onEdit }: ContactInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: client.company_name || "",
    first_name: client.first_name || "",
    last_name: client.last_name || "",
    email: client.email || "",
    phone: client.phone || "",
    website: client.website || "",
    addressLine1: client.addressLine1 || "",
    addressLine2: client.addressLine2 || "",
    city: client.city || "",
    stateProvince: client.stateProvince || "",
    postalCode: client.postalCode || "",
    countryCode: client.countryCode || "",
    taxId: client.taxId || "",
    notes: client.notes || "",
    tags: client.tags.join(", "),
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateClient(client.id, {
        company_name: formData.company_name || undefined,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        stateProvince: formData.stateProvince || undefined,
        postalCode: formData.postalCode || undefined,
        countryCode: formData.countryCode || undefined,
        taxId: formData.taxId || undefined,
        notes: formData.notes || undefined,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      });
      toast.success("Client updated successfully");
      setIsEditing(false);
      if (onEdit) {
        onEdit();
      }
    } catch (error) {
      toast.error("Failed to update client", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      company_name: client.company_name || "",
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      email: client.email || "",
      phone: client.phone || "",
      website: client.website || "",
      addressLine1: client.addressLine1 || "",
      addressLine2: client.addressLine2 || "",
      city: client.city || "",
      stateProvince: client.stateProvince || "",
      postalCode: client.postalCode || "",
      countryCode: client.countryCode || "",
      taxId: client.taxId || "",
      notes: client.notes || "",
      tags: client.tags.join(", "),
    });
    setIsEditing(false);
  };

  const getFullAddress = () => {
    const parts: string[] = [];
    if (client.addressLine1) {
      parts.push(client.addressLine1);
    }
    if (client.addressLine2) {
      parts.push(client.addressLine2);
    }
    if (client.city || client.stateProvince || client.postalCode) {
      const cityParts: string[] = [];
      if (client.city) {
        cityParts.push(client.city);
      }
      if (client.stateProvince) {
        cityParts.push(client.stateProvince);
      }
      if (client.postalCode) {
        cityParts.push(client.postalCode);
      }
      parts.push(cityParts.join(", "));
    }
    if (client.countryCode) {
      parts.push(client.countryCode);
    }
    return parts.join(", ") || "No address on file";
  };

  if (isEditing) {
    return (
      <div className="space-y-8">
        {/* Basic Info Section */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Basic Information
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  placeholder="Acme Catering Co."
                  value={formData.company_name}
                />
              </div>
              <div className="space-y-2" />
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  placeholder="John"
                  value={formData.first_name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  placeholder="Doe"
                  value={formData.last_name}
                />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Contact Details Section */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Contact Details
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john@example.com"
                  type="email"
                  value={formData.email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                  type="tel"
                  value={formData.phone}
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="https://example.com"
                type="url"
                value={formData.website}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Address Section */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Address
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine1: e.target.value })
                  }
                  placeholder="Street address"
                  value={formData.addressLine1}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine2: e.target.value })
                  }
                  placeholder="Apartment, suite, etc."
                  value={formData.addressLine2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="City"
                  value={formData.city}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stateProvince">State/Province</Label>
                <Input
                  id="stateProvince"
                  onChange={(e) =>
                    setFormData({ ...formData, stateProvince: e.target.value })
                  }
                  placeholder="State/Province"
                  value={formData.stateProvince}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                  placeholder="Postal Code"
                  value={formData.postalCode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="countryCode">Country Code</Label>
                <Input
                  id="countryCode"
                  onChange={(e) =>
                    setFormData({ ...formData, countryCode: e.target.value })
                  }
                  placeholder="Country Code"
                  value={formData.countryCode}
                />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Additional Info Section */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Additional Information
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input
                  id="taxId"
                  onChange={(e) =>
                    setFormData({ ...formData, taxId: e.target.value })
                  }
                  placeholder="12-3456789"
                  value={formData.taxId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="vip, repeat, corporate"
                  value={formData.tags}
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes about this client..."
                rows={3}
                value={formData.notes}
              />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-2">
          <Button disabled={isLoading} onClick={handleSave}>
            <CheckIcon className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button disabled={isLoading} onClick={handleCancel} variant="outline">
            <XIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Contact Information</h2>
        <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
          <PencilIcon className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name/Company */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {client.clientType === "company" ? (
                <Building2Icon className="h-4 w-4" />
              ) : (
                <UserIcon className="h-4 w-4" />
              )}
              {client.clientType === "company" ? "Company" : "Name"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.company_name && (
              <div className="font-semibold">{client.company_name}</div>
            )}
            {(client.first_name || client.last_name) && (
              <div className="font-semibold">
                {client.first_name} {client.last_name}
              </div>
            )}
            {!(
              client.company_name ||
              client.first_name ||
              client.last_name
            ) && <div className="text-muted-foreground">Not set</div>}
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.email && (
              <div className="flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                <a
                  className="text-sm hover:underline"
                  href={`mailto:${client.email}`}
                >
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                <a
                  className="text-sm hover:underline"
                  href={`tel:${client.phone}`}
                >
                  {client.phone}
                </a>
              </div>
            )}
            {client.website && (
              <div className="flex items-center gap-2">
                <GlobeIcon className="h-4 w-4 text-muted-foreground" />
                <a
                  className="text-sm hover:underline"
                  href={client.website}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {client.website}
                </a>
              </div>
            )}
            {!(client.email || client.phone || client.website) && (
              <div className="text-muted-foreground text-sm">
                No contact details
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPinIcon className="h-4 w-4" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-line text-sm">
              {getFullAddress()}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        {client.tags && client.tags.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {client.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {client.notes && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileTextIcon className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{client.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Tax Info */}
        {(client.taxExempt || client.taxId || client.defaultPaymentTerms) && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tax & Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-sm">
              {client.taxExempt && (
                <div>
                  <span className="text-muted-foreground">Tax Status: </span>
                  <Badge variant="secondary">Tax Exempt</Badge>
                </div>
              )}
              {client.taxId && (
                <div>
                  <span className="text-muted-foreground">Tax ID: </span>
                  {client.taxId}
                </div>
              )}
              {client.defaultPaymentTerms && (
                <div>
                  <span className="text-muted-foreground">Payment Terms: </span>
                  Net {client.defaultPaymentTerms} days
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
