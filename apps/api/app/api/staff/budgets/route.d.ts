import { NextResponse } from "next/server";
/**
 * GET /api/staff/budgets
 * List all labor budgets for the tenant
 *
 * Query params:
 * - locationId: Filter by location
 * - eventId: Filter by event
 * - budgetType: Filter by budget type (event, week, month)
 * - status: Filter by status (active, paused, archived)
 */
export declare function GET(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      budgets: any;
    }>
>;
/**
 * POST /api/staff/budgets
 * Create a new labor budget
 *
 * Required fields:
 * - name: Budget name
 * - budgetType: Type of budget (event, week, month)
 * - budgetTarget: Target amount (hours or cost)
 * - budgetUnit: Unit of budget (hours, cost)
 *
 * Optional fields:
 * - locationId: Location for this budget (null = tenant-wide)
 * - eventId: Event ID for event budgets
 * - description: Budget description
 * - periodStart: Period start date (for week/month budgets)
 * - periodEnd: Period end date (for week/month budgets)
 * - threshold80Pct: Enable 80% threshold alert
 * - threshold90Pct: Enable 90% threshold alert
 * - threshold100Pct: Enable 100% threshold alert
 */
export declare function POST(request: Request): Promise<
  | NextResponse<{
      message: string;
    }>
  | NextResponse<{
      budget: any;
    }>
>;
//# sourceMappingURL=route.d.ts.map
