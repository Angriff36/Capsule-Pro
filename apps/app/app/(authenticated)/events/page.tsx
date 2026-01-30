import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { CalendarDaysIcon, MapPinIcon, TagIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { Header } from "../components/header";
import { EventsPageWithSuggestions } from "./components/events-suggestions";
import { EventsPageClient } from "./events-page-client";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const statusVariantMap = {
  confirmed: "default",
  tentative: "secondary",
  postponed: "outline",
  completed: "secondary",
  cancelled: "destructive",
} as const;

const EventsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const events = await database.event.findMany({
    where: {
      tenantId: tenantId,
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
      <Header page="Events" pages={["Operations"]}>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/events/reports">Reports</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/events/battle-boards">Battle Boards</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/events/import">Import</Link>
          </Button>
          <Button asChild>
            <Link href="/events/new">New event</Link>
          </Button>
        </div>
      </Header>
      <EventsPageWithSuggestions tenantId={tenantId} />
      <EventsPageClient />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <section className="grid gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total events</CardDescription>
              <CardTitle className="text-2xl">{events.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {upcomingEvents.length} upcoming
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total guests</CardDescription>
              <CardTitle className="text-2xl">{totalGuests}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Across all scheduled events
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Confirmed</CardDescription>
              <CardTitle className="text-2xl">
                {events.filter((event) => event.status === "confirmed").length}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Ready to produce
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Tentative</CardDescription>
              <CardTitle className="text-2xl">
                {events.filter((event) => event.status === "tentative").length}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Needs final approval
            </CardContent>
          </Card>
        </section>
        {events.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDaysIcon />
              </EmptyMedia>
              <EmptyTitle>No events yet</EmptyTitle>
              <EmptyDescription>
                Create your first event to start syncing the events module.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/events/new">Create event</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {events.map((event) => (
              <Link
                className="group"
                href={`/events/${event.id}`}
                key={`${event.tenantId}-${event.id}`}
              >
                <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                  <CardHeader className="gap-1">
                    <CardDescription className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {event.eventNumber ?? "Unassigned event number"}
                      </span>
                      <Badge
                        className="capitalize"
                        variant={
                          statusVariantMap[
                            event.status as keyof typeof statusVariantMap
                          ] ?? "outline"
                        }
                      >
                        {event.status}
                      </Badge>
                    </CardDescription>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <CardDescription className="capitalize">
                      {event.eventType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDaysIcon className="size-4" />
                      <span>{dateFormatter.format(event.eventDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UsersIcon className="size-4" />
                      <span>{event.guestCount} guests</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPinIcon className="size-4" />
                      <span className="line-clamp-1">
                        {event.venueName ?? "Venue TBD"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <TagIcon className="size-4" />
                      <span className="line-clamp-1">
                        {event.tags.length > 0
                          ? event.tags.join(", ")
                          : "No tags"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default EventsPage;
