"use client";

import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { getAvailableTags } from "../actions";
import { TagInput } from "../components/tag-input";

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalCountryCode(value: string): string | undefined {
  const trimmed = value.trim().toUpperCase();
  return trimmed.length === 2 ? trimmed : undefined;
}

function buildClientCreatePayload(
  clientId: string,
  clientType: "company" | "individual",
  formData: {
    company_name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    website: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    countryCode: string;
    notes: string;
    tags: string[];
    source: string;
    defaultPaymentTerms: string;
    taxId: string;
    taxExempt: boolean;
  }
): Record<string, unknown> {
  const str = (value: string) => optionalString(value) ?? "";

  return {
    id: clientId,
    clientType,
    companyName: str(formData.company_name),
    firstName: str(formData.first_name),
    lastName: str(formData.last_name),
    email: str(formData.email),
    phone: str(formData.phone),
    website: str(formData.website),
    addressLine1: str(formData.addressLine1),
    addressLine2: str(formData.addressLine2),
    city: str(formData.city),
    stateProvince: str(formData.stateProvince),
    postalCode: str(formData.postalCode),
    countryCode: optionalCountryCode(formData.countryCode) ?? "",
    defaultPaymentTerms: formData.defaultPaymentTerms
      ? Number.parseInt(formData.defaultPaymentTerms, 10)
      : 30,
    taxExempt: formData.taxExempt,
    taxId: str(formData.taxId),
    notes: str(formData.notes),
    tags:
      formData.tags.length > 0 ? JSON.stringify(formData.tags) : "",
    source: str(formData.source),
    assignedTo: "",
  };
}

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientType, setClientType] = useState<"company" | "individual">(
    "individual"
  );
  const [availableTags, setAvailableTags] = useState<string[]>([]);
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
    tags: [] as string[],
    source: "",
    defaultPaymentTerms: "30",
    taxId: "",
    taxExempt: false,
  });

  useEffect(() => {
    getAvailableTags().then((tags) =>
      setAvailableTags(tags.map((t) => t.tag))
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate: company name for company type, or first/last for individual
    if (clientType === "company" && !formData.company_name.trim()) {
      toast.error("Company name is required for company clients");
      return;
    }
    if (
      clientType === "individual" &&
      !formData.first_name.trim()
    ) {
      toast.error("First name is required for individual clients");
      return;
    }

    setLoading(true);
    try {
      const clientId = crypto.randomUUID();
      const res = await apiFetch("/api/manifest/Client/commands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildClientCreatePayload(clientId, clientType, formData)
        ),
      });

      const body = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        result?: { id?: string; instanceId?: string } | number | string;
      };

      if (!res.ok || body.success === false) {
        throw new Error(body.message ?? body.error ?? "Create failed");
      }

      const resultPayload = body.result;
      const createdId =
        typeof resultPayload === "object" &&
        resultPayload !== null &&
        "id" in resultPayload &&
        typeof resultPayload.id === "string"
          ? resultPayload.id
          : typeof resultPayload === "object" &&
              resultPayload !== null &&
              "instanceId" in resultPayload &&
              typeof resultPayload.instanceId === "string"
            ? resultPayload.instanceId
            : clientId;

      toast.success("Client created successfully");
      router.push(`/crm/clients/${createdId}`);
    } catch (error) {
      toast.error("Failed to create client", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel tone="dark">CRM</MonoLabel>
          <DisplayHeading size="md">New Client</DisplayHeading>
          <CommandBandLede>Add a new client to your CRM.</CommandBandLede>
        </CommandBandHeader>
        <CommandBandActions>
          <Button asChild variant="on-dark" size="icon">
            <Link href="/crm/clients">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
        </CommandBandActions>
      </CommandBand>

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
                  <Label htmlFor="first_name">
                    First Name{clientType === "individual" ? " *" : ""}
                  </Label>
                  <Input
                    id="first_name"
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    placeholder="John"
                    required={clientType === "individual"}
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
                      setFormData({
                        ...formData,
                        countryCode: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="US"
                    value={formData.countryCode}
                  />
                  <p className="text-muted-foreground text-xs">
                    ISO 3166-1 alpha-2 only (2 letters). Leave blank if unknown.
                  </p>
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
                  <Label>Tags</Label>
                  <TagInput
                    onChange={(tags) =>
                      setFormData({ ...formData, tags })
                    }
                    placeholder="Add a tag…"
                    suggestions={availableTags}
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
    </PageCanvas>
  );
}
