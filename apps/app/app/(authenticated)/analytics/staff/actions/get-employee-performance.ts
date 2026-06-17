"use server";
import {
  listClientInteractions,
  listEventStaffs,
  listKitchenTaskProgresses,
  listPrepTasks,
  listScheduleShifts,
  listTimeEntries,
  listUsers,
} from "@/app/lib/manifest-client.generated";

import "server-only";

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "../../../../lib/tenant";

export interface EmployeePerformanceMetrics {
  attendanceRate: number;
  attendedShifts: number;
  avatarUrl: string | null;
  averageHoursPerWeek: number;
  averageTaskDuration: number;

  clientInteractions: number;
  completedTasks: number;

  efficiencyScore: number;
  email: string;
  employeeId: string;
  eventParticipation: number;
  firstName: string;
  hireDate: Date;
  lastName: string;
  onTimeTaskRate: number;
  punctualityRate: number;

  qualityScore: number;
  revenueGenerated: number;
  reworkRate: number;
  role: string;

  taskCompletionRate: number;
  taskRejectionRate: number;
  tasksPerHour: number;
  totalHoursWorked: number;
  totalShifts: number;
  totalTasks: number;
}

export interface EmployeePerformanceSummary {
  averageAttendanceRate: number;
  averageEfficiencyScore: number;
  averagePunctualityRate: number;
  averageQualityScore: number;
  averageTaskCompletionRate: number;
  metricsByRole: Array<{
    role: string;
    employeeCount: number;
    avgTaskCompletionRate: number;
    avgQualityScore: number;
    avgEfficiencyScore: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    avgTaskCompletionRate: number;
    avgQualityScore: number;
    avgEfficiencyScore: number;
  }>;
  topPerformers: Array<{
    employeeId: string;
    name: string;
    score: number;
    category: string;
  }>;
  totalEmployees: number;
}

function calculateMetrics(input: {
  userId: string;
  prepTasks: Awaited<ReturnType<typeof listPrepTasks>>["data"];
  taskProgress: Awaited<ReturnType<typeof listKitchenTaskProgresses>>["data"];
  timeEntries: Awaited<ReturnType<typeof listTimeEntries>>["data"];
  scheduleShifts: Awaited<ReturnType<typeof listScheduleShifts>>["data"];
  clientInteractions: Awaited<ReturnType<typeof listClientInteractions>>["data"];
  eventStaff: Awaited<ReturnType<typeof listEventStaffs>>["data"];
  since: Date;
}) {
  const userTaskProgress = input.taskProgress.filter(
    (row) => row.employeeId === input.userId && row.createdAt >= input.since
  );
  const taskIds = new Set(userTaskProgress.map((row) => row.taskId));
  const tasks = input.prepTasks.filter((row) => taskIds.has(row.id));
  const completedTasks = tasks.filter(
    (row) => String(row.status).toLowerCase() === "completed"
  );
  const onTimeTasks = completedTasks.filter((task) => {
    if (!task.completedAt) {
      return false;
    }
    if (!task.dueByDate) {
      return false;
    }
    return task.completedAt.getTime() <= task.dueByDate.getTime();
  });
  const averageTaskDuration =
    tasks.length > 0
      ? tasks.reduce((sum, row) => sum + Number(row.actualMinutes ?? 0), 0) /
        tasks.length /
        60
      : 0;

  const shifts = input.timeEntries.filter(
    (row) => row.employeeId === input.userId && row.clockIn >= input.since
  );
  const attendedShifts = shifts.length;
  const punctualShifts = shifts.filter((entry) => {
    const shift = input.scheduleShifts.find(
      (schedule) =>
        schedule.employeeId === input.userId &&
        schedule.shiftDate.toDateString() === entry.clockIn.toDateString()
    );
    if (!shift) return true;
    const shiftStart = shift.startTime.getTime();
    return entry.clockIn.getTime() <= shiftStart + 15 * 60 * 1000;
  }).length;
  const totalHoursWorked = shifts.reduce((sum, entry) => {
    if (!entry.clockOut) return sum;
    return (
      sum +
      (entry.clockOut.getTime() - entry.clockIn.getTime()) / (1000 * 60 * 60) -
      Number(entry.breakMinutes ?? 0) / 60
    );
  }, 0);
  const uniqueDays = new Set(shifts.map((entry) => entry.clockIn.toDateString())).size;
  const weeksWorked = Math.max(1, Math.ceil(uniqueDays / 7));
  const averageHoursPerWeek = totalHoursWorked / weeksWorked;

  const progressCount = userTaskProgress.length;
  const reworkCount = userTaskProgress.filter(
    (row) =>
      row.progressType === "status_change" &&
      row.oldStatus === "in_progress" &&
      row.newStatus === "pending"
  ).length;
  const clientInteractions = input.clientInteractions.filter(
    (row) => row.employeeId === input.userId && row.interactionDate >= input.since
  ).length;
  const eventParticipation = new Set(
    input.eventStaff
      .filter((row) => row.staffMemberId === input.userId)
      .map((row) => row.eventId)
  ).size;

  const totalTasks = tasks.length;
  const doneCount = completedTasks.length;
  const taskCompletionRate = totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0;
  const onTimeTaskRate = doneCount > 0 ? (onTimeTasks.length / doneCount) * 100 : 0;
  const attendanceRate = attendedShifts > 0 ? 100 : 0;
  const punctualityRate =
    attendedShifts > 0 ? (punctualShifts / attendedShifts) * 100 : 100;
  const taskRejectionRate = progressCount > 0 ? (reworkCount / progressCount) * 100 : 0;
  const reworkRate = doneCount > 0 ? (reworkCount / doneCount) * 100 : 0;
  const qualityScore = Math.max(0, 100 - taskRejectionRate - reworkRate);
  const tasksPerHour = totalHoursWorked > 0 ? doneCount / totalHoursWorked : 0;
  const efficiencyScore = Math.min(
    100,
    taskCompletionRate * 0.4 + onTimeTaskRate * 0.3 + tasksPerHour * 10
  );

  return {
    taskCompletionRate,
    totalTasks,
    completedTasks: doneCount,
    averageTaskDuration,
    onTimeTaskRate,
    attendanceRate,
    totalShifts: attendedShifts,
    attendedShifts,
    punctualityRate,
    averageHoursPerWeek,
    qualityScore,
    taskRejectionRate,
    reworkRate,
    efficiencyScore,
    tasksPerHour,
    clientInteractions,
    eventParticipation,
    totalHoursWorked,
  };
}

