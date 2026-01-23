import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
    const employee = await database.user.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: employeeId,
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const taskMetrics = await database.$queryRawUnsafe<
      Array<{
        total_tasks: string;
        completed_tasks: string;
        avg_duration_hours: string;
        on_time_tasks: string;
      }>
    >(
      `
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
    WHERE pt.tenant_id = $1
      AND pt.created_at >= $2
      AND EXISTS (
        SELECT 1 FROM tenant_kitchen.task_progress tp
        WHERE tp.tenant_id = pt.tenant_id AND tp.task_id = pt.id AND tp.employee_id = $3
      )
    `,
      tenantId,
      threeMonthsAgo,
      employeeId
    );

    const timeEntryMetrics = await database.$queryRawUnsafe<
      Array<{
        total_shifts: string;
        attended_shifts: string;
        punctual_shifts: string;
        total_hours: string;
        unique_days: string;
      }>
    >(
      `
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
    WHERE te.tenant_id = $1
      AND te.employee_id = $2
      AND te.clock_in >= $2
      AND te.deleted_at IS NULL
    `,
      tenantId,
      employeeId
    );

    const clientInteractionCount = await database.$queryRawUnsafe<
      Array<{ interaction_count: string }>
    >(
      `
    SELECT COUNT(*) as interaction_count
    FROM tenant_crm.client_interactions
    WHERE tenant_id = $1
      AND employee_id = $2
      AND interaction_date >= $2
      AND deleted_at IS NULL
    `,
      tenantId,
      employeeId
    );

    const eventParticipationCount = await database.$queryRawUnsafe<
      Array<{ event_count: string }>
    >(
      `
    SELECT COUNT(DISTINCT event_id) as event_count
    FROM tenant_events.event_staff_assignments
    WHERE tenant_id = $1
      AND employee_id = $2
      AND deleted_at IS NULL
    `,
      tenantId,
      employeeId
    );

    const taskProgress = await database.$queryRawUnsafe<
      Array<{
        progress_count: string;
        rework_count: string;
      }>
    >(
      `
    SELECT
      COUNT(*) as progress_count,
      COUNT(CASE WHEN progress_type = 'status_change' AND old_status = 'in_progress' AND new_status = 'pending' THEN 1 END) as rework_count
    FROM tenant_kitchen.task_progress
    WHERE tenant_id = $1
      AND employee_id = $2
      AND created_at >= $2
    `,
      tenantId,
      employeeId
    );

    const taskStats = taskMetrics[0];
    const timeStats = timeEntryMetrics[0];
    const progressStats = taskProgress[0];
    const clientInteractions = Number(
      clientInteractionCount[0]?.interaction_count || 0
    );
    const eventParticipation = Number(
      eventParticipationCount[0]?.event_count || 0
    );

    const totalTasks = Number(taskStats?.total_tasks || 0);
    const completedTasks = Number(taskStats?.completed_tasks || 0);
    const taskCompletionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const onTimeTasks = Number(taskStats?.on_time_tasks || 0);
    const onTimeTaskRate =
      completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;
    const averageTaskDuration = Number(taskStats?.avg_duration_hours || 0);

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

    const progressCount = Number(progressStats?.progress_count || 0);
    const reworkCount = Number(progressStats?.rework_count || 0);
    const taskRejectionRate =
      progressCount > 0 ? (reworkCount / progressCount) * 100 : 0;
    const reworkRate =
      completedTasks > 0 ? (reworkCount / completedTasks) * 100 : 0;
    const qualityScore = Math.max(0, 100 - taskRejectionRate - reworkRate);

    const tasksPerHour =
      totalHoursWorked > 0 ? completedTasks / totalHoursWorked : 0;
    const efficiencyScore = Math.min(
      100,
      taskCompletionRate * 0.4 + onTimeTaskRate * 0.3 + tasksPerHour * 10
    );

    const revenueGenerated = 0;

    const metrics = {
      employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role,
      hireDate: employee.hireDate,
      avatarUrl: employee.avatarUrl,

      taskCompletionRate,
      totalTasks,
      completedTasks,
      averageTaskDuration,
      onTimeTaskRate,

      attendanceRate,
      totalShifts,
      attendedShifts,
      punctualityRate,
      averageHoursPerWeek,

      qualityScore,
      taskRejectionRate,
      reworkRate,

      efficiencyScore,
      tasksPerHour,
      revenueGenerated,

      clientInteractions,
      eventParticipation,
      totalHoursWorked,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching employee performance:", error);
    return NextResponse.json(
      { message: "Failed to fetch employee performance" },
      { status: 500 }
    );
  }
}
