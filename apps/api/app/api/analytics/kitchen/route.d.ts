import { NextResponse } from "next/server";
/**
 * GET /api/analytics/kitchen
 * Get kitchen performance analytics including station throughput and kitchen health metrics
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      summary: {
        period: string;
        startDate: string;
        endDate: string;
        locationId: string | null;
      };
      stationThroughput: {
        stationId: string;
        stationName: string;
        load: number;
        completed: number;
        avgTime: string;
        totalItems: number;
        completedItems: number;
        pendingItems: number;
      }[];
      kitchenHealth: {
        prepListsSync: {
          rate: number;
          total: number;
          completed: number;
        };
        allergenWarnings: number;
        wasteAlerts: number;
        timeToCompletion: string;
        avgMinutes: number;
      };
      trends: {
        date: string;
        stations: {
          stationName: string;
          total: number;
          completed: number;
          completionRate: number;
        }[];
      }[];
      topPerformers: {
        employeeId: string;
        firstName: string;
        lastName: string;
        completedTasks: number;
        avgMinutes: number;
      }[];
    }>
>;
//# sourceMappingURL=route.d.ts.map