export async function getEmployeePerformance(
  employeeId: string
): Promise<EmployeePerformanceMetrics> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  await getTenantIdForOrg(orgId);

  const [users, prepTasks, taskProgress, timeEntries, scheduleShifts, interactions, eventStaff] =
    await Promise.all([
      (await listUsers()).data,
      (await listPrepTasks()).data,
      (await listKitchenTaskProgresses()).data,
      (await listTimeEntries()).data,
      (await listScheduleShifts()).data,
      (await listClientInteractions()).data,
      (await listEventStaffs()).data,
    ]);

  const employee = users.find((row) => row.id === employeeId) ?? null;

  if (!employee) {
    throw new Error("Employee not found");
  }

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const metrics = calculateMetrics({
    userId: employeeId,
    prepTasks,
    taskProgress,
    timeEntries,
    scheduleShifts,
    clientInteractions: interactions,
    eventStaff,
    since: threeMonthsAgo,
  });

  return {
    employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    role: employee.role,
    hireDate: employee.hireDate,
    avatarUrl: employee.avatarUrl,

    taskCompletionRate: metrics.taskCompletionRate,
    totalTasks: metrics.totalTasks,
    completedTasks: metrics.completedTasks,
    averageTaskDuration: metrics.averageTaskDuration,
    onTimeTaskRate: metrics.onTimeTaskRate,
    attendanceRate: metrics.attendanceRate,
    totalShifts: metrics.totalShifts,
    attendedShifts: metrics.attendedShifts,
    punctualityRate: metrics.punctualityRate,
    averageHoursPerWeek: metrics.averageHoursPerWeek,
    qualityScore: metrics.qualityScore,
    taskRejectionRate: metrics.taskRejectionRate,
    reworkRate: metrics.reworkRate,
    efficiencyScore: metrics.efficiencyScore,
    tasksPerHour: metrics.tasksPerHour,
    revenueGenerated: 0,
    clientInteractions: metrics.clientInteractions,
    eventParticipation: metrics.eventParticipation,
    totalHoursWorked: metrics.totalHoursWorked,
  };
}

