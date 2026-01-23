import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/analytics/staff/summary
 * Get overall employee performance summary
 */
export async function GET(request: Request) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    const employeePerformanceRaw = await database.$queryRawUnsafe<
      Array<{
        employee_id: string;
        first_name: string;
        last_name: string;
        role: string;
        total_tasks: string;
        completed_tasks: string;
        avg_duration_hours: string;
        on_time_tasks: string;
        total_shifts: string;
        attended_shifts: string;
        punctual_shifts: string;
        total_hours: string;
        progress_count: string;
        rework_count: string;
        client_interactions: string;
        event_participation: string;
      }>
    >(
      `
    SELECT
      u.id as employee_id,
      u.first_name,
      u.last_name,
      u.role,
      COALESCE(task_stats.total_tasks, 0) as total_tasks,
      COALESCE(task_stats.completed_tasks, 0) as completed_tasks,
      COALESCE(task_stats.avg_duration_hours, 0) as avg_duration_hours,
      COALESCE(task_stats.on_time_tasks, 0) as on_time_tasks,
      COALESCE(time_stats.total_shifts, 0) as total_shifts,
      COALESCE(time_stats.attended_shifts, 0) as attended_shifts,
      COALESCE(time_stats.punctual_shifts, 0) as punctual_shifts,
      COALESCE(time_stats.total_hours, 0) as total_hours,
      COALESCE(progress_stats.progress_count, 0) as progress_count,
      COALESCE(progress_stats.rework_count, 0) as rework_count,
      COALESCE(client_stats.interaction_count, 0) as client_interactions,
      COALESCE(event_stats.event_count, 0) as event_participation
    FROM tenant_staff.employees u
    LEFT JOIN (
      SELECT
        tp.employee_id,
        COUNT(DISTINCT pt.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN pt.status = 'completed' THEN pt.id END) as completed_tasks,
        COALESCE(AVG(CASE WHEN pt.actual_minutes IS NOT NULL THEN pt.actual_minutes / 60.0 END), 0) as avg_duration_hours,
        COUNT(DISTINCT CASE
          WHEN pt.status = 'completed' AND pt.due_by_time IS NOT NULL
          AND (pt.completed_at::date <= pt.due_by_date OR pt.completed_at::time <= pt.due_by_time)
          THEN pt.id
        END) as on_time_tasks
      FROM tenant_kitchen.task_progress tp
      JOIN tenant_kitchen.prep_tasks pt ON tp.tenant_id = pt.tenant_id AND tp.task_id = pt.id
      WHERE tp.tenant_id = $1 AND pt.created_at >= $2
      GROUP BY tp.employee_id
    ) task_stats ON u.id = task_stats.employee_id
    LEFT JOIN (
      SELECT
        te.employee_id,
        COUNT(*) as total_shifts,
        COUNT(*) as attended_shifts,
        COUNT(DISTINCT CASE
          WHEN te.clock_in::time <= COALESCE(ss.start_time::time, '00:00'::time) + INTERVAL '15 minutes'
          THEN te.id
        END) as punctual_shifts,
        COALESCE(SUM(
          CASE
            WHEN te.clock_out IS NOT NULL THEN
              EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600 - te.break_minutes / 60
            ELSE 0
          END
        ), 0) as total_hours
      FROM tenant_staff.time_entries te
      LEFT JOIN tenant_staff.schedule_shifts ss
        ON te.tenant_id = ss.tenant_id AND te.employee_id = ss.employee_id
        AND DATE(te.clock_in) = ss.shift_date
      WHERE te.tenant_id = $1 AND te.clock_in >= $2 AND te.deleted_at IS NULL
      GROUP BY te.employee_id
    ) time_stats ON u.id = time_stats.employee_id
    LEFT JOIN (
      SELECT
        employee_id,
        COUNT(*) as progress_count,
        COUNT(CASE WHEN progress_type = 'status_change' AND old_status = 'in_progress' AND new_status = 'pending' THEN 1 END) as rework_count
      FROM tenant_kitchen.task_progress
      WHERE tenant_id = $1 AND created_at >= $2
      GROUP BY employee_id
    ) progress_stats ON u.id = progress_stats.employee_id
    LEFT JOIN (
      SELECT employee_id, COUNT(*) as interaction_count
      FROM tenant_crm.client_interactions
      WHERE tenant_id = $1 AND interaction_date >= $2 AND deleted_at IS NULL
      GROUP BY employee_id
    ) client_stats ON u.id = client_stats.employee_id
    LEFT JOIN (
      SELECT employee_id, COUNT(DISTINCT event_id) as event_count
      FROM tenant_events.event_staff_assignments
      WHERE tenant_id = $1 AND deleted_at IS NULL
      GROUP BY employee_id
    ) event_stats ON u.id = event_stats.employee_id
    WHERE u.tenant_id = $1 AND u.deleted_at IS NULL
    `,
      tenantId,
      threeMonthsAgo
    );

    const employees = employeePerformanceRaw.map((emp) => {
      const totalTasks = Number(emp.total_tasks);
      const completedTasks = Number(emp.completed_tasks);
      const taskCompletionRate =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      const onTimeTasks = Number(emp.on_time_tasks);
      const onTimeTaskRate =
        completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;
      const totalHoursWorked = Number(emp.total_hours);
      const tasksPerHour =
        totalHoursWorked > 0 ? completedTasks / totalHoursWorked : 0;
      const totalShifts = Number(emp.total_shifts);
      const attendedShifts = Number(emp.attended_shifts);
      const attendanceRate =
        totalShifts > 0 ? (attendedShifts / totalShifts) * 100 : 100;
      const punctualShifts = Number(emp.punctual_shifts);
      const punctualityRate =
        attendedShifts > 0 ? (punctualShifts / attendedShifts) * 100 : 100;
      const progressCount = Number(emp.progress_count);
      const reworkCount = Number(emp.rework_count);
      const taskRejectionRate =
        progressCount > 0 ? (reworkCount / progressCount) * 100 : 0;
      const reworkRate =
        completedTasks > 0 ? (reworkCount / completedTasks) * 100 : 0;
      const qualityScore = Math.max(0, 100 - taskRejectionRate - reworkRate);
      const efficiencyScore = Math.min(
        100,
        taskCompletionRate * 0.4 + onTimeTaskRate * 0.3 + tasksPerHour * 10
      );

      return {
        employeeId: emp.employee_id,
        firstName: emp.first_name,
        lastName: emp.last_name,
        role: emp.role,
        taskCompletionRate,
        qualityScore,
        efficiencyScore,
        attendanceRate,
        punctualityRate,
        onTimeTaskRate,
        totalHoursWorked,
        clientInteractions: Number(emp.client_interactions),
        eventParticipation: Number(emp.event_participation),
      };
    });

    const totalEmployees = employees.length;

    const averageTaskCompletionRate =
      employees.length > 0
        ? employees.reduce((sum, e) => sum + e.taskCompletionRate, 0) /
          employees.length
        : 0;

    const averageAttendanceRate =
      employees.length > 0
        ? employees.reduce((sum, e) => sum + e.attendanceRate, 0) /
          employees.length
        : 0;

    const averagePunctualityRate =
      employees.length > 0
        ? employees.reduce((sum, e) => sum + e.punctualityRate, 0) /
          employees.length
        : 0;

    const averageQualityScore =
      employees.length > 0
        ? employees.reduce((sum, e) => sum + e.qualityScore, 0) / employees.length
        : 0;

    const averageEfficiencyScore =
      employees.length > 0
        ? employees.reduce((sum, e) => sum + e.efficiencyScore, 0) /
          employees.length
        : 0;

    const sortedByTaskCompletion = [...employees].sort(
      (a, b) => b.taskCompletionRate - a.taskCompletionRate
    );
    const sortedByQuality = [...employees].sort(
      (a, b) => b.qualityScore - a.qualityScore
    );
    const sortedByEfficiency = [...employees].sort(
      (a, b) => b.efficiencyScore - a.efficiencyScore
    );
    const sortedByPunctuality = [...employees].sort(
      (a, b) => b.punctualityRate - a.punctualityRate
    );

    const topPerformers = [
      {
        employeeId: sortedByTaskCompletion[0]?.employeeId || "",
        name:
          `${sortedByTaskCompletion[0]?.firstName || ""} ${sortedByTaskCompletion[0]?.lastName || ""}`.trim() ||
          "N/A",
        score: sortedByTaskCompletion[0]?.taskCompletionRate || 0,
        category: "Task Completion",
      },
      {
        employeeId: sortedByQuality[0]?.employeeId || "",
        name:
          `${sortedByQuality[0]?.firstName || ""} ${sortedByQuality[0]?.lastName || ""}`.trim() ||
          "N/A",
        score: sortedByQuality[0]?.qualityScore || 0,
        category: "Quality",
      },
      {
        employeeId: sortedByEfficiency[0]?.employeeId || "",
        name:
          `${sortedByEfficiency[0]?.firstName || ""} ${sortedByEfficiency[0]?.lastName || ""}`.trim() ||
          "N/A",
        score: sortedByEfficiency[0]?.efficiencyScore || 0,
        category: "Efficiency",
      },
      {
        employeeId: sortedByPunctuality[0]?.employeeId || "",
        name:
          `${sortedByPunctuality[0]?.firstName || ""} ${sortedByPunctuality[0]?.lastName || ""}`.trim() ||
          "N/A",
        score: sortedByPunctuality[0]?.punctualityRate || 0,
        category: "Punctuality",
      },
    ];

    const roleGroups = employees.reduce(
      (acc, emp) => {
        const role = emp.role || "Other";
        if (!acc[role]) {
          acc[role] = [];
        }
        acc[role].push(emp);
        return acc;
      },
      {} as Record<string, typeof employees>
    );

    const metricsByRole = Object.entries(roleGroups).map(([role, emps]) => ({
      role,
      employeeCount: emps.length,
      avgTaskCompletionRate:
        emps.reduce((sum, e) => sum + e.taskCompletionRate, 0) / emps.length,
      avgQualityScore:
        emps.reduce((sum, e) => sum + e.qualityScore, 0) / emps.length,
      avgEfficiencyScore:
        emps.reduce((sum, e) => sum + e.efficiencyScore, 0) / emps.length,
    }));

    const monthlyTrends = await database.$queryRawUnsafe<
      Array<{
        month: string;
        avg_task_completion_rate: string;
        avg_quality_score: string;
        avg_efficiency_score: string;
      }>
    >(
      `
    SELECT
      TO_CHAR(pt.created_at, 'YYYY-MM') as month,
      COALESCE(AVG(
        CASE
          WHEN pt.status = 'completed' THEN 100.0
          ELSE 0.0
        END
      ), 0)::numeric as avg_task_completion_rate,
      COALESCE(100 - AVG(
        CASE
          WHEN tp.progress_type = 'status_change' AND tp.old_status = 'in_progress' AND tp.new_status = 'pending' THEN 1
          ELSE 0
        END
      ) * 100, 100)::numeric as avg_quality_score,
      COALESCE(AVG(
        CASE
          WHEN pt.status = 'completed' THEN 50.0
          ELSE 0.0
        END
      ), 0)::numeric as avg_efficiency_score
    FROM tenant_kitchen.prep_tasks pt
    LEFT JOIN tenant_kitchen.task_progress tp
      ON pt.tenant_id = tp.tenant_id AND pt.id = tp.task_id
    WHERE pt.tenant_id = $1
      AND pt.created_at >= NOW() - INTERVAL '6 months'
      AND pt.deleted_at IS NULL
    GROUP BY TO_CHAR(pt.created_at, 'YYYY-MM')
    ORDER BY month ASC
    `,
      tenantId
    );

    const summary = {
      totalEmployees,
      averageTaskCompletionRate,
      averageAttendanceRate,
      averagePunctualityRate,
      averageQualityScore,
      averageEfficiencyScore,
      topPerformers,
      metricsByRole,
      monthlyTrends: monthlyTrends.map((trend) => ({
        month: trend.month,
        avgTaskCompletionRate: Number(trend.avg_task_completion_rate),
        avgQualityScore: Number(trend.avg_quality_score),
        avgEfficiencyScore: Number(trend.avg_efficiency_score),
      })),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching employee performance summary:", error);
    return NextResponse.json(
      { message: "Failed to fetch employee performance summary" },
      { status: 500 }
    );
  }
}
