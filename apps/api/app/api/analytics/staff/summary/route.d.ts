import { NextResponse } from "next/server";
/**
 * GET /api/analytics/staff/summary
 * Get overall employee performance summary
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      totalEmployees: number;
      averageTaskCompletionRate: number;
      averageAttendanceRate: number;
      averagePunctualityRate: number;
      averageQualityScore: number;
      averageEfficiencyScore: number;
      topPerformers: {
        employeeId: string;
        name: string;
        score: number;
        category: string;
      }[];
      metricsByRole: {
        role: string;
        employeeCount: number;
        avgTaskCompletionRate: number;
        avgQualityScore: number;
        avgEfficiencyScore: number;
      }[];
      monthlyTrends: {
        month: string;
        avgTaskCompletionRate: number;
        avgQualityScore: number;
        avgEfficiencyScore: number;
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
