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
  MetricDelta,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantIdForOrg } from "../../../../lib/tenant";
import { EventStaffClient } from "./event-staff-client";

const EVENT_ID_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const isEventIdUuid = (value: string): boolean =>
  EVENT_ID_UUID_REGEX.test(value);

interface StaffAssignment {
  employeeId: string;
  employeeName: string;
  endTime: string | null;
  id: string;
  notes: string | null;
  role: string;
  startTime: string | null;
}

interface EventStaffPageProps {
  params: Promise<{ eventId: string }>;
}

const EventStaffPage = async ({ params }: EventStaffPageProps) => {
  const { eventId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  if (!isEventIdUuid(eventId)) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const event = await database.event.findUnique({
    where: { tenantId_id: { tenantId, id: eventId } },
    select: {
      id: true,
      title: true,
      eventNumber: true,
      eventDate: true,
      status: true,
    },
  });

  if (!event) {
    notFound();
  }

  // Fetch staff assignments with employee names via raw SQL since there's
  // no Prisma relation between EventStaff and User.
  const assignments = await database.$queryRawUnsafe<
    Array<{
      id: string;
      staffMemberId: string;
      first_name: string;
      last_name: string;
      role: string;
      shiftStart: Date | null;
      shiftEnd: Date | null;
      notes: string | null;
    }>
  >(
    `SELECT
        esa.id,
        esa."staffMemberId",
        e.first_name,
        e.last_name,
        esa.role,
        esa."shiftStart",
        esa."shiftEnd",
        esa.notes
      FROM tenant_events.event_staff esa
      LEFT JOIN tenant_staff.employees e
        ON e.tenant_id::text = esa."tenantId" AND e.id::text = esa."staffMemberId"
      WHERE esa."tenantId" = $1
        AND esa."eventId" = $2
        AND esa."deletedAt" IS NULL
      ORDER BY esa.role ASC, e.first_name ASC`,
    tenantId,
    eventId
  );

  // Fetch available (unassigned) employees
  const available = await database.$queryRawUnsafe<
    Array<{
      id: string;
      first_name: string;
      last_name: string;
      role: string;
    }>
  >(
    `SELECT
        e.id,
        e.first_name,
        e.last_name,
        e.role
      FROM tenant_staff.employees e
      WHERE e.tenant_id = $1
        AND e.deleted_at IS NULL
        AND e.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM tenant_events.event_staff esa
          WHERE esa."tenantId" = e.tenant_id::text
            AND esa."staffMemberId" = e.id::text
            AND esa."eventId" = $2
            AND esa."deletedAt" IS NULL
        )
      ORDER BY e.first_name, e.last_name`,
    tenantId,
    eventId
  );

  const eventLabel = event.eventNumber
    ? `${event.eventNumber} — ${event.title}`
    : event.title;

  const eventDate = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const serializedAssignments: StaffAssignment[] = assignments.map((a) => ({
    id: a.id,
    employeeId: a.staffMemberId,
    employeeName: `${a.first_name} ${a.last_name}`,
    role: a.role,
    startTime: a.shiftStart ? a.shiftStart.toISOString() : null,
    endTime: a.shiftEnd ? a.shiftEnd.toISOString() : null,
    notes: a.notes,
  }));

  const serializedAvailable = available.map((a) => ({
    id: a.id,
    name: `${a.first_name} ${a.last_name}`,
    role: a.role,
  }));

  // Group by role for OperationalColumn sections
  const rolesRequired = new Map<string, number>();
  const rolesAssigned = new Map<string, number>();

  for (const a of serializedAssignments) {
    const count = rolesAssigned.get(a.role) ?? 0;
    rolesAssigned.set(a.role, count + 1);
    rolesRequired.set(a.role, count + 1);
  }

  const assignedCount = serializedAssignments.length;
  const availableCount = serializedAvailable.length;
  const uniqueRoles = [...new Set(serializedAssignments.map((a) => a.role))];
  const _unfilledRoles = uniqueRoles.length;

  // Detect conflicts: same employee assigned multiple roles
  const employeeRoleMap = new Map<string, string[]>();
  for (const a of serializedAssignments) {
    const roles = employeeRoleMap.get(a.employeeId) ?? [];
    roles.push(a.role);
    employeeRoleMap.set(a.employeeId, roles);
  }
  const conflictCount = [...employeeRoleMap.values()].filter(
    (roles) => roles.length > 1
  ).length;

  const heroStats = [
    {
      label: "Required roles",
      value: String(uniqueRoles.length),
      delta: uniqueRoles.length === 0 ? "None defined" : "Distinct positions",
      note: null as string | null,
    },
    {
      label: "Assigned",
      value: String(assignedCount),
      delta: null,
      note: null as string | null,
    },
    {
      label: "Unfilled",
      value: String(0),
      delta: null,
      note: null as string | null,
    },
    {
      label: "Conflicts",
      value: String(conflictCount),
      delta:
        conflictCount > 0 ? "Same person in multiple roles" : "No conflicts",
      note: null as string | null,
    },
  ];

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Events / {eventLabel} / Staff</MonoLabel>
            <DisplayHeading>{eventLabel} staff assignments</DisplayHeading>
            <CommandBandLede>
              {eventDate
                ? `Assign roles and shifts for ${eventDate}. Drag available staff into position or adjust assignments inline.`
                : "Assign roles and shifts for this event. Drag available staff into position or adjust assignments inline."}
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href={`/events/${eventId}`}>Back to event</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {heroStats.map((stat) => (
              <MetricCell key={stat.label}>
                <MetricLabel>{stat.label}</MetricLabel>
                <MetricValue>{stat.value}</MetricValue>
                {stat.delta ? <MetricDelta>{stat.delta}</MetricDelta> : null}
                {stat.note ? (
                  <div className="text-white/55 text-xs">{stat.note}</div>
                ) : null}
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${assignedCount} assigned, ${availableCount} available`}
            description="Each row shows a staff assignment with role, shift window, and status. Assign or unassign staff inline."
            eyebrow="Staff assignments"
            title="Assigned staff"
          />
          <EventStaffClient
            eventId={eventId}
            initialAssignments={serializedAssignments}
            initialAvailable={serializedAvailable}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default EventStaffPage;
