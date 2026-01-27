import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type TaskMetrics = {
  total_tasks: string;
  completed_tasks: string;
  avg_duration_hours: string;
  on_time_tasks: string;
};

type TimeEntryMetrics = {
  total_shifts: string;
  attended_shifts: string;
  punctual_shifts: string;
  total_hours: string;
  unique_days: string;
};

type TaskProgressMetrics = {
  progress_count: string;
  rework_count: string;
};

type EmployeeMetrics = {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  hireDate: Date | null;
  avatarUrl: string | null;
  taskCompletionRate: number;
  totalTasks: number;
  completedTasks: number;
  averageTaskDuration: number;
  onTimeTaskRate: number;
  attendanceRate: number;
  totalShifts: number;
  attendedShifts: number;
  punctualityRate: number;
  averageHoursPerWeek: number;
  qualityScore: number;
  taskRejectionRate: number;
  reworkRate: number;
  efficiencyScore: number;
  tasksPerHour: number;
  revenueGenerated: number;
  clientInteractions: number;
  eventParticipation: number;
  totalHoursWorked: number;
};

function getThreeMonthsAgo(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 3, 1);
}

async function fetchEmployee(tenantId: string, employeeId: string) {
  return await database.user.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: employeeId,
      },
    },
  });
}

async function fetchTaskMetrics(
  tenantId: string,
  employeeId: string,
  threeMonthsAgo: Date
) {
  return await database.$queryRaw<TaskMetrics[]>`
    SELECT
      COUNT(DISTINCT pt.id) as total_tasks,
      COUNT(DISTINCT CASE WHEN pt.status = 'completed' THEN pt.id END) as completed_tasks,
      COALESCE(AVG(CASE WHEN pt.actual_minutes IS NOT NULL THEN pt.actual_minutes / 60.0 END), 0) as avg_duration_hours,
      COUNT(DISTINCT CASE
        WHEN pt.status = 'completed' AND pt.due_by_time IS NOT NULL
        AND (pt.completed_at::date <= pt.due_by_date OR pt.completed_at::time <= pt.due_by_time)
        THEN pt.id
      END) as on_time_tasks
    FROM tenant_kitchen.prep_tasks pt
    WHERE pt.tenant_id = ${tenantId}
      AND pt.created_at >= ${threeMonthsAgo}
      AND EXISTS (
        SELECT 1 FROM tenant_kitchen.task_progress tp
        WHERE tp.tenant_id = pt.tenant_id AND tp.task_id = pt.id AND tp.employee_id = ${employeeId}
      )
  `;
}

async function fetchTimeEntryMetrics(
  tenantId: string,
  employeeId: string,
  threeMonthsAgo: Date
) {
  return await database.$queryRaw<TimeEntryMetrics[]>`
    SELECT
      COUNT(*) as total_shifts,
      COUNT(*) as attended_shifts,
      COUNT(DISTINCT CASE
        WHEN te.clock_in::time <= ss.start_time::time + INTERVAL '15 minutes'
        THEN te.id
      END) as punctual_shifts,
      COALESCE(SUM(
        CASE
          WHEN te.clock_out IS NOT NULL THEN
            EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600 - te.break_minutes / 60
          ELSE 0
        END
      ), 0) as total_hours,
      COUNT(DISTINCT DATE(te.clock_in)) as unique_days
    FROM tenant_staff.time_entries te
    LEFT JOIN tenant_staff.schedule_shifts ss
      ON te.tenant_id = ss.tenant_id AND te.employee_id = ss.employee_id
      AND DATE(te.clock_in) = ss.shift_date
    WHERE te.tenant_id = ${tenantId}
      AND te.employee_id = ${employeeId}
      AND te.clock_in >= ${threeMonthsAgo}
      AND te.deleted_at IS NULL
  `;
}

