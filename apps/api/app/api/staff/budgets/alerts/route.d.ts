import { NextResponse } from "next/server";
/**
 * GET /api/staff/budgets/alerts
 * Get budget alerts for the tenant
 *
 * Query params:
 * - budgetId: Filter by budget
 * - isAcknowledged: Filter by acknowledgment status
 * - alertType: Filter by alert type (threshold_80, threshold_90, threshold_100, exceeded)
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      alerts: any;
    }>
>;
/**
 * POST /api/staff/budgets/alerts/acknowledge
 * Acknowledge a budget alert
 *
 * Body:
 * - alertId: Alert ID to acknowledge
 */
export declare function POST(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      success: boolean;
    }>
>;
//# sourceMappingURL=route.d.ts.map
