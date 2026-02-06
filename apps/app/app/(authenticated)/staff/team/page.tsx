import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { AddStaffForm } from "./components/add-staff-form";

interface EmployeeRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  employmentType: string;
  createdAt: Date;
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

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Manage staff profiles, roles, and assignments.
        </p>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Staff Directory</CardTitle>
            <CardDescription>
              {employees.length} staff members on this account.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {employees.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No staff members yet. Add your first team member to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {formatName(employee)}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatEnum(employee.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.isActive ? "outline" : "secondary"}
                        >
                          {employee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatEnum(employee.employmentType)}
                      </TableCell>
                      <TableCell>
                        {dateFormatter.format(employee.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add Staff</CardTitle>
            <CardDescription>
              Create a staff profile so they can be assigned and scheduled.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddStaffForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffTeamPage;
