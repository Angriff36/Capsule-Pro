import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  DisplayHeading,
  MonoLabel,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
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
import { ArrowLeft, Clock, FileText, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { AssignTrainingDialog } from "./components/assign-training-dialog";
import { DeleteTrainingModuleButton } from "./components/delete-training-module-button";
import { EditTrainingModuleDialog } from "./components/edit-training-module-dialog";

interface ModuleDetail {
  category: string | null;
  content_type: string;
  content_url: string | null;
  created_at: Date;
  description: string | null;
  duration_minutes: number | null;
  id: string;
  is_active: boolean;
  is_required: boolean;
  title: string;
}

interface AssignmentRow {
  assigned_at: Date;
  completion_completed_at: Date | null;
  completion_id: string | null;
  completion_passed: boolean;
  due_date: Date | null;
  employeeEmail: string | null;
  employeeFirstName: string | null;
  employeeId: string | null;
  employeeLastName: string | null;
  id: string;
  status: string;
}

const formatContentType = (type: string) => {
  const types: Record<string, string> = {
    document: "Document",
    video: "Video",
    quiz: "Quiz",
    interactive: "Interactive",
  };
  return types[type] ?? type;
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);

const isOverdue = (dueDate: Date | null, status: string): boolean => {
  if (!dueDate || status === "completed") {
    return false;
  }
  return new Date(dueDate) < new Date();
};

interface TrainingModulePageProps {
  params: Promise<{ id: string }>;
}

const TrainingModulePage = async ({ params }: TrainingModulePageProps) => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  const moduleRecord = await database.trainingModule.findFirst({
    where: {
      tenantId,
      id,
      deletedAt: null,
    },
  });

  if (!moduleRecord) {
    notFound();
  }

  const module: ModuleDetail = {
    id: moduleRecord.id,
    title: moduleRecord.title,
    description: moduleRecord.description,
    content_url: moduleRecord.contentUrl,
    content_type: moduleRecord.contentType,
    duration_minutes: moduleRecord.durationMinutes,
    category: moduleRecord.category,
    is_required: moduleRecord.isRequired,
    is_active: moduleRecord.isActive,
    created_at: moduleRecord.createdAt,
  };

  const assignmentRecords = await database.trainingAssignment.findMany({
    where: {
      tenantId,
      moduleId: id,
      deletedAt: null,
    },
    orderBy: { assignedAt: "desc" },
  });

  const completionRecords = await database.trainingCompletion.findMany({
    where: {
      tenantId,
      assignmentId: {
        in: assignmentRecords.map((assignment) => assignment.id),
      },
    },
  });
  const completionsByAssignmentId = new Map<
    string,
    (typeof completionRecords)[number]
  >();
  for (const completion of completionRecords) {
    if (!completionsByAssignmentId.has(completion.assignmentId)) {
      completionsByAssignmentId.set(completion.assignmentId, completion);
    }
  }

  const employeeIds = assignmentRecords
    .map((assignment) => assignment.employeeId)
    .filter((employeeId): employeeId is string => Boolean(employeeId));

  const employees =
    employeeIds.length > 0
      ? await database.user.findMany({
          where: {
            tenantId,
            id: { in: employeeIds },
            deletedAt: null,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        })
      : [];
  const employeesById = new Map(
    employees.map((employee) => [employee.id, employee])
  );

  const assignments: AssignmentRow[] = assignmentRecords.map((assignment) => {
    const completion = completionsByAssignmentId.get(assignment.id);
    const employee = assignment.employeeId
      ? employeesById.get(assignment.employeeId)
      : undefined;
    return {
      id: assignment.id,
      employeeId: assignment.employeeId,
      employeeFirstName: employee?.firstName ?? null,
      employeeLastName: employee?.lastName ?? null,
      employeeEmail: employee?.email ?? null,
      status: assignment.status,
      due_date: assignment.dueDate,
      assigned_at: assignment.assignedAt,
      completion_id: completion?.id ?? null,
      completion_completed_at: completion?.completedAt ?? null,
      completion_passed: completion?.passed ?? false,
    };
  });

  const completedCount = assignments.filter(
    (a) => a.status === "completed"
  ).length;

  const overdueCount = assignments.filter((a) =>
    isOverdue(a.due_date, a.status)
  ).length;

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="flex items-start gap-4">
        <Link href="/staff/training">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 space-y-1">
          <MonoLabel tone="dark">Operations / Staff / Training</MonoLabel>
          <DisplayHeading>{module.title}</DisplayHeading>
          <p className="text-muted-foreground">
            {module.description || "No description provided."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EditTrainingModuleDialog
            defaultValues={{
              title: module.title,
              description: module.description ?? "",
              contentUrl: module.content_url ?? "",
              contentType: module.content_type,
              durationMinutes: module.duration_minutes,
              category: module.category ?? "",
              isRequired: module.is_required,
              isActive: module.is_active,
            }}
            moduleId={id}
          />
          <AssignTrainingDialog moduleId={id} moduleName={module.title} />
          <DeleteTrainingModuleButton
            moduleId={id}
            moduleTitle={module.title}
          />
        </div>
      </div>

      <Separator />

      {/* Module Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Content Type</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-2xl">
              {formatContentType(module.content_type)}
            </div>
          </CardContent>
        </Card>

        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-2xl">
              {module.duration_minutes ? `${module.duration_minutes} min` : "-"}
            </div>
          </CardContent>
        </Card>

        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-2xl">{assignments.length}</div>
          </CardContent>
        </Card>

        <Card tone="soft-stone">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-2xl">
              {completedCount}/{assignments.length}
            </div>
            {assignments.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {Math.round((completedCount / assignments.length) * 100)}%
                completion rate
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Module Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Category</span>
              <span>
                {module.category ? (
                  <Badge variant="outline">{module.category}</Badge>
                ) : (
                  "-"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Required</span>
              <Badge variant={module.is_required ? "default" : "secondary"}>
                {module.is_required ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={module.is_active ? "default" : "secondary"}>
                {module.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(module.created_at)}</span>
            </div>
            {module.content_url && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Content URL</span>
                <a
                  className="text-blue-600 hover:underline"
                  href={module.content_url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View Content
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>
              Employees assigned to this training module.
              {overdueCount > 0 && (
                <Badge
                  className="ml-2 bg-muted/50 text-foreground"
                  variant="outline"
                >
                  {overdueCount} overdue
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {assignments.length === 0 ? (
              <div className="p-6 text-muted-foreground text-sm">
                No assignments yet. Assign this training to employees to track
                their progress.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => {
                    const overdue = isOverdue(
                      assignment.due_date,
                      assignment.status
                    );

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {assignment.employeeFirstName &&
                              assignment.employeeLastName
                                ? `${assignment.employeeFirstName} ${assignment.employeeLastName}`
                                : (assignment.employeeEmail ?? "All Employees")}
                            </div>
                            {assignment.employeeEmail && (
                              <div className="text-muted-foreground text-xs">
                                {assignment.employeeEmail}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={
                                assignment.status === "completed"
                                  ? "default"
                                  : assignment.status === "in_progress"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {assignment.status.replace("_", " ")}
                            </Badge>
                            {overdue && (
                              <Badge
                                className="bg-muted/50 text-foreground"
                                variant="outline"
                              >
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.due_date ? (
                            <span
                              className={
                                overdue ? "font-medium text-red-600" : ""
                              }
                            >
                              {formatDate(assignment.due_date)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment.completion_completed_at
                            ? formatDate(assignment.completion_completed_at)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrainingModulePage;
