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
  PageBody,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Plus, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { AddStaffForm } from "./components/add-staff-form";
import { AutoRegisterStaff } from "./components/auto-register-staff";
import { EditStaffDialog } from "./components/edit-staff-dialog";

interface EmployeeRow {
  createdAt: Date;
  email: string;
  employmentType: string;
  firstName: string;
  id: string;
  isActive: boolean;
  lastName: string;
  role: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatName = (employee: EmployeeRow) => {
  const name = `${employee.firstName} ${employee.lastName}`.trim();
  return name.length > 0 ? name : employee.email;
};

const formatEnum = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const StaffTeamPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const employees = await database.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      employmentType: true,
      createdAt: true,
    },
  });

  const activeCount = employees.filter((e) => e.isActive).length;
  const inactiveCount = employees.length - activeCount;
  const fullTimeCount = employees.filter(
    (e) => e.employmentType === "full_time"
  ).length;

  const stats = [
    {
      label: "Total staff",
      value: String(employees.length),
      note: "On account",
    },
    {
      label: "Active",
      value: String(activeCount),
      note: "Schedulable",
    },
    {
      label: "Inactive",
      value: String(inactiveCount),
      note: "Archived or paused",
    },
    {
      label: "Full-time",
      value: String(fullTimeCount),
      note: "Of total roster",
    },
  ];

  return (
    <PageCanvas>
      <AutoRegisterStaff />

      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Staff</MonoLabel>
            <DisplayHeading>Roster, roles, and reach</DisplayHeading>
            <CommandBandLede>
              The team in one place. Profiles drive scheduling, payroll, and
              event assignments — keep them current and the rest follows.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button asChild size="default" variant="on-dark">
              <a href="#add-staff">Add staff</a>
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

      <PageBody variant="rail">
        <OperationalColumn>
          <section className="space-y-6">
            <SectionHeader
              count={`${employees.length} staff`}
              description="Sorted by date added — newest first."
              eyebrow="Directory"
              title="Staff"
            />

            {employees.length === 0 ? (
              <div className="rounded-[22px] border border-hairline bg-canvas p-12 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium text-ink">No staff yet</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  Add your first team member to get started.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <a href="#add-staff">
                    Add staff <Plus className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Employment</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium text-ink">
                          {formatName(employee)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {employee.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatEnum(employee.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              employee.isActive ? "success" : "secondary"
                            }
                          >
                            {employee.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatEnum(employee.employmentType)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dateFormatter.format(employee.createdAt)}
                        </TableCell>
                        <TableCell>
                          <EditStaffDialog
                            employee={{
                              id: employee.id,
                              email: employee.email,
                              firstName: employee.firstName,
                              lastName: employee.lastName,
                              role: employee.role,
                              isActive: employee.isActive,
                              employmentType: employee.employmentType,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </OperationalColumn>

        <aside className="space-y-6" id="add-staff">
          <SectionHeader
            description="Create a profile so they can be assigned and scheduled."
            eyebrow="Add staff"
            title="New profile"
          />
          <div className="rounded-[22px] border border-hairline bg-canvas p-6">
            <AddStaffForm />
          </div>
        </aside>
      </PageBody>
    </PageCanvas>
  );
};

export default StaffTeamPage;
