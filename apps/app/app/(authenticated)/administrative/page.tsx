import { listDocuments, listEvents, listEventStaffs } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricDelta,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  CalendarDaysIcon,
  ClockIcon,
  RefreshCwIcon,
  SearchIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { DataImportSection } from "./components/data-import-section";
import {
  formatDateRange,
  getEventValidationStatus,
  getWeekDateRange,
  parseWeekOffset,
  statusBadgeVariants,
  statusLabels,
} from "./lib/validation";

interface AdminDashboardPageProps {
  searchParams?: Promise<{ week?: string }>;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const AdminDashboardPage = async ({
  searchParams,
}: AdminDashboardPageProps) => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  await getTenantIdForOrg(orgId);

  const params = searchParams ? await searchParams : {};
  const weekOffset = parseWeekOffset(params.week);
  const {
    start: weekStart,
    end: weekEnd,
    weekNumber,
  } = getWeekDateRange(weekOffset);

  const [allEvents, allEventStaffs] = await Promise.all([
    (await listEvents()).data,
    (await listEventStaffs()).data,
  ]);
  const staffCountsByEventId = allEventStaffs.reduce<Record<string, number>>(
    (acc, staff) => {
      acc[staff.eventId] = (acc[staff.eventId] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const eventsWithStaff = allEvents
    .filter((event) => {
      if (!event.eventDate) {
        return false;
      }
      const eventDate = new Date(event.eventDate);
      return eventDate >= weekStart && eventDate <= weekEnd;
    })
    .sort((a, b) => {
      const left = a.eventDate ? new Date(a.eventDate).getTime() : 0;
      const right = b.eventDate ? new Date(b.eventDate).getTime() : 0;
      return left - right;
    })
    .map((event) => ({
      id: event.id,
      tenant_id: event.tenantId,
      event_number: event.eventNumber,
      title: event.title,
      event_type: event.eventType,
      event_date: event.eventDate ? new Date(event.eventDate) : new Date(),
      guest_count: event.guestCount ?? 0,
      status: event.status,
      venue_name: event.venueName,
      venue_address: event.venueAddress,
      notes: event.notes,
      tags: event.tags,
      created_at: event.createdAt ? new Date(event.createdAt) : new Date(),
      staff_count: BigInt(staffCountsByEventId[event.id] ?? 0),
    }));

  const events = eventsWithStaff.map((e) => ({
    id: e.id,
    tenantId: e.tenant_id,
    eventNumber: e.event_number,
    title: e.title,
    eventType: e.event_type,
    eventDate: e.event_date,
    guestCount: e.guest_count,
    status: e.status,
    venueName: e.venue_name,
    venueAddress: e.venue_address,
    notes: e.notes,
    tags: e.tags ?? [],
    staffCount: Number(e.staff_count),
    validationStatus: getEventValidationStatus({
      venueName: e.venue_name,
      staffCount: Number(e.staff_count),
      guestCount: e.guest_count,
      eventDate: e.event_date,
      startTime: null,
      endTime: null,
    }),
  }));

  const totalEvents = events.length;
  const totalHeadcount = events.reduce((sum, e) => sum + e.guestCount, 0);
  const averageHeadcount =
    totalEvents > 0 ? Math.round(totalHeadcount / totalEvents) : 0;

  const serviceStyleCounts = events.reduce(
    (acc, e) => {
      const style = e.eventType.toLowerCase();
      acc[style] = (acc[style] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const validationIssues = events.filter(
    (e) => e.validationStatus !== "ready"
  ).length;

  interface DocumentRow {
    created_at: Date;
    event_id: string | null;
    file_name: string;
    file_type: string;
    id: string;
    parse_error: string | null;
    parse_status: string;
  }

  let recentDocuments: DocumentRow[] = [];
  try {
    recentDocuments = (await listDocuments()).data
      .slice()
      .sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return right - left;
      })
      .slice(0, 5)
      .map((document) => ({
        id: document.id,
        file_name: document.fileName,
        file_type: document.fileType,
        parse_status: document.parseStatus,
        parse_error: document.parseError,
        created_at: document.createdAt ? new Date(document.createdAt) : new Date(),
        event_id: document.eventId,
      }));
  } catch {
    recentDocuments = [];
  }

  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekEnd);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

  const lastWeekCount = allEvents.filter((event) => {
    if (!event.eventDate) {
      return false;
    }
    const eventDate = new Date(event.eventDate);
    return eventDate >= lastWeekStart && eventDate <= lastWeekEnd;
  }).length;
  const eventDiff = totalEvents - lastWeekCount;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">
              Administrative / Week {weekNumber}
            </MonoLabel>
            <DisplayHeading>Production Meeting Prep</DisplayHeading>
            <CommandBandLede>
              {formatDateRange(weekStart, weekEnd)} —{" "}
              {validationIssues === 0
                ? "All events ready for review"
                : `${validationIssues} event${validationIssues === 1 ? "" : "s"} need attention`}
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href={`/administrative?week=${weekOffset}`}>
                <RefreshCwIcon className="mr-1 size-4" />
                Refresh
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/events/import">
                <UploadIcon className="mr-1 size-4" />
                Upload Source Files
              </Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            <MetricCell>
              <MetricLabel>Total Events</MetricLabel>
              <MetricValue>{totalEvents}</MetricValue>
              <MetricDelta>
                {eventDiff >= 0 ? "+" : ""}
                {eventDiff} from last week
              </MetricDelta>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Headcount</MetricLabel>
              <MetricValue>{totalHeadcount.toLocaleString()}</MetricValue>
              <MetricDelta>Avg {averageHeadcount} per event</MetricDelta>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Service Styles</MetricLabel>
              <MetricValue>
                {Object.keys(serviceStyleCounts).length}
              </MetricValue>
              <MetricDelta>
                {Object.entries(serviceStyleCounts)
                  .slice(0, 2)
                  .map(([s, c]) => `${c} ${s}`)
                  .join(", ")}
              </MetricDelta>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Validation Issues</MetricLabel>
              <MetricValue>{validationIssues}</MetricValue>
              <MetricDelta>
                {validationIssues > 0 ? "Action required" : "All events ready"}
              </MetricDelta>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-6">
            <DataImportSection documents={recentDocuments} />

            {/* Week Navigation */}
            <div className="rounded-[22px] border border-hairline bg-canvas p-5">
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                Week Overview
              </p>
              <p className="mt-1 text-ink text-sm">
                {formatDateRange(weekStart, weekEnd)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/administrative?week=${weekOffset - 1}`}>
                    Previous
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/administrative?week=${weekOffset + 1}`}>
                    Next
                  </Link>
                </Button>
              </div>
              {weekOffset !== 0 && (
                <Button
                  asChild
                  className="mt-2 w-full"
                  size="sm"
                  variant="ghost"
                >
                  <Link href="/administrative">Current Week</Link>
                </Button>
              )}
            </div>

            {/* Quick Stats */}
            <div className="rounded-[22px] border border-hairline bg-canvas p-5">
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                Quick Stats
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confirmed</span>
                  <span className="font-medium">
                    {events.filter((e) => e.status === "confirmed").length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tentative</span>
                  <span className="font-medium">
                    {events.filter((e) => e.status === "tentative").length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Staff Assigned</span>
                  <span className="font-medium">
                    {events.reduce((sum, e) => sum + e.staffCount, 0)}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="space-y-6">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionHeader
                  count={`${totalEvents} event${totalEvents === 1 ? "" : "s"}`}
                  description="Events this week requiring review."
                  eyebrow="Events"
                  title="Events Overview"
                />
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <SearchIcon className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                    <Input
                      className="w-64 pl-8"
                      placeholder="Search client or venue..."
                      type="search"
                    />
                  </div>
                </div>
              </div>

              {events.length === 0 ? (
                <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-10 text-center">
                  <CalendarDaysIcon className="mx-auto size-12 text-muted-foreground/50" />
                  <p className="mt-4 font-medium text-ink text-lg">
                    No events this week
                  </p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Create new events or check a different week.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/events/new">Create Event</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {events.map((event) => (
                    <Link
                      className="group"
                      href={`/events/${event.id}`}
                      key={event.id}
                    >
                      <div className="h-full rounded-[22px] border border-hairline bg-canvas p-5 transition hover:border-primary/40">
                        <div className="flex items-start justify-between gap-2">
                          <Badge
                            className="font-mono text-xs"
                            variant="outline"
                          >
                            #EV-
                            {event.eventNumber ??
                              event.id.slice(0, 4).toUpperCase()}
                          </Badge>
                          <Badge
                            className="text-xs"
                            variant={
                              statusBadgeVariants[event.validationStatus]
                            }
                          >
                            {statusLabels[event.validationStatus]}
                          </Badge>
                        </div>
                        <p className="mt-2 font-semibold">{event.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {event.venueName ?? "Venue TBD"}
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-muted-foreground text-sm">
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="size-3.5" />
                            {dateFormatter.format(event.eventDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="size-3.5" />
                            TBD
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge
                            className="text-xs capitalize"
                            variant="secondary"
                          >
                            {event.eventType}
                          </Badge>
                          <Badge className="text-xs" variant="outline">
                            {event.guestCount} PAX
                          </Badge>
                          {event.tags.slice(0, 2).map((tag) => (
                            <Badge
                              className="text-xs"
                              key={tag}
                              variant="outline"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between pt-2">
                          <Button
                            className="h-7 text-xs"
                            size="sm"
                            variant="ghost"
                          >
                            Review Details
                          </Button>
                          <Progress
                            className="h-1.5 w-16"
                            value={
                              event.validationStatus === "ready" ? 100 : 60
                            }
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default AdminDashboardPage;