export async function getEmployeePerformanceSummary(): Promise<EmployeePerformanceSummary> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  await getTenantIdForOrg(orgId);

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const [users, prepTasks, taskProgress, timeEntries, scheduleShifts, interactions, eventStaff] =
    await Promise.all([
      (await listUsers()).data,
      (await listPrepTasks()).data,
      (await listKitchenTaskProgresses()).data,
      (await listTimeEntries()).data,
      (await listScheduleShifts()).data,
      (await listClientInteractions()).data,
      (await listEventStaffs()).data,
    ]);

  const employees = users.map((user) => {
    const metrics = calculateMetrics({
      userId: user.id,
      prepTasks,
      taskProgress,
      timeEntries,
      scheduleShifts,
      clientInteractions: interactions,
      eventStaff,
      since: threeMonthsAgo,
    });
    return {
      employeeId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      taskCompletionRate: metrics.taskCompletionRate,
      qualityScore: metrics.qualityScore,
      efficiencyScore: metrics.efficiencyScore,
      attendanceRate: metrics.attendanceRate,
      punctualityRate: metrics.punctualityRate,
      onTimeTaskRate: metrics.onTimeTaskRate,
      totalHoursWorked: metrics.totalHoursWorked,
      clientInteractions: metrics.clientInteractions,
      eventParticipation: metrics.eventParticipation,
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

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const monthlyMap = new Map<
    string,
    { completion: number[]; quality: number[]; efficiency: number[] }
  >();
  for (const task of prepTasks) {
    if (task.createdAt < sixMonthsAgo) continue;
    const month = task.createdAt.toISOString().slice(0, 7);
    const bucket = monthlyMap.get(month) ?? {
      completion: [],
      quality: [],
      efficiency: [],
    };
    const done = String(task.status).toLowerCase() === "completed";
    bucket.completion.push(done ? 100 : 0);
    bucket.efficiency.push(done ? 50 : 0);
    monthlyMap.set(month, bucket);
  }
  for (const progress of taskProgress) {
    if (progress.createdAt < sixMonthsAgo) continue;
    if (
      progress.progressType === "status_change" &&
      progress.oldStatus === "in_progress" &&
      progress.newStatus === "pending"
    ) {
      const month = progress.createdAt.toISOString().slice(0, 7);
      const bucket = monthlyMap.get(month) ?? {
        completion: [],
        quality: [],
        efficiency: [],
      };
      bucket.quality.push(0);
      monthlyMap.set(month, bucket);
    }
  }
  const monthlyTrends = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, bucket]) => ({
      month,
      avg_task_completion_rate:
        bucket.completion.length > 0
          ? bucket.completion.reduce((sum, value) => sum + value, 0) /
            bucket.completion.length
          : 0,
      avg_quality_score:
        bucket.quality.length > 0
          ? 100 -
            (bucket.quality.reduce((sum, value) => sum + value, 0) /
              bucket.quality.length) *
              100
          : 100,
      avg_efficiency_score:
        bucket.efficiency.length > 0
          ? bucket.efficiency.reduce((sum, value) => sum + value, 0) /
            bucket.efficiency.length
          : 0,
    }));

  return {
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
}

export async function getEmployeeList(
  sortBy:
    | "task_completion"
    | "quality"
    | "efficiency"
    | "punctuality" = "task_completion",
  limit = 50
): Promise<EmployeePerformanceMetrics[]> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  await getTenantIdForOrg(orgId);
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const [users, prepTasks, taskProgress, timeEntries, scheduleShifts, interactions, eventStaff] =
    await Promise.all([
      (await listUsers()).data,
      (await listPrepTasks()).data,
      (await listKitchenTaskProgresses()).data,
      (await listTimeEntries()).data,
      (await listScheduleShifts()).data,
      (await listClientInteractions()).data,
      (await listEventStaffs()).data,
    ]);

  const employees = users.map((user) => {
    const metrics = calculateMetrics({
      userId: user.id,
      prepTasks,
      taskProgress,
      timeEntries,
      scheduleShifts,
      clientInteractions: interactions,
      eventStaff,
      since: threeMonthsAgo,
    });
    return {
      employeeId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      hireDate: user.hireDate,
      avatarUrl: user.avatarUrl,
      taskCompletionRate: metrics.taskCompletionRate,
      totalTasks: metrics.totalTasks,
      completedTasks: metrics.completedTasks,
      averageTaskDuration: metrics.averageTaskDuration,
      onTimeTaskRate: metrics.onTimeTaskRate,
      attendanceRate: metrics.attendanceRate,
      totalShifts: metrics.totalShifts,
      attendedShifts: metrics.attendedShifts,
      punctualityRate: metrics.punctualityRate,
      averageHoursPerWeek: metrics.averageHoursPerWeek,
      qualityScore: metrics.qualityScore,
      taskRejectionRate: metrics.taskRejectionRate,
      reworkRate: metrics.reworkRate,
      efficiencyScore: metrics.efficiencyScore,
      tasksPerHour: metrics.tasksPerHour,
      revenueGenerated: 0,
      clientInteractions: metrics.clientInteractions,
      eventParticipation: metrics.eventParticipation,
      totalHoursWorked: metrics.totalHoursWorked,
    };
  });

  const sortedEmployees = [...employees];
  if (sortBy === "quality") {
    sortedEmployees.sort((a, b) => b.qualityScore - a.qualityScore);
  } else if (sortBy === "efficiency") {
    sortedEmployees.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  } else if (sortBy === "punctuality") {
    sortedEmployees.sort((a, b) => b.punctualityRate - a.punctualityRate);
  } else {
    sortedEmployees.sort((a, b) => b.taskCompletionRate - a.taskCompletionRate);
  }

  return sortedEmployees.slice(0, limit);
}
