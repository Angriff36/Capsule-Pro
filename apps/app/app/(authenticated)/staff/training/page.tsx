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
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { CreateTrainingModuleDialog } from "./components/create-training-module-dialog";

interface TrainingModuleRow {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  duration_minutes: number | null;
  category: string | null;
  is_required: boolean;
  is_active: boolean;
  assignment_count: bigint;
  completion_count: bigint;
  created_at: Date;
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

const StaffTrainingPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const modules = await database.$queryRaw<TrainingModuleRow[]>`
    SELECT
      tm.id,
      tm.title,
      tm.description,
      tm.content_type,
      tm.duration_minutes,
      tm.category,
      tm.is_required,
      tm.is_active,
      tm.created_at,
      COUNT(DISTINCT ta.id) AS assignment_count,
      COUNT(DISTINCT tc.id) AS completion_count
    FROM tenant_staff.training_modules tm
    LEFT JOIN tenant_staff.training_assignments ta
      ON ta.tenant_id = tm.tenant_id
      AND ta.module_id = tm.id
      AND ta.deleted_at IS NULL
    LEFT JOIN tenant_staff.training_completions tc
      ON tc.tenant_id = tm.tenant_id
      AND tc.module_id = tm.id
    WHERE tm.tenant_id = ${tenantId}
      AND tm.deleted_at IS NULL
    GROUP BY tm.id
    ORDER BY tm.created_at DESC
  `;

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Training</h1>
          <p className="text-muted-foreground">
            Create and manage training modules and assignments.
          </p>
        </div>
        <CreateTrainingModuleDialog>
          <Button>Create Module</Button>
        </CreateTrainingModuleDialog>
      </div>

      <Separator />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Training Modules</CardTitle>
            <CardDescription>
              {modules.length} training modules available.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {modules.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No training modules yet. Create your first module to get
                started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">
                        <Link
                          className="hover:underline"
                          href={`/staff/training/${module.id}`}
                        >
                          {module.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {module.category ? (
                          <Badge variant="outline">{module.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatContentType(module.content_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {module.duration_minutes
                          ? `${module.duration_minutes} min`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {module.is_required ? (
                          <Badge variant="default">Required</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell>{Number(module.assignment_count)}</TableCell>
                      <TableCell>{Number(module.completion_count)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={module.is_active ? "default" : "secondary"}
                        >
                          {module.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/staff/training/${module.id}`}>
                          <Button size="sm" variant="outline">
                            Manage
                          </Button>
                        </Link>
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

export default StaffTrainingPage;
