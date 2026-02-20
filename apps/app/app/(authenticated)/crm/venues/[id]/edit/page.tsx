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
import { ArrowLeftIcon, Loader2Icon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getVenueById, updateVenue, type VenueType } from "../../actions";

const VENUE_TYPES: { value: VenueType; label: string }[] = [
  { value: "banquet_hall", label: "Banquet Hall" },
  { value: "outdoor", label: "Outdoor" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "private_home", label: "Private Home" },
  { value: "corporate", label: "Corporate" },
  { value: "other", label: "Other" },
];

export default function EditVenuePage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    venueType: "other" as VenueType,
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    countryCode: "",
    capacity: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    accessNotes: "",
    cateringNotes: "",
    layoutImageUrl: "",
    tags: "",
    isActive: true,
  });

  useEffect(() => {
    const loadVenue = async () => {
      try {
        const venue = await getVenueById(venueId);
        setFormData({
          name: venue.name,
          venueType: venue.venueType as VenueType,
          addressLine1: venue.addressLine1 || "",
          addressLine2: venue.addressLine2 || "",
          city: venue.city || "",
          stateProvince: venue.stateProvince || "",
          postalCode: venue.postalCode || "",
          countryCode: venue.countryCode || "",
          capacity: venue.capacity?.toString() || "",
          contactName: venue.contactName || "",
          contactPhone: venue.contactPhone || "",
          contactEmail: venue.contactEmail || "",
          accessNotes: venue.accessNotes || "",
          cateringNotes: venue.cateringNotes || "",
          layoutImageUrl: venue.layoutImageUrl || "",
          tags: venue.tags.join(", "),
          isActive: venue.isActive,
        });
      } catch (error) {
        toast.error("Failed to load venue", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    };

    loadVenue();
  }, [venueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Venue name is required");
      return;
    }

    setSaving(true);
    try {
      await updateVenue(venueId, {
        name: formData.name,
        venueType: formData.venueType,
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        stateProvince: formData.stateProvince || undefined,
        postalCode: formData.postalCode || undefined,
        countryCode: formData.countryCode || undefined,
        capacity: formData.capacity
          ? Number.parseInt(formData.capacity, 10)
          : undefined,
        contactName: formData.contactName || undefined,
        contactPhone: formData.contactPhone || undefined,
        contactEmail: formData.contactEmail || undefined,
        accessNotes: formData.accessNotes || undefined,
        cateringNotes: formData.cateringNotes || undefined,
        layoutImageUrl: formData.layoutImageUrl || undefined,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        isActive: formData.isActive,
      });

      toast.success("Venue updated successfully");
      router.push(`/crm/venues/${venueId}`);
    } catch (error) {
      toast.error("Failed to update venue", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href={`/crm/venues/${venueId}`}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Venue</h1>
          <p className="text-muted-foreground">Update venue information.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Venue Details</CardTitle>
            <CardDescription>
              Update the information about this venue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Harbor Loft"
                  required
                  value={formData.name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venueType">Venue Type</Label>
                <Select
                  onValueChange={(value: VenueType) =>
                    setFormData({ ...formData, venueType: value })
                  }
                  value={formData.venueType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (guests)</Label>
                <Input
                  id="capacity"
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  placeholder="e.g., 200"
                  type="number"
                  value={formData.capacity}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, isActive: value === "true" })
                  }
                  value={formData.isActive ? "true" : "false"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="e.g., Rooftop, A/V ready (comma-separated)"
                  value={formData.tags}
                />
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
                      setFormData({ ...formData, addressLine1: e.target.value })
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

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    value={formData.contactName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone</Label>
                  <Input
                    id="contactPhone"
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    type="tel"
                    value={formData.contactPhone}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    type="email"
                    value={formData.contactEmail}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accessNotes">Access Notes</Label>
                  <Textarea
                    id="accessNotes"
                    onChange={(e) =>
                      setFormData({ ...formData, accessNotes: e.target.value })
                    }
                    placeholder="Loading dock info, parking instructions, etc."
                    rows={3}
                    value={formData.accessNotes}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cateringNotes">Catering Notes</Label>
                  <Textarea
                    id="cateringNotes"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cateringNotes: e.target.value,
                      })
                    }
                    placeholder="Kitchen access, equipment available, restrictions, etc."
                    rows={3}
                    value={formData.cateringNotes}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="layoutImageUrl">Floor Plan URL</Label>
                  <Input
                    id="layoutImageUrl"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        layoutImageUrl: e.target.value,
                      })
                    }
                    placeholder="https://..."
                    type="url"
                    value={formData.layoutImageUrl}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button asChild type="button" variant="outline">
                <Link href={`/crm/venues/${venueId}`}>Cancel</Link>
              </Button>
              <Button disabled={saving} type="submit">
                {saving && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                <SaveIcon className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
