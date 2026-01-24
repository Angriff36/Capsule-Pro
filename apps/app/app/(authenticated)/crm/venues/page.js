Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const table_1 = require("@repo/design-system/components/ui/table");
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
const stepStatus = {
  Available: "bg-emerald-100 text-emerald-800",
  Booked: "bg-slate-100 text-slate-800",
  "Needs inspection": "bg-amber-100 text-amber-800",
};
const CrmVenuesPage = () => (
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        CRM
      </p>
      <h1 className="text-2xl font-semibold">Venue Management</h1>
      <p className="text-sm text-muted-foreground">
        Surface venue readiness, capacity, and coordination notes for every
        site.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      {venues.map((venue) => (
        <card_1.Card key={venue.name}>
          <card_1.CardHeader>
            <card_1.CardTitle>{venue.name}</card_1.CardTitle>
            <card_1.CardDescription>{venue.location}</card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-2">
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
                <badge_1.Badge key={tag} variant="outline">
                  {tag}
                </badge_1.Badge>
              ))}
            </div>
            <span
              className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-[11px] font-semibold ${stepStatus[venue.status]}`}
            >
              {venue.status}
            </span>
          </card_1.CardContent>
        </card_1.Card>
      ))}
    </div>

    <card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle>Upcoming Events by Venue</card_1.CardTitle>
        <card_1.CardDescription>
          Coordination status for each property.
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent className="overflow-x-auto">
        <div className="rounded-md border">
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow>
                <table_1.TableHead>Event</table_1.TableHead>
                <table_1.TableHead>Venue</table_1.TableHead>
                <table_1.TableHead>Date</table_1.TableHead>
                <table_1.TableHead>Status</table_1.TableHead>
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {upcomingEvents.map((event) => (
                <table_1.TableRow key={event.name}>
                  <table_1.TableCell>{event.name}</table_1.TableCell>
                  <table_1.TableCell>{event.venue}</table_1.TableCell>
                  <table_1.TableCell>{event.date}</table_1.TableCell>
                  <table_1.TableCell>
                    <badge_1.Badge variant="secondary">
                      {event.status}
                    </badge_1.Badge>
                  </table_1.TableCell>
                </table_1.TableRow>
              ))}
            </table_1.TableBody>
          </table_1.Table>
        </div>
      </card_1.CardContent>
    </card_1.Card>
  </div>
);
exports.default = CrmVenuesPage;
