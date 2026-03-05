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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  Building2,
  Calendar,
  DoorOpen,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface FacilitySpace {
  id: string;
  name: string;
  code?: string;
  type: string;
  capacity?: number;
  area?: number;
  floor?: string;
  section?: string;
  status: string;
  isBookable: boolean;
  requiresApproval: boolean;
  amenities: string[];
  minBookingHours: number;
  maxBookingHours: number;
  leadTimeHours: number;
  locationId: string;
  notes?: string;
}

interface FacilityBooking {
  id: string;
  spaceId: string;
  spaceName: string;
  bookedFor: string;
  bookedForName: string;
  title: string;
  description?: string;
  bookingType: string;
  status: string;
  startAt: Date;
  endAt: Date;
  expectedAttendees?: number;
  actualAttendees?: number;
}

const statusColors = {
  active: "bg-green-500 text-white",
  maintenance: "bg-yellow-500 text-black",
  inactive: "bg-gray-500 text-white",
};

const bookingStatusColors = {
  pending: "bg-yellow-500 text-black",
  confirmed: "bg-green-500 text-white",
  checked_in: "bg-blue-500 text-white",
  checked_out: "bg-purple-500 text-white",
  cancelled: "bg-red-500 text-white",
  completed: "bg-gray-500 text-white",
};

const spaceTypeLabels = {
  kitchen: "Kitchen",
  dining: "Dining",
  meeting: "Meeting Room",
  storage: "Storage",
  prep: "Prep Area",
  baking: "Baking",
  cooling: "Cooling/Storage",
  general: "General",
};

export function FacilitySpacesPageClient() {
  const [spaces, setSpaces] = useState<FacilitySpace[]>([]);
  const [bookings, setBookings] = useState<FacilityBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSpaces(), fetchBookings()]);
  }, []);

  async function fetchSpaces() {
    try {
      const res = await fetch("/api/facility/spaces/list");
      const data = await res.json();
      if (data.success) {
        setSpaces(data.spaces || []);
      }
    } catch (error) {
      console.error("Error fetching facility spaces:", error);
    }
  }

  async function fetchBookings() {
    try {
      const res = await fetch("/api/facility/bookings/list");
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching facility bookings:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString();
  }

  function getActiveBookingsCount(spaceId: string): number {
    return bookings.filter(
      (b) => b.spaceId === spaceId && b.status === "confirmed"
    ).length;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facility Spaces</h1>
          <p className="text-muted-foreground">
            Manage facility spaces, room bookings, and availability
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Space
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spaces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{spaces.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                spaces.filter((s) => s.status === "active" && s.isBookable)
                  .length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {spaces.filter((s) => s.status === "maintenance").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                bookings.filter(
                  (b) => b.status === "confirmed" || b.status === "checked_in"
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs className="space-y-4" defaultValue="spaces">
        <TabsList>
          <TabsTrigger value="spaces">
            <Building2 className="mr-2 h-4 w-4" />
            Spaces
          </TabsTrigger>
          <TabsTrigger value="bookings">
            <Calendar className="mr-2 h-4 w-4" />
            Bookings
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="spaces">
          <Card>
            <CardHeader>
              <CardTitle>Facility Spaces</CardTitle>
              <CardDescription>
                Manage spaces that can be booked for events, production, or
                storage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading spaces...
                </div>
              ) : spaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  No facility spaces found. Add your first space to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {spaces.map((space) => (
                    <Card
                      className="hover:shadow-md transition-shadow"
                      key={space.id}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">
                                {space.name}
                              </CardTitle>
                              {space.code && (
                                <Badge variant="outline">{space.code}</Badge>
                              )}
                            </div>
                            <CardDescription className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {spaceTypeLabels[
                                space.type as keyof typeof spaceTypeLabels
                              ] || space.type}
                            </CardDescription>
                          </div>
                          <Badge
                            className={
                              statusColors[
                                space.status as keyof typeof statusColors
                              ]
                            }
                          >
                            {space.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-4 text-sm">
                          {space.capacity && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{space.capacity} people</span>
                            </div>
                          )}
                          {space.area && (
                            <div className="flex items-center gap-1">
                              <DoorOpen className="h-4 w-4 text-muted-foreground" />
                              <span>{space.area} sq ft</span>
                            </div>
                          )}
                        </div>
                        {space.floor && (
                          <div className="text-sm text-muted-foreground">
                            Floor: {space.floor}
                            {space.section && ` · Section: ${space.section}`}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {space.isBookable && (
                            <Badge className="text-xs" variant="secondary">
                              Bookable
                            </Badge>
                          )}
                          {space.requiresApproval && (
                            <Badge className="text-xs" variant="outline">
                              Approval Required
                            </Badge>
                          )}
                          {getActiveBookingsCount(space.id) > 0 && (
                            <Badge
                              className="text-xs bg-blue-500"
                              variant="default"
                            >
                              {getActiveBookingsCount(space.id)} booking(s)
                            </Badge>
                          )}
                        </div>
                        {space.amenities && space.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {space.amenities.slice(0, 4).map((amenity) => (
                              <Badge
                                className="text-xs"
                                key={amenity}
                                variant="outline"
                              >
                                {amenity}
                              </Badge>
                            ))}
                            {space.amenities.length > 4 && (
                              <Badge className="text-xs" variant="outline">
                                +{space.amenities.length - 4} more
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="pt-2 border-t">
                          <div className="flex gap-2">
                            <Button
                              className="flex-1"
                              size="sm"
                              variant="outline"
                            >
                              Book
                            </Button>
                            <Button size="sm" variant="ghost">
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4" value="bookings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Facility Bookings</CardTitle>
                  <CardDescription>
                    View and manage space reservations
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Booking
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading bookings...
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  No bookings found. Create your first booking.
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      key={booking.id}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{booking.title}</h3>
                          <Badge
                            className={
                              bookingStatusColors[
                                booking.status as keyof typeof bookingStatusColors
                              ]
                            }
                          >
                            {booking.status.replace(/_/g, " ")}
                          </Badge>
                          <Badge variant="outline">{booking.bookingType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Space: {booking.spaceName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Booked by: {booking.bookedForName}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span>Start: {formatDateTime(booking.startAt)}</span>
                          <span>End: {formatDateTime(booking.endAt)}</span>
                        </div>
                        {booking.expectedAttendees && (
                          <div className="text-sm text-muted-foreground">
                            Expected attendees: {booking.expectedAttendees}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {booking.status === "pending" && (
                          <Button size="sm" variant="outline">
                            Approve
                          </Button>
                        )}
                        {booking.status === "confirmed" && (
                          <Button size="sm" variant="outline">
                            Check In
                          </Button>
                        )}
                        {booking.status === "checked_in" && (
                          <Button size="sm" variant="outline">
                            Check Out
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
