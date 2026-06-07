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
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/app/lib/tenant";
import { MyTrainingClient } from "./my-training-client";

interface TrainingRow {
  id: string;
  module_id: string;
  module_title: string;
  module_description: string | null;
  content_type: string;
  duration_minutes: number | null;
  category: string | null;
  is_required: boolean;
  status: string;
  due_date: Date | null;
  assigned_at: Date;
  content_url: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  score: number | null;
  passed: boolean;
}

export default async function MyTrainingPage() {
  const currentUser = await requireCurrentUser();
  if (!currentUser) redirect("/sign-in");

  const { id: employeeId, tenantId } = currentUser;

  const assignments = await database.trainingAssignment.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [{ employeeId }, { assignedToAll: true }],
      module: { deletedAt: null },
    },
    include: {
      module: true,
      completions: {
        where: { tenantId, employeeId },
        take: 1,
      },
    },
  });

  const rows: TrainingRow[] = assignments
    .map((assignment) => {
      const completion = assignment.completions[0];
      return {
        id: assignment.id,
        module_id: assignment.module.id,
        module_title: assignment.module.title,
        module_description: assignment.module.description,
        content_type: assignment.module.contentType,
        duration_minutes: assignment.module.durationMinutes,
        category: assignment.module.category,
        is_required: assignment.module.isRequired,
        status: assignment.status,
        due_date: assignment.dueDate,
        assigned_at: assignment.assignedAt,
        content_url: assignment.module.contentUrl,
        started_at: completion?.startedAt ?? null,
        completed_at: completion?.completedAt ?? null,
        score: completion?.score ? Number(completion.score) : null,
        passed: completion?.passed ?? false,
      };
    })
    .sort((a, b) => {
      const statusOrder: Record<string, number> = {
        overdue: 1,
        assigned: 2,
        in_progress: 3,
        completed: 4,
      };
      const statusDiff =
        (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
      if (statusDiff !== 0) return statusDiff;
      if (!(a.due_date || b.due_date)) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.getTime() - b.due_date.getTime();
    });

  const now = new Date();

  // Recalculate overdue status (DB may be stale)
  for (const row of rows) {
    if (
      row.status !== "completed" &&
      row.due_date &&
      new Date(row.due_date) < now
    ) {
      row.status = "overdue";
    }
  }

  const assigned = rows.filter((r) => r.status === "assigned").length;
  const inProgress = rows.filter((r) => r.status === "in_progress").length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const overdue = rows.filter((r) => r.status === "overdue").length;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Staff / My Training</MonoLabel>
            <DisplayHeading>My training</DisplayHeading>
            <CommandBandLede>
              Track your assigned training modules and mark completions. Overdue
              items appear first.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Assigned</MetricLabel>
              <MetricValue>{assigned}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>In Progress</MetricLabel>
              <MetricValue>{inProgress}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Completed</MetricLabel>
              <MetricValue>{completed}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Overdue</MetricLabel>
              <MetricValue>{overdue}</MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <SectionHeader
          count={`${rows.length} module${rows.length === 1 ? "" : "s"}`}
          description="Training modules assigned to you, sorted by urgency."
          eyebrow="Modules"
          title="Your assignments"
        />
        <MyTrainingClient
          assignments={rows.map((r) => ({
            ...r,
            due_date: r.due_date?.toISOString() ?? null,
            assigned_at: r.assigned_at.toISOString(),
            started_at: r.started_at?.toISOString() ?? null,
            completed_at: r.completed_at?.toISOString() ?? null,
          }))}
        />
      </OperationalColumn>
    </PageCanvas>
  );
}