async function fetchClientInteractions(
  tenantId: string,
  employeeId: string,
  threeMonthsAgo: Date
) {
  const result = await database.$queryRaw<Array<{ interaction_count: string }>>`
    SELECT COUNT(*) as interaction_count
    FROM tenant_crm.client_interactions
    WHERE tenant_id = ${tenantId}
      AND employee_id = ${employeeId}
      AND interaction_date >= ${threeMonthsAgo}
      AND deleted_at IS NULL
  `;
  return Number(result[0]?.interaction_count || 0);
}

async function fetchEventParticipation(tenantId: string, employeeId: string) {
  const result = await database.$queryRaw<Array<{ event_count: string }>>`
    SELECT COUNT(DISTINCT event_id) as event_count
    FROM tenant_events.event_staff_assignments
    WHERE tenant_id = ${tenantId}
      AND employee_id = ${employeeId}
      AND deleted_at IS NULL
  `;
  return Number(result[0]?.event_count || 0);
}

async function fetchTaskProgressMetrics(
  tenantId: string,
  employeeId: string,
  threeMonthsAgo: Date
) {
  return await database.$queryRaw<TaskProgressMetrics[]>`
    SELECT
      COUNT(*) as progress_count,
      COUNT(CASE WHEN progress_type = 'status_change' AND old_status = 'in_progress' AND new_status = 'pending' THEN 1 END) as rework_count
    FROM tenant_kitchen.task_progress
    WHERE tenant_id = ${tenantId}
      AND employee_id = ${employeeId}
      AND created_at >= ${threeMonthsAgo}
  `;
}

function calculateTaskMetrics(taskStats: TaskMetrics | undefined) {
  const totalTasks = Number(taskStats?.total_tasks || 0);
  const completedTasks = Number(taskStats?.completed_tasks || 0);
  const taskCompletionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const onTimeTasks = Number(taskStats?.on_time_tasks || 0);
  const onTimeTaskRate =
    completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;
  const averageTaskDuration = Number(taskStats?.avg_duration_hours || 0);

  return {
    totalTasks,
    completedTasks,
    taskCompletionRate,
    onTimeTaskRate,
    averageTaskDuration,
  };
}

function calculateTimeMetrics(timeStats: TimeEntryMetrics | undefined) {
  const totalShifts = Number(timeStats?.total_shifts || 0);
  const attendedShifts = Number(timeStats?.attended_shifts || 0);
  const attendanceRate =
    totalShifts > 0 ? (attendedShifts / totalShifts) * 100 : 100;
  const punctualShifts = Number(timeStats?.punctual_shifts || 0);
  const punctualityRate =
    attendedShifts > 0 ? (punctualShifts / attendedShifts) * 100 : 100;
  const totalHoursWorked = Number(timeStats?.total_hours || 0);
  const uniqueDays = Number(timeStats?.unique_days || 0);
  const weeksWorked = Math.max(1, Math.ceil(uniqueDays / 7));
  const averageHoursPerWeek = totalHoursWorked / weeksWorked;

  return {
    totalShifts,
    attendedShifts,
    attendanceRate,
    punctualityRate,
    totalHoursWorked,
    averageHoursPerWeek,
  };
}

function calculateQualityMetrics(
  progressStats: TaskProgressMetrics | undefined,
  completedTasks: number
) {
  const progressCount = Number(progressStats?.progress_count || 0);
  const reworkCount = Number(progressStats?.rework_count || 0);
  const taskRejectionRate =
    progressCount > 0 ? (reworkCount / progressCount) * 100 : 0;
  const reworkRate =
    completedTasks > 0 ? (reworkCount / completedTasks) * 100 : 0;
  const qualityScore = Math.max(0, 100 - taskRejectionRate - reworkRate);

  return {
    qualityScore,
    taskRejectionRate,
    reworkRate,
  };
}

function calculateEfficiencyMetrics(
  taskCompletionRate: number,
  onTimeTaskRate: number,
  completedTasks: number,
  totalHoursWorked: number
) {
  const tasksPerHour =
    totalHoursWorked > 0 ? completedTasks / totalHoursWorked : 0;
  const efficiencyScore = Math.min(
    100,
    taskCompletionRate * 0.4 + onTimeTaskRate * 0.3 + tasksPerHour * 10
  );

  return {
    tasksPerHour,
    efficiencyScore,
  };
}

