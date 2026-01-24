import "server-only";
export type EmployeePerformanceMetrics = {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  hireDate: Date;
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
export type EmployeePerformanceSummary = {
  totalEmployees: number;
  averageTaskCompletionRate: number;
  averageAttendanceRate: number;
  averagePunctualityRate: number;
  averageQualityScore: number;
  averageEfficiencyScore: number;
  topPerformers: Array<{
    employeeId: string;
    name: string;
    score: number;
    category: string;
  }>;
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
};
export declare function getEmployeePerformance(
  employeeId: string
): Promise<EmployeePerformanceMetrics>;
export declare function getEmployeePerformanceSummary(): Promise<EmployeePerformanceSummary>;
export declare function getEmployeeList(
  sortBy?: "task_completion" | "quality" | "efficiency" | "punctuality",
  limit?: number
): Promise<EmployeePerformanceMetrics[]>;
//# sourceMappingURL=get-employee-performance.d.ts.map
