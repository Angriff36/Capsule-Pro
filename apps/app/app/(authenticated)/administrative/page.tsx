import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  RefreshCwIcon,
  SearchIcon,
  UploadIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { Header } from "../components/header";
import { DataImportSection } from "./components/data-import-section";
import {
  formatDateRange,
  getEventValidationStatus,
  getWeekDateRange,
  parseWeekOffset,
  statusBadgeVariants,
  statusLabels,
} from "./lib/validation";

type AdminDashboardPageProps = {
  searchParams?: Promise<{ week?: string }>;
};

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

  const tenantId = await getTenantIdForOrg(orgId);

  const params = searchParams ? await searchParams : {};
  const weekOffset = parseWeekOffset(params.week);
  const {
    start: weekStart,
    end: weekEnd,
    weekNumber,
  } = getWeekDateRange(weekOffset);

  // Fetch events for the week with staff count
  const eventsWithStaff = await database.$queryRaw<
    Array<{
      id: string;
      tenant_id: string;
      event_number: string | null;
      title: string;
      event_type: string;
      event_date: Date;
      guest_count: number;
      status: string;
      venue_name: string | null;
      venue_address: string | null;
      notes: string | null;
      tags: string[] | null;
      created_at: Date;
      staff_count: bigint;
    }>
  >(
    Prisma.sql`
      SELECT
        e.id,
        e.tenant_id,
        e.event_number,
        e.title,
        e.event_type,
        e.event_date,
        e.guest_count,
        e.status,
        e.venue_name,
        e.venue_address,
        e.notes,
        e.tags,
        e.created_at,
        COALESCE(
          (SELECT COUNT(*)
           FROM tenant_events.event_staff_assignments esa
           WHERE esa.event_id = e.id
             AND esa.tenant_id = e.tenant_id
             AND esa.deleted_at IS NULL
          ), 0
        ) as staff_count
      FROM tenant_events.events e
      WHERE e.tenant_id = ${tenantId}::uuid
        AND e.deleted_at IS NULL
        AND e.event_date >= ${weekStart}
        AND e.event_date <= ${weekEnd}
      ORDER BY e.event_date ASC, e.created_at ASC
    `
  );

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

  // Calculate stats
  const totalEvents = events.length;
  const totalHeadcount = events.reduce((sum, e) => sum + e.guestCount, 0);
  const averageHeadcount =
    totalEvents > 0 ? Math.round(totalHeadcount / totalEvents) : 0;

  // Service style breakdown (from eventType)
  const serviceStyleCounts = events.reduce(
    (acc, e) => {
      const style = e.eventType.toLowerCase();
      acc[style] = (acc[style] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Validation issues count
  const validationIssues = events.filter(
    (e) => e.validationStatus !== "ready"
  ).length;

  // Fetch recent document imports (graceful fallback if table doesn't exist)
  type DocumentRow = {
    id: string;
    file_name: string;
    file_type: string;
    parse_status: string;
    parse_error: string | null;
    created_at: Date;
    event_id: string | null;
  };

  let recentDocuments: DocumentRow[] = [];
  try {
    recentDocuments = await database.$queryRaw<DocumentRow[]>(
      Prisma.sql`
        SELECT
          id,
          file_name,
          file_type,
          parse_status,
          parse_error,
          created_at,
          event_id
        FROM tenant.documents
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 5
      `
    );
  } catch {
    // Table may not exist or be empty - continue with empty array
    recentDocuments = [];
  }

  // Count events from last week for comparison
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekEnd);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

  const lastWeekEvents = await database.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(*) as count
      FROM tenant_events.events
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND event_date >= ${lastWeekStart}
        AND event_date <= ${lastWeekEnd}
    `
  );

  const lastWeekCount = Number(lastWeekEvents[0]?.count ?? 0);
  const eventDiff = totalEvents - lastWeekCount;

  return (
    <>
      <Header page="Production Meeting Prep" pages={["Administrative"]}>
        <div className="flex items-center gap-3 px-4">
          <Badge className="text-sm font-medium" variant="outline">
            Week {weekNumber}
          </Badge>
          {validationIssues === 0 ? (
            <Badge className="gap-1" variant="default">
              <CheckCircle2Icon className="size-3" />
              Ready for review
            </Badge>
          ) : (
            <Badge className="gap-1" variant="secondary">
              <AlertTriangleIcon className="size-3" />
              {validationIssues} issues
            </Badge>
          )}
          <Button asChild size="sm" variant="ghost">
            <Link href={`/administrative?week=${weekOffset}`}>
              <RefreshCwIcon className="size-4 mr-1" />
              Refresh
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/events/import">
              <UploadIcon className="size-4 mr-1" />
              Upload Source Files
            </Link>
          </Button>
        </div>
      </Header>

      <div className="flex flex-1 gap-6 p-4 pt-0">
        {/* Left Sidebar */}
        <aside className="flex w-72 shrink-0 flex-col gap-6">
          {/* Data Import Section */}
          <DataImportSection documents={recentDocuments} />

          {/* Week Navigation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Week Overview</CardTitle>
              <CardDescription className="text-xs">
                {formatDateRange(weekStart, weekEnd)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
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
                <Button asChild className="w-full" size="sm" variant="ghost">
                  <Link href="/administrative">Current Week</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <span className="text-muted-foreground">
                  Total Staff Assigned
                </span>
                <span className="font-medium">
                  {events.reduce((sum, e) => sum + e.staffCount, 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-6">
          {/* Stats Cards Row */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CalendarDaysIcon className="size-4" />
                  Total Events
                </CardDescription>
                <CardTitle className="text-3xl">{totalEvents}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {eventDiff >= 0 ? "+" : ""}
                {eventDiff} from last week
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <UsersIcon className="size-4" />
                  Headcount
                </CardDescription>
                <CardTitle className="text-3xl">
                  {totalHeadcount.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Avg {averageHeadcount} per event
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <UtensilsIcon className="size-4" />
                  Service Styles
                </CardDescription>
                <CardTitle className="text-3xl">
                  {Object.keys(serviceStyleCounts).length}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {Object.entries(serviceStyleCounts)
                  .slice(0, 3)
                  .map(([style, count]) => (
                    <Badge
                      className="text-xs capitalize"
                      key={style}
                      variant="secondary"
                    >
                      {count} {style}
                    </Badge>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <AlertTriangleIcon className="size-4" />
                  Validation Issues
                </CardDescription>
                <CardTitle
                  className={`text-3xl ${validationIssues > 0 ? "text-destructive" : ""}`}
                >
                  {validationIssues}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {validationIssues > 0 ? "Action required" : "All events ready"}
              </CardContent>
            </Card>
          </section>

          {/* Events Overview */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Events Overview</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    className="w-64 pl-8"
                    placeholder="Search client or venue..."
                    type="search"
                  />
                </div>
                <Button size="sm" variant="outline">
                  Filter
                </Button>
              </div>
            </div>

            {events.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <CalendarDaysIcon className="size-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">
                    No events this week
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create new events or check a different week.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/events/new">Create Event</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {events.map((event) => (
                  <Link
                    className="group"
                    href={`/events/${event.id}`}
                    key={event.id}
                  >
                    <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <Badge
                            className="text-xs font-mono"
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
                        <CardTitle className="mt-2 text-base">
                          {event.title}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {event.venueName ?? "Venue TBD"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="size-3.5" />
                            {dateFormatter.format(event.eventDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="size-3.5" />
                            TBD
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
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
                        <div className="flex items-center justify-between pt-2">
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
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default AdminDashboardPage;
