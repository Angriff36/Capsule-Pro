"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "../actions";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientType, setClientType] = useState<"company" | "individual">(
    "individual"
  );
  const [formData, setFormData] = useState({
    company_name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    countryCode: "",
    notes: "",
    tags: "",
    source: "",
    defaultPaymentTerms: "30",
    taxId: "",
    taxExempt: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: company name for company type, or first/last for individual
    if (clientType === "company" && !formData.company_name.trim()) {
      toast.error("Company name is required for company clients");
      return;
    }
    if (
      clientType === "individual" &&
      !formData.first_name.trim() &&
      !formData.last_name.trim()
    ) {
      toast.error("First name or last name is required");
      return;
    }

    setLoading(true);
    try {
      const client = await createClient({
        clientType,
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
        notes: formData.notes || undefined,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        source: formData.source || undefined,
        defaultPaymentTerms: formData.defaultPaymentTerms
          ? Number.parseInt(formData.defaultPaymentTerms, 10)
          : undefined,
        taxId: formData.taxId || undefined,
        taxExempt: formData.taxExempt || undefined,
      });

      toast.success("Client created successfully");
      router.push(`/crm/clients/${client.id}`);
    } catch (error) {
      toast.error("Failed to create client", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href="/crm/clients">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Client</h1>
          <p className="text-muted-foreground">Add a new client to your CRM.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
            <CardDescription>
              Enter the information for this client.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Type */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientType">Client Type</Label>
                <Select
                  onValueChange={(value: "company" | "individual") =>
                    setClientType(value)
                  }
                  value={clientType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  placeholder="e.g., Referral, Website"
                  value={formData.source}
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                {clientType === "company" ? "Company Info" : "Personal Info"}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {clientType === "company" && (
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          company_name: e.target.value,
                        })
                      }
                      placeholder="e.g., Acme Corp"
                      required={clientType === "company"}
                      value={formData.company_name}
                    />
                  </div>
                )}

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

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid gap-4 md:grid-cols-3">
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

                <div className="space-y-2">
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
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressLine1: e.target.value,
                      })
                    }
                    placeholder="Street address"
                    value={formData.addressLine1}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        addressLine2: e.target.value,
                      })
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
                    value={formData.city}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stateProvince">State/Province</Label>
                  <Input
                    id="stateProvince"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stateProvince: e.target.value,
                      })
                    }
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
                    value={formData.postalCode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="countryCode">Country Code</Label>
                  <Input
                    id="countryCode"
                    maxLength={2}
                    onChange={(e) =>
                      setFormData({ ...formData, countryCode: e.target.value })
                    }
                    placeholder="e.g., US"
                    value={formData.countryCode}
                  />
                </div>
              </div>
            </div>

            {/* Financial */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Financial Details</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="defaultPaymentTerms">
                    Default Payment Terms (days)
                  </Label>
                  <Input
                    id="defaultPaymentTerms"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultPaymentTerms: e.target.value,
                      })
                    }
                    placeholder="30"
                    type="number"
                    value={formData.defaultPaymentTerms}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    onChange={(e) =>
                      setFormData({ ...formData, taxId: e.target.value })
                    }
                    placeholder="XX-XXXXXXX"
                    value={formData.taxId}
                  />
                </div>

                <div className="flex items-end gap-2 pb-1">
                  <input
                    checked={formData.taxExempt}
                    className="h-4 w-4 rounded border-gray-300"
                    id="taxExempt"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        taxExempt: e.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  <Label htmlFor="taxExempt">Tax Exempt</Label>
                </div>
              </div>
            </div>

            {/* Notes & Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    placeholder="e.g., VIP, Corporate (comma-separated)"
                    value={formData.tags}
                  />
                </div>

                <div className="space-y-2">
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
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button asChild type="button" variant="outline">
                <Link href="/crm/clients">Cancel</Link>
              </Button>
              <Button disabled={loading} type="submit">
                {loading && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Client
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
