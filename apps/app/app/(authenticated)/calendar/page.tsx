import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { Header } from "../components/header";
import { UnifiedCalendar } from "./components/unified-calendar";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  type: "event" | "shift" | "timeoff" | "deadline" | "reminder";
  status?: string;
  color?: string;
  details?: string;
  location?: string;
  assignedTo?: string;
  guestCount?: number;
}

async function getCalendarData(tenantId: string, start: Date, end: Date) {
  const events: CalendarEvent[] = [];

  // Normalize to UTC date-only for @db.Date column comparisons
  const startUtc = new Date(
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  );
  const endUtc = new Date(
    Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
  );

  // Fetch events
  const dbEvents = await database.event.findMany({
    where: {
      tenantId,
      eventDate: {
        gte: startUtc,
        lte: endUtc,
      },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      eventDate: true,
      eventType: true,
      status: true,
      venueName: true,
      guestCount: true,
    },
    orderBy: { eventDate: "asc" },
  });

  events.push(
    ...dbEvents.map((e) => ({
      id: e.id,
      title: e.title || `${e.eventType} Event`,
      start: e.eventDate,
      type: "event" as const,
      status: e.status,
      location: e.venueName || undefined,
      guestCount: e.guestCount || undefined,
      details: `Type: ${e.eventType}`,
    }))
  );

  // Fetch shifts from tenant_staff.schedule_shifts
  try {
    const shifts = await database.scheduleShift.findMany({
      where: {
        tenantId,
        shift_start: {
          gte: start,
          lte: end,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        shift_start: true,
        shift_end: true,
        role_during_shift: true,
        employeeId: true,
      },
      orderBy: { shift_start: "asc" },
      take: 100,
    });

    if (shifts && shifts.length > 0) {
      events.push(
        ...shifts.map((s) => ({
          id: s.id,
          title: `Shift: ${s.role_during_shift || "Staff"}`,
          start: s.shift_start,
          end: s.shift_end ?? undefined,
          type: "shift" as const,
          details: s.role_during_shift
            ? `Role: ${s.role_during_shift}`
            : undefined,
        }))
      );
    }
  } catch (error) {
    // Shifts query failed
    console.log("No shifts found:", error);
  }

  // Fetch time off requests from tenant_staff.employee_time_off_requests
  try {
    const timeOff = await database.employeeTimeOffRequest.findMany({
      where: {
        tenant_id: tenantId,
        start_date: {
          gte: startUtc,
          lte: endUtc,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        start_date: true,
        end_date: true,
        reason: true,
        status: true,
        request_type: true,
      },
      orderBy: { start_date: "asc" },
      take: 50,
    });

    if (timeOff && timeOff.length > 0) {
      events.push(
        ...timeOff.map((t) => ({
          id: t.id,
          title: `${t.request_type?.replace(/_/g, " ") || "Time Off"}`,
          start: new Date(t.start_date),
          end: t.end_date ? new Date(t.end_date) : undefined,
          type: "timeoff" as const,
          status: t.status,
          details: t.reason || undefined,
        }))
      );
    }
  } catch (error) {
    console.log("No time off found:", error);
  }

  return events;
}

const CalendarPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Get date range for initial fetch (current month +/- 1)
  const today = new Date();
  const start = startOfMonth(subMonths(today, 1));
  const end = endOfMonth(addMonths(today, 1));

  // Fetch calendar data
  const events = await getCalendarData(tenantId, start, end);

  // Calculate summary stats
  const eventCount = events.filter((e) => e.type === "event").length;
  const shiftCount = events.filter((e) => e.type === "shift").length;
  const timeOffCount = events.filter((e) => e.type === "timeoff").length;
  const upcomingEvents = events.filter(
    (e) => e.type === "event" && e.start >= today
  ).length;

  const rangeLabel = `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;

  const stats = [
    {
      label: "Total events",
      value: String(eventCount),
      note: `${upcomingEvents} upcoming`,
    },
    {
      label: "Scheduled shifts",
      value: String(shiftCount),
      note: "This period",
    },
    {
      label: "Time off",
      value: String(timeOffCount),
      note: "Approved requests",
    },
    {
      label: "All items",
      value: String(events.length),
      note: "On calendar",
    },
  ];

  return (
    <>
      <Header page="Calendar" pages={[]}>
        <div className="flex items-center gap-2">
          <Tabs className="mr-4" defaultValue="calendar">
            <TabsList>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button asChild size="sm" variant="ghost">
            <Link href="/calendar/sync">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync
            </Link>
          </Button>
        </div>
      </Header>

      <PageCanvas>
        <CommandBand>
          <CommandBandHeader>
            <div className="space-y-4">
              <MonoLabel tone="dark">Operations / Calendar</MonoLabel>
              <DisplayHeading>Every shift, event, and request</DisplayHeading>
              <CommandBandLede>
                A unified view of events, scheduled shifts, and time-off
                requests across the operation. Pivot between calendar, list, and
                schedule lenses to find conflicts before they ship.
              </CommandBandLede>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 font-mono text-[11px] text-white/70 uppercase tracking-[0.2em]">
                {rangeLabel}
              </div>
            </div>
            <CommandBandActions>
              <Button
                asChild
                className="border-white/25 bg-transparent text-white hover:bg-white/10"
                size="sm"
                variant="outline"
              >
                <Link href="/calendar/sync">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync sources
                </Link>
              </Button>
              <Button asChild size="default" variant="on-dark">
                <Link href="/events/new">New event</Link>
              </Button>
            </CommandBandActions>
          </CommandBandHeader>

          <CommandBandBody>
            <MetricBand>
              {stats.map((item) => (
                <MetricCell key={item.label}>
                  <MetricLabel>{item.label}</MetricLabel>
                  <MetricValue>{item.value}</MetricValue>
                  <div className="text-white/55 text-xs">{item.note}</div>
                </MetricCell>
              ))}
            </MetricBand>
          </CommandBandBody>
        </CommandBand>

        <OperationalColumn>
          <section className="space-y-6">
            <SectionHeader
              count={`${events.length} items in window`}
              description="Three-month rolling window. Drag-select to create, click to inspect."
              eyebrow="Unified view"
              title="Calendar"
            />

            <div className="rounded-[22px] border border-hairline bg-canvas p-4 sm:p-6">
              <UnifiedCalendar initialEvents={events} tenantId={tenantId} />
            </div>
          </section>
        </OperationalColumn>
      </PageCanvas>
    </>
  );
};

export default CalendarPage;
