import { listEvents, listScheduleShifts, listTimeOffRequests } from "@/app/lib/manifest-client.generated";
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
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
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
import { CalendarViewSwitcher } from "./components/calendar-view-switcher";

export interface CalendarEvent {
  assignedTo?: string;
  color?: string;
  details?: string;
  end?: Date;
  guestCount?: number;
  id: string;
  location?: string;
  start: Date;
  status?: string;
  title: string;
  type: "event" | "shift" | "timeoff";
}

async function getCalendarData(tenantId: string, start: Date, end: Date) {
  // Normalize to UTC date-only for @db.Date column comparisons
  const startUtc = new Date(
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  );
  const endUtc = new Date(
    Date.UTC(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
  );

  // Fetch all three data sources in parallel
  const [dbEvents, shiftsResult, timeOffResult] = await Promise.all([
    (await listEvents()).data
      .catch(() => []),
    (await listScheduleShifts()).data
      .catch(() => []),
    (await listTimeOffRequests()).data
      .catch(() => []),
  ]);

  const events: CalendarEvent[] = [];

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

  if (shiftsResult && shiftsResult.length > 0) {
    events.push(
      ...shiftsResult.map((s) => ({
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

  if (timeOffResult && timeOffResult.length > 0) {
    events.push(
      ...timeOffResult.map((t) => ({
        id: t.id,
        title: `${t.requestType?.replace(/_/g, " ") || "Time Off"}`,
        start: new Date(t.startDate),
        end: t.endDate ? new Date(t.endDate) : undefined,
        type: "timeoff" as const,
        status: t.status,
        details: t.reason || undefined,
      }))
    );
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
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Calendar</MonoLabel>
            <DisplayHeading>Every shift, event, and request</DisplayHeading>
            <CommandBandLede>
              A unified view of events, scheduled shifts, and time-off requests
              across the operation. Switch between calendar and list views to
              find conflicts before they ship.
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

          <CalendarViewSwitcher events={events} tenantId={tenantId} />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default CalendarPage;
