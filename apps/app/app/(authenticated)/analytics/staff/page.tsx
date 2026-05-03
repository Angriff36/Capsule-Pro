import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
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
  PageBody,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatName = (employee: { firstName: string; lastName: string; email: string }) => {
  const name = `${employee.firstName} ${employee.lastName}`.trim();
  return name.length > 0 ? name : employee.email;
};

const formatEnum = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const AnalyticsStaffPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [employees, timeEntries, eventAssignments, clientInteractions, taskProgress] =
    await Promise.all([
      database.user.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
        orderBy: [{ isActive: "desc" }, { firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          employmentType: true,
          isActive: true,
          hireDate: true,
        },
      }),
      database.timeEntry.findMany({
        where: {
          tenantId,
          deleted_at: null,
          clockIn: {
            gte: ninetyDaysAgo,
          },
        },
        select: {
          employeeId: true,
          clockIn: true,
          clockOut: true,
          breakMinutes: true,
        },
      }),
      database.eventStaffAssignment.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [{ startTime: { gte: ninetyDaysAgo } }, { createdAt: { gte: ninetyDaysAgo } }],
        },
        select: {
          employeeId: true,
          startTime: true,
          createdAt: true,
        },
      }),
      database.clientInteraction.findMany({
        where: {
          tenantId,
          deletedAt: null,
          interactionDate: {
            gte: ninetyDaysAgo,
          },
        },
        select: {
          employeeId: true,
          interactionDate: true,
        },
      }),
      database.kitchenTaskProgress.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: ninetyDaysAgo,
          },
        },
        select: {
          employeeId: true,
          createdAt: true,
        },
      }),
    ]);

  const metricsByEmployee = new Map<
    string,
    {
      hoursWorked: number;
      shiftsWorked: number;
      eventAssignments: number;
      clientInteractions: number;
      kitchenUpdates: number;
      lastActivity: Date | null;
    }
  >();

  for (const employee of employees) {
    metricsByEmployee.set(employee.id, {
      hoursWorked: 0,
      shiftsWorked: 0,
      eventAssignments: 0,
      clientInteractions: 0,
      kitchenUpdates: 0,
      lastActivity: null,
    });
  }

  const updateLastActivity = (employeeId: string, candidate: Date | null) => {
    if (!candidate) {
      return;
    }

    const current = metricsByEmployee.get(employeeId);
    if (!current) {
      return;
    }

    if (!current.lastActivity || candidate > current.lastActivity) {
      current.lastActivity = candidate;
    }
  };

  for (const entry of timeEntries) {
    const current = metricsByEmployee.get(entry.employeeId);
    if (!current) {
      continue;
    }

    current.shiftsWorked += 1;
    if (entry.clockOut) {
      const durationHours =
        (entry.clockOut.getTime() - entry.clockIn.getTime()) / 3_600_000 -
        entry.breakMinutes / 60;
      current.hoursWorked += Math.max(durationHours, 0);
      updateLastActivity(entry.employeeId, entry.clockOut);
    } else {
      updateLastActivity(entry.employeeId, entry.clockIn);
    }
  }

  for (const assignment of eventAssignments) {
    const current = metricsByEmployee.get(assignment.employeeId);
    if (!current) {
      continue;
    }

    current.eventAssignments += 1;
    updateLastActivity(
      assignment.employeeId,
      assignment.startTime ?? assignment.createdAt
    );
  }

  for (const interaction of clientInteractions) {
    const current = metricsByEmployee.get(interaction.employeeId);
    if (!current) {
      continue;
    }

    current.clientInteractions += 1;
    updateLastActivity(interaction.employeeId, interaction.interactionDate);
  }

  for (const progress of taskProgress) {
    const current = metricsByEmployee.get(progress.employeeId);
    if (!current) {
      continue;
    }

    current.kitchenUpdates += 1;
    updateLastActivity(progress.employeeId, progress.createdAt);
  }

  const employeeRows = employees.map((employee) => {
    const metrics = metricsByEmployee.get(employee.id)!;

    return {
      ...employee,
      ...metrics,
    };
  });

  employeeRows.sort((left, right) => {
    const rightScore =
      right.hoursWorked +
      right.eventAssignments * 2 +
      right.clientInteractions +
      right.kitchenUpdates * 0.5;
    const leftScore =
      left.hoursWorked +
      left.eventAssignments * 2 +
      left.clientInteractions +
      left.kitchenUpdates * 0.5;

    return rightScore - leftScore;
  });

  const activeEmployees = employeeRows.filter((employee) => employee.isActive);
  const totalHoursWorked = employeeRows.reduce(
    (sum, employee) => sum + employee.hoursWorked,
    0
  );
  const totalAssignments = employeeRows.reduce(
    (sum, employee) => sum + employee.eventAssignments,
    0
  );
  const totalInteractions = employeeRows.reduce(
    (sum, employee) => sum + employee.clientInteractions,
    0
  );
  const totalKitchenUpdates = employeeRows.reduce(
    (sum, employee) => sum + employee.kitchenUpdates,
    0
  );
  const averageHoursPerActiveEmployee =
    activeEmployees.length > 0 ? totalHoursWorked / activeEmployees.length : 0;

  const stats = [
    {
      label: "Total staff",
      value: String(employeeRows.length),
      note: "Rostered employees",
    },
    {
      label: "Active staff",
      value: String(activeEmployees.length),
      note: "Marked active in profiles",
    },
    {
      label: "Hours logged",
      value: decimalFormatter.format(totalHoursWorked),
      note: "Across last 90 days",
    },
    {
      label: "Avg hours / active",
      value: decimalFormatter.format(averageHoursPerActiveEmployee),
      note: "Last 90 days",
    },
  ];

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Analytics / Staff</MonoLabel>
            <DisplayHeading>Staff activity snapshot</DisplayHeading>
            <CommandBandLede>
              Live staff analytics built from roster, timekeeping, assignment, CRM,
              and kitchen activity data for the last 90 days.
            </CommandBandLede>
          </div>
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

      <PageBody variant="rail">
        <OperationalColumn>
          <section className="space-y-6">
            <SectionHeader
              eyebrow="Activity"
              title="Team performance rollup"
              description="Simple operational view of who has logged hours and touched live work recently."
              count={`${employeeRows.length} employees`}
            />

            {employeeRows.length === 0 ? (
              <div className="rounded-[22px] border border-hairline bg-canvas p-10 text-center text-muted-foreground text-sm">
                No staff records found for this tenant yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Shifts</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>CRM</TableHead>
                      <TableHead>Kitchen</TableHead>
                      <TableHead>Last activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeRows.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="font-medium text-ink">
                            {formatName(employee)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {employee.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{formatEnum(employee.role)}</div>
                          <div className="text-muted-foreground text-xs">
                            {formatEnum(employee.employmentType)} · Hired {dateFormatter.format(employee.hireDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.isActive ? "success" : "secondary"}>
                            {employee.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{decimalFormatter.format(employee.hoursWorked)}</TableCell>
                        <TableCell>{employee.shiftsWorked}</TableCell>
                        <TableCell>{employee.eventAssignments}</TableCell>
                        <TableCell>{employee.clientInteractions}</TableCell>
                        <TableCell>{employee.kitchenUpdates}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {employee.lastActivity
                            ? dateFormatter.format(employee.lastActivity)
                            : "No recent activity"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </OperationalColumn>

        <aside className="space-y-6">
          <SectionHeader
            eyebrow="Highlights"
            title="90-day totals"
            description="Useful for quick staffing review without opening the heavier dashboard shell."
          />
          <div className="space-y-4 rounded-[22px] border border-hairline bg-canvas p-6">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Event assignments</span>
              <span className="font-medium text-ink">{totalAssignments}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">CRM interactions</span>
              <span className="font-medium text-ink">{totalInteractions}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Kitchen updates</span>
              <span className="font-medium text-ink">{totalKitchenUpdates}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Employees with recent activity</span>
              <span className="font-medium text-ink">
                {employeeRows.filter((employee) => employee.lastActivity).length}
              </span>
            </div>
          </div>
        </aside>
      </PageBody>
    </PageCanvas>
  );
};

export default AnalyticsStaffPage;
