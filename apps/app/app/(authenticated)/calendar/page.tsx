import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { Header } from "../components/header";
import { UnifiedCalendar, UnifiedCalendarSkeleton } from "./components/unified-calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/design-system/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { getTenantIdForOrg } from "../../lib/tenant";

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
  
  // Fetch events
  const dbEvents = await database.event.findMany({
    where: {
      tenantId,
      eventDate: {
        gte: start,
        lte: end,
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

  events.push(...dbEvents.map(e => ({
    id: e.id,
    title: e.title || `${e.eventType} Event`,
    start: e.eventDate,
    type: "event" as const,
    status: e.status,
    location: e.venueName || undefined,
    guestCount: e.guestCount || undefined,
    details: `Type: ${e.eventType}`,
  })));

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
      events.push(...shifts.map(s => ({
        id: s.id,
        title: `Shift: ${s.role_during_shift || "Staff"}`,
        start: s.shift_start,
        end: s.shift_end ?? undefined,
        type: "shift" as const,
        details: s.role_during_shift ? `Role: ${s.role_during_shift}` : undefined,
      })));
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
          gte: start,
          lte: end,
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
      events.push(...timeOff.map(t => ({
        id: t.id,
        title: `${t.request_type?.replace(/_/g, " ") || "Time Off"}`,
        start: new Date(t.start_date),
        end: t.end_date ? new Date(t.end_date) : undefined,
        type: "timeoff" as const,
        status: t.status,
        details: t.reason || undefined,
      })));
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
  const eventCount = events.filter(e => e.type === "event").length;
  const shiftCount = events.filter(e => e.type === "shift").length;
  const timeOffCount = events.filter(e => e.type === "timeoff").length;
  const upcomingEvents = events.filter(e => 
    e.type === "event" && e.start >= today
  ).length;

  return (
    <>
      <Header page="Calendar" pages={[]}>
        <div className="flex items-center gap-2">
          <Tabs defaultValue="calendar" className="mr-4">
            <TabsList>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Header>

      <div className="flex flex-1 flex-col p-4 pt-0 gap-4">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eventCount}</div>
              <p className="text-xs text-muted-foreground">
                {upcomingEvents} upcoming
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shiftCount}</div>
              <p className="text-xs text-muted-foreground">
                This period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Off</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeOffCount}</div>
              <p className="text-xs text-muted-foreground">
                Approved requests
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground">
                On calendar
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Unified Calendar */}
        <UnifiedCalendar 
          tenantId={tenantId} 
          initialEvents={events}
        />
      </div>
    </>
  );
};

export default CalendarPage;
