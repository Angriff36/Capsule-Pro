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

  const rows = await database.$queryRaw<TrainingRow[]>`
    SELECT
      ta.id,
      tm.id AS module_id,
      tm.title AS module_title,
      tm.description AS module_description,
      tm.content_type,
      tm.duration_minutes,
      tm.category,
      tm.is_required,
      ta.status,
      ta.due_date,
      ta.assigned_at,
      tm.content_url,
      tc.started_at,
      tc.completed_at,
      tc.score,
      tc.passed
    FROM tenant_staff.training_assignments ta
    JOIN tenant_staff.training_modules tm
      ON tm.tenant_id = ta.tenant_id
      AND tm.id = ta.module_id
      AND tm.deleted_at IS NULL
    LEFT JOIN tenant_staff.training_completions tc
      ON tc.tenant_id = ta.tenant_id
      AND tc.assignment_id = ta.id
      AND tc.employee_id = ${employeeId}
    WHERE ta.tenant_id = ${tenantId}
      AND (ta.employee_id = ${employeeId} OR ta.assigned_to_all = true)
      AND ta.deleted_at IS NULL
    ORDER BY
      CASE ta.status
        WHEN 'overdue' THEN 1
        WHEN 'assigned' THEN 2
        WHEN 'in_progress' THEN 3
        WHEN 'completed' THEN 4
      END,
      ta.due_date ASC NULLS LAST
  `;

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
