import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
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

interface ModuleDetail {
  id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  content_type: string;
  duration_minutes: number | null;
  category: string | null;
  is_required: boolean;
  is_active: boolean;
  created_at: Date;
}

interface AssignmentRow {
  id: string;
  employee_id: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string | null;
  status: string;
  due_date: Date | null;
  assigned_at: Date;
  completion_id: string | null;
  completion_completed_at: Date | null;
  completion_passed: boolean;
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

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

  // Get module details
  const modules = await database.$queryRaw<ModuleDetail[]>`
    SELECT
      id,
      title,
      description,
      content_url,
      content_type,
      duration_minutes,
      category,
      is_required,
      is_active,
      created_at
    FROM tenant_staff.training_modules
    WHERE tenant_id = ${tenantId}
      AND id = ${id}
      AND deleted_at IS NULL
  `;

  if (modules.length === 0) {
    notFound();
  }

  const module = modules[0];

  // Get assignments
  const assignments = await database.$queryRaw<AssignmentRow[]>`
    SELECT
      ta.id,
      ta.employee_id,
      e.first_name AS employee_first_name,
      e.last_name AS employee_last_name,
      e.email AS employee_email,
      ta.status,
      ta.due_date,
      ta.assigned_at,
      tc.id AS completion_id,
      tc.completed_at AS completion_completed_at,
      tc.passed AS completion_passed
    FROM tenant_staff.training_assignments ta
    LEFT JOIN tenant_staff.employees e
      ON e.tenant_id = ta.tenant_id
      AND e.id = ta.employee_id
    LEFT JOIN tenant_staff.training_completions tc
      ON tc.tenant_id = ta.tenant_id
      AND tc.assignment_id = ta.id
    WHERE ta.tenant_id = ${tenantId}
      AND ta.module_id = ${id}
      AND ta.deleted_at IS NULL
    ORDER BY ta.assigned_at DESC
  `;

  const completedCount = assignments.filter(
    (a) => a.status === "completed"
  ).length;

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="flex items-center gap-4">
        <Link href="/staff/training">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">{module.title}</h1>
          <p className="text-muted-foreground">
            {module.description || "No description provided."}
          </p>
        </div>
        <AssignTrainingDialog moduleId={id} moduleName={module.title}>
          <Button>Assign to Employee</Button>
        </AssignTrainingDialog>
      </div>

      <Separator />

      {/* Module Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Type</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatContentType(module.content_type)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {module.duration_minutes ? `${module.duration_minutes} min` : "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedCount}/{assignments.length}
            </div>
            {assignments.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {Math.round((completedCount / assignments.length) * 100)}%
                completion rate
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
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

        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>
              Employees assigned to this training module.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {assignments.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
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
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {assignment.employee_first_name &&
                            assignment.employee_last_name
                              ? `${assignment.employee_first_name} ${assignment.employee_last_name}`
                              : (assignment.employee_email ?? "All Employees")}
                          </div>
                          {assignment.employee_email && (
                            <div className="text-xs text-muted-foreground">
                              {assignment.employee_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        {assignment.due_date
                          ? formatDate(assignment.due_date)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {assignment.completion_completed_at
                          ? formatDate(assignment.completion_completed_at)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
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
