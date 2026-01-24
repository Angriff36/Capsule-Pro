import { NextResponse } from "next/server";
/**
 * GET /api/analytics/staff/employees/[employeeId]
 * Get performance metrics for a specific employee
 */
export declare function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      employeeId: string;
    }>;
  }
): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
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
    }>
>;
//# sourceMappingURL=route.d.ts.map
