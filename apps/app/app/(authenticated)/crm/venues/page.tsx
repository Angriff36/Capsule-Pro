import { Badge } from "@repo/design-system/components/ui/badge";
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

const venues = [
  {
    name: "Harbor Loft",
    location: "Downtown Chicago",
    capacity: 220,
    status: "Available",
    events: 3,
    tags: ["Rooftop", "A/V ready"],
  },
  {
    name: "Millhouse Ballroom",
    location: "West Loop",
    capacity: 380,
    status: "Booked",
    events: 1,
    tags: ["Historic", "Catering approved"],
  },
  {
    name: "Granite Yard",
    location: "River North",
    capacity: 150,
    status: "Needs inspection",
    events: 0,
    tags: ["Outdoor", "Weather notice"],
  },
];

const upcomingEvents = [
  {
    name: "Acme Gala",
    venue: "Harbor Loft",
    date: "Jan 28",
    status: "Facilities prep",
  },
  {
    name: "Field Works Retreat",
    venue: "Millhouse Ballroom",
    date: "Feb 02",
    status: "Menu sign-off",
  },
  {
    name: "Helix Product Launch",
    venue: "Granite Yard",
    date: "Feb 09",
    status: "Needs permits",
  },
];

const statusVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Available: "default",
  Booked: "secondary",
  "Needs inspection": "outline",
};

const CrmVenuesPage = () => (
  <div className="space-y-8">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Venue Management</h1>
      <p className="text-muted-foreground">
        Surface venue readiness, capacity, and coordination notes for every
        site.
      </p>
    </div>

    <Separator />

    <section>
      <h2 className="text-sm font-medium text-muted-foreground">
        Venues Overview
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {venues.map((venue) => (
          <Card key={venue.name}>
            <CardHeader>
              <CardTitle>{venue.name}</CardTitle>
              <CardDescription>{venue.location}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="font-semibold">{venue.capacity} guests</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Upcoming events</p>
                <p className="font-semibold">{venue.events}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {venue.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
              <Badge variant={statusVariant[venue.status] ?? "outline"}>
                {venue.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    <section>
      <h2 className="text-sm font-medium text-muted-foreground">
        Upcoming Events by Venue
      </h2>
      <Card className="mt-4">
        <CardHeader>
          <CardDescription>
            Coordination status for each property.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingEvents.map((event) => (
                  <TableRow key={event.name}>
                    <TableCell>{event.name}</TableCell>
                    <TableCell>{event.venue}</TableCell>
                    <TableCell>{event.date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{event.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  </div>
);

export default CrmVenuesPage;
