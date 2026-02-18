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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  ArrowLeftIcon,
  Building2Icon,
  CalendarIcon,
  Loader2Icon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { deleteVenue, getVenueById, getVenueEvents, type VenueType } from "../actions";

const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  banquet_hall: "Banquet Hall",
  outdoor: "Outdoor",
  restaurant: "Restaurant",
  hotel: "Hotel",
  private_home: "Private Home",
  corporate: "Corporate",
  other: "Other",
};

export default function VenuePage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.id as string;

  const [venue, setVenue] = useState<Awaited<ReturnType<typeof getVenueById>> | null>(null);
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getVenueEvents>>>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadVenue = async () => {
      try {
        const venueData = await getVenueById(venueId);
        setVenue(venueData);

        const eventsData = await getVenueEvents(venueId);
        setEvents(eventsData);
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this venue? This action cannot be undone.")) {
      return;
    }

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

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm/venues">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Venue Not Found</h1>
          </div>
        </div>
      </div>
    );
  }

  const address = [
    venue.addressLine1,
    venue.addressLine2,
    venue.city,
    venue.stateProvince,
    venue.postalCode,
    venue.countryCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/crm/venues">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{venue.name}</h1>
              <Badge variant={venue.isActive ? "default" : "secondary"}>
                {venue.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {VENUE_TYPE_LABELS[venue.venueType as VenueType] || venue.venueType}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/crm/venues/${venueId}/edit`}>
              <PencilIcon className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Location & Capacity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5" />
              Location & Capacity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {address && (
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{address}</p>
              </div>
            )}
            {venue.capacity !== null && venue.capacity > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="font-medium">{venue.capacity} guests</p>
              </div>
            )}
            {venue.tags.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {venue.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {venue.contactName && (
              <div>
                <p className="text-sm text-muted-foreground">Contact Name</p>
                <p className="font-medium">{venue.contactName}</p>
              </div>
            )}
            {venue.contactPhone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{venue.contactPhone}</p>
              </div>
            )}
            {venue.contactEmail && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{venue.contactEmail}</p>
              </div>
            )}
            {!venue.contactName && !venue.contactPhone && !venue.contactEmail && (
              <p className="text-muted-foreground">No contact information available</p>
            )}
          </CardContent>
        </Card>

        {/* Access Notes */}
        {(venue.accessNotes || venue.cateringNotes) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {venue.accessNotes && (
                <div>
                  <p className="text-sm text-muted-foreground">Access Notes</p>
                  <p className="whitespace-pre-wrap">{venue.accessNotes}</p>
                </div>
              )}
              {venue.cateringNotes && (
                <div>
                  <p className="text-sm text-muted-foreground">Catering Notes</p>
                  <p className="whitespace-pre-wrap">{venue.cateringNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Event History */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Event History
            </CardTitle>
            <CardDescription>Events held at this venue</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Guests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id} className="cursor-pointer" onClick={() => router.push(`/events/${event.id}`)}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{new Date(event.eventDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{event.status}</Badge>
                      </TableCell>
                      <TableCell>{event.guestCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No events have been held at this venue yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
