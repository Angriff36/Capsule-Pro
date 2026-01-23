"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
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
  ArrowLeftIcon,
  BuildingIcon,
  CheckIcon,
  Loader2Icon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getVenueById, updateVenue } from "../../actions";

const VENUE_TYPES = [
  { value: "banquet_hall", label: "Banquet Hall" },
  { value: "outdoor", label: "Outdoor" },
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "private_home", label: "Private Home" },
  { value: "corporate", label: "Corporate" },
  { value: "other", label: "Other" },
] as const;

type VenueType = (typeof VENUE_TYPES)[number]["value"];

export default function EditVenuePage() {
  const router = useRouter();
  const params = useParams();
  const venueId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    venueType: "" as VenueType | "",
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
    isActive: true,
    tags: "",
  });

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const venue = await getVenueById(venueId);
        setFormData({
          name: venue.name || "",
          venueType: venue.venueType || "",
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
          isActive: venue.isActive ?? true,
          tags: (venue.tags || []).join(", "),
        });
      } catch (error) {
        toast.error("Failed to load venue", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        router.push("/crm/venues");
      } finally {
        setLoading(false);
      }
    };

    fetchVenue();
  }, [venueId, router]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Venue name is required");
      return;
    }

    setSaving(true);
    try {
      const venue = await updateVenue(venueId, {
        name: formData.name,
        venueType: formData.venueType as VenueType | undefined,
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
        isActive: formData.isActive,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
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
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => router.push(`/crm/venues/${venueId}`)}
          size="icon"
          variant="ghost"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Venue</h1>
          <p className="text-muted-foreground">Update venue information.</p>
        </div>
      </div>

      {/* Form */}
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingIcon className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Enter the basic details about this venue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Venue Name *</Label>
              <Input
                id="name"
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Grand Ballroom at City Hotel"
                required
                value={formData.name}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="venueType">Venue Type</Label>
              <Select
                onValueChange={(value) => handleChange("venueType", value)}
                value={formData.venueType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select venue type" />
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

            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                min={1}
                onChange={(e) => handleChange("capacity", e.target.value)}
                placeholder="Maximum number of guests"
                type="number"
                value={formData.capacity}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.isActive}
                id="isActive"
                onCheckedChange={(checked) => handleChange("isActive", checked)}
              />
              <Label className="cursor-pointer" htmlFor="isActive">
                Active venue
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>
              Enter the venue address information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                onChange={(e) => handleChange("addressLine1", e.target.value)}
                placeholder="Street address"
                value={formData.addressLine1}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                onChange={(e) => handleChange("addressLine2", e.target.value)}
                placeholder="Suite, unit, etc."
                value={formData.addressLine2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="City name"
                  value={formData.city}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stateProvince">State/Province</Label>
                <Input
                  id="stateProvince"
                  onChange={(e) =>
                    handleChange("stateProvince", e.target.value)
                  }
                  placeholder="State or province"
                  value={formData.stateProvince}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  placeholder="ZIP or postal code"
                  value={formData.postalCode}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="countryCode">Country Code</Label>
                <Input
                  id="countryCode"
                  maxLength={2}
                  onChange={(e) =>
                    handleChange("countryCode", e.target.value.toUpperCase())
                  }
                  placeholder="US"
                  value={formData.countryCode}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Enter the venue contact details (optional).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                onChange={(e) => handleChange("contactName", e.target.value)}
                placeholder="Venue manager or coordinator"
                value={formData.contactName}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                onChange={(e) => handleChange("contactPhone", e.target.value)}
                placeholder="Phone number"
                type="tel"
                value={formData.contactPhone}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                placeholder="Email address"
                type="email"
                value={formData.contactEmail}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Venue Notes</CardTitle>
            <CardDescription>
              Add any special notes about this venue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="accessNotes">Access & Setup Notes</Label>
              <Textarea
                id="accessNotes"
                onChange={(e) => handleChange("accessNotes", e.target.value)}
                placeholder="Loading dock info, parking, setup restrictions, etc."
                rows={3}
                value={formData.accessNotes}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cateringNotes">Catering Notes</Label>
              <Textarea
                id="cateringNotes"
                onChange={(e) => handleChange("cateringNotes", e.target.value)}
                placeholder="Kitchen facilities, prep areas, storage, etc."
                rows={3}
                value={formData.cateringNotes}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="layoutImageUrl">Floor Plan URL</Label>
              <Input
                id="layoutImageUrl"
                onChange={(e) => handleChange("layoutImageUrl", e.target.value)}
                placeholder="https://example.com/floor-plan.pdf"
                type="url"
                value={formData.layoutImageUrl}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                onChange={(e) => handleChange("tags", e.target.value)}
                placeholder="e.g., downtown, waterfront, rooftop (comma-separated)"
                value={formData.tags}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={() => router.push(`/crm/venues/${venueId}`)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={saving} type="submit">
            {saving ? (
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckIcon className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
