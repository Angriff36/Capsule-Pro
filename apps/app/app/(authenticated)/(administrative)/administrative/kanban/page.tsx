import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { KanbanBoardClient } from "./components/kanban-board-client";
import { DEFAULT_COLUMNS, DEFAULT_SETTINGS } from "./lib/board-defaults";
import type {
  BoardConfigData,
  Employee,
  KanbanTask,
  TaskPriority,
} from "./lib/board-types";

async function getBoardData(tenantId: string) {
  const [tasks, configRow, employees] = await Promise.all([
    database.adminTask.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    }),
    database.boardConfig.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    database.user.findMany({
      where: { tenantId },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const employeeMap = new Map(
    employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`.trim()])
  );

  const kanbanTasks: KanbanTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority as TaskPriority,
    category: t.category,
    position: t.position,
    labels: t.labels,
    estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    assignedTo: t.assignedTo,
    createdBy: t.createdBy,
    sourceType: t.sourceType,
    sourceId: t.sourceId,
    ownerName:
      employeeMap.get(t.assignedTo ?? "") ||
      employeeMap.get(t.createdBy ?? "") ||
      "Unassigned",
  }));

  const boardConfig: BoardConfigData = configRow
    ? {
        id: configRow.id,
        name: configRow.name,
        columns:
          (configRow.columns as unknown as BoardConfigData["columns"]) ??
          DEFAULT_COLUMNS,
        settings: (configRow.settings as BoardConfigData["settings"]) ?? DEFAULT_SETTINGS,
      }
    : {
        id: "",
        name: "Default Board",
        columns: DEFAULT_COLUMNS,
        settings: DEFAULT_SETTINGS,
      };

  const employeeList: Employee[] = employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
  }));

  return { kanbanTasks, boardConfig, employeeList };
}

const AdministrativeKanbanPage = async () => {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantIdForOrg(orgId);
  const { kanbanTasks, boardConfig, employeeList } =
    await getBoardData(tenantId);

  return (
    <KanbanBoardClient
      initialTasks={kanbanTasks}
      boardConfig={boardConfig}
      employees={employeeList}
    />
  );
};

export default AdministrativeKanbanPage;
