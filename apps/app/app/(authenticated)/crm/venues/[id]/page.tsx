"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  ArrowLeftIcon,
  BuildingIcon,
  CalendarIcon,
  EditIcon,
  FileTextIcon,
  FrameIcon,
  InfoIcon,
  Loader2Icon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteVenue, getVenueById } from "../../actions";

interface UpcomingEvent {
  id: string;
  title: string;
  eventDate: Date;
  guestCount: number;
  status: string;
}

interface VenueDetails {
  id: string;
  name: string;
  venueType: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  capacity: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  accessNotes: string | null;
  cateringNotes: string | null;
  layoutImageUrl: string | null;
  isActive: boolean;
  tags: string[];
  eventCount: number;
  upcomingEvents: UpcomingEvent[];
}

const VENUE_TYPE_LABELS: Record<string, string> = {
  banquet_hall: "Banquet Hall",
  outdoor: "Outdoor",
  restaurant: "Restaurant",
  hotel: "Hotel",
  private_home: "Private Home",
  corporate: "Corporate",
  other: "Other",
};

export default function VenueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const venueId = params.id as string;

  const [venue, setVenue] = useState<VenueDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        const data = await getVenueById(venueId);
        setVenue(data as VenueDetails);
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

  const handleDelete = async () => {
    if (!venue) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${venue.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteVenue(venueId);
      toast.success("Venue deleted successfully");
      router.push("/crm/venues");
    } catch (error) {
      toast.error("Failed to delete venue", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getVenueTypeLabel = (venueType: string | null) => {
    if (!venueType) return "—";
    return VENUE_TYPE_LABELS[venueType] || venueType;
  };

  const getFullAddress = () => {
    if (!venue) return "";
    const parts: string[] = [];
    if (venue.addressLine1) parts.push(venue.addressLine1);
    if (venue.addressLine2) parts.push(venue.addressLine2);
    if (venue.city) parts.push(venue.city);
    if (venue.stateProvince) parts.push(venue.stateProvince);
    if (venue.postalCode) parts.push(venue.postalCode);
    if (venue.countryCode) parts.push(venue.countryCode);
    return parts.join(", ") || "No address provided";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <BuildingIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Venue not found</h3>
        <Button onClick={() => router.push("/crm/venues")} variant="outline">
          Back to Venues
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.push("/crm/venues")}
            size="icon"
            variant="ghost"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {venue.name}
              </h1>
              {venue.isActive ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {getVenueTypeLabel(venue.venueType)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push(`/crm/venues/${venueId}/edit`)}
            variant="outline"
          >
            <EditIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            disabled={deleting}
            onClick={handleDelete}
            variant="destructive"
          >
            {deleting ? (
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TrashIcon className="h-4 w-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* Tags */}
      {venue.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {venue.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 md:col-span-2">
          {/* Location & Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5" />
                Location & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Address
                </div>
                <div>{getFullAddress()}</div>
              </div>
              {venue.capacity && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Capacity
                  </div>
                  <div className="flex items-center gap-1">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    {venue.capacity.toLocaleString()} guests
                  </div>
                </div>
              )}
              <Separator />
              {(venue.contactName ||
                venue.contactPhone ||
                venue.contactEmail) && (
                <>
                  {venue.contactName && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Contact Name
                      </div>
                      <div>{venue.contactName}</div>
                    </div>
                  )}
                  {venue.contactPhone && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Contact Phone
                      </div>
                      <div className="flex items-center gap-1">
                        <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                        {venue.contactPhone}
                      </div>
                    </div>
                  )}
                  {venue.contactEmail && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Contact Email
                      </div>
                      <div className="flex items-center gap-1">
                        <MailIcon className="h-4 w-4 text-muted-foreground" />
                        {venue.contactEmail}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Venue Notes */}
          {(venue.accessNotes || venue.cateringNotes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileTextIcon className="h-5 w-5" />
                  Venue Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {venue.accessNotes && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Access & Setup Notes
                    </div>
                    <div className="text-sm">{venue.accessNotes}</div>
                  </div>
                )}
                {venue.cateringNotes && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Catering Notes
                    </div>
                    <div className="text-sm">{venue.cateringNotes}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Upcoming Events
                </div>
                <Badge variant="secondary">{venue.eventCount} total</Badge>
              </CardTitle>
              <CardDescription>
                {venue.upcomingEvents.length === 0
                  ? "No upcoming events at this venue."
                  : `Next ${venue.upcomingEvents.length} event${venue.upcomingEvents.length > 1 ? "s" : ""}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {venue.upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming events scheduled at this venue.
                </div>
              ) : (
                <div className="space-y-3">
                  {venue.upcomingEvents.map((event) => (
                    <div
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      key={event.id}
                      onClick={() => router.push(`/events/${event.id}`)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.eventDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          {event.guestCount} guests
                        </div>
                        <Badge>{event.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Venue Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold">{venue.eventCount}</div>
                <div className="text-sm text-muted-foreground">
                  Total Events
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          {(venue.layoutImageUrl ||
            venue.equipmentList ||
            venue.preferredVendors) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <InfoIcon className="h-4 w-4" />
                  Additional Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {venue.layoutImageUrl && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Floor Plan
                    </div>
                    <Button
                      className="w-full mt-1"
                      onClick={() =>
                        window.open(venue.layoutImageUrl, "_blank")
                      }
                      size="sm"
                      variant="outline"
                    >
                      <FrameIcon className="h-4 w-4 mr-2" />
                      View Layout
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
