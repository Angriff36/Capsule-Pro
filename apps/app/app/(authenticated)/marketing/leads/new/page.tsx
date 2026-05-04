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
import { createLead } from "../actions";

const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Event",
  "Outreach",
  "Social Media",
  "Partner",
  "Cold Call",
  "Other",
];

const EVENT_TYPES = [
  "Wedding",
  "Corporate",
  "Social",
  "Catering",
  "Conference",
  "Private Party",
  "Other",
];

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contactName: "",
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    source: "",
    eventType: "",
    eventDate: "",
    estimatedGuests: "",
    estimatedValue: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contactName.trim()) {
      toast.error("Contact name is required");
      return;
    }

    setLoading(true);
    try {
      const lead = await createLead({
        contactName: formData.contactName,
        companyName: formData.companyName || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        source: formData.source || undefined,
        eventType: formData.eventType || undefined,
        eventDate: formData.eventDate || undefined,
        estimatedGuests: formData.estimatedGuests
          ? Number.parseInt(formData.estimatedGuests, 10)
          : undefined,
        estimatedValue: formData.estimatedValue
          ? Number.parseFloat(formData.estimatedValue)
          : undefined,
        notes: formData.notes || undefined,
      });

      toast.success("Lead created successfully");
      router.push("/marketing/leads/" + lead.id);
    } catch (error) {
      toast.error("Failed to create lead", {
        description:
          error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href="/marketing/leads">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Lead</h1>
          <p className="text-muted-foreground">
            Add a new lead to your pipeline.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
            <CardDescription>
              Enter the information for this lead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactName: e.target.value,
                      })
                    }
                    placeholder="e.g., John Doe"
                    required
                    value={formData.contactName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyName: e.target.value,
                      })
                    }
                    placeholder="e.g., Acme Corp"
                    value={formData.companyName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactEmail: e.target.value,
                      })
                    }
                    placeholder="john@example.com"
                    type="email"
                    value={formData.contactEmail}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone</Label>
                  <Input
                    id="contactPhone"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactPhone: e.target.value,
                      })
                    }
                    placeholder="(555) 123-4567"
                    type="tel"
                    value={formData.contactPhone}
                  />
                </div>
              </div>
            </div>

            {/* Lead Source -- Event */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Lead Source</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select
                    onValueChange={(value) =>
                      setFormData({ ...formData, source: value })
                    }
                    value={formData.source}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select
                    onValueChange={(value) =>
                      setFormData({ ...formData, eventType: value })
                    }
                    value={formData.eventType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventDate">Event Date</Label>
                  <Input
                    id="eventDate"
                    onChange={(e) =>
                      setFormData({ ...formData, eventDate: e.target.value })
                    }
                    type="date"
                    value={formData.eventDate}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedGuests">Estimated Guests</Label>
                  <Input
                    id="estimatedGuests"
                    min={0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedGuests: e.target.value,
                      })
                    }
                    placeholder="e.g., 100"
                    type="number"
                    value={formData.estimatedGuests}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                  <Input
                    id="estimatedValue"
                    min={0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedValue: e.target.value,
                      })
                    }
                    placeholder="e.g., 5000"
                    step="0.01"
                    type="number"
                    value={formData.estimatedValue}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes about this lead..."
                  rows={3}
                  value={formData.notes}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button asChild type="button" variant="outline">
                <Link href="/marketing/leads">Cancel</Link>
              </Button>
              <Button disabled={loading} type="submit">
                {loading && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
