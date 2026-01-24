var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const empty_1 = require("@repo/design-system/components/ui/empty");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../lib/tenant");
const header_1 = require("../components/header");
const events_suggestions_1 = require("./components/events-suggestions");
const events_page_client_1 = require("./events-page-client");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});
const statusVariantMap = {
  confirmed: "default",
  tentative: "secondary",
  postponed: "outline",
  completed: "secondary",
  cancelled: "destructive",
};
const EventsPage = async () => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const events = await database_1.database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = events.filter((event) => event.eventDate >= today);
  const totalGuests = events.reduce(
    (total, event) => total + (event.guestCount ?? 0),
    0
  );
  return (
    <>
      <header_1.Header page="Events" pages={["Operations"]}>
        <div className="flex items-center gap-2">
          <button_1.Button asChild variant="secondary">
            <link_1.default href="/events/import">Import</link_1.default>
          </button_1.Button>
          <button_1.Button asChild>
            <link_1.default href="/events/new">New event</link_1.default>
          </button_1.Button>
        </div>
      </header_1.Header>
      <events_suggestions_1.EventsPageWithSuggestions tenantId={tenantId} />
      <events_page_client_1.EventsPageClient />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <section className="grid gap-4 lg:grid-cols-4">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardDescription>Total events</card_1.CardDescription>
              <card_1.CardTitle className="text-2xl">
                {events.length}
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="text-muted-foreground text-sm">
              {upcomingEvents.length} upcoming
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardDescription>Total guests</card_1.CardDescription>
              <card_1.CardTitle className="text-2xl">
                {totalGuests}
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="text-muted-foreground text-sm">
              Across all scheduled events
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardDescription>Confirmed</card_1.CardDescription>
              <card_1.CardTitle className="text-2xl">
                {events.filter((event) => event.status === "confirmed").length}
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="text-muted-foreground text-sm">
              Ready to produce
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardDescription>Tentative</card_1.CardDescription>
              <card_1.CardTitle className="text-2xl">
                {events.filter((event) => event.status === "tentative").length}
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="text-muted-foreground text-sm">
              Needs final approval
            </card_1.CardContent>
          </card_1.Card>
        </section>
        {events.length === 0 ? (
          <empty_1.Empty>
            <empty_1.EmptyHeader>
              <empty_1.EmptyMedia variant="icon">
                <lucide_react_1.CalendarDaysIcon />
              </empty_1.EmptyMedia>
              <empty_1.EmptyTitle>No events yet</empty_1.EmptyTitle>
              <empty_1.EmptyDescription>
                Create your first event to start syncing the events module.
              </empty_1.EmptyDescription>
            </empty_1.EmptyHeader>
            <empty_1.EmptyContent>
              <button_1.Button asChild>
                <link_1.default href="/events/new">Create event</link_1.default>
              </button_1.Button>
            </empty_1.EmptyContent>
          </empty_1.Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {events.map((event) => (
              <link_1.default
                className="group"
                href={`/events/${event.id}`}
                key={`${event.tenantId}-${event.id}`}
              >
                <card_1.Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                  <card_1.CardHeader className="gap-1">
                    <card_1.CardDescription className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {event.eventNumber ?? "Unassigned event number"}
                      </span>
                      <badge_1.Badge
                        className="capitalize"
                        variant={statusVariantMap[event.status] ?? "outline"}
                      >
                        {event.status}
                      </badge_1.Badge>
                    </card_1.CardDescription>
                    <card_1.CardTitle className="text-lg">
                      {event.title}
                    </card_1.CardTitle>
                    <card_1.CardDescription className="capitalize">
                      {event.eventType}
                    </card_1.CardDescription>
                  </card_1.CardHeader>
                  <card_1.CardContent className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <lucide_react_1.CalendarDaysIcon className="size-4" />
                      <span>{dateFormatter.format(event.eventDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <lucide_react_1.UsersIcon className="size-4" />
                      <span>{event.guestCount} guests</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <lucide_react_1.MapPinIcon className="size-4" />
                      <span className="line-clamp-1">
                        {event.venueName ?? "Venue TBD"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <lucide_react_1.TagIcon className="size-4" />
                      <span className="line-clamp-1">
                        {event.tags.length > 0
                          ? event.tags.join(", ")
                          : "No tags"}
                      </span>
                    </div>
                  </card_1.CardContent>
                </card_1.Card>
              </link_1.default>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
exports.default = EventsPage;