function buildMetricsResponse(
  employeeId: string,
  employee: NonNullable<Awaited<ReturnType<typeof fetchEmployee>>>,
  taskMetrics: ReturnType<typeof calculateTaskMetrics>,
  timeMetrics: ReturnType<typeof calculateTimeMetrics>,
  qualityMetrics: ReturnType<typeof calculateQualityMetrics>,
  efficiencyMetrics: ReturnType<typeof calculateEfficiencyMetrics>,
  clientInteractions: number,
  eventParticipation: number
): EmployeeMetrics {
  return {
    employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    role: employee.role,
    hireDate: employee.hireDate,
    avatarUrl: employee.avatarUrl,
    taskCompletionRate: taskMetrics.taskCompletionRate,
    totalTasks: taskMetrics.totalTasks,
    completedTasks: taskMetrics.completedTasks,
    averageTaskDuration: taskMetrics.averageTaskDuration,
    onTimeTaskRate: taskMetrics.onTimeTaskRate,
    attendanceRate: timeMetrics.attendanceRate,
    totalShifts: timeMetrics.totalShifts,
    attendedShifts: timeMetrics.attendedShifts,
    punctualityRate: timeMetrics.punctualityRate,
    averageHoursPerWeek: timeMetrics.averageHoursPerWeek,
    qualityScore: qualityMetrics.qualityScore,
    taskRejectionRate: qualityMetrics.taskRejectionRate,
    reworkRate: qualityMetrics.reworkRate,
    efficiencyScore: efficiencyMetrics.efficiencyScore,
    tasksPerHour: efficiencyMetrics.tasksPerHour,
    revenueGenerated: 0,
    clientInteractions,
    eventParticipation,
    totalHoursWorked: timeMetrics.totalHoursWorked,
  };
}

/**
 * GET /api/analytics/staff/employees/[employeeId]
 * Get performance metrics for a specific employee
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { employeeId } = await params;

  try {
    const employee = await fetchEmployee(tenantId, employeeId);

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    const threeMonthsAgo = getThreeMonthsAgo();

    const [
      taskMetricsRaw,
      timeEntryMetricsRaw,
      taskProgressRaw,
      clientInteractions,
      eventParticipation,
    ] = await Promise.all([
      fetchTaskMetrics(tenantId, employeeId, threeMonthsAgo),
      fetchTimeEntryMetrics(tenantId, employeeId, threeMonthsAgo),
      fetchTaskProgressMetrics(tenantId, employeeId, threeMonthsAgo),
      fetchClientInteractions(tenantId, employeeId, threeMonthsAgo),
      fetchEventParticipation(tenantId, employeeId),
    ]);

    const taskStats = taskMetricsRaw[0];
    const timeStats = timeEntryMetricsRaw[0];
    const progressStats = taskProgressRaw[0];

    const taskMetrics = calculateTaskMetrics(taskStats);
    const timeMetrics = calculateTimeMetrics(timeStats);
    const qualityMetrics = calculateQualityMetrics(
      progressStats,
      taskMetrics.completedTasks
    );
    const efficiencyMetrics = calculateEfficiencyMetrics(
      taskMetrics.taskCompletionRate,
      taskMetrics.onTimeTaskRate,
      taskMetrics.completedTasks,
      timeMetrics.totalHoursWorked
    );

    const metrics = buildMetricsResponse(
      employeeId,
      employee as NonNullable<typeof employee>,
      taskMetrics,
      timeMetrics,
      qualityMetrics,
      efficiencyMetrics,
      clientInteractions,
      eventParticipation
    );

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching employee performance:", error);
    return NextResponse.json(
      { message: "Failed to fetch employee performance" },
      { status: 500 }
    );
  }
}
