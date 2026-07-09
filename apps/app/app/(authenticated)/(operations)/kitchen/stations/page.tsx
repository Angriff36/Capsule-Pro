import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import {
  OperationalPageShell,
  OperationalSection,
} from "../../../components/operational-page-shell";
import { StationsClient } from "./stations-client";
import {
  type StationTypeWorkload,
  TaskWorkloadByStationType,
} from "./task-workload-by-station-type";

export const dynamic = "force-dynamic";

interface TagWorkloadRow {
  completed_tasks: number;
  in_progress_tasks: number;
  open_tasks: number;
  station_id: string;
  total_tasks: number;
}

async function loadTagWorkload(
  tenantId: string
): Promise<StationTypeWorkload[]> {
  const stationStats = await database.$queryRaw<TagWorkloadRow[]>(
    Prisma.sql`
      SELECT
        LOWER(REPLACE(tag, ' ', '-')) AS station_id,
        COUNT(*)::int AS total_tasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END)::int AS completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)::int AS in_progress_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int AS open_tasks
      FROM tenant_kitchen.kitchen_tasks
      CROSS JOIN UNNEST(tags) AS tag
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND tags IS NOT NULL
        AND ARRAY_LENGTH(tags, 1) > 0
      GROUP BY tag
      ORDER BY total_tasks DESC
    `
  );

  const activeClaims = await database.$queryRaw<
    Array<{ station_id: string; count: number }>
  >(
    Prisma.sql`
      SELECT
        LOWER(REPLACE(tag, ' ', '-')) AS station_id,
        COUNT(*)::int AS count
      FROM tenant_kitchen.task_claims tc
      JOIN tenant_kitchen.kitchen_tasks kt ON kt.id = tc.task_id
      CROSS JOIN UNNEST(kt.tags) AS tag
      WHERE tc.tenant_id = ${tenantId}
        AND tc.released_at IS NULL
        AND kt.deleted_at IS NULL
        AND kt.tags IS NOT NULL
        AND ARRAY_LENGTH(kt.tags, 1) > 0
      GROUP BY tag
    `
  );

  const claimMap = new Map(
    activeClaims.map((row) => [row.station_id, row.count])
  );

  return stationStats.map((row) => ({
    stationTypeKey: row.station_id,
    totalTasks: row.total_tasks,
    completedTasks: row.completed_tasks,
    inProgressTasks: row.in_progress_tasks,
    openTasks: row.open_tasks,
    workingClaims: claimMap.get(row.station_id) ?? 0,
  }));
}

const KitchenStationsPage = async () => {
  const { orgId } = await auth();
  if (!orgId) {
    return null;
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const tagWorkload = tenantId ? await loadTagWorkload(tenantId) : [];

  return (
    <>
      <Header page="Kitchen Stations" pages={["Kitchen Ops"]} />
      <OperationalPageShell
        description="Manage governed Station records. Task-tag workload is shown separately and is not the Station catalog."
        eyebrow="Kitchen / Stations"
        title="Kitchen stations"
        withCanvas={false}
      >
        <OperationalSection title="Stations">
          <StationsClient />
        </OperationalSection>

        <OperationalSection title="Task workload">
          <TaskWorkloadByStationType rows={tagWorkload} />
        </OperationalSection>
      </OperationalPageShell>
    </>
  );
};

export default KitchenStationsPage;
