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
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { OperationalPageShell } from "../../../components/operational-page-shell";
import { CreateTrainingModuleDialog } from "./components/create-training-module-dialog";

interface TrainingModuleRow {
  assignment_count: bigint;
  category: string | null;
  completion_count: bigint;
  content_type: string;
  created_at: Date;
  description: string | null;
  duration_minutes: number | null;
  id: string;
  is_active: boolean;
  is_required: boolean;
  title: string;
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

  const moduleRecords = await database.trainingModule.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      _count: {
        select: {
          assignments: { where: { deletedAt: null } },
          trainingCompletions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const modules: TrainingModuleRow[] = moduleRecords.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    content_type: module.contentType,
    duration_minutes: module.durationMinutes,
    category: module.category,
    is_required: module.isRequired,
    is_active: module.isActive,
    assignment_count: BigInt(module._count.assignments),
    completion_count: BigInt(module._count.trainingCompletions),
    created_at: module.createdAt,
  }));

  return (
    <OperationalPageShell
      actions={<CreateTrainingModuleDialog />}
      description="Create and manage training modules and assignments."
      eyebrow="Staff / Training"
      title="Training"
    >
      <div className="grid gap-6">
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Training Modules</CardTitle>
            <CardDescription>
              {modules.length} training modules available.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {modules.length === 0 ? (
              <div className="p-6 text-muted-foreground text-sm">
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
    </OperationalPageShell>
  );
};

export default StaffTrainingPage;
